/**
 * Temporal graph visualization component.
 * Owns application-level graph projection/focus state while rendering through GraphSurface.
 */

import type {
  CanonicalSelection,
  GraphEdgeProjection,
  GraphProjection,
  GraphSurface,
  GraphSurfaceEvent,
  GraphSurfaceFactory,
  GraphTemporalState,
} from "../src/layout/graph-surface.ts";
import {
  createOrbGraphSurfaceFactory,
  type OrbFactory,
} from "../src/layout/orb-graph-surface.ts";
import { TimelineOrbGraph } from "../src/orb-graph-entry.js";
import { entityId, relationshipId } from "../src/domain/ids.ts";

interface Viewport {
  start: number;
  end: number;
}

interface Node {
  id: string | number;
  label?: string;
  properties?: Record<string, unknown>;
}

interface Edge {
  id: string | number;
  start: string | number;
  end: string | number;
  label?: string;
  temporalState?: GraphTemporalState;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface Model {
  entities: any[];
  relationships: any[];
  items: any[];
  stories: any[];
}

interface SimulationState {
  running: boolean;
  durationMs?: number;
  mode?: string;
}

interface TimelineGraphRuntime {
  neighborhoodGraph(
    model: Model,
    focusedId: string,
    viewport: Viewport | null,
    options: { depth: number; limit: number },
  ): GraphData;
  graphForWindow(model: Model, viewport: Viewport | null): GraphData;
}

function hasFunction(value: unknown, key: string): boolean {
  return typeof value === "object" && value !== null && typeof Reflect.get(value, key) === "function";
}

function getGraph(): TimelineGraphRuntime {
  const graph = Reflect.get(globalThis, "TimelineGraph");
  if (!hasFunction(graph, "neighborhoodGraph") || !hasFunction(graph, "graphForWindow")) {
    throw new Error("TimelineGraph must load before TemporalGraphView.");
  }
  return graph as TimelineGraphRuntime;
}

function getOrbFactory(): OrbFactory {
  return TimelineOrbGraph as OrbFactory;
}

function formatWindow(viewport: Viewport | null): string {
  if (!viewport) return "All time";
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(viewport.start))} – ${formatter.format(new Date(viewport.end))}`;
}

function graphProjection(data: GraphData): GraphProjection {
  return {
    nodes: data.nodes.map((node) => ({
      id: entityId(String(node.id)),
      label: node.label || String(node.id),
      kind:
        typeof node.properties?.timelineType === "string"
          ? node.properties.timelineType
          : "entity",
    })),
    edges: data.edges.map((edge) => ({
      id: relationshipId(String(edge.id)),
      sourceId: entityId(String(edge.start)),
      targetId: entityId(String(edge.end)),
      label: edge.label || String(edge.id),
      temporalState: edge.temporalState,
    })),
  };
}

function topologySignature(data: GraphData): string {
  return JSON.stringify({
    nodes: data.nodes.map((node) => String(node.id)).sort(),
    edges: data.edges
      .map(
        (edge): [string, string, string] => [
          String(edge.id),
          String(edge.start),
          String(edge.end),
        ],
      )
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
}

class TemporalGraphViewController {
  private root: HTMLElement;
  private canvas: HTMLElement | null;
  private status: HTMLElement | null;
  private windowLabel: HTMLElement | null;
  private model: Model;
  private viewport: Viewport | null;
  private focusedId: string | null;
  private signature: string;
  private presentationMode: boolean;
  private hasFocusedContext: boolean;
  private hasRenderedData: boolean;
  private selection: CanonicalSelection | null;
  private layoutFrame: number;
  private lastCanvasSize: string;
  private surface: GraphSurface;
  private resizeObserver: ResizeObserver | null;
  private pointerHeldUntil: number;
  private cachedEdgesWhileHeld: GraphEdgeProjection[] | null;
  private edgeUpdateDelayTimer: ReturnType<typeof globalThis.setTimeout> | 0;

  constructor(root: HTMLElement, surfaceFactory: GraphSurfaceFactory) {
    this.root = root;
    this.canvas = root.querySelector(".temporal-graph-canvas");
    this.status =
      root.querySelector("[data-graph-status]") ||
      root.closest(".graph-lens")?.querySelector("[data-graph-status]") ||
      null;
    this.windowLabel = root.querySelector("[data-graph-window]");
    this.model = { entities: [], relationships: [], items: [], stories: [] };
    this.viewport = null;
    this.focusedId = null;
    this.signature = "";
    this.presentationMode = false;
    this.hasFocusedContext = false;
    this.hasRenderedData = false;
    this.selection = null;
    this.layoutFrame = 0;
    this.lastCanvasSize = "";
    this.pointerHeldUntil = 0;
    this.cachedEdgesWhileHeld = null;
    this.edgeUpdateDelayTimer = 0;

    if (!this.canvas) throw new Error("Temporal graph canvas is required.");
    this.surface = surfaceFactory.create(this.canvas, (event) => this.handleSurfaceEvent(event));

    // Listen for pointer events on the timeline surface to coordinate edge connection delays
    this.setupPointerEventTracking();

    if ("ResizeObserver" in globalThis && this.canvas) {
      this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const entry = entries.find((candidate) => candidate.target === this.canvas);
        if (!entry) return;
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        if (width <= 0 || height <= 0) return;
        const size = `${width}x${height}`;
        if (size === this.lastCanvasSize) return;
        this.lastCanvasSize = size;
        cancelAnimationFrame(this.layoutFrame);
        this.layoutFrame = requestAnimationFrame(() => {
          this.layoutFrame = 0;
          this.surface.refreshLayout();
        });
      });
      this.resizeObserver.observe(this.canvas);
    } else {
      this.resizeObserver = null;
    }
  }

  private handleSurfaceEvent(event: GraphSurfaceEvent): void {
    if (event.kind === "selection-changed") {
      this.activateSelection(event.selection);
      return;
    }
    if (event.kind === "interaction-start") {
      this.selectForInteraction(event.selection, event.interaction);
      return;
    }
    this.renderSimulationState(event);
  }

  private renderSimulationState(state: SimulationState): void {
    if (!this.status) return;
    const suffix = state.running
      ? " · arranging"
      : state.durationMs
        ? ` · settled ${Math.round(state.durationMs)} ms`
        : "";
    this.status.dataset.simulationMode = state.mode || "worker-cpu";
    this.status.dataset.simulationRunning = String(Boolean(state.running));
    const countText = this.status.dataset.edgeCount || "0 / 0 edges active";
    this.status.textContent = `${countText} · ${state.mode || "worker-cpu"}${suffix}`;
  }

  private setupPointerEventTracking(): void {
    // Find the timeline surface and listen to pointer events
    const timelineSurface = this.root.closest("[data-view-name]")?.querySelector(".timeline-surface");
    if (!timelineSurface) return;

    const onPointerDown = () => {
      this.pointerHeldUntil = performance.now() + 2000; // Hold edge states for at least 2 seconds
      // Clear any pending edge update delay
      if (this.edgeUpdateDelayTimer) globalThis.clearTimeout(this.edgeUpdateDelayTimer);
      this.edgeUpdateDelayTimer = 0;
    };

    const onPointerUp = () => {
      const now = performance.now();
      const heldDuration = Math.max(0, this.pointerHeldUntil - now);
      if (heldDuration > 0) {
        // Wait for the remaining hold duration before allowing edge updates
        if (this.edgeUpdateDelayTimer) globalThis.clearTimeout(this.edgeUpdateDelayTimer);
        this.edgeUpdateDelayTimer = globalThis.setTimeout(() => {
          this.edgeUpdateDelayTimer = 0;
          this.pointerHeldUntil = 0;
          this.cachedEdgesWhileHeld = null;
          // Re-render with latest edge states
          this.render();
        }, heldDuration);
      } else {
        this.pointerHeldUntil = 0;
        this.cachedEdgesWhileHeld = null;
      }
    };

    timelineSurface.addEventListener("pointerdown", onPointerDown, { capture: true });
    timelineSurface.addEventListener("pointerup", onPointerUp, { capture: true });
    timelineSurface.addEventListener("pointercancel", onPointerUp, { capture: true });
  }

  private isPointerHeld(): boolean {
    return performance.now() < this.pointerHeldUntil;
  }

  setModel(model: any): void {
    this.model = {
      entities: Array.isArray(model?.entities) ? model.entities : [],
      relationships: Array.isArray(model?.relationships) ? model.relationships : [],
      items: Array.isArray(model?.items) ? model.items : [],
      stories: Array.isArray(model?.stories) ? model.stories : [],
    };
    this.render();
  }

  setWindow(viewport: Viewport | null): void {
    this.viewport =
      viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? { start: viewport.start, end: viewport.end }
        : null;
    this.render();
  }

  setFocus(id: string | number | null): void {
    const next = id ? String(id) : null;
    if (next === this.focusedId) return;
    this.focusedId = next;
    this.signature = "";
    this.selection = null;
    this.surface.setSelection(null);
    this.render();
  }

  resetView(): void {
    this.surface.recenter();
  }

  refreshLayout(): void {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      this.surface.refreshLayout();
    });
  }

  setPresentationMode(active: boolean): void {
    this.presentationMode = Boolean(active);
    this.root.dataset.presentationMode = String(this.presentationMode);
  }

  hasContext(): boolean {
    return this.hasFocusedContext;
  }

  private selectForInteraction(
    selection: CanonicalSelection,
    interaction: "long-press-drag",
  ): void {
    if (selection.kind !== "entity") return;
    this.selection = selection;
    this.root.dispatchEvent(
      new CustomEvent("graphnodeselect", {
        bubbles: true,
        detail: { id: selection.id, interaction },
      }),
    );
  }

  private activateSelection(selection: CanonicalSelection): void {
    this.selection = selection;
    const data = this.currentGraphData();

    if (selection.kind === "entity") {
      const node = data.nodes.find((candidate) => String(candidate.id) === String(selection.id));
      this.root.dispatchEvent(
        new CustomEvent("graphselectionchange", {
          bubbles: true,
          detail: {
            kind: "node",
            id: selection.id,
            timelineType:
              typeof node?.properties?.timelineType === "string"
                ? node.properties.timelineType
                : "entity",
          },
        }),
      );
      return;
    }

    const edge = data.edges.find((candidate) => String(candidate.id) === String(selection.id));
    this.root.dispatchEvent(
      new CustomEvent("graphselectionchange", {
        bubbles: true,
        detail: {
          kind: "edge",
          id: selection.id,
          start: edge?.start,
          end: edge?.end,
        },
      }),
    );
  }

  private currentGraphData(): GraphData {
    const graph = getGraph();
    return this.focusedId
      ? graph.neighborhoodGraph(this.model, this.focusedId, this.viewport, {
          depth: 1,
          limit: 36,
        })
      : graph.graphForWindow(this.model, this.viewport);
  }

  private render(): void {
    const data = this.currentGraphData();
    const projection = graphProjection(data);
    const selection = this.selection;
    if (selection) {
      const records = selection.kind === "entity" ? data.nodes : data.edges;
      if (!records.some((record) => String(record.id) === selection.id)) {
        this.selection = null;
      }
    }
    const nextHasFocusedContext = Boolean(
      this.focusedId && data.nodes.length > 1 && data.edges.length > 0,
    );
    if (nextHasFocusedContext !== this.hasFocusedContext) {
      this.hasFocusedContext = nextHasFocusedContext;
      this.root.dispatchEvent(
        new CustomEvent("graphcontextchange", {
          bubbles: true,
          detail: {
            focusedId: this.focusedId,
            hasContext: this.hasFocusedContext,
            nodeCount: data.nodes.length,
            edgeCount: data.edges.length,
          },
        }),
      );
    }
    const scopeText = this.focusedId ? `${data.nodes.length} relevant nodes · ` : "";
    const timelessCount = data.edges.filter((edge) => edge.temporalState === "timeless").length;
    const persistentText = timelessCount ? ` · ${timelessCount} persistent` : "";
    const countText = `${scopeText}${data.edges.length} relations in window${persistentText}`;
    if (this.status) {
      this.status.dataset.edgeCount = countText;
      this.status.textContent = `${countText} · ${this.surface.getMode()}`;
    }
    if (this.windowLabel) this.windowLabel.textContent = formatWindow(this.viewport);

    const graphIsEmpty = data.nodes.length === 0 && data.edges.length === 0;
    const nextSignature = topologySignature(data);
    if (nextSignature !== this.signature) {
      this.signature = nextSignature;
      if (this.hasRenderedData) {
        if (graphIsEmpty) this.surface.setProjection(projection);
        else this.surface.transitionProjection(projection);
      } else {
        this.surface.setProjection(projection);
        this.hasRenderedData = true;
      }
      if (this.selection) this.surface.setSelection(this.selection);
    } else {
      // When pointer is held, cache the current edge states and don't update them
      if (this.isPointerHeld()) {
        if (!this.cachedEdgesWhileHeld) {
          this.cachedEdgesWhileHeld = projection.edges.slice();
        }
        this.surface.updateTemporalEdges(this.cachedEdgesWhileHeld);
      } else {
        this.cachedEdgesWhileHeld = null;
        this.surface.updateTemporalEdges(projection.edges);
      }
    }
  }
}

export function create(root: HTMLElement | null): TemporalGraphViewController | null {
  if (!root) return null;
  return new TemporalGraphViewController(root, createOrbGraphSurfaceFactory(getOrbFactory()));
}

const TemporalGraphViewObj = { create } as const;

export const TemporalGraphView = Object.freeze(TemporalGraphViewObj);
