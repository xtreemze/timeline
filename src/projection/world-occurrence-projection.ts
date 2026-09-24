import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type { SpatialAnchorIndex } from "./spatial-anchor-index.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  type ProjectedWorldEdge,
  type ProjectedWorldInstance,
  type SpatialAnchor,
  type WorldInstanceId,
  type WorldProjection,
} from "./world-projection.ts";

export interface WorldEntityPresentation {
  readonly label?: string;
  readonly kind?: string;
  readonly style?: Readonly<Record<string, unknown>>;
}

export interface WorldOccurrenceProjectionOptions {
  readonly entityPresentation?: ReadonlyMap<EntityId, WorldEntityPresentation>;
  readonly temporalWeights?: ReadonlyMap<RelationshipId, number>;
  readonly visualWeights?: ReadonlyMap<RelationshipId, number>;
  readonly retainedOccurrenceIds?: ReadonlySet<RelationshipId>;
}

function relationshipStyle(
  relationship: CanonicalRelationship,
): Readonly<Record<string, unknown>> | undefined {
  const style = relationship.attributes?.["style"];
  return typeof style === "object" && style !== null && !Array.isArray(style)
    ? (style as Readonly<Record<string, unknown>>)
    : undefined;
}

/**
 * Render identity is canonical entity + spatial context, not canonical entity
 * + every occurrence. Repeated active facts at one place therefore reuse one
 * visible node, while genuinely different place contexts remain separate
 * world instances. Unplaced facts share one unplaced instance per entity.
 */
function worldSpatialInstanceId(
  canonicalId: EntityId,
  anchor: SpatialAnchor | undefined,
): WorldInstanceId {
  return JSON.stringify([
    String(canonicalId),
    anchor ? `place:${String(anchor.placeId)}` : "unplaced",
  ]) as WorldInstanceId;
}

interface WorldInstanceAccumulator {
  readonly id: WorldInstanceId;
  readonly canonicalId: EntityId;
  readonly presentation?: WorldEntityPresentation;
  readonly geographicAnchors: readonly SpatialAnchor[];
  readonly occurrenceIds: RelationshipId[];
  temporalWeight: number;
  visualWeight: number;
  retained: boolean;
}

function accumulateInstance(
  instances: Map<WorldInstanceId, WorldInstanceAccumulator>,
  canonicalId: EntityId,
  occurrenceId: RelationshipId,
  geographicAnchors: readonly SpatialAnchor[],
  temporalWeight: number,
  visualWeight: number,
  retained: boolean,
  presentation: WorldEntityPresentation | undefined,
): WorldInstanceId {
  const id = worldSpatialInstanceId(canonicalId, geographicAnchors[0]);
  const existing = instances.get(id);
  if (existing) {
    if (!existing.occurrenceIds.includes(occurrenceId)) existing.occurrenceIds.push(occurrenceId);
    existing.temporalWeight = Math.max(existing.temporalWeight, temporalWeight);
    existing.visualWeight = Math.max(existing.visualWeight, visualWeight);
    existing.retained ||= retained;
    return id;
  }

  instances.set(id, {
    id,
    canonicalId,
    ...(presentation ? { presentation } : {}),
    geographicAnchors,
    occurrenceIds: [occurrenceId],
    temporalWeight,
    visualWeight,
    retained,
  });
  return id;
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

  const instancesById = new Map<WorldInstanceId, WorldInstanceAccumulator>();
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
    const subjectPresentation = options.entityPresentation?.get(relationship.subjectId);
    const objectPresentation = options.entityPresentation?.get(relationship.objectId);

    const subjectInstanceId = accumulateInstance(
      instancesById,
      relationship.subjectId,
      occurrenceId,
      geographicAnchors,
      temporalWeight,
      visualWeight,
      retained,
      subjectPresentation,
    );
    const objectInstanceId = accumulateInstance(
      instancesById,
      relationship.objectId,
      occurrenceId,
      geographicAnchors,
      temporalWeight,
      visualWeight,
      retained,
      objectPresentation,
    );

    const style = relationshipStyle(relationship);
    edges.push(
      createProjectedWorldEdge({
        id: relationship.id,
        label: relationship.predicate,
        ...(style ? { style } : {}),
        sourceInstanceId: subjectInstanceId,
        targetInstanceId: objectInstanceId,
        temporalWeight,
        visible: true,
        retained,
      }),
    );
  }

  const instances: ProjectedWorldInstance[] = [...instancesById.values()].map((instance) => {
    const occurrenceIds = [...instance.occurrenceIds].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
    const presentation = instance.presentation;
    return createProjectedWorldInstance({
      id: instance.id,
      canonicalId: instance.canonicalId,
      ...(presentation?.label ? { label: presentation.label } : {}),
      ...(presentation?.kind ? { kind: presentation.kind } : {}),
      ...(presentation?.style ? { style: presentation.style } : {}),
      ...(occurrenceIds.length === 1 ? { occurrenceId: occurrenceIds[0] } : {}),
      occurrenceIds,
      geographicAnchors: instance.geographicAnchors,
      temporalWeight: instance.temporalWeight,
      visualWeight: instance.visualWeight,
      retained: instance.retained,
    });
  });

  return createWorldProjection({ instances, edges });
}
