import { expect, test } from "@playwright/test";

const PHONE_PORTRAIT = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };

async function orient(page, orientation: "portrait" | "landscape") {
  const root = page.locator("#timeline-view");
  const current = await root.getAttribute("data-orientation");
  if (current !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(root).toHaveAttribute("data-orientation", orientation);
}

async function box(locator) {
  await expect(locator).toBeVisible();
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}

test.describe("responsive reserved workspace chrome", () => {
  for (const { name, viewport, orientation } of [
    { name: "portrait", viewport: PHONE_PORTRAIT, orientation: "portrait" as const },
    { name: "landscape", viewport: PHONE_LANDSCAPE, orientation: "landscape" as const },
  ]) {
    test(`${name} keeps chronology, toolbar, title, and project menu inside their reserved regions`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await orient(page, orientation);

      const surface = await box(page.locator(".timeline-surface"));
      const dock = await box(page.locator(".app-tool-dock"));
      const title = await box(page.locator(".timeline-project-heading"));

      if (orientation === "portrait") {
        expect(surface.x + surface.width).toBeLessThanOrEqual(dock.x + 3);
        expect(dock.x + dock.width).toBeLessThanOrEqual(title.x + 5);
      } else {
        expect(surface.y + surface.height).toBeLessThanOrEqual(dock.y + 3);
        expect(dock.y + dock.height).toBeLessThanOrEqual(title.y + 5);
      }

      const projectButton = page.locator("#project-menu-toggle");
      await projectButton.click();
      const menu = page.locator("#project-menu:popover-open");
      const menuBox = await box(menu);

      expect(menuBox.x).toBeGreaterThanOrEqual(5);
      expect(menuBox.y).toBeGreaterThanOrEqual(5);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width - 5);
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height - 5);
      await expect(menu).toHaveAttribute(
        "data-anchor-placement",
        orientation === "portrait" ? "left" : "above",
      );
    });
  }
});
