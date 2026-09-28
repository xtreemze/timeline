import { expect, test } from "@playwright/test";

const viewSurface = "#timeline-view-controls";
const viewToggle = "#timeline-view-controls-toggle";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".app-tool-dock")).toBeVisible();
  await expect(page.locator(viewToggle)).toBeVisible();
});

test("View is a single utility surface instead of permanent secondary toolbar content", async ({ page }) => {
  const surface = page.locator(viewSurface);
  const footer = page.locator(".app-tool-dock");

  await expect(surface).not.toBeVisible();
  await expect(page.locator(viewToggle)).toHaveAttribute("aria-expanded", "false");
  await expect(footer.locator("#timeline-orientation-toggle")).toHaveCount(0);
  await expect(footer.locator("#timeline-zoom-level")).toHaveCount(0);

  await page.locator(viewToggle).click();

  await expect(surface).toBeVisible();
  await expect(page.locator(viewToggle)).toHaveAttribute("aria-expanded", "true");
  await expect(surface.locator("#timeline-orientation-toggle")).toBeVisible();
  await expect(surface.locator("#presentation-fullscreen-toggle")).toBeVisible();
  await expect(surface.locator("#timeline-zoom-level")).toBeVisible();
  await expect(surface.locator("#timeline-auto-toggle")).toBeVisible();
  await expect(surface.locator("#timeline-auto-seconds")).toBeVisible();
  await expect(surface.locator("[data-world-controls-slot]")).toBeVisible();
});

test("opening Browse dismisses View without changing spatial stage geometry", async ({ page }) => {
  await page.locator(viewToggle).click();
  await expect(page.locator(viewSurface)).toBeVisible();

  const before = await page.locator("#presentation-stage").boundingBox();
  await page.locator("#timeline-browser-toggle").click();

  await expect(page.locator(viewSurface)).not.toBeVisible();
  await expect(page.locator(viewToggle)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#presentation-stage")).toHaveAttribute("inert", "");

  await page.locator("#timeline-browser-close").click();
  const after = await page.locator("#presentation-stage").boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  if (before && after) {
    expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
  }
});

test("Browse opens an example story into visible timeline context", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#timeline-browser-toggle").click();

  const browser = page.locator("#timeline-browser-sheet");
  const storyCards = browser.locator(".browser-story-card");
  await expect(storyCards.first()).toBeVisible();
  expect(await storyCards.count()).toBeGreaterThanOrEqual(3);

  const story = storyCards.last();
  const storyId = (await story.getAttribute("data-id")) || "";
  const title = (await story.locator("strong").textContent())?.trim() || "";
  expect(storyId).not.toBe("");
  expect(title).not.toBe("");
  const firstItemId = await page.evaluate((selectedStoryId) => {
    const sample = globalThis.TimelineSampleCase;
    return sample?.stories?.find((candidate) => candidate.id === selectedStoryId)?.itemIds?.[0] || "";
  }, storyId);
  expect(firstItemId).not.toBe("");
  await story.click();

  await expect(browser).toBeHidden();
  await expect(page.locator("#story-focus")).toBeVisible();
  await expect(page.locator("#story-focus-title")).toHaveText(title);
  await expect
    .poll(() =>
      page.locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible").count(),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(`.timeline-event[data-id="${firstItemId}"]`)).toBeVisible();
});

test("Edit dismisses View and keeps the presentation controls non-mutating", async ({ page }) => {
  await page.locator(viewToggle).click();
  await expect(page.locator(viewSurface)).toBeVisible();

  await page.locator("#editor-toggle").click();
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(viewSurface)).not.toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "false");
  await page.locator(viewToggle).click();
  await expect(page.locator(viewSurface).locator("#timeline-orientation-toggle")).toBeEnabled();
});

test("mobile dock exposes primary commands without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const dock = page.locator(".app-tool-dock");
  await expect(dock).toBeVisible();

  const metrics = await dock.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.overflowX).not.toBe("auto");

  for (const selector of [
    "#project-menu-toggle",
    "#editor-toggle",
    "#timeline-browser-toggle",
    "#occurrence-composer-toggle",
    "#timeline-view-controls-toggle",
  ]) {
    await expect(dock.locator(selector)).toBeVisible();
  }
});

test("View controls remain horizontal and usable after timeline orientation changes", async ({ page }) => {
  await page.locator(viewToggle).click();
  const surface = page.locator(viewSurface);
  await surface.locator("#timeline-orientation-toggle").click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", "portrait");
  await expect(surface.locator("#timeline-zoom-level")).toHaveAttribute("aria-orientation", "horizontal");
  await expect(surface).toBeVisible();
});
