import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const indexPath = resolve(dist, 'index.html');

async function requireFile(path) {
  await access(path, constants.R_OK);
}

await requireFile(indexPath);
const html = await readFile(indexPath, 'utf8');

if (/\b(?:src|href)=["'][^"']+\.ts(?:[?#][^"']*)?["']/i.test(html)) {
  throw new Error('GitHub Pages artifact still references raw TypeScript modules.');
}

const localReferences = [
  ...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi),
]
  .map((match) => match[1])
  .filter(
    (reference) =>
      !reference.startsWith('#') &&
      !reference.startsWith('data:') &&
      !reference.startsWith('http://') &&
      !reference.startsWith('https://') &&
      !reference.startsWith('//'),
  )
  .map((reference) => reference.split(/[?#]/, 1)[0])
  .filter(Boolean);

for (const reference of localReferences) {
  const relative = reference.replace(/^\.\//, '').replace(/^\//, '');
  await requireFile(resolve(dist, relative));
}

for (const runtimeFile of [
  'orb-graph.bundle.js',
  'evidence-extraction.bundle.js',
  'leaflet.bundle.js',
  'pdf.worker.mjs',
]) {
  await requireFile(resolve(dist, runtimeFile));
}

console.log(
  `Pages artifact validated: ${localReferences.length} local HTML references resolve and no raw TypeScript entrypoints remain.`,
);
