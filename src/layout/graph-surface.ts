/**
 * Renderer-neutral graph surface contracts owned by Timeline.
 *
 * Canonical/application code speaks only in Timeline IDs and projections.
 * Renderer-specific objects and camera internals remain behind adapters.
 */
import type { EntityId, RelationshipId } from "../domain/ids.ts";

export type GraphSelectionKind = "entity" | "relationship";

export interface CanonicalSelection {
  readonly kind: GraphSelectionKind;
  readonly id: EntityId | RelationshipId;
}

export interface TemporalProjectionBounds {
  readonly start: number;
  readonly end: number;
}

export interface GraphNodeProjection {
  readonly id: EntityId;
  readonly label: string;
  readonly kind?: string;
}

export type GraphTemporalState =
  | "timeless"
  | "unknown"
  | "changed"
  | "active"
  | "inactive";

export interface GraphEdgeProjection {
  readonly id: RelationshipId;
  readonly sourceId: EntityId;
  readonly targetId: EntityId;
  readonly label: string;
  readonly temporalState?: GraphTemporalState;
}

export interface GraphProjection {
  readonly nodes: readonly GraphNodeProjection[];
  readonly edges: readonly GraphEdgeProjection[];
  readonly temporal?: TemporalProjectionBounds;
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
