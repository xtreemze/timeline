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
          predicate: "examines",
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
  assert.equal(july.edges[0].label, "examines");
  assert.equal(july.edges[0].properties.attributes.phase, "formal");

  const september = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 1),
    end: Date.UTC(2026, 8, 2)
  });
  assert.equal(september.edges.length, 0);
  assert.equal(september.nodes.length, 0);
});

test("focused event neighborhood exposes the canonical relation it changes without creating an event node", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "organization", name: "B" }
    ],
    relationships: [{
      id: "r",
      subjectId: "a",
      objectId: "b",
      predicate: "controls",
      initialState: "active"
    }],
    items: [{
      id: "event-change",
      title: "Control transferred",
      start: "2026-09-19",
      relationChanges: [{
        relationshipId: "r",
        operation: "update",
        predicate: "transfersTo"
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
  assert.equal(neighborhood.nodes.some((node) => node.id === "event-change"), false);
  assert.ok(neighborhood.nodes.some((node) => node.id === "a"));
  assert.ok(neighborhood.nodes.some((node) => node.id === "b"));
  assert.ok(neighborhood.edges.some((edge) => edge.id === "r" && edge.label === "transfersTo"));
  assert.equal(neighborhood.edges.some((edge) => edge.id.startsWith("change:")), false);
});


test("graph window removes out-of-window timed topology while retaining persistent relations", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" },
      { id: "c", type: "person", name: "C" }
    ],
    relationships: [
      {
        id: "timed",
        subjectId: "a",
        objectId: "b",
        predicate: "workedWith",
        time: {
          type: "interval",
          start: { value: "2026-09-01", precision: "day", certainty: "exact", calendar: "gregorian" },
          end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" }
        }
      },
      { id: "persistent", subjectId: "b", objectId: "c", predicate: "knows", time: null }
    ],
    items: [],
    stories: []
  };

  const september = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 10),
    end: Date.UTC(2026, 8, 20)
  });
  assert.deepEqual(new Set(september.edges.map((edge) => edge.id)), new Set(["timed", "persistent"]));
  assert.deepEqual(new Set(september.nodes.map((node) => node.id)), new Set(["a", "b", "c"]));

  const october = graph.graphForWindow(input, {
    start: Date.UTC(2026, 9, 10),
    end: Date.UTC(2026, 9, 20)
  });
  assert.deepEqual(october.edges.map((edge) => edge.id), ["persistent"]);
  assert.deepEqual(new Set(october.nodes.map((node) => node.id)), new Set(["b", "c"]));
});

test("timed relation visibility uses viewport intersection rather than midpoint sampling", () => {
  const data = graph.graphForWindow({
    entities: [{ id: "a", type: "person", name: "A" }, { id: "b", type: "person", name: "B" }],
    relationships: [{
      id: "r",
      subjectId: "a",
      objectId: "b",
      predicate: "workedWith",
      time: {
        type: "interval",
        start: { value: "2026-09-01", precision: "day", certainty: "exact", calendar: "gregorian" },
        end: { value: "2026-09-03", precision: "day", certainty: "exact", calendar: "gregorian" }
      }
    }],
    items: [],
    stories: []
  }, {
    start: Date.UTC(2026, 8, 3),
    end: Date.UTC(2026, 8, 30)
  });

  assert.equal(data.edges.length, 1);
  assert.equal(data.edges[0].temporalState, "active");
});

test("graph clicks only select nodes or edges without invoking an inspector or navigation", async () => {
  const { readFile } = await import("node:fs/promises");
  const [view, bridge] = await Promise.all([
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8"),
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /graphselectionchange/);
  assert.match(view, /kind:\s*"node"/);
  assert.match(view, /kind:\s*"edge"/);
  assert.doesNotMatch(view, /renderDetail|detailRows|fallbackEventId|graphnodefocus|graphentityfocus|graphedgefocus/);
  assert.match(bridge, /function selectGraphObject\(object\)/);
  assert.match(bridge, /onNodeClick[\s\S]*selectGraphObject\(node\)/);
  assert.match(bridge, /onEdgeClick[\s\S]*selectGraphObject\(edge\)/);
  assert.match(bridge, /select\(kind, id\)/);
});


test("temporal graph stages topology deltas instead of resetting Orb after first render", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8");

  assert.match(source, /hasRenderedData\s*=\s*false/);
  assert.match(source, /this\.orb\.transitionData\(data\)/);
  assert.match(source, /this\.orb\.setData\(data\)[\s\S]*this\.hasRenderedData\s*=\s*true/);
});
