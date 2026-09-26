import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? "artifacts/e2e-media");
const workDir = path.join(outputRoot, ".render");
const showcaseRoot = path.join(outputRoot, "showcase");
const reelsDir = path.join(outputRoot, "reels");
const markdownPath = path.join(outputRoot, "README-showcase.md");
const manifestPath = path.join(outputRoot, "manifest.json");
const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
const ffprobe = process.env.FFPROBE_BIN ?? "ffprobe";
const formFactors = ["desktop", "mobile"];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspace,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

function capture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspace,
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
      reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function probeDuration(filePath) {
  const stdout = await capture(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine duration for ${filePath}`);
  }
  return duration;
}

function usableFrameRate(value) {
  return typeof value === "string" && value.length > 0 && value !== "0/0";
}

async function probeFrameTimestamps(filePath) {
  const stdout = await capture(ffprobe, [
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
  ]);
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed.frames)
    ? parsed.frames
        .map((frame) => Number(frame.best_effort_timestamp_time))
        .filter((value) => Number.isFinite(value))
    : [];
}

function decodedFrameStats(
  timestamps,
  minimumPacedIntervalSeconds = 0.012,
  maximumPacedIntervalSeconds = 0.022,
) {
  if (timestamps.length < 2) {
    return {
      frames: timestamps.length,
      duration: 0,
      fps: 0,
      nonIncreasingIntervals: 0,
      maxInterval: 0,
      pacedIntervalRatio: 0,
      responsiveIntervalRatio: 0,
    };
  }
  const first = timestamps[0];
  const last = timestamps.at(-1);
  const duration = last - first;
  let nonIncreasingIntervals = 0;
  let maxInterval = 0;
  let pacedIntervals = 0;
  let responsiveIntervals = 0;
  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = timestamps[index - 1];
    const current = timestamps[index];
    const interval = current - previous;
    if (interval <= 0) nonIncreasingIntervals += 1;
    maxInterval = Math.max(maxInterval, interval);
    if (interval >= minimumPacedIntervalSeconds && interval <= maximumPacedIntervalSeconds) {
      pacedIntervals += 1;
    }
    if (interval <= maximumPacedIntervalSeconds) responsiveIntervals += 1;
  }
  return {
    frames: timestamps.length,
    duration,
    fps: duration > 0 ? (timestamps.length - 1) / duration : 0,
    nonIncreasingIntervals,
    maxInterval,
    pacedIntervalRatio: pacedIntervals / (timestamps.length - 1),
    responsiveIntervalRatio: responsiveIntervals / (timestamps.length - 1),
  };
}

async function verifyMeasuredCapture(videoPath, manifest) {
  const timingPath = `${videoPath}.frames.json`;
  const timing = JSON.parse(await readFile(timingPath, "utf8"));
  const timestamps = Array.isArray(timing.timestamps)
    ? timing.timestamps.filter((value) => Number.isFinite(value))
    : [];
  const browserTimestamps = Array.isArray(timing.browserTimestamps)
    ? timing.browserTimestamps.filter((value) => Number.isFinite(value))
    : [];

  if (timestamps.length < 2) {
    throw new Error(`Measured raw X11 timestamps missing for ${videoPath}`);
  }
  if (browserTimestamps.length < 2) {
    throw new Error(`Measured browser animation timestamps missing for ${videoPath}`);
  }
  if (timing.requestedFps !== manifest.captureFps) {
    throw new Error(`${videoPath} timing evidence does not match the requested capture rate`);
  }
  if (timing.minimumFps !== manifest.minimumMeasuredCaptureFps) {
    throw new Error(`${videoPath} timing evidence does not match the minimum capture rate`);
  }
  if (timing.maximumFps !== manifest.maximumMeasuredCaptureFps) {
    throw new Error(`${videoPath} timing evidence does not match the maximum capture rate`);
  }
  if (timing.codec !== "h264") {
    throw new Error(`${videoPath} timing evidence must identify the raw capture codec as H.264`);
  }

  const minimumFps = manifest.minimumMeasuredCaptureFps;
  const maximumFps = manifest.maximumMeasuredCaptureFps;
  const minimumPacedIntervalSeconds = manifest.minimumPacedIntervalSeconds;
  const maximumPacedIntervalSeconds = manifest.maximumPacedIntervalSeconds;
  const minimumPacedIntervalRatio = manifest.minimumPacedIntervalRatio;
  const captured = decodedFrameStats(
    timestamps,
    minimumPacedIntervalSeconds,
    maximumPacedIntervalSeconds,
  );
  if (captured.nonIncreasingIntervals > 0) {
    throw new Error(
      `${videoPath} raw X11 timing evidence contains ${String(captured.nonIncreasingIntervals)} duplicated or non-increasing frame timestamps.`,
    );
  }
  if (!Number.isFinite(captured.fps) || captured.fps < minimumFps || captured.fps > maximumFps) {
    throw new Error(
      `${videoPath} raw X11 timing evidence is ${captured.fps.toFixed(2)} fps; expected native ${Number(minimumFps).toFixed(2)}-${Number(maximumFps).toFixed(2)} fps before publication encoding.`,
    );
  }
  if (captured.pacedIntervalRatio < minimumPacedIntervalRatio) {
    throw new Error(
      `${videoPath} raw X11 timing evidence has only ${(captured.pacedIntervalRatio * 100).toFixed(1)}% of intervals in the native pacing window; expected at least ${String(minimumPacedIntervalRatio * 100)}%.`,
    );
  }

  const browserSeconds = browserTimestamps.map((timestamp) => timestamp / 1000);
  const browser = decodedFrameStats(
    browserSeconds,
    minimumPacedIntervalSeconds,
    maximumPacedIntervalSeconds,
  );
  if (browser.nonIncreasingIntervals > 0) {
    throw new Error(
      `${videoPath} browser animation evidence contains ${String(browser.nonIncreasingIntervals)} duplicated or non-increasing timestamps.`,
    );
  }
  if (!Number.isFinite(browser.fps) || browser.fps < minimumFps) {
    throw new Error(
      `${videoPath} browser animation clock is ${browser.fps.toFixed(2)} fps; expected at least ${Number(minimumFps).toFixed(2)} fps while recording.`,
    );
  }
  if (browser.responsiveIntervalRatio < minimumPacedIntervalRatio) {
    throw new Error(
      `${videoPath} browser animation evidence has only ${(browser.responsiveIntervalRatio * 100).toFixed(1)}% of intervals at or below ${String(maximumPacedIntervalSeconds * 1000)} ms; expected at least ${String(minimumPacedIntervalRatio * 100)}% so uncapped rendering cannot hide frame stalls.`,
    );
  }

  const video = await probeVisualSource(videoPath);
  if (video.codec !== "h264") {
    throw new Error(`${videoPath} raw Matroska codec is ${String(video.codec)}; expected H.264`);
  }

  const decodedTimestamps = await probeFrameTimestamps(videoPath);
  const decoded = decodedFrameStats(
    decodedTimestamps,
    minimumPacedIntervalSeconds,
    maximumPacedIntervalSeconds,
  );
  if (decoded.nonIncreasingIntervals > 0) {
    throw new Error(
      `${videoPath} raw Matroska contains ${String(decoded.nonIncreasingIntervals)} duplicated or non-increasing decoded frame timestamps.`,
    );
  }
  if (!Number.isFinite(decoded.fps) || decoded.fps < minimumFps || decoded.fps > maximumFps) {
    throw new Error(
      `${videoPath} raw Matroska decodes at ${decoded.fps.toFixed(2)} fps from ${String(decoded.frames)} actual frames; expected native ${Number(minimumFps).toFixed(2)}-${Number(maximumFps).toFixed(2)} fps.`,
    );
  }
  if (decoded.pacedIntervalRatio < minimumPacedIntervalRatio) {
    throw new Error(
      `${videoPath} raw Matroska has only ${(decoded.pacedIntervalRatio * 100).toFixed(1)}% of frame intervals in the native pacing window; expected at least ${String(minimumPacedIntervalRatio * 100)}%.`,
    );
  }
  if (decoded.frames !== timing.capturedFrames || decoded.frames !== timestamps.length) {
    throw new Error(
      `${videoPath} decoded ${String(decoded.frames)} raw frames but timing evidence records ${String(timing.capturedFrames)}; capture evidence must match the file exactly.`,
    );
  }

  return {
    timingPath,
    capturedFrames: decoded.frames,
    encodedFrames: decoded.frames,
    capturedDuration: decoded.duration,
    measuredFps: decoded.fps,
    decodedFps: decoded.fps,
    browserFps: browser.fps,
  };
}

async function probeVisualSource(filePath) {
  const stdout = await capture(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,codec_name,avg_frame_rate,r_frame_rate",
    "-of",
    "json",
    filePath,
  ]);
  const parsed = JSON.parse(stdout);
  const stream = parsed.streams?.[0];
  if (!stream || !Number.isFinite(stream.width) || !Number.isFinite(stream.height)) {
    throw new Error(`Could not determine dimensions for ${filePath}`);
  }
  const fps = usableFrameRate(stream.avg_frame_rate)
    ? stream.avg_frame_rate
    : usableFrameRate(stream.r_frame_rate)
      ? stream.r_frame_rate
      : null;
  return {
    width: stream.width,
    height: stream.height,
    codec: stream.codec_name ?? null,
    fps,
  };
}

function assertManifest(manifest, formFactor) {
  if (manifest.formFactor !== formFactor) throw new Error(`Expected ${formFactor} manifest`);
  if (manifest.captureFps !== 60) {
    throw new Error(`${formFactor} manifest must request a 60 fps showcase capture`);
  }
  if (manifest.minimumMeasuredCaptureFps !== 59) {
    throw new Error(`${formFactor} manifest must require at least 59 measured source frames per second`);
  }
  if (manifest.maximumMeasuredCaptureFps !== 61) {
    throw new Error(`${formFactor} manifest must reject uncapped capture above 61 measured frames per second`);
  }
  if (manifest.minimumPacedIntervalSeconds !== 0.012) {
    throw new Error(`${formFactor} manifest must require native frame intervals of at least 12 ms`);
  }
  if (manifest.maximumPacedIntervalSeconds !== 0.022) {
    throw new Error(`${formFactor} manifest must require native frame intervals of at most 22 ms`);
  }
  if (manifest.minimumPacedIntervalRatio !== 0.95) {
    throw new Error(`${formFactor} manifest must require at least 95% native-paced frame intervals`);
  }
  if (!Array.isArray(manifest.segments) || manifest.segments.length !== 5) {
    throw new Error(`${formFactor} manifest must contain exactly five showcase scenes`);
  }

  const motion = manifest.segments.filter((segment) => segment.mediaMode === "motion");
  const still = manifest.segments.filter((segment) => segment.mediaMode === "static");
  if (motion.length !== 2 || still.length !== 3) {
    throw new Error(
      `${formFactor} showcase must contain two motion scenes and three static scenes`,
    );
  }
  for (const segment of motion) {
    if (!segment.video) throw new Error(`Motion scene ${segment.name} is missing its Matroska source`);
  }
}

async function renderFormFactor(formFactor, manifest) {
  const factorWorkDir = path.join(workDir, formFactor);
  const factorShowcaseDir = path.join(showcaseRoot, formFactor);
  await mkdir(factorWorkDir, { recursive: true });
  await mkdir(factorShowcaseDir, { recursive: true });
  await mkdir(reelsDir, { recursive: true });

  const sources = [];
  for (const segment of manifest.segments) {
    const screenshotPath = path.resolve(workspace, segment.screenshot);
    const screenshot = await probeVisualSource(screenshotPath);
    if (segment.mediaMode === "motion") {
      const videoPath = path.resolve(workspace, segment.video);
      const captureVerification = await verifyMeasuredCapture(videoPath, manifest);
      const video = await probeVisualSource(videoPath);
      sources.push({
        segment,
        screenshotPath,
        screenshot,
        videoPath,
        video,
        captureVerification,
      });
    } else {
      sources.push({ segment, screenshotPath, screenshot, videoPath: null, video: null });
    }
  }

  const firstMotion = sources.find((entry) => entry.video);
  if (!firstMotion) throw new Error(`${formFactor} showcase has no motion source`);
  const reelProfile = {
    width: firstMotion.video.width,
    height: firstMotion.video.height,
    fps: String(manifest.captureFps),
  };

  const sequence = [];
  const mediaRecords = [];

  for (const [index, entry] of sources.entries()) {
    const { segment, screenshotPath, screenshot, videoPath, video } = entry;
    const stem = `${String(index).padStart(2, "0")}-${segment.name}`;

    if (segment.mediaMode === "static") {
      const output = path.join(factorShowcaseDir, `${segment.name}.png`);
      await copyFile(screenshotPath, output);
      const outputStat = await stat(output);
      mediaRecords.push({
        name: segment.name,
        mediaMode: "static",
        path: path.relative(workspace, output),
        bytes: outputStat.size,
        source: {
          width: screenshot.width,
          height: screenshot.height,
          fps: null,
        },
      });

      const stillOutput = path.join(factorWorkDir, `${stem}-still.mp4`);
      await run(ffmpeg, [
        "-y",
        "-loop",
        "1",
        "-framerate",
        reelProfile.fps,
        "-i",
        screenshotPath,
        "-t",
        String(manifest.stillSeconds ?? 0.9),
        "-vf",
        `scale=${reelProfile.width}:${reelProfile.height}:force_original_aspect_ratio=decrease,pad=${reelProfile.width}:${reelProfile.height}:(ow-iw)/2:(oh-ih)/2:color=0x0b0c10,setsar=1,fps=${reelProfile.fps},format=yuv420p`,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        stillOutput,
      ]);
      sequence.push(stillOutput);
      continue;
    }

    const startSeconds = segment.motionStartSeconds ?? 1.05;
    const durationSeconds = segment.motionDurationSeconds ?? 4.8;
    const webpOutput = path.join(factorShowcaseDir, `${segment.name}.webp`);
    await run(ffmpeg, [
      "-y",
      "-ss",
      String(startSeconds),
      "-t",
      String(durationSeconds),
      "-i",
      videoPath,
      "-an",
      "-c:v",
      "libwebp_anim",
      "-lossless",
      "0",
      "-q:v",
      "82",
      "-compression_level",
      "4",
      "-loop",
      "0",
      "-fps_mode",
      "passthrough",
      webpOutput,
    ]);

    const webpStat = await stat(webpOutput);
    mediaRecords.push({
      name: segment.name,
      mediaMode: "motion",
      path: path.relative(workspace, webpOutput),
      bytes: webpStat.size,
      source: {
        width: video.width,
        height: video.height,
        fps: video.fps,
        targetFps: manifest.captureFps,
        measuredCaptureFps: entry.captureVerification.measuredFps,
        decodedRawFps: entry.captureVerification.decodedFps,
        browserFps: entry.captureVerification.browserFps,
        capturedFrames: entry.captureVerification.capturedFrames,
        encodedFrames: entry.captureVerification.encodedFrames,
      },
    });

    const publishedWebpTimestamps = await probeFrameTimestamps(webpOutput);
    const publishedWebp = decodedFrameStats(
      publishedWebpTimestamps,
      manifest.minimumPacedIntervalSeconds,
      manifest.maximumPacedIntervalSeconds,
    );
    if (publishedWebp.nonIncreasingIntervals > 0) {
      throw new Error(
        `${webpOutput} contains ${String(publishedWebp.nonIncreasingIntervals)} duplicated or non-increasing presentation timestamps.`,
      );
    }
    if (
      !Number.isFinite(publishedWebp.fps) ||
      publishedWebp.fps < manifest.minimumMeasuredCaptureFps ||
      publishedWebp.fps > manifest.maximumMeasuredCaptureFps
    ) {
      throw new Error(
        `${webpOutput} decodes at ${publishedWebp.fps.toFixed(2)} fps; expected source-paced 59-61 fps without publication retiming.`,
      );
    }
    if (publishedWebp.pacedIntervalRatio < manifest.minimumPacedIntervalRatio) {
      throw new Error(
        `${webpOutput} has only ${(publishedWebp.pacedIntervalRatio * 100).toFixed(1)}% of frame intervals in the native pacing window.`,
      );
    }

    const clipOutput = path.join(factorWorkDir, `${stem}-motion.mp4`);
    await run(ffmpeg, [
      "-y",
      "-ss",
      String(startSeconds),
      "-t",
      String(durationSeconds),
      "-i",
      videoPath,
      "-vf",
      `scale=${reelProfile.width}:${reelProfile.height}:force_original_aspect_ratio=decrease,pad=${reelProfile.width}:${reelProfile.height}:(ow-iw)/2:(oh-ih)/2:color=0x0b0c10,setsar=1,format=yuv420p`,
      "-fps_mode",
      "passthrough",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      clipOutput,
    ]);
    sequence.push(clipOutput);
  }

  const durations = [];
  for (const input of sequence) durations.push(await probeDuration(input));

  const args = ["-y"];
  for (const input of sequence) args.push("-i", input);
  const filters = sequence.map(
    (_, index) => `[${index}:v]settb=AVTB,setpts=PTS-STARTPTS[v${index}]`,
  );
  let currentLabel = "v0";
  let cumulativeDuration = durations[0];

  for (let index = 1; index < sequence.length; index += 1) {
    const nextLabel = `x${index}`;
    const offset = Math.max(0.01, cumulativeDuration - manifest.transitionSeconds);
    filters.push(
      `[${currentLabel}][v${index}]xfade=transition=fade:duration=${manifest.transitionSeconds.toFixed(3)}:offset=${offset.toFixed(3)}[${nextLabel}]`,
    );
    currentLabel = nextLabel;
    cumulativeDuration += durations[index] - manifest.transitionSeconds;
  }

  const reelPath = path.join(reelsDir, `lum-${formFactor}-highlight.mp4`);
  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    `[${currentLabel}]`,
    "-fps_mode",
    "passthrough",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    reelPath,
  );
  await run(ffmpeg, args);
  const reelTimestamps = await probeFrameTimestamps(reelPath);
  const reelProbe = decodedFrameStats(
    reelTimestamps,
    manifest.minimumPacedIntervalSeconds,
    manifest.maximumPacedIntervalSeconds,
  );
  if (reelProbe.nonIncreasingIntervals > 0) {
    throw new Error(
      `${reelPath} contains ${String(reelProbe.nonIncreasingIntervals)} duplicated or non-increasing presentation timestamps.`,
    );
  }
  if (
    !Number.isFinite(reelProbe.fps) ||
    reelProbe.fps < manifest.minimumMeasuredCaptureFps ||
    reelProbe.fps > manifest.maximumMeasuredCaptureFps
  ) {
    throw new Error(
      `${reelPath} decodes at ${reelProbe.fps.toFixed(2)} fps; expected source-paced 59-61 fps reel output.`,
    );
  }
  if (reelProbe.pacedIntervalRatio < manifest.minimumPacedIntervalRatio) {
    throw new Error(
      `${reelPath} has only ${(reelProbe.pacedIntervalRatio * 100).toFixed(1)}% of frame intervals in the native pacing window.`,
    );
  }

  const mediaByName = new Map(mediaRecords.map((record) => [record.name, record]));
  return {
    ...manifest,
    reel: path.relative(workspace, reelPath),
    reelProfile,
    segments: manifest.segments.map((segment) => ({
      ...segment,
      published: mediaByName.get(segment.name),
    })),
    media: mediaRecords,
    totalShowcaseBytes: mediaRecords.reduce((sum, record) => sum + record.bytes, 0),
  };
}

await rm(workDir, { recursive: true, force: true });
await rm(showcaseRoot, { recursive: true, force: true });
await rm(reelsDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const sourceManifests = {};
for (const formFactor of formFactors) {
  const sourcePath = path.join(outputRoot, "raw", formFactor, "manifest.json");
  const manifest = JSON.parse(await readFile(sourcePath, "utf8"));
  assertManifest(manifest, formFactor);
  sourceManifests[formFactor] = manifest;
}

const expectedNames = sourceManifests.desktop.segments.map((segment) => segment.name);
const mobileNames = sourceManifests.mobile.segments.map((segment) => segment.name);
if (JSON.stringify(expectedNames) !== JSON.stringify(mobileNames)) {
  throw new Error(
    "Desktop and mobile showcase manifests must describe the same five feature intents",
  );
}

const rendered = {};
for (const formFactor of formFactors) {
  rendered[formFactor] = await renderFormFactor(formFactor, sourceManifests[formFactor]);
}

const combinedShowcaseBytes = formFactors.reduce(
  (sum, formFactor) => sum + rendered[formFactor].totalShowcaseBytes,
  0,
);

const manifest = {
  project: "Lūm",
  generatedAt: new Date().toISOString(),
  desktop: rendered.desktop,
  mobile: rendered.mobile,
  combinedShowcaseBytes,
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

const pagesBase = process.env.SHOWCASE_BASE_URL ?? "https://xtreemze.github.io/timeline/showcase";
const markdown = [
  "## Lūm showcase",
  "",
  "These assets are generated from the real Chromium application exercised by CI. Motion must be display-paced at native 60 fps: browser animation timing and raw X11 capture must both remain within 59–61 fps, at least 95% of frame intervals must stay within 12–22 ms, and publication preserves source timestamps instead of manufacturing cadence with FFmpeg frame-rate normalization. Static states use source-resolution PNG screenshots.",
  "",
  ...formFactors.flatMap((formFactor) => [
    `### ${formFactor === "desktop" ? "Desktop" : "Mobile"}`,
    "",
    ...rendered[formFactor].segments.flatMap((segment) => [
      `#### ${segment.title}`,
      "",
      segment.description,
      "",
      `<img src="${pagesBase}/${formFactor}/${path.basename(segment.published.path)}" alt="${segment.altText}">`,
      "",
    ]),
  ]),
].join("\n");

await writeFile(markdownPath, markdown);
await rm(workDir, { recursive: true, force: true });

for (const formFactor of formFactors) {
  console.log(`\n${formFactor.toUpperCase()} showcase sizes`);
  for (const media of rendered[formFactor].media) {
    const dimensions = `${media.source.width}x${media.source.height}`;
    const rate = media.source.fps
      ? ` @ ${media.source.fps} fps (raw ${media.source.measuredCaptureFps.toFixed(2)} fps; browser ${media.source.browserFps.toFixed(2)} fps)`
      : "";
    console.log(`${media.name} (${media.mediaMode}): ${media.bytes} bytes, ${dimensions}${rate}`);
  }
  console.log(`${formFactor} total: ${rendered[formFactor].totalShowcaseBytes} bytes`);
}
console.log(`combined showcase payload: ${combinedShowcaseBytes} bytes`);
console.log(`Rendered ${rendered.desktop.reel}`);
console.log(`Rendered ${rendered.mobile.reel}`);
console.log(`Rendered README snippet at ${markdownPath}`);
