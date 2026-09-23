import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? 'artifacts/e2e-media');
const RAW_DIR = path.join(OUTPUT_ROOT, 'raw');
const REEL_SIZE = { width: 1440, height: 900 };

type ReelSegment = {
  name: string;
  title: string;
  description: string;
  video: string;
  screenshot: string;
  gifWidth?: number;
  markdownWidth?: number;
  gifStartSeconds?: number;
  gifDurationSeconds?: number;
};

async function recordSegment(
  page: Page,
  segment: Omit<ReelSegment, 'video' | 'screenshot'>,
  body: () => Promise<void>,
): Promise<ReelSegment> {
  const videoPath = path.join(RAW_DIR, `${segment.name}.webm`);
  const screenshotPath = path.join(RAW_DIR, `${segment.name}.png`);

  await page.screencast.start({
    path: videoPath,
    size: REEL_SIZE,
    quality: 92,
  });

  const actions = await page.screencast.showActions({
    position: 'top-right',
    duration: 500,
    fontSize: 18,
  });
  const brand = await page.screencast.showOverlay(`
    <div style="
      position:absolute;
      top:24px;
      left:24px;
      z-index:2147483647;
      display:flex;
      align-items:baseline;
      gap:10px;
      padding:9px 13px;
      border:1px solid rgba(255,255,255,.22);
      border-radius:999px;
      background:rgba(11,12,16,.76);
      color:white;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      backdrop-filter:blur(12px);
      box-shadow:0 8px 30px rgba(0,0,0,.2);
    ">
      <strong style="font-size:16px;letter-spacing:.06em">Lūm</strong>
      <span style="font-size:11px;opacity:.72;text-transform:uppercase;letter-spacing:.12em">
        E2E highlight
      </span>
    </div>
  `);

  try {
    await page.screencast.showChapter(segment.title, {
      description: segment.description,
      duration: 1_000,
    });
    await page.waitForTimeout(1_100);
    await body();
    await page.waitForTimeout(550);
    await page.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      scale: 'css',
    });
  } finally {
    await brand.dispose();
    await actions.dispose();
    await page.screencast.stop();
  }

  return {
    ...segment,
    video: path.relative(process.cwd(), videoPath),
    screenshot: path.relative(process.cwd(), screenshotPath),
  };
}

async function firstVisibleOccurrence(page: Page) {
  const occurrence = page
    .locator('.timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible')
    .first();
  await expect(occurrence).toBeVisible();
  return occurrence;
}

test('records five branded Lūm showcase loops from the real browser', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(RAW_DIR, { recursive: true });

  await page.goto('/');
  await page.locator('#project-menu-toggle').click();
  await page.locator('#load-sample').click();
  await expect
    .poll(async () =>
      page.locator('.timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible').count(),
    )
    .toBeGreaterThan(2);

  const segments: ReelSegment[] = [];

  segments.push(
    await recordSegment(
      page,
      {
        name: '01-timeline-navigation',
        title: 'Navigate the continuum',
        description: 'Zoom and pan the retained chronology while the relation graph stays synchronized.',
        gifWidth: 760,
        markdownWidth: 760,
        gifStartSeconds: 1.05,
        gifDurationSeconds: 4.8,
      },
      async () => {
        const controlsToggle = page.locator('#timeline-view-controls-toggle');
        const surface = page.locator('.timeline-surface');
        await controlsToggle.click();
        const toolbar = page.locator('#timeline-view-toolbar:popover-open');
        await expect(toolbar).toBeVisible();
        const zoom = toolbar.locator('#timeline-zoom-level');
        const initialZoom = await zoom.inputValue();

        await zoom.fill('58');
        await page.waitForTimeout(650);
        await zoom.fill(initialZoom);
        await page.waitForTimeout(550);
        await page.keyboard.press('Escape');

        await surface.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(400);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(450);
      },
    ),
  );

  segments.push(
    await recordSegment(
      page,
      {
        name: '02-focused-context',
        title: 'Read an occurrence in context',
        description: 'Focused detail occupies the sidebar without hiding the graph or chronology.',
        gifWidth: 760,
        markdownWidth: 760,
        gifStartSeconds: 1.05,
        gifDurationSeconds: 4.8,
      },
      async () => {
        await (await firstVisibleOccurrence(page)).click();
        const focus = page.locator('#timeline-focus-view');
        await expect(focus).toBeVisible();
        await page.waitForTimeout(650);

        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(600);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(600);

        await focus.locator('.timeline-focus-close').click();
        await expect(focus).toBeHidden();
        await page.waitForTimeout(400);
      },
    ),
  );

  segments.push(
    await recordSegment(
      page,
      {
        name: '03-evidence',
        title: 'Inspect evidence without leaving the event',
        description: 'Switch from contextual reading to the dedicated evidence dossier and back.',
        gifWidth: 760,
        markdownWidth: 760,
        gifStartSeconds: 1.05,
        gifDurationSeconds: 4.8,
      },
      async () => {
        await (await firstVisibleOccurrence(page)).click();
        const focus = page.locator('#timeline-focus-view');
        await expect(focus).toBeVisible();

        const evidenceTab = focus.getByRole('tab', { name: 'Evidence' });
        const overviewTab = focus.getByRole('tab', { name: 'Overview' });
        await evidenceTab.click();
        await expect(page.locator('#timeline-focus-evidence-panel')).toBeVisible();
        await expect(page.locator('.timeline-focus-evidence-card').first()).toBeVisible();
        await page.waitForTimeout(850);

        await overviewTab.click();
        await expect(page.locator('#timeline-focus-context-panel')).toBeVisible();
        await page.waitForTimeout(550);
        await focus.locator('.timeline-focus-close').click();
        await expect(focus).toBeHidden();
      },
    ),
  );

  segments.push(
    await recordSegment(
      page,
      {
        name: '04-relation-graph',
        title: 'Explore the relation graph',
        description: 'Pan, zoom, and recenter the graph independently while timeline state remains intact.',
        gifWidth: 760,
        markdownWidth: 760,
        gifStartSeconds: 1.05,
        gifDurationSeconds: 4.8,
      },
      async () => {
        const graph = page.locator('.temporal-graph-canvas');
        await expect(graph).toBeVisible();
        await graph.focus();
        await page.keyboard.press('Home');
        await page.waitForTimeout(450);
        await page.keyboard.press('+');
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(450);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(450);
        await page.keyboard.press('-');
        await page.waitForTimeout(450);
        await page.keyboard.press('Home');
        await page.waitForTimeout(450);
      },
    ),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  segments.push(
    await recordSegment(
      page,
      {
        name: '05-mobile',
        title: 'Use the full product on mobile',
        description: 'Portrait composition keeps project actions, browsing, chronology, and graph reachable.',
        gifWidth: 320,
        markdownWidth: 320,
        gifStartSeconds: 1.05,
        gifDurationSeconds: 5.2,
      },
      async () => {
        const projectToggle = page.locator('#project-menu-toggle');
        const browseToggle = page.locator('#timeline-browser-toggle');
        const viewToggle = page.locator('#timeline-view-controls-toggle');

        await expect(page.locator('.app-tool-dock')).toBeVisible();

        await projectToggle.click();
        await expect(page.locator('#project-menu:popover-open')).toBeVisible();
        await page.waitForTimeout(550);
        await page.keyboard.press('Escape');

        await browseToggle.click();
        await expect(page.locator('#timeline-browser-sheet')).toBeVisible();
        await page.waitForTimeout(600);
        await page.locator('#timeline-browser-close').click();

        await viewToggle.click();
        await expect(page.locator('#timeline-view-toolbar:popover-open')).toBeVisible();
        await page.waitForTimeout(550);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
      },
    ),
  );

  await writeFile(
    path.join(OUTPUT_ROOT, 'manifest.json'),
    JSON.stringify(
      {
        project: 'Lūm',
        generatedAt: new Date().toISOString(),
        width: REEL_SIZE.width,
        height: REEL_SIZE.height,
        fps: 30,
        transitionSeconds: 0.28,
        stillSeconds: 1.1,
        gifFps: 10,
        gifColors: 96,
        segments,
      },
      null,
      2,
    ),
  );
});
