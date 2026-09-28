import type { CanonicalProject } from "../domain/project.ts";
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  type ProjectSnapshot,
} from "./project-repository.ts";
import {
  formatProjectInterchange,
  LUM_PROJECT_SCHEMA_ID,
  projectCollectionShapeDiagnostics,
  serializeProjectInterchange,
  validateProjectInterchange,
  type ProjectInterchangeDiagnostic,
} from "./project-interchange.ts";

export const LUM_PROJECT_MODULE_FORMAT = "lum-project-module";
export const LUM_PROJECT_MODULE_VERSION = 1;
export const LUM_PROJECT_MODULE_FILE_EXTENSION = ".module.lum.json";
export const LUM_PROJECT_MODULE_SCHEMA_ID =
  "https://xtreemze.github.io/timeline/schemas/lum-project-module-v1.schema.json";

export const LUM_PROJECT_MODULE_COLLECTIONS = Object.freeze([
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
] as const);

export type ProjectModuleCollection = (typeof LUM_PROJECT_MODULE_COLLECTIONS)[number];

export interface ProjectModuleEnvelope {
  readonly $schema: typeof LUM_PROJECT_MODULE_SCHEMA_ID;
  readonly format: typeof LUM_PROJECT_MODULE_FORMAT;
  readonly moduleVersion: typeof LUM_PROJECT_MODULE_VERSION;
  readonly canonicalSchemaVersion: number;
  readonly projectSchema: typeof LUM_PROJECT_SCHEMA_ID;
  readonly projectKey: string;
  readonly storyId: string;
  readonly collection: ProjectModuleCollection;
  readonly records: readonly unknown[];
}

export type ProjectModuleValidation =
  | {
      readonly valid: true;
      readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
      readonly module: ProjectModuleEnvelope;
    }
  | {
      readonly valid: false;
      readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
    };

const MODULE_FIELDS = new Set([
  "$schema",
  "format",
  "moduleVersion",
  "canonicalSchemaVersion",
  "projectSchema",
  "projectKey",
  "storyId",
  "collection",
  "records",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function diagnostic(
  code: string,
  path: string,
  message: string,
): ProjectInterchangeDiagnostic {
  return Object.freeze({
    severity: "error" as const,
    code,
    path,
    message,
  });
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateProjectModule(serialized: string): ProjectModuleValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return {
      valid: false,
      diagnostics: [diagnostic("invalid-json", "", "Lūm project module is not valid JSON.")],
    };
  }

  const envelope = record(parsed);
  if (!envelope) {
    return {
      valid: false,
      diagnostics: [
        diagnostic("invalid-module-envelope", "", "Lūm project module must be a JSON object."),
      ],
    };
  }

  const diagnostics: ProjectInterchangeDiagnostic[] = [];
  for (const key of Object.keys(envelope).sort()) {
    if (!MODULE_FIELDS.has(key)) {
      diagnostics.push(
        diagnostic(
          "unknown-field",
          `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          `Unknown module field "${key}".`,
        ),
      );
    }
  }
  if (envelope["$schema"] !== LUM_PROJECT_MODULE_SCHEMA_ID) {
    diagnostics.push(
      diagnostic("unsupported-schema-id", "/$schema", `Expected ${LUM_PROJECT_MODULE_SCHEMA_ID}.`),
    );
  }
  if (envelope["format"] !== LUM_PROJECT_MODULE_FORMAT) {
    diagnostics.push(
      diagnostic("unsupported-format", "/format", `Expected ${LUM_PROJECT_MODULE_FORMAT}.`),
    );
  }
  if (envelope["moduleVersion"] !== LUM_PROJECT_MODULE_VERSION) {
    diagnostics.push(
      diagnostic(
        "unsupported-module-version",
        "/moduleVersion",
        `Expected moduleVersion ${LUM_PROJECT_MODULE_VERSION}.`,
      ),
    );
  }
  if (envelope["canonicalSchemaVersion"] !== CURRENT_PROJECT_SCHEMA_VERSION) {
    diagnostics.push(
      diagnostic(
        "unsupported-canonical-schema-version",
        "/canonicalSchemaVersion",
        `Expected canonicalSchemaVersion ${CURRENT_PROJECT_SCHEMA_VERSION}.`,
      ),
    );
  }
  if (envelope["projectSchema"] !== LUM_PROJECT_SCHEMA_ID) {
    diagnostics.push(
      diagnostic("unsupported-project-schema", "/projectSchema", `Expected ${LUM_PROJECT_SCHEMA_ID}.`),
    );
  }
  if (!nonEmptyString(envelope["projectKey"])) {
    diagnostics.push(diagnostic("invalid-project-key", "/projectKey", "projectKey is required."));
  }
  if (!nonEmptyString(envelope["storyId"])) {
    diagnostics.push(diagnostic("invalid-story-id", "/storyId", "storyId is required."));
  }
  if (
    typeof envelope["collection"] !== "string" ||
    !LUM_PROJECT_MODULE_COLLECTIONS.includes(
      envelope["collection"] as ProjectModuleCollection,
    )
  ) {
    diagnostics.push(
      diagnostic(
        "invalid-module-collection",
        "/collection",
        `collection must be one of: ${LUM_PROJECT_MODULE_COLLECTIONS.join(", ")}.`,
      ),
    );
  }
  if (!Array.isArray(envelope["records"])) {
    diagnostics.push(
      diagnostic("invalid-module-records", "/records", "records must be an array."),
    );
  } else {
    envelope["records"].forEach((entry, index) => {
      if (!record(entry)) {
        diagnostics.push(
          diagnostic(
            "invalid-module-record",
            `/records/${index}`,
            "Each module record must be an object.",
          ),
        );
      }
    });
    if (
      typeof envelope["collection"] === "string" &&
      LUM_PROJECT_MODULE_COLLECTIONS.includes(
        envelope["collection"] as ProjectModuleCollection,
      )
    ) {
      diagnostics.push(
        ...projectCollectionShapeDiagnostics(
          envelope["collection"] as ProjectModuleCollection,
          envelope["records"],
        ),
      );
    }
  }

  if (diagnostics.length > 0) return { valid: false, diagnostics };

  return {
    valid: true,
    diagnostics: Object.freeze([]),
    module: Object.freeze({
      $schema: LUM_PROJECT_MODULE_SCHEMA_ID,
      format: LUM_PROJECT_MODULE_FORMAT,
      moduleVersion: LUM_PROJECT_MODULE_VERSION,
      canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      projectSchema: LUM_PROJECT_SCHEMA_ID,
      projectKey: String(envelope["projectKey"]),
      storyId: String(envelope["storyId"]),
      collection: envelope["collection"] as ProjectModuleCollection,
      records: Object.freeze([...(envelope["records"] as unknown[])]),
    }),
  };
}

export function formatProjectModule(serialized: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error("Lūm project module is not valid JSON.", { cause: error });
  }
  return formatProjectInterchange(JSON.stringify(parsed));
}

export function lintProjectModule(
  serialized: string,
  options: { readonly fileName?: string } = {},
): { readonly valid: boolean; readonly diagnostics: readonly ProjectInterchangeDiagnostic[] } {
  const validation = validateProjectModule(serialized);
  const diagnostics = [...validation.diagnostics];

  if (
    options.fileName &&
    options.fileName !== "-" &&
    !options.fileName.endsWith(LUM_PROJECT_MODULE_FILE_EXTENSION)
  ) {
    diagnostics.push(
      diagnostic(
        "non-canonical-extension",
        "",
        `Lūm project modules must use the ${LUM_PROJECT_MODULE_FILE_EXTENSION} suffix.`,
      ),
    );
  }

  try {
    if (formatProjectModule(serialized) !== serialized) {
      diagnostics.push(
        diagnostic(
          "non-canonical-format",
          "",
          "Module text is not in canonical Lūm formatting. Run `lum fmt`.",
        ),
      );
    }
  } catch {
    // Invalid JSON is already diagnosed by validateProjectModule.
  }

  return Object.freeze({
    valid: !diagnostics.some((finding) => finding.severity === "error"),
    diagnostics: Object.freeze(diagnostics),
  });
}

export function createProjectModule(options: {
  readonly projectKey: string;
  readonly storyId: string;
  readonly collection: ProjectModuleCollection;
  readonly records: readonly unknown[];
}): string {
  const envelope: ProjectModuleEnvelope = {
    $schema: LUM_PROJECT_MODULE_SCHEMA_ID,
    format: LUM_PROJECT_MODULE_FORMAT,
    moduleVersion: LUM_PROJECT_MODULE_VERSION,
    canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectSchema: LUM_PROJECT_SCHEMA_ID,
    projectKey: options.projectKey.trim(),
    storyId: options.storyId.trim(),
    collection: options.collection,
    records: structuredClone(options.records),
  };
  const serialized = formatProjectModule(JSON.stringify(envelope));
  const validation = validateProjectModule(serialized);
  if (!validation.valid) {
    throw new Error(
      validation.diagnostics.map((finding) => `${finding.path || "/"}: ${finding.message}`).join(" "),
    );
  }
  return serialized;
}

export function assembleProjectModules(
  serializedModules: readonly string[],
  options: { readonly savedAt: string; readonly revision?: number },
): { readonly snapshot: ProjectSnapshot; readonly serialized: string } {
  if (serializedModules.length === 0) {
    throw new Error("At least one Lūm project module is required.");
  }

  const modules = serializedModules.map((serialized, index) => {
    const validation = validateProjectModule(serialized);
    if (!validation.valid) {
      throw new Error(
        `Module ${index + 1} is invalid: ${validation.diagnostics
          .map((finding) => `${finding.path || "/"}: ${finding.message}`)
          .join(" ")}`,
      );
    }
    return validation.module;
  });

  const [first] = modules;
  if (!first) throw new Error("At least one Lūm project module is required.");
  if (
    modules.some(
      (module) =>
        module.projectKey !== first.projectKey || module.storyId !== first.storyId,
    )
  ) {
    throw new Error("All Lūm project modules must use the same projectKey and storyId.");
  }

  const byCollection = new Map<ProjectModuleCollection, readonly unknown[]>();
  for (const module of modules) {
    if (byCollection.has(module.collection)) {
      throw new Error(`Duplicate module for collection "${module.collection}".`);
    }
    byCollection.set(module.collection, module.records);
  }

  const project = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    entities: byCollection.get("entities") ?? [],
    relationships: byCollection.get("relationships") ?? [],
    ...(byCollection.has("occurrences")
      ? { occurrences: byCollection.get("occurrences") }
      : {}),
    ...(byCollection.has("trajectories")
      ? { trajectories: byCollection.get("trajectories") }
      : {}),
    ...(byCollection.has("places") ? { places: byCollection.get("places") } : {}),
    ...(byCollection.has("sources") ? { sources: byCollection.get("sources") } : {}),
    ...(byCollection.has("categories")
      ? { categories: byCollection.get("categories") }
      : {}),
    ...(byCollection.has("stories") ? { stories: byCollection.get("stories") } : {}),
  } as unknown as CanonicalProject;

  const snapshot: ProjectSnapshot = {
    projectKey: first.projectKey,
    revision: options.revision ?? 1,
    savedAt: options.savedAt,
    project,
  };
  const serialized = serializeProjectInterchange(snapshot);
  const validation = validateProjectInterchange(serialized);
  if (!validation.valid) {
    throw new Error(
      `Assembled Lūm project is invalid: ${validation.diagnostics
        .map((finding) => `${finding.path || "/"}: ${finding.message}`)
        .join(" ")}`,
    );
  }
  return Object.freeze({ snapshot: validation.snapshot, serialized });
}
