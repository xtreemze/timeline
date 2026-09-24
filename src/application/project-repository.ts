import type { CanonicalEntity } from "../domain/entity.ts";
import { validateEntity } from "../domain/entity.ts";
import type { TimelineId } from "../domain/ids.ts";
import { entityId, placeId, relationshipId, sourceId } from "../domain/ids.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import { validateRelationship } from "../domain/relationship.ts";

export const CURRENT_PROJECT_SCHEMA_VERSION = 3;
export const PROJECT_ENVELOPE_FORMAT = "lum-project";

export interface ProjectSnapshot {
  readonly projectKey: string;
  readonly revision: number;
  readonly savedAt: string;
  readonly project: CanonicalProject;
}

export interface SaveProjectRequest {
  readonly projectKey: string;
  readonly expectedRevision: number;
  readonly savedAt: string;
  readonly project: CanonicalProject;
}

export interface ProjectRepository {
  load(projectKey: string): Promise<ProjectSnapshot | null>;
  save(request: SaveProjectRequest): Promise<ProjectSnapshot>;
  recover(projectKey: string): Promise<ProjectSnapshot | null>;
}

export interface ProjectMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(project: unknown): unknown;
}

interface PersistedProjectEnvelope {
  readonly format: typeof PROJECT_ENVELOPE_FORMAT;
  readonly schemaVersion: number;
  readonly projectKey: string;
  readonly revision: number;
  readonly savedAt: string;
  readonly project: CanonicalProject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function requireNonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

function requirePositiveInteger(value: unknown, label: string): number {
  const integer = requireNonNegativeInteger(value, label);
  if (integer === 0) throw new Error(`${label} must be greater than zero.`);
  return integer;
}

function assertEntityShape(value: unknown): CanonicalEntity {
  if (!isRecord(value)) throw new Error("Project entity must be an object.");
  requireNonEmptyString(value.id, "Entity ID");
  requireNonEmptyString(value.type, "Entity type");
  requireNonEmptyString(value.name, "Entity name");
  if (!isStringArray(value.alternateNames)) {
    throw new Error("Entity alternateNames must be a string array.");
  }
  if (!isStringArray(value.sourceIds)) {
    throw new Error("Entity sourceIds must be a string array.");
  }
  if (!isRecord(value.attributes)) {
    throw new Error("Entity attributes must be an object.");
  }

  const entity: CanonicalEntity = {
    id: entityId(requireNonEmptyString(value.id, "Entity ID")),
    type: requireNonEmptyString(value.type, "Entity type"),
    name: requireNonEmptyString(value.name, "Entity name"),
    alternateNames: [...value.alternateNames],
    sourceIds: value.sourceIds.map(sourceId),
    attributes: value.attributes,
  };
  const validation = validateEntity(entity);
  if (!validation.valid) throw new Error(validation.message);
  return entity;
}

function assertRelationshipShape(
  value: unknown,
  entities: readonly CanonicalEntity[],
): CanonicalRelationship {
  if (!isRecord(value)) throw new Error("Project relationship must be an object.");
  requireNonEmptyString(value.id, "Relationship ID");
  requireNonEmptyString(value.subjectId, "Relationship subject ID");
  requireNonEmptyString(value.objectId, "Relationship object ID");
  requireNonEmptyString(value.predicate, "Relationship predicate");

  if (value.role !== undefined && typeof value.role !== "string") {
    throw new Error("Relationship role must be a string when present.");
  }
  if (value.placeId !== undefined && typeof value.placeId !== "string") {
    throw new Error("Relationship placeId must be a string when present.");
  }
  if (!isStringArray(value.itemIds)) {
    throw new Error("Relationship itemIds must be a string array.");
  }
  if (!isStringArray(value.sourceIds)) {
    throw new Error("Relationship sourceIds must be a string array.");
  }
  if (
    value.confidence !== null &&
    (typeof value.confidence !== "number" ||
      !Number.isFinite(value.confidence) ||
      value.confidence < 0 ||
      value.confidence > 1)
  ) {
    throw new Error("Relationship confidence must be null or a number from 0 to 1.");
  }
  if (value.time !== null && !isRecord(value.time)) {
    throw new Error("Relationship time must be null or an object.");
  }
  if (!isRecord(value.attributes)) {
    throw new Error("Relationship attributes must be an object.");
  }

  const relationship: CanonicalRelationship = {
    id: relationshipId(requireNonEmptyString(value.id, "Relationship ID")),
    subjectId: entityId(requireNonEmptyString(value.subjectId, "Relationship subject ID")),
    objectId: entityId(requireNonEmptyString(value.objectId, "Relationship object ID")),
    predicate: requireNonEmptyString(value.predicate, "Relationship predicate"),
    role: typeof value.role === "string" ? value.role : undefined,
    placeId: typeof value.placeId === "string" ? placeId(value.placeId) : undefined,
    itemIds: value.itemIds as readonly TimelineId<"occurrence">[],
    sourceIds: value.sourceIds.map(sourceId),
    confidence: value.confidence as number | null,
    time: value.time as CanonicalRelationship["time"],
    attributes: value.attributes,
  };
  const validation = validateRelationship(relationship, entities);
  if (!validation.valid) throw new Error(validation.message);
  return relationship;
}

export function assertCanonicalProject(value: unknown): CanonicalProject {
  if (!isRecord(value)) throw new Error("Canonical project must be an object.");

  const schemaVersion = requirePositiveInteger(value.schemaVersion, "Project schemaVersion");
  if (!Array.isArray(value.entities)) {
    throw new Error("Canonical project entities must be an array.");
  }
  if (!Array.isArray(value.relationships)) {
    throw new Error("Canonical project relationships must be an array.");
  }

  const entities = value.entities.map(assertEntityShape);
  const entityIds = new Set<string>();
  for (const entity of entities) {
    const id = String(entity.id);
    if (entityIds.has(id)) throw new Error(`Duplicate entity ID "${id}".`);
    entityIds.add(id);
  }

  const relationships = value.relationships.map((relationship) =>
    assertRelationshipShape(relationship, entities),
  );
  const relationshipIds = new Set<string>();
  for (const relationship of relationships) {
    const id = String(relationship.id);
    if (relationshipIds.has(id)) {
      throw new Error(`Duplicate relationship ID "${id}".`);
    }
    relationshipIds.add(id);
  }

  return {
    schemaVersion,
    entities,
    relationships,
  };
}

function projectSchemaVersion(value: unknown): number {
  if (!isRecord(value)) throw new Error("Migrated project must be an object.");
  return requirePositiveInteger(value.schemaVersion, "Project schemaVersion");
}

export function migrateProject(
  project: unknown,
  migrations: readonly ProjectMigration[],
  targetVersion = CURRENT_PROJECT_SCHEMA_VERSION,
): CanonicalProject {
  const normalizedTarget = requirePositiveInteger(targetVersion, "Target schema version");
  let current: unknown = project;
  let version = projectSchemaVersion(current);

  if (version > normalizedTarget) {
    throw new Error(
      `Project schema version ${version} is newer than supported version ${normalizedTarget}.`,
    );
  }

  while (version < normalizedTarget) {
    const migration = migrations.find((candidate) => candidate.fromVersion === version);
    if (!migration) {
      throw new Error(`No migration registered from project schema version ${version}.`);
    }
    if (migration.toVersion <= migration.fromVersion) {
      throw new Error(
        `Migration ${migration.fromVersion} -> ${migration.toVersion} must advance the schema version.`,
      );
    }

    current = migration.migrate(current);
    const migratedVersion = projectSchemaVersion(current);
    if (migratedVersion !== migration.toVersion) {
      throw new Error(
        `Migration ${migration.fromVersion} -> ${migration.toVersion} produced schema version ${migratedVersion}.`,
      );
    }
    version = migratedVersion;
  }

  return assertCanonicalProject(current);
}

function normalizeProjectKey(value: string): string {
  return requireNonEmptyString(value, "Project key");
}

function cloneProject(project: CanonicalProject): CanonicalProject {
  return structuredClone(project);
}

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    ...snapshot,
    project: cloneProject(snapshot.project),
  };
}

export function serializeProjectSnapshot(snapshot: ProjectSnapshot): string {
  const projectKey = normalizeProjectKey(snapshot.projectKey);
  const revision = requirePositiveInteger(snapshot.revision, "Project revision");
  const savedAt = requireNonEmptyString(snapshot.savedAt, "Project savedAt");
  const project = assertCanonicalProject(snapshot.project);

  const envelope: PersistedProjectEnvelope = {
    format: PROJECT_ENVELOPE_FORMAT,
    schemaVersion: project.schemaVersion,
    projectKey,
    revision,
    savedAt,
    project,
  };

  return JSON.stringify(envelope);
}

export function deserializeProjectSnapshot(
  serialized: string,
  migrations: readonly ProjectMigration[] = [],
): ProjectSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error("Project snapshot is not valid JSON.", { cause: error });
  }

  if (!isRecord(value)) throw new Error("Project snapshot envelope must be an object.");
  if (value.format !== PROJECT_ENVELOPE_FORMAT) {
    throw new Error("Project snapshot format is not supported.");
  }

  const projectKey = requireNonEmptyString(value.projectKey, "Project key");
  const revision = requirePositiveInteger(value.revision, "Project revision");
  const savedAt = requireNonEmptyString(value.savedAt, "Project savedAt");
  const envelopeVersion = requirePositiveInteger(
    value.schemaVersion,
    "Project envelope schemaVersion",
  );
  const embeddedVersion = projectSchemaVersion(value.project);
  if (envelopeVersion !== embeddedVersion) {
    throw new Error(
      `Project envelope schema version ${envelopeVersion} does not match embedded project version ${embeddedVersion}.`,
    );
  }

  return {
    projectKey,
    revision,
    savedAt,
    project: migrateProject(value.project, migrations),
  };
}

export class ProjectRevisionConflictError extends Error {
  readonly projectKey: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(projectKey: string, expectedRevision: number, actualRevision: number) {
    super(
      `Project "${projectKey}" expected revision ${expectedRevision}, but current revision is ${actualRevision}.`,
    );
    this.name = "ProjectRevisionConflictError";
    this.projectKey = projectKey;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export function createInMemoryProjectRepository(): ProjectRepository {
  const latest = new Map<string, ProjectSnapshot>();
  const checkpoints = new Map<string, ProjectSnapshot>();

  return Object.freeze({
    async load(projectKey: string): Promise<ProjectSnapshot | null> {
      const snapshot = latest.get(normalizeProjectKey(projectKey));
      return snapshot ? cloneSnapshot(snapshot) : null;
    },

    async save(request: SaveProjectRequest): Promise<ProjectSnapshot> {
      const projectKey = normalizeProjectKey(request.projectKey);
      const expectedRevision = requireNonNegativeInteger(
        request.expectedRevision,
        "Expected project revision",
      );
      const savedAt = requireNonEmptyString(request.savedAt, "Project savedAt");
      const project = assertCanonicalProject(request.project);
      const current = latest.get(projectKey);
      const actualRevision = current?.revision ?? 0;

      if (expectedRevision !== actualRevision) {
        throw new ProjectRevisionConflictError(projectKey, expectedRevision, actualRevision);
      }

      if (current) checkpoints.set(projectKey, cloneSnapshot(current));

      const next: ProjectSnapshot = {
        projectKey,
        revision: actualRevision + 1,
        savedAt,
        project: cloneProject(project),
      };
      latest.set(projectKey, next);
      return cloneSnapshot(next);
    },

    async recover(projectKey: string): Promise<ProjectSnapshot | null> {
      const snapshot = checkpoints.get(normalizeProjectKey(projectKey));
      return snapshot ? cloneSnapshot(snapshot) : null;
    },
  });
}
