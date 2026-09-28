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

test("focused detail owns contextual actions while persistent toolbar geometry stays unchanged", async ({
  page,
}) => {
  await ensureSample(page);
  const persistent = [
    page.locator("#occurrence-composer"),
    page.locator("#project-menu-toggle"),
    page.locator("#editor-toggle"),
    page.locator("#timeline-browser-toggle"),
    page.locator("#timeline-orientation-toggle"),
    page.locator("#presentation-fullscreen-toggle"),
    page.locator("#timeline-auto-toggle"),
  ];
  const before = await Promise.all(persistent.map((control) => control.boundingBox()));

  const focus = await focusOccurrence(page);
  await expect(focus).toHaveAttribute("data-presentation-surface", "sidebar");
  await expect(focus).not.toHaveAttribute("popover", /.+/);
  await expect
    .poll(() => focus.evaluate((element) => element.matches(":popover-open")))
    .toBe(false);

  await expect(focus.locator(".timeline-focus-hero")).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Context" })).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Evidence" })).toBeVisible();
  await expect(page.locator(".app-footer-timeline")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-prev, #timeline-focus-next, #timeline-related-zoom, #timeline-related-fit")).toHaveCount(0);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit focused event");

  const actions = focus.locator(".timeline-focus-toolbar-actions");
  await expect(actions).toBeVisible();
  for (const selector of [
    ".timeline-focus-prev",
    ".timeline-focus-next",
    ".timeline-focus-related-zoom",
    ".timeline-focus-related-fit",
    ".timeline-focus-close",
  ]) {
    const button = actions.locator(selector);
    await expect(button).toBeVisible();
    const [buttonBox, iconBox] = await Promise.all([
      button.boundingBox(),
      button.locator(":scope > .semantic-icon").boundingBox(),
    ]);
    expect(buttonBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    if (!buttonBox || !iconBox) continue;
    expect(Math.abs(buttonBox.width - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonBox.height - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.width - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.height - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.x + iconBox.width / 2 - (buttonBox.x + buttonBox.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.y + iconBox.height / 2 - (buttonBox.y + buttonBox.height / 2))).toBeLessThanOrEqual(1);
  }

  const after = await Promise.all(persistent.map((control) => control.boundingBox()));
  for (let index = 0; index < before.length; index += 1) {
    const beforeBox = before[index];
    const afterBox = after[index];
    expect(beforeBox).not.toBeNull();
    expect(afterBox).not.toBeNull();
    if (!beforeBox || !afterBox) continue;
    expect(Math.abs(afterBox.x - beforeBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterBox.y - beforeBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterBox.width - beforeBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterBox.height - beforeBox.height)).toBeLessThanOrEqual(1);
  }

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

test("focused action icons keep one size and center position", async ({ page }) => {
  const focus = await focusOccurrence(page);
  const actions = focus.locator(".timeline-focus-icon-action");
  await expect(actions).toHaveCount(5);
  for (let index = 0; index < (await actions.count()); index += 1) {
    const action = actions.nth(index);
    const [buttonBox, iconBox] = await Promise.all([
      action.boundingBox(),
      action.locator(":scope > .semantic-icon").boundingBox(),
    ]);
    expect(buttonBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    if (!buttonBox || !iconBox) continue;
    expect(Math.abs(iconBox.width - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.height - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.x + iconBox.width / 2 - (buttonBox.x + buttonBox.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.y + iconBox.height / 2 - (buttonBox.y + buttonBox.height / 2))).toBeLessThanOrEqual(1);
  }
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
