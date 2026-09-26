import type { CanonicalEntity } from "./entity.ts";
import type {
  EntityId,
  OccurrenceId,
  PlaceId,
  RelationshipId,
  SourceId,
  TrajectoryId,
} from "./ids.ts";
import { validateOccurrenceTypeId } from "./occurrence-type.ts";
import type { CanonicalRelationship, CanonicalTemporalExtent } from "./relationship.ts";
import type {
  ActorParticipationContext,
  ExternalSemanticMapping,
} from "./semantics.ts";
import {
  participationFactIdentity,
  validateActorParticipationContext,
  validateExternalSemanticMappings,
} from "./semantics.ts";

export interface CanonicalOccurrenceParticipant extends ActorParticipationContext {
  readonly entityId: EntityId;
}

export interface CanonicalOccurrence {
  readonly id: OccurrenceId;
  readonly title?: string;
  readonly occurrenceType?: string;
  readonly time: CanonicalTemporalExtent | null;
  readonly placeId?: PlaceId;
  readonly participantContexts: readonly CanonicalOccurrenceParticipant[];
  readonly relationshipIds: readonly RelationshipId[];
  readonly trajectoryIds?: readonly TrajectoryId[];
  readonly sourceIds: readonly SourceId[];
  readonly confidence: number | null;
  readonly semanticMappings?: readonly ExternalSemanticMapping[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

function participantKey(participant: CanonicalOccurrenceParticipant): string {
  return JSON.stringify([participant.entityId, participationFactIdentity(participant)]);
}

export function validateOccurrence(
  occurrence: CanonicalOccurrence,
  entities: readonly CanonicalEntity[],
  relationships: readonly CanonicalRelationship[],
): string[] {
  const findings: string[] = [];
  const entityIds = new Set(entities.map((entity) => String(entity.id)));
  const relationshipsById = new Map(
    relationships.map((relationship) => [String(relationship.id), relationship]),
  );

  if (!String(occurrence.id).trim()) {
    findings.push("Occurrence ID must be a non-empty canonical identifier.");
  }
  if (relationships.some((relationship) => String(relationship.id) === String(occurrence.id))) {
    findings.push(`Occurrence ID "${String(occurrence.id)}" collides with a relationship ID.`);
  }
  if (occurrence.title !== undefined && !occurrence.title.trim()) {
    findings.push("Occurrence title must be a non-empty string when present.");
  }
  findings.push(...validateOccurrenceTypeId(occurrence.occurrenceType));
  findings.push(...validateExternalSemanticMappings(occurrence.semanticMappings));

  if (
    occurrence.confidence !== null &&
    (!Number.isFinite(occurrence.confidence) ||
      occurrence.confidence < 0 ||
      occurrence.confidence > 1)
  ) {
    findings.push("Occurrence confidence must be null or a number from 0 to 1.");
  }

  if (occurrence.time !== null) {
    if (occurrence.time.type !== "instant" && occurrence.time.type !== "interval") {
      findings.push("Occurrence time type must be instant or interval.");
    }
    if (
      occurrence.time.start !== null &&
      (typeof occurrence.time.start !== "object" || Array.isArray(occurrence.time.start))
    ) {
      findings.push("Occurrence time start must be null or an object.");
    }
    if (
      occurrence.time.end !== undefined &&
      occurrence.time.end !== null &&
      (typeof occurrence.time.end !== "object" || Array.isArray(occurrence.time.end))
    ) {
      findings.push("Occurrence time end must be null or an object when present.");
    }
  }

  if (
    occurrence.participantContexts.length === 0 &&
    occurrence.relationshipIds.length === 0
  ) {
    findings.push(
      "A standalone occurrence must have at least one participant or grouped relationship.",
    );
  }

  const participantKeys = new Set<string>();
  for (const participant of occurrence.participantContexts) {
    if (!entityIds.has(String(participant.entityId))) {
      findings.push(`Occurrence participant ${String(participant.entityId)} does not resolve.`);
    }
    findings.push(...validateActorParticipationContext(participant, entityIds));
    const key = participantKey(participant);
    if (participantKeys.has(key)) {
      findings.push(
        `Occurrence repeats participant ${String(participant.entityId)} in the same capacity.`,
      );
    }
    participantKeys.add(key);
  }

  const trajectoryIds = occurrence.trajectoryIds ?? [];
  if (new Set(trajectoryIds.map(String)).size !== trajectoryIds.length) {
    findings.push("Occurrence trajectoryIds must not contain duplicates.");
  }

  const seenRelationshipIds = new Set<string>();
  for (const relationshipId of occurrence.relationshipIds) {
    const id = String(relationshipId);
    if (seenRelationshipIds.has(id)) {
      findings.push(`Occurrence repeats relationship ${id}.`);
    }
    seenRelationshipIds.add(id);
    if (!relationshipsById.has(id)) {
      findings.push(`Occurrence relationship ${id} does not resolve.`);
    }
  }

  return findings;
}

export function occurrenceParticipantEntityIds(
  occurrence: CanonicalOccurrence,
  relationships: readonly CanonicalRelationship[],
): readonly EntityId[] {
  const relationshipById = new Map(
    relationships.map((relationship) => [String(relationship.id), relationship]),
  );
  const ids = new Map<string, EntityId>();

  for (const participant of occurrence.participantContexts) {
    ids.set(String(participant.entityId), participant.entityId);
    if (participant.representedEntityId) {
      ids.set(String(participant.representedEntityId), participant.representedEntityId);
    }
    if (participant.organizationId) {
      ids.set(String(participant.organizationId), participant.organizationId);
    }
  }

  for (const relationshipId of occurrence.relationshipIds) {
    const relationship = relationshipById.get(String(relationshipId));
    if (!relationship) continue;
    ids.set(String(relationship.subjectId), relationship.subjectId);
    ids.set(String(relationship.objectId), relationship.objectId);
  }

  return Object.freeze(
    [...ids.values()].sort((left, right) => String(left).localeCompare(String(right))),
  );
}
