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
      expect(["auto", "scroll"]).toContain(metrics.overflowX);
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 44);
      for (const zone of metrics.zones) {
        expect(zone.overflowX).toBe("visible");
        expect(zone.scrollWidth).toBeLessThanOrEqual(zone.clientWidth + 1);
      }

      const buttons = dock.locator("button:visible");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(10);
      const buttonGeometry = [];
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

      for (const selector of [
        ".world-camera-controls",
        ".world-layout-controls",
        ".app-footer-actions",
        ".app-footer-timeline",
      ]) {
        const group = dock.locator(selector);
        await expect(group).toBeVisible();
        const geometry = await group.evaluate((element) => {
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
      }

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
