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

test("events can activate update and deactivate a relationship over time", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "organization", name: "B" }
    ],
    relationships: [{
      id: "r",
      subjectId: "a",
      objectId: "b",
      predicate: "investigates",
      initialState: "inactive",
      attributes: { phase: "pending" }
    }],
    items: [
      {
        id: "activate",
        title: "Investigation opened",
        start: "2026-06-01",
        relationChanges: [{ relationshipId: "r", operation: "activate" }]
      },
      {
        id: "update",
        title: "Authority expanded",
        start: "2026-07-01",
        relationChanges: [{
          relationshipId: "r",
          operation: "update",
          predicate: "formallyInvestigates",
          properties: { phase: "formal" }
        }]
      },
      {
        id: "close",
        title: "Investigation closed",
        start: "2026-08-01",
        relationChanges: [{ relationshipId: "r", operation: "deactivate" }]
      }
    ],
    stories: []
  };

  const june = graph.graphForWindow(input, {
    start: Date.UTC(2026, 5, 10),
    end: Date.UTC(2026, 5, 20)
  });
  assert.equal(june.edges[0].temporalState, "active");
  assert.equal(june.edges[0].label, "investigates");

  const july = graph.graphForWindow(input, {
    start: Date.UTC(2026, 6, 1),
    end: Date.UTC(2026, 6, 2)
  });
  assert.equal(july.edges[0].temporalState, "changed");
  assert.equal(july.edges[0].label, "formallyInvestigates");
  assert.equal(july.edges[0].properties.attributes.phase, "formal");

  const september = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 1),
    end: Date.UTC(2026, 8, 2)
  });
  assert.equal(september.edges[0].temporalState, "inactive");
});

test("focused event neighborhood exposes the relation it changes and a derived change link", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "organization", name: "B" }
    ],
    relationships: [{
      id: "r",
      subjectId: "a",
      objectId: "b",
      predicate: "owns",
      initialState: "active"
    }],
    items: [{
      id: "event-change",
      title: "Ownership transferred",
      start: "2026-09-19",
      relationChanges: [{
        relationshipId: "r",
        operation: "update",
        predicate: "transferredTo"
      }]
    }],
    stories: []
  };
  const time = Date.UTC(2026, 8, 19);
  const neighborhood = graph.neighborhoodGraph(
    input,
    "event-change",
    { start: time, end: time },
    { depth: 1, limit: 12 }
  );
  assert.ok(neighborhood.nodes.some((node) => node.id === "event-change"));
  assert.ok(neighborhood.nodes.some((node) => node.id === "a"));
  assert.ok(neighborhood.nodes.some((node) => node.id === "b"));
  assert.ok(neighborhood.edges.some((edge) => edge.id === "r"));
  assert.ok(neighborhood.edges.some((edge) => edge.id === "change:event-change:r" && edge.label === "updates"));
});
