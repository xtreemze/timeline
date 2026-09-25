import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const ffprobe = process.env.FFPROBE_BIN ?? "ffprobe";
const SHOWCASE_FPS = 60;
const MIN_CAPTURE_FPS = 59;
const MIN_CAPTURE_COVERAGE = 0.95;
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

function assertDecodedFrameRate(filePath, label) {
  const decoded = probeDecodedFrameRate(filePath);
  if (decoded.rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${label} decodes at ${decoded.rate.toFixed(2)} fps; expected at least ${MIN_CAPTURE_FPS}.`,
    );
  }
  return decoded;
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
  const first = timestamps[0];
  const last = timestamps.at(-1);
  const duration = (last - first) / 1_000;
  const rate = (timestamps.length - 1) / duration;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(rate)) {
    throw new Error(`${formFactor}/${segment.name} has invalid source frame timing evidence.`);
  }
  const recordingWindow = Number(capture.recordingWindowSeconds);
  if (
    !Number.isFinite(recordingWindow) ||
    recordingWindow <= 0 ||
    duration < recordingWindow * MIN_CAPTURE_COVERAGE
  ) {
    throw new Error(
      `${formFactor}/${segment.name} source frames cover ${duration.toFixed(3)}s of a ${recordingWindow.toFixed(3)}s recording window; expected at least ${(recordingWindow * MIN_CAPTURE_COVERAGE).toFixed(3)}s.`,
    );
  }
  if (rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${formFactor}/${segment.name} measures ${rate.toFixed(2)} actual source fps; expected at least ${MIN_CAPTURE_FPS} fps before encoding.`,
    );
  }
  if (!Number.isFinite(capture.browserFrameClockFps) || capture.browserFrameClockFps < MIN_CAPTURE_FPS) {
    throw new Error(`${formFactor}/${segment.name} browser frame clock did not sustain 59 fps.`);
  }
  return rate;
}

const rendered = readJson(path.join(outputRoot, "manifest.json"));

for (const formFactor of ["desktop", "mobile"]) {
  const expected = dimensions[formFactor];
  const sourceManifest = readJson(path.join(outputRoot, "raw", formFactor, "manifest.json"));
  if (
    sourceManifest.captureFps !== SHOWCASE_FPS ||
    sourceManifest.minimumCapturedFps !== MIN_CAPTURE_FPS ||
    sourceManifest.minimumCaptureCoverage !== MIN_CAPTURE_COVERAGE
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
    const rawDecoded = assertDecodedFrameRate(
      path.resolve(workspace, segment.video),
      `${formFactor}/${segment.name} source-frame VP8 WebM`,
    );
    if (rawDecoded.frameCount !== segment.capture.frameCount) {
      throw new Error(
        `${formFactor}/${segment.name} source-frame WebM contains ${String(rawDecoded.frameCount)} frames but the Chromium capture reported ${String(segment.capture.frameCount)}.`,
      );
    }
    if (rawWebm.codec_name !== "vp8") {
      throw new Error(
        `${formFactor}/${segment.name} raw VP8 WebM uses ${String(rawWebm.codec_name)}; expected VP8.`,
      );
    }

    const published = rendered[formFactor].segments.find(
      (entry) => entry.name === segment.name,
    )?.published;
    if (!published?.path) throw new Error(`${formFactor}/${segment.name} has no published asset.`);
    const webp = probeVisual(path.resolve(workspace, published.path));
    assertDimensions(webp, expected, `${formFactor}/${segment.name} animated WebP`);
    assertDecodedFrameRate(
      path.resolve(workspace, published.path),
      `${formFactor}/${segment.name} animated WebP`,
    );

    console.log(
      `${formFactor}/${segment.name}: ${measured.toFixed(2)} measured source fps; 60 fps outputs verified`,
    );
  }

  const reelPath = path.resolve(workspace, rendered[formFactor].reel);
  const reel = probeVisual(reelPath);
  assertDimensions(reel, expected, `${formFactor} highlight reel`);
  assertDecodedFrameRate(reelPath, `${formFactor} highlight reel`);
}
