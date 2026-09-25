import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const CAPTURE_FPS = 60;
const MIN_CAPTURE_FPS = 59;

type FormFactor = "desktop" | "mobile";

type ShowcaseMediaMode = "motion" | "static";

type SceneIntent = {
  name: string;
  title: string;
  description: string;
  expectedState: string;
  altText: string;
  mediaMode: ShowcaseMediaMode;
};

type ShowcaseSegment = SceneIntent & {
  video: string | null;
  screenshot: string;
  motionStartSeconds: number | null;
  motionDurationSeconds: number | null;
  requestedFps: number | null;
  capturedFps: number | null;
};

type CapturedFrame = {
  data: Buffer;
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
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
    mediaMode: "motion",
  },
  {
    name: "02-focused-context",
    title: "Read an occurrence in context",
    description:
      "Open a focused occurrence without losing the surrounding chronology and relational context.",
    expectedState:
      "Focused occurrence detail is visible while chronology and relational context remain present.",
    altText: "Lūm focused occurrence context beside the retained chronology",
    mediaMode: "static",
  },
  {
    name: "03-evidence",
    title: "Inspect evidence",
    description: "Move from contextual reading to the occurrence evidence dossier and back.",
    expectedState: "The evidence tab shows at least one source card for the focused occurrence.",
    altText: "Lūm occurrence evidence dossier with source cards",
    mediaMode: "static",
  },
  {
    name: "04-relation-graph",
    title: "Explore relationships",
    description: "Pan and zoom the relation graph without discarding timeline state.",
    expectedState: "The relation graph is rendered and accepts direct navigation gestures.",
    altText: "Lūm interactive relation graph coordinated with the timeline",
    mediaMode: "motion",
  },
  {
    name: "05-story-browser",
    title: "Browse narrative threads",
    description:
      "Open the story browser to inspect authored traversals through the same canonical continuum.",
    expectedState:
      "The browser exposes multiple story cards without replacing canonical chronology data.",
    altText: "Lūm story browser showing narrative threads through the continuum",
    mediaMode: "static",
  },
] as const;

const PROJECTS = {
  "Desktop Showcase": {
    formFactor: "desktop" as const,
    size: { width: 1440, height: 900 },
  },
  "Mobile Showcase": {
    formFactor: "mobile" as const,
    size: { width: 390, height: 844 },
  },
};

function projectSettings(testInfo: TestInfo) {
  const settings = PROJECTS[testInfo.project.name as keyof typeof PROJECTS];
  if (!settings) throw new Error(`Unexpected showcase project: ${testInfo.project.name}`);
  return settings;
}

function run(command: string, args: string[], cwd = process.cwd()) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "inherit", "inherit"],
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${String(code ?? signal)}`));
    });
  });
}

async function encodeCapturedFrames(
  rawDir: string,
  sceneName: string,
  videoPath: string,
  frames: CapturedFrame[],
  captureSize: { width: number; height: number },
) {
  if (frames.length < 2) {
    throw new Error(`${sceneName} produced too few browser-presented frames to certify cadence.`);
  }

  for (const frame of frames) {
    if (frame.viewportWidth !== captureSize.width || frame.viewportHeight !== captureSize.height) {
      throw new Error(
        `${sceneName} captured ${String(frame.viewportWidth)}x${String(frame.viewportHeight)} instead of ${String(captureSize.width)}x${String(captureSize.height)}.`,
      );
    }
  }

  const firstTimestamp = frames[0]?.timestamp;
  const lastTimestamp = frames.at(-1)?.timestamp;
  if (firstTimestamp === undefined || lastTimestamp === undefined) {
    throw new Error(`${sceneName} is missing browser frame timestamps.`);
  }
  const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`${sceneName} has an invalid browser-presented capture duration.`);
  }
  const capturedFps = (frames.length - 1) / durationSeconds;
  if (capturedFps < MIN_CAPTURE_FPS) {
    throw new Error(
      `${sceneName} delivered ${capturedFps.toFixed(2)} actual browser-presented fps; expected at least ${String(MIN_CAPTURE_FPS)} before encoding.`,
    );
  }

  const frameDir = path.join(rawDir, `.${sceneName}-frames`);
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });

  try {
    const concatLines = ["ffconcat version 1.0"];
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      if (!frame) continue;
      const name = `frame-${String(index).padStart(6, "0")}.jpg`;
      await writeFile(path.join(frameDir, name), frame.data);
      concatLines.push(`file '${name}'`);
      const next = frames[index + 1];
      if (next) {
        const deltaSeconds = (next.timestamp - frame.timestamp) / 1000;
        if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
          throw new Error(`${sceneName} contains non-monotonic browser frame timestamps.`);
        }
        concatLines.push(`duration ${deltaSeconds.toFixed(9)}`);
      }
    }

    await writeFile(path.join(frameDir, "frames.ffconcat"), `${concatLines.join("\n")}\n`);
    await run(
      process.env.FFMPEG_BIN ?? "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "frames.ffconcat",
        "-fps_mode",
        "vfr",
        "-an",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-cpu-used",
        "8",
        "-qmin",
        "0",
        "-qmax",
        "50",
        "-crf",
        "8",
        "-b:v",
        "12M",
        "-pix_fmt",
        "yuv420p",
        videoPath,
      ],
      frameDir,
    );
  } finally {
    await rm(frameDir, { recursive: true, force: true });
  }

  return { durationSeconds, capturedFps };
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
  captureSize: { width: number; height: number },
  scene: SceneIntent,
  body: () => Promise<void>,
): Promise<ShowcaseSegment> {
  const rawDir = path.join(OUTPUT_ROOT, "raw", formFactor);
  await mkdir(rawDir, { recursive: true });
  const videoPath = path.join(rawDir, `${scene.name}.webm`);
  const screenshotPath = path.join(rawDir, `${scene.name}.png`);

  let motionDurationSeconds: number | null = null;
  let capturedFps: number | null = null;

  if (scene.mediaMode === "motion") {
    const frames: CapturedFrame[] = [];
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
        duration: 900,
      });
      await page.screencast.start({
        quality: 92,
        size: captureSize,
        onFrame: ({ data, timestamp, viewportWidth, viewportHeight }) => {
          frames.push({
            data: Buffer.from(data),
            timestamp,
            viewportWidth,
            viewportHeight,
          });
        },
      });
      try {
        await body();
        await page.waitForTimeout(450);
        await page.screenshot({
          path: screenshotPath,
          animations: "disabled",
          scale: "css",
        });
      } finally {
        if (!page.isClosed()) await page.screencast.stop().catch(() => {});
      }

      const stats = await encodeCapturedFrames(rawDir, scene.name, videoPath, frames, captureSize);
      motionDurationSeconds = stats.durationSeconds;
      capturedFps = stats.capturedFps;
    } finally {
      await brand.dispose().catch(() => {});
      await actions.dispose().catch(() => {});
    }
  } else {
    await body();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
    });
  }

  return {
    ...scene,
    video: scene.mediaMode === "motion" ? path.relative(process.cwd(), videoPath) : null,
    screenshot: path.relative(process.cwd(), screenshotPath),
    motionStartSeconds: scene.mediaMode === "motion" ? 0 : null,
    motionDurationSeconds,
    requestedFps: scene.mediaMode === "motion" ? CAPTURE_FPS : null,
    capturedFps,
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
}

test("records source-native Lūm showcase media per form factor", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const settings = projectSettings(testInfo);

  const segments: ShowcaseSegment[] = [];
  for (const scene of SCENES) {
    await test.step(scene.title, async () => {
      await loadSample(page);
      segments.push(
        await recordSegment(page, settings.formFactor, settings.size, scene, async () => {
          if (settings.formFactor === "desktop") await desktopRoutine(page, scene.name);
          else await mobileRoutine(page, scene.name);
        }),
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
        captureViewport: settings.size,
        captureFps: CAPTURE_FPS,
        minimumCapturedFps: MIN_CAPTURE_FPS,
        transitionSeconds: 0.28,
        stillSeconds: 0.9,
        motionSceneCount: segments.filter((segment) => segment.mediaMode === "motion").length,
        staticSceneCount: segments.filter((segment) => segment.mediaMode === "static").length,
        segments,
      },
      null,
      2,
    ),
  );
});
