import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

const OUTPUT_ROOT = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const CAPTURE_FPS = 60;
const MIN_CAPTURE_FPS = CAPTURE_FPS - 1;

type FormFactor = "desktop" | "mobile";

type CapturedFrame = {
  data: Buffer;
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
};

type BrowserCaptureResult = {
  base64: string;
  mimeType: string;
  bytes: number;
  timestamps: number[];
  trackSettings: {
    width: number | null;
    height: number | null;
    frameRate: number | null;
    displaySurface: string | null;
  };
};

type CaptureStats = {
  requestedFps: number;
  minimumFps: number;
  capturedFrames: number;
  capturedDurationSeconds: number;
  measuredFps: number;
  mimeType: string;
  bytes: number;
  trackSettings: BrowserCaptureResult["trackSettings"];
  timestamps: number[];
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

async function startTabCapture(
  page: Page,
  captureSize: { width: number; height: number },
) {
  const buttonId = "showcase-capture-start";

  await page.evaluate(
    ({ buttonId, width, height, fps }) => {
      type CaptureState = {
        ready: boolean;
        error: string | null;
        stream: MediaStream | null;
        recorder: MediaRecorder | null;
        chunks: Blob[];
        timestamps: number[];
        video: HTMLVideoElement | null;
        frameCallbackId: number;
        recording: boolean;
        mimeType: string;
        trackSettings: {
          width: number | null;
          height: number | null;
          frameRate: number | null;
          displaySurface: string | null;
        };
      };

      const state: CaptureState = {
        ready: false,
        error: null,
        stream: null,
        recorder: null,
        chunks: [],
        timestamps: [],
        video: null,
        frameCallbackId: 0,
        recording: false,
        mimeType: "",
        trackSettings: {
          width: null,
          height: null,
          frameRate: null,
          displaySurface: null,
        },
      };
      Reflect.set(globalThis, "__lumShowcaseCapture", state);

      const button = document.createElement("button");
      button.id = buttonId;
      button.type = "button";
      button.setAttribute("aria-hidden", "true");
      Object.assign(button.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "1px",
        height: "1px",
        opacity: "0",
        zIndex: "2147483647",
      });

      button.addEventListener(
        "click",
        () => {
          void (async () => {
            try {
              const displayMediaOptions: DisplayMediaStreamOptions & {
                preferCurrentTab?: boolean;
                selfBrowserSurface?: "include" | "exclude";
              } = {
                video: {
                  displaySurface: "browser",
                  width: { ideal: width, max: width },
                  height: { ideal: height, max: height },
                  frameRate: { ideal: fps, max: fps },
                },
                audio: false,
                preferCurrentTab: true,
                selfBrowserSurface: "include",
              };
              const stream =
                await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
              const track = stream.getVideoTracks()[0];
              if (!track) throw new Error("Current-tab capture returned no video track");

              await track.applyConstraints({
                width: { ideal: width, max: width },
                height: { ideal: height, max: height },
                frameRate: { ideal: fps, max: fps },
              });

              const settings = track.getSettings();
              const video = document.createElement("video");
              video.muted = true;
              video.playsInline = true;
              video.srcObject = stream;
              Object.assign(video.style, {
                position: "fixed",
                left: "-2px",
                top: "-2px",
                width: "1px",
                height: "1px",
                opacity: "0",
                pointerEvents: "none",
              });
              document.body.append(video);
              await video.play();

              const mimeType = [
                "video/webm;codecs=vp8",
                "video/webm;codecs=vp9",
                "video/webm",
              ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
              if (!mimeType) throw new Error("Chromium exposes no supported WebM MediaRecorder codec");

              const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: width >= 1000 ? 16_000_000 : 8_000_000,
              });
              recorder.addEventListener("dataavailable", (event) => {
                if (event.data.size > 0) state.chunks.push(event.data);
              });

              state.stream = stream;
              state.recorder = recorder;
              state.video = video;
              state.mimeType = mimeType;
              state.trackSettings = {
                width: settings.width ?? null,
                height: settings.height ?? null,
                frameRate: settings.frameRate ?? null,
                displaySurface:
                  typeof Reflect.get(settings, "displaySurface") === "string"
                    ? String(Reflect.get(settings, "displaySurface"))
                    : null,
              };
              state.recording = true;

              const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
                if (state.recording) {
                  const last = state.timestamps.at(-1);
                  if (last === undefined || metadata.mediaTime > last) {
                    state.timestamps.push(metadata.mediaTime);
                  }
                }
                state.frameCallbackId = video.requestVideoFrameCallback(onFrame);
              };
              state.frameCallbackId = video.requestVideoFrameCallback(onFrame);
              recorder.start();
              state.ready = true;
            } catch (error) {
              state.error = error instanceof Error ? error.message : String(error);
            }
          })();
        },
        { once: true },
      );
      document.body.append(button);
    },
    {
      buttonId,
      width: captureSize.width,
      height: captureSize.height,
      fps: CAPTURE_FPS,
    },
  );

  await page.locator(`#${buttonId}`).click({ force: true });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = Reflect.get(globalThis, "__lumShowcaseCapture") as
          | { ready: boolean; error: string | null }
          | undefined;
        if (state?.error) return `error:${state.error}`;
        return state?.ready ? "ready" : "pending";
      }),
    )
    .toBe("ready");
  await page.locator(`#${buttonId}`).evaluate((element) => element.remove());
}

async function stopTabCapture(page: Page): Promise<BrowserCaptureResult> {
  return page.evaluate(async () => {
    type CaptureState = {
      stream: MediaStream;
      recorder: MediaRecorder;
      chunks: Blob[];
      timestamps: number[];
      video: HTMLVideoElement;
      frameCallbackId: number;
      recording: boolean;
      mimeType: string;
      trackSettings: {
        width: number | null;
        height: number | null;
        frameRate: number | null;
        displaySurface: string | null;
      };
    };

    const state = Reflect.get(globalThis, "__lumShowcaseCapture") as CaptureState | undefined;
    if (!state?.recorder || !state.stream || !state.video) {
      throw new Error("Current-tab showcase capture is not active");
    }

    state.recording = false;
    if (state.frameCallbackId) state.video.cancelVideoFrameCallback(state.frameCallbackId);

    if (state.recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        state.recorder.addEventListener("stop", () => resolve(), { once: true });
        state.recorder.stop();
      });
    }

    for (const track of state.stream.getTracks()) track.stop();
    state.video.remove();

    const blob = new Blob(state.chunks, { type: state.mimeType });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => resolve(typeof reader.result === "string" ? reader.result : ""),
        { once: true },
      );
      reader.addEventListener("error", () => reject(reader.error), { once: true });
      reader.readAsDataURL(blob);
    });
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("Could not serialize current-tab WebM capture");

    Reflect.deleteProperty(globalThis, "__lumShowcaseCapture");
    return {
      base64: dataUrl.slice(comma + 1),
      mimeType: state.mimeType,
      bytes: blob.size,
      timestamps: state.timestamps,
      trackSettings: state.trackSettings,
    };
  });
}

function measureCapturedFrames(timestamps: number[]) {
  if (timestamps.length < 2) {
    throw new Error("Showcase motion capture produced fewer than two frames");
  }
  const firstTimestamp = timestamps[0];
  const lastTimestamp = timestamps.at(-1);
  if (
    firstTimestamp === undefined ||
    lastTimestamp === undefined ||
    !Number.isFinite(firstTimestamp) ||
    !Number.isFinite(lastTimestamp)
  ) {
    throw new Error("Showcase motion capture did not provide usable media timestamps");
  }
  const durationSeconds = lastTimestamp - firstTimestamp;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Showcase motion capture duration is invalid");
  }
  const measuredFps = (timestamps.length - 1) / durationSeconds;
  if (measuredFps < MIN_CAPTURE_FPS) {
    throw new Error(
      `Showcase captured ${String(timestamps.length)} actual current-tab frames across ${durationSeconds.toFixed(3)}s (${measuredFps.toFixed(2)} fps); expected at least ${MIN_CAPTURE_FPS.toFixed(2)} fps before publication encoding.`,
    );
  }
  return { durationSeconds, measuredFps };
}

async function persistMeasuredCapture(videoPath: string, capture: BrowserCaptureResult) {
  if (!capture.mimeType.toLowerCase().includes("vp8")) {
    throw new Error(`Showcase raw capture must prefer VP8, received ${capture.mimeType}`);
  }
  const measured = measureCapturedFrames(capture.timestamps);
  const raw = Buffer.from(capture.base64, "base64");
  if (raw.byteLength === 0 || raw.byteLength !== capture.bytes) {
    throw new Error("Showcase raw WebM serialization produced an invalid byte count");
  }

  await writeFile(videoPath, raw);
  const stats: CaptureStats = {
    requestedFps: CAPTURE_FPS,
    minimumFps: MIN_CAPTURE_FPS,
    capturedFrames: capture.timestamps.length,
    capturedDurationSeconds: measured.durationSeconds,
    measuredFps: measured.measuredFps,
    mimeType: capture.mimeType,
    bytes: raw.byteLength,
    trackSettings: capture.trackSettings,
    timestamps: capture.timestamps,
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
    await startTabCapture(page, captureSize);

    let capture: BrowserCaptureResult | null = null;
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
      if (!page.isClosed()) capture = await stopTabCapture(page);
      await brand.dispose().catch(() => {});
      await actions.dispose().catch(() => {});
    }

    if (!capture) throw new Error("Showcase current-tab capture did not produce media");
    await persistMeasuredCapture(videoPath, capture);
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
        minimumMeasuredCaptureFps: MIN_CAPTURE_FPS,
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
