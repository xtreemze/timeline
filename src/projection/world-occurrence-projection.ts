import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type { SpatialAnchorIndex } from "./spatial-anchor-index.ts";
import {
  type WorldEntityVisualOverride,
  worldEntityVisualEncoding,
} from "./world-visual-encoding.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  type ProjectedWorldEdge,
  type ProjectedWorldInstance,
  type WorldProjection,
  worldInstanceId,
} from "./world-projection.ts";

export interface WorldEntityPresentation {
  readonly label?: string;
  readonly kind?: string;
  readonly visual?: WorldEntityVisualOverride;
}

export interface WorldOccurrenceProjectionOptions {
  readonly entityPresentation?: ReadonlyMap<EntityId, WorldEntityPresentation>;
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
    const subjectPresentation = options.entityPresentation?.get(relationship.subjectId);
    const objectPresentation = options.entityPresentation?.get(relationship.objectId);

    instances.push(
      createProjectedWorldInstance({
        id: subjectInstanceId,
        canonicalId: relationship.subjectId,
        ...(subjectPresentation?.label ? { label: subjectPresentation.label } : {}),
        ...(subjectPresentation?.kind ? { kind: subjectPresentation.kind } : {}),
        visual: worldEntityVisualEncoding(subjectPresentation?.kind, subjectPresentation?.visual),
        occurrenceId,
        geographicAnchors,
        temporalWeight,
        visualWeight,
        retained,
      }),
      createProjectedWorldInstance({
        id: objectInstanceId,
        canonicalId: relationship.objectId,
        ...(objectPresentation?.label ? { label: objectPresentation.label } : {}),
        ...(objectPresentation?.kind ? { kind: objectPresentation.kind } : {}),
        visual: worldEntityVisualEncoding(objectPresentation?.kind, objectPresentation?.visual),
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
        label: relationship.predicate,
        type: relationship.predicate,
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
