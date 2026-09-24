import { readFile, readdir, stat } from "node:fs/promises";

const MAX_JS_CHUNK_BYTES = 500_000;
const distUrl = new URL("../dist/", import.meta.url);
const assetsUrl = new URL("./assets/", distUrl);
const manifestUrl = new URL("./.vite/manifest.json", distUrl);

const assetEntries = await readdir(assetsUrl, { withFileTypes: true });
const javascriptChunks = assetEntries.filter(
  (entry) => entry.isFile() && entry.name.endsWith(".js"),
);

const oversized = [];
for (const entry of javascriptChunks) {
  const info = await stat(new URL(entry.name, assetsUrl));
  if (info.size > MAX_JS_CHUNK_BYTES) {
    oversized.push({ name: entry.name, bytes: info.size });
  }
}

if (oversized.length > 0) {
  const detail = oversized.map(({ name, bytes }) => `${name}: ${bytes} bytes`).join("\n");
  throw new Error(
    `Production JavaScript chunks must stay at or below ${MAX_JS_CHUNK_BYTES} bytes:\n${detail}`,
  );
}

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const entry = Object.values(manifest).find((record) => record?.isEntry);
if (!entry || typeof entry.file !== "string") {
  throw new Error("Vite manifest does not contain a production entry chunk.");
}

const recordsByKey = new Map(Object.entries(manifest));
const staticFiles = new Set();

function visit(record) {
  if (!record || typeof record !== "object") return;
  if (typeof record.file === "string") staticFiles.add(record.file);
  for (const importKey of record.imports ?? []) {
    visit(recordsByKey.get(importKey));
  }
}

visit(entry);

const heavyweightInitialChunks = [...staticFiles].filter((file) =>
  /(?:pdf-runtime|world-rendering|legacy-graph)/.test(file),
);
if (heavyweightInitialChunks.length > 0) {
  throw new Error(
    `Heavyweight optional runtimes leaked into the initial static import closure: ${heavyweightInitialChunks.join(", ")}`,
  );
}

console.log(
  `Bundle budget passed: ${javascriptChunks.length} JS chunks, no chunk above ${MAX_JS_CHUNK_BYTES} bytes.`,
);
