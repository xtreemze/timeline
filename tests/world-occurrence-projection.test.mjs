import assert from "node:assert/strict";
import test from "node:test";

import { SpatialAnchorIndex } from "../src/projection/spatial-anchor-index.ts";
import {
  projectCanonicalWorldOccurrences,
  projectWorldOccurrences,
} from "../src/projection/world-occurrence-projection.ts";

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

  const projection = projectWorldOccurrences(relationships, ["stockholm-meeting"], spatialAnchors);

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

test("standalone occurrence identity drives world nodes while child relationships remain topology", () => {
  const relationships = [
    relationship({
      id: "signed",
      subjectId: "alice",
      objectId: "document",
      predicate: "signed",
    }),
  ];
  const occurrences = [
    {
      id: "signing-ceremony",
      time: { type: "instant", start: { value: "2026-09-28T10:00:00Z" } },
      placeId: "stockholm",
      participantContexts: [{ entityId: "alice" }, { entityId: "witness" }],
      relationshipIds: ["signed"],
      sourceIds: [],
      confidence: 1,
      attributes: {},
    },
  ];
  const spatialAnchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
    ],
    relationships,
    occurrences,
  );

  const projection = projectCanonicalWorldOccurrences(
    { relationships, occurrences },
    ["signing-ceremony"],
    spatialAnchors,
  );

  assert.deepEqual(
    projection.instances.map((instance) => instance.canonicalId),
    ["alice", "document", "witness"],
  );
  assert.ok(
    projection.instances.every(
      (instance) =>
        instance.occurrenceId === "signing-ceremony" &&
        instance.geographicAnchors[0]?.placeId === "stockholm",
    ),
  );
  assert.deepEqual(
    projection.edges.map(({ id, label }) => [id, label]),
    [["signed", "signed"]],
  );
});

test("standalone participant roles remain renderer-neutral metadata on the canonical entity node", () => {
  const occurrences = [
    {
      id: "hearing",
      time: { type: "instant", start: { value: "2026-09-28T10:00:00Z" } },
      participantContexts: [
        {
          entityId: "alice",
          roleType: "counsel",
          representedEntityId: "client",
          organizationId: "firm",
        },
      ],
      relationshipIds: [],
      sourceIds: [],
      confidence: 1,
      attributes: {},
    },
  ];
  const projection = projectCanonicalWorldOccurrences(
    { relationships: [], occurrences },
    ["hearing"],
    new SpatialAnchorIndex([], [], occurrences),
  );

  const alice = projection.instances.find((instance) => instance.canonicalId === "alice");
  assert.deepEqual(alice?.participations, [
    {
      occurrenceId: "hearing",
      participantEntityId: "alice",
      roleType: "counsel",
      representedEntityId: "client",
      organizationId: "firm",
    },
  ]);
  assert.equal(
    projection.instances.filter((instance) => instance.canonicalId === "alice").length,
    1,
  );
  assert.equal(
    projection.instances.some((instance) => String(instance.canonicalId) === "hearing"),
    false,
    "standalone occurrence identity never becomes a World graph node",
  );
  assert.equal(projection.edges.length, 0);
});

test("unary standalone occurrences render participants without inventing self-loop edges", () => {
  const occurrences = [
    {
      id: "arrival",
      time: { type: "instant", start: { value: "2026-09-28T10:00:00Z" } },
      participantContexts: [{ entityId: "alice" }],
      relationshipIds: [],
      sourceIds: [],
      confidence: 1,
      attributes: {},
    },
  ];
  const spatialAnchors = new SpatialAnchorIndex([], [], occurrences);
  const projection = projectCanonicalWorldOccurrences(
    { relationships: [], occurrences },
    ["arrival"],
    spatialAnchors,
  );

  assert.deepEqual(
    projection.instances.map((instance) => instance.canonicalId),
    ["alice"],
  );
  assert.deepEqual(projection.edges, []);
});

test("one canonical entity stays one world node across distinct spatial contexts", () => {
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

  assert.equal(aliceInstances.length, 1);
  assert.deepEqual(aliceInstances[0].occurrenceIds, ["copenhagen-meeting", "stockholm-meeting"]);
  assert.equal(aliceInstances[0].occurrenceId, undefined);
  assert.deepEqual(
    aliceInstances[0].geographicAnchors.map((anchor) => anchor.placeId),
    ["copenhagen", "stockholm"],
  );
  assert.equal(
    projection.edges.every(
      (edge) =>
        edge.sourceInstanceId === aliceInstances[0].id ||
        edge.targetInstanceId === aliceInstances[0].id,
    ),
    true,
  );
});

test("repeated active relationships at one place reuse one canonical rendered node", () => {
  const relationships = [
    relationship({
      id: "first",
      subjectId: "alice",
      objectId: "bob",
      placeId: "stockholm",
    }),
    relationship({
      id: "second",
      subjectId: "alice",
      objectId: "charlie",
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

  const projection = projectWorldOccurrences(relationships, ["first", "second"], spatialAnchors);
  const aliceInstances = projection.instances.filter(
    (instance) => instance.canonicalId === "alice",
  );

  assert.equal(aliceInstances.length, 1);
  assert.deepEqual(aliceInstances[0].occurrenceIds, ["first", "second"]);
  assert.equal(aliceInstances[0].occurrenceId, undefined);
  assert.equal(
    projection.edges.every(
      (edge) =>
        edge.sourceInstanceId === aliceInstances[0].id ||
        edge.targetInstanceId === aliceInstances[0].id,
    ),
    true,
  );
});

test("world occurrence projection consumes an explicit active set instead of filtering time itself", () => {
  const relationships = [
    relationship({ id: "active", subjectId: "alice", objectId: "bob" }),
    relationship({ id: "inactive", subjectId: "alice", objectId: "charlie" }),
  ];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  const projection = projectWorldOccurrences(relationships, ["active"], spatialAnchors);

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

  const projection = projectWorldOccurrences(relationships, ["weighted"], spatialAnchors, {
    temporalWeights: new Map([["weighted", 0.4]]),
    visualWeights: new Map([["weighted", 0.7]]),
    retainedOccurrenceIds: new Set(["weighted"]),
  });

  assert.ok(projection.instances.every((instance) => instance.temporalWeight === 0.4));
  assert.ok(projection.instances.every((instance) => instance.visualWeight === 0.7));
  assert.ok(projection.instances.every((instance) => instance.retained));
  assert.equal(projection.edges[0].temporalWeight, 0.4);
  assert.equal(projection.edges[0].retained, true);
  assert.equal(JSON.stringify(canonical), before);
});

test("unplaced active relationships remain renderable without invented geography", () => {
  const relationships = [relationship({ id: "unplaced", subjectId: "alice", objectId: "bob" })];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  const projection = projectWorldOccurrences(relationships, ["unplaced"], spatialAnchors);

  assert.ok(projection.instances.every((instance) => instance.geographicAnchors.length === 0));
});

test("unknown active occurrence IDs are rejected", () => {
  const relationships = [];
  const spatialAnchors = new SpatialAnchorIndex([], relationships);

  assert.throws(
    () => projectWorldOccurrences(relationships, ["missing"], spatialAnchors),
    /Active occurrence missing is not canonical/,
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
  const projection = projectWorldOccurrences(relationships, ["meeting"], spatialAnchors, {
    entityPresentation: new Map([
      ["alice", { label: "Alice", kind: "person" }],
      ["bob", { label: "Bob", kind: "person" }],
    ]),
  });

  assert.deepEqual(
    projection.instances.map(({ canonicalId, label, kind }) => [canonicalId, label, kind]),
    [
      ["alice", "Alice", "person"],
      ["bob", "Bob", "person"],
    ],
  );
  assert.equal(projection.edges[0].label, "met");
});
