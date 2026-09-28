import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/timeline-graph-shim.ts");
await import("../site/sample-case-shim.ts");
await import("../site/interchange-adapter-shim.ts");

const sample = globalThis.TimelineSampleCase;
const adapter = globalThis.TimelineInterchangeAdapter;

test("canonical Lūm interchange projects back to the legacy runtime shape without semantic ID drift", () => {
  const canonical = adapter.timelineToLumInterchange(sample, {
    projectKey: "classic-tales-runtime",
    savedAt: "2026-09-28T10:45:00.000Z",
  });
  const projected = adapter.lumInterchangeToTimeline(canonical.serialized, {
    title: sample.title,
  });

  assert.equal(projected.validation.valid, true);
  assert.deepEqual(
    projected.timeline.entities.map((entity) => entity.id).sort(),
    sample.entities.map((entity) => entity.id).sort(),
  );
  assert.deepEqual(
    projected.timeline.relationships.map((relationship) => relationship.id).sort(),
    sample.relationships.map((relationship) => relationship.id).sort(),
  );
  assert.deepEqual(
    projected.timeline.items.map((item) => item.id).sort(),
    sample.items.map((item) => item.id).sort(),
  );
  assert.deepEqual(
    projected.timeline.stories.map((story) => story.id),
    sample.stories.map((story) => story.id),
  );

  const originalById = new Map(sample.items.map((item) => [item.id, item]));
  for (const item of projected.timeline.items) {
    const original = originalById.get(item.id);
    assert.ok(original, item.id);
    assert.equal(item.kind, original.kind, item.id);
    assert.equal(item.start, original.start, item.id);
    assert.equal(item.end, original.end, item.id);
    assert.equal(item.categoryId, original.categoryId, item.id);
    assert.deepEqual(item.tags ?? [], original.tags ?? [], item.id);
    assert.deepEqual(item.presentation ?? {}, original.presentation ?? {}, item.id);
    assert.deepEqual(item.media ?? [], original.media ?? [], item.id);
    assert.deepEqual(item.relationChanges ?? [], original.relationChanges ?? [], item.id);
    assert.deepEqual(item.extensions ?? {}, original.extensions ?? {}, item.id);
  }
});

test("canonical runtime projection restores place presentation and legacy relationship initial state", () => {
  const canonical = adapter.timelineToLumInterchange(sample, {
    projectKey: "classic-tales-runtime",
    savedAt: "2026-09-28T10:45:00.000Z",
  });
  const { timeline } = adapter.lumInterchangeToTimeline(canonical.serialized);

  const originalPlaces = new Map(sample.places.map((place) => [place.id, place]));
  for (const place of timeline.places) {
    const original = originalPlaces.get(place.id);
    assert.ok(original, place.id);
    assert.equal(place.icon, original.icon, place.id);
    assert.equal(place.markerShape, original.markerShape, place.id);
    assert.deepEqual(place.geometry, original.geometry, place.id);
  }

  const originalRelationships = new Map(
    sample.relationships.map((relationship) => [relationship.id, relationship]),
  );
  for (const relationship of timeline.relationships) {
    const original = originalRelationships.get(relationship.id);
    assert.ok(original, relationship.id);
    assert.equal(relationship.initialState, original.initialState, relationship.id);
    assert.deepEqual(relationship.itemIds, original.itemIds, relationship.id);
  }
});

test("canonical runtime projection rejects occurrences without a displayable temporal start", () => {
  const canonical = adapter.timelineToLumInterchange(sample, {
    projectKey: "classic-tales-runtime",
    savedAt: "2026-09-28T10:45:00.000Z",
  });
  const document = JSON.parse(canonical.serialized);
  document.project.occurrences[0].time = null;

  assert.throws(
    () => adapter.lumInterchangeToTimeline(document),
    /temporal start/i,
  );
});

test("Load example crosses the canonical Lūm boundary instead of assigning the trusted sample global", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /function getSample\(\)[\s\S]*timelineToLumInterchange[\s\S]*lumInterchangeToTimeline/,
  );
  assert.doesNotMatch(
    source,
    /function getSample\(\)\s*\{\s*return globalThis\.TimelineSampleCase \|\| null;\s*\}/,
  );
  assert.match(
    source,
    /loadSample\.addEventListener\("click"[\s\S]*const sample = getSample\(\)[\s\S]*normalizeTimeline/,
  );
});
