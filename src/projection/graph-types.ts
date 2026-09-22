import type { EntityId, RelationshipId } from "../domain/ids.ts";

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
