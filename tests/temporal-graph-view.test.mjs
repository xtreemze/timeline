import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  selectPrimarySpatialViewFactory,
  unavailableSpatialViewFactory,
  WORLD_VIEW_UNAVAILABLE_MESSAGE,
} from "../site/world/world-view-selection.ts";

await import("../site/temporal-standards-shim.ts");
await import("../site/timeline-graph-shim.ts");

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
      end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" },
    },
  };
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 8, 10),
      end: Date.UTC(2026, 8, 20),
    }),
    "active",
  );
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 9, 10),
      end: Date.UTC(2026, 9, 20),
    }),
    "inactive",
  );
});

test("graphForWindow retains structure while annotating edge temporal state", () => {
  const data = graph.graphForWindow(
    {
      entities: [
        { id: "a", type: "person", name: "A" },
        { id: "b", type: "person", name: "B" },
      ],
      relationships: [{ id: "r", subjectId: "a", objectId: "b", predicate: "knows" }],
      items: [],
      stories: [],
    },
    { start: 0, end: 10 },
  );
  assert.equal(data.nodes.length, 2);
  assert.equal(data.edges[0].temporalState, "timeless");
});

test("events can activate update and deactivate a relationship over time", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "organization", name: "B" },
    ],
    relationships: [
      {
        id: "r",
        subjectId: "a",
        objectId: "b",
        predicate: "investigates",
        initialState: "inactive",
        attributes: { phase: "pending" },
      },
    ],
    items: [
      {
        id: "activate",
        title: "Investigation opened",
        start: "2026-06-01",
        relationChanges: [{ relationshipId: "r", operation: "activate" }],
      },
      {
        id: "update",
        title: "Authority expanded",
        start: "2026-07-01",
        relationChanges: [
          {
            relationshipId: "r",
            operation: "update",
            predicate: "examines",
            properties: { phase: "formal" },
          },
        ],
      },
      {
        id: "close",
        title: "Investigation closed",
        start: "2026-08-01",
        relationChanges: [{ relationshipId: "r", operation: "deactivate" }],
      },
    ],
    stories: [],
  };

  const june = graph.graphForWindow(input, {
    start: Date.UTC(2026, 5, 10),
    end: Date.UTC(2026, 5, 20),
  });
  assert.equal(june.edges[0].temporalState, "active");
  assert.equal(june.edges[0].label, "investigates");

  const july = graph.graphForWindow(input, {
    start: Date.UTC(2026, 6, 1),
    end: Date.UTC(2026, 6, 2),
  });
  assert.equal(july.edges[0].temporalState, "changed");
  assert.equal(july.edges[0].label, "examines");
  assert.equal(july.edges[0].properties.attributes.phase, "formal");

  const september = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 1),
    end: Date.UTC(2026, 8, 2),
  });
  assert.equal(september.edges.length, 0);
  assert.equal(september.nodes.length, 0);
});

test("focused event neighborhood exposes the canonical relation it changes without creating an event node", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "organization", name: "B" },
    ],
    relationships: [
      {
        id: "r",
        subjectId: "a",
        objectId: "b",
        predicate: "controls",
        initialState: "active",
      },
    ],
    items: [
      {
        id: "event-change",
        title: "Control transferred",
        start: "2026-09-19",
        relationChanges: [
          {
            relationshipId: "r",
            operation: "update",
            predicate: "transfersTo",
          },
        ],
      },
    ],
    stories: [],
  };
  const time = Date.UTC(2026, 8, 19);
  const neighborhood = graph.neighborhoodGraph(
    input,
    "event-change",
    { start: time, end: time },
    { depth: 1, limit: 12 },
  );
  assert.equal(
    neighborhood.nodes.some((node) => node.id === "event-change"),
    false,
  );
  assert.ok(neighborhood.nodes.some((node) => node.id === "a"));
  assert.ok(neighborhood.nodes.some((node) => node.id === "b"));
  assert.ok(neighborhood.edges.some((edge) => edge.id === "r" && edge.label === "transfersTo"));
  assert.equal(
    neighborhood.edges.some((edge) => edge.id.startsWith("change:")),
    false,
  );
});

test("graph window removes out-of-window timed topology while retaining persistent relations", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" },
      { id: "c", type: "person", name: "C" },
    ],
    relationships: [
      {
        id: "timed",
        subjectId: "a",
        objectId: "b",
        predicate: "workedWith",
        time: {
          type: "interval",
          start: {
            value: "2026-09-01",
            precision: "day",
            certainty: "exact",
            calendar: "gregorian",
          },
          end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" },
        },
      },
      { id: "persistent", subjectId: "b", objectId: "c", predicate: "knows", time: null },
    ],
    items: [],
    stories: [],
  };

  const september = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 10),
    end: Date.UTC(2026, 8, 20),
  });
  assert.deepEqual(
    new Set(september.edges.map((edge) => edge.id)),
    new Set(["timed", "persistent"]),
  );
  assert.deepEqual(new Set(september.nodes.map((node) => node.id)), new Set(["a", "b", "c"]));

  const october = graph.graphForWindow(input, {
    start: Date.UTC(2026, 9, 10),
    end: Date.UTC(2026, 9, 20),
  });
  assert.deepEqual(
    october.edges.map((edge) => edge.id),
    ["persistent"],
  );
  assert.deepEqual(new Set(october.nodes.map((node) => node.id)), new Set(["b", "c"]));
});

test("timed relation visibility uses viewport intersection rather than midpoint sampling", () => {
  const data = graph.graphForWindow(
    {
      entities: [
        { id: "a", type: "person", name: "A" },
        { id: "b", type: "person", name: "B" },
      ],
      relationships: [
        {
          id: "r",
          subjectId: "a",
          objectId: "b",
          predicate: "workedWith",
          time: {
            type: "interval",
            start: {
              value: "2026-09-01",
              precision: "day",
              certainty: "exact",
              calendar: "gregorian",
            },
            end: {
              value: "2026-09-03",
              precision: "day",
              certainty: "exact",
              calendar: "gregorian",
            },
          },
        },
      ],
      items: [],
      stories: [],
    },
    {
      start: Date.UTC(2026, 8, 3),
      end: Date.UTC(2026, 8, 30),
    },
  );

  assert.equal(data.edges.length, 1);
  assert.equal(data.edges[0].temporalState, "active");
});

test("open-ended relationship intervals intersect only the appropriate timeline side", () => {
  const afterStart = {
    id: "open-end",
    subjectId: "a",
    objectId: "b",
    predicate: "calls",
    time: {
      type: "interval",
      start: { value: "2026-09-20", certainty: "exact" },
      end: null,
      openEnd: true,
    },
  };
  assert.equal(
    graph.relationshipWindowState(afterStart, {
      start: Date.UTC(2026, 8, 21),
      end: Date.UTC(2026, 8, 22),
    }),
    "active",
  );
  assert.equal(
    graph.relationshipWindowState(afterStart, {
      start: Date.UTC(2026, 8, 1),
      end: Date.UTC(2026, 8, 2),
    }),
    "inactive",
  );

  const beforeEnd = {
    ...afterStart,
    id: "open-start",
    time: {
      type: "interval",
      start: null,
      openStart: true,
      end: { value: "2026-09-20", certainty: "exact" },
    },
  };
  assert.equal(
    graph.relationshipWindowState(beforeEnd, {
      start: Date.UTC(2026, 8, 1),
      end: Date.UTC(2026, 8, 2),
    }),
    "active",
  );
  assert.equal(
    graph.relationshipWindowState(beforeEnd, {
      start: Date.UTC(2026, 8, 21),
      end: Date.UTC(2026, 8, 22),
    }),
    "inactive",
  );
});

test("unknown relationship time stays explicit instead of becoming timeless or inactive", () => {
  const input = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" },
    ],
    relationships: [
      {
        id: "unknown-time",
        subjectId: "a",
        objectId: "b",
        predicate: "calls",
        time: {
          type: "instant",
          start: { value: null, certainty: "unknown", sourceText: "date not established" },
          end: null,
        },
      },
    ],
    items: [],
    stories: [],
  };
  assert.equal(
    graph.relationshipWindowState(input.relationships[0], {
      start: Date.UTC(2026, 8, 1),
      end: Date.UTC(2026, 8, 30),
    }),
    "unknown",
  );
  const data = graph.graphForWindow(input, {
    start: Date.UTC(2026, 8, 1),
    end: Date.UTC(2026, 8, 30),
  });
  assert.equal(data.edges.length, 1);
  assert.equal(data.edges[0].temporalState, "unknown");
  assert.equal(data.nodes.length, 2);
});

test("bounded unknown relationship time uses only its declared bounds for window filtering", () => {
  const relationship = {
    id: "bounded-unknown",
    subjectId: "a",
    objectId: "b",
    predicate: "calls",
    time: {
      type: "instant",
      start: {
        value: null,
        certainty: "unknown",
        earliest: "2026-09-10",
        latest: "2026-09-20",
      },
      end: null,
    },
  };
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 8, 15),
      end: Date.UTC(2026, 8, 16),
    }),
    "active",
  );
  assert.equal(
    graph.relationshipWindowState(relationship, {
      start: Date.UTC(2026, 9, 1),
      end: Date.UTC(2026, 9, 2),
    }),
    "inactive",
  );
});

test("application spatial-view selection prefers the globe WorldView factory", () => {
  const world = {
    create() {
      return { kind: "world" };
    },
  };

  assert.equal(selectPrimarySpatialViewFactory(world), world);
});

test("without a WorldView the app shows an explicit accessible unavailable status", () => {
  const factory = selectPrimarySpatialViewFactory(null);
  assert.equal(factory, unavailableSpatialViewFactory);

  const appended = [];
  const root = {
    dataset: {},
    ownerDocument: {
      createElement: () => ({
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        remove() {
          this.removed = true;
        },
      }),
    },
    append: (node) => appended.push(node),
  };
  const view = factory.create(root);
  assert.equal(root.dataset.worldView, "unavailable");
  assert.equal(appended[0].attributes.role, "status");
  assert.equal(appended[0].textContent, WORLD_VIEW_UNAVAILABLE_MESSAGE);
  assert.equal(view.hasContext(), false);
  view.setModel({});
  view.setWindow({ start: 0, end: 1 });
  view.setFocus(null);
  view.destroy();
  assert.equal(appended[0].removed, true);
  assert.equal(root.dataset.worldView, undefined);
});
