import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

globalThis.document = { baseURI: "https://example.test/" };
await import("../site/evidence-store-shim.ts");

const evidence = globalThis.TimelineEvidence;

test("image evidence and extraction provenance survive normalization", () => {
  const record = evidence.normalizeRecord({
    id: "image-a",
    type: "image",
    title: "Photographed note",
    file: {
      blobKey: "evidence:image-a",
      name: "note.jpg",
      mimeType: "image/jpeg",
      size: 2048,
    },
    extraction: {
      schemaVersion: "timeline-evidence-extraction-v1",
      status: "complete",
      mimeType: "image/jpeg",
      generatedAt: "2026-09-21T00:00:00Z",
      tool: { name: "Timeline Evidence Extraction", version: "1" },
      segments: [
        {
          id: "image-1",
          locator: { kind: "image", index: 1 },
          method: "text-detector",
          text: "Call Bob at 09:30",
          confidence: null,
        },
      ],
      unresolved: [],
    },
  });

  assert.equal(record.type, "image");
  assert.equal(record.file.mimeType, "image/jpeg");
  assert.equal(record.extraction.segments[0].locator.kind, "image");
  assert.equal(record.extraction.segments[0].text, "Call Bob at 09:30");
});

test("deployed build recreates evidence extraction bundle and PDF worker", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts["build:evidence"], /evidence-extraction-entry\.js/);
  assert.match(pkg.scripts["build:evidence"], /pdf\.worker\.mjs/);
  assert.match(pkg.scripts.build, /build:evidence/);
});

test("visible extraction and inference controls are wired to application handlers", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="item-inference-run"/);
  assert.match(html, /class="button secondary evidence-extract-text"/);
  assert.match(
    app,
    /itemInferenceRun:\s*requiredElement<HTMLButtonElement>\("#item-inference-run"\)/,
  );
  assert.match(app, /extractText:\s*row\.querySelector\("\.evidence-extract-text"\)/);
  assert.match(app, /parts\.extractText\?\.addEventListener\("click"/);
  assert.match(app, /itemInferenceRun\?\.addEventListener\("click"/);
  assert.match(app, /evidenceExtraction\.extract/);
  assert.match(app, /graphInference\.infer/);
  assert.match(app, /graphInference\.reconcileProposal/);
});

test("inference remains reviewable and stale proposals cannot mutate canonical state", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /data-inference-relationship/);
  assert.match(app, /selectedInferenceRelationshipKeys/);
  assert.match(app, /graphInference\.fingerprint\(currentInput\)/);
  assert.match(app, /itemInferenceDraft\.fingerprint !== currentFingerprint/);
  assert.match(app, /graphInference\.applyProposal\(/);
  assert.match(app, /state = normalizeTimeline\(draft, \{ strictGraph: true \}\)/);
  assert.doesNotMatch(app, /graphInference\.infer[\s\S]{0,1800}state\.relationships\.push/);
});

test("app migration preserves the established default category fallback", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  for (const id of [
    "incident",
    "witness",
    "communication",
    "evidence",
    "document",
    "decision",
    "transaction",
    "observation",
  ]) {
    assert.match(app, new RegExp(`id: ["']${id}["']`));
  }
  assert.match(
    app,
    /categories:\s*DEFAULT_CATEGORIES\.map\(\(category\)\s*=>\s*\(\{\s*\.\.\.category\s*\}\)\)/,
  );
});

test("story place selections are normalized, edited, and saved", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="story-place-picker"/);
  assert.match(app, /storyPlacePicker:\s*requiredElement<HTMLElement>\("#story-place-picker"\)/);
  assert.match(app, /let storyDraftPlaceIds:\s*string\[\]\s*=\s*\[\]/);
  assert.match(app, /placeIds:\s*\[\.\.\.storyDraftPlaceIds\]/);
  assert.match(app, /storyDraftPlaceIds = \[\.\.\.\(story\.placeIds \|\| \[\]\)\]/);
  assert.match(app, /normalizedPlaceIds/);
});

test("evidence form accepts images and preserves extracted provenance", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /Evidence uploads must be PDF or image files/);
  assert.match(app, /mime\.startsWith\("image\/"\)/);
  assert.match(app, /evidenceExtractionDrafts\.get\(id\)/);
  assert.match(app, /extraction,/);
  assert.match(app, /existing\?\.extraction/);
});
