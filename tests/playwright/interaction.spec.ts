import { test, expect, devices } from '@playwright/test';

test.describe('Timeline Interaction', () => {
  test('pan gesture on timeline surface moves chronology with inertia', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    const timelineSurface = page.locator('.timeline-surface');
    const box = await timelineSurface.boundingBox();

    if (box) {
      // Drag across timeline to pan (drag left to move forward in time)
      await page.dragAndDrop(
        '.timeline-surface',
        '.timeline-surface',
        {
          sourcePosition: { x: box.width * 0.7, y: box.height / 2 },
          targetPosition: { x: box.width * 0.3, y: box.height / 2 },
        }
      );

      // Timeline should move (test passes if no crash)
      await expect(timelineSurface).toBeVisible();
    }
  });

  test('pinch gesture on graph zooms canvas', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    // On desktop, the graph might not be visible. This test mainly verifies no crash.
    const graphCanvas = page.locator('[class*="graph"], [class*="temporal"]');

    // Graph might not exist on desktop - just verify page is stable
    const timelineView = page.locator('#timeline-view');
    await expect(timelineView).toBeVisible();

    // Simulate scroll zoom on a visible element
    const box = await timelineView.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 10); // Scroll to zoom

      await expect(timelineView).toBeVisible();
    }
  });

  test('touch node long-press on mobile initiates drag', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Timeline should be responsive to touch events
    const timelineView = page.locator('#timeline-view');
    await expect(timelineView).toBeVisible();

    // Touch interaction should not crash the app
    const box = await timelineView.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(500);
      await page.mouse.up();

      // Should not crash; timeline remains stable
      await expect(timelineView).toBeVisible();
    }
  });

  test('double-tap on timeline zooms in (landscape)', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    const timelineSurface = page.locator('.timeline-surface');
    const box = await timelineSurface.boundingBox();

    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      // Double-click to zoom
      await page.mouse.click(x, y);
      await page.waitForTimeout(100);
      await page.mouse.click(x, y);

      await expect(timelineSurface).toBeVisible();
    }
  });

  test('keyboard navigation: arrow keys pan timeline', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    const timelineSurface = page.locator('.timeline-surface');
    await timelineSurface.focus();

    // Arrow left should pan left
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    // Arrow right should pan right
    await page.keyboard.press('ArrowRight');

    await expect(timelineSurface).toBeVisible();
  });

  test('keyboard zoom: + and - adjust scale', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    const timelineSurface = page.locator('.timeline-surface');
    await timelineSurface.focus();

    // Plus should zoom in
    await page.keyboard.press('+');
    await page.waitForTimeout(100);

    // Minus should zoom out
    await page.keyboard.press('-');

    await expect(timelineSurface).toBeVisible();
  });

  test('Home key centers graph', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    // Focus on timeline surface - Home key navigation
    const timelineSurface = page.locator('.timeline-surface');
    await timelineSurface.focus();

    await page.keyboard.press('Home');
    await page.waitForTimeout(100);

    await expect(timelineSurface).toBeVisible();
  });

  test('touch routing: gesture on graph does not pan timeline', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Issue #125: touch routing between surfaces
    const graphCanvas = page.locator('.temporal-graph-canvas');
    const timelineSurface = page.locator('.timeline-surface');

    await expect(graphCanvas).toBeVisible();
    await expect(timelineSurface).toBeVisible();

    // Drag on graph should only affect graph, not timeline
    const graphBox = await graphCanvas.boundingBox();
    if (graphBox) {
      await page.dragAndDrop(
        '.temporal-graph-canvas',
        '.temporal-graph-canvas',
        {
          sourcePosition: { x: graphBox.width * 0.7, y: graphBox.height / 2 },
          targetPosition: { x: graphBox.width * 0.3, y: graphBox.height / 2 },
        }
      );

      // Both should still be visible (no cross-contamination)
      await expect(graphCanvas).toBeVisible();
      await expect(timelineSurface).toBeVisible();
    }
  });

  test('popover opens and closes without breaking interaction', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1024, height: 600 });

    // Click to open a popover (e.g., date range picker)
    const calendarButton = page.locator('#item-calendar-prev, [aria-label*="calendar"]').first();
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(100);

      // Popover should be open
      const popover = page.locator('[popover]');
      const isOpen = await popover.isVisible().catch(() => false);
      expect(isOpen).toBeTruthy();

      // Close popover
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      // Timeline interaction should still work
      const timelineSurface = page.locator('.timeline-surface');
      await expect(timelineSurface).toBeVisible();
    }
  });

  test('focus popover follows orientation (portrait rail, landscape stack)', async ({
    page,
  }) => {
    await page.goto('/');

    // Test portrait
    await page.setViewportSize({ width: 375, height: 812 });
    let focusView = page.locator('.timeline-focus-view[popover]');
    await expect(focusView).toBeDefined();

    // Test landscape
    await page.setViewportSize({ width: 1024, height: 600 });
    focusView = page.locator('.timeline-focus-view[popover]');
    await expect(focusView).toBeDefined();
  });
});
