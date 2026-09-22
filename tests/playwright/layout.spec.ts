import { expect, test } from '@playwright/test';

const PHONE_PORTRAIT = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };
const DESKTOP_LANDSCAPE = { width: 1440, height: 900 };

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
  const surface = page.locator('.timeline-surface');
  const surfaceBox = await surface.boundingBox();
  expect(surfaceBox).not.toBeNull();
  if (!surfaceBox) throw new Error('Timeline surface has no live bounds.');

  const intersectsViewport = (box) => {
    if (!box || box.width <= 0 || box.height <= 0) return false;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    return (
      centerX >= 0 &&
      centerX <= viewport.width &&
      centerY >= 0 &&
      centerY <= viewport.height
    );
  };
  const intersectsLiveSurface = (box) => {
    if (!intersectsViewport(box)) return false;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    return (
      centerX >= surfaceBox.x &&
      centerX <= surfaceBox.x + surfaceBox.width &&
      centerY >= surfaceBox.y &&
      centerY <= surfaceBox.y + surfaceBox.height
    );
  };

  const terminals = page.locator(
    '.timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-terminal:visible',
  );
  const terminalCount = await terminals.count();
  expect(terminalCount).toBeGreaterThan(0);

  let readableOccurrenceFound = false;
  for (let index = 0; index < terminalCount; index += 1) {
    const copy = terminals.nth(index).locator('.timeline-event-copy');
    const titleNode = copy.locator('strong');
    const title = (await titleNode.textContent())?.trim() ?? '';
    if (!title || !(await copy.isVisible())) continue;
    if (intersectsViewport(await titleNode.boundingBox())) {
      readableOccurrenceFound = true;
      break;
    }
  }
  expect(readableOccurrenceFound).toBeTruthy();

  // Retained temporal context may keep overscan labels alive outside the live
  // camera. Certification requires at least one label intersecting the current
  // surface, not that every retained DOM label be in the viewport.
  const temporalContext = page.locator(
    '.timeline-tick-label:visible, .timeline-month-accent:visible, .timeline-axis-month-label:visible',
  );
  const contextCount = await temporalContext.count();
  expect(contextCount).toBeGreaterThan(0);
  let readableContextFound = false;
  for (let index = 0; index < contextCount; index += 1) {
    if (intersectsLiveSurface(await temporalContext.nth(index).boundingBox())) {
      readableContextFound = true;
      break;
    }
  }
  expect(readableContextFound).toBeTruthy();
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

async function ensureTimelineOrientation(page, orientation) {
  const root = page.locator('#timeline-view');
  const current = await root.getAttribute('data-orientation');
  if (current !== orientation) await toggleTimelineOrientation(page);
  await expect(root).toHaveAttribute('data-orientation', orientation);

  const dock = page.locator('.app-tool-dock');
  const surface = page.locator('.timeline-surface');
  await expect
    .poll(async () => {
      const [dockBox, surfaceBox] = await Promise.all([dock.boundingBox(), surface.boundingBox()]);
      if (!dockBox || !surfaceBox) return false;
      return orientation === 'portrait'
        ? surfaceBox.x + surfaceBox.width <= dockBox.x + 3
        : surfaceBox.y + surfaceBox.height <= dockBox.y + 3;
    })
    .toBe(true);
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

  test('footer chrome forms one reserved edge stack in portrait and landscape', async ({ page }) => {
    for (const { viewport, orientation } of [
      { viewport: PHONE_PORTRAIT, orientation: 'portrait' },
      { viewport: PHONE_LANDSCAPE, orientation: 'landscape' },
      { viewport: TABLET_LANDSCAPE, orientation: 'landscape' },
      { viewport: DESKTOP_LANDSCAPE, orientation: 'landscape' },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await ensureTimelineOrientation(page, orientation);

      const dock = page.locator('.app-tool-dock');
      const titleBar = page.locator('.timeline-project-heading');
      const surface = page.locator('.timeline-surface');
      const actions = dock.locator(':scope > .app-tool');
      await expect(actions).toHaveCount(4);

      const dockBox = await expectInsideViewport(dock, viewport);
      await expectInsideViewport(titleBar, viewport);
      const surfaceBox = await expectInsideViewport(surface, viewport);

      for (const selector of [
        '#project-menu-toggle',
        '#editor-toggle',
        '#timeline-browser-toggle',
        '#timeline-view-controls-toggle',
      ]) {
        await expect(dock.locator(selector)).toBeVisible();
      }

      if (orientation === 'portrait') {
        expect(dockBox.height).toBeGreaterThan(180);
        expect(dockBox.width).toBeLessThan(90);
        expect(surfaceBox.x + surfaceBox.width).toBeLessThanOrEqual(dockBox.x + 3);
        await expect
          .poll(async () => {
            const [nextDockBox, nextTitleBox] = await Promise.all([
              dock.boundingBox(),
              titleBar.boundingBox(),
            ]);
            if (!nextDockBox || !nextTitleBox) return false;
            const gap = nextTitleBox.x - (nextDockBox.x + nextDockBox.width);
            return gap >= -3 && gap <= 16;
          })
          .toBe(true);
      } else {
        expect(dockBox.width).toBeGreaterThan(180);
        expect(dockBox.height).toBeLessThan(90);
        expect(surfaceBox.y + surfaceBox.height).toBeLessThanOrEqual(dockBox.y + 3);
        await expect
          .poll(async () => {
            const [nextDockBox, nextTitleBox] = await Promise.all([
              dock.boundingBox(),
              titleBar.boundingBox(),
            ]);
            if (!nextDockBox || !nextTitleBox) return false;
            const gap = nextTitleBox.y - (nextDockBox.y + nextDockBox.height);
            return gap >= -3 && gap <= 16;
          })
          .toBe(true);
      }

      // Footer/edge chrome is application-owned and must remain reserved even
      // when the contextual graph is unavailable or closed.
      await page.locator('#app-shell').evaluate((shell) => {
        shell.setAttribute('data-graph-open', 'false');
      });
      await expect
        .poll(async () => {
          const [nextDockBox, nextSurfaceBox] = await Promise.all([
            dock.boundingBox(),
            surface.boundingBox(),
          ]);
          if (!nextDockBox || !nextSurfaceBox) return false;
          return orientation === 'portrait'
            ? nextSurfaceBox.x + nextSurfaceBox.width <= nextDockBox.x + 3
            : nextSurfaceBox.y + nextSurfaceBox.height <= nextDockBox.y + 3;
        })
        .toBe(true);
    }
  });

  test('utility sheets and popovers stay reachable in both phone orientations', async ({ page }) => {
    for (const { viewport, orientation } of [
      { viewport: PHONE_PORTRAIT, orientation: 'portrait' },
      { viewport: PHONE_LANDSCAPE, orientation: 'landscape' },
      { viewport: TABLET_LANDSCAPE, orientation: 'landscape' },
      { viewport: DESKTOP_LANDSCAPE, orientation: 'landscape' },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await ensureTimelineOrientation(page, orientation);

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
      await expect(projectMenu).toHaveAttribute(
        'data-anchor-placement',
        orientation === 'portrait' ? 'left' : 'above',
      );
      await expect(projectButton).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(projectButton).toHaveAttribute('aria-expanded', 'false');

      const viewButton = page.locator('#timeline-view-controls-toggle');
      await viewButton.click();
      const viewControls = page.locator('#timeline-view-toolbar:popover-open');
      const viewControlsBox = await expectInsideViewport(viewControls, viewport);
      await expect(viewControls).toHaveAttribute(
        'data-anchor-placement',
        orientation === 'portrait' ? 'left' : 'above',
      );

      const dockBox = await page.locator('.app-tool-dock').boundingBox();
      expect(dockBox).not.toBeNull();
      if (!dockBox) throw new Error('App tool dock has no live bounds.');
      if (orientation === 'portrait') {
        expect(viewControlsBox.x + viewControlsBox.width).toBeLessThanOrEqual(dockBox.x - 4);
      } else {
        expect(viewControlsBox.y + viewControlsBox.height).toBeLessThanOrEqual(dockBox.y - 4);
      }

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
    if (before !== 'portrait' && before !== 'landscape') {
      throw new Error(`Unexpected timeline orientation: ${String(before)}`);
    }

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
  test('Project menu exposes every project action without entering Edit mode', async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.locator('#app-shell')).toHaveAttribute('data-mode', 'view');
    await page.locator('#project-menu-toggle').click();
    await expect(page.locator('#project-menu:popover-open')).toBeVisible();

    for (const selector of [
      '#load-sample',
      '#import-json-trigger',
      '#import-interchange-trigger',
      '#export-json',
      '#export-interchange',
      '#export-markdown',
      '#clear-timeline',
    ]) {
      await expect(page.locator(selector)).toBeEnabled();
    }
    await expect(page.locator('#project-menu a[role="menuitem"]')).toBeVisible();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-mode', 'view');
  });

  test('Project stays in the responsive app bar and reachable while editing', async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await page.setViewportSize(viewport);
    await page.goto('/');
    await ensureTimelineOrientation(page, 'portrait');

    const toolDock = page.locator('.app-tool-dock');
    const projectButton = toolDock.locator('#project-menu-toggle');
    const editorButton = toolDock.locator('#editor-toggle');
    const browseButton = toolDock.locator('#timeline-browser-toggle');
    const viewButton = toolDock.locator('#timeline-view-controls-toggle');

    await editorButton.click();
    await expect(page.locator('#control-panel')).toBeVisible();
    await expect(page.locator('#app-shell')).toHaveAttribute('data-mode', 'edit');
    await expect(editorButton.locator('.app-tool-label')).toHaveText('Done');

    await expect(projectButton).toBeVisible();
    await expect(browseButton).toBeVisible();
    await expect(viewButton).toBeVisible();
    await expect(browseButton).toBeDisabled();
    await expect(viewButton).toBeDisabled();

    await projectButton.click();
    const menu = page.locator('#project-menu:popover-open');
    await expect(menu).toBeVisible();
    await expect(page.locator('#control-panel')).toBeVisible();
    await expect(page.locator('#load-sample')).toBeEnabled();
    await expect(page.locator('#import-json-trigger')).toBeEnabled();
    await expect(page.locator('#clear-timeline')).toBeEnabled();

    const [menuBox, buttonBox] = await Promise.all([
      menu.boundingBox(),
      projectButton.boundingBox(),
    ]);
    expect(menuBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(menuBox?.x).toBeGreaterThanOrEqual(5);
    expect(menuBox?.y).toBeGreaterThanOrEqual(5);
    expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(
      (buttonBox?.x ?? viewport.width) - 5,
    );
    expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height - 5);
    await expect(menu).toHaveAttribute('data-anchor-placement', 'left');
  });

  test('Project menu stays clamped on compact portrait visual viewports', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await ensureTimelineOrientation(page, 'portrait');

      const toolDock = page.locator('.app-tool-dock');
      const projectButton = toolDock.locator('#project-menu-toggle');
      await expect(projectButton).toBeVisible();
      await projectButton.click();

      const menu = page.locator('#project-menu:popover-open');
      await expect(menu).toBeVisible();
      const [menuBox, buttonBox] = await Promise.all([
        menu.boundingBox(),
        projectButton.boundingBox(),
      ]);
      expect(menuBox).not.toBeNull();
      expect(buttonBox).not.toBeNull();
      expect(menuBox?.x).toBeGreaterThanOrEqual(5);
      expect(menuBox?.y).toBeGreaterThanOrEqual(5);
      expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(
        (buttonBox?.x ?? viewport.width) - 5,
      );
      expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height - 5);
      await expect(menu).toHaveAttribute('data-anchor-placement', 'left');

      await page.keyboard.press('Escape');
    }
  });


  test('persistent graph and timeline rail are simultaneously visible and independently hittable', async ({ page }) => {
    await page.setViewportSize(TABLET_LANDSCAPE);
    await page.goto('/');

    const graph = page.locator('#graph-lens');
    const graphCanvas = page.locator('#graph-lens .temporal-graph-canvas');
    const timelineSurface = page.locator('#timeline-view > .timeline-surface');

    await expect(graph).toBeVisible();
    await expect(graphCanvas).toBeVisible();
    await expect(timelineSurface).toBeVisible();

    const [graphBox, timelineBox] = await Promise.all([
      graph.boundingBox(),
      timelineSurface.boundingBox(),
    ]);
    expect(graphBox).not.toBeNull();
    expect(timelineBox).not.toBeNull();
    if (!graphBox || !timelineBox) throw new Error('Persistent surfaces have no live bounds.');

    expect(graphBox.width).toBeGreaterThan(300);
    expect(graphBox.height).toBeGreaterThan(200);
    expect(timelineBox.height).toBeGreaterThanOrEqual(220);

    const graphOwnsCenter = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit?.closest('#graph-lens'));
    }, {
      x: graphBox.x + graphBox.width / 2,
      y: graphBox.y + graphBox.height / 2,
    });
    expect(graphOwnsCenter).toBe(true);

    const timelineOwnsCenter = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit?.closest('#timeline-view'));
    }, {
      x: timelineBox.x + timelineBox.width / 2,
      y: timelineBox.y + timelineBox.height / 2,
    });
    expect(timelineOwnsCenter).toBe(true);
  });

});
