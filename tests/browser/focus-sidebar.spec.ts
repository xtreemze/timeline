import { expect, type Page, test } from "@playwright/test";

async function ensureSample(page: Page) {
  const terminal = page
    .locator(
      "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
    )
    .first();
  if (await terminal.count()) return terminal;
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  await expect(terminal).toBeVisible();
  return terminal;
}

async function focusOccurrence(page: Page) {
  const terminal = await ensureSample(page);
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  const composer = page.locator("#occurrence-composer");
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-occurrence-card")).toBeVisible();
  await expect(composer.locator(".composer-context-deck")).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-view:visible")).toHaveCount(0);
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  return { terminal, composer };
}

async function ensureOrientation(page: Page, orientation: "landscape" | "portrait") {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(timeline).toHaveAttribute("data-orientation", orientation);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-view")).toBeVisible();
});

test("landscape matches portrait timeline spacing at the physical edge", async ({ page }) => {
  const outerEdgePixels = async (orientation: "landscape" | "portrait") => {
    await ensureOrientation(page, orientation);
    const [surfaceBox, axisBox] = await Promise.all([
      page.locator(".timeline-surface").boundingBox(),
      page.locator(".timeline-axis").boundingBox(),
    ]);
    expect(surfaceBox).not.toBeNull();
    expect(axisBox).not.toBeNull();
    if (!surfaceBox || !axisBox) {
      throw new Error(`${orientation} timeline geometry is unavailable.`);
    }

    if (orientation === "landscape") {
      const axisCenter = axisBox.y + axisBox.height / 2;
      return surfaceBox.y + surfaceBox.height - axisCenter;
    }

    const axisCenter = axisBox.x + axisBox.width / 2;
    return surfaceBox.x + surfaceBox.width - axisCenter;
  };

  const portraitEdgePixels = await outerEdgePixels("portrait");
  const landscapeEdgePixels = await outerEdgePixels("landscape");

  expect(landscapeEdgePixels).toBeGreaterThanOrEqual(63);
  expect(landscapeEdgePixels).toBeLessThanOrEqual(94);
  expect(Math.abs(landscapeEdgePixels - portraitEdgePixels)).toBeLessThanOrEqual(2);
});

test("selected occurrence context is owned by the composer without mutating footer controls", async ({
  page,
}) => {
  const beforeChildren = await page.locator(".app-footer-bar").evaluate((element) =>
    Array.from(element.children)
      .filter((child) => !(child instanceof HTMLElement) || child.id !== "occurrence-composer")
      .map((child) => child.id || child.className),
  );

  const { composer } = await focusOccurrence(page);
  await expect(composer.locator('input[role="combobox"]')).toBeVisible();
  await expect(page.locator(".app-footer-bar #timeline-focus-prev")).toHaveCount(0);
  await expect(page.locator(".app-footer-bar #timeline-related-zoom")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-edit")).toHaveCount(0);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit timeline");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-pressed", "false");

  const afterChildren = await page.locator(".app-footer-bar").evaluate((element) =>
    Array.from(element.children)
      .filter((child) => !(child instanceof HTMLElement) || child.id !== "occurrence-composer")
      .map((child) => child.id || child.className),
  );
  expect(afterChildren).toEqual(beforeChildren);
});

test("Edit hydrates the selected item's category and tag hues and round-trips changes", async ({
  page,
}) => {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());

  const selectBrickOccurrence = async () => {
    await page.locator("#temporal-graph-view").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("worldselectionchange", {
          bubbles: true,
          detail: {
            selection: {
              kind: "relationship",
              id: "rel-event-pigs-brick-build-action",
            },
          },
        }),
      );
    });
  };

  await selectBrickOccurrence();
  await page.locator("#editor-toggle").click();

  await expect(page.locator("#control-panel")).toBeVisible();
  await expect(page.locator("#item-id")).toHaveValue("pigs-brick-build");
  await expect(page.locator("#item-category")).toHaveValue("creation");
  await expect(page.locator("#item-category-hue")).toHaveValue("22");
  await expect(page.locator("#item-category-hue-number")).toHaveValue("22");
  await expect(page.locator("#item-tags-details")).toHaveAttribute("open", "");
  await expect(page.locator("#item-tag-1-label")).toHaveValue("Place");
  await expect(page.locator("#item-tag-1-icon")).toHaveValue("home");
  await expect(page.locator("#item-tag-1-hue")).toHaveValue("28");
  await expect(page.locator("#item-tag-1-hue-number")).toHaveValue("28");

  await page.locator("#item-category-hue-number").fill("42");
  await expect(page.locator("#item-category-hue")).toHaveValue("42");
  await expect(page.locator("#item-category-hue-output")).toHaveText("42°");

  await page.locator("#item-tag-1-hue-number").fill("155");
  await expect(page.locator("#item-tag-1-hue")).toHaveValue("155");
  await expect(page.locator("#item-tag-1-hue-output")).toHaveText("155°");

  await page.locator("#save-item").click();
  await expect(page.locator("#item-id")).toHaveValue("");

  await page.locator("#editor-toggle").click();
  await expect(page.locator("#control-panel")).toBeHidden();

  await selectBrickOccurrence();
  await page.locator("#editor-toggle").click();

  await expect(page.locator("#item-id")).toHaveValue("pigs-brick-build");
  await expect(page.locator("#item-category-hue-number")).toHaveValue("42");
  await expect(page.locator("#item-tag-1-hue-number")).toHaveValue("155");
});

test("reactivating the selected card reopens the same composer-owned context", async ({ page }) => {
  const { terminal, composer } = await focusOccurrence(page);
  const initialValue = await composer.locator('input[role="combobox"]').inputValue();

  await composer.getByRole("button", { name: "Close occurrence composer" }).click();
  await expect(composer.locator(".compact")).toBeVisible();

  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator('input[role="combobox"]')).toHaveValue(initialValue);
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
});

test("composer media context remains authoritative for selected occurrence", async ({ page }) => {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  const terminal = page
    .locator("#timeline-view .timeline-event-terminal:has(.timeline-event-art):visible")
    .first();
  await expect(terminal).toBeVisible();
  await terminal.evaluate((button: HTMLButtonElement) => button.click());

  const composer = page.locator("#occurrence-composer");
  await expect(composer).toHaveAttribute("active", "");
  const deck = composer.locator("luum-occurrence-deck.composer-context-deck");
  await expect(deck).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);

  const next = deck.getByRole("button", { name: "Next frame" });
  if (await next.isVisible()) {
    const value = await composer.locator('input[role="combobox"]').inputValue();
    await next.click();
    await expect(composer.locator('input[role="combobox"]')).toHaveValue(value);
  }
});

test("timeline and world geometry stay stable while composer owns occurrence detail", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  for (const orientation of ["landscape", "portrait"] as const) {
    await page.goto("/");
    await ensureOrientation(page, orientation);
    const [timelineBefore, graphBefore, stageBefore] = await Promise.all([
      page.locator(".timeline-surface").boundingBox(),
      page.locator("#graph-lens").boundingBox(),
      page.locator("#presentation-stage").boundingBox(),
    ]);
    expect(timelineBefore).not.toBeNull();
    expect(graphBefore).not.toBeNull();
    expect(stageBefore).not.toBeNull();

    await focusOccurrence(page);

    const [timelineAfter, graphAfter, stageAfter] = await Promise.all([
      page.locator(".timeline-surface").boundingBox(),
      page.locator("#graph-lens").boundingBox(),
      page.locator("#presentation-stage").boundingBox(),
    ]);
    expect(timelineAfter).not.toBeNull();
    expect(graphAfter).not.toBeNull();
    expect(stageAfter).not.toBeNull();
    if (!timelineBefore || !graphBefore || !stageBefore || !timelineAfter || !graphAfter || !stageAfter) {
      throw new Error("Presentation geometry is unavailable.");
    }

    for (const [before, after] of [
      [timelineBefore, timelineAfter],
      [graphBefore, graphAfter],
      [stageBefore, stageAfter],
    ] as const) {
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
    }
  }
});

test("Browse and persistent View controls retain selected occurrence context", async ({ page }) => {
  const { composer } = await focusOccurrence(page);
  const selectedValue = await composer.locator('input[role="combobox"]').inputValue();

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#app-shell")).toHaveAttribute("data-browser-open", "true");
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  await page.locator("#timeline-browser-close").click();

  await expect(page.locator("#timeline-view-controls")).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  await expect(composer.locator('input[role="combobox"]')).toHaveValue(selectedValue);
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
});
