import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");

type FormFactor = "desktop" | "mobile";

type SceneIntent = {
  name: string;
  title: string;
  description: string;
  expectedState: string;
  altText: string;
};

type ShowcaseSegment = SceneIntent & {
  video: string;
  screenshot: string;
  gifWidth: number;
  markdownWidth: number;
  gifStartSeconds: number;
  gifDurationSeconds: number;
};

const SCENES: readonly SceneIntent[] = [
  {
    name: "01-timeline-navigation",
    title: "Navigate the continuum",
    description:
      "Zoom and pan the retained chronology while the relational projection stays synchronized.",
    expectedState:
      "The retained timeline is visible and interactive with synchronized relational context.",
    altText: "Lūm chronology navigation with synchronized relational context",
  },
  {
    name: "02-focused-context",
    title: "Read an occurrence in context",
    description:
      "Open a focused occurrence without losing the surrounding chronology and relational context.",
    expectedState:
      "Focused occurrence detail is visible while chronology and relational context remain present.",
    altText: "Lūm focused occurrence context beside the retained chronology",
  },
  {
    name: "03-evidence",
    title: "Inspect evidence",
    description: "Move from contextual reading to the occurrence evidence dossier and back.",
    expectedState: "The evidence tab shows at least one source card for the focused occurrence.",
    altText: "Lūm occurrence evidence dossier with source cards",
  },
  {
    name: "04-relation-graph",
    title: "Explore relationships",
    description: "Pan and zoom the relation graph without discarding timeline state.",
    expectedState: "The relation graph is rendered and accepts direct navigation gestures.",
    altText: "Lūm interactive relation graph coordinated with the timeline",
  },
  {
    name: "05-story-browser",
    title: "Browse narrative threads",
    description:
      "Open the story browser to inspect authored traversals through the same canonical continuum.",
    expectedState:
      "The browser exposes multiple story cards without replacing canonical chronology data.",
    altText: "Lūm story browser showing narrative threads through the continuum",
  },
] as const;

const PROJECTS = {
  "Desktop Showcase": {
    formFactor: "desktop" as const,
    size: { width: 1440, height: 900 },
    gifWidth: 760,
    markdownWidth: 760,
  },
  "Mobile Showcase": {
    formFactor: "mobile" as const,
    size: { width: 390, height: 844 },
    gifWidth: 320,
    markdownWidth: 320,
  },
};

function projectSettings(testInfo: TestInfo) {
  const settings = PROJECTS[testInfo.project.name as keyof typeof PROJECTS];
  if (!settings) throw new Error(`Unexpected showcase project: ${testInfo.project.name}`);
  return settings;
}

async function loadSample(page: Page) {
  await page.goto("/");
  await page.locator("#project-menu-toggle").click();
  await page.locator("#load-sample").click();
  await expect
    .poll(async () => page.locator(".timeline-event .timeline-event-terminal:visible").count())
    .toBeGreaterThan(0);
}

async function firstVisibleOccurrence(page: Page) {
  const occurrence = page
    .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
    .first();
  await expect(occurrence).toBeVisible();
  return occurrence;
}

async function touchDrag(target: Locator, deltaX: number, deltaY: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Touch target has no layout box");
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const end = { x: start.x + deltaX, y: start.y + deltaY };

  await target.dispatchEvent("pointerdown", {
    pointerId: 51,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: start.x,
    clientY: start.y,
  });
  await target.page().waitForTimeout(120);
  await target.dispatchEvent("pointermove", {
    pointerId: 51,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: end.x,
    clientY: end.y,
  });
  await target.page().waitForTimeout(180);
  await target.dispatchEvent("pointerup", {
    pointerId: 51,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 0,
    clientX: end.x,
    clientY: end.y,
  });
}

async function recordSegment(
  page: Page,
  formFactor: FormFactor,
  scene: SceneIntent,
  size: { width: number; height: number },
  gifWidth: number,
  markdownWidth: number,
  body: () => Promise<void>,
): Promise<ShowcaseSegment> {
  const rawDir = path.join(OUTPUT_ROOT, "raw", formFactor);
  await mkdir(rawDir, { recursive: true });
  const videoPath = path.join(rawDir, `${scene.name}.webm`);
  const screenshotPath = path.join(rawDir, `${scene.name}.png`);

  await page.screencast.start({ path: videoPath, size, quality: 92 });
  const actions = await page.screencast.showActions({
    position: formFactor === "mobile" ? "bottom-right" : "top-right",
    duration: 500,
    fontSize: formFactor === "mobile" ? 13 : 18,
  });
  const brand = await page.screencast.showOverlay(`
    <div style="
      position:absolute;
      top:18px;
      left:18px;
      z-index:2147483647;
      display:flex;
      align-items:baseline;
      gap:9px;
      padding:8px 12px;
      border:1px solid rgba(255,255,255,.22);
      border-radius:999px;
      background:rgba(11,12,16,.76);
      color:white;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      backdrop-filter:blur(12px);
      box-shadow:0 8px 30px rgba(0,0,0,.2);
      pointer-events:none;
    ">
      <strong style="font-size:15px;letter-spacing:.06em">Lūm</strong>
      <span style="font-size:10px;opacity:.72;text-transform:uppercase;letter-spacing:.12em">
        ${formFactor}
      </span>
    </div>
  `);

  try {
    await page.screencast.showChapter(scene.title, {
      description: scene.description,
      duration: 1_000,
    });
    await page.waitForTimeout(1_100);
    await body();
    await page.waitForTimeout(450);
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
    });
  } finally {
    await brand.dispose().catch(() => {});
    await actions.dispose().catch(() => {});
    if (!page.isClosed()) await page.screencast.stop().catch(() => {});
  }

  return {
    ...scene,
    video: path.relative(process.cwd(), videoPath),
    screenshot: path.relative(process.cwd(), screenshotPath),
    gifWidth,
    markdownWidth,
    gifStartSeconds: 1.05,
    gifDurationSeconds: formFactor === "mobile" ? 5.2 : 4.8,
  };
}

async function desktopRoutine(page: Page, sceneName: string) {
  if (sceneName === "01-timeline-navigation") {
    const surface = page.locator(".timeline-surface");
    await expect(surface).toBeVisible();
    const controls = page.locator("#timeline-view-controls-toggle");
    await controls.click();
    const toolbar = page.locator("#timeline-view-toolbar:popover-open");
    await expect(toolbar).toBeVisible();
    const zoom = toolbar.locator("#timeline-zoom-level");
    const initialZoom = await zoom.inputValue();
    await page.keyboard.press("Escape");

    await surface.hover();
    await page.mouse.wheel(0, -280);
    await page.waitForTimeout(450);
    await controls.click();
    await expect(toolbar).toBeVisible();
    await zoom.fill(initialZoom);
    await page.keyboard.press("Escape");
    await surface.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.press("ArrowLeft");
    return;
  }

  if (sceneName === "02-focused-context") {
    await (await firstVisibleOccurrence(page)).click();
    const focus = page.locator("#timeline-focus-view");
    await expect(focus).toBeVisible();
    await expect(page.locator("#timeline-focus-context-panel")).toBeVisible();
    await page.waitForTimeout(700);
    await focus.locator(".timeline-focus-close").click();
    await expect(focus).toBeHidden();
    return;
  }

  if (sceneName === "03-evidence") {
    await (await firstVisibleOccurrence(page)).click();
    const focus = page.locator("#timeline-focus-view");
    await expect(focus).toBeVisible();
    await focus.getByRole("tab", { name: "Evidence" }).click();
    await expect(page.locator("#timeline-focus-evidence-panel")).toBeVisible();
    await expect(page.locator(".timeline-focus-evidence-card").first()).toBeVisible();
    await page.waitForTimeout(700);
    await focus.getByRole("tab", { name: "Overview" }).click();
    await expect(page.locator("#timeline-focus-context-panel")).toBeVisible();
    await focus.locator(".timeline-focus-close").click();
    return;
  }

  if (sceneName === "04-relation-graph") {
    const graph = page.locator(".temporal-graph-canvas");
    await expect(graph).toBeVisible();
    await graph.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("+");
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("-");
    await page.keyboard.press("Home");
    return;
  }

  const browseToggle = page.locator("#timeline-browser-toggle");
  await browseToggle.click();
  const browser = page.locator("#timeline-browser-sheet");
  await expect(browser).toBeVisible();
  const storyCards = browser.locator(".browser-story-card");
  await expect(storyCards.first()).toBeVisible();
  expect(await storyCards.count()).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(650);
  await page.locator("#timeline-browser-close").click();
  await expect(browser).toBeHidden();
}

async function mobileRoutine(page: Page, sceneName: string) {
  if (sceneName === "01-timeline-navigation") {
    const surface = page.locator(".timeline-surface");
    await expect(surface).toBeVisible();
    await touchDrag(surface, -48, 0);
    await page.waitForTimeout(350);
    await touchDrag(surface, 48, 0);
    await page.locator("#timeline-view-controls-toggle").tap();
    await expect(page.locator("#timeline-view-toolbar:popover-open")).toBeVisible();
    await page.keyboard.press("Escape");
    return;
  }

  if (sceneName === "02-focused-context") {
    await (await firstVisibleOccurrence(page)).tap();
    const focus = page.locator("#timeline-focus-view");
    await expect(focus).toBeVisible();
    await expect(page.locator("#timeline-focus-context-panel")).toBeVisible();
    await page.waitForTimeout(700);
    await focus.locator(".timeline-focus-close").tap();
    await expect(focus).toBeHidden();
    return;
  }

  if (sceneName === "03-evidence") {
    await (await firstVisibleOccurrence(page)).tap();
    const focus = page.locator("#timeline-focus-view");
    await expect(focus).toBeVisible();
    await focus.getByRole("tab", { name: "Evidence" }).tap();
    await expect(page.locator("#timeline-focus-evidence-panel")).toBeVisible();
    await expect(page.locator(".timeline-focus-evidence-card").first()).toBeVisible();
    await page.waitForTimeout(700);
    await focus.getByRole("tab", { name: "Overview" }).tap();
    await focus.locator(".timeline-focus-close").tap();
    return;
  }

  if (sceneName === "04-relation-graph") {
    const graph = page.locator(".temporal-graph-canvas");
    await expect(graph).toBeVisible();
    await touchDrag(graph, -42, 18);
    await page.waitForTimeout(400);
    await touchDrag(graph, 42, -18);
    return;
  }

  await page.locator("#timeline-browser-toggle").tap();
  const browser = page.locator("#timeline-browser-sheet");
  await expect(browser).toBeVisible();
  const storyCards = browser.locator(".browser-story-card");
  await expect(storyCards.first()).toBeVisible();
  expect(await storyCards.count()).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(650);
  await page.locator("#timeline-browser-close").tap();
  await expect(browser).toBeHidden();
}

test("records five loop-safe Lūm showcase scenes per form factor", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const settings = projectSettings(testInfo);

  const segments: ShowcaseSegment[] = [];
  for (const scene of SCENES) {
    await test.step(scene.title, async () => {
      await loadSample(page);
      segments.push(
        await recordSegment(
          page,
          settings.formFactor,
          scene,
          settings.size,
          settings.gifWidth,
          settings.markdownWidth,
          async () => {
            if (settings.formFactor === "desktop") await desktopRoutine(page, scene.name);
            else await mobileRoutine(page, scene.name);
          },
        ),
      );
    });
  }

  expect(segments).toHaveLength(5);
  expect(segments.map((segment) => segment.name)).toEqual(SCENES.map((scene) => scene.name));

  const rawDir = path.join(OUTPUT_ROOT, "raw", settings.formFactor);
  await writeFile(
    path.join(rawDir, "manifest.json"),
    JSON.stringify(
      {
        project: "Lūm",
        formFactor: settings.formFactor,
        generatedAt: new Date().toISOString(),
        width: settings.size.width,
        height: settings.size.height,
        fps: 30,
        transitionSeconds: 0.28,
        stillSeconds: 0.9,
        gifFps: 10,
        gifColors: 96,
        segments,
      },
      null,
      2,
    ),
  );
});
