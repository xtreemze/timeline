import { expect, type Locator, test } from "@playwright/test";
import { doubleTap, touchscreen } from "../support/touch-gestures.ts";

async function installViewportRecorder(page) {
  await page.evaluate(() => {
    const root = document.querySelector("#timeline-view");
    if (!root) throw new Error("Timeline root is missing.");
    globalThis.__timelineViewportEvents = [];
    root.addEventListener("timelineviewportchange", (event) => {
      globalThis.__timelineViewportEvents.push({
        viewport: { ...event.detail.viewport },
        committed: Boolean(event.detail.committed),
      });
    });
  });
}

async function clearViewportEvents(page) {
  await page.evaluate(() => {
    globalThis.__timelineViewportEvents = [];
  });
}

async function viewportEvents(page) {
  return page.evaluate(() => globalThis.__timelineViewportEvents ?? []);
}

async function waitForViewportEvents(page, minimum = 1) {
  await expect
    .poll(() => page.evaluate(() => globalThis.__timelineViewportEvents?.length ?? 0))
    .toBeGreaterThanOrEqual(minimum);
}

function span(event) {
  return event.viewport.end - event.viewport.start;
}

async function settleTimeline(page) {
  await expect
    .poll(() => page.locator("#timeline-view").getAttribute("data-scene-state"))
    .not.toBe("interacting");
}

/**
 * Real input is hit-tested with Chromium's touch adjustment, which snaps a
 * fingertip to a nearby control inside its contact area, and presses that start
 * on an event, range bar or other control activate it instead of moving the
 * camera. Finds a row where the gesture's first point (the first of
 * `xFractions`, all shifted together if needed) has a finger-sized radius of
 * open background; later points only need to stay on the surface, since
 * pans and pinches keep going across controls once started.
 */
async function openSurfaceRow<const Fractions extends readonly number[]>(
  surface: Locator,
  xFractions: Fractions,
): Promise<{ xs: { readonly [Index in keyof Fractions]: number }; y: number }> {
  const row = await surface.evaluate((element, fractions) => {
    const FINGER_RADIUS_PX = 28;
    const rect = element.getBoundingClientRect();
    const open = (x: number, y: number) => {
      if (x < rect.left || x > rect.right) return false;
      for (let dx = -FINGER_RADIUS_PX; dx <= FINGER_RADIUS_PX; dx += 7) {
        for (let dy = -FINGER_RADIUS_PX; dy <= FINGER_RADIUS_PX; dy += 7) {
          if (dx * dx + dy * dy > FINGER_RADIUS_PX ** 2) continue;
          const hit = document.elementFromPoint(x + dx, y + dy);
          if (!hit || !element.contains(hit)) return false;
          if (hit.closest("button, a, input, select, textarea")) return false;
        }
      }
      return true;
    };
    // Scan outwards from the middle so gestures stay central.
    const outwards = (limit: number, step: number) =>
      Array.from({ length: Math.floor(limit / step) * 2 + 1 }, (_, index) => {
        const distance = Math.ceil(index / 2) * step;
        return index % 2 ? distance : -distance;
      });
    for (const dy of outwards(0.45, 0.03)) {
      const y = rect.top + rect.height * (0.5 + dy);
      for (const shift of outwards(0.2, 0.02)) {
        const shifted = fractions.map((fraction) => fraction + shift);
        if (shifted.some((fraction) => fraction < 0.03 || fraction > 0.97)) continue;
        const xs = shifted.map((fraction) => rect.left + rect.width * fraction);
        const [first] = xs;
        if (first !== undefined && open(first, y)) return { xs, y };
      }
    }
    return null;
  }, xFractions);
  if (!row) throw new Error("Timeline surface has no open background row for the gesture.");
  // One x per requested fraction, in order.
  return row as { xs: { readonly [Index in keyof Fractions]: number }; y: number };
}

async function performPan(surface, testInfo) {
  const {
    xs: [startX, middleX, endX],
    y,
  } = await openSurfaceRow(surface, [0.72, 0.52, 0.32]);

  if (testInfo.project.use.hasTouch) {
    const finger = await touchscreen(surface.page());
    for (const x of [startX, middleX, endX]) await finger.move([{ x, y }]);
    return () => finger.end();
  }

  const mouse = surface.page().mouse;
  await mouse.move(startX, y);
  await mouse.down();
  for (const x of [middleX, endX]) await mouse.move(x, y);
  return () => mouse.up();
}

test.describe("Timeline interaction contracts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#timeline-view")).toBeVisible();
    await expect(page.locator(".timeline-surface")).toBeVisible();
    await installViewportRecorder(page);
  });

  test("pointer pan changes the logical viewport and settles to a committed state", async ({
    page,
  }, testInfo) => {
    const surface = page.locator(".timeline-surface");
    const finish = await performPan(surface, testInfo);

    await waitForViewportEvents(page, 2);
    const liveEvents = await viewportEvents(page);
    expect(liveEvents.some((event) => event.committed === false)).toBeTruthy();
    expect(new Set(liveEvents.map((event) => event.viewport.start)).size).toBeGreaterThan(1);

    await finish();
    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test("viewport events publish the logical active relationship set shown by the timeline", async ({
    page,
  }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();

    // Zoom in so overscan/retention keeps offscreen relationship bands alive:
    // those retained bands must never leak into logical activation.
    for (let step = 0; step < 3; step += 1) {
      await clearViewportEvents(page);
      await page.keyboard.press("+");
      await waitForViewportEvents(page);
    }
    await settleTimeline(page);

    const latest = (await viewportEvents(page)).at(-1);
    if (!latest) throw new Error("Zoom emitted no viewport event.");
    const active = latest.viewport.activeOccurrenceIds;
    expect(Array.isArray(active)).toBeTruthy();
    expect(new Set(active).size).toBe(active.length);

    const bands = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#timeline-view [data-relationship-id]")].map(
        (node) => ({
          id: node.getAttribute("data-relationship-id"),
          visible: !node.hidden,
        }),
      ),
    );
    expect(bands.length, "the sample chronology must exercise timed relationships").toBeGreaterThan(
      0,
    );

    const visible = bands.filter((band) => band.visible).map((band) => band.id);
    const retainedOnly = bands.filter((band) => !band.visible).map((band) => band.id);
    expect([...active].sort()).toEqual([...visible].sort());
    for (const id of retainedOnly) expect(active).not.toContain(id);
  });

  test("keyboard pan emits committed viewport changes in opposite directions", async ({ page }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();

    await page.keyboard.press("ArrowRight");
    await waitForViewportEvents(page);
    const afterRight = (await viewportEvents(page)).at(-1);
    expect(afterRight?.committed).toBeTruthy();

    await clearViewportEvents(page);
    await page.keyboard.press("ArrowLeft");
    await waitForViewportEvents(page);
    const afterLeft = (await viewportEvents(page)).at(-1);
    expect(afterLeft?.committed).toBeTruthy();
    expect(afterLeft?.viewport.start).toBeLessThan(afterRight?.viewport.start);
  });

  test("keyboard zoom changes temporal span rather than merely keeping the surface visible", async ({
    page,
  }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();

    await page.keyboard.press("+");
    await waitForViewportEvents(page);
    const zoomedIn = (await viewportEvents(page)).at(-1);
    if (!zoomedIn) throw new Error("Zoom-in emitted no viewport event.");

    await clearViewportEvents(page);
    await page.keyboard.press("-");
    await waitForViewportEvents(page);
    const zoomedOut = (await viewportEvents(page)).at(-1);
    if (!zoomedOut) throw new Error("Zoom-out emitted no viewport event.");

    expect(span(zoomedOut)).toBeGreaterThan(span(zoomedIn));
  });

  test("Home fit expands a deliberately zoomed chronology back toward full context", async ({
    page,
  }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();

    await page.keyboard.press("+");
    await waitForViewportEvents(page);
    await clearViewportEvents(page);
    await page.keyboard.press("+");
    await waitForViewportEvents(page);
    const zoomed = (await viewportEvents(page)).at(-1);
    if (!zoomed) throw new Error("Zoom preparation emitted no viewport event.");

    await clearViewportEvents(page);
    await page.keyboard.press("Home");
    await waitForViewportEvents(page);
    const fitted = (await viewportEvents(page)).at(-1);
    if (!fitted) throw new Error("Home fit emitted no viewport event.");

    expect(span(fitted)).toBeGreaterThan(span(zoomed));
    expect(fitted.committed).toBeTruthy();
  });

  test("touch double-tap zooms the retained chronology using pointer semantics", async ({
    page,
  }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();
    await page.keyboard.press("Home");
    await waitForViewportEvents(page);
    const baseline = (await viewportEvents(page)).at(-1);
    if (!baseline) throw new Error("Home fit emitted no viewport event.");
    await clearViewportEvents(page);

    const {
      xs: [x],
      y,
    } = await openSurfaceRow(surface, [0.5]);

    await doubleTap(page, { x, y });

    await waitForViewportEvents(page, 2);
    const finalEvent = (await viewportEvents(page)).at(-1);
    if (!finalEvent) throw new Error("Double-tap emitted no viewport event.");
    expect(span(finalEvent)).toBeLessThan(span(baseline));
    expect(finalEvent.committed).toBeTruthy();
  });

  test("touch pinch changes temporal span and commits after both pointers release", async ({
    page,
  }) => {
    const surface = page.locator(".timeline-surface");
    await surface.focus();
    await page.keyboard.press("Home");
    await waitForViewportEvents(page);
    const baseline = (await viewportEvents(page)).at(-1);
    if (!baseline) throw new Error("Home fit emitted no viewport event.");
    await clearViewportEvents(page);

    const {
      xs: [left, right, expandedRight],
      y,
    } = await openSurfaceRow(surface, [0.4, 0.6, 0.82]);

    const fingers = await touchscreen(page);
    await fingers.move([{ x: left, y }]);
    await fingers.move([
      { x: left, y },
      { x: right, y },
    ]);
    await fingers.move([
      { x: left, y },
      { x: expandedRight, y },
    ]);

    await waitForViewportEvents(page);
    const pinched = (await viewportEvents(page)).at(-1);
    if (!pinched) throw new Error("Pinch emitted no viewport event.");
    expect(span(pinched)).toBeLessThan(span(baseline));
    expect(pinched.committed).toBeFalsy();

    await fingers.end();

    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test("pointer cancellation cannot leave the retained scene interacting", async ({ page }) => {
    const surface = page.locator(".timeline-surface");
    const {
      xs: [x],
      y,
    } = await openSurfaceRow(surface, [0.6]);

    const finger = await touchscreen(page);
    await finger.move([{ x, y }]);
    await finger.move([{ x: x - 60, y }]);
    await waitForViewportEvents(page);

    await finger.cancel();

    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test("graph drag does not mutate the timeline viewport", async ({ page }, testInfo) => {
    const graphCanvas = page.locator(".temporal-graph-canvas");
    await expect(graphCanvas).toBeVisible();
    const box = await graphCanvas.boundingBox();
    if (!box) throw new Error("Graph canvas has no bounding box.");

    const startX = box.x + box.width * 0.7;
    const endX = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.5;
    await clearViewportEvents(page);

    if (testInfo.project.use.hasTouch) {
      const finger = await touchscreen(page);
      await finger.move([{ x: startX, y }]);
      await finger.move([{ x: endX, y }]);
      await finger.end();
    } else {
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y, { steps: 5 });
      await page.mouse.up();
    }

    expect(await viewportEvents(page)).toEqual([]);
  });
});
