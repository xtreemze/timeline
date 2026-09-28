import { expect, type Locator, type Page, test } from "@playwright/test";

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
  const focus = page.locator("#timeline-focus-view");
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
  return focus;
}

async function ensureOrientation(page: Page, orientation: "landscape" | "portrait") {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(timeline).toHaveAttribute("data-orientation", orientation);
}

async function boxes(page: Page, focus: Locator) {
  const [focusBox, graphBox, timelineBox, stageBox, footerBox] = await Promise.all([
    focus.boundingBox(),
    page.locator("#graph-lens").boundingBox(),
    page.locator(".timeline-surface").boundingBox(),
    page.locator("#presentation-stage").boundingBox(),
    page.locator(".app-footer-bar").boundingBox(),
  ]);
  expect(focusBox).not.toBeNull();
  expect(graphBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  if (!focusBox || !graphBox || !timelineBox || !stageBox || !footerBox) {
    throw new Error("Focused presentation surfaces must all have layout bounds.");
  }
  return { focusBox, graphBox, timelineBox, stageBox, footerBox };
}

function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
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
    if (!surfaceBox || !axisBox) throw new Error(`${orientation} timeline geometry is unavailable.`);

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

test("focused detail owns contextual actions without mutating the footer", async ({ page }) => {
  const focus = await focusOccurrence(page);
  await expect(focus).toHaveAttribute("data-presentation-surface", "sidebar");
  await expect(focus).not.toHaveAttribute("popover", /.+/);
  await expect
    .poll(() => focus.evaluate((element) => element.matches(":popover-open")))
    .toBe(false);

  await expect(focus.locator(".timeline-focus-hero")).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Context" })).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Evidence" })).toBeVisible();
  await expect(focus.locator(".timeline-focus-actions")).toHaveCount(0);
  await expect(focus.getByRole("region", { name: "Place" })).toHaveCount(0);
  await expect(focus.locator(".timeline-focus-edit")).toHaveCount(0);

  const headerActions = focus.locator(".timeline-focus-context-actions");
  await expect(headerActions).toBeVisible();
  for (const selector of [
    "#timeline-focus-prev",
    "#timeline-focus-next",
    "#timeline-related-zoom",
    "#timeline-related-fit",
  ]) {
    const action = headerActions.locator(selector);
    await expect(action).toBeVisible();
    const [buttonBox, iconBox] = await Promise.all([
      action.boundingBox(),
      action.locator(":scope > .semantic-icon").boundingBox(),
    ]);
    expect(buttonBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    if (!buttonBox || !iconBox) continue;
    expect(Math.abs(buttonBox.width - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonBox.height - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.width - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.height - 20)).toBeLessThanOrEqual(1);
  }
  await expect(page.locator(".app-footer-bar #timeline-focus-prev")).toHaveCount(0);
  await expect(page.locator(".app-footer-bar #timeline-related-zoom")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-edit")).toHaveCount(0);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit timeline");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("data-semantic-icon", "edit");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#timeline-view-toolbar")).toBeVisible();

  await focus.locator(".timeline-focus-close").click();
  await expect(focus).toBeHidden();
});

test("clicking the selected card keeps its attached detail open", async ({ page }) => {
  const terminal = await ensureSample(page);
  const focus = await focusOccurrence(page);
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
});

test("focused detail tabs use roving keyboard focus and proper tabpanel semantics", async ({ page }) => {
  const focus = await focusOccurrence(page);
  const contextTab = focus.getByRole("tab", { name: "Context" });
  const evidenceTab = focus.getByRole("tab", { name: "Evidence" });
  const contextPanel = focus.locator("#timeline-focus-context-panel");
  const evidencePanel = focus.locator("#timeline-focus-evidence-panel");

  await expect(contextTab).toHaveAttribute("aria-selected", "true");
  await expect(contextTab).toHaveAttribute("tabindex", "0");
  await expect(evidenceTab).toHaveAttribute("tabindex", "-1");
  await expect(contextPanel).toHaveAttribute("role", "tabpanel");
  await expect(contextPanel).toHaveAttribute("aria-labelledby", "timeline-focus-context-tab");
  await expect(evidencePanel).toHaveAttribute("aria-labelledby", "timeline-focus-evidence-tab");

  await contextTab.focus();
  await contextTab.press("ArrowRight");
  await expect(evidenceTab).toBeFocused();
  await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
  await expect(evidenceTab).toHaveAttribute("tabindex", "0");
  await expect(contextTab).toHaveAttribute("tabindex", "-1");
  await expect(contextPanel).toBeHidden();
  await expect(evidencePanel).toBeVisible();

  await evidenceTab.press("Home");
  await expect(contextTab).toBeFocused();
  await expect(contextTab).toHaveAttribute("aria-selected", "true");
  await expect(contextPanel).toBeVisible();
});

test("hero image changes preserve the active detail tab and keyboard focus", async ({ page }) => {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  const mediaTerminal = page
    .locator("#timeline-view .timeline-event-terminal:has(.timeline-event-art):visible")
    .first();
  await expect(mediaTerminal).toBeVisible();
  await mediaTerminal.evaluate((button: HTMLButtonElement) => button.click());

  const focus = page.locator("#timeline-focus-view");
  const evidenceTab = focus.getByRole("tab", { name: "Evidence" });
  await evidenceTab.click();
  await expect(focus).toHaveAttribute("data-active-tab", "evidence");

  const next = focus.locator(".timeline-focus-media-control.is-next");
  await expect(next).toBeVisible();
  const before = await focus.locator(".timeline-focus-slide-dot.is-active").getAttribute("data-slide-index");
  await next.click();

  await expect(focus).toHaveAttribute("data-active-tab", "evidence");
  await expect(focus.getByRole("tab", { name: "Evidence" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(focus.locator(".timeline-focus-media-control.is-next")).toBeFocused();
  const after = await focus.locator(".timeline-focus-slide-dot.is-active").getAttribute("data-slide-index");
  expect(after).not.toBe(before);
});

test("focus edit affordances keep large hit targets with compact visible icons", async ({ page }) => {
  const focus = await focusOccurrence(page);
  const edit = focus.locator(".timeline-focus-edit").first();
  await expect(edit).toBeVisible();
  const [buttonBox, iconBox] = await Promise.all([
    edit.boundingBox(),
    edit.locator(".semantic-icon").boundingBox(),
  ]);
  expect(buttonBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  if (!buttonBox || !iconBox) return;
  expect(buttonBox.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  expect(iconBox.width).toBeLessThanOrEqual(20);
  expect(iconBox.height).toBeLessThanOrEqual(20);
});

test("semantic activation of the selected occurrence keeps explicit-close focus open", async ({
  page,
}) => {
  const focus = await focusOccurrence(page);
  const semantic = page.locator('.timeline-semantic-occurrence[aria-current="true"]').first();
  await semantic.evaluate((button: HTMLButtonElement) => button.click());
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
});

test("landscape preserves the bottom timeline rail while focused detail layers over the graph", async ({
  page,
}) => {
  await ensureOrientation(page, "landscape");
  const before = await page.locator(".timeline-surface").boundingBox();
  expect(before).not.toBeNull();

  const focus = await focusOccurrence(page);
  const { focusBox, graphBox, timelineBox, stageBox } = await boxes(page, focus);
  if (!before) throw new Error("Landscape timeline surface has no baseline bounds.");

  expect(Math.abs(timelineBox.x - before.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.y - before.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.width - before.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.height - before.height)).toBeLessThanOrEqual(2);
  expect(timelineBox.x).toBeLessThanOrEqual(stageBox.x + 2);
  expect(timelineBox.x + timelineBox.width).toBeGreaterThanOrEqual(stageBox.x + stageBox.width - 2);
  expect(graphBox.y + graphBox.height).toBeLessThanOrEqual(timelineBox.y + 3);
  expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(timelineBox.y + 3);
  expect(overlapArea(focusBox, graphBox)).toBeGreaterThan(100);
});

test("portrait preserves the right timeline rail while focused detail layers inside the graph region", async ({
  page,
}) => {
  await ensureOrientation(page, "portrait");
  const before = await page.locator(".timeline-surface").boundingBox();
  expect(before).not.toBeNull();

  const focus = await focusOccurrence(page);
  const { focusBox, graphBox, timelineBox, stageBox, footerBox } = await boxes(page, focus);
  if (!before) throw new Error("Portrait timeline surface has no baseline bounds.");

  expect(Math.abs(timelineBox.x - before.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.y - before.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.width - before.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(timelineBox.height - before.height)).toBeLessThanOrEqual(2);
  expect(timelineBox.y).toBeLessThanOrEqual(stageBox.y + 2);
  expect(Math.abs(timelineBox.y + timelineBox.height - footerBox.y)).toBeLessThanOrEqual(2);
  expect(graphBox.x + graphBox.width).toBeLessThanOrEqual(timelineBox.x + 3);
  expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(timelineBox.x + 3);
  expect(overlapArea(focusBox, graphBox)).toBeGreaterThan(100);
});

test("Browse and persistent View controls do not discard the focused occurrence", async ({ page }) => {
  await focusOccurrence(page);

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#app-shell")).toHaveAttribute("data-browser-open", "true");
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
  await page.locator("#timeline-browser-close").click();

  await expect(page.locator("#timeline-view-controls")).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
});
