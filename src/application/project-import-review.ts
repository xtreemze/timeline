import {
  semanticIconReviewForEntities,
  type SemanticIconAuditEntity,
  type SemanticIconEntityReview,
} from "../presentation/semantic-icon-inference.ts";

export const STORY_PROPOSAL_SCHEMA_VERSION = "lum-story-proposal-v1" as const;
export const PROJECT_IMPORT_REVIEW_SCHEMA_VERSION = "lum-project-import-review-v1" as const;

type JsonRecord = Record<string, unknown>;

export interface ProjectImportValidation {
  readonly valid: boolean;
  readonly errors?: readonly string[];
  readonly warnings?: readonly string[];
}

export interface ProjectImportReviewDependencies<TProject> {
  normalize(project: unknown): TProject;
  validate?(project: TProject): ProjectImportValidation;
}

export interface StagedProjectImport<TProject> {
  readonly schemaVersion: typeof PROJECT_IMPORT_REVIEW_SCHEMA_VERSION;
  readonly sourceSchemaVersion: typeof STORY_PROPOSAL_SCHEMA_VERSION;
  readonly status: "ready-for-user-verification" | "needs-repair";
  readonly verificationRequired: true;
  readonly project: TProject;
  readonly fingerprint: string;
  readonly semanticIcons: readonly SemanticIconEntityReview[];
  readonly sources: readonly JsonRecord[];
  readonly unresolved: readonly string[];
  readonly generationNotes: string;
  readonly verificationInstructions: readonly string[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly summary: Readonly<{
    stories: number;
    items: number;
    entities: number;
    relationships: number;
    places: number;
    evidence: number;
    sources: number;
  }>;
}

interface StoryProposalEnvelope extends JsonRecord {
  readonly schemaVersion: typeof STORY_PROPOSAL_SCHEMA_VERSION;
  readonly verificationRequired: true;
  readonly project: JsonRecord;
  readonly status?: unknown;
  readonly sources?: unknown;
  readonly unresolved?: unknown;
  readonly generationNotes?: unknown;
  readonly preflight?: unknown;
  readonly verificationInstructions?: unknown;
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const candidate = record(entry);
        return candidate ? [cloneValue(candidate)] : [];
      })
    : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function collectionCount(project: unknown, key: string): number {
  const value = record(project)?.[key];
  return Array.isArray(value) ? value.length : 0;
}

function projectSemanticIconEntities(project: unknown): SemanticIconAuditEntity[] {
  const values = record(project)?.["entities"];
  if (!Array.isArray(values)) return [];
  return values.flatMap((entry) => {
    const entity = record(entry);
    const idValue = entity?.["id"];
    const id =
      typeof idValue === "string" || typeof idValue === "number" ? String(idValue).trim() : "";
    if (!entity || !id) return [];
    return [
      {
        id,
        name: entity["name"],
        type: entity["type"],
        attributes: entity["attributes"],
      },
    ];
  });
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return "null";
    const encoded = JSON.stringify(value);
    return encoded === undefined ? "null" : encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  const source = value as JsonRecord;
  return `{${Object.keys(source)
    .filter((key) => source[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(source[key])}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  const source = canonicalJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}:${source.length}`;
}

function envelopePreflight(value: StoryProposalEnvelope): JsonRecord {
  return record(value.preflight) ?? {};
}

export function isVerificationRequiredStoryProposal(
  value: unknown,
): value is StoryProposalEnvelope {
  const candidate = record(value);
  return Boolean(
    candidate &&
      candidate["schemaVersion"] === STORY_PROPOSAL_SCHEMA_VERSION &&
      candidate["verificationRequired"] === true &&
      record(candidate["project"]),
  );
}

export function stageProjectImportReview<TProject>(
  input: unknown,
  dependencies: ProjectImportReviewDependencies<TProject>,
): StagedProjectImport<TProject> | null {
  if (!isVerificationRequiredStoryProposal(input)) return null;

  const preflight = envelopePreflight(input);
  const errors = strings(preflight["errors"]);
  const warnings = strings(preflight["warnings"]);
  const rawProject = cloneValue(input.project) as unknown as TProject;
  let normalized = rawProject;
  let validation: ProjectImportValidation = { valid: true, errors: [], warnings: [] };

  try {
    normalized = dependencies.normalize(cloneValue(input.project));
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "The proposed project could not be normalized.",
    );
  }

  if (errors.length === 0 && dependencies.validate) {
    try {
      validation = dependencies.validate(cloneValue(normalized));
    } catch (error) {
      validation = {
        valid: false,
        errors: [
          error instanceof Error ? error.message : "The proposed project could not be validated.",
        ],
        warnings: [],
      };
    }
  }

  errors.push(...(validation.errors ?? []));
  warnings.push(...(validation.warnings ?? []));
  if (preflight["valid"] === false && errors.length === 0) {
    errors.push("Public proposal preflight reported that the project needs repair.");
  }
  if (input.status === "needs-repair" && errors.length === 0) {
    errors.push("The generated proposal is marked as needing repair.");
  }

  const uniqueErrors = unique(errors);
  const uniqueWarnings = unique(warnings);
  const sources = records(input.sources);
  const semanticIcons = semanticIconReviewForEntities(projectSemanticIconEntities(normalized));

  return {
    schemaVersion: PROJECT_IMPORT_REVIEW_SCHEMA_VERSION,
    sourceSchemaVersion: STORY_PROPOSAL_SCHEMA_VERSION,
    status:
      uniqueErrors.length === 0 && validation.valid
        ? "ready-for-user-verification"
        : "needs-repair",
    verificationRequired: true,
    project: cloneValue(normalized),
    fingerprint: fingerprint(normalized),
    semanticIcons,
    sources: Object.freeze(sources),
    unresolved: Object.freeze(strings(input.unresolved)),
    generationNotes:
      typeof input.generationNotes === "string" ? input.generationNotes.trim() : "",
    verificationInstructions: Object.freeze(strings(input.verificationInstructions)),
    errors: Object.freeze(uniqueErrors),
    warnings: Object.freeze(uniqueWarnings),
    summary: Object.freeze({
      stories: collectionCount(normalized, "stories"),
      items: collectionCount(normalized, "items"),
      entities: collectionCount(normalized, "entities"),
      relationships: collectionCount(normalized, "relationships"),
      places: collectionCount(normalized, "places"),
      evidence: collectionCount(normalized, "evidence"),
      sources: sources.length,
    }),
  };
}

export function verifyStagedProjectImport<TProject>(
  staged: StagedProjectImport<TProject>,
  dependencies: ProjectImportReviewDependencies<TProject>,
): TProject {
  if (staged.status !== "ready-for-user-verification" || staged.errors.length > 0) {
    throw new Error("The staged project still has verification errors and cannot be committed.");
  }

  const normalized = dependencies.normalize(cloneValue(staged.project));
  if (fingerprint(normalized) !== staged.fingerprint) {
    throw new Error("The staged project changed after it was staged; review it again before commit.");
  }

  const validation = dependencies.validate?.(cloneValue(normalized));
  if (validation && (!validation.valid || (validation.errors?.length ?? 0) > 0)) {
    const errors = validation.errors?.length
      ? validation.errors.join("\n- ")
      : "Local project validation failed.";
    throw new Error(`The staged project no longer passes validation:\n- ${errors}`);
  }

  return cloneValue(normalized);
}
