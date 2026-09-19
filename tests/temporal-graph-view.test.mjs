import test from "node:test";
import assert from "node:assert/strict";

await import("../site/temporal-standards.js");
await import("../site/timeline-graph.js");

const graph = globalThis.TimelineGraph;

test("timeless edges remain active in every timeline window", () => {
  const relationship = { id: "r", subjectId: "a", objectId: "b", predicate: "knows", time: null };
  assert.equal(graph.relationshipWindowState(relationship, { start: 0, end: 10 }), "timeless");
});

test("timed edges activate only while their temporal extent intersects the timeline window", () => {
  const relationship = {
    id: "r",
    subjectId: "a",
    objectId: "b",
    predicate: "workedWith",
    time: {
      type: "interval",
      start: { value: "2026-09-01", precision: "day", certainty: "exact", calendar: "gregorian" },
      end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" }
    }
  };
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 8, 10),
      end: Date.UTC(2026, 8, 20)
    }),
    "active"
  );
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 9, 10),
      end: Date.UTC(2026, 9, 20)
    }),
    "inactive"
  );
});

test("graphForWindow retains structure while annotating edge temporal state", () => {
  const data = graph.graphForWindow({
    entities: [{ id: "a", type: "person", name: "A" }, { id: "b", type: "person", name: "B" }],
    relationships: [{ id: "r", subjectId: "a", objectId: "b", predicate: "knows" }],
    items: [],
    stories: []
  }, { start: 0, end: 10 });
  assert.equal(data.nodes.length, 2);
  assert.equal(data.edges[0].temporalState, "timeless");
});
