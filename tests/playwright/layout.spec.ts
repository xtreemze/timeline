import { expect, test } from '@playwright/test';

const PHONE_PORTRAIT = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };

async function expectInsideViewport(locator, viewport, tolerance = 2) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Visible element has no bounding box.');
  expect(box.x).toBeGreaterThanOrEqual(-tolerance);
  expect(box.y).toBeGreaterThanOrEqual(-tolerance);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + tolerance);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + tolerance);
  return box;
}

async function expectVisibleChronology(page, viewport) {
  const terminals = page.locator(
    '.timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-terminal:visible',
  );
  const terminalCount = await terminals.count();
  expect(terminalCount).toBeGreaterThan(0);

  let readableOccurrenceFound = false;
  for (let index = 0; index < terminalCount; index += 1) {
    const terminal = terminals.nth(index);
    const box = await terminal.boundingBox();
    const copy = terminal.locator('.timeline-event-copy');
    const title = (await copy.locator('strong').textContent())?.trim() ?? '';
    if (!box || !title || !(await copy.isVisible())) continue;
    const visibleWidth = Math.max(
      0,
      Math.min(box.x + box.width, viewport.width) - Math.max(box.x, 0),
    );
    const visibleHeight = Math.max(
      0,
      Math.min(box.y + box.height, viewport.height) - Math.max(box.y, 0),
    );
    if (
      visibleWidth >= box.width * 0.5 &&
      visibleHeight >= box.height * 0.5
    ) {
      readableOccurrenceFound = true;
      break;
    }
  }
  expect(readableOccurrenceFound).toBeTruthy();

  const ticks = page.locator('.timeline-tick-label:visible');
  const tickCount = await ticks.count();
  expect(tickCount).toBeGreaterThan(0);
  let readableTickFound = false;
  for (let index = 0; index < tickCount; index += 1) {
    const box = await ticks.nth(index).boundingBox();
    if (!box) continue;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    if (
      centerX >= 0 &&
      centerX <= viewport.width &&
      centerY >= 0 &&
      centerY <= viewport.height
    ) {
      readableTickFound = true;
      break;
    }
  }
  expect(readableTickFound).toBeTruthy();
}

async function expectNoPrimaryDocumentScroll(page, viewport) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(viewport.height + 2);
}

async function toggleTimelineOrientation(page) {
  const toolbar = page.locator('#timeline-view-toolbar:popover-open');
  if ((await toolbar.count()) === 0) {
    await page.locator('#timeline-view-controls-toggle').click();
  }
  const orientationToggle = page.locator(
    '#timeline-view-toolbar:popover-open #timeline-orientation-toggle',
  );
  await expect(orientationToggle).toBeVisible();
  await orientationToggle.click();
}

test.describe('Mobile-first Timeline layout contracts', () => {
  test('phone portrait gives chronology the viewport and keeps temporal context readable', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_PORTRAIT);
    await page.goto('/');

    const timeline = page.locator('#timeline-view');
    const surface = page.locator('.timeline-surface');
    const dock = page.locator('.app-tool-dock');

    const timelineBox = await expectInsideViewport(timeline, PHONE_PORTRAIT);
    const surfaceBox = await expectInsideViewport(surface, PHONE_PORTRAIT);
    await expectInsideViewport(dock, PHONE_PORTRAIT);

    expect(timelineBox.width).toBeGreaterThan(PHONE_PORTRAIT.width * 0.9);
    expect(timelineBox.height).toBeGreaterThan(PHONE_PORTRAIT.height * 0.8);
    expect(surfaceBox.width).toBeGreaterThan(PHONE_PORTRAIT.width * 0.9);
    // With the relation graph open, chronology still owns at least half of a portrait phone.
    await expect
      .poll(async () => (await surface.boundingBox())?.height ?? 0)
      .toBeGreaterThan(PHONE_PORTRAIT.height * 0.48);

    await expectVisibleChronology(page, PHONE_PORTRAIT);
    await expectNoPrimaryDocumentScroll(page, PHONE_PORTRAIT);
  });

  test('phone landscape retains a major readable chronology surface without page scrolling', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_LANDSCAPE);
    await page.goto('/');

    const timeline = page.locator('#timeline-view');
    const surface = page.locator('.timeline-surface');
    const dock = page.locator('.app-tool-dock');

    const timelineBox = await expectInsideViewport(timeline, PHONE_LANDSCAPE);
    const surfaceBox = await expectInsideViewport(surface, PHONE_LANDSCAPE);
    await expectInsideViewport(dock, PHONE_LANDSCAPE);

    expect(timelineBox.width).toBeGreaterThan(PHONE_LANDSCAPE.width * 0.9);
    expect(timelineBox.height).toBeGreaterThan(PHONE_LANDSCAPE.height * 0.8);
    expect(surfaceBox.width).toBeGreaterThan(PHONE_LANDSCAPE.width * 0.9);
    // Landscape keeps a substantial chronology rail while leaving graph context usable.
    await expect
      .poll(async () => (await surface.boundingBox())?.height ?? 0)
      .toBeGreaterThan(PHONE_LANDSCAPE.height * 0.4);

    await expectVisibleChronology(page, PHONE_LANDSCAPE);
    await expectNoPrimaryDocumentScroll(page, PHONE_LANDSCAPE);
  });

  test('footer app bar remains reachable in portrait and landscape', async ({ page }) => {
    for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const dock = page.locator('.app-tool-dock');
      const actions = dock.locator(':scope > .app-tool');
      await expect(actions).toHaveCount(4);
      const dockBox = await expectInsideViewport(dock, viewport);
      expect(dockBox.width).toBeGreaterThan(180);
      expect(dockBox.height).toBeLessThan(90);

      for (const selector of [
        '#project-menu-toggle',
        '#editor-toggle',
        '#timeline-browser-toggle',
        '#timeline-view-controls-toggle',
      ]) {
        await expect(dock.locator(selector)).toBeVisible();
      }
    }
  });

  test('utility sheets and popovers stay reachable in both phone orientations', async ({ page }) => {
    for (const viewport of [PHONE_PORTRAIT, PHONE_LANDSCAPE]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await page.locator('#editor-toggle').click();
      await expectInsideViewport(page.locator('#control-panel'), viewport);
      await page.locator('#control-panel-close').click();

      await page.locator('#timeline-browser-toggle').click();
      await expectInsideViewport(page.locator('#timeline-browser-sheet'), viewport);
      await page.locator('#timeline-browser-close').click();

      const projectButton = page.locator('#project-menu-toggle');
      await projectButton.click();
      const projectMenu = page.locator('#project-menu:popover-open');
      await expectInsideViewport(projectMenu, viewport);
      await expect(projectButton).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(projectButton).toHaveAttribute('aria-expanded', 'false');

      const viewButton = page.locator('#timeline-view-controls-toggle');
      await viewButton.click();
      await expectInsideViewport(page.locator('#timeline-view-toolbar:popover-open'), viewport);
      await page.keyboard.press('Escape');
      await expect(viewButton).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('orientation changes retain rendered occurrence identity and update control semantics', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_LANDSCAPE);
    await page.goto('/');

    const root = page.locator('#timeline-view');
    const terminal = page
      .locator('.timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible')
      .first();
    await expect(terminal).toBeVisible();

    await terminal.evaluate((element) => {
      element.closest('.timeline-event')?.setAttribute('data-layout-retained-identity', 'occurrence');
    });

    const before = await root.getAttribute('data-orientation');
    expect(['portrait', 'landscape']).toContain(before);

    await toggleTimelineOrientation(page);
    const after = before === 'portrait' ? 'landscape' : 'portrait';
    await expect(root).toHaveAttribute('data-orientation', after);
    await expect(root.locator('[data-layout-retained-identity="occurrence"]')).toHaveCount(1);
    await expect(page.locator('#timeline-zoom-level')).toHaveAttribute(
      'aria-orientation',
      after === 'portrait' ? 'vertical' : 'horizontal',
    );

    await toggleTimelineOrientation(page);
    await expect(root).toHaveAttribute('data-orientation', before);
    await expect(root.locator('[data-layout-retained-identity="occurrence"]')).toHaveCount(1);
  });

  test('tablet landscape keeps timeline and graph simultaneously usable', async ({ page }) => {
    await page.setViewportSize(TABLET_LANDSCAPE);
    await page.goto('/');

    const timeline = page.locator('#timeline-view');
    const surface = page.locator('.timeline-surface');
    const graph = page.locator('.temporal-graph-canvas');

    const timelineBox = await expectInsideViewport(timeline, TABLET_LANDSCAPE);
    const surfaceBox = await expectInsideViewport(surface, TABLET_LANDSCAPE);
    const graphBox = await graph.boundingBox();
    expect(graphBox).not.toBeNull();

    expect(timelineBox.width).toBeGreaterThan(TABLET_LANDSCAPE.width * 0.6);
    expect(timelineBox.height).toBeGreaterThan(TABLET_LANDSCAPE.height * 0.5);
    // The desktop/tablet relation composition deliberately uses a 220px minimum
    // chronology rail while reserving the complementary majority for the graph.
    expect(surfaceBox.height).toBeGreaterThanOrEqual(220);
    expect(graphBox?.height ?? 0).toBeGreaterThan(TABLET_LANDSCAPE.height * 0.4);
    await expectVisibleChronology(page, TABLET_LANDSCAPE);
    await expectNoPrimaryDocumentScroll(page, TABLET_LANDSCAPE);
  });
});
