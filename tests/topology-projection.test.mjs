import assert from "node:assert/strict";
import test from "node:test";

import { createSemanticGraphIndex } from "../src/application/semantic-graph-index.ts";
import { entityId, relationshipId } from "../src/domain/ids.ts";
import { projectFocusedTopology, projectTopology } from "../src/projection/topology-projection.ts";

function entity(id) {
  return {
    id: entityId(id),
    type: "person",
    name: id.toUpperCase(),
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
}

function relationship(id, subjectId, objectId, itemIds = []) {
  return {
    id: relationshipId(id),
    subjectId: entityId(subjectId),
    objectId: entityId(objectId),
    predicate: "called",
    itemIds,
    sourceIds: [],
    confidence: 1,
    time: null,
    attributes: {},
  };
}

function fixture() {
  return {
    schemaVersion: 2,
    entities: [entity("a"), entity("b"), entity("c"), entity("d")],
    relationships: [
      relationship("ab", "a", "b"),
      relationship("bc", "b", "c", ["occurrence-bc"]),
      relationship("cd", "c", "d"),
    ],
    items: [],
  };
}

test("topology projection consumes the explicit active occurrence relationship set", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const projection = projectTopology(project, index, [relationshipId("ab"), relationshipId("bc")]);

  assert.deepEqual(
    projection.nodes.map((node) => String(node.id)),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    projection.edges.map((edge) => String(edge.id)),
    ["ab", "bc"],
  );
  assert.doesNotMatch(JSON.stringify(projection), /time|Orb|Sigma|Leaflet|deck|camera|position/i);
});

test("topology projection has no independent temporal parsing or activation semantics", () => {
  const project = fixture();
  project.relationships[0].time = {
    type: "instant",
    start: { value: "1900-01-01" },
  };
  const index = createSemanticGraphIndex(project);

  const projection = projectTopology(project, index, [relationshipId("ab")]);
  assert.deepEqual(
    projection.edges.map((edge) => String(edge.id)),
    ["ab"],
  );
});

test("focused topology expands only through the supplied active relationships", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const focused = projectFocusedTopology(
    project,
    index,
    [relationshipId("ab"), relationshipId("bc")],
    entityId("b"),
    { depth: 1, limit: 3 },
  );

  assert.deepEqual(
    focused.nodes.map((node) => String(node.id)),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    focused.edges.map((edge) => String(edge.id)),
    ["ab", "bc"],
  );
});

test("occurrence/item focus resolves canonical relationship context without pseudo-nodes", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const focused = projectFocusedTopology(
    project,
    index,
    [relationshipId("bc"), relationshipId("cd")],
    "occurrence-bc",
    { depth: 0 },
  );

  assert.deepEqual(
    focused.nodes.map((node) => String(node.id)),
    ["b", "c"],
  );
  assert.deepEqual(
    focused.edges.map((edge) => String(edge.id)),
    ["bc"],
  );
});

test("legacy relation-change context can locate canonical edges but never enters topology", () => {
  const project = fixture();
  project.items = [
    {
      id: "legacy-change",
      relationChanges: [{ relationshipId: "ab" }],
    },
  ];
  const index = createSemanticGraphIndex(project);

  const focused = projectFocusedTopology(project, index, [relationshipId("ab")], "legacy-change", {
    depth: 0,
  });

  assert.deepEqual(
    focused.nodes.map((node) => String(node.id)),
    ["a", "b"],
  );
  assert.deepEqual(
    focused.edges.map((edge) => String(edge.id)),
    ["ab"],
  );
});

test("unknown active relationship IDs fail instead of silently inventing topology", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  assert.throws(
    () => projectTopology(project, index, [relationshipId("missing")]),
    /not canonical/,
  );
});

test("projection order is deterministic independent of active ID order", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const left = projectTopology(project, index, [relationshipId("bc"), relationshipId("ab")]);
  const right = projectTopology(project, index, [relationshipId("ab"), relationshipId("bc")]);
  assert.deepEqual(left, right);
});
