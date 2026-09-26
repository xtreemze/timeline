import { D3WorldForceSimulation } from "../../src/layout/d3-world-force-simulation.ts";
import type { WorldForceLayoutSample } from "../../src/layout/world-force-layout.ts";
import type { WorldForceSimulationBackend } from "../../src/layout/world-force-simulation.ts";
import { LuumWorldSurfaceElement } from "../components/world-surface-element.ts";
import { createIcon } from "../event-presentation.ts";
import { createDeckWorldRuntime, type DeckWorldBindings } from "./deck-world-runtime.ts";
import { DeckWorldSurface } from "./deck-world-surface.ts";
import { loadWorldBasemap } from "./world-basemap.ts";
import {
  WorldProjectionView,
  type WorldViewModel,
  type WorldViewViewport,
} from "./world-projection-view.ts";
import { WorldViewRuntimeController } from "./world-view-controller.ts";

export interface WorldFrameScheduler {
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

export interface WorldApplicationView {
  setModel(model: WorldViewModel): void;
  setWindow(viewport: WorldViewViewport | null): void;
  previewWindow(viewport: WorldViewViewport | null): void;
  setFocus(id: string | number | null): void;
  setPresentationMode(active: boolean): void;
  hasContext(): boolean;
  refreshLayout(): void;
  reorganizeDag(): boolean;
  relaxForce(): boolean;
  destroy(): void;
}

export interface WorldViewFactory {
  create(root: HTMLElement | null): WorldApplicationView | null;
}

export interface WorldViewFactoryForceBackend extends WorldForceSimulationBackend {
  getSnapshot?(): readonly WorldForceLayoutSample[];
  getChangedSnapshot?(): readonly WorldForceLayoutSample[];
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

function createWorldLayoutControls(
  doc: Document,
  actions: {
    readonly reorganizeDag: () => boolean;
    readonly relaxForce: () => boolean;
  },
): HTMLElement {
  const group = doc.createElement("div");
  group.className = "world-layout-controls";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Graph layout controls");

  const button = (
    label: string,
    title: string,
    icon: string,
    action: () => boolean,
  ): HTMLButtonElement => {
    const element = doc.createElement("button");
    element.type = "button";
    element.className = "toolbar-control world-layout-control";
    element.setAttribute("aria-label", label);
    element.title = title;
    element.append(createIcon(icon, { size: 20 }));
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      action();
    });
    return element;
  };

  group.append(
    button(
      "Reorganize relationship layout",
      "Reorganize relationship layout (D3 DAG)",
      "relation",
      actions.reorganizeDag,
    ),
    button(
      "Relax graph forces",
      "Relax graph forces (D3 force)",
      "magic",
      actions.relaxForce,
    ),
  );
  return group;
}

class ScheduledWorldProjectionView implements WorldApplicationView {
  readonly #view: WorldProjectionView;
  readonly #runtime: WorldViewRuntimeController;
  readonly #scheduler: WorldFrameScheduler;
  readonly #cleanup?: () => void;

  #frame = 0;
  #lastFrameAt = 0;
  #runStartedAt: number | null = null;
  #runTicks = 0;
  #wasDragging = false;
  #destroyed = false;

  constructor(
    view: WorldProjectionView,
    runtime: WorldViewRuntimeController,
    scheduler: WorldFrameScheduler,
    cleanup?: () => void,
  ) {
    this.#view = view;
    this.#runtime = runtime;
    this.#scheduler = scheduler;
    this.#cleanup = cleanup;
  }

  setModel(model: WorldViewModel): void {
    this.#assertAlive();
    this.#view.setModel(model);
    this.#restartBudget();
    this.#schedule();
  }

  setWindow(viewport: WorldViewViewport | null): void {
    this.#assertAlive();
    if (!this.#view.setWindow(viewport)) return;

    // High-frequency timeline motion comes through previewWindow and never
    // touches the force budget. A committed temporal projection is a new
    // bounded layout epoch and must not inherit an already-spent run.
    this.#restartBudget();
    this.#schedule();
  }

  previewWindow(viewport: WorldViewViewport | null): void {
    this.#assertAlive();
    this.#view.previewWindow(viewport);
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

  reorganizeDag(): boolean {
    this.#assertAlive();
    const changed = this.#runtime.reorganizeDag();
    if (changed) {
      this.#restartBudget();
      this.#schedule();
    }
    return changed;
  }

  relaxForce(): boolean {
    this.#assertAlive();
    const changed = this.#runtime.relaxForce();
    if (changed) {
      this.#restartBudget();
      this.#schedule();
    }
    return changed;
  }

  wake(): void {
    this.#assertAlive();
    this.#restartBudget();
    this.#schedule();
  }

  /** Schedule another frame without extending the current layout run. */
  pulse(): void {
    this.#assertAlive();
    this.#schedule();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    if (this.#frame) this.#scheduler.cancel(this.#frame);
    this.#frame = 0;
    this.#lastFrameAt = 0;
    this.#view.destroy();
    this.#cleanup?.();
  }

  /**
   * New data, committed temporal projections, and explicit wakes start a fresh
   * bounded layout budget. Transient timeline motion is routed through
   * previewWindow, so it cannot keep extending a force run.
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
    const deltaMs = Number.isFinite(elapsed) && elapsed > 0 ? Math.min(32, elapsed) : 1000 / 60;
    this.#lastFrameAt = timestamp;

    const state = this.#runtime.step(deltaMs);
    const wantsFrames =
      state.simulationRunning || !state.simulationSettled || state.dragging || state.settlingDrag;
    if (!wantsFrames) return;

    // Dropping a node starts a fresh run so its neighbours keep relaxing
    // around the new position, however long the drag itself took.
    if (this.#wasDragging && !state.dragging) this.#restartBudget();
    this.#wasDragging = state.dragging;
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
      const controls =
        typeof container.querySelector === "function"
          ? container.querySelector<HTMLElement>(".world-camera-controls")
          : null;
      const footerSlot =
        typeof root.ownerDocument?.querySelector === "function"
          ? root.ownerDocument.querySelector<HTMLElement>("[data-world-controls-slot]")
          : null;
      if (controls && footerSlot) {
        controls.classList.add("is-footer-control");
        footerSlot.appendChild(controls);
      }
      loadWorldBasemap()
        .then((basemap) => {
          try {
            surface.setBasemap(basemap);
          } catch {
            // Surface destroyed before the geography arrived.
          }
        })
        .catch(() => {});
      const forceBackend: WorldViewFactoryForceBackend =
        options.createForceBackend?.() ?? new D3WorldForceSimulation();
      const runtime = new WorldViewRuntimeController({
        surface,
        forceBackend,
        ...(typeof forceBackend.getChangedSnapshot === "function" ||
        typeof forceBackend.getSnapshot === "function"
          ? {
              layoutReadback: {
                read: () =>
                  forceBackend.getChangedSnapshot?.() ??
                  forceBackend.getSnapshot?.() ??
                  Object.freeze([]),
              },
            }
          : {}),
      });
      const view = new WorldProjectionView(runtime);
      let layoutControls: HTMLElement | null = null;
      const scheduledView = new ScheduledWorldProjectionView(view, runtime, scheduler, () => {
        layoutControls?.remove();
        layoutControls = null;
      });

      if (footerSlot && root.ownerDocument) {
        layoutControls = createWorldLayoutControls(root.ownerDocument, {
          reorganizeDag: () => scheduledView.reorganizeDag(),
          relaxForce: () => scheduledView.relaxForce(),
        });
        footerSlot.appendChild(layoutControls);
      }

      if (root instanceof LuumWorldSurfaceElement) {
        root.adoptView(scheduledView);
      }

      surface.setClusterForceSink({
        setClusteredPlaceIds(placeIds, detachedLinkPlaceIds) {
          runtime.setClusteredPlaceIds(placeIds, detachedLinkPlaceIds);
          scheduledView.wake();
        },
      });

      surface.setNodeDragSink({
        begin(pointerId, instanceId, position) {
          const claimed = runtime.beginNodeDrag(pointerId, instanceId, position);
          if (claimed) scheduledView.wake();
          return claimed;
        },
        update(pointerId, position) {
          const changed = runtime.updateNodeDrag(pointerId, position);
          // Pointer movement keeps RAF alive but must not restart the run
          // budget on every event; begin/drop are the layout epochs.
          if (changed) scheduledView.pulse();
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
