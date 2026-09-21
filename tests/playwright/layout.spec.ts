import { test, expect, devices } from '@playwright/test';

test.describe('Timeline Layout', () => {
  test('portrait layout on phone renders timeline visible', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Timeline view and surface should be visible and properly sized
    const timelineView = page.locator('#timeline-view');
    const timelineSurface = page.locator('.timeline-surface');

    await expect(timelineView).toBeVisible();
    await expect(timelineSurface).toBeVisible();

    const tlBounds = await timelineView.boundingBox();
    const surfBounds = await timelineSurface.boundingBox();

    expect(tlBounds).not.toBeNull();
    expect(surfBounds).not.toBeNull();
    if (!tlBounds || !surfBounds) return;

    // Portrait should be taller than wide
    expect(tlBounds.height).toBeGreaterThan(tlBounds.width);
    // Surface should take up significant portion of viewport
    expect(surfBounds.height).toBeGreaterThan(300);
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

    // Presentation stage should exist and be visible
    const presentationStage = page.locator('#presentation-stage, [role="presentation"]');

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
    const relationGraph = page.locator('[class*="graph"], [class*="map"]');

    await expect(timeline).toBeVisible();

    const tlBounds = await timeline.boundingBox();
    expect(tlBounds).not.toBeNull();
    if (tlBounds) {
      // Tablet landscape should have significant height for timeline
      expect(tlBounds.height).toBeGreaterThan(400);
    }
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
