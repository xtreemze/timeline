import assert from "node:assert/strict";
import test from "node:test";

import { createWorldViewFactory } from "../site/world/world-view-factory.ts";

function harness() {
  const deckCalls = [];
  const scheduled = new Map();
  const pins = [];
  let nextHandle = 1;
  let now = 100;
  let running = false;
  let settled = true;

  const deck = {
    setProps(props) {
      deckCalls.push(props);
    },
    pickObject() {
      return null;
    },
    getViewports() {
      return [
        {
          project(position) {
            return position;
          },
          unproject() {
            return [18.0687, 59.3294, 1000];
          },
        },
      ];
    },
    redraw() {},
    finalize() {},
  };

  const bindings = {
    deck() {
      return deck;
    },
    globeView(props) {
      return { kind: "globe", props };
    },
    scatterplotLayer(props) {
      return { kind: "scatter", props };
    },
    pathLayer(props) {
      return { kind: "path", props };
    },
  };

  const scheduler = {
    request(callback) {
      const handle = nextHandle++;
      scheduled.set(handle, callback);
      return handle;
    },
    cancel(handle) {
      scheduled.delete(handle);
    },
    now() {
      return now;
    },
  };

  const forceBackend = {
    setScene() {
      settled = false;
    },
    setPin(pin) {
      pins.push(pin);
    },
    apply(request) {
      running = request.reason !== "idle";
      if (request.reason === "idle") settled = true;
    },
    stop() {
      running = false;
    },
    step() {
      settled = true;
    },
    getDiagnostics() {
      return { running, settled, energy: settled ? 0 : 1, iteration: 1 };
    },
    destroy() {},
  };

  const root = {
    querySelector(selector) {
      return selector === ".temporal-graph-canvas" ? {} : null;
    },
  };

  function runNextFrame(delta = 16) {
    const [entry] = scheduled.entries();
    if (!entry) return false;
    const [handle, callback] = entry;
    scheduled.delete(handle);
    now += delta;
    callback(now);
    return true;
  }

  return {
    bindings,
    deckCalls,
    forceBackend,
    pins,
    root,
    runNextFrame,
    scheduled,
    scheduler,
  };
}

function model() {
  return {
    entities: [{ id: "alice" }, { id: "bob" }],
    places: [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
    ],
    relationships: [
      {
        id: "meeting",
        subjectId: "alice",
        objectId: "bob",
        predicate: "met",
        placeId: "stockholm",
        time: null,
      },
    ],
  };
}

test("production factory wires DeckWorldSurface drag into the force runtime and wakes RAF", () => {
  const built = harness();
  const view = createWorldViewFactory({
    bindings: built.bindings,
    scheduler: built.scheduler,
    createForceBackend: () => built.forceBackend,
  }).create(built.root);

  assert.ok(view);
  view.setModel(model());
  assert.equal(built.runNextFrame(), true);
  assert.equal(built.scheduled.size, 0);

  const entityLayer = built.deckCalls
    .flatMap((props) => props.layers ?? [])
    .filter((layer) => layer.props?.id === "lum-world-entities")
    .at(-1);
  assert.ok(entityLayer);
  assert.equal(typeof entityLayer.props.onDragStart, "function");

  const datum = entityLayer.props.data.find((candidate) => candidate.kind === "entity");
  assert.ok(datum);

  const claimed = entityLayer.props.onDragStart(
    { object: datum, x: 100, y: 100 },
    { srcEvent: { pointerId: 7 } },
  );
  assert.equal(claimed, true);
  assert.equal(built.pins.at(-1)?.instanceId, datum.worldInstanceId);
  assert.equal(built.scheduled.size, 1);

  const released = entityLayer.props.onDragEnd(
    { object: datum, x: 110, y: 110 },
    { srcEvent: { pointerId: 7 } },
  );
  assert.equal(released, true);
  assert.equal(built.pins.at(-1), null);
  assert.equal(built.scheduled.size, 1);
});
