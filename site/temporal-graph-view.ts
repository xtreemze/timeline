/**
 * Temporal graph visualization component
 * Manages graph view with focus/context viewport and interactive selection
 * Uses Timeline-owned GraphSurface contract, decoupled from renderer implementation.
 */

import type {
  CanonicalSelection,
  GraphEdgeProjection,
  GraphNodeProjection,
  GraphProjection,
  GraphSurface,
  GraphSurfaceEvent,
  GraphSurfaceEventListener,
  GraphSurfaceFactory,
} from "../src/layout/graph-surface.ts";
import { createOrbGraphSurfaceFactory } from "../src/layout/orb-graph-surface.ts";
import { entityId, relationshipId } from "../src/domain/ids.ts";
import type { EntityId, RelationshipId } from "../src/domain/ids.ts";

interface Viewport {
  start: number;
  end: number;
}

interface Node {
  id: string | number;
  properties?: Record<string, any>;
}

interface Edge {
  id: string | number;
  start: number;
  end: number;
  temporalState?: string;
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

interface Selection {
  kind: string;
  id: string;
}

function getGraph(): any {
  const graph = (globalThis as any).TimelineGraph;
  if (!graph) throw new Error("TimelineGraph must load before TemporalGraphView.");
  return graph;
}

function getOrbFactory(): any {
  const orbFactory = (globalThis as any).TimelineOrbGraph;
  if (!orbFactory) throw new Error("Build the bundled Orb graph before loading TemporalGraphView.");
  return orbFactory;
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

function topologySignature(data: GraphData): string {
  return JSON.stringify({
    nodes: data.nodes.map((node) => String(node.id)).sort(),
    edges: data.edges
      .map((edge) => [String(edge.id), String(edge.start), String(edge.end)])
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
  private currentData: GraphData;
  private hasRenderedData: boolean;
  private selection: Selection | null;
  private layoutFrame: number;
  private lastCanvasSize: string;
  private surface: GraphSurface;
  private resizeObserver: ResizeObserver | null;

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
    this.currentData = { nodes: [], edges: [] };
    this.hasRenderedData = false;
    this.selection = null;
    this.layoutFrame = 0;
    this.lastCanvasSize = "";

    if (!this.canvas) {
      throw new Error("Canvas element required for TemporalGraphViewController");
    }

    // Create GraphSurface via factory, using Timeline's event handler
    this.surface = surfaceFactory.create(this.canvas, (event) => {
      this.handleSurfaceEvent(event);
    });

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
      this.handleSelectionChanged(event.selection);
    } else if (event.kind === "simulation-state") {
      this.renderSimulationState(event);
    }
  }

  private handleSelectionChanged(selection: CanonicalSelection): void {
    this.selection = { kind: selection.kind, id: selection.id };
    const timelineType = selection.kind === "entity" ? "entity" : "relationship";
    this.root.dispatchEvent(
      new CustomEvent("graphselectionchange", {
        bubbles: true,
        detail: {
          kind: selection.kind,
          id: selection.id,
          timelineType,
        },
      }),
    );
  }

  private renderSimulationState(event: {
    kind: "simulation-state";
    running: boolean;
    durationMs?: number;
    mode?: string;
  }): void {
    if (!this.status) return;
    const suffix = event.running
      ? " · arranging"
      : event.durationMs
        ? ` · settled ${Math.round(event.durationMs)} ms`
        : "";
    this.status.dataset.simulationMode = event.mode || "worker-cpu";
    this.status.dataset.simulationRunning = String(Boolean(event.running));
    const countText = this.status.dataset.edgeCount || "0 / 0 edges active";
    this.status.textContent = `${countText} · ${event.mode || "worker-cpu"}${suffix}`;
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


  private render(): void {
    const graph = getGraph();
    const data = this.focusedId
      ? graph.neighborhoodGraph(this.model, this.focusedId, this.viewport, {
          depth: 1,
          limit: 36,
        })
      : graph.graphForWindow(this.model, this.viewport);
    this.currentData = data;
    if (this.selection) {
      const records = this.selection.kind === "node" ? data.nodes : data.edges;
      if (!records.some((record) => String(record.id) === this.selection.id)) {
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

    // Translate raw graph data to Timeline's canonical GraphProjection format
    const projection = this.translateDataToProjection(data);
    const nextSignature = topologySignature(data);
    if (nextSignature !== this.signature) {
      this.signature = nextSignature;
      if (this.hasRenderedData) {
        this.surface.transitionProjection(projection);
      } else {
        this.surface.setProjection(projection);
        this.hasRenderedData = true;
      }
      if (this.selection) {
        const selection: CanonicalSelection = {
          kind: this.selection.kind === "node" ? "entity" : "relationship",
          id: this.selection.id as EntityId | RelationshipId,
        };
        this.surface.setSelection(selection);
      }
    } else {
      // Update only temporal state without topology change
      this.surface.updateTemporalEdges(projection.edges);
    }
  }

  private translateDataToProjection(data: GraphData): GraphProjection {
    const nodes: GraphNodeProjection[] = data.nodes.map((node) => ({
      id: entityId(String(node.id)),
      label: node.properties?.label || String(node.id),
      group: node.properties?.group,
    }));

    const edges: GraphEdgeProjection[] = data.edges.map((edge) => ({
      id: relationshipId(String(edge.id)),
      // Graph topology uses edge.start/end as node IDs (not temporal values)
      sourceId: entityId(String(edge.start || "unknown")),
      targetId: entityId(String(edge.end || "unknown")),
      label: (edge as any).label || String(edge.id),
      temporalState: edge.temporalState as "timeless" | "temporal" | undefined,
      startTime: (edge as any).startTime,
      endTime: (edge as any).endTime,
    }));

    return {
      nodes,
      edges,
      temporal: this.viewport || undefined,
    };
  }
}

export function create(root: HTMLElement | null): TemporalGraphViewController | null {
  if (!root) return null;

  // Create a factory using the existing Orb renderer
  const orbFactory = getOrbFactory();
  const surfaceFactory = createOrbGraphSurfaceFactory(orbFactory);

  return new TemporalGraphViewController(root, surfaceFactory);
}

const TemporalGraphViewObj = { create } as const;

export const TemporalGraphView = Object.freeze(TemporalGraphViewObj);
