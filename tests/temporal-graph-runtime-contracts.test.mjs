import assert from "node:assert/strict";
import test from "node:test";

import { TimelineGraph } from "../site/timeline-graph.ts";

const temporal = {
  sortKey(value) {
    return Number(value);
  },
  extentBounds(value) {
    if (!value || typeof value !== "object") return { locatable: false, start: 0, end: 0 };
    if (value.unknown) return { locatable: false, start: 0, end: 0 };
    const start = Number(value.start);
    const end = value.end === undefined ? start : Number(value.end);
    return { locatable: Number.isFinite(start) && Number.isFinite(end), start, end };
  },
};

test("relationship window state preserves timeless active inactive and unknown semantics", () => {
  const base = {
    id: "r",
    subjectId: "a",
    objectId: "b",
    predicate: "meets",
  };

  assert.equal(
    TimelineGraph.relationshipWindowState(base, { start: 10, end: 20 }, temporal),
    "timeless",
  );
  assert.equal(
    TimelineGraph.relationshipWindowState(
      { ...base, time: { start: 12, end: 18 } },
      { start: 10, end: 20 },
      temporal,
    ),
    "active",
  );
  assert.equal(
    TimelineGraph.relationshipWindowState(
      { ...base, time: { start: 30, end: 40 } },
      { start: 10, end: 20 },
      temporal,
    ),
    "inactive",
  );
  assert.equal(
    TimelineGraph.relationshipWindowState(
      { ...base, time: { unknown: true } },
      { start: 10, end: 20 },
      temporal,
    ),
    "unknown",
  );
});

test("temporal relation projection carries canonical edge identity and place context", () => {
  const projected = TimelineGraph.temporalRelationProjection(
    [
      {
        id: "r1",
        subjectId: "a",
        objectId: "b",
        predicate: "visits",
        role: "traveler",
        placeId: "stockholm",
        itemIds: ["item-1"],
        time: { start: 10, end: 20 },
      },
    ],
    temporal,
  );

  assert.deepEqual(projected, [
    {
      id: "r1",
      subjectId: "a",
      objectId: "b",
      predicate: "visits",
      role: "traveler",
      placeId: "stockholm",
      itemIds: ["item-1"],
      start: 10,
      end: 20,
    },
  ]);
});

test("focused chronology item recovers its contextual canonical relationship neighborhood", () => {
  globalThis.TimelineTemporal = temporal;

  const graph = TimelineGraph.neighborhoodGraph(
    {
      entities: [
        { id: "a", type: "person", name: "A" },
        { id: "b", type: "person", name: "B" },
      ],
      relationships: [
        {
          id: "r1",
          subjectId: "a",
          objectId: "b",
          predicate: "meets",
          itemIds: ["item-1"],
        },
      ],
      items: [{ id: "item-1", relationChanges: [] }],
    },
    "item-1",
    { start: 0, end: 100 },
    { depth: 1, limit: 12 },
  );

  assert.deepEqual(
    graph.nodes.map((node) => node.id).sort(),
    ["a", "b"],
  );
  assert.deepEqual(graph.edges.map((edge) => edge.id), ["r1"]);
  assert.equal(graph.edges[0].temporalState, "timeless");
});
