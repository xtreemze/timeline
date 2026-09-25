import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".app-footer-bar")).toBeVisible();
});

test("world controls mount on the left and timeline View stays on the right", async ({ page }) => {
  const footer = page.locator(".app-footer-bar");
  const world = footer.locator("#world-footer-controls .world-camera-controls");
  const view = footer.locator("#timeline-view-controls-toggle");

  await expect(world).toBeVisible();
  await expect(world.locator(".world-camera-control")).toHaveCount(4);
  await expect(view).toBeVisible();

  const [footerBox, worldBox, viewBox] = await Promise.all([
    footer.boundingBox(),
    world.boundingBox(),
    view.boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(worldBox).not.toBeNull();
  expect(viewBox).not.toBeNull();
  if (!footerBox || !worldBox || !viewBox) return;

  expect(worldBox.x).toBeLessThan(footerBox.x + footerBox.width / 2);
  expect(viewBox.x + viewBox.width).toBeGreaterThan(footerBox.x + footerBox.width / 2);
});

test("opening View reserves footer space instead of covering the presentation", async ({ page }) => {
  const panel = page.locator(".timeline-panel");
  const footer = page.locator(".app-footer-bar");

  const beforePanel = await panel.boundingBox();
  const beforeFooter = await footer.boundingBox();
  expect(beforePanel).not.toBeNull();
  expect(beforeFooter).not.toBeNull();

  await page.locator("#timeline-view-controls-toggle").click();
  await expect(page.locator("#timeline-view-toolbar:popover-open")).toBeVisible();

  const [panelBox, footerBox, toolbarBox] = await Promise.all([
    panel.boundingBox(),
    footer.boundingBox(),
    page.locator("#timeline-view-toolbar:popover-open").boundingBox(),
  ]);
  expect(panelBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  if (!panelBox || !footerBox || !toolbarBox) return;

  expect(footerBox.height).toBeGreaterThan(beforeFooter.height);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  expect(toolbarBox.y).toBeGreaterThanOrEqual(footerBox.y - 1);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(footerBox.y + footerBox.height + 1);
});

test("Browse and Edit stop above the persistent footer", async ({ page }) => {
  const footer = page.locator(".app-footer-bar");

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#timeline-browser-sheet")).toBeVisible();
  let [footerBox, browseBox] = await Promise.all([
    footer.boundingBox(),
    page.locator("#timeline-browser-sheet").boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(browseBox).not.toBeNull();
  if (footerBox && browseBox) {
    expect(browseBox.y + browseBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  }

  await page.locator("#timeline-browser-toggle").click();
  await page.locator("#editor-toggle").click();
  await expect(page.locator("#control-panel")).toBeVisible();
  [footerBox, browseBox] = await Promise.all([
    footer.boundingBox(),
    page.locator("#control-panel").boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(browseBox).not.toBeNull();
  if (footerBox && browseBox) {
    expect(browseBox.y + browseBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  }
});
