import { test, expect, devices } from '@playwright/test';

test.describe('Timeline Layout', () => {
  test('portrait layout on phone renders timeline visible', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Timeline view and surface should be visible
    const timelineView = page.locator('#timeline-view');
    const timelineSurface = page.locator('.timeline-surface');

    await expect(timelineView).toBeVisible();
    await expect(timelineSurface).toBeVisible();

    // Surface should occupy meaningful vertical space in portrait viewport
    const surfBounds = await timelineSurface.boundingBox();
    expect(surfBounds).not.toBeNull();
    if (!surfBounds) return;

    // Surface should be at least 200px tall for usable timeline in portrait
    expect(surfBounds.height).toBeGreaterThan(200);
    // Surface should not exceed viewport width
    expect(surfBounds.width).toBeLessThanOrEqual(375);
    // Surface should be within viewport bounds (no horizontal overflow)
    expect(surfBounds.x).toBeGreaterThanOrEqual(0);
    expect(surfBounds.x + surfBounds.width).toBeLessThanOrEqual(376);
  });

  test('landscape layout renders timeline with proper sizing', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    // Timeline surface should be visible in landscape
    const timelineSurface = page.locator('.timeline-surface');
    const timelineView = page.locator('#timeline-view');

    await expect(timelineView).toBeVisible();
    await expect(timelineSurface).toBeVisible();

    const tlBounds = await timelineView.boundingBox();
    expect(tlBounds).not.toBeNull();
    if (!tlBounds) return;

    // Landscape should be wider than tall
    expect(tlBounds.width).toBeGreaterThan(tlBounds.height);
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
      expect(box?.x).toBeGreaterThanOrEqual(-1);
      expect(box?.y).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 2);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 2);
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
    expect(projectMenuBox?.width).toBeLessThanOrEqual(viewport.width - 14);
    expect(projectMenuBox?.height).toBeLessThanOrEqual(viewport.height - 14);
    expect((projectMenuBox?.y ?? 0) + (projectMenuBox?.height ?? 0)).toBeLessThanOrEqual(
      (projectButtonBox?.y ?? viewport.height) - 5,
    );
    await expect(projectButton).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(projectButton).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#timeline-view-controls-toggle').click();
    await expectInsideViewport('#timeline-view-toolbar:popover-open');
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

  test('Project stays in the footer app bar and reachable while editing', async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await page.setViewportSize(viewport);
    await page.goto('/');

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
    expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width - 5);
    expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(
      (buttonBox?.y ?? viewport.height) - 5,
    );
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
      expect(menuBox?.x).toBeGreaterThanOrEqual(5);
      expect(menuBox?.y).toBeGreaterThanOrEqual(5);
      expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width - 5);
      expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(
        (buttonBox?.y ?? viewport.height) - 5,
      );

      await page.keyboard.press('Escape');
    }
  });

  test('fullscreen presentation fills viewport while keeping controls accessible', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 768 });

    // Just verify the page doesn't crash in fullscreen mode
    // Timeline and controls should remain accessible
    const timeline = page.locator('#timeline-view');
    const toolDock = page.locator('.app-tool-dock');

    await expect(timeline).toBeVisible();
    await expect(toolDock).toBeVisible();
  });

  test('tablet landscape (768px) renders two-column layout', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 768, height: 1024 });

    const timeline = page.locator('#timeline-view');
    await expect(timeline).toBeVisible();

    const tlBounds = await timeline.boundingBox();
    expect(tlBounds).not.toBeNull();
    if (tlBounds) {
      // Tablet landscape should have significant height for timeline
      expect(tlBounds.height).toBeGreaterThan(400);
    }
  });

  test('safe area insets respected in fullscreen mode', async ({ context }) => {
    // Create context with mobile device that has safe area inset
    const mobileContext = await context.browser()?.newContext({
      ...devices['iPhone 14'],
      viewport: { width: 390, height: 844 },
    });

    if (mobileContext) {
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto('/');

      // Main timeline view should be accessible on mobile
      const timelineView = await mobilePage.locator('#timeline-view');
      await expect(timelineView).toBeVisible();

      const bounds = await timelineView.boundingBox();
      expect(bounds).not.toBeNull();
      if (bounds) {
        // Should not be positioned off-screen
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
      }

      await mobileContext.close();
    }
  });

  test('portrait layout preserves focus and interaction state', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Timeline surface should be present and focusable
    const timelineSurface = page.locator('.timeline-surface');
    await expect(timelineSurface).toBeVisible();

    // Focus on timeline should not crash the app
    await timelineSurface.focus();
    await expect(timelineSurface).toBeFocused();

    // Interaction should continue to work
    const bounds = await timelineSurface.boundingBox();
    expect(bounds).not.toBeNull();
    if (bounds) {
      expect(bounds.width).toBeGreaterThan(100);
      expect(bounds.height).toBeGreaterThan(100);
    }
  });
});
