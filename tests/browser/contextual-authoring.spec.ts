import { expect, type Locator, type Page, test } from "@playwright/test";
import { WORLD_TOUCH_HOLD_MS } from "../../src/interaction/world-touch-hold.ts";
import { touchscreen } from "../support/touch-gestures.ts";

type FractionPoint = { readonly x: number; readonly y: number };

async function certifyWebGlWorld(page: Page): Promise<boolean> {
  await page.goto("/");
  const webgl2 = await page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
  if (webgl2) {
    await expect(page.locator(".temporal-graph-canvas canvas").first()).toBeVisible();
  }
  return webgl2;
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

interface RelationshipFocus {
  readonly focusId: string;
  readonly relationshipId: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly predicate: string;
}

async function relationshipFocuses(page: Page): Promise<RelationshipFocus[]> {
  await expect.poll(() => page.locator(".timeline-semantic-occurrence").count()).toBeGreaterThan(0);
  return page.evaluate(() => {
    const agentAPI = (
      window as typeof window & {
        TimelineAgentAPI?: {
          getProject?: () => {
            relationships?: Array<{
              id?: unknown;
              subjectId?: unknown;
              objectId?: unknown;
              predicate?: unknown;
              itemIds?: unknown[];
            }>;
          };
        };
      }
    ).TimelineAgentAPI;
    const relationships = agentAPI?.getProject?.()?.relationships ?? [];
    const focusIds = new Set(
      [...document.querySelectorAll<HTMLElement>(".timeline-semantic-occurrence")]
        .map((button) => button.dataset.id ?? "")
        .filter(Boolean),
    );

    return relationships
      .map((relationship) => {
        const relationshipId = String(relationship.id ?? "");
        const candidates = [
          relationshipId,
          ...(relationship.itemIds ?? []).map((itemId) => String(itemId)),
        ];
        const focusId = candidates.find((candidate) => focusIds.has(candidate)) ?? "";
        return {
          focusId,
          relationshipId,
          subjectId: String(relationship.subjectId ?? ""),
          objectId: String(relationship.objectId ?? ""),
          predicate: String(relationship.predicate ?? ""),
        };
      })
      .filter(
        (relationship) =>
          relationship.focusId &&
          relationship.relationshipId &&
          relationship.subjectId &&
          relationship.objectId &&
          relationship.predicate,
      );
  });
}

async function focusRelationship(page: Page, relationship: RelationshipFocus): Promise<void> {
  const semantic = page.locator(
    `.timeline-semantic-occurrence[data-id="${relationship.focusId}"]`,
  );
  await semantic.evaluate((button: HTMLButtonElement) => button.click());
  await expect(semantic).toHaveAttribute("data-selected", "");
}

async function openPersistentComposer(page: Page): Promise<Locator> {
  const composer = page.locator("#occurrence-composer");
  if ((await composer.getAttribute("active")) === null) {
    await composer.locator("button.compact").click();
  }
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator("input")).toBeFocused();
  return composer;
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

    const id = await page.locator('.temporal-graph-canvas [role="status"]').evaluate((status) => {
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
    const inwardDx = empty.x > 0.5 ? -54 : 54;
    await swipeFinger.move([{ x: start.x + inwardDx, y: start.y }]);
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

  test("selected occurrence composition edits the canonical relationship in place", async ({
    page,
  }) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship) test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await focusRelationship(page, relationship!);
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const initial = await input.inputValue();
    expect(initial).toContain(`@${relationship!.subjectId} ${relationship!.predicate} @${relationship!.objectId}`);

    const beforeCount = await page.evaluate(
      () =>
        (
          window as typeof window & {
            TimelineAgentAPI?: { getProject?: () => { relationships?: unknown[] } };
          }
        ).TimelineAgentAPI?.getProject?.()?.relationships?.length ?? 0,
    );
    const replacementPredicate = relationship!.predicate === "reframes" ? "recounts" : "reframes";
    const edited = initial.replace(
      `@${relationship!.subjectId} ${relationship!.predicate} @${relationship!.objectId}`,
      `@${relationship!.subjectId} ${replacementPredicate} @${relationship!.objectId}`,
    );
    expect(edited).not.toBe(initial);
    await input.fill(edited);
    await input.press("Enter");

    await expect
      .poll(async () =>
        page.evaluate((relationshipId) => {
          const project = (
            window as typeof window & {
              TimelineAgentAPI?: {
                getProject?: () => {
                  relationships?: Array<{ id?: unknown; predicate?: unknown }>;
                };
              };
            }
          ).TimelineAgentAPI?.getProject?.();
          const relationships = project?.relationships ?? [];
          return {
            count: relationships.length,
            predicate: String(
              relationships.find((candidate) => String(candidate.id) === relationshipId)
                ?.predicate ?? "",
            ),
          };
        }, relationship!.relationshipId),
      )
      .toEqual({
        count: beforeCount,
        predicate: replacementPredicate,
      });

    const persisted = await page.evaluate((relationshipId) => {
      const relationships =
        (
          window as typeof window & {
            TimelineAgentAPI?: {
              getProject?: () => {
                relationships?: Array<{ id?: unknown; predicate?: unknown }>;
              };
            };
          }
        ).TimelineAgentAPI?.getProject?.()?.relationships ?? [];
      return relationships.filter((candidate) => String(candidate.id) === relationshipId);
    }, relationship!.relationshipId);
    expect(persisted).toHaveLength(1);
    expect(String(persisted[0]?.predicate)).toBe(replacementPredicate);
    expect(await input.inputValue()).toContain(
      `@${relationship!.subjectId} ${replacementPredicate} @${relationship!.objectId}`,
    );
  });

  test("dirty composer draft requires explicit adoption of a newly selected occurrence", async ({
    page,
  }) => {
    await page.goto("/");
    const relationships = await relationshipFocuses(page);
    test.skip(relationships.length < 2, "Example project needs two focusable relationships.");
    const first = relationships[0]!;
    const second = relationships.find(
      (relationship) => relationship.relationshipId !== first.relationshipId,
    );
    test.skip(!second, "Example project needs two distinct focusable relationships.");

    await focusRelationship(page, first);
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const baseline = await input.inputValue();
    const dirty = `${baseline} `;
    await input.fill(dirty);
    await focusRelationship(page, second!);

    await expect(input).toHaveValue(dirty);
    const pending = composer.locator('[data-context-kind="pending-selection"]');
    await expect(pending).toBeVisible();
    await expect(pending).toContainText("Use selected context");

    await pending.click();
    await expect(input).not.toHaveValue(dirty);
    const adopted = await input.inputValue();
    expect(adopted).toContain(
      `@${second!.subjectId} ${second!.predicate} @${second!.objectId}`,
    );
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
      const agentAPI = (
        window as typeof window & { TimelineAgentAPI?: { getProject?: () => unknown } }
      ).TimelineAgentAPI;
      const project = agentAPI?.getProject?.();
      return Boolean(project?.entities?.some((entity) => String(entity.id) === id));
    }, entityId);
    expect(canonicalExists).toBe(true);

    await input.press("Escape");
    await expect(page.locator("#occurrence-composer")).not.toHaveAttribute("active", "");
    await expect(
      page.locator('.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]'),
    ).not.toHaveCount(0);
  });

  test("closing contextual authoring restores its World invoker without changing selection or scroll", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const entityId = await selectEntityWithTimelineContext(page);
    const selectedChronology = page.locator(
      '.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]',
    );
    await expect(selectedChronology).not.toHaveCount(0);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await expect(world).toBeFocused();

    const beforeScroll = await page.evaluate(() => ({
      x: globalThis.scrollX,
      y: globalThis.scrollY,
    }));

    await page.keyboard.press("Shift+F10");
    const composer = page.locator("#occurrence-composer");
    const input = composer.locator("input");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("@" + entityId + " ");

    await input.press("Escape");
    await expect(composer).not.toHaveAttribute("active", "");
    await expect(world).toBeFocused();
    await expect(selectedChronology).not.toHaveCount(0);

    const afterScroll = await page.evaluate(() => ({
      x: globalThis.scrollX,
      y: globalThis.scrollY,
    }));
    expect(afterScroll).toEqual(beforeScroll);
  });

  test("S23-class portrait and landscape keep contextual composer fully contained without document scroll", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Mobile Chrome",
      "Run the explicit S23-size certification once on the touch/mobile project.",
    );

    const cases = [
      { name: "portrait", width: 360, height: 780 },
      { name: "landscape", width: 780, height: 360 },
    ] as const;

    for (const viewport of cases) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      test.skip(
        !(await certifyWebGlWorld(page)),
        "WebGL2 unavailable; WorldSurface is not active.",
      );

      const empty = await discoverEmptyWorldPoint(page);
      await assertComposerInsideFooter(page);

      const composer = page.locator("#occurrence-composer");
      const input = composer.locator("input");
      await expect(input).toHaveAttribute("role", "combobox");
      await expect(input).toHaveAttribute("aria-expanded");
      await expect(input).toBeFocused();

      const visualContainment = await page.evaluate(() => {
        const visual = window.visualViewport;
        const composer = document.querySelector("#occurrence-composer");
        const footer = document.querySelector(".app-tool-dock.app-footer-bar");
        if (!(composer instanceof HTMLElement) || !(footer instanceof HTMLElement)) return null;
        const composerRect = composer.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const visualWidth = visual?.width ?? window.innerWidth;
        const visualHeight = visual?.height ?? window.innerHeight;
        return {
          composer: {
            left: composerRect.left,
            right: composerRect.right,
            top: composerRect.top,
            bottom: composerRect.bottom,
          },
          footer: {
            left: footerRect.left,
            right: footerRect.right,
            top: footerRect.top,
            bottom: footerRect.bottom,
          },
          visualWidth,
          visualHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        };
      });
      if (!visualContainment) throw new Error("S23 contextual authoring geometry is unavailable.");

      expect(visualContainment.composer.left, viewport.name).toBeGreaterThanOrEqual(-1);
      expect(visualContainment.composer.right, viewport.name).toBeLessThanOrEqual(
        visualContainment.visualWidth + 1,
      );
      expect(visualContainment.composer.top, viewport.name).toBeGreaterThanOrEqual(-1);
      expect(visualContainment.composer.bottom, viewport.name).toBeLessThanOrEqual(
        visualContainment.visualHeight + 1,
      );
      expect(visualContainment.scrollWidth, viewport.name).toBeLessThanOrEqual(viewport.width + 2);
      expect(visualContainment.scrollHeight, viewport.name).toBeLessThanOrEqual(
        viewport.height + 2,
      );

      await input.press("Escape");
      await expect(composer).not.toHaveAttribute("active", "");
      await expect(page.locator(".temporal-graph-canvas")).toBeFocused();

      // Start the next orientation from a settled, closed authoring state.
      await page.goto("/");
    }
  });
});
