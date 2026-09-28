import type { ProjectMigration, ProjectSnapshot } from "./project-repository.ts";
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  deserializeProjectSnapshot,
  PROJECT_ENVELOPE_FORMAT,
  serializeProjectSnapshot,
} from "./project-repository.ts";

export const LUM_PROJECT_INTERCHANGE_FORMAT = PROJECT_ENVELOPE_FORMAT;
export const LUM_PROJECT_INTERCHANGE_VERSION = 1;
export const LUM_PROJECT_FILE_EXTENSION = ".lum.json";
export const LUM_PROJECT_MEDIA_TYPE = "application/vnd.lum.project+json";
export const LUM_PROJECT_SCHEMA_ID =
  "https://xtreemze.github.io/timeline/schemas/lum-project-v1.schema.json";

export type ProjectInterchangeDiagnosticCode =
  | "invalid-json"
  | "invalid-envelope"
  | "unsupported-format"
  | "unsupported-interchange-version"
  | "unsupported-schema-id"
  | "unknown-field"
  | "invalid-project"
  | "non-canonical-extension"
  | "non-canonical-format";

export interface ProjectInterchangeDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: ProjectInterchangeDiagnosticCode | string;
  readonly path: string;
  readonly recordId?: string;
  readonly message: string;
  readonly remediation?: string;
}

export type ProjectInterchangeValidation =
  | {
      readonly valid: true;
      readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
      readonly snapshot: ProjectSnapshot;
    }
  | {
      readonly valid: false;
      readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
    };

type JsonRecord = Record<string, unknown>;

const ENVELOPE_FIELDS = new Set([
  "$schema",
  "format",
  "interchangeVersion",
  "schemaVersion",
  "projectKey",
  "revision",
  "savedAt",
  "project",
]);

const PROJECT_FIELDS = new Set([
  "schemaVersion",
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
]);

const ENTITY_FIELDS = new Set([
  "id",
  "type",
  "name",
  "alternateNames",
  "identityResolution",
  "identifiers",
  "appellations",
  "semanticMappings",
  "sourceIds",
  "attributes",
]);

const RELATIONSHIP_FIELDS = new Set([
  "id",
  "subjectId",
  "objectId",
  "predicate",
  "role",
  "occurrenceType",
  "subjectContext",
  "objectContext",
  "semanticMappings",
  "placeId",
  "itemIds",
  "sourceIds",
  "confidence",
  "time",
  "attributes",
]);

const OCCURRENCE_FIELDS = new Set([
  "id",
  "title",
  "occurrenceType",
  "time",
  "placeId",
  "participantContexts",
  "relationshipIds",
  "trajectoryIds",
  "sourceIds",
  "confidence",
  "semanticMappings",
  "attributes",
]);

const ACTOR_CONTEXT_FIELDS = new Set([
  "roleType",
  "representedEntityId",
  "organizationId",
  "authoritySourceIds",
  "externalMappings",
]);

const OCCURRENCE_PARTICIPANT_FIELDS = new Set(["entityId", ...ACTOR_CONTEXT_FIELDS]);

const PLACE_FIELDS = new Set([
  "id",
  "name",
  "geometry",
  "geographicIdentifier",
  "address",
  "sourceIds",
  "attributes",
]);
const SOURCE_FIELDS = new Set([
  "id",
  "kind",
  "title",
  "sourceName",
  "note",
  "publishedAt",
  "url",
  "attributes",
]);
const CATEGORY_FIELDS = new Set(["id", "name", "color", "attributes"]);
const STORY_FIELDS = new Set([
  "id",
  "title",
  "description",
  "occurrenceIds",
  "placeIds",
  "attributes",
]);
const GEOMETRY_FIELDS = new Set(["type", "coordinates"]);

const TRAJECTORY_FIELDS = new Set([
  "id",
  "sourceIds",
  "sourceArtifactIds",
  "observedEntityIds",
  "sampleCount",
  "time",
  "bounds",
  "channels",
  "levels",
  "storage",
  "externalMappings",
  "attributes",
]);

const TEMPORAL_FIELDS = new Set(["type", "start", "end", "openStart", "openEnd"]);
const MAPPING_FIELDS = new Set(["scheme", "version", "identifier", "relation"]);
const IDENTIFIER_FIELDS = new Set(["scheme", "value", "issuer", "sourceIds"]);
const APPELLATION_FIELDS = new Set(["value", "kind", "languageTag", "sourceIds"]);
const TRAJECTORY_BOUNDS_FIELDS = new Set([
  "minLongitude",
  "minLatitude",
  "maxLongitude",
  "maxLatitude",
  "minElevationMeters",
  "maxElevationMeters",
]);
const TRAJECTORY_CHANNEL_FIELDS = new Set(["id", "unit", "semantic"]);
const TRAJECTORY_LEVEL_FIELDS = new Set(["id", "pointCount", "toleranceMeters", "storageRef"]);
const TRAJECTORY_STORAGE_FIELDS = new Set(["kind", "ref", "mediaType", "encoding"]);

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function unknownFieldDiagnostics(
  value: JsonRecord,
  allowed: ReadonlySet<string>,
  basePath = "",
): ProjectInterchangeDiagnostic[] {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()
    .map((key) => ({
      severity: "error" as const,
      code: "unknown-field" as const,
      path: `${basePath}/${pointerSegment(key)}`,
      message: `Unknown field "${key}" is not part of the strict Lūm interchange contract.`,
      remediation:
        "Remove the field or place intentionally extensible metadata inside an attributes/extension field defined by the schema.",
    }));
}

function inspectRecordArray(
  value: unknown,
  path: string,
  allowed: ReadonlySet<string>,
  inspect?: (value: JsonRecord, path: string) => ProjectInterchangeDiagnostic[],
): ProjectInterchangeDiagnostic[] {
  if (!Array.isArray(value)) return [];
  const diagnostics: ProjectInterchangeDiagnostic[] = [];
  value.forEach((entry, index) => {
    const object = record(entry);
    if (!object) return;
    const entryPath = `${path}/${index}`;
    diagnostics.push(...unknownFieldDiagnostics(object, allowed, entryPath));
    if (inspect) diagnostics.push(...inspect(object, entryPath));
  });
  return diagnostics;
}

function inspectMappings(value: unknown, path: string): ProjectInterchangeDiagnostic[] {
  return inspectRecordArray(value, path, MAPPING_FIELDS);
}

function inspectTemporal(value: unknown, path: string): ProjectInterchangeDiagnostic[] {
  const object = record(value);
  return object ? unknownFieldDiagnostics(object, TEMPORAL_FIELDS, path) : [];
}

function inspectParticipant(participant: JsonRecord, path: string): ProjectInterchangeDiagnostic[] {
  return inspectMappings(participant["externalMappings"], `${path}/externalMappings`);
}

function inspectEntity(entity: JsonRecord, path: string): ProjectInterchangeDiagnostic[] {
  return [
    ...inspectRecordArray(entity["identifiers"], `${path}/identifiers`, IDENTIFIER_FIELDS),
    ...inspectRecordArray(entity["appellations"], `${path}/appellations`, APPELLATION_FIELDS),
    ...inspectMappings(entity["semanticMappings"], `${path}/semanticMappings`),
  ];
}

function inspectRelationship(
  relationship: JsonRecord,
  path: string,
): ProjectInterchangeDiagnostic[] {
  const diagnostics = [
    ...inspectMappings(relationship["semanticMappings"], `${path}/semanticMappings`),
    ...inspectTemporal(relationship["time"], `${path}/time`),
  ];
  for (const field of ["subjectContext", "objectContext"] as const) {
    const context = record(relationship[field]);
    if (!context) continue;
    const contextPath = `${path}/${field}`;
    diagnostics.push(...unknownFieldDiagnostics(context, ACTOR_CONTEXT_FIELDS, contextPath));
    diagnostics.push(...inspectParticipant(context, contextPath));
  }
  return diagnostics;
}

function inspectOccurrence(occurrence: JsonRecord, path: string): ProjectInterchangeDiagnostic[] {
  return [
    ...inspectTemporal(occurrence["time"], `${path}/time`),
    ...inspectMappings(occurrence["semanticMappings"], `${path}/semanticMappings`),
    ...inspectRecordArray(
      occurrence["participantContexts"],
      `${path}/participantContexts`,
      OCCURRENCE_PARTICIPANT_FIELDS,
      inspectParticipant,
    ),
  ];
}

function inspectPlace(place: JsonRecord, path: string): ProjectInterchangeDiagnostic[] {
  const geometry = record(place["geometry"]);
  return geometry ? unknownFieldDiagnostics(geometry, GEOMETRY_FIELDS, `${path}/geometry`) : [];
}

function inspectTrajectory(trajectory: JsonRecord, path: string): ProjectInterchangeDiagnostic[] {
  const diagnostics = [
    ...inspectTemporal(trajectory["time"], `${path}/time`),
    ...inspectMappings(trajectory["externalMappings"], `${path}/externalMappings`),
    ...inspectRecordArray(trajectory["channels"], `${path}/channels`, TRAJECTORY_CHANNEL_FIELDS),
    ...inspectRecordArray(trajectory["levels"], `${path}/levels`, TRAJECTORY_LEVEL_FIELDS),
  ];
  const bounds = record(trajectory["bounds"]);
  if (bounds) {
    diagnostics.push(
      ...unknownFieldDiagnostics(bounds, TRAJECTORY_BOUNDS_FIELDS, `${path}/bounds`),
    );
  }
  const storage = record(trajectory["storage"]);
  if (storage) {
    diagnostics.push(
      ...unknownFieldDiagnostics(storage, TRAJECTORY_STORAGE_FIELDS, `${path}/storage`),
    );
  }
  return diagnostics;
}

export function projectCollectionShapeDiagnostics(
  collection:
    | "entities"
    | "relationships"
    | "occurrences"
    | "trajectories"
    | "places"
    | "sources"
    | "categories"
    | "stories",
  records: unknown,
  path = "/records",
): readonly ProjectInterchangeDiagnostic[] {
  switch (collection) {
    case "entities":
      return inspectRecordArray(records, path, ENTITY_FIELDS, inspectEntity);
    case "relationships":
      return inspectRecordArray(records, path, RELATIONSHIP_FIELDS, inspectRelationship);
    case "occurrences":
      return inspectRecordArray(records, path, OCCURRENCE_FIELDS, inspectOccurrence);
    case "trajectories":
      return inspectRecordArray(records, path, TRAJECTORY_FIELDS, inspectTrajectory);
    case "places":
      return inspectRecordArray(records, path, PLACE_FIELDS, inspectPlace);
    case "sources":
      return inspectRecordArray(records, path, SOURCE_FIELDS);
    case "categories":
      return inspectRecordArray(records, path, CATEGORY_FIELDS);
    case "stories":
      return inspectRecordArray(records, path, STORY_FIELDS);
  }
  return [];
}

function strictShapeDiagnostics(envelope: JsonRecord): ProjectInterchangeDiagnostic[] {
  const diagnostics = unknownFieldDiagnostics(envelope, ENVELOPE_FIELDS);
  const project = record(envelope["project"]);
  if (!project) return diagnostics;

  diagnostics.push(...unknownFieldDiagnostics(project, PROJECT_FIELDS, "/project"));
  diagnostics.push(
    ...inspectRecordArray(project["entities"], "/project/entities", ENTITY_FIELDS, inspectEntity),
    ...inspectRecordArray(
      project["relationships"],
      "/project/relationships",
      RELATIONSHIP_FIELDS,
      inspectRelationship,
    ),
    ...inspectRecordArray(
      project["occurrences"],
      "/project/occurrences",
      OCCURRENCE_FIELDS,
      inspectOccurrence,
    ),
    ...inspectRecordArray(
      project["trajectories"],
      "/project/trajectories",
      TRAJECTORY_FIELDS,
      inspectTrajectory,
    ),
    ...inspectRecordArray(project["places"], "/project/places", PLACE_FIELDS, inspectPlace),
    ...inspectRecordArray(project["sources"], "/project/sources", SOURCE_FIELDS),
    ...inspectRecordArray(project["categories"], "/project/categories", CATEGORY_FIELDS),
    ...inspectRecordArray(project["stories"], "/project/stories", STORY_FIELDS),
  );
  return diagnostics;
}

const CANONICAL_KEY_ORDER = Object.freeze([
  "$schema",
  "format",
  "interchangeVersion",
  "schemaVersion",
  "projectKey",
  "revision",
  "savedAt",
  "project",
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
  "id",
  "type",
  "name",
  "title",
  "description",
  "kind",
  "geometry",
  "geographicIdentifier",
  "address",
  "sourceName",
  "note",
  "publishedAt",
  "url",
  "color",
  "occurrenceIds",
  "placeIds",
  "identityResolution",
  "alternateNames",
  "identifiers",
  "appellations",
  "subjectId",
  "predicate",
  "objectId",
  "role",
  "occurrenceType",
  "subjectContext",
  "objectContext",
  "placeId",
  "time",
  "itemIds",
  "participantContexts",
  "entityId",
  "roleType",
  "representedEntityId",
  "organizationId",
  "authoritySourceIds",
  "relationshipIds",
  "trajectoryIds",
  "sourceIds",
  "sourceArtifactIds",
  "observedEntityIds",
  "confidence",
  "sampleCount",
  "bounds",
  "channels",
  "levels",
  "storage",
  "kind",
  "start",
  "end",
  "openStart",
  "openEnd",
  "semanticMappings",
  "externalMappings",
  "scheme",
  "version",
  "identifier",
  "relation",
  "value",
  "issuer",
  "languageTag",
  "minLongitude",
  "minLatitude",
  "maxLongitude",
  "maxLatitude",
  "minElevationMeters",
  "maxElevationMeters",
  "unit",
  "semantic",
  "pointCount",
  "toleranceMeters",
  "storageRef",
  "ref",
  "mediaType",
  "encoding",
  "attributes",
] as const);

const CANONICAL_KEY_RANK = new Map<string, number>(
  CANONICAL_KEY_ORDER.map((key, index): [string, number] => [key, index]),
);

function compareCanonicalKeys(left: string, right: string): number {
  const leftRank = CANONICAL_KEY_RANK.get(left);
  const rightRank = CANONICAL_KEY_RANK.get(right);
  if (leftRank !== undefined || rightRank !== undefined) {
    return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
  }
  return left.localeCompare(right);
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  const object = record(value);
  if (!object) return value;

  return Object.fromEntries(
    Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort(compareCanonicalKeys)
      .map((key) => [key, canonicalizeJson(object[key])]),
  );
}

export function formatProjectInterchange(serialized: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error("Lūm project interchange is not valid JSON.", { cause: error });
  }
  return `${JSON.stringify(canonicalizeJson(parsed), null, 2)}\n`;
}

export function serializeProjectInterchange(snapshot: ProjectSnapshot): string {
  const persisted = JSON.parse(serializeProjectSnapshot(snapshot)) as JsonRecord;
  const interchange = {
    $schema: LUM_PROJECT_SCHEMA_ID,
    ...persisted,
    interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
  };
  return formatProjectInterchange(JSON.stringify(interchange));
}

export function createEmptyProjectInterchange(options: {
  readonly projectKey: string;
  readonly savedAt: string;
}): string {
  return serializeProjectInterchange({
    projectKey: options.projectKey,
    revision: 1,
    savedAt: options.savedAt,
    project: {
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      entities: [],
      relationships: [],
    },
  });
}

export function validateProjectInterchange(
  serialized: string,
  migrations: readonly ProjectMigration[] = [],
): ProjectInterchangeValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return {
      valid: false,
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json",
          path: "",
          message: "Lūm project interchange is not valid JSON.",
          remediation: "Repair JSON syntax before validating canonical semantics.",
        },
      ],
    };
  }

  const envelope = record(parsed);
  if (!envelope) {
    return {
      valid: false,
      diagnostics: [
        {
          severity: "error",
          code: "invalid-envelope",
          path: "",
          message: "Lūm project interchange must be a JSON object.",
        },
      ],
    };
  }

  const diagnostics = strictShapeDiagnostics(envelope);

  if (envelope["format"] !== LUM_PROJECT_INTERCHANGE_FORMAT) {
    diagnostics.push({
      severity: "error",
      code: "unsupported-format",
      path: "/format",
      message: `Expected format "${LUM_PROJECT_INTERCHANGE_FORMAT}".`,
    });
  }

  if (envelope["interchangeVersion"] !== LUM_PROJECT_INTERCHANGE_VERSION) {
    diagnostics.push({
      severity: "error",
      code: "unsupported-interchange-version",
      path: "/interchangeVersion",
      message: `Expected interchangeVersion ${LUM_PROJECT_INTERCHANGE_VERSION}.`,
      remediation: "Migrate the document to a supported interchange version before import.",
    });
  }

  if (envelope["$schema"] !== LUM_PROJECT_SCHEMA_ID) {
    diagnostics.push({
      severity: "error",
      code: "unsupported-schema-id",
      path: "/$schema",
      message: `Expected $schema "${LUM_PROJECT_SCHEMA_ID}".`,
    });
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { valid: false, diagnostics };
  }

  try {
    const snapshot = deserializeProjectSnapshot(JSON.stringify(envelope), migrations);
    return {
      valid: true,
      diagnostics,
      snapshot,
    };
  } catch (error) {
    return {
      valid: false,
      diagnostics: [
        ...diagnostics,
        {
          severity: "error",
          code: "invalid-project",
          path: "/project",
          message: error instanceof Error ? error.message : "Lūm project validation failed.",
        },
      ],
    };
  }
}

export function lintProjectInterchange(
  serialized: string,
  options: { readonly fileName?: string } = {},
): { readonly valid: boolean; readonly diagnostics: readonly ProjectInterchangeDiagnostic[] } {
  const validation = validateProjectInterchange(serialized);
  const diagnostics = [...validation.diagnostics];

  if (
    options.fileName &&
    options.fileName !== "-" &&
    !options.fileName.endsWith(LUM_PROJECT_FILE_EXTENSION)
  ) {
    diagnostics.push({
      severity: "error",
      code: "non-canonical-extension",
      path: "",
      message: `Portable Lūm projects must use the ${LUM_PROJECT_FILE_EXTENSION} suffix.`,
    });
  }

  try {
    if (formatProjectInterchange(serialized) !== serialized) {
      diagnostics.push({
        severity: "error",
        code: "non-canonical-format",
        path: "",
        message: "Project text is not in canonical Lūm formatting. Run `lum fmt`.",
      });
    }
  } catch {
    // Invalid JSON is already diagnosed by validateProjectInterchange.
  }

  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
  };
}

export class ProjectInterchangeValidationError extends Error {
  readonly diagnostics: readonly ProjectInterchangeDiagnostic[];

  constructor(diagnostics: readonly ProjectInterchangeDiagnostic[]) {
    super(
      diagnostics.map((diagnostic) => `${diagnostic.path || "/"}: ${diagnostic.message}`).join(" "),
    );
    this.name = "ProjectInterchangeValidationError";
    this.diagnostics = diagnostics;
  }
}

export function deserializeProjectInterchange(
  serialized: string,
  migrations: readonly ProjectMigration[] = [],
): ProjectSnapshot {
  const validation = validateProjectInterchange(serialized, migrations);
  if (!validation.valid) {
    throw new ProjectInterchangeValidationError(validation.diagnostics);
  }
  return validation.snapshot;
}
