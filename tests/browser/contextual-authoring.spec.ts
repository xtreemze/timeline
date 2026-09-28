import { expect, type Page, test } from "@playwright/test";
import { WORLD_TOUCH_HOLD_MS } from "../../src/interaction/world-touch-hold.ts";
import { touchscreen } from "../support/touch-gestures.ts";

type FractionPoint = { readonly x: number; readonly y: number };

async function certifyWebGlWorld(page: Page): Promise<boolean> {
  await page.goto("/");
  await expect(page.locator(".temporal-graph-canvas canvas").first()).toBeVisible();
  return page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
}

async function canvasPoint(page: Page, fraction: FractionPoint) {
  const box = await page.locator(".temporal-graph-canvas canvas").first().boundingBox();
  if (!box) throw new Error("World canvas has no live bounds.");
  return {
    x: box.x + box.width * fraction.x,
    y: box.y + box.height * fraction.y,
  };
}

async function installContextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const world = document.querySelector(".temporal-graph-canvas");
    if (!world) throw new Error("World surface root is missing.");
    (
      globalThis as typeof globalThis & {
        __contextAuthoringRequests?: unknown[];
      }
    ).__contextAuthoringRequests = [];
    world.addEventListener("worldcontextrequest", (event) => {
      const request = event as CustomEvent<{
        source?: string;
        position?: { longitude?: number; latitude?: number; altitudeMeters?: number };
      }>;
      (
        globalThis as typeof globalThis & {
          __contextAuthoringRequests?: unknown[];
        }
      ).__contextAuthoringRequests?.push({
        source: request.detail?.source ?? null,
        position: request.detail?.position
          ? {
              longitude: Number(request.detail.position.longitude),
              latitude: Number(request.detail.position.latitude),
              altitudeMeters: Number(request.detail.position.altitudeMeters ?? 0),
            }
          : null,
      });
    });
  });
}

async function contextRequests(page: Page) {
  return page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __contextAuthoringRequests?: Array<{
            source: string | null;
            position: {
              longitude: number;
              latitude: number;
              altitudeMeters: number;
            } | null;
          }>;
        }
      ).__contextAuthoringRequests ?? [],
  );
}

async function closeComposer(page: Page): Promise<void> {
  const composer = page.locator("#occurrence-composer");
  if ((await composer.getAttribute("active")) === null) return;
  await composer.locator("input").press("Escape");
  await expect(composer).not.toHaveAttribute("active", "");
}

async function discoverEmptyWorldPoint(page: Page): Promise<FractionPoint> {
  const composer = page.locator("#occurrence-composer");
  const candidates: readonly FractionPoint[] = [
    { x: 0.12, y: 0.18 },
    { x: 0.88, y: 0.18 },
    { x: 0.12, y: 0.82 },
    { x: 0.88, y: 0.82 },
    { x: 0.5, y: 0.16 },
    { x: 0.5, y: 0.84 },
    { x: 0.22, y: 0.5 },
    { x: 0.78, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ];

  for (const candidate of candidates) {
    const point = await canvasPoint(page, candidate);
    await page.mouse.click(point.x, point.y, { button: "right" });
    if ((await composer.getAttribute("active")) !== null) return candidate;
  }
  throw new Error("Could not find empty WorldSurface space through real context-menu input.");
}

async function assertComposerInsideFooter(page: Page): Promise<void> {
  const composer = page.locator("#occurrence-composer");
  const input = composer.locator("input");
  const footer = page.locator(".app-tool-dock.app-footer-bar");
  await expect(composer).toHaveAttribute("active", "");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();

  const [footerBox, inputBox] = await Promise.all([footer.boundingBox(), input.boundingBox()]);
  if (!footerBox || !inputBox) {
    throw new Error("Contextual composer footer geometry is unavailable.");
  }
  expect(inputBox.x).toBeGreaterThanOrEqual(footerBox.x - 1);
  expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(footerBox.x + footerBox.width + 1);
  expect(inputBox.y).toBeGreaterThanOrEqual(footerBox.y - 1);
  expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(footerBox.y + footerBox.height + 1);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Browser project has no viewport.");
  const documentSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(documentSize.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(documentSize.height).toBeLessThanOrEqual(viewport.height + 2);
}

async function selectEntityWithTimelineContext(page: Page): Promise<string> {
  const outline = page.getByRole("navigation", { name: "World objects" });
  const entities = outline
    .locator("h2", { hasText: "Entities" })
    .locator("xpath=following-sibling::ul[1]//button");
  await expect.poll(() => entities.count()).toBeGreaterThan(0);

  for (let index = 0; index < (await entities.count()); index += 1) {
    const button = entities.nth(index);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");

    const selectedChronology = page.locator(
      '.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]',
    );
    if ((await selectedChronology.count()) === 0) continue;

    const id = await page
      .locator('.temporal-graph-canvas [role="status"]')
      .evaluate((status) => {
        const match = status.textContent?.match(/Selected entity ([^\s(]+)/);
        return match?.[1] ?? "";
      });
    if (id) return id;
  }

  throw new Error("No accessible World entity projected to selected chronology context.");
}

test.describe("contextual world authoring certification", () => {
  test("real empty-world context menu opens the footer composer at a world coordinate", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");
    await installContextRecorder(page);

    await discoverEmptyWorldPoint(page);
    await assertComposerInsideFooter(page);

    const request = (await contextRequests(page)).at(-1);
    expect(request?.position).not.toBeNull();
    expect(Number.isFinite(request?.position?.longitude)).toBe(true);
    expect(Number.isFinite(request?.position?.latitude)).toBe(true);
  });

  test("stationary empty-world long press opens authoring while quick movement does not", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, "Requires a touch-enabled browser project.");
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const empty = await discoverEmptyWorldPoint(page);
    await closeComposer(page);

    const start = await canvasPoint(page, empty);
    const swipeFinger = await touchscreen(page);
    await swipeFinger.move([start]);
    await swipeFinger.move([{ x: start.x + 54, y: start.y }]);
    await page.waitForTimeout(WORLD_TOUCH_HOLD_MS + 120);
    await expect(page.locator("#occurrence-composer")).not.toHaveAttribute("active", "");
    await swipeFinger.end();

    const settled = await canvasPoint(page, empty);
    const holdFinger = await touchscreen(page);
    await holdFinger.move([settled]);
    await expect
      .poll(() => page.locator("#occurrence-composer").getAttribute("active"), {
        timeout: WORLD_TOUCH_HOLD_MS + 1_500,
      })
      .not.toBeNull();
    await holdFinger.end();

    await assertComposerInsideFooter(page);
  });

  test("Shift+F10 launches contextual authoring from the keyboard on the current world", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");
    await installContextRecorder(page);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await page.keyboard.press("Shift+F10");

    await assertComposerInsideFooter(page);
    const request = (await contextRequests(page)).at(-1);
    expect(request?.source).toBe("keyboard");
    expect(Number.isFinite(request?.position?.longitude)).toBe(true);
    expect(Number.isFinite(request?.position?.latitude)).toBe(true);
  });

  test("canonical World selection propagates to timeline and survives as the composer @id seed", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const entityId = await selectEntityWithTimelineContext(page);
    await expect(
      page.locator('.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]'),
    ).not.toHaveCount(0);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await page.keyboard.press("Shift+F10");

    const input = page.locator("#occurrence-composer input");
    await expect(input).toHaveValue("@" + entityId + " ");
    const canonicalExists = await page.evaluate((id) => {
      const project = globalThis.TimelineAgentAPI?.getProject?.();
      return Boolean(project?.entities?.some((entity) => String(entity.id) === id));
    }, entityId);
    expect(canonicalExists).toBe(true);

    await input.press("Escape");
    await expect(page.locator("#occurrence-composer")).not.toHaveAttribute("active", "");
    await expect(
      page.locator('.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]'),
    ).not.toHaveCount(0);
  });
});
