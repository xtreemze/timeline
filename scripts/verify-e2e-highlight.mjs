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
    throw new Error(`${label} reports ${rate.toFixed(2)} fps; expected at least ${MIN_CAPTURE_FPS}.`);
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
  if (!capture || capture.requestedFps !== SHOWCASE_FPS) {
    throw new Error(`${formFactor}/${segment.name} did not request ${SHOWCASE_FPS} fps.`);
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
  if (rate < MIN_CAPTURE_FPS) {
    throw new Error(
      `${formFactor}/${segment.name} contains ${String(timestamps.length)} browser-presented source frames across ${duration.toFixed(3)}s (${rate.toFixed(2)} fps); expected at least ${MIN_CAPTURE_FPS} fps before encoding.`,
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
    sourceManifest.minimumMeasuredCaptureFps !== MIN_CAPTURE_FPS
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

    const published = rendered[formFactor].segments.find((entry) => entry.name === segment.name)?.published;
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
