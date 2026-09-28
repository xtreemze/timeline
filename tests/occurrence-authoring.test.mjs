import assert from "node:assert/strict";
import test from "node:test";

import { authorOccurrence, updateOccurrence } from "../src/application/occurrence-authoring.ts";

function baseState() {
  return {
    version: 3,
    title: "Test",
    categories: [{ id: "incident", name: "Incident", color: "#667085" }],
    items: [],
    stories: [{ id: "story-1", title: "Story", description: "", itemIds: [], placeIds: [] }],
    entities: [
      {
        id: "alice",
        name: "Alice",
        type: "person",
        alternateNames: ["A. Example"],
        sourceIds: [],
        attributes: {},
      },
    ],
    places: [],
    relationships: [],
    evidence: [],
    custodyActions: [],
    reasoning: {},
  };
}

function dependencies(overrides = {}) {
  let sequence = 0;
  return {
    cloneState: (state) => structuredClone(state),
    newId: (kind) => `${kind}-${++sequence}`,
    validatePredicate: (predicate) =>
      predicate.trim() ? { valid: true } : { valid: false, message: "Predicate required." },
    validateEntity: (entity) =>
      entity.name.trim() ? { valid: true } : { valid: false, message: "Entity name required." },
    createPointPlace: ({ id, name, longitude, latitude, accuracyMeters }) => ({
      id,
      name,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      radiusMeters: accuracyMeters,
      icon: "place",
      markerShape: "pin",
    }),
    placeIdentity: (place) =>
      `${place.name.toLowerCase()}|${JSON.stringify(place.geometry ?? null)}`,
    findDuplicateRelationship: () => null,
    findMirroredRelationship: () => null,
    normalizeState: (state) => state,
    ...overrides,
  };
}

function editableState({ multipleItems = false, timeless = false } = {}) {
  const state = baseState();
  state.categories.push({ id: "decision", name: "Decision", color: "#b54708" });
  state.entities.push({
    id: "bob",
    name: "Bob",
    type: "person",
    alternateNames: [],
    sourceIds: ["source-bob"],
    attributes: { retained: true },
  });
  state.places.push(
    {
      id: "stockholm",
      name: "Stockholm",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
    },
    {
      id: "gothenburg",
      name: "Gothenburg",
      geometry: { type: "Point", coordinates: [11.9746, 57.7089] },
    },
  );

  const richExtent = timeless
    ? null
    : {
        type: "instant",
        start: {
          value: "2026-09-28",
          precision: "day",
          earliest: "2026-09-28T00:00:00Z",
          latest: "2026-09-28T23:59:59Z",
          sourceText: "late September 2026",
          timeZone: "Europe/Stockholm",
        },
        end: null,
      };
  const itemA = {
    id: "item-a",
    kind: "event",
    start: "2026-09-28",
    end: null,
    time: richExtent,
    title: "Alice meets Bob",
    description: "Preserve this description.",
    categoryId: "incident",
    media: [{ src: "photo.jpg", alt: "Evidence" }],
    tags: [{ label: "work" }],
    presentation: { variant: "hero-split" },
    relationChanges: [{ relationshipId: "other", operation: "activate" }],
    evidenceIds: ["evidence-a"],
    extensions: { retained: true },
  };
  state.items.push(itemA);
  if (multipleItems) {
    state.items.push({
      ...structuredClone(itemA),
      id: "item-b",
      title: "Custom chronology title",
      tags: [{ label: "secondary" }],
    });
  }
  state.relationships.push({
    id: "rel-1",
    subjectId: "alice",
    objectId: "bob",
    predicate: "meets",
    role: "witness",
    occurrenceType: "meeting",
    subjectContext: { role: "initiator" },
    objectContext: { role: "participant" },
    semanticMappings: [{ vocabulary: "example", term: "meeting" }],
    placeId: "stockholm",
    itemIds: multipleItems ? ["item-a", "item-b"] : ["item-a"],
    initialState: "inactive",
    time: richExtent,
    sourceIds: ["source-a"],
    confidence: 0.72,
    attributes: { retained: true },
  });
  return state;
}

function editRequest(overrides = {}) {
  return {
    relationshipId: "rel-1",
    itemId: "item-a",
    subject: { name: "@alice", properties: {} },
    object: { name: "@bob", properties: {} },
    predicate: "warns",
    longitude: null,
    latitude: null,
    accuracyMeters: null,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    subject: { name: "A. Example", properties: {} },
    object: { name: "Bob", properties: { type: "person" } },
    predicate: "meets",
    placeName: "Stockholm",
    longitude: 18.0686,
    latitude: 59.3293,
    accuracyMeters: 25,
    time: {
      extent: { type: "instant", start: { value: "2026-09-28T03:00:00Z" }, end: null },
      kind: "event",
      startValue: "2026-09-28T03:00:00Z",
      endValue: null,
    },
    categoryName: "Incident",
    tags: ["work"],
    activeStoryId: "story-1",
    ...overrides,
  };
}

test("authorOccurrence atomically resolves endpoints and creates one occurrence relationship", () => {
  const original = baseState();
  const result = authorOccurrence(original, request(), dependencies());

  assert.equal(original.entities.length, 1, "input state must remain immutable");
  assert.equal(original.items.length, 0);
  assert.equal(result.state.entities.length, 2);
  assert.equal(
    result.state.entities[0].id,
    "alice",
    "alternate-name match reuses canonical entity",
  );
  assert.equal(result.state.entities[1].name, "Bob");
  assert.equal(result.state.places.length, 1);
  assert.equal(result.state.items.length, 1);
  assert.equal(result.state.relationships.length, 1);
  assert.equal(result.state.relationships[0].subjectId, "alice");
  assert.equal(result.state.relationships[0].objectId, result.state.entities[1].id);
  assert.equal(result.state.relationships[0].placeId, result.state.places[0].id);
  assert.deepEqual(result.state.relationships[0].itemIds, [result.itemId]);
  assert.deepEqual(result.state.stories[0].itemIds, [result.itemId]);
  assert.deepEqual(result.state.items[0].tags, [{ label: "work" }]);
});

test("authorOccurrence rejects ambiguous endpoint names instead of guessing", () => {
  const state = baseState();
  state.entities.push({
    id: "alice-2",
    name: "Alice Two",
    type: "person",
    alternateNames: ["A. Example"],
    sourceIds: [],
    attributes: {},
  });

  assert.throws(() => authorOccurrence(state, request(), dependencies()), /ambiguous/i);
});

test("authorOccurrence reuses an existing place by explicit canonical ID", () => {
  const state = baseState();
  state.places.push({
    id: "stockholm",
    name: "Stockholm",
    geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
  });

  const result = authorOccurrence(
    state,
    request({ placeName: "@stockholm", longitude: null, latitude: null }),
    dependencies(),
  );

  assert.equal(result.state.places.length, 1);
  assert.equal(result.state.relationships[0].placeId, "stockholm");
});

test("authorOccurrence rejects duplicate and mirrored facts through the shared relationship contract", () => {
  const duplicateDeps = dependencies({
    findDuplicateRelationship: () => ({ id: "existing" }),
  });
  assert.throws(
    () => authorOccurrence(baseState(), request(), duplicateDeps),
    /duplicates canonical relationship/i,
  );

  const mirroredDeps = dependencies({
    findMirroredRelationship: () => ({ id: "reverse" }),
  });
  assert.throws(() => authorOccurrence(baseState(), request(), mirroredDeps), /reverse copy/i);
});

test("authorOccurrence rejects self-relations after canonical endpoint resolution", () => {
  assert.throws(
    () =>
      authorOccurrence(
        baseState(),
        request({ object: { name: "@alice", properties: {} } }),
        dependencies(),
      ),
    /two different entities/i,
  );
});

test("authorOccurrence stores semantic icon and color in canonical entity style", () => {
  const result = authorOccurrence(
    baseState(),
    request({
      object: {
        name: "Bob",
        properties: { type: "person", icon: "user", color: "#667085" },
      },
    }),
    dependencies(),
  );

  const bob = result.state.entities.find((entity) => entity.name === "Bob");
  assert.deepEqual(bob?.attributes, {
    style: {
      icon: "person",
      fillColor: "#667085",
    },
  });
});

test("authorOccurrence infers a semantic icon when a new entity has no explicit icon", () => {
  const result = authorOccurrence(
    baseState(),
    request({
      object: {
        name: "The Wolf",
        properties: { type: "person" },
      },
    }),
    dependencies(),
  );

  const wolf = result.state.entities.find((entity) => entity.name === "The Wolf");
  assert.equal(wolf?.attributes?.style?.icon, "wolf");
});

test("authorOccurrence rejects unsupported semantic icons before mutation", () => {
  const state = baseState();
  assert.throws(
    () =>
      authorOccurrence(
        state,
        request({
          object: {
            name: "Bob",
            properties: { type: "person", icon: "made-up-glyph" },
          },
        }),
        dependencies(),
      ),
    /unsupported semantic icon/i,
  );
  assert.equal(state.entities.length, 1);
});

test("updateOccurrence edits the canonical relationship in place and preserves unrepresented metadata", () => {
  const original = editableState();
  const originalRelationship = structuredClone(original.relationships[0]);
  const originalItem = structuredClone(original.items[0]);

  const result = updateOccurrence(original, editRequest(), dependencies());

  assert.equal(original.relationships[0].predicate, "meets", "input state remains immutable");
  assert.equal(result.relationshipId, "rel-1");
  assert.equal(result.state.relationships.length, 1);
  const relationship = result.state.relationships[0];
  assert.equal(relationship.id, "rel-1");
  assert.equal(relationship.predicate, "warns");
  assert.equal(relationship.role, originalRelationship.role);
  assert.equal(relationship.occurrenceType, originalRelationship.occurrenceType);
  assert.deepEqual(relationship.subjectContext, originalRelationship.subjectContext);
  assert.deepEqual(relationship.objectContext, originalRelationship.objectContext);
  assert.deepEqual(relationship.semanticMappings, originalRelationship.semanticMappings);
  assert.equal(relationship.initialState, originalRelationship.initialState);
  assert.deepEqual(relationship.sourceIds, originalRelationship.sourceIds);
  assert.equal(relationship.confidence, originalRelationship.confidence);
  assert.deepEqual(relationship.attributes, originalRelationship.attributes);
  assert.deepEqual(
    relationship.time,
    originalRelationship.time,
    "rich temporal metadata is preserved when time was not edited",
  );

  const item = result.state.items[0];
  assert.equal(
    item.title,
    "Alice warns Bob",
    "derived titles follow canonical endpoint/action edits",
  );
  assert.equal(item.description, originalItem.description);
  assert.deepEqual(item.media, originalItem.media);
  assert.deepEqual(item.presentation, originalItem.presentation);
  assert.deepEqual(item.relationChanges, originalItem.relationChanges);
  assert.deepEqual(item.evidenceIds, originalItem.evidenceIds);
  assert.deepEqual(item.extensions, originalItem.extensions);
  assert.deepEqual(item.tags, originalItem.tags);
  assert.deepEqual(item.time, originalItem.time);
});

test("updateOccurrence updates explicit place, time, category, and tags only for the exact item", () => {
  const state = editableState();
  const replacementTime = {
    extent: {
      type: "interval",
      start: { value: "2026-10-01T10:00:00Z" },
      end: { value: "2026-10-01T11:00:00Z" },
    },
    kind: "range",
    startValue: "2026-10-01T10:00:00Z",
    endValue: "2026-10-01T11:00:00Z",
  };

  const result = updateOccurrence(
    state,
    editRequest({
      predicate: "calls",
      placeName: "@gothenburg",
      time: replacementTime,
      categoryName: "Decision",
      tags: [],
    }),
    dependencies(),
  );

  const relationship = result.state.relationships[0];
  const item = result.state.items[0];
  assert.equal(relationship.placeId, "gothenburg");
  assert.deepEqual(relationship.time, replacementTime.extent);
  assert.equal(item.categoryId, "decision");
  assert.deepEqual(item.tags, []);
  assert.equal(item.kind, "range");
  assert.equal(item.start, replacementTime.startValue);
  assert.equal(item.end, replacementTime.endValue);
  assert.deepEqual(item.time, replacementTime.extent);
});

test("updateOccurrence requires exact chronology context before changing item-level fields on multi-item relationships", () => {
  const state = editableState({ multipleItems: true });

  assert.throws(
    () => updateOccurrence(state, editRequest({ itemId: null, tags: ["changed"] }), dependencies()),
    /multiple chronology items/i,
  );

  const result = updateOccurrence(
    state,
    editRequest({ itemId: "item-b", tags: ["changed"] }),
    dependencies(),
  );
  assert.deepEqual(result.state.items.find((item) => item.id === "item-a")?.tags, [
    { label: "work" },
  ]);
  assert.deepEqual(result.state.items.find((item) => item.id === "item-b")?.tags, [
    { label: "changed" },
  ]);
  assert.equal(
    result.state.items.find((item) => item.id === "item-a")?.title,
    "Alice warns Bob",
    "derived titles update across every linked chronology item",
  );
  assert.equal(
    result.state.items.find((item) => item.id === "item-b")?.title,
    "Custom chronology title",
    "custom item titles are not overwritten",
  );
});

test("updateOccurrence preserves timeless relationships without manufacturing timeline time", () => {
  const state = editableState({ timeless: true });
  state.relationships[0].itemIds = [];
  state.items = [];

  const result = updateOccurrence(
    state,
    editRequest({ itemId: null, predicate: "calls" }),
    dependencies(),
  );

  assert.equal(result.state.relationships[0].time, null);
  assert.deepEqual(result.state.relationships[0].itemIds, []);
  assert.equal(result.state.items.length, 0);
});

test("updateOccurrence rejects duplicate edits while excluding the stable edit target", () => {
  const seenTargetIds = [];
  const deps = dependencies({
    findDuplicateRelationship: (_relationship, _relationships, relationshipId) => {
      seenTargetIds.push(relationshipId);
      return { id: "rel-existing" };
    },
  });

  assert.throws(
    () => updateOccurrence(editableState(), editRequest(), deps),
    /duplicate canonical relationship/i,
  );
  assert.deepEqual(seenTargetIds, ["rel-1"]);
});

test("updateOccurrence refuses to make a linked chronology occurrence timeless implicitly", () => {
  assert.throws(
    () => updateOccurrence(editableState(), editRequest({ time: null }), dependencies()),
    /linked chronology item requires time/i,
  );
});
