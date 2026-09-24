import { ReferenceWorldForceSimulation } from "../../src/layout/reference-world-force-simulation.ts";
import type { WorldForceLayoutSample } from "../../src/layout/world-force-layout.ts";
import type { WorldForceSimulationBackend } from "../../src/layout/world-force-simulation.ts";
import { createDeckWorldRuntime, type DeckWorldBindings } from "./deck-world-runtime.ts";
import { DeckWorldSurface } from "./deck-world-surface.ts";
import { loadWorldBasemap } from "./world-basemap.ts";
import {
  WorldProjectionView,
  type WorldViewModel,
  type WorldViewViewport,
} from "./world-projection-view.ts";
import { WorldViewRuntimeController } from "./world-view-controller.ts";
import { LuumWorldSurfaceElement } from "../components/world-surface-element.ts";

export interface WorldFrameScheduler {
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

export interface WorldApplicationView {
  setModel(model: WorldViewModel): void;
  setWindow(viewport: WorldViewViewport | null): void;
  setFocus(id: string | number | null): void;
  setPresentationMode(active: boolean): void;
  hasContext(): boolean;
  refreshLayout(): void;
  destroy(): void;
}

export interface WorldViewFactory {
  create(root: HTMLElement | null): WorldApplicationView | null;
}

export interface WorldViewFactoryForceBackend extends WorldForceSimulationBackend {
  getSnapshot?(): readonly WorldForceLayoutSample[];
}

export interface WorldViewFactoryOptions {
  readonly bindings: DeckWorldBindings;
  readonly scheduler?: WorldFrameScheduler;
  readonly createForceBackend?: () => WorldViewFactoryForceBackend;
}

/**
 * Wall-clock and tick budget for one layout run (after a model/window change,
 * wake or drop). An active drag is never cut short.
 */
export const WORLD_LAYOUT_RUN_BUDGET_MS = 4_000;
export const WORLD_LAYOUT_RUN_MAX_TICKS = 600;

function browserScheduler(): WorldFrameScheduler {
  return Object.freeze({
    request(callback) {
      return globalThis.requestAnimationFrame(callback);
    },
    cancel(handle) {
      globalThis.cancelAnimationFrame(handle);
    },
    now() {
      return globalThis.performance.now();
    },
  });
}

class ScheduledWorldProjectionView implements WorldApplicationView {
  readonly #view: WorldProjectionView;
  readonly #runtime: WorldViewRuntimeController;
  readonly #scheduler: WorldFrameScheduler;

  #frame = 0;
  #lastFrameAt = 0;
  #runStartedAt: number | null = null;
  #runTicks = 0;
  #destroyed = false;

  constructor(
    view: WorldProjectionView,
    runtime: WorldViewRuntimeController,
    scheduler: WorldFrameScheduler,
  ) {
    this.#view = view;
    this.#runtime = runtime;
    this.#scheduler = scheduler;
  }

  setModel(model: WorldViewModel): void {
    this.#assertAlive();
    this.#view.setModel(model);
    this.#restartBudget();
    this.#schedule();
  }

  setWindow(viewport: WorldViewViewport | null): void {
    this.#assertAlive();
    this.#view.setWindow(viewport);
    this.#schedule();
  }

  setFocus(id: string | number | null): void {
    this.#assertAlive();
    this.#view.setFocus(id);
  }

  setPresentationMode(active: boolean): void {
    this.#assertAlive();
    this.#view.setPresentationMode(active);
  }

  hasContext(): boolean {
    this.#assertAlive();
    return this.#view.hasContext();
  }

  refreshLayout(): void {
    this.#assertAlive();
    this.#view.refreshLayout();
  }

  wake(): void {
    this.#assertAlive();
    this.#restartBudget();
    this.#schedule();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (this.#frame) this.#scheduler.cancel(this.#frame);
    this.#frame = 0;
    this.#lastFrameAt = 0;
    this.#view.destroy();
  }

  /**
   * New data or an explicit wake (drag, drop) starts a fresh layout budget.
   * Window changes do not: the timeline updates its window continuously and
   * would otherwise keep the budget from ever running out.
   */
  #restartBudget(): void {
    this.#runStartedAt = null;
    this.#runTicks = 0;
  }

  #schedule(): void {
    if (this.#frame || this.#destroyed) return;
    this.#lastFrameAt = this.#scheduler.now();
    this.#frame = this.#scheduler.request((timestamp) => this.#tick(timestamp));
  }

  #tick(timestamp: number): void {
    this.#frame = 0;
    if (this.#destroyed) return;

    const elapsed = timestamp - this.#lastFrameAt;
    const deltaMs = Number.isFinite(elapsed) && elapsed > 0 ? Math.min(64, elapsed) : 1000 / 60;
    this.#lastFrameAt = timestamp;

    const state = this.#runtime.step(deltaMs);
    const wantsFrames =
      state.simulationRunning || !state.simulationSettled || state.dragging || state.settlingDrag;
    if (!wantsFrames) return;

    this.#runStartedAt ??= timestamp;
    this.#runTicks += 1;
    const budgetSpent =
      timestamp - this.#runStartedAt >= WORLD_LAYOUT_RUN_BUDGET_MS ||
      this.#runTicks >= WORLD_LAYOUT_RUN_MAX_TICKS;
    if (budgetSpent && !state.dragging) {
      // The energy criterion may never be met (anchor springs oscillate) and
      // on slow devices each frame is expensive, so an unbounded loop starves
      // the main thread. Freeze the layout where it is.
      this.#runtime.settle();
      return;
    }
    this.#frame = this.#scheduler.request((next) => this.#tick(next));
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("World application view has been destroyed.");
  }
}

export function createWorldViewFactory(options: WorldViewFactoryOptions): WorldViewFactory {
  const scheduler = options.scheduler ?? browserScheduler();
  const deckRuntime = createDeckWorldRuntime(options.bindings);

  return Object.freeze({
    create(root: HTMLElement | null): WorldApplicationView | null {
      if (!root) return null;

      const container = root.querySelector<HTMLElement>(".temporal-graph-canvas") ?? root;
      const surface = new DeckWorldSurface(container, deckRuntime);
      loadWorldBasemap()
        .then((basemap) => {
          try {
            surface.setBasemap(basemap);
          } catch {
            // Surface destroyed before the geography arrived.
          }
        })
        .catch(() => {});
      const forceBackend = options.createForceBackend?.() ?? new ReferenceWorldForceSimulation();
      const runtime = new WorldViewRuntimeController({
        surface,
        forceBackend,
        ...(typeof forceBackend.getSnapshot === "function"
          ? {
              layoutReadback: {
                read: () => forceBackend.getSnapshot?.() ?? Object.freeze([]),
              },
            }
          : {}),
      });
      const view = new WorldProjectionView(runtime);
      const scheduledView = new ScheduledWorldProjectionView(view, runtime, scheduler);

      if (root instanceof LuumWorldSurfaceElement) {
        root.adoptView(scheduledView);
      }

      surface.setNodeDragSink({
        begin(pointerId, instanceId, position) {
          const claimed = runtime.beginNodeDrag(pointerId, instanceId, position);
          if (claimed) scheduledView.wake();
          return claimed;
        },
        update(pointerId, position) {
          const changed = runtime.updateNodeDrag(pointerId, position);
          if (changed) scheduledView.wake();
          return changed;
        },
        release(pointerId) {
          const released = runtime.releaseNodeDrag(pointerId);
          if (released) scheduledView.wake();
          return released;
        },
        cancel(reason) {
          runtime.cancelNodeDrag(reason);
          scheduledView.wake();
        },
      });

      return scheduledView;
    },
  });
}
