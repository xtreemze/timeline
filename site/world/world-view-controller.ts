import type { WorldSelection, WorldSurface, WorldTemporalWindow } from "../../src/layout/world-surface.ts";
import { applyWorldForceLayout, type WorldForceLayoutSample } from "../../src/layout/world-force-layout.ts";
import { createWorldForceScene, type WorldForceScenePolicy } from "../../src/layout/world-force-scene.ts";
import {
  createWorldSimulationCoordinator,
  type WorldForceSimulationBackend,
} from "../../src/layout/world-force-simulation.ts";
import {
  createWorldNodeDragController,
  type WorldNodeDragPosition,
} from "../../src/interaction/world-node-drag-controller.ts";
import {
  createInteractionCoordinator,
  type InteractionCompletionReason,
  type InteractionCoordinator,
} from "../../src/interaction/interaction-coordinator.ts";
import type {
  WorldInstanceId,
  WorldProjection,
} from "../../src/projection/world-projection.ts";

export interface WorldLayoutReadback {
  read(): readonly WorldForceLayoutSample[];
}

export interface WorldViewRuntimeOptions {
  readonly surface: WorldSurface;
  readonly forceBackend: WorldForceSimulationBackend;
  readonly interaction?: InteractionCoordinator;
  readonly forcePolicy?: WorldForceScenePolicy;
  readonly layoutReadback?: WorldLayoutReadback;
}

export interface WorldViewRuntimeState {
  readonly projectionRevision: number;
  readonly hasProjection: boolean;
  readonly simulationRunning: boolean;
  readonly simulationSettled: boolean;
  readonly dragging: boolean;
  readonly settlingDrag: boolean;
}

export class WorldViewRuntimeController {
  readonly #surface: WorldSurface;
  readonly #forceBackend: WorldForceSimulationBackend;
  readonly #simulation;
  readonly #interaction: InteractionCoordinator;
  readonly #drag;
  readonly #forcePolicy?: WorldForceScenePolicy;
  readonly #layoutReadback?: WorldLayoutReadback;

  #sourceProjection: WorldProjection | null = null;
  #renderProjection: WorldProjection | null = null;
  #projectionRevision = 0;
  #destroyed = false;

  constructor(options: WorldViewRuntimeOptions) {
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
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();
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

  cancelNodeDrag(
    reason: Exclude<InteractionCompletionReason, "release">,
  ): void {
    this.#assertAlive();
    this.#drag.cancel(reason);
  }

  step(deltaMs: number): WorldViewRuntimeState {
    this.#assertAlive();

    this.#forceBackend.step?.(deltaMs);

    if (this.#layoutReadback && this.#sourceProjection) {
      const samples = this.#layoutReadback.read();
      this.#renderProjection = applyWorldForceLayout(this.#sourceProjection, samples);
      this.#surface.setProjection(this.#renderProjection);
    }

    const diagnostics = this.#forceBackend.getDiagnostics();

    if (diagnostics.settled) {
      this.#simulation.release("projection-update");
      this.#simulation.release("spatial-anchor-update");
      if (this.#drag.state().settling) this.#drag.commit();
    }

    return this.state();
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
