import assert from "node:assert/strict";
import test from "node:test";

import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import {
  createWorldTouchHoldGate,
  WORLD_TOUCH_HOLD_MS,
  WORLD_TOUCH_HOLD_TOLERANCE_PX,
} from "../src/interaction/world-touch-hold.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

test("the hold gate arms only after a stationary single-finger press", () => {
  const gate = createWorldTouchHoldGate();
  gate.press(1, { x: 50, y: 50 }, 1_000);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS - 1), false);
  gate.move(1, { x: 50 + WORLD_TOUCH_HOLD_TOLERANCE_PX - 1, y: 50 }, 1_100);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS), true);

  // Movement after arming is the drag itself and never disarms.
  gate.move(1, { x: 200, y: 200 }, 1_000 + WORLD_TOUCH_HOLD_MS + 5);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS + 10), true);

  gate.release(1);
  assert.equal(gate.isArmed(1, 5_000), false);
});

test("moving beyond tolerance before the hold completes makes the gesture a pan", () => {
  const gate = createWorldTouchHoldGate();
  gate.press(1, { x: 50, y: 50 }, 0);
  gate.move(1, { x: 50 + WORLD_TOUCH_HOLD_TOLERANCE_PX + 1, y: 50 }, 100);
  assert.equal(gate.isArmed(1, WORLD_TOUCH_HOLD_MS * 2), false);
});

test("a second finger cancels a pending hold so pinch keeps camera ownership", () => {
  const gate = createWorldTouchHoldGate();
  gate.press(1, { x: 50, y: 50 }, 0);
  gate.press(2, { x: 90, y: 50 }, 50);
  assert.equal(gate.isArmed(1, WORLD_TOUCH_HOLD_MS * 2), false);
  assert.equal(gate.isArmed(2, WORLD_TOUCH_HOLD_MS * 2), false);
});

function surfaceHarness() {
  const listeners = new Map();
  const dataset = {};
  const container = {
    dataset,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const scatter = [];
  let pickResult = null;
  const runtime = {
    createGlobeView: (props) => ({ props }),
    createScatterplotLayer(props) {
      const layer = { props };
      scatter.push(layer);
      return layer;
    },
    createPathLayer: (props) => ({ props }),
    createDeck() {
      return {
        setProps() {},
        pickObject: () => pickResult,
        getViewports: () => [
          {
            project: (c) => [c[0] + 100, c[1] + 200, 0.5],
            unproject: (p, o) => [p[0] - 100, p[1] - 200, o?.targetZ ?? 0],
          },
        ],
        redraw() {},
        finalize() {},
      };
    },
  };
  const surface = new DeckWorldSurface(container, runtime);
  const id = worldInstanceId("alice", "meeting");
  surface.setProjection(
    createWorldProjection({
      instances: [
        createProjectedWorldInstance({
          id,
          canonicalId: "alice",
          label: "Alice",
          occurrenceId: "meeting",
          geographicAnchors: [
            { placeId: "stockholm", longitude: 18.0686, latitude: 59.3293, influence: 1 },
          ],
          temporalWeight: 1,
          visualWeight: 1,
          retained: false,
        }),
      ],
      edges: [],
    }),
  );
  const begins = [];
  surface.setNodeDragSink({
    begin(pointerId, instanceId) {
      begins.push([pointerId, instanceId]);
      return true;
    },
    update: () => true,
    release: () => true,
    cancel() {},
  });
  const entityLayer = () =>
    scatter.filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities).at(-1);
  const alice = () => entityLayer().props.data.find((datum) => datum.entityId === "alice");
  return {
    surface,
    listeners,
    dataset,
    begins,
    alice,
    entityLayer,
    setPickResult(value) {
      pickResult = value;
    },
    touch(type, pointerId, x, y) {
      listeners.get(type)?.({
        pointerType: "touch",
        pointerId,
        offsetX: x,
        offsetY: y,
        clientX: x,
        clientY: y,
      });
    },
    dragStart(pointerId, pointerType = "touch") {
      return entityLayer().props.onDragStart(
        { object: alice(), x: 118.0786, y: 259.3393 },
        { srcEvent: { pointerId, pointerType } },
      );
    },
  };
}

test("a quick one-finger touch drag starting on an entity pans the globe instead of dragging", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const h = surfaceHarness();
  h.setPickResult({ object: h.alice() });

  h.touch("pointerdown", 4, 118, 259);
  t.mock.timers.tick(80);
  h.touch("pointermove", 4, 140, 259);

  assert.equal(h.dragStart(4), false, "deck keeps the gesture for camera panning");
  assert.deepEqual(h.begins, []);
});

test("a long press on an entity then drag claims the node drag", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const h = surfaceHarness();
  h.setPickResult({ object: h.alice() });

  h.touch("pointerdown", 4, 118, 259);
  assert.equal(h.dataset.worldTouchDrag, "holding");
  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS);
  assert.equal(h.dataset.worldTouchDrag, "active");
  assert.deepEqual(h.surface.getAccessibleSnapshot().selection, { kind: "entity", id: "alice" });

  h.touch("pointermove", 4, 160, 280);
  assert.equal(h.dragStart(4), true);
  assert.deepEqual(h.begins, [[4, worldInstanceId("alice", "meeting")]]);

  h.touch("pointerup", 4, 160, 280);
  assert.equal(h.dataset.worldTouchDrag, undefined);
});

test("a second finger during the hold cancels it and never starts a node drag", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const h = surfaceHarness();
  h.setPickResult({ object: h.alice() });

  h.touch("pointerdown", 4, 118, 259);
  t.mock.timers.tick(100);
  h.touch("pointerdown", 5, 180, 259);
  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS);

  assert.equal(h.dataset.worldTouchDrag, undefined);
  assert.equal(h.dragStart(4), false);
  assert.deepEqual(h.begins, []);
});

test("touch presses off any entity never arm a hold", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const h = surfaceHarness();
  h.setPickResult(null);

  h.touch("pointerdown", 4, 10, 10);
  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS * 2);
  assert.equal(h.dataset.worldTouchDrag, undefined);
});

test("mouse and pen drags stay immediate", () => {
  const h = surfaceHarness();
  assert.equal(h.dragStart(9, "mouse"), true);
  assert.equal(h.begins.length, 1);
});

test("destroy removes every touch-hold listener", () => {
  const h = surfaceHarness();
  h.surface.destroy();
  assert.equal(h.listeners.size, 0);
});

test("a claimed node drag stops deck event propagation so the controller never pans", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const h = surfaceHarness();
  h.setPickResult({ object: h.alice() });
  let stopped = 0;
  const event = (pointerType) => ({
    srcEvent: { pointerId: 4, pointerType },
    stopPropagation() {
      stopped += 1;
    },
  });

  assert.equal(
    h.entityLayer().props.onDragStart({ object: h.alice(), x: 118, y: 259 }, event("touch")),
    false,
  );
  assert.equal(stopped, 0, "an unclaimed touch drag stays with the camera");

  h.touch("pointerdown", 4, 118, 259);
  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS);
  assert.equal(
    h.entityLayer().props.onDragStart({ object: h.alice(), x: 118, y: 259 }, event("touch")),
    true,
  );
  assert.equal(stopped, 1);
});

test("a quick swipe processed late on a busy thread still pans instead of claiming the node", () => {
  const gate = createWorldTouchHoldGate();
  gate.press(1, { x: 0, y: 0 }, 1_000);
  // The hold timer fires late and arms before the queued move is handled...
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS + 50), true);
  // ...but the move itself happened 40 ms after touch-down, beyond tolerance.
  gate.move(1, { x: 60, y: 0 }, 1_040);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS + 60), false);
});

test("once the node drag is committed later moves never cancel it", () => {
  const gate = createWorldTouchHoldGate();
  gate.press(1, { x: 0, y: 0 }, 1_000);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS), true);
  gate.commit(1);
  gate.move(1, { x: 80, y: 0 }, 1_010);
  assert.equal(gate.isArmed(1, 1_000 + WORLD_TOUCH_HOLD_MS + 20), true);
});
