import assert from "node:assert/strict";
import test from "node:test";

import { compileExampleStoryProject } from "../src/application/example-story-compiler.ts";
import { validateProjectInterchange } from "../src/application/project-interchange.ts";

await import("../site/timeline-graph-shim.ts");
await import("../site/sample-case-shim.ts");

const sample = globalThis.TimelineSampleCase;
const storyId = "story-three-little-pigs";
const savedAt = "2026-09-28T09:00:00.000Z";

test("Three Little Pigs compiles from the final shipped sample into isolated canonical Lūm", () => {
  assert.ok(sample);
  const compiled = compileExampleStoryProject(sample, storyId, { savedAt });
  const legacyStory = sample.stories.find((story) => story.id === storyId);
  assert.ok(legacyStory);

  assert.deepEqual(
    compiled.snapshot.project.stories?.[0]?.occurrenceIds.map(String),
    legacyStory.itemIds,
  );
  assert.deepEqual(
    compiled.snapshot.project.occurrences?.map((occurrence) => String(occurrence.id)),
    legacyStory.itemIds,
  );
  assert.equal(compiled.snapshot.project.stories?.[0]?.id, storyId);

  for (const entity of compiled.snapshot.project.entities) {
    assert.doesNotMatch(String(entity.id), /snow|cinderella/i);
  }
  for (const occurrence of compiled.snapshot.project.occurrences ?? []) {
    assert.doesNotMatch(String(occurrence.id), /snow|cinderella/i);
  }
});

test("compiled pilot is reference-closed across relationships, occurrences, places, sources and story membership", () => {
  const { snapshot } = compileExampleStoryProject(sample, storyId, { savedAt });
  const project = snapshot.project;
  const entityIds = new Set(project.entities.map((record) => String(record.id)));
  const relationshipIds = new Set(project.relationships.map((record) => String(record.id)));
  const occurrenceIds = new Set((project.occurrences ?? []).map((record) => String(record.id)));
  const placeIds = new Set((project.places ?? []).map((record) => String(record.id)));
  const sourceIds = new Set((project.sources ?? []).map((record) => String(record.id)));

  for (const relationship of project.relationships) {
    assert.ok(entityIds.has(String(relationship.subjectId)));
    assert.ok(entityIds.has(String(relationship.objectId)));
    for (const occurrenceId of relationship.itemIds) {
      assert.ok(occurrenceIds.has(String(occurrenceId)));
    }
    if (relationship.placeId) assert.ok(placeIds.has(String(relationship.placeId)));
    for (const sourceId of relationship.sourceIds) assert.ok(sourceIds.has(String(sourceId)));
  }

  for (const occurrence of project.occurrences ?? []) {
    for (const participant of occurrence.participantContexts) {
      assert.ok(entityIds.has(String(participant.entityId)));
    }
    for (const relationshipId of occurrence.relationshipIds) {
      assert.ok(relationshipIds.has(String(relationshipId)));
    }
    if (occurrence.placeId) assert.ok(placeIds.has(String(occurrence.placeId)));
    for (const sourceId of occurrence.sourceIds) assert.ok(sourceIds.has(String(sourceId)));
  }

  const [story] = project.stories ?? [];
  assert.ok(story);
  for (const occurrenceId of story.occurrenceIds) assert.ok(occurrenceIds.has(String(occurrenceId)));
  for (const placeId of story.placeIds) assert.ok(placeIds.has(String(placeId)));
});

test("pilot serialization is deterministic and passes the production Lūm validator", () => {
  const first = compileExampleStoryProject(sample, storyId, { savedAt });
  const second = compileExampleStoryProject(sample, storyId, { savedAt });

  assert.equal(first.serialized, second.serialized);
  const validation = validateProjectInterchange(first.serialized);
  assert.equal(validation.valid, true);
  if (!validation.valid) return;
  assert.equal(validation.snapshot.project.stories?.[0]?.id, storyId);
});

test("pilot does not serialize renderer or camera state into canonical records", () => {
  const { serialized } = compileExampleStoryProject(sample, storyId, { savedAt });
  const parsed = JSON.parse(serialized);
  assert.equal("camera" in parsed.project, false);
  assert.equal("selection" in parsed.project, false);
  assert.equal("force" in parsed.project, false);
  assert.equal("cluster" in parsed.project, false);
});
