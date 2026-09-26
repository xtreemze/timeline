import { expect, test, type Page } from "@playwright/test";

type Viewport = { width: number; height: number };
type Rect = Viewport & { x: number; y: number };

const NARROW_PORTRAIT = { width: 360, height: 780 };
const NARROW_LANDSCAPE = { width: 780, height: 360 };

async function ensureOrientation(page: Page, orientation: "portrait" | "landscape") {
  const timeline = page.locator("#timeline-view");
  const toggle = page.locator("#timeline-orientation-toggle");
  await expect(timeline).toBeVisible();
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await expect(toggle).toBeVisible();
    await toggle.click();
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

    const visibleCards = [];
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
        const intersection = overlap(visibleCards[first], visibleCards[second]);
        expect(
          intersection.x > 2 && intersection.y > 2,
          `mobile timeline cards ${first} and ${second} overlap by ${Math.max(0, intersection.x).toFixed(1)}×${Math.max(0, intersection.y).toFixed(1)}px`,
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

      const metrics = await timelineToolbar.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          overflowX: style.overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      });
      expect(["auto", "scroll"]).toContain(metrics.overflowX);
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

      const buttons = dock.locator("button:visible");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(10);
      for (let index = 0; index < buttonCount; index += 1) {
        const button = buttons.nth(index);
        const geometry = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            position: style.position,
            width: rect.width,
            height: rect.height,
          };
        });
        expect(["absolute", "fixed", "sticky"]).not.toContain(geometry.position);
        expect(geometry.width).toBeGreaterThanOrEqual(44);
        expect(geometry.height).toBeGreaterThanOrEqual(44);
      }

      const lastControl = timelineToolbar.locator(".toolbar-control").last();
      await timelineToolbar.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await expect
        .poll(async () => {
          const [toolbarBox, controlBox] = await Promise.all([
            timelineToolbar.boundingBox(),
            lastControl.boundingBox(),
          ]);
          if (!toolbarBox || !controlBox) return false;
          return (
            controlBox.x + controlBox.width <= toolbarBox.x + toolbarBox.width + 2 &&
            controlBox.x + controlBox.width >= toolbarBox.x
          );
        })
        .toBe(true);

      await expectNoPageScroll(page, viewport);
    });
  }
});
