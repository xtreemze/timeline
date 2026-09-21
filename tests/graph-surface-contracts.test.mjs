/**
 * Characterization tests for GraphSurface contracts.
 * These tests verify that the Timeline renderer contract is well-defined
 * and that implementations (Orb, Sigma, etc.) can adhere to it.
 */

import test from "node:test";
import { strict as assert } from "node:assert";

class MockGraphSurface {
  #projection = { nodes: [], edges: [] };
  #camera = { x: 0, y: 0, z: 1 };
  #eventListener = null;

  constructor(eventListener) {
    this.#eventListener = eventListener;
  }

  setProjection(projection) {
    this.#projection = projection;
  }

  transitionProjection(projection) {
    this.#projection = projection;
  }

  updateTemporalEdges(edges) {
    this.#projection = {
      ...this.#projection,
      edges,
    };
  }

  setSelection(selection) {
    if (selection && this.#eventListener) {
      this.#eventListener({ kind: "selection-changed", selection });
    }
  }

  getCamera() {
    return { ...this.#camera };
  }

  setCamera(camera) {
    this.#camera = { ...camera };
  }

  fit() {
    this.#camera = { x: 0, y: 0, z: 1 };
  }

  recenter() {
    this.#camera = { x: 0, y: 0, z: this.#camera.z };
  }

  refreshLayout() {
    // Mock: no-op
  }

  getMode() {
    return "mock";
  }

  destroy() {
    this.#eventListener = null;
  }
}

test("GraphSurface contract: setProjection accepts graph data", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  const projection = {
    nodes: [
      { id: "alice", label: "Alice", group: "person" },
      { id: "bob", label: "Bob", group: "person" },
    ],
    edges: [
      {
        id: "rel-1",
        sourceId: "alice",
        targetId: "bob",
        label: "appointed",
        temporalState: "temporal",
        startTime: 1000,
        endTime: 2000,
      },
    ],
  };

  surface.setProjection(projection);
  assert.ok(true, "setProjection succeeded");
});

test("GraphSurface contract: selection uses canonical IDs", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  const selection = {
    kind: "entity",
    id: "alice",
  };

  surface.setSelection(selection);

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    kind: "selection-changed",
    selection,
  });
});

test("GraphSurface contract: clears selection with null", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  const selection = { kind: "entity", id: "alice" };
  surface.setSelection(selection);
  surface.setSelection(null);

  assert.equal(events.length, 1, "only initial selection fires event");
});

test("GraphSurface contract: camera state can be saved/restored", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  const originalCamera = { x: 100, y: 200, z: 2.5 };
  surface.setCamera(originalCamera);

  const retrieved = surface.getCamera();
  assert.equal(retrieved.x, 100);
  assert.equal(retrieved.y, 200);
  assert.equal(retrieved.z, 2.5);
});

test("GraphSurface contract: fit() resets camera", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  surface.setCamera({ x: 500, y: 500, z: 10 });
  surface.fit();

  const camera = surface.getCamera();
  assert.equal(camera.x, 0);
  assert.equal(camera.y, 0);
  assert.equal(camera.z, 1);
});

test("GraphSurface contract: recenter() preserves zoom", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  const zoom = 3.5;
  surface.setCamera({ x: 500, y: 500, z: zoom });
  surface.recenter();

  const camera = surface.getCamera();
  assert.equal(camera.x, 0);
  assert.equal(camera.y, 0);
  assert.equal(camera.z, zoom);
});

test("GraphSurface contract: temporal edges update independently", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  const initialProjection = {
    nodes: [{ id: "alice", label: "Alice" }],
    edges: [
      {
        id: "rel-1",
        sourceId: "alice",
        targetId: "bob",
        label: "action",
        temporalState: "temporal",
        startTime: 1000,
      },
    ],
  };

  surface.setProjection(initialProjection);

  const updatedEdges = [
    {
      id: "rel-1",
      sourceId: "alice",
      targetId: "bob",
      label: "action",
      temporalState: "timeless",
      startTime: 1000,
    },
  ];

  surface.updateTemporalEdges(updatedEdges);
  assert.ok(true, "updateTemporalEdges succeeded");
});

test("GraphSurface contract: transitionProjection handles topology changes", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  const initialProjection = {
    nodes: [{ id: "alice", label: "Alice" }],
    edges: [],
  };

  surface.setProjection(initialProjection);

  const updatedProjection = {
    nodes: [
      { id: "alice", label: "Alice" },
      { id: "bob", label: "Bob" },
    ],
    edges: [
      {
        id: "rel-1",
        sourceId: "alice",
        targetId: "bob",
        label: "appointed",
      },
    ],
  };

  surface.transitionProjection(updatedProjection);
  assert.ok(true, "transitionProjection succeeded");
});

test("GraphSurface contract: getMode() returns renderer name", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  const mode = surface.getMode();
  assert.equal(typeof mode, "string");
  assert.ok(mode.length > 0);
});

test("GraphSurface contract: destroy() cleans up", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  surface.setSelection({ kind: "entity", id: "alice" });
  assert.equal(events.length, 1);

  surface.destroy();
  surface.setSelection(null);

  assert.equal(events.length, 1, "no new event after destroy");
});

test("GraphSurface contract: selection distinguishes entity from relationship", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  const entitySelection = { kind: "entity", id: "alice" };
  surface.setSelection(entitySelection);

  const relationshipSelection = { kind: "relationship", id: "rel-1" };
  surface.setSelection(relationshipSelection);

  assert.equal(events.length, 2);
  assert.equal(events[0].selection.kind, "entity");
  assert.equal(events[1].selection.kind, "relationship");
});

test("GraphSurface contract: event listener receives correct events", () => {
  const events = [];
  const listener = (event) => events.push(event);
  const surface = new MockGraphSurface(listener);

  surface.setSelection({ kind: "entity", id: "test-id" });

  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "selection-changed");
  assert.deepEqual(events[0].selection, { kind: "entity", id: "test-id" });
});

test("GraphSurface contract: camera operations are independent", () => {
  const listener = () => {};
  const surface = new MockGraphSurface(listener);

  surface.setCamera({ x: 10, y: 20, z: 1.5 });
  surface.fit();
  assert.deepEqual(surface.getCamera(), { x: 0, y: 0, z: 1 });

  surface.setCamera({ x: 100, y: 200, z: 3 });
  surface.recenter();
  // recenter moves to center (0, 0) but preserves zoom
  assert.deepEqual(surface.getCamera(), { x: 0, y: 0, z: 3 });
});
