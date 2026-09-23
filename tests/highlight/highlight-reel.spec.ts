import { expect, test } from '@playwright/test';
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
};

async function recordSegment(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
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
    duration: 550,
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
    await page.waitForTimeout(650);
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

test('records a branded Lūm E2E highlight reel source set', async ({ page }) => {
  test.setTimeout(90_000);
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
        name: '01-chronology',
        title: 'Chronology + relation graph',
        description: 'Real Chromium rendering the retained timeline and synchronized graph.',
      },
      async () => {
        await page.locator('#timeline-view-controls-toggle').click();
        await expect(page.locator('#timeline-view-toolbar:popover-open')).toBeVisible();
        await page.locator('#timeline-zoom-level').fill('68');
        await page.waitForTimeout(700);
        await page.keyboard.press('Escape');
        await page.locator('.timeline-surface').hover();
        await page.mouse.wheel(-240, 0);
        await page.waitForTimeout(700);
      },
    ),
  );

  segments.push(
    await recordSegment(
      page,
      {
        name: '02-focus',
        title: 'Focused occurrence',
        description: 'The detail sidebar preserves graph context while the timeline remains visible.',
      },
      async () => {
        const event = page
          .locator('.timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible')
          .first();
        await event.click();
        await expect(page.locator('#timeline-focus-view')).toBeVisible();
        await page.waitForTimeout(700);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(700);
      },
    ),
  );

  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  segments.push(
    await recordSegment(
      page,
      {
        name: '03-mobile',
        title: 'Mobile-first presentation',
        description: 'Portrait layout keeps the project dock, chronology, and controls inside the viewport.',
      },
      async () => {
        await expect(page.locator('.app-tool-dock')).toBeVisible();
        await page.locator('#project-menu-toggle').click();
        await expect(page.locator('#project-menu:popover-open')).toBeVisible();
        await page.waitForTimeout(700);
        await page.keyboard.press('Escape');
        await page.locator('#timeline-browser-toggle').click();
        await expect(page.locator('#timeline-browser-sheet')).toBeVisible();
        await page.waitForTimeout(700);
        await page.locator('#timeline-browser-close').click();
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
        segments,
      },
      null,
      2,
    ),
  );
});
