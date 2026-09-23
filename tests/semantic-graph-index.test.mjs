import assert from "node:assert/strict";
import test from "node:test";

import {
  createSemanticGraphIndex,
} from "../src/application/semantic-graph-index.ts";
import { entityId, relationshipId } from "../src/domain/ids.ts";

function entity(id) {
  return {
    id: entityId(id),
    type: "person",
    name: id,
    alternateNames: [],
    sourceIds: [],
    attributes: { rendererPrivate: "must-not-leak" },
  };
}

function relationship(id, subjectId, objectId, predicate = "called") {
  return {
    id: relationshipId(id),
    subjectId: entityId(subjectId),
    objectId: entityId(objectId),
    predicate,
    itemIds: [],
    sourceIds: [],
    confidence: 1,
    time: null,
    attributes: { sigma: "must-not-leak" },
  };
}

function project(entities, relationships) {
  return { schemaVersion: 2, entities, relationships };
}

test("semantic graph index exposes deterministic incoming outgoing and incident relationships", () => {
  const index = createSemanticGraphIndex(
    project(
      [entity("b"), entity("a"), entity("c")],
      [
        relationship("r-3", "c", "a", "warned"),
        relationship("r-1", "a", "b", "called"),
        relationship("r-2", "b", "a", "met"),
      ],
    ),
  );

  assert.deepEqual(index.outgoing(entityId("a")).map((entry) => String(entry.id)), ["r-1"]);
  assert.deepEqual(index.incoming(entityId("a")).map((entry) => String(entry.id)), ["r-2", "r-3"]);
  assert.deepEqual(index.incident(entityId("a")).map((entry) => String(entry.id)), [
    "r-1",
    "r-2",
    "r-3",
  ]);
  assert.deepEqual(index.degree(entityId("a")), { incoming: 2, outgoing: 1, total: 3 });
});

test("semantic graph index rejects self loops and duplicate canonical IDs deterministically", () => {
  assert.throws(
    () =>
      createSemanticGraphIndex(
        project([entity("a")], [relationship("loop", "a", "a", "called")]),
      ),
    /cannot target its source entity/i,
  );

  assert.throws(
    () => createSemanticGraphIndex(project([entity("a"), entity("a")], [])),
    /Duplicate entity ID "a"/,
  );

  assert.throws(
    () =>
      createSemanticGraphIndex(
        project(
          [entity("a"), entity("b")],
          [
            relationship("same", "a", "b", "called"),
            relationship("same", "b", "a", "warned"),
          ],
        ),
      ),
    /Duplicate relationship ID "same"/,
  );
});

test("bounded deterministic neighborhood traversal is independent of input ordering", () => {
  const entities = ["a", "b", "c", "d", "e"].map(entity);
  const relationships = [
    relationship("r-ab", "a", "b", "called"),
    relationship("r-ac", "a", "c", "warned"),
    relationship("r-bd", "b", "d", "met"),
    relationship("r-ce", "c", "e", "called"),
  ];

  const left = createSemanticGraphIndex(project(entities, relationships));
  const right = createSemanticGraphIndex(
    project([...entities].reverse(), [...relationships].reverse()),
  );

  const expected = {
    entityIds: ["a", "b", "c", "d"],
    relationshipIds: ["r-ab", "r-ac", "r-bd"],
  };
  assert.deepEqual(left.neighborhood(entityId("a"), { depth: 2, limit: 4 }), expected);
  assert.deepEqual(right.neighborhood(entityId("a"), { depth: 2, limit: 4 }), expected);
});

test("connected components are stable regardless of source array ordering", () => {
  const entities = ["a", "b", "c", "d", "e"].map(entity);
  const relationships = [
    relationship("r-ab", "a", "b"),
    relationship("r-cd", "c", "d"),
  ];

  const expected = [["a", "b"], ["c", "d"], ["e"]];
  assert.deepEqual(
    createSemanticGraphIndex(project(entities, relationships)).connectedComponents(),
    expected,
  );
  assert.deepEqual(
    createSemanticGraphIndex(
      project([...entities].reverse(), [...relationships].reverse()),
    ).connectedComponents(),
    expected,
  );
});

test("debug snapshot contains canonical topology only and no renderer/provider attributes", () => {
  const index = createSemanticGraphIndex(
    project(
      [entity("a"), entity("b")],
      [relationship("r-ab", "a", "b", "called")],
    ),
  );

  const snapshot = index.snapshot();
  assert.deepEqual(snapshot, {
    entityIds: ["a", "b"],
    relationships: [
      {
        id: "r-ab",
        subjectId: "a",
        objectId: "b",
        predicate: "called",
      },
    ],
  });
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /Orb|Sigma|Leaflet|rendererPrivate|sigma/i);
});

test("replace rebuilds topology atomically and updates the revision", () => {
  const index = createSemanticGraphIndex(
    project([entity("a"), entity("b")], [relationship("r-ab", "a", "b")]),
  );
  const before = index.revision();

  index.replace(
    project(
      [entity("a"), entity("b"), entity("c")],
      [
        relationship("r-ab", "a", "b"),
        relationship("r-bc", "b", "c", "warned"),
      ],
    ),
  );

  assert.equal(index.revision(), before + 1);
  assert.deepEqual(index.degree(entityId("b")), { incoming: 1, outgoing: 1, total: 2 });
  assert.equal(index.entity(entityId("c"))?.name, "c");
});
