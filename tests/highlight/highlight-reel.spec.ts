import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const SHOWCASE_FPS = 60;
const MIN_CAPTURE_FPS = 59;
const MIN_CAPTURE_COVERAGE = 0.95;

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
  capture: {
    targetFps: number;
    measuredFps: number;
    frameCount: number;
    durationSeconds: number;
    recordingWindowSeconds: number;
    frameTimestampsMs: number[];
    method: "ffmpeg-x11grab-rawvideo-nut";
    browserFrameClockFps: number;
  } | null;
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

function measureFrameCadence(timestamps: readonly number[]) {
  if (timestamps.length < 2) {
    throw new Error("At least two source-frame timestamps are required.");
  }
  const first = timestamps[0];
  const last = timestamps.at(-1);
  if (first === undefined || last === undefined || last <= first) {
    throw new Error("Source-frame timestamps do not describe a positive recording window.");
  }
  const durationSeconds = (last - first) / 1_000;
  return {
    durationSeconds,
    fps: (timestamps.length - 1) / durationSeconds,
  };
}

async function startCaptureHeartbeat(page: Page) {
  await page.evaluate(() => {
    document.querySelector("#lum-showcase-capture-heartbeat")?.remove();
    const heartbeat = document.createElement("div");
    heartbeat.id = "lum-showcase-capture-heartbeat";
    heartbeat.setAttribute("aria-hidden", "true");
    Object.assign(heartbeat.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      opacity: "0.01",
      pointerEvents: "none",
      zIndex: "2147483647",
      willChange: "transform",
    });
    heartbeat.dataset.frames = "0";
    heartbeat.dataset.startedAt = String(performance.now());
    document.documentElement.append(heartbeat);

    const tick = () => {
      const frame = Number(heartbeat.dataset.frames ?? "0") + 1;
      heartbeat.dataset.frames = String(frame);
      heartbeat.style.transform = `translate3d(${String(frame % 2)}px, 0, 0)`;
      heartbeat.dataset.rafId = String(requestAnimationFrame(tick));
    };
    heartbeat.dataset.rafId = String(requestAnimationFrame(tick));
  });
}

async function stopCaptureHeartbeat(page: Page) {
  return page.evaluate(() => {
    const heartbeat = document.querySelector<HTMLElement>("#lum-showcase-capture-heartbeat");
    if (!heartbeat) return { frames: 0, durationMs: 0, fps: 0 };

    const rafId = Number(heartbeat.dataset.rafId);
    if (Number.isFinite(rafId)) cancelAnimationFrame(rafId);
    const frames = Number(heartbeat.dataset.frames ?? "0");
    const startedAt = Number(heartbeat.dataset.startedAt ?? performance.now());
    const durationMs = Math.max(0, performance.now() - startedAt);
    heartbeat.remove();
    return {
      frames,
      durationMs,
      fps: durationMs > 0 ? (frames * 1_000) / durationMs : 0,
    };
  });
}

type X11Capture = {
  child: ReturnType<typeof spawn>;
  exited: Promise<void>;
};

function capture(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });
    let stdout = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with ${String(code ?? signal)}`));
    });
  });
}

async function startX11Capture(
  sourcePath: string,
  captureSize: { width: number; height: number },
): Promise<X11Capture> {
  const display = process.env.DISPLAY;
  if (!display) throw new Error("DISPLAY is required for the showcase framebuffer recorder.");

  const child = spawn(
    process.env.FFMPEG_BIN ?? "ffmpeg",
    [
      "-y",
      "-f",
      "x11grab",
      "-draw_mouse",
      "0",
      "-framerate",
      String(SHOWCASE_FPS),
      "-video_size",
      `${String(captureSize.width)}x${String(captureSize.height)}`,
      "-i",
      `${display}+0,0`,
      "-an",
      "-pix_fmt",
      "bgr24",
      "-c:v",
      "rawvideo",
      "-fps_mode",
      "passthrough",
      "-f",
      "nut",
      sourcePath,
    ],
    {
      stdio: ["pipe", "inherit", "inherit"],
      env: process.env,
    },
  );

  const exited = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0 || signal === "SIGINT") resolve();
      else reject(new Error(`ffmpeg exited with ${String(code ?? signal)}`));
    });
  });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", () => resolve());
    child.once("error", reject);
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  return { child, exited };
}

async function stopX11Capture(captureState: X11Capture) {
  if (captureState.child.exitCode === null && !captureState.child.killed) {
    captureState.child.stdin?.write("q\n");
  }
  await captureState.exited;
}

async function probeDecodedFrameTimestamps(videoPath: string) {
  const stdout = await capture(process.env.FFPROBE_BIN ?? "ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_frames",
    "-show_entries",
    "frame=best_effort_timestamp_time",
    "-of",
    "csv=p=0",
    videoPath,
  ]);
  const timestamps = stdout
    .split(/\r?\n/u)
    .map((value) => Number.parseFloat(value.trim()))
    .filter(Number.isFinite)
    .map((value) => value * 1_000);
  if (timestamps.length < 2) {
    throw new Error(`Unable to decode source frame timestamps from ${videoPath}.`);
  }
  return timestamps;
}

async function encodeSourceCapture(
  sourcePath: string,
  videoPath: string,
  captureSize: { width: number; height: number },
) {
  const bitrate = captureSize.width >= 1_000 ? "20M" : "8M";
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.env.FFMPEG_BIN ?? "ffmpeg",
      [
        "-y",
        "-i",
        sourcePath,
        "-an",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-cpu-used",
        "6",
        "-threads",
        "4",
        "-b:v",
        bitrate,
        "-crf",
        "10",
        "-lag-in-frames",
        "0",
        "-auto-alt-ref",
        "0",
        "-pix_fmt",
        "yuv420p",
        "-fps_mode",
        "passthrough",
        videoPath,
      ],
      {
        stdio: ["ignore", "inherit", "inherit"],
        env: process.env,
      },
    );
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${String(code ?? signal)}`));
    });
  });
}

async function installCaptureBrand(page: Page, formFactor: FormFactor) {
  await page.evaluate((factor) => {
    document.querySelector("#lum-showcase-capture-brand")?.remove();
    const brand = document.createElement("div");
    brand.id = "lum-showcase-capture-brand";
    brand.setAttribute("aria-hidden", "true");
    const strong = document.createElement("strong");
    strong.textContent = "Lūm";
    const label = document.createElement("span");
    label.textContent = factor;
    brand.append(strong, label);
    Object.assign(brand.style, {
      position: "fixed",
      top: "18px",
      left: "18px",
      zIndex: "2147483646",
      display: "flex",
      alignItems: "baseline",
      gap: "9px",
      padding: "8px 12px",
      border: "1px solid rgba(255,255,255,.22)",
      borderRadius: "999px",
      background: "rgba(11,12,16,.76)",
      color: "white",
      fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 30px rgba(0,0,0,.2)",
      pointerEvents: "none",
    });

    strong.style.fontSize = "15px";
    strong.style.letterSpacing = ".06em";
    label.style.fontSize = "10px";
    label.style.opacity = ".72";
    label.style.textTransform = "uppercase";
    label.style.letterSpacing = ".12em";
    document.documentElement.append(brand);
  }, formFactor);
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
  body: () => Promise<void>,
): Promise<ShowcaseSegment> {
  const rawDir = path.join(OUTPUT_ROOT, "raw", formFactor);
  await mkdir(rawDir, { recursive: true });
  const videoPath = path.join(rawDir, `${scene.name}.webm`);
  const sourcePath = `${videoPath}.source.nut`;
  const screenshotPath = path.join(rawDir, `${scene.name}.png`);
  const captureSize =
    formFactor === "desktop" ? PROJECTS["Desktop Showcase"].size : PROJECTS["Mobile Showcase"].size;
  let capture: ShowcaseSegment["capture"] = null;

  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  }));
  if (
    geometry.innerWidth !== captureSize.width ||
    geometry.innerHeight !== captureSize.height ||
    geometry.screenWidth !== captureSize.width ||
    geometry.screenHeight !== captureSize.height
  ) {
    throw new Error(
      `${formFactor}/${scene.name} capture surface is ${String(geometry.innerWidth)}x${String(geometry.innerHeight)} on a ${String(geometry.screenWidth)}x${String(geometry.screenHeight)} screen; expected ${String(captureSize.width)}x${String(captureSize.height)}.`,
    );
  }

  if (scene.mediaMode === "motion") {
    await installCaptureBrand(page, formFactor);
    await page.waitForTimeout(250);

    let screenCapture: X11Capture | null = null;
    try {
      await startCaptureHeartbeat(page);
      screenCapture = await startX11Capture(sourcePath, captureSize);
      const captureStartedAt = Date.now();

      await body();
      await page.waitForTimeout(450);
      const browserFrameClock = await stopCaptureHeartbeat(page);
      const captureStoppedAt = Date.now();
      await stopX11Capture(screenCapture);
      screenCapture = null;
      const frameTimestampsMs = await probeDecodedFrameTimestamps(sourcePath);
      const cadence = measureFrameCadence(frameTimestampsMs);
      const expectedDurationSeconds = (captureStoppedAt - captureStartedAt) / 1_000;
      const minimumDurationSeconds = expectedDurationSeconds * MIN_CAPTURE_COVERAGE;
      if (cadence.durationSeconds < minimumDurationSeconds) {
        throw new Error(
          `${formFactor}/${scene.name} framebuffer samples cover only ${cadence.durationSeconds.toFixed(3)}s of a ${expectedDurationSeconds.toFixed(3)}s recording window; expected at least ${minimumDurationSeconds.toFixed(3)}s.`,
        );
      }
      if (
        cadence.fps < MIN_CAPTURE_FPS ||
        !Number.isFinite(browserFrameClock.fps) ||
        browserFrameClock.fps < MIN_CAPTURE_FPS
      ) {
        throw new Error(
          `${formFactor}/${scene.name} measured ${cadence.fps.toFixed(2)} actual framebuffer fps and ${browserFrameClock.fps.toFixed(2)} browser fps; expected both to be at least ${MIN_CAPTURE_FPS}.`,
        );
      }

      await page.screenshot({
        path: screenshotPath,
        animations: "disabled",
        scale: "css",
        timeout: 30_000,
      });
      await encodeSourceCapture(sourcePath, videoPath, captureSize);

      capture = {
        targetFps: SHOWCASE_FPS,
        measuredFps: cadence.fps,
        frameCount: frameTimestampsMs.length,
        durationSeconds: cadence.durationSeconds,
        recordingWindowSeconds: expectedDurationSeconds,
        frameTimestampsMs,
        method: "ffmpeg-x11grab-rawvideo-nut",
        browserFrameClockFps: browserFrameClock.fps,
      };
    } finally {
      await stopCaptureHeartbeat(page).catch(() => {});
      if (screenCapture) await stopX11Capture(screenCapture).catch(() => {});
      await rm(sourcePath, { force: true }).catch(() => {});
      await page
        .evaluate(() => document.querySelector("#lum-showcase-capture-brand")?.remove())
        .catch(() => {});
    }
  } else {
    await body();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      scale: "css",
      timeout: 30_000,
    });
  }

  return {
    ...scene,
    video: scene.mediaMode === "motion" ? path.relative(process.cwd(), videoPath) : null,
    screenshot: path.relative(process.cwd(), screenshotPath),
    motionStartSeconds: scene.mediaMode === "motion" ? 0 : null,
    motionDurationSeconds:
      scene.mediaMode === "motion" && capture
        ? Math.max(2 / SHOWCASE_FPS, capture.durationSeconds)
        : null,
    capture,
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
        await recordSegment(page, settings.formFactor, scene, async () => {
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
        captureFps: SHOWCASE_FPS,
        minimumCapturedFps: MIN_CAPTURE_FPS,
        minimumCaptureCoverage: MIN_CAPTURE_COVERAGE,
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
