import assert from "node:assert/strict";
import test from "node:test";

import { authorOccurrence } from "../src/application/occurrence-authoring.ts";

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
