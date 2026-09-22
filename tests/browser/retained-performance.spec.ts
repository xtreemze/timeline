import { expect, test } from '@playwright/test';

async function twoFrames(page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function installPerformanceFixture(page) {
  await page.evaluate(async () => {
    document.querySelector('#retained-performance-host')?.remove();

    const root = document.createElement('section');
    root.id = 'retained-performance-host';
    root.className = 'timeline-view';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      margin: '0',
      background: 'white',
    });

    const surface = document.createElement('div');
    surface.className = 'timeline-surface';
    surface.tabIndex = 0;
    Object.assign(surface.style, {
      width: '100%',
      height: 'min(70dvh, 560px)',
      position: 'relative',
    });

    const readout = document.createElement('output');
    readout.className = 'timeline-window-readout';

    const focus = document.createElement('div');
    focus.className = 'timeline-focus-view';
    focus.setAttribute('popover', 'manual');

    root.append(surface, readout, focus);
    document.body.append(root);

    const timelineViewModulePath = '/timeline-view.ts';
    const { TimelineView } = await import(/* @vite-ignore */ timelineViewModulePath);
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

    const longTasks: number[] = [];
    let longTaskObserver: PerformanceObserver | null = null;
    const longTaskSupported =
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('longtask');

    if (longTaskSupported) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      longTaskObserver.observe({ type: 'longtask', buffered: false });
    }

    const longAnimationFrames: Array<{
      duration: number;
      blockingDuration: number;
      renderStart: number;
      styleAndLayoutStart: number;
    }> = [];
    let longAnimationFrameObserver: PerformanceObserver | null = null;
    const longAnimationFrameSupported =
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame');

    if (longAnimationFrameSupported) {
      longAnimationFrameObserver = new PerformanceObserver((list) => {
        for (const rawEntry of list.getEntries()) {
          const entry = rawEntry as PerformanceEntry & {
            blockingDuration?: number;
            renderStart?: number;
            styleAndLayoutStart?: number;
          };
          longAnimationFrames.push({
            duration: entry.duration,
            blockingDuration: Number(entry.blockingDuration || 0),
            renderStart: Number(entry.renderStart || 0),
            styleAndLayoutStart: Number(entry.styleAndLayoutStart || 0),
          });
        }
      });
      longAnimationFrameObserver.observe({ type: 'long-animation-frame', buffered: false });
    }

    const memory = (performance as Performance & {
      memory?: { usedJSHeapSize?: number };
    }).memory;
    const heapBefore = Number(memory?.usedJSHeapSize) || null;

    controller.resetPerformanceMetrics();

    Object.assign(globalThis as typeof globalThis & Record<string, unknown>, {
      __retainedPerformanceController: controller,
      __retainedPerformanceLongTasks: longTasks,
      __retainedPerformanceLongTaskObserver: longTaskObserver,
      __retainedPerformanceLongTaskSupported: Boolean(longTaskSupported),
      __retainedPerformanceLongAnimationFrames: longAnimationFrames,
      __retainedPerformanceLongAnimationFrameObserver: longAnimationFrameObserver,
      __retainedPerformanceLongAnimationFrameSupported: Boolean(longAnimationFrameSupported),
      __retainedPerformanceHeapBefore: heapBefore,
    });
  });
  await twoFrames(page);
}

test('retained renderer publishes phase-attributed performance evidence', async ({ page }, testInfo) => {
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
  await surface.dispatchEvent('pointermove', {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: positions[1],
    clientY: y,
  });

  // Keep the gesture active through a render boundary. Without this, a fast
  // synthetic cancel can legitimately coalesce the scheduled frame into commit.
  await twoFrames(page);

  for (const clientX of positions.slice(2)) {
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
  await twoFrames(page);

  await surface.dispatchEvent('pointercancel', {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 0,
    clientX: positions.at(-1),
    clientY: y,
  });

  await expect.poll(() => root.getAttribute('data-scene-state')).not.toBe('interacting');
  await expect.poll(() => root.getAttribute('data-scene-state')).not.toBe('settling');
  await twoFrames(page);

  const evidence = await page.evaluate(() => {
    const controller = Reflect.get(globalThis, '__retainedPerformanceController') as
      | { getPerformanceMetrics(): {
          interaction: {
            frameCount: number;
            destroyedNodes: number;
            p95DurationMs: number;
            inputLatencySampleCount: number;
            p95InputLatencyMs: number;
          };
          commit: { frameCount: number; p95DurationMs: number };
          violations: unknown[];
          retainedPeak: number;
          bufferExpansions: number;
        } }
      | undefined;
    const longTaskObserver = Reflect.get(
      globalThis,
      '__retainedPerformanceLongTaskObserver',
    ) as PerformanceObserver | null | undefined;
    const longAnimationFrameObserver = Reflect.get(
      globalThis,
      '__retainedPerformanceLongAnimationFrameObserver',
    ) as PerformanceObserver | null | undefined;
    longTaskObserver?.disconnect();
    longAnimationFrameObserver?.disconnect();

    const memory = (performance as Performance & {
      memory?: { usedJSHeapSize?: number };
    }).memory;
    const heapAfter = Number(memory?.usedJSHeapSize) || null;
    const heapBeforeValue = Reflect.get(globalThis, '__retainedPerformanceHeapBefore');
    const heapBefore = typeof heapBeforeValue === 'number' ? heapBeforeValue : null;
    const rawLongTasks = Reflect.get(globalThis, '__retainedPerformanceLongTasks');
    const rawLongAnimationFrames = Reflect.get(
      globalThis,
      '__retainedPerformanceLongAnimationFrames',
    );

    return {
      metrics: controller?.getPerformanceMetrics(),
      longTaskSupported: Boolean(
        Reflect.get(globalThis, '__retainedPerformanceLongTaskSupported'),
      ),
      longTasks: Array.isArray(rawLongTasks)
        ? rawLongTasks.filter((value): value is number => typeof value === 'number')
        : [],
      longAnimationFrameSupported: Boolean(
        Reflect.get(globalThis, '__retainedPerformanceLongAnimationFrameSupported'),
      ),
      longAnimationFrames: Array.isArray(rawLongAnimationFrames)
        ? [...rawLongAnimationFrames]
        : [],
      heapBefore,
      heapAfter,
      heapDelta:
        heapBefore !== null && heapAfter !== null
          ? heapAfter - heapBefore
          : null,
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
  expect(metrics.interaction.inputLatencySampleCount).toBeGreaterThan(0);
  expect(Number.isFinite(metrics.interaction.p95InputLatencyMs)).toBeTruthy();

  // Renderer-owned timings are release-fatal. Touch/mobile projects use a
  // 30 Hz worst-case interaction ceiling because WebKit CI variance can cross
  // one 60 Hz frame while remaining well inside the direct-manipulation budget.
  const interactionBudgetMs = testInfo.project.use.hasTouch ? 33.3 : 16.7;
  expect(metrics.interaction.p95DurationMs).toBeLessThanOrEqual(interactionBudgetMs);
  expect(metrics.commit.p95DurationMs).toBeLessThanOrEqual(16.7);
  expect(metrics.interaction.p95InputLatencyMs).toBeLessThanOrEqual(50);

  // Long Tasks observes the whole page/event loop and cannot attribute work to
  // the retained renderer. Keep it as evidence; renderer-owned frame metrics
  // above are the fatal contract until task attribution is available.

  const report = {
    project: testInfo.project.name,
    interactionP95Ms: metrics.interaction.p95DurationMs,
    commitP95Ms: metrics.commit.p95DurationMs,
    inputToVisualP95Ms: metrics.interaction.p95InputLatencyMs,
    retainedPeak: metrics.retainedPeak,
    bufferExpansions: metrics.bufferExpansions,
    renderedEventNodes: evidence.eventNodes,
    heapBeforeBytes: evidence.heapBefore,
    heapAfterBytes: evidence.heapAfter,
    heapDeltaBytes: evidence.heapDelta,
    longTaskSupported: evidence.longTaskSupported,
    longTasksMs: evidence.longTasks,
    longTasksOver50Ms: evidence.longTasks.filter((duration) => duration > 50),
    longAnimationFrameSupported: evidence.longAnimationFrameSupported,
    longAnimationFrames: evidence.longAnimationFrames,
  };

  console.log('RETAINED_TIMELINE_PERF ' + JSON.stringify(report));
  await testInfo.attach('retained-timeline-performance.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });
});
