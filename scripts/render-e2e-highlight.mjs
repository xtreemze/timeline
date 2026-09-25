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
const SHOWCASE_FPS = 60;
const MIN_CAPTURE_FPS = 59;

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

function numericFrameRate(value) {
  if (!usableFrameRate(value)) return Number.NaN;
  const [numerator, denominator = "1"] = value.split("/");
  const numeratorValue = Number(numerator);
  const denominatorValue = Number(denominator);
  if (!Number.isFinite(numeratorValue) || !Number.isFinite(denominatorValue) || denominatorValue <= 0) {
    return Number.NaN;
  }
  return numeratorValue / denominatorValue;
}

function assertHighFrameRate(value, label) {
  const fps = numericFrameRate(value);
  if (!Number.isFinite(fps) || fps < MIN_CAPTURE_FPS) {
    throw new Error(`${label} reports ${String(value)} fps; expected at least ${MIN_CAPTURE_FPS} fps.`);
  }
}

function assertMeasuredCapture(segment, formFactor) {
  const capture = segment.capture;
  if (!capture || capture.targetFps !== SHOWCASE_FPS) {
    throw new Error(`${formFactor}/${segment.name} is missing the ${SHOWCASE_FPS} fps source-capture contract.`);
  }
  const timestamps = capture.frameTimestampsMs;
  if (!Array.isArray(timestamps) || timestamps.length < 2) {
    throw new Error(`${formFactor}/${segment.name} is missing source frame timestamps.`);
  }
  const first = timestamps[0];
  const last = timestamps.at(-1);
  const durationSeconds = (last - first) / 1_000;
  const measuredFps = (timestamps.length - 1) / durationSeconds;
  if (!Number.isFinite(measuredFps) || measuredFps < MIN_CAPTURE_FPS) {
    throw new Error(
      `${formFactor}/${segment.name} measured ${measuredFps.toFixed(2)} actual source fps; expected at least ${MIN_CAPTURE_FPS}.`,
    );
  }
}

async function probeVisualSource(filePath) {
  const stdout = await capture(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,r_frame_rate,codec_name",
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
    fps,
    codec: stream.codec_name ?? null,
  };
}

function assertManifest(manifest, formFactor) {
  if (manifest.formFactor !== formFactor) throw new Error(`Expected ${formFactor} manifest`);
  if (manifest.captureFps !== SHOWCASE_FPS || manifest.minimumMeasuredCaptureFps !== MIN_CAPTURE_FPS) {
    throw new Error(`${formFactor} manifest does not certify measured ${SHOWCASE_FPS} fps capture.`);
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
    if (!segment.video) throw new Error(`Motion scene ${segment.name} is missing its WebM source`);
    assertMeasuredCapture(segment, formFactor);
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
      const video = await probeVisualSource(videoPath);
      if (!video.fps) throw new Error(`Could not determine source FPS for ${videoPath}`);
      assertHighFrameRate(video.fps, `${formFactor}/${segment.name} normalized WebM`);
      if (video.codec !== "vp8") {
        throw new Error(`${formFactor}/${segment.name} raw WebM must use VP8, found ${String(video.codec)}.`);
      }
      sources.push({ segment, screenshotPath, screenshot, videoPath, video });
    } else {
      sources.push({ segment, screenshotPath, screenshot, videoPath: null, video: null });
    }
  }

  const firstMotion = sources.find((entry) => entry.video);
  if (!firstMotion) throw new Error(`${formFactor} showcase has no motion source`);
  const reelProfile = {
    width: firstMotion.video.width,
    height: firstMotion.video.height,
    fps: String(SHOWCASE_FPS),
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
      "-r",
      String(SHOWCASE_FPS),
      webpOutput,
    ]);

    const webp = await probeVisualSource(webpOutput);
    assertHighFrameRate(webp.fps, `${formFactor}/${segment.name} animated WebP`);
    if (webp.width !== video.width || webp.height !== video.height) {
      throw new Error(`${formFactor}/${segment.name} animated WebP changed source dimensions.`);
    }
    const webpStat = await stat(webpOutput);
    mediaRecords.push({
      name: segment.name,
      mediaMode: "motion",
      path: path.relative(workspace, webpOutput),
      bytes: webpStat.size,
      source: {
        width: video.width,
        height: video.height,
        fps: String(SHOWCASE_FPS),
      },
    });

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
  const reel = await probeVisualSource(reelPath);
  assertHighFrameRate(reel.fps, `${formFactor} highlight reel`);
  if (reel.width !== reelProfile.width || reel.height !== reelProfile.height) {
    throw new Error(`${formFactor} highlight reel changed source dimensions.`);
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
  "These assets are generated from the real Chromium application exercised by CI. Motion is captured and independently measured at 60 fps before encoding, then published at source dimensions as 60 fps animated WebP; static states use source-resolution PNG screenshots.",
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
    const rate = media.source.fps ? ` @ ${media.source.fps} fps` : "";
    console.log(`${media.name} (${media.mediaMode}): ${media.bytes} bytes, ${dimensions}${rate}`);
  }
  console.log(`${formFactor} total: ${rendered[formFactor].totalShowcaseBytes} bytes`);
}
console.log(`combined showcase payload: ${combinedShowcaseBytes} bytes`);
console.log(`Rendered ${rendered.desktop.reel}`);
console.log(`Rendered ${rendered.mobile.reel}`);
console.log(`Rendered README snippet at ${markdownPath}`);
