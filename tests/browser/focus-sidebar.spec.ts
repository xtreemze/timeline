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
    await page
      .locator("#timeline-orientation-toggle")
      .evaluate((button: HTMLButtonElement) => button.click());
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

test("focused detail is shell-owned while contextual actions stay in the footer", async ({
  page,
}) => {
  const focus = await focusOccurrence(page);
  await expect(focus).toHaveAttribute("data-presentation-surface", "sidebar");
  await expect(focus).not.toHaveAttribute("popover", /.+/);
  await expect
    .poll(() =>
      focus.evaluate(
        (element) => element.hasAttribute("popover") && element.matches(":popover-open"),
      ),
    )
    .toBe(false);

  await expect(focus.locator(".timeline-focus-hero")).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Context" })).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Evidence" })).toBeVisible();
  await expect(focus.locator(".timeline-focus-actions")).toHaveCount(0);

  await expect(page.locator("#timeline-focus-prev")).toBeVisible();
  await expect(page.locator("#timeline-focus-next")).toBeVisible();
  await expect(page.locator("#timeline-focus-edit")).toHaveCount(0);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit focused event");
  await expect(page.locator("#timeline-view-toolbar")).toBeVisible();

  await focus.locator(".timeline-focus-close").click();
  await expect(focus).toBeHidden();
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

test("Browse and persistent View controls do not discard the focused occurrence", async ({
  page,
}) => {
  await focusOccurrence(page);

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#app-shell")).toHaveAttribute("data-browser-open", "true");
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
  await page.locator("#timeline-browser-close").click();

  await expect(page.locator("#timeline-view-toolbar")).toBeVisible();
  await expect(page.locator("#timeline-view-controls-toggle")).toHaveCount(0);
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-focused/);
});
