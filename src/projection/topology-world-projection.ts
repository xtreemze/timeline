import type { RelationshipId } from "../domain/ids.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type { SpatialAnchorIndex } from "./spatial-anchor-index.ts";
import type { TopologyProjection } from "./topology-types.ts";
import {
  projectWorldOccurrences,
  type WorldOccurrenceProjectionOptions,
} from "./world-occurrence-projection.ts";
import type { WorldProjection } from "./world-projection.ts";

export function projectTopologyWorld(
  relationships: readonly CanonicalRelationship[],
  topology: TopologyProjection,
  spatialAnchors: SpatialAnchorIndex,
  options: WorldOccurrenceProjectionOptions = {},
): WorldProjection {
  const relationshipIds = topology.edges
    .map((edge) => edge.id)
    .sort((left, right) => String(left).localeCompare(String(right)));

  const relationshipSet = new Set<RelationshipId>(
    relationships.map((relationship) => relationship.id),
  );

  for (const relationshipId of relationshipIds) {
    if (!relationshipSet.has(relationshipId)) {
      throw new Error(
        `Topology relationship ${String(relationshipId)} is not present in canonical relationships.`,
      );
    }
  }

  return projectWorldOccurrences(
    relationships,
    relationshipIds,
    spatialAnchors,
    options,
  );
}
