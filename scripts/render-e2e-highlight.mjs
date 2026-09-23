import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? 'artifacts/e2e-media');
const workDir = path.join(outputRoot, '.render');
const gifsRoot = path.join(outputRoot, 'gifs');
const reelsDir = path.join(outputRoot, 'reels');
const markdownPath = path.join(outputRoot, 'README-showcase.md');
const manifestPath = path.join(outputRoot, 'manifest.json');
const ffmpeg = process.env.FFMPEG_BIN ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE_BIN ?? 'ffprobe';
const formFactors = ['desktop', 'mobile'];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspace,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffprobe,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { cwd: workspace, stdio: ['ignore', 'pipe', 'inherit'], env: process.env },
    );
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code !== 0) return reject(new Error(`${ffprobe} exited with ${code ?? signal}`));
      const duration = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(duration) || duration <= 0) {
        return reject(new Error(`Could not determine duration for ${filePath}`));
      }
      resolve(duration);
    });
  });
}

function assertManifest(manifest, formFactor) {
  if (manifest.formFactor !== formFactor) throw new Error(`Expected ${formFactor} manifest`);
  if (!Array.isArray(manifest.segments) || manifest.segments.length !== 5) {
    throw new Error(`${formFactor} manifest must contain exactly five showcase scenes`);
  }
}

async function renderFormFactor(formFactor, manifest) {
  const factorWorkDir = path.join(workDir, formFactor);
  const gifsDir = path.join(gifsRoot, formFactor);
  await mkdir(factorWorkDir, { recursive: true });
  await mkdir(gifsDir, { recursive: true });
  await mkdir(reelsDir, { recursive: true });

  const normalizeFilter = [
    `scale=${manifest.width}:${manifest.height}:force_original_aspect_ratio=decrease`,
    `pad=${manifest.width}:${manifest.height}:(ow-iw)/2:(oh-ih)/2:color=0x0b0c10`,
    'setsar=1',
    `fps=${manifest.fps}`,
    'format=yuv420p',
  ].join(',');

  const sequence = [];
  const gifRecords = [];

  for (const [index, segment] of manifest.segments.entries()) {
    const clipInput = path.resolve(workspace, segment.video);
    const stillInput = path.resolve(workspace, segment.screenshot);
    const clipOutput = path.join(factorWorkDir, `${String(index).padStart(2, '0')}-clip.mp4`);
    const stillOutput = path.join(factorWorkDir, `${String(index).padStart(2, '0')}-still.mp4`);
    const gifOutput = path.join(gifsDir, `${segment.name}.gif`);

    await run(ffmpeg, [
      '-y', '-i', clipInput, '-vf', normalizeFilter, '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', clipOutput,
    ]);

    await run(ffmpeg, [
      '-y', '-loop', '1', '-framerate', String(manifest.fps), '-i', stillInput,
      '-t', String(manifest.stillSeconds), '-vf', normalizeFilter, '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p', stillOutput,
    ]);

    await run(ffmpeg, [
      '-y',
      '-ss', String(segment.gifStartSeconds ?? 1.05),
      '-t', String(segment.gifDurationSeconds ?? 4.8),
      '-i', clipInput,
      '-filter_complex',
      `[0:v]fps=${manifest.gifFps},scale=${segment.gifWidth}:-2:flags=lanczos,split[gif][pal];[pal]palettegen=max_colors=${manifest.gifColors}:stats_mode=diff[palette];[gif][palette]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle[out]`,
      '-map', '[out]', '-loop', '0', gifOutput,
    ]);

    const gifStat = await stat(gifOutput);
    gifRecords.push({
      name: segment.name,
      path: path.relative(workspace, gifOutput),
      bytes: gifStat.size,
    });
    sequence.push(clipOutput, stillOutput);
  }

  const durations = [];
  for (const input of sequence) durations.push(await probeDuration(input));

  const args = ['-y'];
  for (const input of sequence) args.push('-i', input);
  const filters = sequence.map((_, index) => `[${index}:v]settb=AVTB,setpts=PTS-STARTPTS[v${index}]`);
  let currentLabel = 'v0';
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
    '-filter_complex', filters.join(';'),
    '-map', `[${currentLabel}]`,
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', reelPath,
  );
  await run(ffmpeg, args);

  return {
    ...manifest,
    reel: path.relative(workspace, reelPath),
    gifs: gifRecords,
    totalGifBytes: gifRecords.reduce((sum, gif) => sum + gif.bytes, 0),
  };
}

await rm(workDir, { recursive: true, force: true });
await rm(gifsRoot, { recursive: true, force: true });
await rm(reelsDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const sourceManifests = {};
for (const formFactor of formFactors) {
  const sourcePath = path.join(outputRoot, 'raw', formFactor, 'manifest.json');
  const manifest = JSON.parse(await readFile(sourcePath, 'utf8'));
  assertManifest(manifest, formFactor);
  sourceManifests[formFactor] = manifest;
}

const expectedNames = sourceManifests.desktop.segments.map((segment) => segment.name);
const mobileNames = sourceManifests.mobile.segments.map((segment) => segment.name);
if (JSON.stringify(expectedNames) !== JSON.stringify(mobileNames)) {
  throw new Error('Desktop and mobile showcase manifests must describe the same five feature intents');
}

const rendered = {};
for (const formFactor of formFactors) {
  rendered[formFactor] = await renderFormFactor(formFactor, sourceManifests[formFactor]);
}

const combinedGifBytes = formFactors.reduce(
  (sum, formFactor) => sum + rendered[formFactor].totalGifBytes,
  0,
);

const manifest = {
  project: 'Lūm',
  generatedAt: new Date().toISOString(),
  desktop: rendered.desktop,
  mobile: rendered.mobile,
  combinedGifBytes,
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

const pagesBase = process.env.SHOWCASE_BASE_URL ?? 'https://xtreemze.github.io/timeline/showcase';
const markdown = [
  '## Lūm in motion',
  '',
  'These showcases are generated from the real Chromium application exercised by CI. Desktop and mobile demonstrate the same five product capabilities with form-factor-appropriate interaction.',
  '',
  ...formFactors.flatMap((formFactor) => [
    `### ${formFactor === 'desktop' ? 'Desktop' : 'Mobile'}`,
    '',
    ...rendered[formFactor].segments.flatMap((segment) => [
      `#### ${segment.title}`,
      '',
      segment.description,
      '',
      `<img src="${pagesBase}/${formFactor}/${segment.name}.gif" alt="${segment.altText}" width="${segment.markdownWidth}">`,
      '',
    ]),
  ]),
].join('\n');

await writeFile(markdownPath, markdown);
await rm(workDir, { recursive: true, force: true });

for (const formFactor of formFactors) {
  console.log(`\n${formFactor.toUpperCase()} GIF sizes`);
  for (const gif of rendered[formFactor].gifs) {
    console.log(`${gif.name}: ${gif.bytes} bytes`);
  }
  console.log(`${formFactor} total: ${rendered[formFactor].totalGifBytes} bytes`);
}
console.log(`combined GIF payload: ${combinedGifBytes} bytes`);
console.log(`Rendered ${rendered.desktop.reel}`);
console.log(`Rendered ${rendered.mobile.reel}`);
console.log(`Rendered README snippet at ${markdownPath}`);
