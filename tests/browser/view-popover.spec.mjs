import { expect, test } from "@playwright/test";

const viewControls = "#timeline-view-controls";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".app-tool-dock")).toBeVisible();
  await expect(page.locator(viewControls)).toBeVisible();
});

test("View controls are direct persistent toolbar content", async ({ page }) => {
  const footer = page.locator(".app-tool-dock");
  const view = footer.locator(viewControls);

  await expect(page.locator("#timeline-view-controls-toggle")).toHaveCount(0);
  await expect(view).toBeVisible();
  await expect(view.locator("#timeline-orientation-toggle")).toBeVisible();
  await expect(view.locator("#presentation-fullscreen-toggle")).toBeVisible();
  await expect(view.locator("#timeline-zoom-level")).toBeVisible();
  await expect(view.locator("#timeline-auto-toggle")).toBeVisible();
  await expect(view.locator("#timeline-auto-seconds")).toBeVisible();
  await expect(view.locator("[data-world-controls-slot]")).toBeVisible();
  await expect(view.locator(".world-camera-controls")).toBeVisible();
  await expect(view.locator(".world-layout-controls")).toBeVisible();
});

test("toolbar actions update state, labels, and scoped icons", async ({ page }) => {
  const edit = page.locator("#editor-toggle");
  const browse = page.locator("#timeline-browser-toggle");
  const orientation = page.locator("#timeline-orientation-toggle");
  const slideshow = page.locator("#timeline-auto-toggle");

  await expect(edit).toHaveAttribute("data-semantic-icon", "timeline");
  await expect(edit).toHaveAttribute("data-semantic-icon-secondary", "edit");
  await edit.click();
  await expect(edit).toHaveAttribute("aria-label", "Done editing");
  await expect(edit).toHaveAttribute("data-semantic-icon-secondary", "check");
  await edit.click();
  await expect(edit).toHaveAttribute("data-semantic-icon-secondary", "edit");

  await browse.click();
  await expect(browse).toHaveAttribute("aria-label", "Close timeline browser");
  await expect(browse).toHaveAttribute("data-semantic-icon-secondary", "close");
  await browse.click();
  await expect(browse).toHaveAttribute("aria-label", "Browse timeline");
  await expect(browse).toHaveAttribute("data-semantic-icon-secondary", "search");

  const beforeOrientation = await page.locator("#timeline-view").getAttribute("data-orientation");
  await orientation.click();
  const afterOrientation = beforeOrientation === "portrait" ? "landscape" : "portrait";
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", afterOrientation);
  await expect(orientation).toHaveAttribute(
    "data-semantic-icon-secondary",
    afterOrientation === "portrait" ? "landscape" : "portrait",
  );

  await slideshow.click();
  await expect(slideshow).toHaveAttribute("aria-pressed", "true");
  await expect(slideshow).toHaveAttribute("aria-label", "Pause slideshow");
  await expect(slideshow).toHaveAttribute("data-semantic-icon-secondary", "pause");
  await slideshow.click();
  await expect(slideshow).toHaveAttribute("aria-pressed", "false");
  await expect(slideshow).toHaveAttribute("data-semantic-icon-secondary", "play");

  for (const name of ["Zoom in", "Zoom out", "Fit to content"]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeEnabled();
    await expect(button.locator(".compound-semantic-icon")).toHaveCount(1);
    await button.click();
  }
  const wholeGlobe = page.getByRole("button", { name: "Show whole globe" });
  await expect(wholeGlobe).toBeEnabled();
  await wholeGlobe.click();

  for (const name of ["Reorganize relationship layout", "Relax graph forces"]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeEnabled();
    await expect(button.locator(".compound-semantic-icon")).toHaveCount(1);
    await button.click();
  }

  const project = page.locator("#project-menu-toggle");
  await project.click();
  await expect(project).toHaveAttribute("aria-expanded", "true");
  await expect(project).toHaveAttribute("aria-label", "Close project actions");
  await project.click();
  await expect(project).toHaveAttribute("aria-expanded", "false");
  await expect(project).toHaveAttribute("aria-label", "Project actions");

  const investigation = page.locator("#investigation-workspace-toggle");
  await investigation.click();
  await expect(investigation).toHaveAttribute("aria-expanded", "true");
  await expect(investigation).toHaveAttribute("aria-label", "Close investigation methodology");
  await investigation.click();
  await expect(investigation).toHaveAttribute("aria-expanded", "false");
  await expect(investigation).toHaveAttribute("aria-label", "Investigation methodology");
});

test("opening Browse disables direct View controls without changing spatial stage geometry", async ({
  page,
}) => {
  const before = await page.locator("#presentation-stage").boundingBox();
  await page.locator("#timeline-browser-toggle").click();

  await expect(page.locator("#timeline-browser-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#presentation-stage")).toHaveAttribute("inert", "");
  await expect(page.locator("#timeline-orientation-toggle")).toBeDisabled();
  await expect(page.locator(".world-camera-control").first()).toBeDisabled();
  await expect(page.locator(".world-layout-control").first()).toBeDisabled();

  await page.locator("#timeline-browser-close").click();
  await expect(page.locator("#timeline-orientation-toggle")).toBeEnabled();
  await expect(page.locator(".world-camera-control").first()).toBeEnabled();
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
  await expect(page.locator(viewControls)).toBeVisible();
  await page.locator("#timeline-browser-toggle").click();

  await expect(page.locator("#browser-story-count")).toHaveText(String(expectedStoryIds.length));
  for (const storyId of expectedStoryIds) {
    await expect(page.locator(`.browser-story-card[data-id="${storyId}"]`)).toHaveCount(1);
  }
});

test("loading the example resets a stale shared temporal viewport on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator(viewControls)).toBeVisible();

  await page.evaluate(() => {
    const root = document.querySelector("#timeline-view");
    if (!(root instanceof HTMLElement)) throw new Error("Timeline root unavailable.");
    const view = globalThis.TimelineView?.create(root);
    if (!view) throw new Error("Timeline controller unavailable.");
    const start = Date.UTC(2200, 0, 1);
    view.viewport = { start, end: start + 86_400_000 };
    view.viewportInitialized = true;
    view.commitInteraction();
  });

  await expect
    .poll(() => page.locator(".timeline-event .timeline-event-terminal:visible").count())
    .toBe(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#project-menu-toggle").click();
  await page.locator("#load-sample").click();

  await expect(page.locator("#timeline-title")).toHaveValue(
    "Nine classic tales — distributed fictional casebook",
  );
  await expect
    .poll(() => page.locator(".timeline-event .timeline-event-terminal:visible").count())
    .toBeGreaterThan(0);

  const viewport = await page.evaluate(() => {
    const root = document.querySelector("#timeline-view");
    if (!(root instanceof HTMLElement)) return null;
    return globalThis.TimelineView?.create(root)?.getViewport?.() || null;
  });
  expect(viewport).not.toBeNull();
  expect(viewport.end).toBeLessThan(Date.UTC(1500, 0, 1));
});

test("Edit is the single toolbar authoring entry and disables direct View controls", async ({
  page,
}) => {
  const footer = page.locator(".app-tool-dock");
  await expect(footer.locator("#occurrence-composer-toggle")).toHaveCount(0);
  await expect(footer.locator("#editor-toggle")).toHaveCount(1);

  await page.locator("#editor-toggle").click();
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#occurrence-composer-toggle")).toBeVisible();
  await expect(page.locator("#timeline-orientation-toggle")).toBeDisabled();
  await expect(page.locator(".world-camera-control").first()).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#timeline-orientation-toggle")).toBeEnabled();
});

test("mobile dock horizontally scrolls to keep all direct controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const dock = page.locator(".app-tool-dock");
  await expect(dock).toBeVisible();

  const metrics = await dock.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.overflowX).toBe("auto");

  for (const selector of [
    "#project-menu-toggle",
    "#editor-toggle",
    "#timeline-browser-toggle",
    "#timeline-orientation-toggle",
    "#presentation-fullscreen-toggle",
    "#timeline-auto-toggle",
  ]) {
    await expect(dock.locator(selector)).toHaveCount(1);
  }

  await dock.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(dock.locator("#timeline-auto-toggle")).toBeVisible();
});

test("direct View controls stay horizontal after timeline orientation changes", async ({ page }) => {
  const orientationToggle = page.locator("#timeline-orientation-toggle");
  await orientationToggle.click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", "portrait");
  await expect(page.locator("#timeline-zoom-level")).toHaveAttribute("aria-orientation", "horizontal");
  await expect(page.locator(viewControls)).toBeVisible();
});
