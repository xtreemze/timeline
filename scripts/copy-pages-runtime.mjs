import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const site = resolve(root, 'site');
const dist = resolve(root, 'dist');

const runtimeFiles = [
  'orb-graph.bundle.js',
  'evidence-extraction.bundle.js',
  'leaflet.bundle.js',
  'pdf.worker.mjs',
];

await mkdir(dist, { recursive: true });

for (const file of runtimeFiles) {
  await cp(resolve(site, file), resolve(dist, file), { force: true });
}

await cp(resolve(site, 'images'), resolve(dist, 'images'), {
  recursive: true,
  force: true,
});
