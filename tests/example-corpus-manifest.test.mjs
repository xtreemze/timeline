import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/timeline-graph-shim.ts");
await import("../site/sample-case-shim.ts");

const manifest = JSON.parse(
  await readFile(new URL("../examples/classic-tales/manifest.json", import.meta.url), "utf8"),
);
const sample = globalThis.TimelineSampleCase;

test("classic tales manifest has one unique entry for every shipped example story", () => {
  assert.ok(sample);
  assert.equal(manifest.format, "lum-example-corpus");
  assert.equal(manifest.version, 1);

  const manifestIds = manifest.stories.map((story) => story.id);
  const sampleIds = sample.stories.map((story) => story.id);

  assert.equal(new Set(manifestIds).size, manifestIds.length);
  assert.deepEqual([...manifestIds].sort(), [...sampleIds].sort());
  assert.equal(manifestIds.length, 9);
});

test("classic tales manifest preserves current story titles and source ownership", () => {
  const storyById = new Map(sample.stories.map((story) => [story.id, story]));

  for (const entry of manifest.stories) {
    const story = storyById.get(entry.id);
    assert.ok(story, `Missing shipped story ${entry.id}`);
    assert.equal(entry.title, story.title);
    assert.ok(
      manifest.project.currentSourceFiles.includes(entry.sourceFile),
      `Unknown source file for ${entry.id}`,
    );
    assert.match(entry.targetDirectory, /^examples\/classic-tales\/[a-z0-9-]+$/);
    assert.equal(
      entry.migrationStatus,
      entry.id === "story-three-little-pigs" ? "pilot" : "legacy-source",
    );
  }
});

test("classic tales manifest target directories are unique", () => {
  const targets = manifest.stories.map((story) => story.targetDirectory);
  assert.equal(new Set(targets).size, targets.length);
});
