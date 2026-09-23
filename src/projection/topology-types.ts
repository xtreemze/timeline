import type { EntityId, RelationshipId } from "../domain/ids.ts";

export interface TopologyNodeProjection {
  readonly id: EntityId;
  readonly label: string;
  readonly kind?: string;
}

export interface TopologyEdgeProjection {
  readonly id: RelationshipId;
  readonly sourceId: EntityId;
  readonly targetId: EntityId;
  readonly label: string;
}

export interface TopologyProjection {
  readonly nodes: readonly TopologyNodeProjection[];
  readonly edges: readonly TopologyEdgeProjection[];
}
