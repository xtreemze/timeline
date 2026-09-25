import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const ffprobe = process.env.FFPROBE_BIN ?? "ffprobe";
const SHOWCASE_FPS = 60;
const MIN_CAPTURE_FPS = 59;
const ACTIVE_FRAME_GAP_MS = 100;
const MIN_ACTIVE_FRAME_INTERVALS = Math.ceil(SHOWCASE_FPS / 2);
const dimensions = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function probeVisual(filePath) {
  const result = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,avg_frame_rate,r_frame_rate,codec_name",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${filePath}: ${result.stderr}`);
  }
  const stream = JSON.parse(result.stdout).streams?.[0];
  if (!stream) throw new Error(`No video stream found in ${filePath}.`);
  return stream;
}

function frameRate(value) {
  if (typeof value !== "string" || value === "" || value === "0/0") return Number.NaN;
  const [numerator, denominator = "1"] = value.split("/");
  return Number(numerator) / Number(denominator);
}

function assertHighFrameRate(stream, label) {
  const rate = frameRate(stream.avg_frame_rate || stream.r_frame_rate);
  if (!Number.isFinite(rate) || rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${label} reports ${rate.toFixed(2)} fps; expected at least ${MIN_CAPTURE_FPS}.`,
    );
  }
}

function assertDimensions(stream, expected, label) {
  if (stream.width !== expected.width || stream.height !== expected.height) {
    throw new Error(
      `${label} is ${String(stream.width)}x${String(stream.height)}; expected ${expected.width}x${expected.height}.`,
    );
  }
}

function measureSourceCadence(segment, formFactor) {
  const capture = segment.capture;
  if (!capture || capture.targetFps !== SHOWCASE_FPS) {
    throw new Error(`${formFactor}/${segment.name} does not target ${SHOWCASE_FPS} fps.`);
  }
  const timestamps = capture.frameTimestampsMs;
  if (!Array.isArray(timestamps) || timestamps.length < 2) {
    throw new Error(`${formFactor}/${segment.name} has no source frame timing evidence.`);
  }
  const activeIntervals = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = timestamps[index - 1];
    const current = timestamps[index];
    const interval = current - previous;
    if (Number.isFinite(interval) && interval > 0 && interval <= ACTIVE_FRAME_GAP_MS) {
      activeIntervals.push(interval);
    }
  }
  if (activeIntervals.length < MIN_ACTIVE_FRAME_INTERVALS) {
    throw new Error(
      `${formFactor}/${segment.name} contains only ${String(activeIntervals.length)} active source-frame intervals; expected at least ${String(MIN_ACTIVE_FRAME_INTERVALS)}.`,
    );
  }
  const activeDuration = activeIntervals.reduce((sum, interval) => sum + interval, 0) / 1_000;
  const rate = activeIntervals.length / activeDuration;
  if (!Number.isFinite(rate) || rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${formFactor}/${segment.name} measures ${rate.toFixed(2)} browser-presented source fps during active motion; expected at least ${MIN_CAPTURE_FPS} fps before encoding.`,
    );
  }
  return rate;
}

const rendered = readJson(path.join(outputRoot, "manifest.json"));

for (const formFactor of ["desktop", "mobile"]) {
  const expected = dimensions[formFactor];
  const sourceManifest = readJson(path.join(outputRoot, "raw", formFactor, "manifest.json"));
  if (
    sourceManifest.captureFps !== SHOWCASE_FPS ||
    sourceManifest.minimumMeasuredCaptureFps !== MIN_CAPTURE_FPS ||
    sourceManifest.activeFrameGapThresholdMs !== ACTIVE_FRAME_GAP_MS
  ) {
    throw new Error(`${formFactor} manifest does not declare the measured 60 fps contract.`);
  }

  for (const segment of sourceManifest.segments) {
    const screenshot = probeVisual(path.resolve(workspace, segment.screenshot));
    assertDimensions(screenshot, expected, `${formFactor}/${segment.name} screenshot`);
    if (segment.mediaMode !== "motion") continue;

    const measured = measureSourceCadence(segment, formFactor);
    const rawWebm = probeVisual(path.resolve(workspace, segment.video));
    assertDimensions(rawWebm, expected, `${formFactor}/${segment.name} raw WebM`);
    assertHighFrameRate(rawWebm, `${formFactor}/${segment.name} normalized WebM`);
    if (rawWebm.codec_name !== "vp8") {
      throw new Error(
        `${formFactor}/${segment.name} normalized WebM uses ${String(rawWebm.codec_name)}; expected VP8.`,
      );
    }

    const published = rendered[formFactor].segments.find(
      (entry) => entry.name === segment.name,
    )?.published;
    if (!published?.path) throw new Error(`${formFactor}/${segment.name} has no published asset.`);
    const webp = probeVisual(path.resolve(workspace, published.path));
    assertDimensions(webp, expected, `${formFactor}/${segment.name} animated WebP`);
    assertHighFrameRate(webp, `${formFactor}/${segment.name} animated WebP`);

    console.log(
      `${formFactor}/${segment.name}: ${measured.toFixed(2)} measured source fps; 60 fps outputs verified`,
    );
  }

  const reelPath = path.resolve(workspace, rendered[formFactor].reel);
  const reel = probeVisual(reelPath);
  assertDimensions(reel, expected, `${formFactor} highlight reel`);
  assertHighFrameRate(reel, `${formFactor} highlight reel`);
}
