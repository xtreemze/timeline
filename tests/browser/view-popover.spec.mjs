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
  await expect(view.locator(".world-zoom-control")).toBeVisible();
  await expect(view.locator(".world-zoom-slider")).toBeVisible();
  await expect(view.locator(".world-layout-controls")).toBeVisible();
});

test("footer view-control groups keep intrinsic width instead of overlapping", async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const view = page.locator(viewControls);
    await expect(view).toBeVisible();
    await expect(view.locator(".world-camera-controls")).toBeVisible();
    await expect(view.locator(".world-layout-controls")).toBeVisible();
    await expect(view.locator("#timeline-view-toolbar")).toBeVisible();

    const geometry = await view.evaluate((element) => {
      element.scrollLeft = 0;
      const viewRect = element.getBoundingClientRect();
      const groups = [...element.children]
        .filter(
          (child) =>
            child instanceof HTMLElement && child.classList.contains("view-control-group"),
        )
        .map((group) => {
          const rect = group.getBoundingClientRect();
          const style = getComputedStyle(group);
          const children = [...group.children]
            .filter((child) => child instanceof HTMLElement)
            .map((child) => ({
              element: child,
              rect: child.getBoundingClientRect(),
              style: getComputedStyle(child),
            }))
            .filter(
              ({ element: child, rect: childRect, style: childStyle }) =>
                childStyle.display !== "none" &&
                !child.classList.contains("sr-only") &&
                childRect.width > 1 &&
                childRect.height > 1,
            )
            .map(({ rect: childRect }) => ({
              left: childRect.left,
              right: childRect.right,
            }));
          return {
            left: rect.left,
            right: rect.right,
            flexShrink: style.flexShrink,
            minInlineSize: style.minInlineSize,
            children,
          };
        });

      return {
        viewLeft: viewRect.left,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        groups,
      };
    });

    expect(geometry.groups.length).toBeGreaterThanOrEqual(3);
    for (const group of geometry.groups) {
      expect(group.flexShrink).toBe("0");
      expect(group.minInlineSize).not.toBe("0px");
      for (const child of group.children) {
        expect(child.left).toBeGreaterThanOrEqual(group.left - 1);
        expect(child.right).toBeLessThanOrEqual(group.right + 1);
      }
    }

    for (let index = 0; index < geometry.groups.length - 1; index += 1) {
      const current = geometry.groups[index];
      const next = geometry.groups[index + 1];
      if (!current || !next) continue;
      expect(current.right).toBeLessThanOrEqual(next.left + 1);
    }

    const finalGroup = geometry.groups.at(-1);
    expect(finalGroup).toBeDefined();
    if (finalGroup) {
      const requiredContentWidth = finalGroup.right - geometry.viewLeft;
      expect(geometry.scrollWidth).toBeGreaterThanOrEqual(requiredContentWidth - 1);
    }
  }
});

test("atomic and compound toolbar controls share height, centerline, and icon sizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2048, height: 1267 });

  const controls = [
    page.locator("#editor-toggle"),
    page.locator("#timeline-orientation-toggle"),
    page.locator(".timeline-zoom-control"),
    page.locator(".toolbar-number-control"),
    page.locator(".world-zoom-control"),
  ];

  const boxes = await Promise.all(controls.map((control) => control.boundingBox()));
  for (const box of boxes) {
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(Math.abs(box.height - 44)).toBeLessThanOrEqual(1);
  }
  const centerlines = boxes.filter((box) => box !== null).map((box) => box.y + box.height / 2);
  expect(Math.max(...centerlines) - Math.min(...centerlines)).toBeLessThanOrEqual(1);

  const project = page.locator("#project-menu-toggle");
  await expect(project).toHaveAttribute("data-semantic-icon", "folder");
  await expect(project.locator(":scope > .semantic-icon")).toHaveCount(1);
  await expect(project.locator(":scope > img")).toHaveCount(0);

  const icons = page.locator(".app-footer-bar .toolbar-control > .semantic-icon:visible");
  const count = await icons.count();
  expect(count).toBeGreaterThanOrEqual(10);
  for (let index = 0; index < count; index += 1) {
    const icon = icons.nth(index);
    const [box, buttonBox] = await Promise.all([
      icon.boundingBox(),
      icon.locator("xpath=..").boundingBox(),
    ]);
    expect(box).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    if (!box || !buttonBox) continue;
    expect(Math.abs(box.width - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height - 20)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(box.x + box.width / 2 - (buttonBox.x + buttonBox.width / 2)),
    ).toBeLessThanOrEqual(0.75);
    expect(
      Math.abs(box.y + box.height / 2 - (buttonBox.y + buttonBox.height / 2)),
    ).toBeLessThanOrEqual(0.75);
  }

  const worldZoom = page.locator(".world-zoom-control");
  const timelineZoom = page.locator(".timeline-zoom-control");
  const [worldZoomBox, timelineZoomBox, worldSliderBox, timelineSliderBox] = await Promise.all([
    worldZoom.boundingBox(),
    timelineZoom.boundingBox(),
    worldZoom.locator(".toolbar-zoom-slider").boundingBox(),
    timelineZoom.locator(".toolbar-zoom-slider").boundingBox(),
  ]);
  expect(worldZoomBox).not.toBeNull();
  expect(timelineZoomBox).not.toBeNull();
  expect(worldSliderBox).not.toBeNull();
  expect(timelineSliderBox).not.toBeNull();
  if (worldZoomBox && timelineZoomBox) {
    expect(Math.abs(worldZoomBox.width - timelineZoomBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(worldZoomBox.height - timelineZoomBox.height)).toBeLessThanOrEqual(1);
  }
  if (worldSliderBox && timelineSliderBox) {
    expect(Math.abs(worldSliderBox.width - timelineSliderBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(worldSliderBox.height - timelineSliderBox.height)).toBeLessThanOrEqual(1);
  }

  const [worldZoomGrid, timelineZoomGrid] = await Promise.all(
    [worldZoom, timelineZoom].map((control) =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          gridTemplateRows: style.gridTemplateRows,
          rowGap: style.rowGap,
          columnGap: style.columnGap,
        };
      }),
    ),
  );
  expect(worldZoomGrid.gridTemplateRows).toBe("44px");
  expect(timelineZoomGrid.gridTemplateRows).toBe(worldZoomGrid.gridTemplateRows);
  expect(timelineZoomGrid.rowGap).toBe(worldZoomGrid.rowGap);
  expect(timelineZoomGrid.columnGap).toBe(worldZoomGrid.columnGap);

  const timelineZoomCenterY =
    timelineZoomBox === null ? null : timelineZoomBox.y + timelineZoomBox.height / 2;
  if (timelineZoomCenterY !== null) {
    for (const part of [
      timelineZoom.locator("#timeline-zoom-out"),
      timelineZoom.locator(".timeline-zoom-slider"),
      timelineZoom.locator("#timeline-zoom-in"),
    ]) {
      const box = await part.boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;
      expect(Math.abs(box.y + box.height / 2 - timelineZoomCenterY)).toBeLessThanOrEqual(0.75);
    }
  }
});

test("toolbar actions update state, labels, tooltips, and direct icons", async ({ page }) => {
  const edit = page.locator("#editor-toggle");
  const browse = page.locator("#timeline-browser-toggle");
  const orientation = page.locator("#timeline-orientation-toggle");
  const slideshow = page.locator("#timeline-auto-toggle");

  await expect(edit).toHaveAttribute("data-semantic-icon", "edit");
  await edit.click();
  await expect(edit).toHaveAttribute("aria-label", "Done editing");
  await expect(edit).toHaveAttribute("data-semantic-icon", "check");
  await edit.click();
  await expect(edit).toHaveAttribute("data-semantic-icon", "edit");

  await browse.click();
  await expect(browse).toHaveAttribute("aria-label", "Close timeline browser");
  await expect(browse).toHaveAttribute("data-semantic-icon", "close");
  await browse.click();
  await expect(browse).toHaveAttribute("aria-label", "Browse timeline");
  await expect(browse).toHaveAttribute("data-semantic-icon", "search");

  const beforeOrientation = await page.locator("#timeline-view").getAttribute("data-orientation");
  await orientation.click();
  const afterOrientation = beforeOrientation === "portrait" ? "landscape" : "portrait";
  await expect(page.locator("#timeline-view")).toHaveAttribute(
    "data-orientation",
    afterOrientation,
  );
  await expect(orientation).toHaveAttribute(
    "data-semantic-icon",
    afterOrientation === "portrait" ? "landscape" : "portrait",
  );

  await slideshow.click();
  await expect(slideshow).toHaveAttribute("aria-pressed", "true");
  await expect(slideshow).toHaveAttribute("aria-label", "Pause slideshow");
  await expect(slideshow).toHaveAttribute("data-semantic-icon", "pause");
  await slideshow.click();
  await expect(slideshow).toHaveAttribute("aria-pressed", "false");
  await expect(slideshow).toHaveAttribute("data-semantic-icon", "play");

  const worldZoom = page.locator(".world-zoom-slider");
  const worldZoomMin = Number(await worldZoom.getAttribute("min"));
  const worldZoomMax = Number(await worldZoom.getAttribute("max"));
  const midpoint = Math.min(worldZoomMax - 1, Math.max(worldZoomMin + 1, 5));
  await worldZoom.fill(String(midpoint));
  await expect(worldZoom).toHaveValue(String(midpoint));

  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  await expect(zoomIn).toBeEnabled();
  await expect(zoomIn).toHaveAttribute("title", "Zoom in");
  await expect(zoomIn.locator(":scope > .semantic-icon")).toHaveCount(1);
  await zoomIn.click();
  expect(Number(await worldZoom.inputValue())).toBeGreaterThan(midpoint);

  const zoomOut = page.getByRole("button", { name: "Zoom out", exact: true });
  await expect(zoomOut).toBeEnabled();
  await expect(zoomOut).toHaveAttribute("title", "Zoom out");
  await expect(zoomOut.locator(":scope > .semantic-icon")).toHaveCount(1);
  await zoomOut.click();
  expect(Number(await worldZoom.inputValue())).toBeCloseTo(midpoint, 1);

  for (const name of ["Fit to content", "Show whole world"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute("title", name);
    await expect(button.locator(":scope > .semantic-icon")).toHaveCount(1);
    await button.click();
  }

  for (const name of ["Arrange relationships", "Settle relationships"]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute("title", /.+/);
    await expect(button.locator(":scope > .semantic-icon")).toHaveCount(1);
    await expect(button.locator(".compound-semantic-icon")).toHaveCount(0);
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

test("composer exposes live context, pins explicit context, and leaves Tab for focus navigation", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  const compose = composer.locator(".compact");
  await expect(compose).toBeVisible();
  await compose.click();

  const input = composer.locator("input");
  await expect(composer).toHaveAttribute("active", "");
  await expect(page.locator("#app-shell")).toHaveAttribute("data-composer-open", "true");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(composer.locator('.context-chip[data-context-kind="place"]')).toHaveAttribute(
    "data-context-state",
    "live",
  );
  await expect(composer.locator('.context-chip[data-context-kind="time"]')).toHaveAttribute(
    "data-context-state",
    "live",
  );

  await input.fill("Alice meets Bob at Stockholm on 2026-09-28");
  await expect(composer.locator('.context-chip[data-context-kind="place"]')).toHaveAttribute(
    "data-context-state",
    "pinned",
  );
  await expect(composer.locator('.context-chip[data-context-kind="time"]')).toHaveAttribute(
    "data-context-state",
    "pinned",
  );

  await input.press("Tab");
  const close = composer.locator("button.close");
  await expect(close).toBeFocused();
  await expect(composer).toHaveAttribute("active", "");
  await close.click();
  await expect(composer).not.toHaveAttribute("active", "");
  await expect(page.locator("#editor-toggle")).toBeFocused();
});

test("composer keeps drafts in the same context and clears them when spatial context changes", async ({
  page,
}) => {
  await page.locator("#editor-toggle").click();
  await page.locator("#occurrence-composer-toggle").click();

  const composer = page.locator("#occurrence-composer");
  const input = composer.locator("input");
  await input.fill("Alice meets Bob");

  await input.press("Escape");
  await expect(composer).not.toHaveAttribute("active", "");

  await page.locator("#editor-toggle").click();
  await page.locator("#occurrence-composer-toggle").click();
  await expect(composer).toHaveAttribute("active", "");
  await expect(input).toHaveValue("Alice meets Bob");

  await page.evaluate(() => {
    const element = document.querySelector("#occurrence-composer");
    if (!(element instanceof HTMLElement)) throw new Error("Composer unavailable.");
    const composerElement = element;
    composerElement.setWorldContext?.(123.456, -45.678, 18);
    composerElement.beginSession?.();
  });
  await expect(input).not.toHaveValue("Alice meets Bob");
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
  const storyItems = await page.evaluate((selectedStoryId) => {
    const sample = globalThis.TimelineSampleCase;
    const selected = sample?.stories?.find((candidate) => candidate.id === selectedStoryId);
    return (selected?.itemIds || []).map((id) => ({
      id,
      title: sample?.items?.find((item) => item.id === id)?.title || "",
    }));
  }, storyId);
  expect(storyItems.length).toBeGreaterThan(1);
  expect(storyItems[0].id).not.toBe("");
  expect(storyItems[1].title).not.toBe("");
  await story.click();

  await expect(browser).toBeHidden();
  await expect(page.locator("#story-focus")).toBeVisible();
  await expect(page.locator("#story-focus-title")).toBeVisible();
  await expect(page.locator("#story-focus-title")).toHaveText(title);
  await expect(page.locator("#story-focus-position")).toHaveText(`1 / ${storyItems.length}`);
  await expect(page.locator("#story-prev")).toBeDisabled();
  await expect(page.locator("#story-next")).toBeEnabled();
  await expect(page.locator("#presentation-stage > .graph-lens:not([hidden])")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
        .count(),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(`.timeline-event[data-id="${storyItems[0].id}"]`)).toBeVisible();

  const storyNextOwnsHitTarget = await page.locator("#story-next").evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit?.closest("#story-next"));
  });
  expect(storyNextOwnsHitTarget).toBe(true);

  await page.locator("#story-next").click();
  await expect(page.locator("#story-focus-position")).toHaveText(`2 / ${storyItems.length}`);
  await expect(page.locator("#story-prev")).toBeEnabled();
  await expect(page.locator(".timeline-focus-title")).toHaveText(storyItems[1].title);
});

test("overflowing occurrence cards stay interactive above the world while world gaps remain interactive", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== "landscape") {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(timeline).toHaveAttribute("data-orientation", "landscape");

  await page.locator("#timeline-browser-toggle").click();
  const densestStoryId = await page.evaluate(() => {
    const stories = globalThis.TimelineSampleCase?.stories || [];
    return [...stories].sort(
      (left, right) => (right.itemIds?.length || 0) - (left.itemIds?.length || 0),
    )[0]?.id || "";
  });
  expect(densestStoryId).not.toBe("");
  await page.locator(`.browser-story-card[data-id="${densestStoryId}"]`).click();

  await expect(page.locator("#presentation-stage > .graph-lens:not([hidden])")).toBeVisible();
  await page.evaluate(() => {
    const root = document.querySelector("#timeline-view");
    if (!(root instanceof HTMLElement)) throw new Error("Timeline root unavailable.");
    globalThis.TimelineView?.create(root)?.fitVisible?.();
  });

  const findOverflowHit = () =>
    page.evaluate(() => {
      const graph = document.querySelector(".temporal-graph-canvas");
      const surface = document.querySelector(".timeline-surface");
      if (!(graph instanceof HTMLElement) || !(surface instanceof HTMLElement)) return null;

      const graphRect = graph.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      for (const terminal of document.querySelectorAll(
        ".timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-terminal",
      )) {
        if (!(terminal instanceof HTMLElement) || terminal.offsetParent === null) continue;
        const rect = terminal.getBoundingClientRect();
        const left = Math.max(rect.left, graphRect.left);
        const right = Math.min(rect.right, graphRect.right);
        const top = Math.max(rect.top, graphRect.top);
        const bottom = Math.min(rect.bottom, graphRect.bottom);
        if (right - left < 8 || bottom - top < 8) continue;

        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        if (!document.elementFromPoint(x, y)?.closest(".timeline-event-terminal")) continue;
        return {
          x,
          y,
          overflowed:
            rect.top < surfaceRect.top ||
            rect.left < surfaceRect.left ||
            rect.right > surfaceRect.right ||
            rect.bottom > surfaceRect.bottom,
        };
      }
      return null;
    });

  await expect.poll(findOverflowHit).not.toBeNull();
  const overlap = await findOverflowHit();
  expect(overlap).not.toBeNull();
  expect(overlap?.overflowed).toBe(true);

  const openWorldPoint = await page.evaluate(() => {
    const graph = document.querySelector(".temporal-graph-canvas");
    if (!(graph instanceof HTMLElement)) return null;
    const rect = graph.getBoundingClientRect();
    for (let row = 1; row < 8; row += 1) {
      for (let column = 1; column < 8; column += 1) {
        const x = rect.left + (rect.width * column) / 8;
        const y = rect.top + (rect.height * row) / 8;
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest(".timeline-event-terminal, .timeline-project-heading")) continue;
        if (hit && graph.contains(hit)) return { x, y };
      }
    }
    return null;
  });
  expect(openWorldPoint).not.toBeNull();

  if (!overlap) throw new Error("Expected an occurrence card to overlap the world.");
  await page.mouse.click(overlap.x, overlap.y);
  const focusedCard = page.locator("#timeline-view luum-event-card[data-focused]").first();
  await expect(focusedCard).toBeVisible();
  await focusedCard.locator(".timeline-event-terminal").click();
  await expect(focusedCard.locator(".timeline-event-detail")).toBeVisible();
  await expect(page.locator("#timeline-focus-view")).toBeHidden();
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

test("direct View controls stay horizontal after timeline orientation changes", async ({
  page,
}) => {
  const orientationToggle = page.locator("#timeline-orientation-toggle");
  await orientationToggle.click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-orientation", "portrait");
  await expect(page.locator("#timeline-zoom-level")).toHaveAttribute(
    "aria-orientation",
    "horizontal",
  );
  await expect(page.locator(viewControls)).toBeVisible();
});
