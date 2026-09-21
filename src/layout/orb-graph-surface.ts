/**
 * OrbGraphSurface: Implements Timeline's GraphSurface contract using the existing Orb renderer.
 * This adapter wraps Orb and translates Timeline domain concepts to Orb's API.
 * No changes to Orb behavior; this is purely an adapter layer.
 */

import type {
  CanonicalSelection,
  CameraState,
  GraphEdgeProjection,
  GraphProjection,
  GraphSurface,
  GraphSurfaceEventListener,
} from "./graph-surface.ts";
import type { EntityId, RelationshipId } from "../domain/ids.ts";

/**
 * Represents what Orb expects internally.
 * We keep this separate from GraphProjection to translate between domains.
 */
interface OrbNode {
  id: string | number;
  properties?: Record<string, any>;
}

interface OrbEdge {
  id: string | number;
  start: number;
  end: number;
  temporalState?: string;
}

interface OrbData {
  nodes: OrbNode[];
  edges: OrbEdge[];
}

interface OrbInstance {
  setData(data: OrbData): void;
  transitionData(data: OrbData): void;
  updateTemporalEdges(edges: OrbEdge[]): void;
  select?(kind: string, id: string | number): void;
  recenter(): void;
  refreshLayout?(): void;
  getMode(): string;
}

interface OrbFactoryOptions {
  onNodeClick?: (node: OrbNode) => void;
  onNodeLongPress?: (node: OrbNode) => void;
  onEdgeClick?: (edge: OrbEdge) => void;
  onSimulationState?: (state: any) => void;
}

interface OrbFactory {
  create(container: HTMLElement, options: OrbFactoryOptions): OrbInstance;
}

export class OrbGraphSurface implements GraphSurface {
  private orb: OrbInstance;
  private eventListener: GraphSurfaceEventListener;
  private currentSelection: CanonicalSelection | null = null;
  private camera: CameraState = { x: 0, y: 0, z: 1 };

  constructor(
    container: HTMLElement,
    orbFactory: OrbFactory,
    eventListener: GraphSurfaceEventListener,
  ) {
    this.eventListener = eventListener;

    // Create Orb instance with Timeline's event handlers
    this.orb = orbFactory.create(container, {
      onNodeClick: (node: OrbNode) => this.handleNodeClick(node),
      onNodeLongPress: (node: OrbNode) => this.handleNodeLongPress(node),
      onEdgeClick: (edge: OrbEdge) => this.handleEdgeClick(edge),
      onSimulationState: (state: any) => this.handleSimulationState(state),
    });
  }

  private translateProjectionToOrb(projection: GraphProjection): OrbData {
    // Convert Timeline's canonical projection to Orb's internal format
    const nodes: OrbNode[] = projection.nodes.map((node) => ({
      id: node.id,
      properties: {
        label: node.label,
        group: node.group,
      },
    }));

    const edges: OrbEdge[] = projection.edges.map((edge) => ({
      id: edge.id,
      start: edge.startTime ?? 0,
      end: edge.endTime ?? 0,
      temporalState: edge.temporalState,
    }));

    return { nodes, edges };
  }

  private handleNodeClick(node: OrbNode): void {
    const id = node.id as EntityId;
    this.currentSelection = { kind: "entity", id };
    this.eventListener({
      kind: "selection-changed",
      selection: this.currentSelection,
    });
  }

  private handleNodeLongPress(node: OrbNode): void {
    const id = node.id as EntityId;
    this.currentSelection = { kind: "entity", id };
    this.eventListener({
      kind: "interaction-start",
      selection: this.currentSelection,
      interaction: "long-press-drag",
    });
  }

  private handleEdgeClick(edge: OrbEdge): void {
    const id = edge.id as RelationshipId;
    this.currentSelection = { kind: "relationship", id };
    this.eventListener({
      kind: "selection-changed",
      selection: this.currentSelection,
    });
  }

  private handleSimulationState(state: any): void {
    this.eventListener({
      kind: "simulation-state",
      running: state.running || false,
      durationMs: state.durationMs,
      mode: state.mode,
    });
  }

  setProjection(projection: GraphProjection): void {
    const orbData = this.translateProjectionToOrb(projection);
    this.orb.setData(orbData);
  }

  transitionProjection(projection: GraphProjection): void {
    const orbData = this.translateProjectionToOrb(projection);
    this.orb.transitionData(orbData);
  }

  updateTemporalEdges(edges: readonly GraphEdgeProjection[]): void {
    const orbEdges: OrbEdge[] = edges.map((edge) => ({
      id: edge.id,
      start: edge.startTime ?? 0,
      end: edge.endTime ?? 0,
      temporalState: edge.temporalState,
    }));
    this.orb.updateTemporalEdges(orbEdges);
  }

  setSelection(selection: CanonicalSelection | null): void {
    this.currentSelection = selection;
    if (selection && this.orb.select) {
      const kind = selection.kind === "entity" ? "node" : "edge";
      this.orb.select(kind, selection.id);
    }
  }

  getCamera(): CameraState {
    return { ...this.camera };
  }

  setCamera(camera: CameraState): void {
    this.camera = { ...camera };
    // TODO: Implement camera positioning in Orb when that capability is available
  }

  fit(): void {
    this.camera = { x: 0, y: 0, z: 1 };
    // TODO: Implement fit-to-bounds in Orb when available
  }

  recenter(): void {
    this.orb.recenter();
    this.camera = { x: 0, y: 0, z: this.camera.z };
  }

  refreshLayout(): void {
    if (this.orb.refreshLayout) {
      this.orb.refreshLayout();
    }
  }

  getMode(): string {
    return this.orb.getMode();
  }

  selectForInteraction(kind: "entity" | "relationship", id: EntityId | RelationshipId): void {
    if (this.orb.select) {
      const orbKind = kind === "entity" ? "node" : "edge";
      this.orb.select(orbKind, id);
    }
  }

  destroy(): void {
    // Clean up Orb resources if needed
  }
}

export function createOrbGraphSurfaceFactory(): {
  create: (
    container: HTMLElement,
    eventListener: GraphSurfaceEventListener,
  ) => GraphSurface;
} {
  // This factory will be wired in the application layer to get the actual Orb factory
  return {
    create: (container: HTMLElement, eventListener: GraphSurfaceEventListener) => {
      // Get the bundled Orb factory from global scope (loaded via <script>)
      const orbFactory = (globalThis as any).TimelineOrbGraph as OrbFactory;
      if (!orbFactory) {
        throw new Error("Orb factory must be loaded before creating OrbGraphSurface.");
      }
      return new OrbGraphSurface(container, orbFactory, eventListener);
    },
  };
}
