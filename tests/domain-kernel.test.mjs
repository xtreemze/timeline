import assert from "node:assert/strict";
import test from "node:test";

import {
  entityId,
  occurrenceTypeDefinition,
  recordRelationship,
  relationshipFactKey,
  relationshipId,
  sourceId,
  validateActionPredicate,
  validateEntity,
} from "../src/domain/index.ts";
import { projectRelationshipMatrix } from "../src/projection/relationship-matrix.ts";

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

test("actor identity metadata stays canonical while biographical history stays occurrence-backed", () => {
  assert.equal(
    validateEntity({
      name: "Alice",
      type: "person",
      identifiers: [{ scheme: "isni", value: "000000012146438X" }],
      appellations: [
        { value: "Alice Example", kind: "legal", languageTag: "en", sourceIds: ["source-a"] },
      ],
      semanticMappings: [
        { scheme: "ISO 21127", version: "2023", identifier: "E21", relation: "exact" },
      ],
    }).valid,
    true,
  );
  assert.equal(
    validateEntity({ name: "Alice", type: "person", attributes: { employer: "Example Corp" } }).valid,
    false,
  );
  assert.equal(
    validateEntity({ name: "Alice", type: "person", identifiers: [{ scheme: "isni", value: "" }] })
      .valid,
    false,
  );
});

test("occurrence taxonomy maps core life and organization events without owning predicates", () => {
  assert.equal(occurrenceTypeDefinition("birth")?.externalMappings[0]?.identifier, "E67");
  assert.equal(occurrenceTypeDefinition("formation")?.externalMappings[0]?.identifier, "E66");
  assert.equal(occurrenceTypeDefinition("employment")?.semanticParent, "activity");
});

test("contextual capacity is part of fact identity", () => {
  const company = {
    id: entityId("company-a"),
    type: "organization",
    name: "Company A",
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
  const agreement = {
    id: entityId("agreement"),
    type: "document",
    name: "Agreement",
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
  const personally = {
    ...baseRelationship,
    id: relationshipId("signed-personally"),
    objectId: agreement.id,
    predicate: "signed",
    occurrenceType: "activity",
  };
  const asDirector = {
    ...personally,
    id: relationshipId("signed-as-director"),
    subjectContext: {
      roleType: "director",
      representedEntityId: company.id,
      organizationId: company.id,
      authoritySourceIds: [sourceId("source-authority")],
      externalMappings: [
        { scheme: "ISO 5009", version: "2022", identifier: "director", relation: "related" },
      ],
    },
  };

  assert.notEqual(relationshipFactKey(personally), relationshipFactKey(asDirector));

  const project = {
    schemaVersion: 3,
    entities: [alice, bob, company, agreement],
    relationships: [],
  };
  const first = recordRelationship(project, personally);
  const second = recordRelationship(first.project, asDirector);
  assert.equal(second.status, "created");
  assert.equal(second.project.relationships.length, 2);

  assert.throws(() =>
    recordRelationship(project, {
      ...asDirector,
      id: relationshipId("missing-represented"),
      subjectContext: {
        roleType: "director",
        representedEntityId: entityId("missing-company"),
      },
    }),
  );
});

test("place and role context distinguish otherwise identical occurrences", () => {
  const base = {
    ...baseRelationship,
    predicate: "signed",
    role: "witness",
  };
  assert.notEqual(
    relationshipFactKey({ ...base, placeId: "stockholm" }),
    relationshipFactKey({ ...base, placeId: "copenhagen" }),
  );
  assert.notEqual(
    relationshipFactKey(base),
    relationshipFactKey({ ...base, role: "director" }),
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

test("relationship matrix preserves directed topology and deterministic entity ordering", () => {
  const project = {
    schemaVersion: 3,
    entities: [bob, alice],
    relationships: [
      baseRelationship,
      {
        ...baseRelationship,
        id: relationshipId("rel-reply"),
        subjectId: bob.id,
        objectId: alice.id,
        predicate: "repliedTo",
      },
    ],
  };

  const matrix = projectRelationshipMatrix(project);
  assert.deepEqual(
    matrix.entities.map((entity) => entity.id),
    ["alice", "bob"],
  );

  const aliceToBob = matrix.cells.find(
    (cell) => cell.rowEntityId === "alice" && cell.columnEntityId === "bob",
  );
  const bobToAlice = matrix.cells.find(
    (cell) => cell.rowEntityId === "bob" && cell.columnEntityId === "alice",
  );

  assert.equal(aliceToBob.state, "visible");
  assert.deepEqual(
    aliceToBob.relationships.map((relationship) => relationship.id),
    ["rel-1"],
  );
  assert.equal(bobToAlice.state, "visible");
  assert.deepEqual(
    bobToAlice.relationships.map((relationship) => relationship.id),
    ["rel-reply"],
  );
});

test("relationship matrix distinguishes filtered relationships from absent relationships", () => {
  const project = {
    schemaVersion: 3,
    entities: [alice, bob],
    relationships: [baseRelationship],
  };

  const matrix = projectRelationshipMatrix(project, {
    filter: { predicates: ["called"] },
  });

  const aliceToBob = matrix.cells.find(
    (cell) => cell.rowEntityId === "alice" && cell.columnEntityId === "bob",
  );
  const bobToAlice = matrix.cells.find(
    (cell) => cell.rowEntityId === "bob" && cell.columnEntityId === "alice",
  );

  assert.equal(aliceToBob.state, "filtered");
  assert.equal(aliceToBob.hiddenRelationshipCount, 1);
  assert.deepEqual(aliceToBob.relationships, []);
  assert.equal(bobToAlice.state, "empty");
});

test("relationship matrix filters source coverage without mutating canonical relationships", () => {
  const withoutSource = {
    ...baseRelationship,
    id: relationshipId("rel-no-source"),
    predicate: "called",
    sourceIds: [],
  };
  const project = {
    schemaVersion: 3,
    entities: [alice, bob],
    relationships: [baseRelationship, withoutSource],
  };
  const before = JSON.stringify(project);

  const matrix = projectRelationshipMatrix(project, {
    filter: { sourceCoverage: "without-source" },
  });
  const aliceToBob = matrix.cells.find(
    (cell) => cell.rowEntityId === "alice" && cell.columnEntityId === "bob",
  );

  assert.equal(aliceToBob.state, "visible");
  assert.deepEqual(
    aliceToBob.relationships.map((relationship) => relationship.id),
    ["rel-no-source"],
  );
  assert.equal(aliceToBob.hiddenRelationshipCount, 1);
  assert.equal(JSON.stringify(project), before);
});
