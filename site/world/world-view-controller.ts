import {
  createInteractionCoordinator,
  type InteractionCompletionReason,
  type InteractionCoordinator,
} from "../../src/interaction/interaction-coordinator.ts";
import {
  createWorldNodeDragController,
  type WorldNodeDragPosition,
} from "../../src/interaction/world-node-drag-controller.ts";
import {
  applyWorldForceLayout,
  type WorldForceLayoutSample,
} from "../../src/layout/world-force-layout.ts";
import {
  createWorldForceScene,
  type WorldForceScenePolicy,
} from "../../src/layout/world-force-scene.ts";
import {
  createWorldSimulationCoordinator,
  type WorldForceSimulationBackend,
} from "../../src/layout/world-force-simulation.ts";
import type {
  WorldSelection,
  WorldSurface,
  WorldTemporalWindow,
} from "../../src/layout/world-surface.ts";
import type { WorldInstanceId, WorldProjection } from "../../src/projection/world-projection.ts";
import {
  diffWorldProjection,
  isEmptyWorldProjectionDelta,
} from "../../src/projection/world-projection-delta.ts";

export interface WorldLayoutReadback {
  read(): readonly WorldForceLayoutSample[];
}

/**
 * Execution-only bridge for a GPU-resident force backend.
 *
 * Implementations may bind backend-owned luma resources directly into the
 * WorldSurface execution path. The bridge deliberately exposes no GPU handles
 * to projection/domain code and avoids requiring per-frame CPU position
 * readback simply to render simulation results.
 */
export interface WorldGpuLayoutBridge {
  syncFrame(): void;
  destroy(): void;
}

export interface WorldViewRuntimeOptions {
  readonly surface: WorldSurface;
  readonly forceBackend: WorldForceSimulationBackend;
  readonly interaction?: InteractionCoordinator;
  readonly forcePolicy?: WorldForceScenePolicy;
  readonly layoutReadback?: WorldLayoutReadback;
  readonly gpuLayoutBridge?: WorldGpuLayoutBridge;
}

export interface WorldViewRuntimeState {
  readonly projectionRevision: number;
  readonly hasProjection: boolean;
  readonly simulationRunning: boolean;
  readonly simulationSettled: boolean;
  readonly dragging: boolean;
  readonly settlingDrag: boolean;
}

/** Minimum simulated time between layout pushes to the surface. */
export const WORLD_LAYOUT_PUSH_INTERVAL_MS = 100;

export class WorldViewRuntimeController {
  readonly #surface: WorldSurface;
  readonly #forceBackend: WorldForceSimulationBackend;
  readonly #simulation;
  readonly #interaction: InteractionCoordinator;
  readonly #drag;
  readonly #forcePolicy?: WorldForceScenePolicy;
  readonly #layoutReadback?: WorldLayoutReadback;
  readonly #gpuLayoutBridge?: WorldGpuLayoutBridge;

  #sourceProjection: WorldProjection | null = null;
  #renderProjection: WorldProjection | null = null;
  #projectionRevision = 0;
  #sinceLayoutPush = Number.POSITIVE_INFINITY;
  #destroyed = false;

  constructor(options: WorldViewRuntimeOptions) {
    if (options.layoutReadback && options.gpuLayoutBridge) {
      throw new Error(
        "World layout readback and GPU layout bridge are mutually exclusive execution paths.",
      );
    }

    this.#surface = options.surface;
    this.#forceBackend = options.forceBackend;
    this.#interaction = options.interaction ?? createInteractionCoordinator();
    this.#simulation = createWorldSimulationCoordinator(this.#forceBackend);
    this.#drag = createWorldNodeDragController(
      this.#interaction,
      this.#simulation,
      this.#forceBackend,
    );
    this.#forcePolicy = options.forcePolicy;
    this.#layoutReadback = options.layoutReadback;
    this.#gpuLayoutBridge = options.gpuLayoutBridge;
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();
    const previous = this.#sourceProjection;
    this.#sourceProjection = projection;
    this.#renderProjection = projection;
    this.#projectionRevision += 1;

    this.#forceBackend.setScene(
      this.#forcePolicy
        ? createWorldForceScene(projection, this.#forcePolicy)
        : createWorldForceScene(projection),
    );
    this.#simulation.request({
      reason: "projection-update",
      energyTarget: 0.08,
      reheat: true,
    });

    if (previous && this.#surface.applyProjectionDelta) {
      const delta = diffWorldProjection(previous, projection);
      if (!isEmptyWorldProjectionDelta(delta)) this.#surface.applyProjectionDelta(delta);
      return;
    }

    this.#surface.setProjection(projection);
  }

  setTemporalWindow(window: WorldTemporalWindow): void {
    this.#assertAlive();
    this.#surface.setTemporalWindow(window);
  }

  setSelection(selection: WorldSelection | null): void {
    this.#assertAlive();
    this.#surface.setSelection(selection);
  }

  focusEntity(id: Parameters<WorldSurface["focusEntity"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusEntity(id);
  }

  focusOccurrence(id: Parameters<WorldSurface["focusOccurrence"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusOccurrence(id);
  }

  focusPlace(id: Parameters<WorldSurface["focusPlace"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusPlace(id);
  }

  beginNodeDrag(
    pointerId: number,
    instanceId: WorldInstanceId,
    position: WorldNodeDragPosition,
  ): boolean {
    this.#assertAlive();
    return this.#drag.begin(pointerId, { instanceId, position });
  }

  updateNodeDrag(pointerId: number, position: WorldNodeDragPosition): boolean {
    this.#assertAlive();
    return this.#drag.update(pointerId, position);
  }

  releaseNodeDrag(pointerId: number): boolean {
    this.#assertAlive();
    return this.#drag.release(pointerId);
  }

  cancelNodeDrag(reason: Exclude<InteractionCompletionReason, "release">): void {
    this.#assertAlive();
    this.#drag.cancel(reason);
  }

  step(deltaMs: number): WorldViewRuntimeState {
    this.#assertAlive();

    this.#forceBackend.step?.(deltaMs);

    // The zero-readback GPU bridge updates positions in place every frame;
    // only the CPU readback path rebuilds layers and is throttled below.
    this.#gpuLayoutBridge?.syncFrame();

    const diagnostics = this.#forceBackend.getDiagnostics();
    // Physics steps every frame, but pushing a new layout to the surface
    // rebuilds and redraws every layer; throttle that while the layout is
    // only drifting (drags still update every frame, the settled layout is
    // always pushed).
    this.#sinceLayoutPush += Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    if (
      diagnostics.settled ||
      this.#drag.state().active ||
      this.#sinceLayoutPush >= WORLD_LAYOUT_PUSH_INTERVAL_MS
    ) {
      this.#pushLayout();
    }

    if (diagnostics.settled) {
      this.#simulation.release("projection-update");
      this.#simulation.release("spatial-anchor-update");
      if (this.#drag.state().settling) this.#drag.commit();
    }

    return this.state();
  }

  /**
   * Ends the current layout run without waiting for the energy criterion:
   * stops the backend, releases the settle-driven simulation holds and
   * commits a drag that was waiting to settle. Used when the frame budget
   * for a run is spent (slow devices can otherwise animate indefinitely).
   */
  settle(): void {
    this.#assertAlive();
    this.#forceBackend.stop();
    this.#pushLayout();
    this.#simulation.release("projection-update");
    this.#simulation.release("spatial-anchor-update");
    if (this.#drag.state().settling) this.#drag.commit();
  }

  #pushLayout(): void {
    this.#sinceLayoutPush = 0;
    if (this.#gpuLayoutBridge || !this.#layoutReadback || !this.#sourceProjection) return;
    const samples = this.#layoutReadback.read();
    this.#renderProjection = applyWorldForceLayout(this.#sourceProjection, samples);
    this.#surface.setProjection(this.#renderProjection);
  }

  refresh(): void {
    this.#assertAlive();
    this.#surface.refresh();
  }

  state(): WorldViewRuntimeState {
    const diagnostics = this.#forceBackend.getDiagnostics();
    const drag = this.#drag.state();

    return Object.freeze({
      projectionRevision: this.#projectionRevision,
      hasProjection: this.#sourceProjection !== null,
      simulationRunning: diagnostics.running,
      simulationSettled: diagnostics.settled,
      dragging: drag.active,
      settlingDrag: drag.settling,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#simulation.clear();
    this.#gpuLayoutBridge?.destroy();
    this.#forceBackend.destroy();
    this.#surface.destroy();
  }

  getInteractionCoordinator(): InteractionCoordinator {
    return this.#interaction;
  }

  getRenderProjection(): WorldProjection | null {
    return this.#renderProjection;
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error("WorldViewRuntimeController has been destroyed.");
    }
  }
}
