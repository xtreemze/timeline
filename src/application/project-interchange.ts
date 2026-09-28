import type { ProjectMigration, ProjectSnapshot } from "./project-repository.ts";
import {
  deserializeProjectSnapshot,
  PROJECT_ENVELOPE_FORMAT,
  serializeProjectSnapshot,
} from "./project-repository.ts";

export const LUM_PROJECT_INTERCHANGE_FORMAT = PROJECT_ENVELOPE_FORMAT;
export const LUM_PROJECT_INTERCHANGE_VERSION = 1;
export const LUM_PROJECT_FILE_EXTENSION = ".lum.json";
export const LUM_PROJECT_MEDIA_TYPE = "application/vnd.lum.project+json";

export type ProjectInterchangeDiagnosticCode =
  | "invalid-json"
  | "invalid-envelope"
  | "unsupported-format"
  | "unsupported-interchange-version"
  | "unknown-field"
  | "invalid-project";

export interface ProjectInterchangeDiagnostic {
  readonly severity: "error";
  readonly code: ProjectInterchangeDiagnosticCode;
  readonly path: string;
  readonly message: string;
  readonly remediation?: string;
}

export type ProjectInterchangeValidation =
  | {
      readonly valid: true;
      readonly diagnostics: readonly [];
      readonly snapshot: ProjectSnapshot;
    }
  | {
      readonly valid: false;
      readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
    };

type JsonRecord = Record<string, unknown>;

const ENVELOPE_FIELDS = new Set([
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
]);

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
        "Remove the field or move intentionally extensible metadata into a documented extension namespace.",
    }));
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
      .sort()
      .map((key) => [key, canonicalizeJson(object[key])]),
  );
}

export function serializeProjectInterchange(snapshot: ProjectSnapshot): string {
  const persisted = JSON.parse(serializeProjectSnapshot(snapshot)) as JsonRecord;
  const interchange = {
    ...persisted,
    interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
  };
  return `${JSON.stringify(canonicalizeJson(interchange), null, 2)}\n`;
}

export function validateProjectInterchange(
  serialized: string,
  migrations: readonly ProjectMigration[] = [],
): ProjectInterchangeValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    return {
      valid: false,
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json",
          path: "",
          message: "Lūm project interchange is not valid JSON.",
          remediation: "Repair the JSON syntax before validating project semantics.",
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

  const diagnostics: ProjectInterchangeDiagnostic[] = [
    ...unknownFieldDiagnostics(envelope, ENVELOPE_FIELDS),
  ];

  if (envelope.format !== LUM_PROJECT_INTERCHANGE_FORMAT) {
    diagnostics.push({
      severity: "error",
      code: "unsupported-format",
      path: "/format",
      message: `Expected format "${LUM_PROJECT_INTERCHANGE_FORMAT}".`,
    });
  }

  if (envelope.interchangeVersion !== LUM_PROJECT_INTERCHANGE_VERSION) {
    diagnostics.push({
      severity: "error",
      code: "unsupported-interchange-version",
      path: "/interchangeVersion",
      message: `Expected interchangeVersion ${LUM_PROJECT_INTERCHANGE_VERSION}.`,
      remediation:
        "Use a supported Lūm interchange version or migrate the document before import.",
    });
  }

  const project = record(envelope.project);
  if (project) {
    diagnostics.push(...unknownFieldDiagnostics(project, PROJECT_FIELDS, "/project"));
  }

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics };
  }

  try {
    const snapshot = deserializeProjectSnapshot(JSON.stringify(envelope), migrations);
    return {
      valid: true,
      diagnostics: [],
      snapshot,
    };
  } catch (error) {
    return {
      valid: false,
      diagnostics: [
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

export class ProjectInterchangeValidationError extends Error {
  readonly diagnostics: readonly ProjectInterchangeDiagnostic[];

  constructor(diagnostics: readonly ProjectInterchangeDiagnostic[]) {
    super(diagnostics.map((diagnostic) => `${diagnostic.path || "/"}: ${diagnostic.message}`).join(" "));
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
