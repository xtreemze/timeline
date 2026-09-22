import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createSemanticGraphIndex } from "../src/application/semantic-graph-index.ts";
import { entityId, relationshipId } from "../src/domain/ids.ts";
import {
  projectFocusedGraph,
  projectGraphWindow,
} from "../src/projection/graph-projection.ts";

function entity(id, type = "person") {
  return {
    id: entityId(id),
    type,
    name: id.toUpperCase(),
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
}

function endpoint(value) {
  return { value, certainty: "exact", precision: "day" };
}

function relationship(id, subjectId, objectId, options = {}) {
  return {
    id: relationshipId(id),
    subjectId: entityId(subjectId),
    objectId: entityId(objectId),
    predicate: options.predicate ?? "called",
    role: options.role ?? "",
    itemIds: options.itemIds ?? [],
    sourceIds: [],
    confidence: 1,
    time: options.time ?? null,
    attributes: {},
    ...(options.initialState ? { initialState: options.initialState } : {}),
  };
}

function fixture() {
  return {
    schemaVersion: 2,
    entities: [entity("a"), entity("b"), entity("c"), entity("d")],
    relationships: [
      relationship("r-timeless", "a", "b", { predicate: "called" }),
      relationship("r-instant", "b", "c", {
        predicate: "warned",
        time: { type: "instant", start: endpoint("2026-01-15") },
      }),
      relationship("r-range", "c", "d", {
        predicate: "visited",
        time: {
          type: "interval",
          start: endpoint("2026-02-01"),
          end: endpoint("2026-02-10"),
        },
        itemIds: ["occurrence-range"],
      }),
    ],
    items: [],
  };
}

test("all-time graph projection preserves canonical topology without renderer fields", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const projection = projectGraphWindow(project, index, null);

  assert.deepEqual(projection.nodes.map((node) => String(node.id)), ["a", "b", "c", "d"]);
  assert.deepEqual(projection.edges.map((edge) => String(edge.id)), [
    "r-instant",
    "r-range",
    "r-timeless",
  ]);
  assert.equal(projection.edges.find((edge) => edge.id === "r-timeless")?.temporalState, "timeless");
  assert.doesNotMatch(JSON.stringify(projection), /Orb|Sigma|Leaflet|properties/);
});

test("temporal window keeps timeless relationships and filters timed relationships inclusively", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);

  const january = projectGraphWindow(project, index, {
    start: Date.parse("2026-01-15T00:00:00Z"),
    end: Date.parse("2026-01-15T00:00:00Z"),
  });
  assert.deepEqual(january.edges.map((edge) => String(edge.id)), ["r-instant", "r-timeless"]);
  assert.deepEqual(january.nodes.map((node) => String(node.id)), ["a", "b", "c"]);

  const touchingRangeEnd = projectGraphWindow(project, index, {
    start: Date.parse("2026-02-10T00:00:00Z"),
    end: Date.parse("2026-02-10T00:00:00Z"),
  });
  assert.deepEqual(touchingRangeEnd.edges.map((edge) => String(edge.id)), [
    "r-range",
    "r-timeless",
  ]);

  const afterRange = projectGraphWindow(project, index, {
    start: Date.parse("2026-02-11T00:00:00Z"),
    end: Date.parse("2026-02-11T00:00:00Z"),
  });
  assert.deepEqual(afterRange.edges.map((edge) => String(edge.id)), ["r-timeless"]);
});

test("focused projection expands canonical neighborhoods only through visible relationships", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);

  const focused = projectFocusedGraph(project, index, entityId("b"), null, {
    depth: 1,
    limit: 3,
  });

  assert.deepEqual(focused.nodes.map((node) => String(node.id)), ["a", "b", "c"]);
  assert.deepEqual(focused.edges.map((edge) => String(edge.id)), [
    "r-instant",
    "r-timeless",
  ]);
});

test("focused chronology occurrence resolves relationship context by canonical item IDs", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);

  const focused = projectFocusedGraph(project, index, "occurrence-range", null, {
    depth: 0,
    limit: 36,
  });

  assert.deepEqual(focused.nodes.map((node) => String(node.id)), ["c", "d"]);
  assert.deepEqual(focused.edges.map((edge) => String(edge.id)), ["r-range"]);
});

test("legacy relation changes remain compatible without entering canonical topology", () => {
  const project = fixture();
  project.items = [
    {
      id: "change-1",
      start: "2026-03-01",
      relationChanges: [
        {
          relationshipId: "r-timeless",
          operation: "update",
          predicate: "warned",
        },
      ],
    },
    {
      id: "change-2",
      start: "2026-03-02",
      relationChanges: [
        {
          relationshipId: "r-timeless",
          operation: "deactivate",
        },
      ],
    },
  ];
  const index = createSemanticGraphIndex(project);

  const changed = projectGraphWindow(project, index, {
    start: Date.parse("2026-03-01T00:00:00Z"),
    end: Date.parse("2026-03-01T23:59:59Z"),
  });
  const changedEdge = changed.edges.find((edge) => edge.id === "r-timeless");
  assert.equal(changedEdge?.label, "warned");
  assert.equal(changedEdge?.temporalState, "changed");

  const later = projectGraphWindow(project, index, {
    start: Date.parse("2026-03-03T00:00:00Z"),
    end: Date.parse("2026-03-03T23:59:59Z"),
  });
  assert.equal(later.edges.some((edge) => edge.id === "r-timeless"), false);

  const focusedChange = projectFocusedGraph(project, index, "change-1", changed.temporal, {
    depth: 0,
    limit: 36,
  });
  assert.deepEqual(focusedChange.nodes.map((node) => String(node.id)), ["a", "b"]);
  assert.deepEqual(focusedChange.edges.map((edge) => String(edge.id)), ["r-timeless"]);
});

test("projection order is stable regardless of canonical source-array order", () => {
  const left = fixture();
  const right = {
    ...left,
    entities: [...left.entities].reverse(),
    relationships: [...left.relationships].reverse(),
  };

  const leftProjection = projectGraphWindow(left, createSemanticGraphIndex(left), null);
  const rightProjection = projectGraphWindow(right, createSemanticGraphIndex(right), null);

  assert.deepEqual(rightProjection, leftProjection);
});


test("1k/10k/50k graph benchmark exercises the direct renderer-neutral projection path", async () => {
  const benchmark = await readFile(
    new URL("../benchmarks/graph-data.mjs", import.meta.url),
    "utf8",
  );

  assert.match(benchmark, /sizes = requestedSizes\.length \? requestedSizes : \[1000, 10000, 50000\]/);
  assert.match(benchmark, /projectGraphWindow\(fixture, semanticIndex, null\)/);
  assert.match(benchmark, /projectFocusedGraph\(fixture, semanticIndex, "entity-0", null/);
  assert.match(benchmark, /directFullProjection/);
  assert.match(benchmark, /directFocusedProjection/);
});


test("focused projection tolerates legacy relationships without itemIds", () => {
  const project = fixture();
  const legacy = {
    ...project,
    relationships: project.relationships.map(({ itemIds, ...relationship }) => relationship),
  };
  const index = createSemanticGraphIndex(legacy);

  const focused = projectFocusedGraph(legacy, index, entityId("a"), null, {
    depth: 1,
    limit: 36,
  });

  assert.ok(focused.nodes.some((node) => String(node.id) === "a"));
  assert.ok(focused.edges.some((edge) => String(edge.id) === "r-timeless"));
});
