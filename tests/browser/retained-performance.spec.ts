import { expect, test } from '@playwright/test';

async function twoFrames(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function installPerformanceFixture(page) {
  await page.evaluate(async () => {
    document.querySelector('#retained-performance-host')?.remove();

    const root = document.createElement('section');
    root.id = 'retained-performance-host';
    root.className = 'timeline-view';

    const surface = document.createElement('div');
    surface.className = 'timeline-surface';
    surface.tabIndex = 0;
    surface.style.width = '100%';
    surface.style.height = 'min(70dvh, 560px)';
    surface.style.position = 'relative';

    const readout = document.createElement('output');
    readout.className = 'timeline-window-readout';

    const focus = document.createElement('div');
    focus.className = 'timeline-focus-view';
    focus.setAttribute('popover', 'manual');

    root.append(surface, readout, focus);
    document.body.append(root);

    const { TimelineView } = await import('/timeline-view.ts');
    const controller = TimelineView.create(root);
    if (!controller) throw new Error('Timeline performance fixture did not initialize.');

    const origin = Date.parse('1900-01-01T00:00:00Z');
    const step = 12 * 60 * 60 * 1000;
    controller.setItems(
      Array.from({ length: 1_000 }, (_, index) => ({
        id: `perf-${String(index).padStart(4, '0')}`,
        kind: 'event',
        title: `Performance occurrence ${index}`,
        start: origin + index * step,
        end: index % 5 === 0 ? origin + index * step + step * 3 : null,
        startLabel: String(index),
      })),
    );

    controller.resetPerformanceMetrics();

    const longTasks = [];
    let longTaskObserver = null;
    const supported =
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('longtask');

    if (supported) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      longTaskObserver.observe({ type: 'longtask', buffered: false });
    }

    Object.assign(globalThis, {
      __retainedPerformanceController: controller,
      __retainedPerformanceLongTasks: longTasks,
      __retainedPerformanceLongTaskObserver: longTaskObserver,
      __retainedPerformanceLongTaskSupported: Boolean(supported),
    });
  });
  await twoFrames(page);
}

test('retained renderer reports bounded mobile-safe interaction metrics', async ({ page }, testInfo) => {
  await page.goto('/');
  await installPerformanceFixture(page);

  const root = page.locator('#retained-performance-host');
  const surface = root.locator('.timeline-surface');
  await expect(surface).toBeVisible();

  const box = await surface.boundingBox();
  if (!box) throw new Error('Performance timeline surface has no bounding box.');

  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.52);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.52, { steps: 4 });
  await page.mouse.move(box.x + box.width * 0.46, box.y + box.height * 0.52, { steps: 4 });
  await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.52, { steps: 4 });
  await page.mouse.up();

  await page.evaluate(() => {
    globalThis.__retainedPerformanceController?.commitInteraction();
  });
  await twoFrames(page);

  const evidence = await page.evaluate(() => {
    globalThis.__retainedPerformanceLongTaskObserver?.disconnect();
    return {
      metrics: globalThis.__retainedPerformanceController?.getPerformanceMetrics(),
      longTaskSupported: Boolean(globalThis.__retainedPerformanceLongTaskSupported),
      longTasks: [...(globalThis.__retainedPerformanceLongTasks ?? [])],
      eventNodes: document.querySelectorAll(
        '#retained-performance-host .timeline-event, #retained-performance-host .timeline-range-segment',
      ).length,
    };
  });

  expect(evidence.metrics).toBeTruthy();
  const { metrics } = evidence;
  expect(metrics.interaction.frameCount).toBeGreaterThan(0);
  expect(metrics.commit.frameCount).toBeGreaterThan(0);
  expect(metrics.interaction.destroyedNodes).toBe(0);
  expect(metrics.violations).toEqual([]);
  expect(metrics.retainedPeak).toBeGreaterThan(0);
  expect(metrics.retainedPeak).toBeLessThan(3_000);
  expect(evidence.eventNodes).toBeLessThanOrEqual(metrics.retainedPeak);
  expect(Number.isFinite(metrics.interaction.p95DurationMs)).toBeTruthy();
  expect(Number.isFinite(metrics.commit.p95DurationMs)).toBeTruthy();

  if (evidence.longTaskSupported) {
    expect(Math.max(0, ...evidence.longTasks)).toBeLessThanOrEqual(50);
  }

  await testInfo.attach('retained-timeline-performance.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          project: testInfo.project.name,
          interactionP95Ms: metrics.interaction.p95DurationMs,
          commitP95Ms: metrics.commit.p95DurationMs,
          retainedPeak: metrics.retainedPeak,
          bufferExpansions: metrics.bufferExpansions,
          renderedEventNodes: evidence.eventNodes,
          longTaskSupported: evidence.longTaskSupported,
          longTasksMs: evidence.longTasks,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
});
