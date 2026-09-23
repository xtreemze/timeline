export const PROJECT_ENVELOPE_FORMAT = "lum-project" as const;

export type ProjectEnvelopeFormat = typeof PROJECT_ENVELOPE_FORMAT;

export interface ProjectSnapshotEnvelope<TProject> {
  readonly format: ProjectEnvelopeFormat;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly savedAt: string;
  readonly project: TProject;
}

export type ProjectSaveReason =
  | "autosave"
  | "explicit"
  | "import"
  | "migration"
  | "recovery";

export interface CommitProjectOptions {
  readonly expectedRevision: number | null;
  readonly savedAt: string;
  readonly reason: ProjectSaveReason;
}

export interface ProjectRepository<TProject> {
  load(projectId: string): Promise<ProjectSnapshotEnvelope<TProject> | null>;
  commit(
    projectId: string,
    project: TProject,
    options: CommitProjectOptions,
  ): Promise<ProjectSnapshotEnvelope<TProject>>;
  checkpoint(
    projectId: string,
    reason: string,
  ): Promise<ProjectSnapshotEnvelope<TProject> | null>;
}

export interface ProjectMigration {
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  migrate(project: unknown): unknown;
}

export type ProjectValidator<TProject> = (candidate: unknown) => TProject;

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertInteger(value: unknown, label: string, minimum: number): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} must be an integer greater than or equal to ${minimum}.`);
  }
}

function assertSavedAt(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0 || !Number.isFinite(Date.parse(value))) {
    throw new Error("Project snapshot savedAt must be a valid date-time string.");
  }
}

export function createProjectEnvelope<TProject>(input: {
  readonly project: TProject;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly savedAt: string;
}): ProjectSnapshotEnvelope<TProject> {
  assertInteger(input.schemaVersion, "Project schemaVersion", 1);
  assertInteger(input.revision, "Project revision", 0);
  assertSavedAt(input.savedAt);

  return Object.freeze({
    format: PROJECT_ENVELOPE_FORMAT,
    schemaVersion: input.schemaVersion,
    revision: input.revision,
    savedAt: input.savedAt,
    project: input.project,
  });
}

export function parseProjectEnvelope<TProject>(
  candidate: unknown,
  validateProject: ProjectValidator<TProject>,
): ProjectSnapshotEnvelope<TProject> {
  assertRecord(candidate, "Project snapshot");

  if (candidate.format !== PROJECT_ENVELOPE_FORMAT) {
    throw new Error(`Unsupported project snapshot format: ${String(candidate.format)}.`);
  }

  assertInteger(candidate.schemaVersion, "Project schemaVersion", 1);
  assertInteger(candidate.revision, "Project revision", 0);
  assertSavedAt(candidate.savedAt);

  const project = validateProject(candidate.project);
  return createProjectEnvelope({
    project,
    schemaVersion: candidate.schemaVersion,
    revision: candidate.revision,
    savedAt: candidate.savedAt,
  });
}

export function migrateProjectEnvelope<TProject>(
  envelope: ProjectSnapshotEnvelope<unknown>,
  targetSchemaVersion: number,
  migrations: readonly ProjectMigration[],
  validateProject: ProjectValidator<TProject>,
): ProjectSnapshotEnvelope<TProject> {
  assertInteger(targetSchemaVersion, "Target project schemaVersion", 1);

  if (envelope.schemaVersion > targetSchemaVersion) {
    throw new Error(
      `Project schema ${envelope.schemaVersion} is newer than supported schema ${targetSchemaVersion}; downgrade is not allowed.`,
    );
  }

  const bySourceVersion = new Map<number, ProjectMigration>();
  for (const migration of migrations) {
    assertInteger(migration.fromSchemaVersion, "Migration fromSchemaVersion", 1);
    assertInteger(migration.toSchemaVersion, "Migration toSchemaVersion", 1);

    if (migration.toSchemaVersion !== migration.fromSchemaVersion + 1) {
      throw new Error(
        `Migration ${migration.fromSchemaVersion} -> ${migration.toSchemaVersion} must advance exactly one schema version.`,
      );
    }
    if (bySourceVersion.has(migration.fromSchemaVersion)) {
      throw new Error(
        `Duplicate migration from schema ${migration.fromSchemaVersion}.`,
      );
    }
    bySourceVersion.set(migration.fromSchemaVersion, migration);
  }

  let schemaVersion = envelope.schemaVersion;
  let project = envelope.project;

  while (schemaVersion < targetSchemaVersion) {
    const migration = bySourceVersion.get(schemaVersion);
    if (!migration) {
      throw new Error(
        `Missing migration from project schema ${schemaVersion} to ${schemaVersion + 1}.`,
      );
    }
    project = migration.migrate(project);
    schemaVersion = migration.toSchemaVersion;
  }

  return createProjectEnvelope({
    project: validateProject(project),
    schemaVersion,
    revision: envelope.revision,
    savedAt: envelope.savedAt,
  });
}
