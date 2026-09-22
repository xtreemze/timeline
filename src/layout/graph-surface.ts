/**
 * Renderer-neutral graph surface contracts owned by Timeline.
 *
 * Canonical/application code speaks only in Timeline IDs and projections.
 * Renderer-specific objects and camera internals remain behind adapters.
 */
import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { GraphEdgeProjection, GraphProjection } from "../projection/graph-types.ts";
export type {
  GraphEdgeProjection,
  GraphNodeProjection,
  GraphProjection,
  GraphTemporalState,
  TemporalProjectionBounds,
} from "../projection/graph-types.ts";

export type GraphSelectionKind = "entity" | "relationship";

export interface CanonicalSelection {
  readonly kind: GraphSelectionKind;
  readonly id: EntityId | RelationshipId;
}

export interface GraphSimulationState {
  readonly running: boolean;
  readonly reason: string | null;
  readonly suspendedReasons: readonly string[];
  readonly pendingReasons: readonly string[];
}

export interface GraphSurface {
  setProjection(projection: GraphProjection): void;
  transitionProjection(projection: GraphProjection): void;
  updateTemporalEdges(edges: readonly GraphEdgeProjection[]): void;
  setSelection(selection: CanonicalSelection | null): void;
  recenter(): void;
  refreshLayout(): void;
  zoomIn(): void;
  zoomOut(): void;
  getMode(): string;
  getSimulationState(): GraphSimulationState;
  destroy(): void;
  selectForInteraction?(kind: GraphSelectionKind, id: EntityId | RelationshipId): void;
}

export type GraphSurfaceEvent =
  | { kind: "selection-changed"; selection: CanonicalSelection }
  | { kind: "interaction-start"; selection: CanonicalSelection; interaction: "long-press-drag" }
  | { kind: "simulation-state"; running: boolean; durationMs?: number; mode?: string };

export type GraphSurfaceEventListener = (event: GraphSurfaceEvent) => void;

export interface GraphSurfaceFactory {
  create(container: HTMLElement, eventListener: GraphSurfaceEventListener): GraphSurface;
}
