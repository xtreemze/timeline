import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldViewFactory,
  WORLD_LAYOUT_RUN_BUDGET_MS,
} from "../site/world/world-view-factory.ts";

function harness() {
  const scheduled = new Map();
  let nextHandle = 1;
  let now = 0;
  let running = false;
  let stops = 0;
  const deckCalls = [];
  const deck = {
    setProps(props) {
      deckCalls.push(props);
    },
    pickObject: () => null,
    getViewports: () => [],
    redraw() {},
    finalize() {},
  };
  const bindings = {
    deck: () => deck,
    globeView: (props) => ({ props }),
    scatterplotLayer: (props) => ({ props }),
    pathLayer: (props) => ({ props }),
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
    now: () => now,
  };
  // A layout whose energy never drops below the settle threshold.
  const forceBackend = {
    setScene() {},
    setPin() {},
    apply(request) {
      running = request.reason !== "idle";
    },
    stop() {
      running = false;
      stops += 1;
    },
    step() {},
    getDiagnostics: () => ({ running, settled: false, energy: 1, iteration: 1 }),
    getSnapshot: () => [],
    destroy() {},
  };
  const root = { querySelector: (selector) => (selector === ".temporal-graph-canvas" ? {} : null) };
  function runFrames(count, delta) {
    let ran = 0;
    for (let index = 0; index < count; index += 1) {
      const [entry] = scheduled.entries();
      if (!entry) break;
      scheduled.delete(entry[0]);
      now += delta;
      entry[1](now);
      ran += 1;
    }
    return ran;
  }
  return {
    bindings,
    scheduler,
    forceBackend,
    root,
    runFrames,
    scheduled,
    deckCalls,
    stops: () => stops,
  };
}

const model = () => ({
  entities: [{ id: "alice" }, { id: "bob" }],
  places: [{ id: "stockholm", geometry: { type: "Point", coordinates: [18.0686, 59.3293] } }],
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
});

test("a layout that never settles stops animating once its run budget is spent", () => {
  const built = harness();
  const view = createWorldViewFactory({
    bindings: built.bindings,
    scheduler: built.scheduler,
    createForceBackend: () => built.forceBackend,
  }).create(built.root);
  view.setModel(model());

  // Slow device: 300 ms per frame. Without a budget this would run forever.
  const ran = built.runFrames(1_000, 300);
  assert.ok(ran <= Math.ceil(WORLD_LAYOUT_RUN_BUDGET_MS / 300) + 2, `ran ${ran} frames`);
  assert.equal(built.scheduled.size, 0, "no frame left scheduled");
  assert.ok(built.stops() >= 1, "the backend was stopped");

  // Window updates do not restart the spent budget...
  view.setWindow({ start: 0, end: 1 });
  built.runFrames(1_000, 300);
  assert.equal(built.scheduled.size, 0);

  // ...but new data does.
  view.setModel(model());
  assert.ok(built.runFrames(3, 16) >= 1);
});

test("layout pushes to the surface are throttled while the layout drifts", () => {
  const built = harness();
  const view = createWorldViewFactory({
    bindings: built.bindings,
    scheduler: built.scheduler,
    createForceBackend: () => built.forceBackend,
  }).create(built.root);
  view.setModel(model());
  const before = built.deckCalls.filter((props) => props.layers).length;
  built.runFrames(30, 16); // ~480 ms of 16 ms frames
  const renders = built.deckCalls.filter((props) => props.layers).length - before;
  assert.ok(renders <= 6, `rendered ${renders} times in 30 frames`);
});
