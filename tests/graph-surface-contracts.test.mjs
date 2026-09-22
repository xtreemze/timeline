import assert from "node:assert/strict";
import test from "node:test";

import {
  OrbGraphSurface,
  createOrbGraphSurfaceFactory,
} from "../src/layout/orb-graph-surface.ts";

function harness() {
  const calls = {
    setData: [],
    transitionData: [],
    updateTemporalEdges: [],
    select: [],
    clearSelection: 0,
    recenter: 0,
    refreshLayout: 0,
    zoomIn: 0,
    zoomOut: 0,
    destroy: 0,
  };
  const events = [];
  let handlers = null;
  const instance = {
    setData(data) {
      calls.setData.push(data);
    },
    transitionData(data) {
      calls.transitionData.push(data);
    },
    updateTemporalEdges(edges) {
      calls.updateTemporalEdges.push(edges);
    },
    select(kind, id) {
      calls.select.push([kind, id]);
      return true;
    },
    clearSelection() {
      calls.clearSelection += 1;
    },
    recenter() {
      calls.recenter += 1;
    },
    refreshLayout() {
      calls.refreshLayout += 1;
    },
    zoomIn() {
      calls.zoomIn += 1;
    },
    zoomOut() {
      calls.zoomOut += 1;
    },
    getMode() {
      return "worker-cpu";
    },
    getSimulationState() {
      return {
        running: true,
        reason: "topology",
        suspendedReasons: [],
        pendingReasons: ["topology"],
      };
    },
    destroy() {
      calls.destroy += 1;
    },
  };
  const factory = {
    create(_container, options) {
      handlers = options;
      return instance;
    },
  };
  const surface = new OrbGraphSurface({}, factory, (event) => events.push(event));
  return { calls, events, handlers: () => handlers, surface, factory };
}

const projection = {
  nodes: [
    { id: "alice", label: "Alice", kind: "person" },
    { id: "bob", label: "Bob", kind: "person" },
  ],
  edges: [
    {
      id: "rel-1",
      sourceId: "alice",
      targetId: "bob",
      label: "meets",
      temporalState: "active",
    },
  ],
};

test("OrbGraphSurface preserves graph topology and semantic presentation", () => {
  const { calls, surface } = harness();
  surface.setProjection(projection);

  assert.deepEqual(calls.setData, [
    {
      nodes: [
        { id: "alice", label: "Alice", properties: { timelineType: "person" } },
        { id: "bob", label: "Bob", properties: { timelineType: "person" } },
      ],
      edges: [
        {
          id: "rel-1",
          start: "alice",
          end: "bob",
          label: "meets",
          temporalState: "active",
        },
      ],
    },
  ]);
});

test("OrbGraphSurface uses the same lossless mapping for topology transitions", () => {
  const { calls, surface } = harness();
  surface.transitionProjection(projection);
  assert.equal(calls.transitionData[0].edges[0].start, "alice");
  assert.equal(calls.transitionData[0].edges[0].end, "bob");
  assert.equal(calls.transitionData[0].edges[0].label, "meets");
});

test("OrbGraphSurface temporal updates retain endpoints and state", () => {
  const { calls, surface } = harness();
  surface.updateTemporalEdges([
    {
      ...projection.edges[0],
      temporalState: "changed",
    },
  ]);
  assert.deepEqual(calls.updateTemporalEdges[0], [
    {
      id: "rel-1",
      start: "alice",
      end: "bob",
      label: "meets",
      temporalState: "changed",
    },
  ]);
});

test("OrbGraphSurface translates canonical selection and clearing", () => {
  const { calls, surface } = harness();
  surface.setSelection({ kind: "entity", id: "alice" });
  surface.setSelection({ kind: "relationship", id: "rel-1" });
  surface.setSelection(null);

  assert.deepEqual(calls.select, [
    ["node", "alice"],
    ["edge", "rel-1"],
  ]);
  assert.equal(calls.clearSelection, 1);
});

test("OrbGraphSurface converts Orb clicks and long press to canonical events", () => {
  const { events, handlers } = harness();
  handlers().onNodeClick({ id: "alice" });
  handlers().onNodeLongPress({ id: "bob" });
  handlers().onEdgeClick({ id: "rel-1", start: "alice", end: "bob" });

  assert.deepEqual(events, [
    {
      kind: "selection-changed",
      selection: { kind: "entity", id: "alice" },
    },
    {
      kind: "interaction-start",
      selection: { kind: "entity", id: "bob" },
      interaction: "long-press-drag",
    },
    {
      kind: "selection-changed",
      selection: { kind: "relationship", id: "rel-1" },
    },
  ]);
});

test("OrbGraphSurface forwards simulation state without renderer objects", () => {
  const { events, handlers } = harness();
  handlers().onSimulationState({
    running: false,
    durationMs: 42,
    mode: "worker-cpu",
  });
  assert.deepEqual(events, [
    {
      kind: "simulation-state",
      running: false,
      durationMs: 42,
      mode: "worker-cpu",
    },
  ]);
});

test("OrbGraphSurface delegates only capabilities exposed by the current Orb bridge", () => {
  const { calls, surface } = harness();
  surface.recenter();
  surface.refreshLayout();
  surface.zoomIn();
  surface.zoomOut();
  assert.equal(surface.getMode(), "worker-cpu");
  surface.destroy();

  assert.equal(calls.recenter, 1);
  assert.equal(calls.refreshLayout, 1);
  assert.equal(calls.zoomIn, 1);
  assert.equal(calls.zoomOut, 1);
  assert.equal(calls.destroy, 1);
  assert.equal("getCamera" in surface, false);
  assert.equal("setCamera" in surface, false);
  assert.equal("fit" in surface, false);
});

test("OrbGraphSurface factory keeps renderer construction at the adapter boundary", () => {
  const { factory } = harness();
  const adapterFactory = createOrbGraphSurfaceFactory(factory);
  const surface = adapterFactory.create({}, () => {});
  assert.ok(surface instanceof OrbGraphSurface);
});

test("OrbGraphSurface exposes Timeline-owned simulation state without Orb internals", () => {
  const { surface } = harness();
  assert.deepEqual(surface.getSimulationState(), {
    running: true,
    reason: "topology",
    suspendedReasons: [],
    pendingReasons: ["topology"],
  });
});
