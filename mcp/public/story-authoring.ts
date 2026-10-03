import {
  createEmptyProjectInterchange,
  LUM_PROJECT_FILE_EXTENSION,
  LUM_PROJECT_INTERCHANGE_FORMAT,
  LUM_PROJECT_INTERCHANGE_VERSION,
  LUM_PROJECT_SCHEMA_ID,
  type ProjectInterchangeDiagnostic,
  validateProjectInterchange,
} from "../../src/application/project-interchange.ts";
import {
  createProjectModule,
  LUM_PROJECT_MODULE_FILE_EXTENSION,
  LUM_PROJECT_MODULE_FORMAT,
  LUM_PROJECT_MODULE_SCHEMA_ID,
  LUM_PROJECT_MODULE_VERSION,
  validateProjectModule,
} from "../../src/application/project-module.ts";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "../../src/application/project-repository.ts";

type JsonRecord = Record<string, unknown>;

export type StorySourceManifest = {
  id: string;
  title?: string;
  mediaType?: string;
  locator?: string;
  digest?: string;
};

export type CanonicalValidationResult = {
  valid: boolean;
  syntaxValid: boolean;
  semanticValid: boolean;
  semanticScope: "whole-project" | "fragment-structural";
  factualVerification: "required";
  diagnostics: readonly ProjectInterchangeDiagnostic[];
  errors: readonly string[];
  warnings: readonly string[];
  summary: Readonly<Record<string, number>>;
};

export type StoryStageResult = {
  schemaVersion: "lum-story-proposal-v2";
  status: "ready-for-user-verification" | "needs-repair";
  project: JsonRecord;
  sources: StorySourceManifest[];
  unresolved: string[];
  generationNotes: string;
  preflight: CanonicalValidationResult;
  verificationRequired: true;
  verificationInstructions: string[];
};

const MAX_SERIALIZED_CHARS = 5_000_000;
const MAX_COLLECTION_RECORDS = 20_000;
const MAX_JSON_DEPTH = 64;
const COLLECTIONS = Object.freeze([
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
] as const);

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems = 1000, maxLength = 2000): string[] {
  return array(value)
    .map((entry) => text(entry, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sourceManifest(input: unknown): StorySourceManifest[] {
  return array(input)
    .slice(0, 128)
    .flatMap((entry) => {
      const value = record(entry);
      const id = text(value?.id, 160);
      if (!id) return [];
      const source: StorySourceManifest = { id };
      const title = text(value?.title, 500);
      const mediaType = text(value?.mediaType, 160);
      const locator = text(value?.locator, 1000);
      const digest = text(value?.digest, 256);
      if (title) source.title = title;
      if (mediaType) source.mediaType = mediaType;
      if (locator) source.locator = locator;
      if (digest) source.digest = digest;
      return [source];
    });
}

function diagnostic(code: string, path: string, message: string): ProjectInterchangeDiagnostic {
  return Object.freeze({
    severity: "error" as const,
    code,
    path,
    message,
  });
}

function jsonDepth(value: unknown, depth = 0): number {
  if (depth > MAX_JSON_DEPTH) return depth;
  if (Array.isArray(value)) {
    return value.reduce((max, entry) => Math.max(max, jsonDepth(entry, depth + 1)), depth);
  }
  const object = record(value);
  if (!object) return depth;
  return Object.values(object).reduce(
    (max, entry) => Math.max(max, jsonDepth(entry, depth + 1)),
    depth,
  );
}

function serializedInput(value: unknown): {
  readonly serialized: string | null;
  readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
} {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (serialized.length > MAX_SERIALIZED_CHARS) {
      return {
        serialized: null,
        diagnostics: [
          diagnostic(
            "payload-too-large",
            "",
            `Canonical Lūm payload exceeds the ${MAX_SERIALIZED_CHARS} character public MCP limit.`,
          ),
        ],
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return {
        serialized,
        diagnostics: [diagnostic("invalid-json", "", "Lūm payload is not valid JSON.")],
      };
    }
    if (jsonDepth(parsed) > MAX_JSON_DEPTH) {
      return {
        serialized,
        diagnostics: [
          diagnostic(
            "json-depth-limit",
            "",
            `Canonical Lūm payload exceeds the maximum JSON nesting depth of ${MAX_JSON_DEPTH}.`,
          ),
        ],
      };
    }
    return { serialized, diagnostics: [] };
  } catch {
    return {
      serialized: null,
      diagnostics: [diagnostic("invalid-json", "", "Lūm payload cannot be serialized as JSON.")],
    };
  }
}

function collectionLimitDiagnostics(project: JsonRecord | null): ProjectInterchangeDiagnostic[] {
  const canonical = record(project?.project);
  if (!canonical) return [];
  const diagnostics: ProjectInterchangeDiagnostic[] = [];
  for (const collection of COLLECTIONS) {
    const count = array(canonical[collection]).length;
    if (count > MAX_COLLECTION_RECORDS) {
      diagnostics.push(
        diagnostic(
          "collection-limit",
          `/project/${collection}`,
          `${collection} contains ${count} records; the public MCP limit is ${MAX_COLLECTION_RECORDS}.`,
        ),
      );
    }
  }
  return diagnostics;
}

function summaryForProject(project: JsonRecord | null): Readonly<Record<string, number>> {
  const canonical = record(project?.project);
  return Object.freeze(
    Object.fromEntries(
      COLLECTIONS.map((collection) => [collection, array(canonical?.[collection]).length]),
    ),
  );
}

function validationResult(
  diagnostics: readonly ProjectInterchangeDiagnostic[],
  scope: CanonicalValidationResult["semanticScope"],
  summary: Readonly<Record<string, number>>,
): CanonicalValidationResult {
  const syntaxValid = !diagnostics.some((finding) => finding.code === "invalid-json");
  const semanticValid = syntaxValid && !diagnostics.some((finding) => finding.severity === "error");
  return Object.freeze({
    valid: semanticValid,
    syntaxValid,
    semanticValid,
    semanticScope: scope,
    factualVerification: "required" as const,
    diagnostics: Object.freeze([...diagnostics]),
    errors: Object.freeze(
      diagnostics
        .filter((finding) => finding.severity === "error")
        .map((finding) => `${finding.path || "/"}: ${finding.message}`),
    ),
    warnings: Object.freeze(
      diagnostics
        .filter((finding) => finding.severity === "warning")
        .map((finding) => `${finding.path || "/"}: ${finding.message}`),
    ),
    summary,
  });
}

export function preflightStoryProject(projectInput: unknown): CanonicalValidationResult {
  const prepared = serializedInput(projectInput);
  if (!prepared.serialized || prepared.diagnostics.length > 0) {
    return validationResult(prepared.diagnostics, "whole-project", Object.freeze({}));
  }

  const parsed = record(
    typeof projectInput === "string" ? JSON.parse(prepared.serialized) : projectInput,
  );
  const limits = collectionLimitDiagnostics(parsed);
  if (limits.length > 0) {
    return validationResult(limits, "whole-project", summaryForProject(parsed));
  }

  const validation = validateProjectInterchange(prepared.serialized);
  return validationResult(validation.diagnostics, "whole-project", summaryForProject(parsed));
}

export function validateStoryFragment(fragmentInput: unknown): CanonicalValidationResult {
  const prepared = serializedInput(fragmentInput);
  if (!prepared.serialized || prepared.diagnostics.length > 0) {
    return validationResult(prepared.diagnostics, "fragment-structural", Object.freeze({}));
  }

  const parsed = record(
    typeof fragmentInput === "string" ? JSON.parse(prepared.serialized) : fragmentInput,
  );
  const records = array(parsed?.records);
  if (records.length > MAX_COLLECTION_RECORDS) {
    return validationResult(
      [
        diagnostic(
          "collection-limit",
          "/records",
          `Module contains ${records.length} records; the public MCP limit is ${MAX_COLLECTION_RECORDS}.`,
        ),
      ],
      "fragment-structural",
      Object.freeze({ records: records.length }),
    );
  }

  const validation = validateProjectModule(prepared.serialized);
  return validationResult(
    validation.diagnostics,
    "fragment-structural",
    Object.freeze({ records: records.length }),
  );
}

export function stageStoryProject(input: unknown): StoryStageResult {
  const value = record(input) || {};
  const project = record(value.project) || {};
  const sources = sourceManifest(value.sources);
  const unresolved = stringList(value.unresolved);
  const generationNotes = text(value.generationNotes, 10_000);
  const preflight = preflightStoryProject(project);

  return Object.freeze({
    schemaVersion: "lum-story-proposal-v2" as const,
    status: preflight.valid ? "ready-for-user-verification" : "needs-repair",
    project,
    sources,
    unresolved,
    generationNotes,
    preflight,
    verificationRequired: true as const,
    verificationInstructions: Object.freeze([
      "Structural and semantic validation does not verify factual truth.",
      "Review source locators, unresolved facts, entity identity, relationships, dates, and places.",
      "Import/open only the validated canonical Lūm project candidate.",
      "User approval remains required before canonical replacement or commitment.",
    ]),
  });
}

export const DOCUMENT_STORY_GUIDE = `# Lūm source-to-story authoring guide

Read the user-provided source material before authoring. Preserve uncertainty and unresolved facts rather than inventing dates, coordinates, identities, or relationships.

## Machine-authoritative target

Generate canonical Lūm JSON. Do not target a prompt-described browser shape.

- Whole project: \`lum-project\`, schema \`${LUM_PROJECT_SCHEMA_ID}\`
- Bounded fragment: \`lum-project-module\`, schema \`${LUM_PROJECT_MODULE_SCHEMA_ID}\`

Use modules while iterating with limited context. A module proves only its own strict structural shape; cross-module references require assembly/whole-project validation.

Before a proposal may be marked ready for user verification:
1. validate changed modules;
2. resolve references against the project/module manifest;
3. assemble or emit a complete canonical Lūm project;
4. run whole-project validation;
5. stage the project;
6. surface unresolved facts and source locators;
7. require user review.

A successful validator result proves syntax/structure/semantic invariants only. It never proves factual truth.
`;

const EMPTY_PROJECT_TEMPLATE = Object.freeze(
  JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "source-derived-project",
      savedAt: "1970-01-01T00:00:00.000Z",
    }),
  ) as JsonRecord,
);

const EMPTY_ENTITIES_MODULE = Object.freeze(
  JSON.parse(
    createProjectModule({
      projectKey: "source-derived-project",
      storyId: "story-main",
      collection: "entities",
      records: [],
    }),
  ) as JsonRecord,
);

export const STORY_PROJECT_TEMPLATE: JsonRecord = EMPTY_PROJECT_TEMPLATE;
export const STORY_PROJECT_FIELD_REFERENCE: JsonRecord = Object.freeze({
  authority: "machine-readable schemas",
  projectSchema: LUM_PROJECT_SCHEMA_ID,
  moduleSchema: LUM_PROJECT_MODULE_SCHEMA_ID,
});
export const MINIMAL_STORY_PROJECT_EXAMPLE: JsonRecord = EMPTY_PROJECT_TEMPLATE;

export function authoringGuideResult(): JsonRecord {
  return Object.freeze({
    guide: DOCUMENT_STORY_GUIDE,
    formats: Object.freeze({
      project: Object.freeze({
        format: LUM_PROJECT_INTERCHANGE_FORMAT,
        schema: LUM_PROJECT_SCHEMA_ID,
        version: LUM_PROJECT_INTERCHANGE_VERSION,
        canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
        extension: LUM_PROJECT_FILE_EXTENSION,
      }),
      module: Object.freeze({
        format: LUM_PROJECT_MODULE_FORMAT,
        schema: LUM_PROJECT_MODULE_SCHEMA_ID,
        version: LUM_PROJECT_MODULE_VERSION,
        canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
        extension: LUM_PROJECT_MODULE_FILE_EXTENSION,
      }),
    }),
    projectTemplate: EMPTY_PROJECT_TEMPLATE,
    fragmentTemplate: EMPTY_ENTITIES_MODULE,
    fieldReference: STORY_PROJECT_FIELD_REFERENCE,
    minimalValidExample: MINIMAL_STORY_PROJECT_EXAMPLE,
    stagingSchemaVersion: "lum-story-proposal-v2",
    validation: Object.freeze({
      fragment: "exact lum-project-module validator",
      wholeProject: "exact lum-project interchange validator",
      factualVerification: "required",
      autoRepair: false,
    }),
    limits: Object.freeze({
      maxSerializedChars: MAX_SERIALIZED_CHARS,
      maxCollectionRecords: MAX_COLLECTION_RECORDS,
      maxJsonDepth: MAX_JSON_DEPTH,
    }),
    publicEndpointBehavior: Object.freeze({
      stateless: true,
      persistsDocuments: false,
      truthVerification: false,
      userVerificationRequired: true,
    }),
  });
}
