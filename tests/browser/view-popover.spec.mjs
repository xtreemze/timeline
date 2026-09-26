import { expect, test } from "@playwright/test";

const viewToolbar = "#timeline-view-toolbar";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(viewToolbar)).toBeVisible();
});

test("View controls are persistent toolbar content rather than a popover", async ({ page }) => {
  const toolbar = page.locator(viewToolbar);

  await expect(toolbar).not.toHaveAttribute("popover", /.+/);
  await expect(page.locator("#timeline-view-controls-toggle")).toHaveCount(0);
  await expect
    .poll(() => toolbar.evaluate((element) => element.matches(":popover-open")))
    .toBe(false);

  await expect(toolbar.locator("#timeline-orientation-toggle")).toBeVisible();
  await expect(toolbar.locator("#presentation-fullscreen-toggle")).toBeVisible();
  await expect(toolbar.locator("#timeline-zoom-level")).toBeVisible();
  await expect(toolbar.locator("#timeline-auto-toggle")).toBeVisible();
  await expect(toolbar.locator("#timeline-auto-seconds")).toBeVisible();
});

test("Browse keeps persistent View controls available", async ({ page }) => {
  const toolbar = page.locator(viewToolbar);

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#presentation-stage")).toHaveAttribute("inert", "");
  await expect(page.locator(".app-tool-dock")).not.toHaveAttribute("inert", "");
  await expect(toolbar).toBeVisible();

  await page.locator("#timeline-browser-close").click();
  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#presentation-stage")).not.toHaveAttribute("inert", "");
  await expect(toolbar.locator("#timeline-orientation-toggle")).toBeEnabled();
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
  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#presentation-stage")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#story-focus")).toBeVisible();
  await expect(page.locator("#story-focus-title")).toHaveText(title);
  await expect
    .poll(() =>
      page
        .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
        .count(),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(`.timeline-event[data-id="${firstItemId}"]`)).toBeVisible();
});

test("stale bundled demo storage refreshes the current example stories", async ({ page }) => {
  const expectedStoryIds = await page.evaluate(() => {
    const sample = structuredClone(globalThis.TimelineSampleCase);
    const storyIds = sample.stories.map((story) => story.id);
    sample.title = "Six classic tales — distributed fictional casebook";
    sample.stories = sample.stories.slice(0, 3);
    localStorage.setItem("timeline:v2", JSON.stringify(sample));
    return storyIds;
  });

  expect(expectedStoryIds.length).toBeGreaterThan(3);
  await page.reload();
  await expect(page.locator(viewToolbar)).toBeVisible();
  await page.locator("#timeline-browser-toggle").click();

  await expect(page.locator("#browser-story-count")).toHaveText(String(expectedStoryIds.length));
  for (const storyId of expectedStoryIds) {
    await expect(page.locator(`.browser-story-card[data-id="${storyId}"]`)).toHaveCount(1);
  }
});

test("Edit leaves View in the toolbar but disables conflicting View controls", async ({ page }) => {
  const toolbar = page.locator(viewToolbar);

  await page.locator("#editor-toggle").click();
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator("#timeline-orientation-toggle")).toBeDisabled();
  await expect(toolbar.locator("#presentation-fullscreen-toggle")).toBeDisabled();
  await expect(toolbar.locator("#timeline-zoom-level")).toBeDisabled();
  await expect(toolbar.locator("#timeline-auto-toggle")).toBeDisabled();
  await expect(toolbar.locator("#timeline-auto-seconds")).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator("#timeline-orientation-toggle")).toBeEnabled();
});

test("View controls remain inside the footer across landscape and portrait", async ({ page }) => {
  const toolbar = page.locator(viewToolbar);
  const footer = page.locator(".app-footer-bar");

  async function expectInsideFooter() {
    const [toolbarBox, footerBox] = await Promise.all([toolbar.boundingBox(), footer.boundingBox()]);
    expect(toolbarBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    if (!toolbarBox || !footerBox) return;
    expect(toolbarBox.y).toBeGreaterThanOrEqual(footerBox.y - 1);
    expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(
      footerBox.y + footerBox.height + 1,
    );
  }

  await expectInsideFooter();
  await page.locator("#timeline-orientation-toggle").click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", "portrait");
  await expectInsideFooter();
  await expect(page.locator("#timeline-zoom-level")).toHaveAttribute(
    "aria-orientation",
    "horizontal",
  );
});

test("resize keeps the inline View group mounted in the persistent footer", async ({ page }) => {
  const toolbar = page.locator(viewToolbar);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toolbar).toBeVisible();
  const parentClass = await toolbar.evaluate((element) => element.parentElement?.className || "");
  expect(parentClass).toContain("app-footer-timeline");

  const box = await toolbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height).toBeLessThanOrEqual(46);
});
