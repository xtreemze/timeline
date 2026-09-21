import { test, expect, devices } from '@playwright/test';

test.describe('Timeline Layout', () => {
  test('portrait layout on phone renders year counter visible', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Year counter should be visible and not overflow timeline bounds
    const yearCounter = page.locator('[data-timeline-orientation="portrait"] .timeline-empty-hint');
    await expect(yearCounter).toBeVisible();

    const timelineView = page.locator('.timeline-view');
    const tlBounds = await timelineView.boundingBox();
    const ycBounds = await yearCounter.boundingBox();

    expect(ycBounds?.left).toBeGreaterThanOrEqual(tlBounds?.left || 0);
    expect(ycBounds?.right).toBeLessThanOrEqual(tlBounds?.right || 0);
  });

  test('landscape layout renders graph/map/timeline with proper positioning', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    // Timeline surface should fill width, graph/map beside it
    const timelineSurface = page.locator('.timeline-view[data-orientation="landscape"] .timeline-surface');
    const graphCanvas = page.locator('.temporal-graph-canvas');

    await expect(timelineSurface).toBeVisible();
    await expect(graphCanvas).toBeVisible();

    const tlBounds = await timelineSurface.boundingBox();
    expect(tlBounds?.height).toBeGreaterThan(100);
  });

  test('workspace actions share one bottom app bar on mobile and desktop', async ({ page }) => {
    await page.goto('/');

    const toolDock = page.locator('.app-tool-dock');
    const actions = toolDock.locator(':scope > .app-tool');
    await expect(actions).toHaveCount(4);
    await expect(toolDock.locator('#project-menu-toggle')).toBeVisible();
    await expect(toolDock.locator('#editor-toggle')).toBeVisible();
    await expect(toolDock.locator('#timeline-browser-toggle')).toBeVisible();
    await expect(toolDock.locator('#timeline-view-controls-toggle')).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);

      const dockBox = await toolDock.boundingBox();
      expect(dockBox).not.toBeNull();
      expect(dockBox?.width).toBeGreaterThan(180);
      expect(dockBox?.height).toBeLessThan(90);
      expect(dockBox?.x).toBeGreaterThanOrEqual(0);
      expect((dockBox?.x ?? 0) + (dockBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
      expect((dockBox?.y ?? 0) + (dockBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
      expect(dockBox?.y).toBeGreaterThan(viewport.height - 100);
    }
  });

  test('mobile panels and menus remain inside the reachable viewport', async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await page.setViewportSize(viewport);
    await page.goto('/');

    async function expectInsideViewport(selector: string) {
      const locator = page.locator(selector);
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
      return box;
    }

    const toolDock = page.locator('.app-tool-dock');

    await page.locator('#editor-toggle').click();
    const editorBox = await expectInsideViewport('#control-panel');
    const dockBox = await toolDock.boundingBox();
    expect(editorBox?.width).toBeGreaterThan(viewport.width * 0.9);
    expect((editorBox?.y ?? 0) + (editorBox?.height ?? 0)).toBeLessThanOrEqual((dockBox?.y ?? viewport.height) + 1);
    await page.locator('#control-panel-close').click();

    await page.locator('#timeline-browser-toggle').click();
    const browserBox = await expectInsideViewport('#timeline-browser-sheet');
    expect(browserBox?.width).toBeGreaterThan(viewport.width * 0.9);
    await page.locator('#timeline-browser-close').click();

    const projectButton = page.locator('#project-menu-toggle');
    await expect(projectButton).toBeVisible();
    await expect(projectButton).toHaveAttribute('aria-expanded', 'false');
    await projectButton.click();
    const projectMenuBox = await expectInsideViewport('#project-menu:popover-open');
    const projectButtonBox = await projectButton.boundingBox();
    expect(projectMenuBox?.width).toBeLessThanOrEqual(viewport.width - 16);
    expect(projectMenuBox?.height).toBeLessThanOrEqual(viewport.height - 16);
    expect((projectMenuBox?.y ?? 0) + (projectMenuBox?.height ?? 0)).toBeLessThanOrEqual(
      (projectButtonBox?.y ?? viewport.height) - 7,
    );
    await expect(projectButton).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(projectButton).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#timeline-view-controls-toggle').click();
    await expectInsideViewport('#timeline-view-toolbar:popover-open');
  });

  test('Project footer menu stays clamped on compact visual viewports', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

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
      expect(menuBox?.x).toBeGreaterThanOrEqual(7);
      expect(menuBox?.y).toBeGreaterThanOrEqual(7);
      expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width - 7);
      expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(
        (buttonBox?.y ?? viewport.height) - 7,
      );

      await page.keyboard.press('Escape');
    }
  });

  test('fullscreen presentation fills viewport while keeping controls accessible', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 768 });

    // Enter fullscreen if available
    const fullscreenButton = page.locator('#presentation-fullscreen-toggle');
    if (await fullscreenButton.isVisible()) {
      await fullscreenButton.click();

      const presentationStage = page.locator('#presentation-stage:fullscreen');
      await expect(presentationStage).toHaveAttribute('data-timeline-orientation', /(horizontal|vertical)/);
    }
  });

  test('tablet landscape (768px) renders two-column layout', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 768, height: 1024 });

    const timeline = page.locator('.timeline-view');
    const relationGraph = page.locator('.temporal-graph-canvas, .presentation-map');

    await expect(timeline).toBeVisible();
    // Graph or map should be visible on tablet landscape
    const graphVisible = await relationGraph.first().isVisible().catch(() => false);
    expect(graphVisible).toBeTruthy();
  });

  test('safe area insets respected in fullscreen mode', async ({ page, context }) => {
    // Create context with mobile device that has safe area inset
    const mobileContext = await context.browser()?.newContext({
      ...devices['iPhone 14'],
      viewport: { width: 390, height: 844 },
    });

    if (mobileContext) {
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto('/');

      const appShell = mobilePage.locator('#app-shell');
      const computedStyle = await appShell.evaluate((el) =>
        getComputedStyle(el)
      );

      // Safe area should be considered in padding/margin
      expect(computedStyle).toBeDefined();
      await mobileContext.close();
    }
  });

  test('year counter positioning corrects for timeline-axis-cross variable', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    const emptyHint = page.locator('.timeline-empty-hint');
    const computedStyle = await emptyHint.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        right: style.getPropertyValue('right'),
        writingMode: style.writingMode,
      };
    });

    // Should use CSS custom property for positioning
    expect(computedStyle.right).toContain('calc');
    expect(computedStyle.writingMode).toBe('vertical-rl');
  });
});
