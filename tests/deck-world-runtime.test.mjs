import assert from "node:assert/strict";
import test from "node:test";

import { createDeckWorldRuntime } from "../site/world/deck-world-runtime.ts";

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
