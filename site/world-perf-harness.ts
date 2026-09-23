/**
 * Test-only harness entrypoint (issue #445 Priority 7 performance
 * certification). Mounts a real `DeckWorldSurface` backed by the real
 * `realDeckWorldBindings` (real deck.gl / real WebGL context, same runtime
 * `site/world-view-shim.ts` registers for production) and exposes it on
 * `window.__worldPerfHarness` so a Playwright test can drive it directly:
 * `setProjection`, `setCamera`, `pick`, `getAccessibleSnapshot`. This page
 * is not part of the production build input (see `vite.config.ts`
 * `rollupOptions.input`) — it exists purely so the Playwright certification
 * spec can exercise the real renderer without the full app shell.
 */

import type { WorldNodeDragPosition } from "../src/interaction/world-node-drag-controller.ts";
import { createWorldCameraState } from "../src/layout/world-surface.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
  type WorldInstanceId,
  type WorldProjection,
} from "../src/projection/world-projection.ts";
import { realDeckWorldBindings } from "./world/deck-world-bindings.ts";
import { createDeckWorldRuntime } from "./world/deck-world-runtime.ts";
import { type DeckWorldNodeDragSink, DeckWorldSurface } from "./world/deck-world-surface.ts";

declare global {
  interface Window {
    __worldPerfHarness: {
      surface: DeckWorldSurface;
      ready: boolean;
      /** Test-only readback of the exact projection last passed to
       * setProjection, so a Playwright spec can distinguish canonical
       * geographic anchors from presentation-only derived offsets applied
       * by the harness's drag sink below. */
      getProjection(): WorldProjection;
      /** Number of begin/update/release calls the test-only drag sink has
       * received, for asserting a drag sequence actually engaged it. */
      dragSinkCalls: { begin: number; update: number; release: number; cancel: number };
    };
    /** Test-only retained fixture used by the performance certification page. */
    __worldPerfFixture?: WorldProjection;
  }
}

const container = document.getElementById("world-container");
if (!container) throw new Error("world-perf-harness: missing #world-container");

const runtime = createDeckWorldRuntime(realDeckWorldBindings);
const surface = new DeckWorldSurface(
  container,
  runtime,
  createWorldCameraState({ longitude: 0, latitude: 20, zoom: 1, bearing: 0, pitch: 20 }),
);

let currentProjection: WorldProjection = { instances: [], edges: [] };
const originalSetProjection = surface.setProjection.bind(surface);
surface.setProjection = (projection: WorldProjection) => {
  currentProjection = projection;
  originalSetProjection(projection);
};

const dragSinkCalls = { begin: 0, update: 0, release: 0, cancel: 0 };

/**
 * Test-only node-drag sink (issue #445 Priority 8, item 3). Production
 * dragging is coordinated through `createWorldNodeDragController`, which
 * wires an interaction coordinator and force-simulation backend that this
 * minimal harness does not stand up. This sink instead directly demonstrates
 * the same canonical/derived split that production relies on
 * (`resolveWorldRenderPosition` reading `instance.localOffset` as a
 * presentation-only input over the canonical `geographicAnchors`): it
 * rewrites only `localOffset` on the dragged instance, via `setProjection`,
 * leaving `geographicAnchors` untouched.
 */
const dragOffsets = new Map<WorldInstanceId, WorldNodeDragPosition>();

function applyDragOffsets(): void {
  const instances = currentProjection.instances.map((instance) => {
    const offset = dragOffsets.get(instance.id);
    if (!offset) return instance;
    return createProjectedWorldInstance({
      ...instance,
      localOffset: {
        eastMeters: offset.eastMeters,
        northMeters: offset.northMeters,
      },
    });
  });
  const next = createWorldProjection({ instances, edges: currentProjection.edges });
  currentProjection = next;
  originalSetProjection(next);
}

const testDragSink: DeckWorldNodeDragSink = {
  begin(_pointerId, instanceId, position) {
    dragSinkCalls.begin++;
    dragOffsets.set(instanceId, position);
    applyDragOffsets();
    return true;
  },
  update(_pointerId, position) {
    dragSinkCalls.update++;
    const [instanceId] = [...dragOffsets.keys()];
    if (instanceId === undefined) return false;
    dragOffsets.set(instanceId, position);
    applyDragOffsets();
    return true;
  },
  release() {
    dragSinkCalls.release++;
    return true;
  },
  cancel() {
    dragSinkCalls.cancel++;
  },
};
surface.setNodeDragSink(testDragSink);

window.__worldPerfHarness = {
  surface,
  ready: true,
  getProjection: () => currentProjection,
  dragSinkCalls,
};
