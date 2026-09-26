import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const CAPTURE_FPS = 60;
const MIN_CAPTURE_FPS = CAPTURE_FPS - 1;
const MAX_CAPTURE_FPS = CAPTURE_FPS + 1;
const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_BIN ?? "ffprobe";
const X11_DISPLAY_WIDTH = Number.parseInt(process.env.SHOWCASE_X11_WIDTH ?? "1920", 10);
const X11_DISPLAY_HEIGHT = Number.parseInt(process.env.SHOWCASE_X11_HEIGHT ?? "1080", 10);

type FormFactor = "desktop" | "mobile";

type CaptureGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  displayWidth: number;
  displayHeight: number;
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
};

type CaptureStats = {
  requestedFps: number;
  minimumFps: number;
  maximumFps: number;
  capturedFrames: number;
  capturedDurationSeconds: number;
  measuredFps: number;
  browserFrames: number;
  browserDurationSeconds: number;
  browserFps: number;
  capturedMaxIntervalSeconds: number;
  browserMaxIntervalSeconds: number;
  codec: "vp8";
  geometry: CaptureGeometry;
  timestamps: number[];
  browserTimestamps: number[];
};

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

function captureText(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`${command} exited with ${String(code ?? signal)}`));
    });
  });
}

async function probeFrameTimestamps(filePath: string) {
  const stdout = await captureText(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_frames",
    "-show_entries",
    "frame=best_effort_timestamp_time",
    "-of",
    "csv=p=0",
    filePath,
  ]);
  return stdout
    .split(/\r?\n/u)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
}

function measureTimestamps(timestamps: number[], scale = 1, label = "Showcase motion capture") {
  if (timestamps.length < 2) {
    throw new Error(`${label} produced fewer than two timing samples`);
  }
  const firstTimestamp = timestamps[0];
  const lastTimestamp = timestamps.at(-1);
  if (
    firstTimestamp === undefined ||
    lastTimestamp === undefined ||
    !Number.isFinite(firstTimestamp) ||
    !Number.isFinite(lastTimestamp)
  ) {
    throw new Error(`${label} did not provide usable timestamps`);
  }

  let maxIntervalSeconds = 0;
  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = timestamps[index - 1];
    const current = timestamps[index];
    if (previous === undefined || current === undefined || current <= previous) {
      throw new Error(
        `${label} contains a duplicated or non-increasing timestamp at frame ${String(index + 1)}`,
      );
    }
    maxIntervalSeconds = Math.max(maxIntervalSeconds, (current - previous) / scale);
  }

  const durationSeconds = (lastTimestamp - firstTimestamp) / scale;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`${label} duration is invalid`);
  }
  return {
    frames: timestamps.length,
    durationSeconds,
    fps: (timestamps.length - 1) / durationSeconds,
    maxIntervalSeconds,
  };
}

async function captureGeometry(
  page: Page,
  captureSize: { width: number; height: number },
): Promise<CaptureGeometry> {
  if (
    !Number.isInteger(X11_DISPLAY_WIDTH) ||
    !Number.isInteger(X11_DISPLAY_HEIGHT) ||
    X11_DISPLAY_WIDTH <= 0 ||
    X11_DISPLAY_HEIGHT <= 0
  ) {
    throw new Error("Showcase X11 display dimensions are invalid");
  }

  const browserGeometry = await page.evaluate(() => {
    const horizontalInset = Math.max(0, Math.round((window.outerWidth - window.innerWidth) / 2));
    const topInset = Math.max(
      0,
      Math.round(window.outerHeight - window.innerHeight - horizontalInset),
    );
    return {
      x: Math.round(window.screenX + horizontalInset),
      y: Math.round(window.screenY + topInset),
      width: window.innerWidth,
      height: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenX: window.screenX,
      screenY: window.screenY,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });
  const geometry: CaptureGeometry = {
    ...browserGeometry,
    displayWidth: X11_DISPLAY_WIDTH,
    displayHeight: X11_DISPLAY_HEIGHT,
  };

  if (geometry.innerWidth !== captureSize.width || geometry.innerHeight !== captureSize.height) {
    throw new Error(
      `Showcase viewport is ${String(geometry.innerWidth)}x${String(geometry.innerHeight)}; expected ${String(captureSize.width)}x${String(captureSize.height)}`,
    );
  }
  if (
    geometry.x < 0 ||
    geometry.y < 0 ||
    geometry.x + geometry.width > geometry.displayWidth ||
    geometry.y + geometry.height > geometry.displayHeight
  ) {
    throw new Error(
      `Showcase X11 capture region ${String(geometry.x)},${String(geometry.y)} ${String(geometry.width)}x${String(geometry.height)} exceeds physical ${String(geometry.displayWidth)}x${String(geometry.displayHeight)} display`,
    );
  }
  return geometry;
}

async function startBrowserFrameClock(page: Page) {
  await page.evaluate(() => {
    const state = {
      active: true,
      timestamps: [] as number[],
      frameId: 0,
    };
    Reflect.set(globalThis, "__lumShowcaseFrameClock", state);
    const tick = (timestamp: number) => {
      if (!state.active) return;
      state.timestamps.push(timestamp);
      state.frameId = requestAnimationFrame(tick);
    };
    state.frameId = requestAnimationFrame(tick);
  });
}

async function stopBrowserFrameClock(page: Page) {
  return page.evaluate(() => {
    const state = Reflect.get(globalThis, "__lumShowcaseFrameClock") as
      | { active: boolean; timestamps: number[]; frameId: number }
      | undefined;
    if (!state) return [];
    state.active = false;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    Reflect.deleteProperty(globalThis, "__lumShowcaseFrameClock");
    return state.timestamps;
  });
}

async function startX11Capture(videoPath: string, geometry: CaptureGeometry) {
  const display = process.env.DISPLAY;
  if (!display) throw new Error("DISPLAY is required for 60 fps X11 showcase capture");

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    "-f",
    "x11grab",
    "-framerate",
    String(CAPTURE_FPS),
    "-video_size",
    `${String(geometry.width)}x${String(geometry.height)}`,
    "-draw_mouse",
    "0",
    "-i",
    `${display}+${String(geometry.x)},${String(geometry.y)}`,
    "-an",
    "-c:v",
    "libvpx",
    "-deadline",
    "realtime",
    "-cpu-used",
    "8",
    "-threads",
    "4",
    "-crf",
    "12",
    "-b:v",
    "0",
    "-pix_fmt",
    "yuv420p",
    "-enc_time_base",
    "demux",
    "-fps_mode",
    "passthrough",
    videoPath,
  ];

  const child = spawn(FFMPEG, args, {
    stdio: ["pipe", "ignore", "inherit"],
    env: process.env,
  });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });

  const exit = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg X11 capture exited with ${String(code ?? signal)}`));
    });
  });

  return {
    async stop() {
      if (child.exitCode !== null) return exit;
      child.stdin.write("q\n");
      child.stdin.end();
      return exit;
    },
  };
}

async function persistMeasuredCapture(
  videoPath: string,
  browserTimestamps: number[],
  geometry: CaptureGeometry,
) {
  const timestamps = await probeFrameTimestamps(videoPath);
  const captured = measureTimestamps(timestamps, 1, "Showcase raw X11 WebM");
  if (captured.fps < MIN_CAPTURE_FPS || captured.fps > MAX_CAPTURE_FPS) {
    throw new Error(
      `Showcase raw X11 WebM decoded ${String(captured.frames)} actual frames across ${captured.durationSeconds.toFixed(3)}s (${captured.fps.toFixed(2)} fps); expected native ${MIN_CAPTURE_FPS.toFixed(2)}-${MAX_CAPTURE_FPS.toFixed(2)} fps before publication encoding.`,
    );
  }

  const browser = measureTimestamps(browserTimestamps, 1000, "Showcase browser animation clock");
  if (browser.fps < MIN_CAPTURE_FPS || browser.fps > MAX_CAPTURE_FPS) {
    throw new Error(
      `Showcase browser scheduled ${String(browser.frames)} animation frames across ${browser.durationSeconds.toFixed(3)}s (${browser.fps.toFixed(2)} fps); expected display-paced ${MIN_CAPTURE_FPS.toFixed(2)}-${MAX_CAPTURE_FPS.toFixed(2)} fps while recording.`,
    );
  }

  const stats: CaptureStats = {
    requestedFps: CAPTURE_FPS,
    minimumFps: MIN_CAPTURE_FPS,
    maximumFps: MAX_CAPTURE_FPS,
    capturedFrames: captured.frames,
    capturedDurationSeconds: captured.durationSeconds,
    measuredFps: captured.fps,
    browserFrames: browser.frames,
    browserDurationSeconds: browser.durationSeconds,
    browserFps: browser.fps,
    capturedMaxIntervalSeconds: captured.maxIntervalSeconds,
    browserMaxIntervalSeconds: browser.maxIntervalSeconds,
    codec: "vp8",
    geometry,
    timestamps,
    browserTimestamps,
  };
  await writeFile(`${videoPath}.frames.json`, JSON.stringify(stats, null, 2));
  return stats;
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

  if (scene.mediaMode === "motion") {
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

    const geometry = await captureGeometry(page, captureSize);
    await startBrowserFrameClock(page);
    const capture = await startX11Capture(videoPath, geometry);
    let browserTimestamps: number[] = [];

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
      if (!page.isClosed()) browserTimestamps = await stopBrowserFrameClock(page).catch(() => []);
      await capture.stop();
      await brand.dispose().catch(() => {});
      await actions.dispose().catch(() => {});
    }

    await persistMeasuredCapture(videoPath, browserTimestamps, geometry);
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
    motionStartSeconds: scene.mediaMode === "motion" ? 1.05 : null,
    motionDurationSeconds:
      scene.mediaMode === "motion" ? (formFactor === "mobile" ? 5.2 : 4.8) : null,
  };
}

async function desktopRoutine(page: Page, sceneName: string) {
  if (sceneName === "01-timeline-navigation") {
    const surface = page.locator(".timeline-surface");
    await expect(surface).toBeVisible();
    const toolbar = page.locator("#timeline-view-toolbar");
    await expect(toolbar).toBeVisible();
    const zoom = toolbar.locator("#timeline-zoom-level");
    const initialZoom = await zoom.inputValue();

    await surface.hover();
    await page.mouse.wheel(0, -280);
    await page.waitForTimeout(450);
    await expect(toolbar).toBeVisible();
    await zoom.fill(initialZoom);
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
    await expect(page.locator("#timeline-view-toolbar")).toBeVisible();
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
        minimumMeasuredCaptureFps: MIN_CAPTURE_FPS,
        maximumMeasuredCaptureFps: MAX_CAPTURE_FPS,
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
