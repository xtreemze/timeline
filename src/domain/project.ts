import type { CanonicalEntity } from "./entity.ts";
import type { OccurrenceId, RelationshipId, TrajectoryId } from "./ids.ts";
import type { CanonicalOccurrence } from "./occurrence.ts";
import type { TrajectoryArtifact } from "./trajectory.ts";
import { validateTrajectoryArtifact } from "./trajectory.ts";
import { validateOccurrence } from "./occurrence.ts";
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
  readonly occurrences?: readonly CanonicalOccurrence[];
  readonly trajectories?: readonly TrajectoryArtifact[];
}

export interface RecordTrajectoryResult {
  readonly status: "created";
  readonly project: CanonicalProject;
  readonly trajectory: TrajectoryArtifact;
}

export interface RecordOccurrenceResult {
  readonly status: "created";
  readonly project: CanonicalProject;
  readonly occurrence: CanonicalOccurrence;
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


export function recordOccurrence(
  project: CanonicalProject,
  candidate: CanonicalOccurrence,
): RecordOccurrenceResult {
  const findings = validateOccurrence(candidate, project.entities, project.relationships);
  if (findings.length > 0) {
    throw new Error(findings.join(" "));
  }
  if ((project.occurrences ?? []).some((occurrence) => occurrence.id === candidate.id)) {
    throw new Error(`Occurrence ID ${String(candidate.id)} already exists.`);
  }
  const trajectoryIds = new Set((project.trajectories ?? []).map((trajectory) => String(trajectory.id)));
  for (const id of candidate.trajectoryIds ?? []) {
    if (!trajectoryIds.has(String(id))) {
      throw new Error(`Occurrence trajectory ${String(id)} does not resolve.`);
    }
  }

  return {
    status: "created",
    occurrence: candidate,
    project: {
      ...project,
      occurrences: [...(project.occurrences ?? []), candidate],
    },
  };
}

export function findOccurrence(
  project: CanonicalProject,
  id: OccurrenceId,
): CanonicalOccurrence | undefined {
  return (project.occurrences ?? []).find((occurrence) => occurrence.id === id);
}


export function recordTrajectory(
  project: CanonicalProject,
  candidate: TrajectoryArtifact,
): RecordTrajectoryResult {
  const entityIds = new Set(project.entities.map((entity) => String(entity.id)));
  const findings = validateTrajectoryArtifact(candidate, entityIds);
  if (findings.length > 0) {
    throw new Error(findings.join(" "));
  }
  if ((project.trajectories ?? []).some((trajectory) => trajectory.id === candidate.id)) {
    throw new Error(`Trajectory ID ${String(candidate.id)} already exists.`);
  }

  return {
    status: "created",
    trajectory: candidate,
    project: {
      ...project,
      trajectories: [...(project.trajectories ?? []), candidate],
    },
  };
}

export function findTrajectory(
  project: CanonicalProject,
  id: TrajectoryId,
): TrajectoryArtifact | undefined {
  return (project.trajectories ?? []).find((trajectory) => trajectory.id === id);
}
