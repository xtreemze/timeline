import { readdir, readFile, stat } from "node:fs/promises";

const MAX_JS_CHUNK_BYTES = 500_000;
const FORBIDDEN_RUNTIME_IDENTIFIERS = Object.freeze(["WORLD_FLOATING_GRAPH_DETAIL_ZOOM"]);
const distUrl = new URL("../dist/", import.meta.url);
const assetsUrl = new URL("./assets/", distUrl);
const manifestUrl = new URL("./.vite/manifest.json", distUrl);

const assetEntries = await readdir(assetsUrl, { withFileTypes: true });
const javascriptChunks = assetEntries.filter(
  (entry) => entry.isFile() && entry.name.endsWith(".js"),
);

const oversized = [];
const leakedRuntimeIdentifiers = [];
for (const entry of javascriptChunks) {
  const chunkUrl = new URL(entry.name, assetsUrl);
  const [info, source] = await Promise.all([stat(chunkUrl), readFile(chunkUrl, "utf8")]);
  if (info.size > MAX_JS_CHUNK_BYTES) {
    oversized.push({ name: entry.name, bytes: info.size });
  }
  for (const identifier of FORBIDDEN_RUNTIME_IDENTIFIERS) {
    if (source.includes(identifier)) {
      leakedRuntimeIdentifiers.push({ name: entry.name, identifier });
    }
  }
}

if (oversized.length > 0) {
  const detail = oversized.map(({ name, bytes }) => `${name}: ${bytes} bytes`).join("\n");
  throw new Error(
    `Production JavaScript chunks must stay at or below ${MAX_JS_CHUNK_BYTES} bytes:\n${detail}`,
  );
}

if (leakedRuntimeIdentifiers.length > 0) {
  const detail = leakedRuntimeIdentifiers
    .map(({ name, identifier }) => `${name}: ${identifier}`)
    .join("\n");
  throw new Error(
    `Production bundle contains removed runtime identifiers that can crash lazy modules:\n${detail}`,
  );
}

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const entry = Object.values(manifest).find((record) => record?.isEntry);
if (!entry || typeof entry.file !== "string") {
  throw new Error("Vite manifest does not contain a production entry chunk.");
}

const recordsByKey = new Map(Object.entries(manifest));
const staticFiles = new Set();
const visitedRecords = new Set();

function visit(record) {
  if (!record || typeof record !== "object" || visitedRecords.has(record)) return;
  visitedRecords.add(record);
  if (typeof record.file === "string") staticFiles.add(record.file);
  for (const importKey of record.imports ?? []) {
    visit(recordsByKey.get(importKey));
  }
}

visit(entry);

const heavyweightInitialChunks = [...staticFiles].filter((file) =>
  /(?:pdf-runtime|world-rendering|legacy-graph|webgpu-adapter)/.test(file),
);
if (heavyweightInitialChunks.length > 0) {
  throw new Error(
    `Heavyweight optional runtimes leaked into the initial static import closure: ${heavyweightInitialChunks.join(", ")}`,
  );
}

console.log(
  `Bundle budget passed: ${javascriptChunks.length} JS chunks, no chunk above ${MAX_JS_CHUNK_BYTES} bytes.`,
);
