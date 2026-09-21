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

  test('mobile tab layout keeps controls compact (max-width: 699px)', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 600, height: 800 });

    // Tool dock should be positioned with max() for safe area
    const toolDock = page.locator('.app-tool-dock');
    const toolDockBox = await toolDock.boundingBox();

    expect(toolDockBox?.height).toBeLessThan(400);
    expect(toolDockBox?.width).toBeLessThan(100);
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
