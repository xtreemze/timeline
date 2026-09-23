import { expect, test, type Locator, type Page } from "@playwright/test";

async function ensureSample(page: Page) {
  const terminal = page.locator(
    "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
  ).first();
  if (await terminal.count()) return terminal;
  await page.locator("#load-sample").click();
  await expect(terminal).toBeVisible();
  return terminal;
}

async function focusOccurrence(page: Page) {
  const terminal = await ensureSample(page);
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  const focus = page.locator("#timeline-focus-view");
  await expect(focus).toBeVisible();
  return focus;
}

async function boxes(page: Page, focus: Locator) {
  const [focusBox, graphBox, timelineBox, stageBox] = await Promise.all([
    focus.boundingBox(),
    page.locator("#graph-lens").boundingBox(),
    page.locator("#timeline-view").boundingBox(),
    page.locator("#presentation-stage").boundingBox(),
  ]);
  expect(focusBox).not.toBeNull();
  expect(graphBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  if (!focusBox || !graphBox || !timelineBox || !stageBox) {
    throw new Error("Focused presentation surfaces must all have layout bounds.");
  }
  return { focusBox, graphBox, timelineBox, stageBox };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-view")).toBeVisible();
});

test("focused detail is layout-owned and never enters the popover top layer", async ({ page }) => {
  const focus = await focusOccurrence(page);
  await expect(focus).toHaveAttribute("data-presentation-surface", "sidebar");
  await expect(focus).not.toHaveAttribute("popover", /.+/);
  await expect.poll(() => focus.evaluate((element) => element.matches(":popover-open"))).toBe(false);
});

test("landscape places focused detail left of graph with full-width timeline below", async ({ page }) => {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== "landscape") {
    await page.locator("#timeline-orientation-toggle").evaluate((button: HTMLButtonElement) => button.click());
  }
  await expect(timeline).toHaveAttribute("data-orientation", "landscape");
  const focus = await focusOccurrence(page);

  const { focusBox, graphBox, timelineBox, stageBox } = await boxes(page, focus);
  expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(graphBox.x + 2);
  expect(timelineBox.y).toBeGreaterThanOrEqual(Math.min(focusBox.y + focusBox.height, graphBox.y + graphBox.height) - 2);
  expect(timelineBox.x).toBeLessThanOrEqual(stageBox.x + 2);
  expect(timelineBox.x + timelineBox.width).toBeGreaterThanOrEqual(stageBox.x + stageBox.width - 2);
});

test("portrait stacks focused detail above graph while timeline owns the full right rail", async ({ page }) => {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== "portrait") {
    await page.locator("#timeline-orientation-toggle").evaluate((button: HTMLButtonElement) => button.click());
  }
  await expect(timeline).toHaveAttribute("data-orientation", "portrait");
  const focus = await focusOccurrence(page);

  const { focusBox, graphBox, timelineBox, stageBox } = await boxes(page, focus);
  expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(graphBox.y + 2);
  expect(timelineBox.x).toBeGreaterThanOrEqual(graphBox.x + graphBox.width - 2);
  expect(timelineBox.y).toBeLessThanOrEqual(stageBox.y + 2);
  expect(timelineBox.y + timelineBox.height).toBeGreaterThanOrEqual(stageBox.y + stageBox.height - 2);
});
