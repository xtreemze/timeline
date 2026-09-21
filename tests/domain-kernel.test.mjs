import assert from "node:assert/strict";
import test from "node:test";

import {
  entityId,
  recordRelationship,
  relationshipId,
  sourceId,
  validateActionPredicate,
  validateEntity,
} from "../src/domain/index.ts";

const alice = {
  id: entityId("alice"),
  type: "person",
  name: "Alice",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};

const bob = {
  id: entityId("bob"),
  type: "person",
  name: "Bob",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};

const baseRelationship = {
  id: relationshipId("rel-1"),
  subjectId: alice.id,
  objectId: bob.id,
  predicate: "warned",
  itemIds: [],
  sourceIds: [sourceId("source-a")],
  confidence: 0.7,
  time: null,
  attributes: {},
};

test("domain entity rules reject event/action semantics", () => {
  assert.equal(validateEntity({ name: "Alice", type: "person" }).valid, true);
  assert.equal(validateEntity({ name: "Payment", type: "transaction" }).valid, false);
  assert.equal(validateEntity({ name: "Called Alice", type: "person" }).valid, false);
  assert.equal(
    validateEntity({ name: "Alice", type: "person", attributes: { latitude: 1 } }).valid,
    false,
  );
});

test("domain relationship predicates remain action-only", () => {
  assert.equal(validateActionPredicate("warned").valid, true);
  assert.equal(validateActionPredicate("transferredTo").valid, true);
  assert.equal(validateActionPredicate("relatedTo").valid, false);
  assert.equal(validateActionPredicate("warned at Stockholm").valid, false);
  assert.equal(validateActionPredicate("warnedAlice").valid, false);
});

test("recordRelationship creates a valid canonical fact", () => {
  const project = { schemaVersion: 3, entities: [alice, bob], relationships: [] };
  const result = recordRelationship(project, baseRelationship);
  assert.equal(result.status, "created");
  assert.equal(result.project.relationships.length, 1);
  assert.equal(project.relationships.length, 0, "command must not mutate the input project");
});

test("recordRelationship merges duplicate directed facts with provenance", () => {
  const project = { schemaVersion: 3, entities: [alice, bob], relationships: [baseRelationship] };
  const result = recordRelationship(project, {
    ...baseRelationship,
    id: relationshipId("rel-2"),
    sourceIds: [sourceId("source-b")],
    confidence: 0.9,
  });
  assert.equal(result.status, "merged");
  assert.deepEqual(result.relationship.sourceIds, [sourceId("source-a"), sourceId("source-b")]);
  assert.equal(result.relationship.confidence, 0.9);
  assert.equal(result.relationship.id, relationshipId("rel-1"));
});

test("recordRelationship rejects self loops, missing endpoints, and mirrored duplicates", () => {
  const project = { schemaVersion: 3, entities: [alice, bob], relationships: [baseRelationship] };

  assert.throws(() =>
    recordRelationship(project, {
      ...baseRelationship,
      id: relationshipId("self"),
      objectId: alice.id,
    }),
  );

  assert.throws(() =>
    recordRelationship(project, {
      ...baseRelationship,
      id: relationshipId("missing"),
      objectId: entityId("unknown"),
    }),
  );

  assert.throws(() =>
    recordRelationship(project, {
      ...baseRelationship,
      id: relationshipId("mirror"),
      subjectId: bob.id,
      objectId: alice.id,
    }),
  );
});
