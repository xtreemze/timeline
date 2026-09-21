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

    const timelineViewModulePath = "/timeline-view.ts";
    const { TimelineView } = await import(timelineViewModulePath);
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

    const longTasks: number[] = [];
    let longTaskObserver: PerformanceObserver | null = null;
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

  const pointerId = 91;
  const pointerType = testInfo.project.use.hasTouch ? 'touch' : 'mouse';
  const y = box.y + box.height * 0.52;
  const positions = [0.72, 0.6, 0.46, 0.32].map((ratio) => box.x + box.width * ratio);

  await surface.dispatchEvent('pointerdown', {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: positions[0],
    clientY: y,
  });
  for (const clientX of positions.slice(1)) {
    await surface.dispatchEvent('pointermove', {
      pointerId,
      pointerType,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX,
      clientY: y,
    });
  }
  await surface.dispatchEvent('pointercancel', {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 0,
    clientX: positions.at(-1),
    clientY: y,
  });

  await expect
    .poll(() => root.getAttribute('data-scene-state'))
    .not.toBe('interacting');
  await expect
    .poll(() => root.getAttribute('data-scene-state'))
    .not.toBe('settling');
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

  // Timing evidence is recorded but not fatal until #271 captures a documented
  // reference baseline. Structural invariants above remain fatal immediately.

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
          longTasksOver50Ms: evidence.longTasks.filter((duration) => duration > 50),
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
});
