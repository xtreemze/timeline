import type { RelationshipId } from "../domain/ids.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import { SpatialAnchorIndex } from "./spatial-anchor-index.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  type ProjectedWorldEdge,
  type ProjectedWorldInstance,
  type WorldProjection,
  worldInstanceId,
} from "./world-projection.ts";

export interface WorldOccurrenceProjectionOptions {
  readonly temporalWeights?: ReadonlyMap<RelationshipId, number>;
  readonly visualWeights?: ReadonlyMap<RelationshipId, number>;
  readonly retainedOccurrenceIds?: ReadonlySet<RelationshipId>;
}

export function projectWorldOccurrences(
  relationships: readonly CanonicalRelationship[],
  activeOccurrenceIds: readonly RelationshipId[],
  spatialAnchors: SpatialAnchorIndex,
  options: WorldOccurrenceProjectionOptions = {},
): WorldProjection {
  const relationshipsById = new Map<RelationshipId, CanonicalRelationship>();

  for (const relationship of relationships) {
    if (relationshipsById.has(relationship.id)) {
      throw new Error(`Duplicate relationship ID: ${String(relationship.id)}`);
    }
    relationshipsById.set(relationship.id, relationship);
  }

  const instances: ProjectedWorldInstance[] = [];
  const edges: ProjectedWorldEdge[] = [];

  const activeIds = [...new Set(activeOccurrenceIds)].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );

  for (const occurrenceId of activeIds) {
    const relationship = relationshipsById.get(occurrenceId);
    if (!relationship) {
      throw new Error(`Active occurrence ${String(occurrenceId)} is not a canonical relationship.`);
    }

    const temporalWeight = options.temporalWeights?.get(occurrenceId) ?? 1;
    const visualWeight = options.visualWeights?.get(occurrenceId) ?? 1;
    const retained = options.retainedOccurrenceIds?.has(occurrenceId) ?? false;
    const anchor = spatialAnchors.anchorForOccurrence(occurrenceId);
    const geographicAnchors = anchor ? Object.freeze([anchor]) : Object.freeze([]);

    const subjectInstanceId = worldInstanceId(relationship.subjectId, occurrenceId);
    const objectInstanceId = worldInstanceId(relationship.objectId, occurrenceId);

    instances.push(
      createProjectedWorldInstance({
        id: subjectInstanceId,
        canonicalId: relationship.subjectId,
        occurrenceId,
        geographicAnchors,
        temporalWeight,
        visualWeight,
        retained,
      }),
      createProjectedWorldInstance({
        id: objectInstanceId,
        canonicalId: relationship.objectId,
        occurrenceId,
        geographicAnchors,
        temporalWeight,
        visualWeight,
        retained,
      }),
    );

    edges.push(
      createProjectedWorldEdge({
        id: relationship.id,
        sourceInstanceId: subjectInstanceId,
        targetInstanceId: objectInstanceId,
        temporalWeight,
        visible: true,
        retained,
      }),
    );
  }

  return createWorldProjection({ instances, edges });
}
