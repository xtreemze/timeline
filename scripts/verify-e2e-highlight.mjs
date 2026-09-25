import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const ffprobe = process.env.FFPROBE_BIN ?? "ffprobe";
const SHOWCASE_FPS = 60;
const MIN_CAPTURE_FPS = 59;
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
      "stream=width,height,codec_name",
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

function probeDecodedFrameRate(filePath) {
  const result = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_frames",
      "-show_entries",
      "frame=best_effort_timestamp_time",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe frame decode failed for ${filePath}: ${result.stderr}`);
  }

  const timestamps = JSON.parse(result.stdout)
    .frames?.map((frame) => Number.parseFloat(frame.best_effort_timestamp_time))
    .filter(Number.isFinite);
  if (!Array.isArray(timestamps) || timestamps.length < 2) {
    throw new Error(`No decoded frame timing evidence found in ${filePath}.`);
  }

  const first = timestamps[0];
  const last = timestamps.at(-1);
  const duration = last - first;
  const rate = (timestamps.length - 1) / duration;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(rate)) {
    throw new Error(`Decoded frame timing evidence is invalid for ${filePath}.`);
  }
  return { rate, frameCount: timestamps.length, duration };
}

function assertFrameRate(filePath, label) {
  const decoded = probeDecodedFrameRate(filePath);
  if (decoded.rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${label} decodes at ${decoded.rate.toFixed(2)} fps; expected at least ${MIN_CAPTURE_FPS} actual frames per second.`,
    );
  }
  return decoded;
}

function assertDimensions(stream, expected, label) {
  if (stream.width !== expected.width || stream.height !== expected.height) {
    throw new Error(
      `${label} is ${String(stream.width)}x${String(stream.height)}; expected ${String(expected.width)}x${String(expected.height)}.`,
    );
  }
}

const rendered = readJson(path.join(outputRoot, "manifest.json"));

for (const formFactor of ["desktop", "mobile"]) {
  const expected = dimensions[formFactor];
  const sourceManifest = readJson(path.join(outputRoot, "raw", formFactor, "manifest.json"));
  if (
    sourceManifest.captureFps !== SHOWCASE_FPS ||
    sourceManifest.minimumCapturedFps !== MIN_CAPTURE_FPS
  ) {
    throw new Error(`${formFactor} manifest does not declare the measured 60 fps contract.`);
  }

  for (const segment of sourceManifest.segments) {
    const screenshotPath = path.resolve(workspace, segment.screenshot);
    const screenshot = probeVisual(screenshotPath);
    assertDimensions(screenshot, expected, `${formFactor}/${segment.name} screenshot`);

    if (segment.mediaMode !== "motion") continue;
    if (segment.requestedFps !== SHOWCASE_FPS || segment.capturedFps < MIN_CAPTURE_FPS) {
      throw new Error(
        `${formFactor}/${segment.name} manifest does not certify at least ${MIN_CAPTURE_FPS} captured fps.`,
      );
    }
    if (segment.browserFrameClockFps < MIN_CAPTURE_FPS) {
      throw new Error(
        `${formFactor}/${segment.name} browser frame clock fell below ${MIN_CAPTURE_FPS} fps.`,
      );
    }

    const rawPath = path.resolve(workspace, segment.video);
    const raw = probeVisual(rawPath);
    assertDimensions(raw, expected, `${formFactor}/${segment.name} raw Chromium MP4`);
    const rawRate = assertFrameRate(rawPath, `${formFactor}/${segment.name} raw Chromium MP4`);

    const published = rendered[formFactor].segments.find(
      (entry) => entry.name === segment.name,
    )?.published;
    if (!published?.path) {
      throw new Error(`${formFactor}/${segment.name} has no published asset.`);
    }

    const webpPath = path.resolve(workspace, published.path);
    const webp = probeVisual(webpPath);
    assertDimensions(webp, expected, `${formFactor}/${segment.name} animated WebP`);
    assertFrameRate(webpPath, `${formFactor}/${segment.name} animated WebP`);

    console.log(
      `${formFactor}/${segment.name}: ${rawRate.rate.toFixed(2)} raw fps; 60 fps derivative verified`,
    );
  }

  const reelPath = path.resolve(workspace, rendered[formFactor].reel);
  const reel = probeVisual(reelPath);
  assertDimensions(reel, expected, `${formFactor} highlight reel`);
  assertFrameRate(reelPath, `${formFactor} highlight reel`);
}
