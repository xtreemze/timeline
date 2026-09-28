import { expect, type Page, test } from "@playwright/test";

type Viewport = { width: number; height: number };
type Rect = Viewport & { x: number; y: number };

const NARROW_PORTRAIT = { width: 360, height: 780 };
const NARROW_LANDSCAPE = { width: 780, height: 360 };

async function ensureOrientation(page: Page, orientation: "portrait" | "landscape") {
  const timeline = page.locator("#timeline-view");
  await expect(timeline).toBeVisible();
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
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
        const agentAPI = (
          window as typeof window & {
            TimelineAgentAPI?: { getProject?: () => { items?: readonly unknown[] } };
          }
        ).TimelineAgentAPI;
        const project = agentAPI?.getProject?.();
        const root = document.querySelector("#timeline-view");
        const TimelineView = (
          window as typeof window & {
            TimelineView?: {
              create?: (root: HTMLElement) => { items?: readonly unknown[] };
            };
          }
        ).TimelineView;
        const view =
          root instanceof HTMLElement ? (TimelineView?.create?.(root) ?? null) : null;
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

    const [surfaceBox, terminalBox] = await Promise.all([
      surface.boundingBox(),
      terminal.boundingBox(),
    ]);
    expect(surfaceBox).not.toBeNull();
    expect(terminalBox).not.toBeNull();
    if (!surfaceBox || !terminalBox)
      throw new Error("Bundled sample timeline has no visible geometry.");
    const intersection = overlap(surfaceBox, terminalBox);
    expect(intersection.x).toBeGreaterThan(0);
    expect(intersection.y).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });
  test("footer composer opens through Edit and keeps direct timeline controls usable", async ({
    page,
  }) => {
    for (const { viewport, orientation } of [
      { viewport: NARROW_PORTRAIT, orientation: "portrait" as const },
      { viewport: NARROW_LANDSCAPE, orientation: "landscape" as const },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await ensureOrientation(page, orientation);

      const dock = page.locator(".app-tool-dock");
      const composer = page.locator("#occurrence-composer");
      const compact = composer.locator(".compact");
      const input = composer.locator("input");
      const timelineToggle = page.locator("#timeline-orientation-toggle");
      const actions = page.locator(".app-footer-actions");
      const viewControls = page.locator("#timeline-view-controls");
      await expect(compact).toBeVisible();
      const [before, collapsedActions, collapsedComposer, collapsedView] = await Promise.all([
        dock.boundingBox(),
        actions.boundingBox(),
        composer.boundingBox(),
        viewControls.boundingBox(),
      ]);
      expect(before).not.toBeNull();
      expect(collapsedActions).not.toBeNull();
      expect(collapsedComposer).not.toBeNull();
      expect(collapsedView).not.toBeNull();
      if (!before || !collapsedActions || !collapsedComposer || !collapsedView) {
        throw new Error("Footer geometry is unavailable before composer expansion.");
      }
      expect(collapsedComposer.width).toBeGreaterThanOrEqual(120);
      expect(collapsedComposer.width).toBeLessThanOrEqual(220);
      expect(collapsedActions.x).toBeLessThan(collapsedComposer.x);
      expect(collapsedComposer.x).toBeLessThan(collapsedView.x);

      await compact.click();
      await expect(composer).toHaveAttribute("active", "");
      await expect(input).toBeVisible();
      await expect(composer.locator(".context-row")).toBeVisible();
      const visualViewportHeight = await page.evaluate(
        () => window.visualViewport?.height ?? innerHeight,
      );
      const composerViewportHeight = await composer.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--composer-visual-viewport-height").trim(),
      );
      expect(composerViewportHeight).toBe(String(Math.round(visualViewportHeight)) + "px");

      const [expanded, inputBox, completionBox, actionsBox, viewBox, composerBox] = await Promise.all([
        dock.boundingBox(),
        input.boundingBox(),
        composer.locator(".completion-panel").boundingBox(),
        actions.boundingBox(),
        viewControls.boundingBox(),
        composer.boundingBox(),
      ]);
      expect(expanded).not.toBeNull();
      expect(inputBox).not.toBeNull();
      expect(completionBox).not.toBeNull();
      expect(actionsBox).not.toBeNull();
      expect(viewBox).not.toBeNull();
      expect(composerBox).not.toBeNull();
      if (!expanded || !inputBox || !completionBox || !actionsBox || !viewBox || !composerBox) {
        throw new Error("Footer composer geometry is unavailable after expansion.");
      }
      expect(Math.abs(expanded.height - before.height)).toBeLessThanOrEqual(8);
      const rowCenter = expanded.y + expanded.height / 2;
      for (const box of [actionsBox, composerBox, viewBox]) {
        expect(Math.abs(box.y + box.height / 2 - rowCenter)).toBeLessThanOrEqual(4);
      }
      expect(inputBox.width).toBeGreaterThanOrEqual(Math.min(112, viewport.width * 0.32));
      expect(inputBox.x).toBeGreaterThanOrEqual(expanded.x - 1);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(expanded.x + expanded.width + 1);
      expect(inputBox.y).toBeGreaterThanOrEqual(expanded.y - 1);
      expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(expanded.y + expanded.height + 1);
      expect(completionBox.x).toBeGreaterThanOrEqual(-1);
      expect(completionBox.x + completionBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(completionBox.y).toBeGreaterThanOrEqual(-1);
      expect(completionBox.height).toBeLessThanOrEqual(
        Math.max(112, visualViewportHeight * 0.42) + 2,
      );

      await expect(actions).toBeVisible();
      await expect(viewControls).toBeVisible();
      await expect(timelineToggle).toBeEnabled();

      const nextOrientation = orientation === "portrait" ? "landscape" : "portrait";
      await timelineToggle.click();
      await expect(page.locator("#timeline-view")).toHaveAttribute(
        "data-orientation",
        nextOrientation,
      );
      await expect(input).toBeVisible();
      await input.press("Escape");
      await expect(composer).not.toHaveAttribute("active", "");

      const collapsed = await dock.boundingBox();
      expect(collapsed).not.toBeNull();
      if (collapsed) expect(Math.abs(collapsed.height - expanded.height)).toBeLessThanOrEqual(8);
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
        const firstBox = boxes[first];
        const secondBox = boxes[second];
        if (!firstBox || !secondBox) {
          throw new Error("Timeline card geometry disappeared during overlap validation.");
        }
        const intersection = overlap(firstBox, secondBox);
        expect(
          intersection.x > 2 && intersection.y > 2,
          `compact horizontal timeline cards ${first} and ${second} overlap by ${Math.max(0, intersection.x).toFixed(1)}×${Math.max(0, intersection.y).toFixed(1)}px`,
        ).toBe(false);
      }
    }

    await expectNoPageScroll(page, NARROW_PORTRAIT);
  });

  test("focused occurrence keeps the mobile toolbar composition stable", async ({ page }) => {
    const viewport = { width: 320, height: 568 };
    await page.setViewportSize(viewport);
    await page.goto("/");
    await ensureOrientation(page, "portrait");

    const dock = page.locator(".app-tool-dock");
    const beforeChildren = await dock.evaluate((element) =>
      [...element.children].map((child) => child.id || child.className),
    );
    const beforeWidth = await dock.evaluate((element) => element.scrollWidth);
    const viewToolbar = dock.locator("#timeline-view-controls");
    const composer = dock.locator("#occurrence-composer");
    const beforeViewScroll = await viewToolbar.evaluate((element) => element.scrollLeft);
    await expect(composer.locator(".compact")).toBeVisible();

    const terminal = page
      .locator(
        ".timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-terminal:visible",
      )
      .first();
    await expect(terminal).toBeVisible();
    await terminal.click();

    const focus = page.locator("#timeline-focus-view");
    const actions = focus.locator(".timeline-focus-context-actions");
    await expect(actions).toBeVisible();
    await expect(actions.locator("#timeline-focus-prev")).toBeVisible();
    await expect(actions.locator("#timeline-focus-next")).toBeVisible();
    await expect(page.locator(".app-footer-bar #timeline-focus-prev")).toHaveCount(0);
    await expect(page.locator(".app-footer-bar #timeline-related-zoom")).toHaveCount(0);

    const afterChildren = await dock.evaluate((element) =>
      [...element.children].map((child) => child.id || child.className),
    );
    const afterWidth = await dock.evaluate((element) => element.scrollWidth);
    const afterViewScroll = await viewToolbar.evaluate((element) => element.scrollLeft);
    expect(afterChildren).toEqual(beforeChildren);
    expect(Math.abs(afterWidth - beforeWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterViewScroll - beforeViewScroll)).toBeLessThanOrEqual(1);
    await expect(composer.locator(".compact")).toBeVisible();

    for (const selector of ["#timeline-focus-prev", "#timeline-focus-next"]) {
      const action = actions.locator(selector);
      const [buttonBox, iconBox] = await Promise.all([
        action.boundingBox(),
        action.locator(":scope > .semantic-icon").boundingBox(),
      ]);
      expect(buttonBox).not.toBeNull();
      expect(iconBox).not.toBeNull();
      if (!buttonBox || !iconBox) continue;
      expect(Math.abs(buttonBox.width - 44)).toBeLessThanOrEqual(1);
      expect(Math.abs(buttonBox.height - 44)).toBeLessThanOrEqual(1);
      expect(Math.abs(iconBox.width - 20)).toBeLessThanOrEqual(1);
      expect(Math.abs(iconBox.height - 20)).toBeLessThanOrEqual(1);
    }

    await expectNoPageScroll(page, viewport);
  });

  for (const { label, viewport, orientation } of [
    { label: "portrait", viewport: NARROW_PORTRAIT, orientation: "portrait" as const },
    { label: "landscape", viewport: NARROW_LANDSCAPE, orientation: "landscape" as const },
  ]) {
    test(`footer controls stay uniform and horizontally reachable on narrow mobile ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await ensureOrientation(page, orientation);

      const dock = page.locator(".app-tool-dock");
      const viewToolbar = dock.locator("#timeline-view-controls");
      await expect(dock).toBeVisible();
      await expect(viewToolbar).toBeVisible();

      const metrics = await dock.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const view = element.querySelector<HTMLElement>("#timeline-view-controls");
        return {
          display: style.display,
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          top: rect.top,
          bottom: rect.bottom,
          viewOverflowX: view ? getComputedStyle(view).overflowX : "",
          viewClientWidth: view?.clientWidth ?? 0,
          viewScrollWidth: view?.scrollWidth ?? 0,
        };
      });

      expect(metrics.display).toBe("grid");
      expect(metrics.viewOverflowX).toBe("auto");
      expect(metrics.viewScrollWidth).toBeGreaterThanOrEqual(metrics.viewClientWidth);
      if (viewport.width < 700) {
        expect(metrics.overflowX).not.toBe("auto");
        const composer = dock.locator("#occurrence-composer");
        await expect(composer.locator(".compact")).toBeVisible();
        const composerBox = await composer.boundingBox();
        expect(composerBox).not.toBeNull();
        if (composerBox) {
          expect(composerBox.width).toBeGreaterThanOrEqual(120);
          expect(composerBox.width).toBeLessThanOrEqual(220);
        }
      }

      const buttons = dock.locator(
        ":scope > .app-footer-actions > button:visible, :scope > .app-footer-view button:visible",
      );
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(8);
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
        buttonGeometry.push(geometry);
      }

      const visibleGeometry = buttonGeometry.filter(
        (geometry) => geometry.bottom >= metrics.top && geometry.top <= metrics.bottom,
      );
      expect(visibleGeometry.length).toBeGreaterThanOrEqual(3);

      const worldZoom = dock.locator(".world-zoom-control");
      const worldZoomSlider = worldZoom.locator(".world-zoom-slider");
      await expect(worldZoom).toBeVisible();
      await expect(worldZoomSlider).toBeVisible();
      const [worldZoomBox, worldZoomSliderBox] = await Promise.all([
        worldZoom.boundingBox(),
        worldZoomSlider.boundingBox(),
      ]);
      expect(worldZoomBox).not.toBeNull();
      expect(worldZoomSliderBox).not.toBeNull();
      if (worldZoomBox && worldZoomSliderBox) {
        expect(Math.abs(worldZoomBox.height - 44)).toBeLessThanOrEqual(1);
        expect(Math.abs(worldZoomSliderBox.height - 44)).toBeLessThanOrEqual(1);
        expect(worldZoomSliderBox.width).toBeGreaterThanOrEqual(64);
      }

      const semanticIcons = dock.locator(".toolbar-control .semantic-icon:visible");
      const semanticIconCount = await semanticIcons.count();
      expect(semanticIconCount).toBeGreaterThanOrEqual(8);
      for (let index = 0; index < semanticIconCount; index += 1) {
        const box = await semanticIcons.nth(index).boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;
        expect(Math.abs(box.width - 20)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - 20)).toBeLessThanOrEqual(1);
        const buttonBox = await semanticIcons.nth(index).locator("xpath=..").boundingBox();
        expect(buttonBox).not.toBeNull();
        if (buttonBox) {
          expect(
            Math.abs(box.x + box.width / 2 - (buttonBox.x + buttonBox.width / 2)),
          ).toBeLessThanOrEqual(0.75);
          expect(
            Math.abs(box.y + box.height / 2 - (buttonBox.y + buttonBox.height / 2)),
          ).toBeLessThanOrEqual(0.75);
        }
      }

      const timelineZoom = dock.locator(".timeline-zoom-control");
      const timelineZoomSlider = timelineZoom.locator(".timeline-zoom-slider");
      const [timelineZoomBox, timelineZoomSliderBox] = await Promise.all([
        timelineZoom.boundingBox(),
        timelineZoomSlider.boundingBox(),
      ]);
      expect(timelineZoomBox).not.toBeNull();
      expect(timelineZoomSliderBox).not.toBeNull();
      if (worldZoomBox && timelineZoomBox) {
        expect(Math.abs(worldZoomBox.width - timelineZoomBox.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(worldZoomBox.height - timelineZoomBox.height)).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            worldZoomBox.y + worldZoomBox.height / 2 -
              (timelineZoomBox.y + timelineZoomBox.height / 2),
          ),
        ).toBeLessThanOrEqual(0.75);
      }
      if (worldZoomSliderBox && timelineZoomSliderBox) {
        expect(Math.abs(worldZoomSliderBox.width - timelineZoomSliderBox.width)).toBeLessThanOrEqual(
          1,
        );
        expect(
          Math.abs(worldZoomSliderBox.height - timelineZoomSliderBox.height),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            worldZoomSliderBox.y + worldZoomSliderBox.height / 2 -
              (timelineZoomSliderBox.y + timelineZoomSliderBox.height / 2),
          ),
        ).toBeLessThanOrEqual(0.75);
      }

      const timelineZoomButtons = timelineZoom.locator(".timeline-zoom-endpoint-button");
      await expect(timelineZoomButtons).toHaveCount(2);
      const timelineZoomCenterY =
        timelineZoomBox === null ? null : timelineZoomBox.y + timelineZoomBox.height / 2;
      if (timelineZoomCenterY !== null) {
        for (let index = 0; index < 2; index += 1) {
          const buttonBox = await timelineZoomButtons.nth(index).boundingBox();
          expect(buttonBox).not.toBeNull();
          if (buttonBox) {
            expect(
              Math.abs(buttonBox.y + buttonBox.height / 2 - timelineZoomCenterY),
            ).toBeLessThanOrEqual(0.75);
          }
        }
      }

      const lastControl = viewToolbar.locator(".toolbar-control").last();
      await viewToolbar.evaluate((element) => {
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
