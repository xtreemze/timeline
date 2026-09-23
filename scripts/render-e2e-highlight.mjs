import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const workspace = process.cwd();
const outputRoot = path.resolve(process.env.E2E_MEDIA_DIR ?? 'artifacts/e2e-media');
const manifestPath = path.join(outputRoot, 'manifest.json');
const workDir = path.join(outputRoot, '.render');
const finalPath = path.join(outputRoot, 'lum-e2e-highlight.mp4');
const ffmpeg = process.env.FFMPEG_BIN ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE_BIN ?? 'ffprobe';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspace,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffprobe,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { cwd: workspace, stdio: ['ignore', 'pipe', 'inherit'], env: process.env },
    );

    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code !== 0) {
        reject(new Error(`${ffprobe} exited with ${code ?? signal}`));
        return;
      }
      const duration = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error(`Could not determine duration for ${filePath}`));
        return;
      }
      resolve(duration);
    });
  });
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const width = Number(manifest.width);
const height = Number(manifest.height);
const fps = Number(manifest.fps);
const transition = Number(manifest.transitionSeconds);
const stillSeconds = Number(manifest.stillSeconds);

if (!Array.isArray(manifest.segments) || manifest.segments.length === 0) {
  throw new Error('Highlight manifest has no recorded segments.');
}

await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const normalizeFilter = [
  `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
  `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x0b0c10`,
  'setsar=1',
  `fps=${fps}`,
  'format=yuv420p',
].join(',');

const sequence = [];

for (const [index, segment] of manifest.segments.entries()) {
  const clipInput = path.resolve(workspace, segment.video);
  const stillInput = path.resolve(workspace, segment.screenshot);
  const clipOutput = path.join(workDir, `${String(index).padStart(2, '0')}-clip.mp4`);
  const stillOutput = path.join(workDir, `${String(index).padStart(2, '0')}-still.mp4`);

  await run(ffmpeg, [
    '-y',
    '-i',
    clipInput,
    '-vf',
    normalizeFilter,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    clipOutput,
  ]);

  await run(ffmpeg, [
    '-y',
    '-loop',
    '1',
    '-framerate',
    String(fps),
    '-i',
    stillInput,
    '-t',
    String(stillSeconds),
    '-vf',
    normalizeFilter,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    stillOutput,
  ]);

  sequence.push(clipOutput, stillOutput);
}

const durations = [];
for (const input of sequence) durations.push(await probeDuration(input));

const ffmpegArgs = ['-y'];
for (const input of sequence) ffmpegArgs.push('-i', input);

const filters = sequence.map(
  (_, index) => `[${index}:v]settb=AVTB,setpts=PTS-STARTPTS[v${index}]`,
);

let currentLabel = 'v0';
let cumulativeDuration = durations[0];

for (let index = 1; index < sequence.length; index += 1) {
  const nextLabel = `x${index}`;
  const offset = Math.max(0.01, cumulativeDuration - transition);
  filters.push(
    `[${currentLabel}][v${index}]xfade=transition=fade:duration=${transition.toFixed(3)}:offset=${offset.toFixed(3)}[${nextLabel}]`,
  );
  currentLabel = nextLabel;
  cumulativeDuration += durations[index] - transition;
}

ffmpegArgs.push(
  '-filter_complex',
  filters.join(';'),
  '-map',
  `[${currentLabel}]`,
  '-an',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '19',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  finalPath,
);

await run(ffmpeg, ffmpegArgs);
await rm(workDir, { recursive: true, force: true });

console.log(`Rendered ${finalPath}`);
