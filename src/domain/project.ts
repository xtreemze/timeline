import type { CanonicalEntity } from "./entity.ts";
import type { RelationshipId } from "./ids.ts";
import type { CanonicalRelationship } from "./relationship.ts";
import {
  relationshipFactKey,
  validateRelationship,
} from "./relationship.ts";

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

function mergedRelationship(
  existing: CanonicalRelationship,
  candidate: CanonicalRelationship,
): CanonicalRelationship {
  return {
    ...existing,
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

function sameFact(
  left: CanonicalRelationship,
  right: CanonicalRelationship,
): boolean {
  return relationshipFactKey(left) === relationshipFactKey(right);
}

function mirroredFact(
  left: CanonicalRelationship,
  right: CanonicalRelationship,
): boolean {
  return (
    left.subjectId === right.objectId &&
    left.objectId === right.subjectId &&
    left.predicate.trim().toLocaleLowerCase() === right.predicate.trim().toLocaleLowerCase() &&
    JSON.stringify(left.time) === JSON.stringify(right.time)
  );
}

export function recordRelationship(
  project: CanonicalProject,
  candidate: CanonicalRelationship,
): RecordRelationshipResult {
  const validation = validateRelationship(candidate, project.entities);
  if (!validation.valid) throw new Error(validation.message);

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
