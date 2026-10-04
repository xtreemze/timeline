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

async function ensureOrientation(page: Page, orientation: "landscape" | "portrait") {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(timeline).toHaveAttribute("data-orientation", orientation);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/lum/");
  await expect(page.locator("#timeline-view")).toBeVisible();
});

test("occurrence activation keeps the retained temporal card and opens composer-owned detail", async ({
  page,
}) => {
  const terminal = await ensureSample(page);
  const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
  await expect(card).toHaveCount(1);

  await card.evaluate((element) => {
    (window as Window & { __retainedOccurrenceCard?: Element }).__retainedOccurrenceCard = element;
  });

  await terminal.click();

  const composer = page.locator("#occurrence-composer");
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-occurrence-card")).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-view:visible")).toHaveCount(0);
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

test("composer-owned detail preserves temporal anchor and graph workspace geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const terminal = await ensureSample(page);
  const graph = page.locator("#graph-lens");

  const [terminalBefore, graphBefore] = await Promise.all([
    terminal.boundingBox(),
    graph.boundingBox(),
  ]);
  expect(terminalBefore).not.toBeNull();
  expect(graphBefore).not.toBeNull();

  await terminal.click();
  await expect(page.locator("#occurrence-composer")).toHaveAttribute("active", "");

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

test("composer-owned occurrence detail stays in the visual viewport in both chronology orientations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });

  for (const orientation of ["landscape", "portrait"] as const) {
    await page.goto("/lum/");
    await ensureOrientation(page, orientation);
    const terminal = await ensureSample(page);

    await terminal.click();

    const composer = page.locator("#occurrence-composer");
    await expect(composer).toHaveAttribute("active", "");
    await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);

    const box = await composer.evaluate((element) => {
      const panel = element.shadowRoot?.querySelector(".completion-panel");
      const rect = panel?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    });
    expect(box).not.toBeNull();
    if (!box) continue;

    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.y).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width).toBeLessThanOrEqual(414);
    expect(box.y + box.height).toBeLessThanOrEqual(917);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= window.innerWidth + 2 &&
          document.documentElement.scrollHeight <= window.innerHeight + 2,
      ),
    ).toBe(true);
  }
});
