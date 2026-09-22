/**
 * Temporal graph visualization component
 * Manages graph view with focus/context viewport and interactive selection
 */

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
  private selection: Selection | null;
  private layoutFrame: number;
  private lastCanvasSize: string;
  private orb: any;
  private resizeObserver: ResizeObserver | null;

  constructor(root: HTMLElement) {
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

    const orbFactory = getOrbFactory();
    this.orb = orbFactory.create(this.canvas, {
      onNodeClick: (node: Node) => this.activateNode(node),
      onNodeLongPress: (node: Node) => this.selectNodeForDrag(node),
      onEdgeClick: (edge: Edge) => this.activateEdge(edge),
      onSimulationState: (state: SimulationState) => this.renderSimulationState(state),
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
          this.orb.refreshLayout?.();
        });
      });
      this.resizeObserver.observe(this.canvas);
    } else {
      this.resizeObserver = null;
    }
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
    this.orb.recenter();
  }

  refreshLayout(): void {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      this.orb.refreshLayout?.();
    });
  }

  setPresentationMode(active: boolean): void {
    this.presentationMode = Boolean(active);
    this.root.dataset.presentationMode = String(this.presentationMode);
  }

  hasContext(): boolean {
    return this.hasFocusedContext;
  }

  private selectNodeForDrag(node: Node): void {
    this.selection = { kind: "node", id: String(node.id) };
    this.root.dispatchEvent(
      new CustomEvent("graphnodeselect", {
        bubbles: true,
        detail: { id: node.id, interaction: "long-press-drag" },
      }),
    );
  }

  private activateNode(node: Node): void {
    this.selection = { kind: "node", id: String(node.id) };
    this.root.dispatchEvent(
      new CustomEvent("graphselectionchange", {
        bubbles: true,
        detail: {
          kind: "node",
          id: node.id,
          timelineType: node.properties?.timelineType || "entity",
        },
      }),
    );
  }

  private activateEdge(edge: Edge): void {
    this.selection = { kind: "edge", id: String(edge.id) };
    this.root.dispatchEvent(
      new CustomEvent("graphselectionchange", {
        bubbles: true,
        detail: {
          kind: "edge",
          id: edge.id,
          start: edge.start,
          end: edge.end,
        },
      }),
    );
  }

  private render(): void {
    const graph = getGraph();
    const data = this.focusedId
      ? graph.neighborhoodGraph(this.model, this.focusedId, this.viewport, {
          depth: 1,
          limit: 36,
        })
      : graph.graphForWindow(this.model, this.viewport);
    const selection = this.selection;
    if (selection) {
      const records = selection.kind === "node" ? data.nodes : data.edges;
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
      this.status.textContent = `${countText} · ${this.orb.getMode()}`;
    }
    if (this.windowLabel) this.windowLabel.textContent = formatWindow(this.viewport);

    const graphIsEmpty = data.nodes.length === 0 && data.edges.length === 0;
    const nextSignature = topologySignature(data);
    if (nextSignature !== this.signature) {
      this.signature = nextSignature;
      if (this.hasRenderedData) {
        if (graphIsEmpty) this.orb.setData(data);
        else this.orb.transitionData(data);
      } else {
        this.orb.setData(data);
        this.hasRenderedData = true;
      }
      if (this.selection) this.orb.select?.(this.selection.kind, this.selection.id);
    } else {
      this.orb.updateTemporalEdges(data.edges);
    }
  }
}

export function create(root: HTMLElement | null): TemporalGraphViewController | null {
  if (!root) return null;
  return new TemporalGraphViewController(root);
}

const TemporalGraphViewObj = { create } as const;

export const TemporalGraphView = Object.freeze(TemporalGraphViewObj);
