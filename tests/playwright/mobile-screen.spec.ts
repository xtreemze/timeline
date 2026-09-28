import { expect, test, type Page } from "@playwright/test";

type Viewport = { width: number; height: number };
type Rect = Viewport & { x: number; y: number };

const NARROW_PORTRAIT = { width: 360, height: 780 };
const NARROW_LANDSCAPE = { width: 780, height: 360 };

async function ensureOrientation(page: Page, orientation: "portrait" | "landscape") {
  const timeline = page.locator("#timeline-view");
  await expect(timeline).toBeVisible();
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-view-controls-toggle").click();
    await page.locator("#timeline-orientation-toggle").click();
    await page.keyboard.press("Escape");
  }
  await expect(timeline).toHaveAttribute("data-orientation", orientation);
}

async function expectNoPageScroll(page: Page, viewport: Viewport) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(dimensions.height).toBeLessThanOrEqual(viewport.height + 2);
}

function overlap(a: Rect, b: Rect) {
  return {
    x: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    y: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}

test.describe("Narrow mobile screen contracts", () => {
  test("fresh bundled sample initializes the timeline controller", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.setViewportSize(NARROW_PORTRAIT);
    await page.goto("/");
    await expect(page.locator("#timeline-view")).toBeVisible();

    const readTimelineCounts = () =>
      page.evaluate(() => {
        const project = globalThis.TimelineAgentAPI?.getProject?.();
        const root = document.querySelector("#timeline-view");
        const view = root instanceof HTMLElement ? globalThis.TimelineView?.create(root) : null;
        return {
          projectItems: project?.items?.length ?? 0,
          controllerItems: view?.items?.length ?? 0,
        };
      });

    await expect
      .poll(async () => {
        const counts = await readTimelineCounts();
        return counts.projectItems > 0 && counts.controllerItems === counts.projectItems;
      })
      .toBe(true);

    const counts = await readTimelineCounts();
    expect(counts.projectItems).toBeGreaterThan(0);
    expect(counts.controllerItems).toBe(counts.projectItems);

    const surface = page.locator("#timeline-surface");
    const terminal = page
      .locator(".timeline-event:not(.is-buffered) .timeline-event-terminal:visible")
      .first();
    await expect(terminal).toBeVisible();

    const [surfaceBox, terminalBox] = await Promise.all([surface.boundingBox(), terminal.boundingBox()]);
    expect(surfaceBox).not.toBeNull();
    expect(terminalBox).not.toBeNull();
    if (!surfaceBox || !terminalBox) throw new Error("Bundled sample timeline has no visible geometry.");
    const intersection = overlap(surfaceBox, terminalBox);
    expect(intersection.x).toBeGreaterThan(0);
    expect(intersection.y).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });
  test("footer composer expands in-flow and keeps timeline controls usable", async ({ page }) => {
    for (const { viewport, orientation } of [
      { viewport: NARROW_PORTRAIT, orientation: "portrait" as const },
      { viewport: NARROW_LANDSCAPE, orientation: "landscape" as const },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await ensureOrientation(page, orientation);

      const dock = page.locator(".app-tool-dock");
      const composer = page.locator("#occurrence-composer");
      const toggle = page.locator("#occurrence-composer-toggle");
      const input = composer.locator("input");
      const viewToggle = page.locator("#timeline-view-controls-toggle");
      const timelineToggle = page.locator("#timeline-orientation-toggle");
      const before = await dock.boundingBox();
      expect(before).not.toBeNull();
      if (!before) throw new Error("Footer geometry is unavailable before composer expansion.");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(composer).toHaveAttribute("active", "");
      await expect(input).toBeVisible();

      const [expanded, inputBox] = await Promise.all([dock.boundingBox(), input.boundingBox()]);
      expect(expanded).not.toBeNull();
      expect(inputBox).not.toBeNull();
      if (!expanded || !inputBox) {
        throw new Error("Footer composer geometry is unavailable after expansion.");
      }
      expect(expanded.height).toBeGreaterThan(before.height + 40);
      expect(inputBox.x).toBeGreaterThanOrEqual(expanded.x - 1);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(expanded.x + expanded.width + 1);
      expect(inputBox.y).toBeGreaterThanOrEqual(expanded.y - 1);
      expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(expanded.y + expanded.height + 1);

      await expect(page.locator(".app-footer-actions")).toBeVisible();
      await expect(viewToggle).toBeVisible();
      await viewToggle.click();
      await expect(page.locator("#timeline-view-controls")).toBeVisible();
      await expect(timelineToggle).toBeVisible();

      const nextOrientation = orientation === "portrait" ? "landscape" : "portrait";
      await timelineToggle.click();
      await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", nextOrientation);
      await expect(input).toBeVisible();
      await page.keyboard.press("Escape");
      await expectNoPageScroll(page, viewport);

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(composer).not.toHaveAttribute("active", "");
      const collapsed = await dock.boundingBox();
      expect(collapsed).not.toBeNull();
      if (collapsed) expect(collapsed.height).toBeLessThan(expanded.height - 40);
      await expectNoPageScroll(page, viewport);
    }
  });

  test("portrait event cards remain readable at the screen edge without overlapping", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW_PORTRAIT);
    await page.goto("/");
    await ensureOrientation(page, "portrait");

    const copies = page.locator(
      ".timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-copy:visible",
    );
    await expect.poll(() => copies.count()).toBeGreaterThan(1);

    const visibleCards: Rect[] = [];
    for (let index = 0; index < (await copies.count()); index += 1) {
      const copy = copies.nth(index);
      const box = await copy.boundingBox();
      const text = (await copy.textContent())?.trim() ?? "";
      if (!box || !text) continue;
      if (
        box.x + box.width < 0 ||
        box.x > NARROW_PORTRAIT.width ||
        box.y + box.height < 0 ||
        box.y > NARROW_PORTRAIT.height
      ) {
        continue;
      }

      // Cards may extend into the world view on the left, but readable copy
      // must never be clipped by the physical right edge of the phone.
      expect(box.x + box.width).toBeLessThanOrEqual(NARROW_PORTRAIT.width + 2);
      expect(box.y).toBeGreaterThanOrEqual(-2);
      expect(box.y + box.height).toBeLessThanOrEqual(NARROW_PORTRAIT.height + 2);
      visibleCards.push(box);
    }

    expect(visibleCards.length).toBeGreaterThan(1);
    for (let first = 0; first < visibleCards.length; first += 1) {
      for (let second = first + 1; second < visibleCards.length; second += 1) {
        const intersection = overlap(visibleCards[first]!, visibleCards[second]!);
        expect(
          intersection.x > 2 && intersection.y > 2,
          `mobile timeline cards ${first} and ${second} overlap by ${Math.max(0, intersection.x).toFixed(1)}×${Math.max(0, intersection.y).toFixed(1)}px`,
        ).toBe(false);
      }
    }

    await expectNoPageScroll(page, NARROW_PORTRAIT);
  });

  test("portrait phone horizontal timeline keeps cards close to the bottom rail without covering the world", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW_PORTRAIT);
    await page.goto("/");
    await ensureOrientation(page, "landscape");

    const surface = page.locator(".timeline-surface");
    const axis = page.locator(".timeline-axis");
    const world = page.locator("#presentation-stage > .graph-lens:not([hidden])");
    const [surfaceBox, axisBox, worldBox] = await Promise.all([
      surface.boundingBox(),
      axis.boundingBox(),
      world.boundingBox(),
    ]);
    expect(surfaceBox).not.toBeNull();
    expect(axisBox).not.toBeNull();
    expect(worldBox).not.toBeNull();
    if (!surfaceBox || !axisBox || !worldBox) {
      throw new Error("Compact portrait world/timeline geometry is unavailable.");
    }

    const axisY = axisBox.y + axisBox.height / 2;
    const axisRatio = (axisY - surfaceBox.y) / surfaceBox.height;
    expect(axisRatio).toBeGreaterThan(0.56);
    expect(axisRatio).toBeLessThan(0.6);
    expect(Math.abs(worldBox.y + worldBox.height - surfaceBox.y)).toBeLessThanOrEqual(3);

    const terminals = page.locator(
      ".timeline-event:not(.is-buffered) .timeline-event-terminal:visible",
    );
    await expect.poll(() => terminals.count()).toBeGreaterThan(0);

    const boxes: Rect[] = [];
    let nearestCenterToAxis = Number.POSITIVE_INFINITY;
    const maximumWorldIntrusion = Math.min(140, surfaceBox.height * 0.65);
    for (let index = 0; index < (await terminals.count()); index += 1) {
      const box = await terminals.nth(index).boundingBox();
      if (!box) continue;
      const centerY = box.y + box.height / 2;
      nearestCenterToAxis = Math.min(nearestCenterToAxis, axisY - centerY);

      // Cards belong above the chronology axis and may project slightly into
      // the world, but compact rails must not let deeper lanes consume it.
      expect(centerY).toBeLessThan(axisY);
      expect(box.y).toBeGreaterThanOrEqual(surfaceBox.y - maximumWorldIntrusion - 2);
      expect(box.y + box.height).toBeLessThanOrEqual(axisY + 8);

      // Horizontal edge flipping must keep the complete interactive card readable.
      expect(box.x).toBeGreaterThanOrEqual(-2);
      expect(box.x + box.width).toBeLessThanOrEqual(NARROW_PORTRAIT.width + 2);
      boxes.push(box);
    }

    expect(boxes.length).toBeGreaterThan(0);
    // The first visible lane should remain visually attached to its date axis
    // instead of floating far into the world after the rail was shortened.
    expect(nearestCenterToAxis).toBeGreaterThan(12);
    expect(nearestCenterToAxis).toBeLessThan(92);

    for (let first = 0; first < boxes.length; first += 1) {
      for (let second = first + 1; second < boxes.length; second += 1) {
        const intersection = overlap(boxes[first], boxes[second]);
        expect(
          intersection.x > 2 && intersection.y > 2,
          `compact horizontal timeline cards ${first} and ${second} overlap by ${Math.max(0, intersection.x).toFixed(1)}×${Math.max(0, intersection.y).toFixed(1)}px`,
        ).toBe(false);
      }
    }

    await expectNoPageScroll(page, NARROW_PORTRAIT);
  });

  for (const { label, viewport, orientation } of [
    { label: "portrait", viewport: NARROW_PORTRAIT, orientation: "portrait" as const },
    { label: "landscape", viewport: NARROW_LANDSCAPE, orientation: "landscape" as const },
  ]) {
    test(`footer controls stay touch-sized and horizontally reachable on narrow mobile ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await ensureOrientation(page, orientation);

      const dock = page.locator(".app-tool-dock");
      const timelineToolbar = dock.locator(".app-footer-timeline");
      await expect(dock).toBeVisible();
      await expect(timelineToolbar).toBeVisible();

      const metrics = await dock.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const zones = [...element.querySelectorAll<HTMLElement>(".app-footer-zone")].map((zone) => {
          const zoneStyle = getComputedStyle(zone);
          return {
            overflowX: zoneStyle.overflowX,
            clientWidth: zone.clientWidth,
            scrollWidth: zone.scrollWidth,
          };
        });
        return {
          display: style.display,
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          top: rect.top,
          bottom: rect.bottom,
          zones,
        };
      });
      expect(metrics.display).toBe("flex");
      expect(metrics.overflowX).not.toBe("auto");
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      for (const zone of metrics.zones) {
        expect(zone.overflowX).toBe("visible");
        expect(zone.scrollWidth).toBeLessThanOrEqual(zone.clientWidth + 1);
      }

      const buttons = dock.locator(":scope > .app-footer-actions > button:visible, :scope > .app-footer-timeline > button:visible");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(5);
      const buttonGeometry: Array<{
        position: string;
        width: number;
        height: number;
        top: number;
        bottom: number;
      }> = [];
      for (let index = 0; index < buttonCount; index += 1) {
        const button = buttons.nth(index);
        const geometry = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            position: style.position,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            bottom: rect.bottom,
          };
        });
        expect(["absolute", "fixed", "sticky"]).not.toContain(geometry.position);
        expect(Math.abs(geometry.width - 44)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.height - 44)).toBeLessThanOrEqual(1);
        expect(geometry.top).toBeGreaterThanOrEqual(metrics.top - 1);
        expect(geometry.bottom).toBeLessThanOrEqual(metrics.bottom + 1);
        buttonGeometry.push(geometry);
      }

      const buttonTops = buttonGeometry.map((geometry) => geometry.top);
      const buttonBottoms = buttonGeometry.map((geometry) => geometry.bottom);
      expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeLessThanOrEqual(1);
      expect(Math.max(...buttonBottoms) - Math.min(...buttonBottoms)).toBeLessThanOrEqual(1);

      const actions = dock.locator(".app-footer-actions");
      await expect(actions).toBeVisible();
      const geometry = await actions.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          position: style.position,
          top: rect.top,
          bottom: rect.bottom,
        };
      });
      expect(["absolute", "fixed", "sticky"]).not.toContain(geometry.position);
      expect(geometry.top).toBeGreaterThanOrEqual(metrics.top - 1);
      expect(geometry.bottom).toBeLessThanOrEqual(metrics.bottom + 1);

      const semanticIcons = dock.locator(".toolbar-control .semantic-icon:visible");
      const semanticIconCount = await semanticIcons.count();
      expect(semanticIconCount).toBeGreaterThanOrEqual(4);
      for (let index = 0; index < semanticIconCount; index += 1) {
        const box = await semanticIcons.nth(index).boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;
        expect(Math.abs(box.width - 20)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - 20)).toBeLessThanOrEqual(1);
      }

      const lastControl = timelineToolbar.locator(".toolbar-control").last();
      await dock.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await expect
        .poll(async () => {
          const [dockBox, controlBox] = await Promise.all([
            dock.boundingBox(),
            lastControl.boundingBox(),
          ]);
          if (!dockBox || !controlBox) return false;
          return (
            controlBox.x + controlBox.width <= dockBox.x + dockBox.width + 2 &&
            controlBox.x + controlBox.width >= dockBox.x
          );
        })
        .toBe(true);

      await expectNoPageScroll(page, viewport);
    });
  }
});
