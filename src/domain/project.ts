import type { CanonicalEntity } from "./entity.ts";
import type { RelationshipId } from "./ids.ts";
import type { CanonicalRelationship } from "./relationship.ts";
import { relationshipFactKey, validateRelationship } from "./relationship.ts";
import type {
  ActorParticipationContext,
  ExternalSemanticMapping,
} from "./semantics.ts";

export interface CanonicalProject {
  readonly schemaVersion: number;
  readonly entities: readonly CanonicalEntity[];
  readonly relationships: readonly CanonicalRelationship[];
}

export type RecordRelationshipResult =
  | {
      readonly status: "created";
      readonly project: CanonicalProject;
      readonly relationship: CanonicalRelationship;
    }
  | {
      readonly status: "merged";
      readonly project: CanonicalProject;
      readonly relationship: CanonicalRelationship;
    };

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function uniqueJson<T>(values: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function mergeMappings(
  left: readonly ExternalSemanticMapping[] | undefined,
  right: readonly ExternalSemanticMapping[] | undefined,
): readonly ExternalSemanticMapping[] | undefined {
  if (!(left || right)) return undefined;
  return uniqueJson([...(left ?? []), ...(right ?? [])]);
}

function mergeParticipationContext(
  left: ActorParticipationContext | undefined,
  right: ActorParticipationContext | undefined,
): ActorParticipationContext | undefined {
  if (!left) return right;
  if (!right) return left;
  return {
    ...left,
    ...right,
    authoritySourceIds: unique([
      ...(left.authoritySourceIds ?? []),
      ...(right.authoritySourceIds ?? []),
    ]),
    externalMappings: mergeMappings(left.externalMappings, right.externalMappings),
  };
}

function mergedRelationship(
  existing: CanonicalRelationship,
  candidate: CanonicalRelationship,
): CanonicalRelationship {
  return {
    ...existing,
    occurrenceType: existing.occurrenceType ?? candidate.occurrenceType,
    subjectContext: mergeParticipationContext(existing.subjectContext, candidate.subjectContext),
    objectContext: mergeParticipationContext(existing.objectContext, candidate.objectContext),
    semanticMappings: mergeMappings(existing.semanticMappings, candidate.semanticMappings),
    itemIds: unique([...existing.itemIds, ...candidate.itemIds]),
    sourceIds: unique([...existing.sourceIds, ...candidate.sourceIds]),
    confidence:
      existing.confidence === null
        ? candidate.confidence
        : candidate.confidence === null
          ? existing.confidence
          : Math.max(existing.confidence, candidate.confidence),
    attributes: { ...existing.attributes, ...candidate.attributes },
  };
}

function sameFact(left: CanonicalRelationship, right: CanonicalRelationship): boolean {
  return relationshipFactKey(left) === relationshipFactKey(right);
}

function mirroredFact(left: CanonicalRelationship, right: CanonicalRelationship): boolean {
  return (
    relationshipFactKey(left) ===
    relationshipFactKey({
      ...right,
      subjectId: right.objectId,
      objectId: right.subjectId,
      subjectContext: right.objectContext,
      objectContext: right.subjectContext,
    })
  );
}

export function recordRelationship(
  project: CanonicalProject,
  candidate: CanonicalRelationship,
): RecordRelationshipResult {
  const validation = validateRelationship(candidate, project.entities);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const existing = project.relationships.find((relationship) => sameFact(relationship, candidate));
  if (existing) {
    const merged = mergedRelationship(existing, candidate);
    return {
      status: "merged",
      relationship: merged,
      project: {
        ...project,
        relationships: project.relationships.map((relationship) =>
          relationship.id === existing.id ? merged : relationship,
        ),
      },
    };
  }

  const mirrored = project.relationships.find((relationship) =>
    mirroredFact(relationship, candidate),
  );
  if (mirrored) {
    throw new Error(
      `Relationship ${String(candidate.id)} mirrors existing fact ${String(mirrored.id)}. Represent only the documented directed action.`,
    );
  }

  const duplicateId = project.relationships.find(
    (relationship) => relationship.id === candidate.id,
  );
  if (duplicateId) {
    throw new Error(`Relationship ID ${String(candidate.id)} already exists for another fact.`);
  }

  return {
    status: "created",
    relationship: candidate,
    project: {
      ...project,
      relationships: [...project.relationships, candidate],
    },
  };
}

export function findRelationship(
  project: CanonicalProject,
  id: RelationshipId,
): CanonicalRelationship | undefined {
  return project.relationships.find((relationship) => relationship.id === id);
}
