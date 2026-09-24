import assert from "node:assert/strict";
import test from "node:test";

import { createDeckWorldRuntime } from "../site/world/deck-world-runtime.ts";
import { createWorldViewFactory } from "../site/world/world-view-factory.ts";
import { registerTimelineWorldView } from "../site/world/world-view-registration.ts";

test("deck world runtime factory forwards every adapter construction through explicit bindings", () => {
  const calls = [];
  const deck = {
    setProps() {},
    pickObject() {
      return null;
    },
    getViewports() {
      return [];
    },
    redraw() {},
    finalize() {},
  };

  const runtime = createDeckWorldRuntime({
    deck(props) {
      calls.push(["deck", props]);
      return deck;
    },
    globeView(props) {
      calls.push(["globe", props]);
      return { kind: "globe", props };
    },
    scatterplotLayer(props) {
      calls.push(["scatter", props]);
      return { kind: "scatter", props };
    },
    pathLayer(props) {
      calls.push(["path", props]);
      return { kind: "path", props };
    },
  });

  const globe = runtime.createGlobeView({ id: "world" });
  const scatter = runtime.createScatterplotLayer({ id: "entities" });
  const path = runtime.createPathLayer({ id: "edges" });
  const createdDeck = runtime.createDeck({ views: [globe], layers: [scatter, path] });

  assert.deepEqual(globe, { kind: "globe", props: { id: "world" } });
  assert.deepEqual(scatter, { kind: "scatter", props: { id: "entities" } });
  assert.deepEqual(path, { kind: "path", props: { id: "edges" } });
  assert.equal(createdDeck, deck);
  assert.deepEqual(calls, [
    ["globe", { id: "world" }],
    ["scatter", { id: "entities" }],
    ["path", { id: "edges" }],
    ["deck", { views: [globe], layers: [scatter, path] }],
  ]);
});

test("runtime creation does not instantiate any deck resource eagerly", () => {
  let calls = 0;
  const runtime = createDeckWorldRuntime({
    deck() {
      calls += 1;
      throw new Error("not expected");
    },
    globeView() {
      calls += 1;
      throw new Error("not expected");
    },
    scatterplotLayer() {
      calls += 1;
      throw new Error("not expected");
    },
    pathLayer() {
      calls += 1;
      throw new Error("not expected");
    },
  });

  assert.ok(runtime);
  assert.equal(calls, 0);
});
function compositionHarness() {
  const deckCalls = [];
  let settled = true;
  let running = false;
  let iteration = 0;
  const scheduled = new Map();
  let nextHandle = 1;
  let now = 100;

  const deck = {
    setProps(props) {
      deckCalls.push(["setProps", props]);
    },
    pickObject() {
      return null;
    },
    getViewports() {
      return [];
    },
    redraw(force) {
      deckCalls.push(["redraw", force]);
    },
    finalize() {
      deckCalls.push(["finalize"]);
    },
  };

  const bindings = {
    deck(props) {
      deckCalls.push(["deck", props]);
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
    setPin() {},
    apply(request) {
      running = request.reason !== "idle";
      if (request.reason === "idle") settled = true;
    },
    stop() {
      running = false;
    },
    step() {
      iteration += 1;
      settled = true;
    },
    getDiagnostics() {
      return { running, settled, energy: settled ? 0 : 1, iteration };
    },
    destroy() {},
  };

  const container = {};
  const root = {
    querySelector(selector) {
      return selector === ".temporal-graph-canvas" ? container : null;
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
    deckCalls,
    scheduled,
    forceBackend,
    root,
    container,
    scheduler,
    bindings,
    runNextFrame,
  };
}

test("world view factory composes deck surface projection runtime and force scheduler", () => {
  const harness = compositionHarness();
  const factory = createWorldViewFactory({
    bindings: harness.bindings,
    scheduler: harness.scheduler,
    createForceBackend: () => harness.forceBackend,
  });

  const view = factory.create(harness.root);
  assert.ok(view);

  view.setModel({
    entities: [{ id: "alice" }, { id: "bob" }],
    places: [{
      id: "stockholm",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
    }],
    relationships: [{
      id: "meeting",
      subjectId: "alice",
      objectId: "bob",
      predicate: "met",
      placeId: "stockholm",
      time: null,
    }],
  });

  const deckCreation = harness.deckCalls.find(([name]) => name === "deck");
  assert.equal(deckCreation[1].parent, harness.container);
  assert.equal(harness.scheduled.size, 1);

  assert.equal(harness.runNextFrame(), true);
  assert.equal(harness.scheduled.size, 0);
});

test("world view factory accepts GPU-style force backends without CPU snapshots", () => {
  const harness = compositionHarness();
  assert.equal("getSnapshot" in harness.forceBackend, false);

  const view = createWorldViewFactory({
    bindings: harness.bindings,
    scheduler: harness.scheduler,
    createForceBackend: () => harness.forceBackend,
  }).create(harness.root);

  assert.ok(view);
  view.setModel({
    entities: [{ id: "alice" }, { id: "bob" }],
    relationships: [{
      id: "relation",
      subjectId: "alice",
      objectId: "bob",
      predicate: "called",
      time: null,
    }],
  });
  assert.equal(harness.runNextFrame(), true);
});

test("destroying a scheduled world view cancels pending animation work", () => {
  const harness = compositionHarness();
  const view = createWorldViewFactory({
    bindings: harness.bindings,
    scheduler: harness.scheduler,
    createForceBackend: () => harness.forceBackend,
  }).create(harness.root);

  view.setModel({
    entities: [{ id: "alice" }, { id: "bob" }],
    relationships: [{
      id: "relation",
      subjectId: "alice",
      objectId: "bob",
      predicate: "called",
      time: null,
    }],
  });
  assert.equal(harness.scheduled.size, 1);

  view.destroy();
  assert.equal(harness.scheduled.size, 0);
  assert.equal(
    harness.deckCalls.filter(([name]) => name === "finalize").length,
    1,
  );
});


test("world view registration publishes the composed factory without eager deck construction", () => {
  let constructionCalls = 0;
  const target = {};
  const bindings = {
    deck() {
      constructionCalls += 1;
      throw new Error("deck should remain lazy");
    },
    globeView() {
      constructionCalls += 1;
      throw new Error("globe should remain lazy");
    },
    scatterplotLayer() {
      constructionCalls += 1;
      throw new Error("layer should remain lazy");
    },
    pathLayer() {
      constructionCalls += 1;
      throw new Error("layer should remain lazy");
    },
  };

  const factory = registerTimelineWorldView(bindings, {}, target);

  assert.equal(target.TimelineWorldView, factory);
  assert.equal(typeof factory.create, "function");
  assert.equal(constructionCalls, 0);
});
test("deck world runtime exposes MapView only when the binding is supplied", () => {
  const calls = [];
  const runtime = createDeckWorldRuntime({
    deck() {
      throw new Error("not used");
    },
    globeView() {
      throw new Error("not used");
    },
    mapView(props) {
      calls.push(props);
      return { kind: "map", props };
    },
    scatterplotLayer() {
      throw new Error("not used");
    },
    pathLayer() {
      throw new Error("not used");
    },
  });

  assert.equal(typeof runtime.createMapView, "function");
  assert.deepEqual(runtime.createMapView({ id: "local" }), {
    kind: "map",
    props: { id: "local" },
  });
  assert.deepEqual(calls, [{ id: "local" }]);
});
