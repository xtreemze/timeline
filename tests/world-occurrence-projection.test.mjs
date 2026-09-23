import assert from "node:assert/strict";
import test from "node:test";

import { SpatialAnchorIndex } from "../src/projection/spatial-anchor-index.ts";
import { projectWorldOccurrences } from "../src/projection/world-occurrence-projection.ts";

function relationship(overrides) {
  return {
    id: "rel-1",
    subjectId: "alice",
    objectId: "bob",
    predicate: "met",
    itemIds: [],
    sourceIds: [],
    confidence: 1,
    time: null,
    attributes: {},
    ...overrides,
  };
}

test("active placed relationships compose into elevated-world-ready instances and edges", () => {
  const relationships = [
    relationship({
      id: "stockholm-meeting",
      subjectId: "alice",
      objectId: "bob",
      placeId: "stockholm",
    }),
  ];
  const spatialAnchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
    ],
    relationships,
  );

  const projection = projectWorldOccurrences(
    relationships,
    ["stockholm-meeting"],
    spatialAnchors,
  );

  assert.equal(projection.instances.length, 2);
  assert.equal(projection.edges.length, 1);
  assert.deepEqual(
    projection.instances.map((instance) => instance.canonicalId),
    ["alice", "bob"],
  );
  assert.ok(
    projection.instances.every(
      (instance) => instance.geographicAnchors[0]?.placeId === "stockholm",
    ),
  );
  assert.equal(projection.edges[0].id, "stockholm-meeting");
});

test("one canonical entity becomes distinct occurrence-scoped world instances", () => {
  const relationships = [
    relationship({
      id: "copenhagen-meeting",
      subjectId: "alice",
      objectId: "charlie",
      placeId: "copenhagen",
    }),
    relationship({
      id: "stockholm-meeting",
      subjectId: "alice",
      objectId: "bob",
      placeId: "stockholm",
    }),
  ];
  const spatialAnchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    relationships,
  );

  const projection = projectWorldOccurrences(
    relationships,
    ["stockholm-meeting", "copenhagen-meeting"],
    spatialAnchors,
  );

  const aliceInstances = projection.instances.filter(
    (instance) => instance.canonicalId === "alice",
  );

  assert.equal(aliceInstances.length, 2);
  assert.notEqual(aliceInstances[0].id, aliceInstances[1].id);
  assert.deepEqual(
    aliceInstances.map((instance) => instance.geographicAnchors[0]?.placeId).sort(),
    ["copenhagen", "stockholm"],
  );
});

test("world occurrence projection consumes an explicit active set instead of filtering time itself", () => {
  const relationships = [
    relationship({ id: "active", subjectId: "alice", objectId: "bob" }),
    relationship({ id: "inactive", subjectId: "alice", objectId: "charlie" }),
  ];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  const projection = projectWorldOccurrences(
    relationships,
    ["active"],
    spatialAnchors,
  );

  assert.deepEqual(
    projection.edges.map((edge) => edge.id),
    ["active"],
  );
  assert.equal(
    projection.instances.some((instance) => instance.occurrenceId === "inactive"),
    false,
  );
});

test("temporal, visual, and retained weights are projected without changing canonical relationships", () => {
  const canonical = relationship({
    id: "weighted",
    subjectId: "alice",
    objectId: "bob",
  });
  const relationships = [canonical];
  const before = JSON.stringify(canonical);
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  const projection = projectWorldOccurrences(
    relationships,
    ["weighted"],
    spatialAnchors,
    {
      temporalWeights: new Map([["weighted", 0.4]]),
      visualWeights: new Map([["weighted", 0.7]]),
      retainedOccurrenceIds: new Set(["weighted"]),
    },
  );

  assert.ok(projection.instances.every((instance) => instance.temporalWeight === 0.4));
  assert.ok(projection.instances.every((instance) => instance.visualWeight === 0.7));
  assert.ok(projection.instances.every((instance) => instance.retained));
  assert.equal(projection.edges[0].temporalWeight, 0.4);
  assert.equal(projection.edges[0].retained, true);
  assert.equal(JSON.stringify(canonical), before);
});

test("unplaced active relationships remain renderable without invented geography", () => {
  const relationships = [
    relationship({ id: "unplaced", subjectId: "alice", objectId: "bob" }),
  ];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  const projection = projectWorldOccurrences(
    relationships,
    ["unplaced"],
    spatialAnchors,
  );

  assert.ok(
    projection.instances.every((instance) => instance.geographicAnchors.length === 0),
  );
});

test("unknown active occurrence IDs are rejected", () => {
  const relationships = [];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  assert.throws(
    () =>
      projectWorldOccurrences(
        relationships,
        ["missing"],
        spatialAnchors,
      ),
    /not a canonical relationship/,
  );
});

test("entity and relationship presentation metadata projects independently of identity", () => {
  const relationships = [
    relationship({
      id: "meeting",
      subjectId: "alice",
      objectId: "bob",
      predicate: "met",
    }),
  ];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);
  const projection = projectWorldOccurrences(
    relationships,
    ["meeting"],
    spatialAnchors,
    {
      entityPresentation: new Map([
        ["alice", { label: "Alice", kind: "person" }],
        ["bob", { label: "Bob", kind: "person" }],
      ]),
    },
  );

  assert.deepEqual(
    projection.instances.map(({ canonicalId, label, kind }) => [canonicalId, label, kind]),
    [
      ["alice", "Alice", "person"],
      ["bob", "Bob", "person"],
    ],
  );
  assert.equal(projection.edges[0].label, "met");
});
