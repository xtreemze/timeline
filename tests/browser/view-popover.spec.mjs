import { expect, test } from "@playwright/test";

const viewToggle = "#timeline-view-controls-toggle";
const viewToolbar = "#timeline-view-toolbar";
const appShell = "#app-shell";

async function expectViewState(page, open) {
  await expect(page.locator(viewToggle)).toHaveAttribute("aria-expanded", String(open));
  await expect(page.locator(appShell)).toHaveAttribute("data-view-controls-open", String(open));
  await expect
    .poll(() => page.locator(viewToolbar).evaluate((element) => element.matches(":popover-open")))
    .toBe(open);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(viewToggle)).toBeVisible();
});

test("View popover opens, closes, and reopens without stale state", async ({ page }) => {
  await expectViewState(page, false);

  await page.locator(viewToggle).click();
  await expectViewState(page, true);

  await page.locator(viewToggle).click();
  await expectViewState(page, false);

  await page.locator(viewToggle).click();
  await expectViewState(page, true);
});

test("Browse and Edit close View and leave the next View click usable", async ({ page }) => {
  await page.locator(viewToggle).click();
  await expectViewState(page, true);

  await page.locator("#timeline-browser-toggle").click();
  await expectViewState(page, false);
  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "true");

  await page.locator(viewToggle).click();
  await expectViewState(page, true);

  await page.locator("#editor-toggle").click();
  await expectViewState(page, false);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(viewToggle)).toBeDisabled();
});

test("Escape closes View outside fullscreen", async ({ page }) => {
  await page.locator(viewToggle).click();
  await expectViewState(page, true);

  await page.keyboard.press("Escape");
  await expectViewState(page, false);
});

test("View remains inside the viewport in landscape and portrait", async ({ page }) => {
  async function expectInsideViewport() {
    const box = await page.locator(viewToolbar).boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.locator(viewToggle).click();
  await expectViewState(page, true);
  await expectInsideViewport();

  await page.locator("#timeline-orientation-toggle").click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", "portrait");
  await expectInsideViewport();

  await expect(page.locator("#timeline-zoom-level")).toHaveAttribute(
    "aria-orientation",
    "vertical",
  );
});

test("resize while open keeps View attached and state synchronized", async ({ page }) => {
  await page.locator(viewToggle).click();
  await expectViewState(page, true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewState(page, true);

  const box = await page.locator(viewToolbar).boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  expect(box.y + box.height).toBeLessThanOrEqual(845);
});
