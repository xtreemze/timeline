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
import {
  diffWorldProjection,
  type WorldProjectionDelta,
} from "../src/projection/world-projection-delta.ts";
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
      /** Build a renderer-neutral delta outside timed measurement regions. */
      diffProjection(next: WorldProjection): WorldProjectionDelta;
      /** Exercise the same sparse WorldSurface boundary production force readback uses. */
      applyProjectionDelta(delta: WorldProjectionDelta): void;
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

const instanceById = new Map<WorldInstanceId, WorldProjection["instances"][number]>();
const edgeById = new Map<
  WorldProjection["edges"][number]["id"],
  WorldProjection["edges"][number]
>();
const originalSetProjection = surface.setProjection.bind(surface);
const originalApplyProjectionDelta = surface.applyProjectionDelta.bind(surface);

function replaceHarnessProjection(projection: WorldProjection): void {
  instanceById.clear();
  for (const instance of projection.instances) instanceById.set(instance.id, instance);
  edgeById.clear();
  for (const edge of projection.edges) edgeById.set(edge.id, edge);
}

function currentProjection(): WorldProjection {
  return createWorldProjection({
    instances: [...instanceById.values()],
    edges: [...edgeById.values()],
  });
}

surface.setProjection = (projection: WorldProjection) => {
  replaceHarnessProjection(projection);
  originalSetProjection(projection);
};

function applyProjectionDelta(delta: WorldProjectionDelta): void {
  // Update the real surface first. The harness mirrors successful writes only
  // so failed renderer updates cannot leave test readback ahead of production.
  originalApplyProjectionDelta(delta);

  for (const id of delta.removedInstanceIds) instanceById.delete(id);
  for (const instance of delta.updatedInstances) instanceById.set(instance.id, instance);
  for (const instance of delta.addedInstances) instanceById.set(instance.id, instance);

  for (const id of delta.removedEdgeIds) edgeById.delete(id);
  for (const edge of delta.updatedEdges) edgeById.set(edge.id, edge);
  for (const edge of delta.addedEdges) edgeById.set(edge.id, edge);
}

const dragSinkCalls = { begin: 0, update: 0, release: 0, cancel: 0 };

/**
 * Test-only node-drag sink (issue #445 Priority 8, item 3). Production
 * dragging is coordinated through `createWorldNodeDragController`, which
 * wires an interaction coordinator and force-simulation backend that this
 * minimal harness does not stand up. This sink instead directly demonstrates
 * the same canonical/derived split that production relies on
 * (`resolveWorldRenderPosition` reading `instance.localOffset` as a
 * presentation-only input over the canonical `geographicAnchors`): it
 * rewrites only `localOffset` on the dragged instance through the sparse
 * `applyProjectionDelta` boundary, leaving `geographicAnchors` untouched.
 */
const dragOffsets = new Map<WorldInstanceId, WorldNodeDragPosition>();

function applyDragOffsets(): void {
  const updatedInstances: WorldProjection["instances"][number][] = [];
  for (const [instanceId, offset] of dragOffsets) {
    const instance = instanceById.get(instanceId);
    if (!instance) continue;
    updatedInstances.push(
      createProjectedWorldInstance({
        ...instance,
        localOffset: {
          eastMeters: offset.eastMeters,
          northMeters: offset.northMeters,
        },
      }),
    );
  }
  if (updatedInstances.length === 0) return;

  applyProjectionDelta(
    Object.freeze({
      addedInstances: Object.freeze([]),
      updatedInstances: Object.freeze(updatedInstances),
      removedInstanceIds: Object.freeze([]),
      addedEdges: Object.freeze([]),
      updatedEdges: Object.freeze([]),
      removedEdgeIds: Object.freeze([]),
    }),
  );
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
    dragOffsets.clear();
    return true;
  },
  cancel() {
    dragSinkCalls.cancel++;
    dragOffsets.clear();
  },
};
surface.setNodeDragSink(testDragSink);

window.__worldPerfHarness = {
  surface,
  ready: true,
  getProjection: currentProjection,
  diffProjection: (next) => diffWorldProjection(currentProjection(), next),
  applyProjectionDelta,
  dragSinkCalls,
};
