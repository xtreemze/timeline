import { expect, test } from '@playwright/test';

async function installViewportRecorder(page) {
  await page.evaluate(() => {
    const root = document.querySelector('#timeline-view');
    if (!root) throw new Error('Timeline root is missing.');
    globalThis.__timelineViewportEvents = [];
    root.addEventListener('timelineviewportchange', (event) => {
      globalThis.__timelineViewportEvents.push({
        viewport: { ...event.detail.viewport },
        committed: Boolean(event.detail.committed),
      });
    });
  });
}

async function clearViewportEvents(page) {
  await page.evaluate(() => {
    globalThis.__timelineViewportEvents = [];
  });
}

async function viewportEvents(page) {
  return page.evaluate(() => globalThis.__timelineViewportEvents ?? []);
}

async function waitForViewportEvents(page, minimum = 1) {
  await expect
    .poll(() => page.evaluate(() => globalThis.__timelineViewportEvents?.length ?? 0))
    .toBeGreaterThanOrEqual(minimum);
}

function span(event) {
  return event.viewport.end - event.viewport.start;
}

async function settleTimeline(page) {
  await expect
    .poll(() => page.locator('#timeline-view').getAttribute('data-scene-state'))
    .not.toBe('interacting');
}

async function performPan(page, surface, testInfo) {
  const box = await surface.boundingBox();
  if (!box) throw new Error('Timeline surface has no bounding box.');

  const startX = box.x + box.width * 0.72;
  const middleX = box.x + box.width * 0.52;
  const endX = box.x + box.width * 0.32;
  const y = box.y + box.height * 0.5;

  if (testInfo.project.use.hasTouch) {
    const pointerId = 31;
    await surface.dispatchEvent('pointerdown', {
      pointerId,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: y,
    });
    for (const clientX of [middleX, endX]) {
      await surface.dispatchEvent('pointermove', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY: y,
      });
    }
    return async () => {
      await surface.dispatchEvent('pointerup', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: endX,
        clientY: y,
      });
    };
  }

  const pointerId = 31;
  await surface.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: startX,
    clientY: y,
  });
  for (const clientX of [middleX, endX]) {
    await surface.dispatchEvent('pointermove', {
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX,
      clientY: y,
    });
  }
  return async () => {
    await surface.dispatchEvent('pointerup', {
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: endX,
      clientY: y,
    });
  };
}

test.describe('Timeline interaction contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#timeline-view')).toBeVisible();
    await expect(page.locator('.timeline-surface')).toBeVisible();
    await installViewportRecorder(page);
  });

  test('pointer pan changes the logical viewport and settles to a committed state', async ({ page }, testInfo) => {
    const surface = page.locator('.timeline-surface');
    const finish = await performPan(page, surface, testInfo);

    await waitForViewportEvents(page, 2);
    const liveEvents = await viewportEvents(page);
    expect(liveEvents.some((event) => event.committed === false)).toBeTruthy();
    expect(new Set(liveEvents.map((event) => event.viewport.start)).size).toBeGreaterThan(1);

    await finish();
    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test('keyboard pan emits committed viewport changes in opposite directions', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    await surface.focus();

    await page.keyboard.press('ArrowRight');
    await waitForViewportEvents(page);
    const afterRight = (await viewportEvents(page)).at(-1);
    expect(afterRight?.committed).toBeTruthy();

    await clearViewportEvents(page);
    await page.keyboard.press('ArrowLeft');
    await waitForViewportEvents(page);
    const afterLeft = (await viewportEvents(page)).at(-1);
    expect(afterLeft?.committed).toBeTruthy();
    expect(afterLeft?.viewport.start).toBeLessThan(afterRight?.viewport.start);
  });

  test('keyboard zoom changes temporal span rather than merely keeping the surface visible', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    await surface.focus();

    await page.keyboard.press('+');
    await waitForViewportEvents(page);
    const zoomedIn = (await viewportEvents(page)).at(-1);
    if (!zoomedIn) throw new Error('Zoom-in emitted no viewport event.');

    await clearViewportEvents(page);
    await page.keyboard.press('-');
    await waitForViewportEvents(page);
    const zoomedOut = (await viewportEvents(page)).at(-1);
    if (!zoomedOut) throw new Error('Zoom-out emitted no viewport event.');

    expect(span(zoomedOut)).toBeGreaterThan(span(zoomedIn));
  });

  test('Home fit expands a deliberately zoomed chronology back toward full context', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    await surface.focus();

    await page.keyboard.press('+');
    await waitForViewportEvents(page);
    await clearViewportEvents(page);
    await page.keyboard.press('+');
    await waitForViewportEvents(page);
    const zoomed = (await viewportEvents(page)).at(-1);
    if (!zoomed) throw new Error('Zoom preparation emitted no viewport event.');

    await clearViewportEvents(page);
    await page.keyboard.press('Home');
    await waitForViewportEvents(page);
    const fitted = (await viewportEvents(page)).at(-1);
    if (!fitted) throw new Error('Home fit emitted no viewport event.');

    expect(span(fitted)).toBeGreaterThan(span(zoomed));
    expect(fitted.committed).toBeTruthy();
  });

  test('touch double-tap zooms the retained chronology using pointer semantics', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    await surface.focus();
    await page.keyboard.press('Home');
    await waitForViewportEvents(page);
    const baseline = (await viewportEvents(page)).at(-1);
    if (!baseline) throw new Error('Home fit emitted no viewport event.');
    await clearViewportEvents(page);

    const box = await surface.boundingBox();
    if (!box) throw new Error('Timeline surface has no bounding box.');
    const x = box.x + box.width * 0.5;
    const y = box.y + box.height * 0.5;

    for (const pointerId of [41, 42]) {
      await surface.dispatchEvent('pointerdown', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
      await surface.dispatchEvent('pointerup', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
    }

    await waitForViewportEvents(page, 2);
    const finalEvent = (await viewportEvents(page)).at(-1);
    if (!finalEvent) throw new Error('Double-tap emitted no viewport event.');
    expect(span(finalEvent)).toBeLessThan(span(baseline));
    expect(finalEvent.committed).toBeTruthy();
  });

  test('touch pinch changes temporal span and commits after both pointers release', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    await surface.focus();
    await page.keyboard.press('Home');
    await waitForViewportEvents(page);
    const baseline = (await viewportEvents(page)).at(-1);
    if (!baseline) throw new Error('Home fit emitted no viewport event.');
    await clearViewportEvents(page);

    const box = await surface.boundingBox();
    if (!box) throw new Error('Timeline surface has no bounding box.');
    const y = box.y + box.height * 0.5;
    const left = box.x + box.width * 0.4;
    const right = box.x + box.width * 0.6;
    const expandedRight = box.x + box.width * 0.82;

    await surface.dispatchEvent('pointerdown', {
      pointerId: 51,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: left,
      clientY: y,
    });
    await surface.dispatchEvent('pointerdown', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
      clientX: right,
      clientY: y,
    });
    await surface.dispatchEvent('pointermove', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: false,
      buttons: 1,
      clientX: expandedRight,
      clientY: y,
    });

    await waitForViewportEvents(page);
    const pinched = (await viewportEvents(page)).at(-1);
    if (!pinched) throw new Error('Pinch emitted no viewport event.');
    expect(span(pinched)).toBeLessThan(span(baseline));
    expect(pinched.committed).toBeFalsy();

    await surface.dispatchEvent('pointerup', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
      clientX: expandedRight,
      clientY: y,
    });
    await surface.dispatchEvent('pointerup', {
      pointerId: 51,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: left,
      clientY: y,
    });

    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test('pointer cancellation cannot leave the retained scene interacting', async ({ page }) => {
    const surface = page.locator('.timeline-surface');
    const box = await surface.boundingBox();
    if (!box) throw new Error('Timeline surface has no bounding box.');
    const x = box.x + box.width * 0.6;
    const y = box.y + box.height * 0.5;

    await surface.dispatchEvent('pointerdown', {
      pointerId: 61,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    await surface.dispatchEvent('pointermove', {
      pointerId: 61,
      pointerType: 'touch',
      isPrimary: true,
      buttons: 1,
      clientX: x - 60,
      clientY: y,
    });
    await waitForViewportEvents(page);

    await surface.dispatchEvent('pointercancel', {
      pointerId: 61,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: x - 60,
      clientY: y,
    });

    await settleTimeline(page);
    await expect
      .poll(async () => (await viewportEvents(page)).some((event) => event.committed))
      .toBeTruthy();
  });

  test('graph drag does not mutate the timeline viewport', async ({ page }, testInfo) => {
    const graphCanvas = page.locator('.temporal-graph-canvas');
    await expect(graphCanvas).toBeVisible();
    const box = await graphCanvas.boundingBox();
    if (!box) throw new Error('Graph canvas has no bounding box.');

    const startX = box.x + box.width * 0.7;
    const endX = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.5;
    await clearViewportEvents(page);

    if (testInfo.project.use.hasTouch) {
      const pointerId = 81;
      await graphCanvas.dispatchEvent('pointerdown', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: startX,
        clientY: y,
      });
      await graphCanvas.dispatchEvent('pointermove', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: endX,
        clientY: y,
      });
      await graphCanvas.dispatchEvent('pointerup', {
        pointerId,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: endX,
        clientY: y,
      });
    } else {
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y, { steps: 5 });
      await page.mouse.up();
    }

    expect(await viewportEvents(page)).toEqual([]);
  });
});
