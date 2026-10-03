import assert from "node:assert/strict";
import test from "node:test";

import { createSemanticGraphIndex } from "../src/application/semantic-graph-index.ts";
import { entityId, occurrenceId, relationshipId } from "../src/domain/ids.ts";
import { recordOccurrence } from "../src/domain/project.ts";

function entity(id, type = "person") {
  return {
    id: entityId(id),
    type,
    name: id,
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
}

function relationship(id, subjectId, objectId, predicate) {
  return {
    id: relationshipId(id),
    subjectId: entityId(subjectId),
    objectId: entityId(objectId),
    predicate,
    itemIds: [],
    sourceIds: [],
    confidence: null,
    time: null,
    attributes: {},
  };
}

function occurrence(id, occurrenceType, participantContexts, relationshipIds = []) {
  return {
    id: occurrenceId(id),
    occurrenceType,
    time: null,
    participantContexts,
    relationshipIds: relationshipIds.map(relationshipId),
    sourceIds: [],
    confidence: null,
    attributes: {},
  };
}

const CASES = Object.freeze([
  Object.freeze({
    name: "birth/family",
    entities: [entity("child"), entity("mother"), entity("father")],
    relationships: [],
    occurrence: occurrence("birth-1", "birth", [
      { entityId: entityId("child"), roleType: "born-person" },
      { entityId: entityId("mother"), roleType: "parent" },
      { entityId: entityId("father"), roleType: "parent" },
    ]),
  }),
  Object.freeze({
    name: "meeting",
    entities: [entity("alice"), entity("bob")],
    relationships: [],
    occurrence: occurrence("meeting-1", "meeting", [
      { entityId: entityId("alice"), roleType: "participant" },
      { entityId: entityId("bob"), roleType: "participant" },
    ]),
  }),
  Object.freeze({
    name: "organizational formation",
    entities: [entity("new-co", "organization"), entity("founder-a"), entity("founder-b")],
    relationships: [],
    occurrence: occurrence("formation-1", "formation", [
      { entityId: entityId("new-co"), roleType: "formed-group" },
      { entityId: entityId("founder-a"), roleType: "founder" },
      { entityId: entityId("founder-b"), roleType: "founder" },
    ]),
  }),
  Object.freeze({
    name: "multi-party transaction",
    entities: [
      entity("buyer", "organization"),
      entity("seller", "organization"),
      entity("asset", "object"),
      entity("broker"),
    ],
    relationships: [
      relationship("acquires", "buyer", "asset", "acquired"),
      relationship("transfers", "seller", "asset", "transferred"),
      relationship("brokers", "broker", "buyer", "represented"),
    ],
    occurrence: occurrence(
      "transaction-1",
      "acquisition",
      [
        { entityId: entityId("buyer"), roleType: "acquirer" },
        { entityId: entityId("seller"), roleType: "transferor" },
        { entityId: entityId("asset"), roleType: "transferred-entity" },
        {
          entityId: entityId("broker"),
          roleType: "representative",
          representedEntityId: entityId("buyer"),
        },
      ],
      ["acquires", "transfers", "brokers"],
    ),
  }),
]);

for (const fixture of CASES) {
  test(`${fixture.name} standalone occurrence validates without becoming semantic graph identity`, () => {
    const base = {
      schemaVersion: 2,
      entities: fixture.entities,
      relationships: fixture.relationships,
      occurrences: [],
    };

    const recorded = recordOccurrence(base, fixture.occurrence);
    assert.equal(recorded.status, "created");
    assert.equal(recorded.project.occurrences?.length, 1);
    assert.equal(recorded.project.occurrences?.[0]?.id, fixture.occurrence.id);

    const graph = createSemanticGraphIndex(recorded.project);
    const snapshot = graph.snapshot();

    assert.deepEqual(
      snapshot.entityIds,
      fixture.entities.map((candidate) => String(candidate.id)).sort(),
      "only durable entities become semantic graph nodes",
    );
    assert.deepEqual(
      snapshot.relationships.map((candidate) => candidate.id),
      fixture.relationships.map((candidate) => String(candidate.id)).sort(),
      "only directed child facts become semantic graph edges",
    );
    assert.equal(
      snapshot.entityIds.includes(String(fixture.occurrence.id)),
      false,
      "standalone occurrence identity must not become a graph node",
    );
    assert.equal(
      snapshot.relationships.some((candidate) => candidate.id === String(fixture.occurrence.id)),
      false,
      "standalone occurrence identity must not become a graph edge",
    );
  });
}
