import { expect, type Page, test } from "@playwright/test";

async function ensureSample(page: Page) {
  const terminal = page
    .locator(
      "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
    )
    .first();
  if (!(await terminal.count())) {
    await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  }
  await expect(terminal).toBeVisible();
  return terminal;
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

test("explicit detail promotes the same retained occurrence card and leaves sibling focus hidden", async ({
  page,
}) => {
  const terminal = await ensureSample(page);
  const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
  await expect(card).toHaveCount(1);

  await card.evaluate((element) => {
    (window as Window & { __retainedOccurrenceCard?: Element }).__retainedOccurrenceCard = element;
  });

  await terminal.click();
  await terminal.click();

  await expect(card).toHaveAttribute("data-expanded", "true");
  const detail = card.locator(".timeline-event-detail");
  await expect(detail).toBeVisible();
  await expect(page.locator("#timeline-focus-view")).toBeHidden();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  await expect(page.locator("#app-shell")).not.toHaveClass(/is-event-focused/);

  expect(
    await card.evaluate(
      (element) =>
        (window as Window & { __retainedOccurrenceCard?: Element }).__retainedOccurrenceCard ===
        element,
    ),
  ).toBe(true);
});

test("promoting retained detail preserves temporal anchor and graph workspace geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const terminal = await ensureSample(page);
  const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
  const graph = page.locator("#graph-lens");

  const [terminalBefore, graphBefore] = await Promise.all([
    terminal.boundingBox(),
    graph.boundingBox(),
  ]);
  expect(terminalBefore).not.toBeNull();
  expect(graphBefore).not.toBeNull();

  await terminal.click();
  await terminal.click();
  await expect(card).toHaveAttribute("data-expanded", "true");

  const [terminalAfter, graphAfter] = await Promise.all([
    terminal.boundingBox(),
    graph.boundingBox(),
  ]);
  expect(terminalAfter).not.toBeNull();
  expect(graphAfter).not.toBeNull();
  if (!terminalBefore || !terminalAfter || !graphBefore || !graphAfter) return;

  expect(Math.abs(terminalAfter.x - terminalBefore.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(terminalAfter.y - terminalBefore.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(graphAfter.x - graphBefore.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(graphAfter.y - graphBefore.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(graphAfter.width - graphBefore.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(graphAfter.height - graphBefore.height)).toBeLessThanOrEqual(2);
});

test("promoted detail stays in the visual viewport in both chronology orientations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });

  for (const orientation of ["landscape", "portrait"] as const) {
    await page.goto("/");
    await ensureOrientation(page, orientation);
    const terminal = await ensureSample(page);
    const card = terminal.locator("xpath=ancestor::luum-event-card[1]");

    await terminal.click();
    await terminal.click();
    await expect(card).toHaveAttribute("data-expanded", "true");

    const detail = card.locator(".timeline-event-detail");
    const box = await detail.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(412);
    expect(box.y + box.height).toBeLessThanOrEqual(915);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= window.innerWidth &&
          document.documentElement.scrollHeight <= window.innerHeight,
      ),
    ).toBe(true);
  }
});
