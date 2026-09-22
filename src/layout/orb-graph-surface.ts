/**
 * Orb adapter for Timeline's renderer-neutral GraphSurface contract.
 *
 * This adapter preserves existing Orb data/event semantics while keeping
 * renderer objects out of application and domain code.
 */
import type {
  CanonicalSelection,
  GraphEdgeProjection,
  GraphProjection,
  GraphSelectionKind,
  GraphSurface,
  GraphSimulationState,
  GraphSurfaceEventListener,
  GraphSurfaceFactory,
} from "./graph-surface.ts";
import type { EntityId, RelationshipId } from "../domain/ids.ts";

interface OrbNode {
  id: string | number;
  label?: string;
  properties?: Readonly<Record<string, unknown>>;
}

interface OrbEdge {
  id: string | number;
  start: string | number;
  end: string | number;
  label?: string;
  temporalState?: string;
}

interface OrbData {
  nodes: OrbNode[];
  edges: OrbEdge[];
}

interface OrbSimulationState {
  running?: boolean;
  durationMs?: number;
  mode?: string;
}

interface OrbFactoryOptions {
  onNodeClick?: (node: OrbNode) => void;
  onNodeLongPress?: (node: OrbNode) => void;
  onEdgeClick?: (edge: OrbEdge) => void;
  onSimulationState?: (state: OrbSimulationState) => void;
}

export interface OrbInstance {
  setData(data: OrbData): void;
  transitionData(data: OrbData): void;
  updateTemporalEdges(edges: OrbEdge[]): void;
  select?(kind: "node" | "edge", id: string | number): boolean;
  clearSelection?(): void;
  recenter(): void;
  refreshLayout?(): void;
  zoomIn(): void;
  zoomOut(): void;
  getMode(): string;
  getSimulationState?(): GraphSimulationState;
  destroy(): void;
}

export interface OrbFactory {
  create(container: HTMLElement, options: OrbFactoryOptions): OrbInstance;
}

function edgeToOrb(edge: GraphEdgeProjection): OrbEdge {
  return {
    id: edge.id,
    start: edge.sourceId,
    end: edge.targetId,
    label: edge.label,
    temporalState: edge.temporalState,
  };
}

function projectionToOrb(projection: GraphProjection): OrbData {
  return {
    nodes: projection.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      properties: {
        timelineType: node.kind ?? "entity",
      },
    })),
    edges: projection.edges.map(edgeToOrb),
  };
}

export class OrbGraphSurface implements GraphSurface {
  private readonly orb: OrbInstance;
  private readonly eventListener: GraphSurfaceEventListener;

  constructor(
    container: HTMLElement,
    orbFactory: OrbFactory,
    eventListener: GraphSurfaceEventListener,
  ) {
    this.eventListener = eventListener;
    this.orb = orbFactory.create(container, {
      onNodeClick: (node) => this.handleNodeClick(node),
      onNodeLongPress: (node) => this.handleNodeLongPress(node),
      onEdgeClick: (edge) => this.handleEdgeClick(edge),
      onSimulationState: (state) => this.handleSimulationState(state),
    });
  }

  private handleNodeClick(node: OrbNode): void {
    this.eventListener({
      kind: "selection-changed",
      selection: { kind: "entity", id: node.id as EntityId },
    });
  }

  private handleNodeLongPress(node: OrbNode): void {
    this.eventListener({
      kind: "interaction-start",
      selection: { kind: "entity", id: node.id as EntityId },
      interaction: "long-press-drag",
    });
  }

  private handleEdgeClick(edge: OrbEdge): void {
    this.eventListener({
      kind: "selection-changed",
      selection: { kind: "relationship", id: edge.id as RelationshipId },
    });
  }

  private handleSimulationState(state: OrbSimulationState): void {
    this.eventListener({
      kind: "simulation-state",
      running: Boolean(state.running),
      durationMs: state.durationMs,
      mode: state.mode,
    });
  }

  setProjection(projection: GraphProjection): void {
    this.orb.setData(projectionToOrb(projection));
  }

  transitionProjection(projection: GraphProjection): void {
    this.orb.transitionData(projectionToOrb(projection));
  }

  updateTemporalEdges(edges: readonly GraphEdgeProjection[]): void {
    this.orb.updateTemporalEdges(edges.map(edgeToOrb));
  }

  setSelection(selection: CanonicalSelection | null): void {
    if (!selection) {
      this.orb.clearSelection?.();
      return;
    }
    this.orb.select?.(selection.kind === "entity" ? "node" : "edge", selection.id);
  }

  recenter(): void {
    this.orb.recenter();
  }

  refreshLayout(): void {
    this.orb.refreshLayout?.();
  }

  zoomIn(): void {
    this.orb.zoomIn();
  }

  zoomOut(): void {
    this.orb.zoomOut();
  }

  getMode(): string {
    return this.orb.getMode();
  }

  getSimulationState(): GraphSimulationState {
    return (
      this.orb.getSimulationState?.() ?? {
        running: false,
        reason: null,
        suspendedReasons: [],
        pendingReasons: [],
      }
    );
  }

  selectForInteraction(kind: GraphSelectionKind, id: EntityId | RelationshipId): void {
    this.orb.select?.(kind === "entity" ? "node" : "edge", id);
  }

  destroy(): void {
    this.orb.destroy();
  }
}

export function createOrbGraphSurfaceFactory(orbFactory: OrbFactory): GraphSurfaceFactory {
  return {
    create(container, eventListener) {
      return new OrbGraphSurface(container, orbFactory, eventListener);
    },
  };
}
