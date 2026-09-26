import type {
  EntityId,
  OccurrenceId,
  PlaceId,
  RelationshipId,
} from "../domain/ids.ts";
import type { CanonicalOccurrence } from "../domain/occurrence.ts";
import { occurrenceParticipantEntityIds } from "../domain/occurrence.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import {
  relationshipOccurrenceExtent,
  type ProjectableOccurrence,
} from "./spatiotemporal-projection.ts";

export type CanonicalProjectedOccurrenceId = OccurrenceId | RelationshipId;

export interface CanonicalProjectedOccurrence
  extends ProjectableOccurrence<CanonicalProjectedOccurrenceId> {
  readonly kind: "standalone" | "relationship";
  readonly occurrenceType?: string;
  readonly placeId?: PlaceId;
  readonly entityIds: readonly EntityId[];
  readonly relationshipIds: readonly RelationshipId[];
}

function uniqueDefined<T>(values: readonly (T | undefined)[]): T | undefined {
  const defined = values.filter((value): value is T => value !== undefined);
  if (defined.length === 0) return undefined;
  const first = defined[0];
  return defined.every((value) => value === first) ? first : undefined;
}

function groupedExtent(
  occurrence: CanonicalOccurrence,
  relationshipsById: ReadonlyMap<string, CanonicalRelationship>,
  sortKey: (endpoint: unknown) => number,
): { readonly start: number; readonly end: number } | null {
  const direct = relationshipOccurrenceExtent(occurrence.time, sortKey);
  if (direct) return direct;

  const childExtents = occurrence.relationshipIds
    .map((id) => relationshipsById.get(String(id)))
    .filter((relationship): relationship is CanonicalRelationship => Boolean(relationship))
    .map((relationship) => relationshipOccurrenceExtent(relationship.time, sortKey))
    .filter(
      (extent): extent is { readonly start: number; readonly end: number } => extent !== null,
    );

  if (childExtents.length === 0) return null;
  const first = childExtents[0];
  if (!first) return null;
  return childExtents.every(
    (extent) => extent.start === first.start && extent.end === first.end,
  )
    ? first
    : null;
}

function groupedPlace(
  occurrence: CanonicalOccurrence,
  relationshipsById: ReadonlyMap<string, CanonicalRelationship>,
): PlaceId | undefined {
  if (occurrence.placeId) return occurrence.placeId;
  return uniqueDefined(
    occurrence.relationshipIds.map((id) => relationshipsById.get(String(id))?.placeId),
  );
}

function groupedType(
  occurrence: CanonicalOccurrence,
  relationshipsById: ReadonlyMap<string, CanonicalRelationship>,
): string | undefined {
  if (occurrence.occurrenceType) return occurrence.occurrenceType;
  return uniqueDefined(
    occurrence.relationshipIds.map(
      (id) => relationshipsById.get(String(id))?.occurrenceType,
    ),
  );
}

export function projectCanonicalOccurrences(
  project: CanonicalProject,
  sortKey: (endpoint: unknown) => number,
): readonly CanonicalProjectedOccurrence[] {
  const relationshipsById = new Map(
    project.relationships.map((relationship) => [String(relationship.id), relationship]),
  );
  const groupedRelationshipIds = new Set<string>();
  const projected: CanonicalProjectedOccurrence[] = [];

  for (const occurrence of project.occurrences ?? []) {
    const extent = groupedExtent(occurrence, relationshipsById, sortKey);
    if (!extent) continue;
    for (const relationshipId of occurrence.relationshipIds) {
      groupedRelationshipIds.add(String(relationshipId));
    }
    const placeId = groupedPlace(occurrence, relationshipsById);
    const occurrenceType = groupedType(occurrence, relationshipsById);
    projected.push(
      Object.freeze({
        id: occurrence.id,
        kind: "standalone" as const,
        ...(occurrenceType ? { occurrenceType } : {}),
        ...(placeId ? { placeId } : {}),
        entityIds: occurrenceParticipantEntityIds(occurrence, project.relationships),
        relationshipIds: Object.freeze([...occurrence.relationshipIds]),
        start: extent.start,
        end: extent.end,
      }),
    );
  }

  for (const relationship of project.relationships) {
    if (groupedRelationshipIds.has(String(relationship.id))) continue;
    const extent = relationshipOccurrenceExtent(relationship.time, sortKey);
    if (!extent) continue;
    projected.push(
      Object.freeze({
        id: relationship.id,
        kind: "relationship" as const,
        ...(relationship.occurrenceType
          ? { occurrenceType: relationship.occurrenceType }
          : {}),
        ...(relationship.placeId ? { placeId: relationship.placeId } : {}),
        entityIds: Object.freeze(
          [relationship.subjectId, relationship.objectId].sort((left, right) =>
            String(left).localeCompare(String(right)),
          ),
        ),
        relationshipIds: Object.freeze([relationship.id]),
        start: extent.start,
        end: extent.end,
      }),
    );
  }

  return Object.freeze(
    projected.sort(
      (left, right) =>
        left.start - right.start ||
        (left.end ?? left.start) - (right.end ?? right.start) ||
        String(left.id).localeCompare(String(right.id)),
    ),
  );
}
