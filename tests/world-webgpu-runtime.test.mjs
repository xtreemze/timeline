import assert from "node:assert/strict";
import test from "node:test";

import { worldDeviceProps } from "../site/world/deck-world-bindings.ts";
import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import { WORLD_TOUCH_HOLD_MS } from "../src/interaction/world-touch-hold.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

test("experimental WebGPU device props prefer WebGPU and retain WebGL2 fallback", () => {
  const webgpuAdapter = { type: "webgpu-test-adapter" };
  const props = worldDeviceProps(webgpuAdapter);

  assert.equal(props.type, "best-available");
  assert.equal(props.adapters.length, 2);
  assert.equal(props.adapters[0], webgpuAdapter);
  assert.notEqual(props.adapters[1], webgpuAdapter);
  assert.deepEqual(props.createCanvasContext, { alphaMode: "premultiplied" });
});

test("production default remains WebGL2 until WebGPU certification is complete", () => {
  assert.deepEqual(worldDeviceProps(), { type: "webgl" });
});

function asyncPickingSurfaceHarness() {
  const listeners = new Map();
  const dataset = {};
  const scatterLayers = [];
  const iconLayers = [];
  let asyncPickResult = null;

  const container = {
    dataset,
    dispatchEvent(event) {
      if (event.type === "worldcontextrequest") event.preventDefault();
      return !event.defaultPrevented;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };

  const runtime = {
    createGlobeView: (props) => ({ props }),
    createScatterplotLayer(props) {
      const layer = { props };
      scatterLayers.push(layer);
      return layer;
    },
    createIconLayer(props) {
      const layer = { props };
      iconLayers.push(layer);
      return layer;
    },
    createPathLayer: (props) => ({ props }),
    createDeck() {
      return {
        setProps() {},
        pickObject() {
          throw new Error("synchronous picking unavailable on WebGPU");
        },
        async pickObjectAsync() {
          return asyncPickResult;
        },
        getViewports: () => [
          {
            project: (coordinates) => [coordinates[0] + 100, coordinates[1] + 200, 0.5],
            unproject: (pixels, options) => [
              pixels[0] - 100,
              pixels[1] - 200,
              options?.targetZ ?? 0,
            ],
          },
        ],
        redraw() {},
        finalize() {},
      };
    },
  };

  const surface = new DeckWorldSurface(container, runtime);
  const instanceId = worldInstanceId("alice", "meeting");
  surface.setProjection(
    createWorldProjection({
      instances: [
        createProjectedWorldInstance({
          id: instanceId,
          canonicalId: "alice",
          label: "Alice",
          occurrenceId: "meeting",
          geographicAnchors: [
            {
              placeId: "stockholm",
              longitude: 18.0686,
              latitude: 59.3293,
              influence: 1,
            },
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
    begin(pointerId, id) {
      begins.push([pointerId, id]);
      return true;
    },
    update() {
      return true;
    },
    release() {
      return true;
    },
    cancel() {},
  });

  const entityLayer = () =>
    scatterLayers.filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities).at(-1);
  const entity = () => entityLayer().props.data.find((datum) => datum.entityId === "alice");

  return {
    surface,
    dataset,
    begins,
    setAsyncPickEntity() {
      asyncPickResult = {
        object: entity(),
        layer: { id: DECK_WORLD_LAYER_IDS.entities },
        x: 118,
        y: 259,
      };
    },
    setAsyncPickNonEntity() {
      asyncPickResult = {
        object: { kind: "place", placeId: "stockholm" },
        layer: { id: DECK_WORLD_LAYER_IDS.places },
        x: 118,
        y: 259,
      };
    },
    touch(type, pointerId, x, y, timeStamp = Date.now()) {
      listeners.get(type)?.({
        pointerType: "touch",
        pointerId,
        offsetX: x,
        offsetY: y,
        clientX: x,
        clientY: y,
        timeStamp,
        preventDefault() {},
        stopPropagation() {},
      });
    },
  };
}

test("WebGPU async picking preserves long-press entity drag semantics", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const harness = asyncPickingSurfaceHarness();
  harness.setAsyncPickEntity();

  harness.touch("pointerdown", 4, 118, 259, 1_000);
  assert.equal(harness.dataset.worldTouchDrag, "holding");

  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS + 1);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.dataset.worldTouchDrag, "active");
  assert.deepEqual(harness.begins, [[4, worldInstanceId("alice", "meeting")]]);
  assert.deepEqual(harness.surface.getAccessibleSnapshot().selection, {
    kind: "entity",
    id: "alice",
  });
});


test("WebGPU async non-entity picks do not retain the touch hold", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 10_000 });
  const harness = asyncPickingSurfaceHarness();
  harness.setAsyncPickNonEntity();

  harness.touch("pointerdown", 4, 118, 259, 1_000);
  assert.equal(harness.dataset.worldTouchDrag, "holding");

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(
    harness.dataset.worldTouchDrag,
    undefined,
    "an edge/place hit must yield before the long-press threshold just as WebGL2 does",
  );
  t.mock.timers.tick(WORLD_TOUCH_HOLD_MS + 1);
  assert.deepEqual(harness.begins, []);
});
