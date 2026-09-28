import {
  createEmptyProjectInterchange,
  LUM_PROJECT_INTERCHANGE_FORMAT,
  LUM_PROJECT_INTERCHANGE_VERSION,
  LUM_PROJECT_SCHEMA_ID,
  validateProjectInterchange,
  type ProjectInterchangeDiagnostic,
} from "../../src/application/project-interchange.ts";
import {
  LUM_PROJECT_MODULE_FORMAT,
  LUM_PROJECT_MODULE_SCHEMA_ID,
  LUM_PROJECT_MODULE_VERSION,
  validateProjectModule,
} from "../../src/application/project-module.ts";

type JsonRecord = Record<string, unknown>;

export type StorySourceManifest = {
  id: string;
  title?: string;
  mediaType?: string;
  locator?: string;
  digest?: string;
};

export type StoryProjectPreflight = {
  valid: boolean;
  validationScope: "project";
  diagnostics: readonly ProjectInterchangeDiagnostic[];
  summary: {
    stories: number;
    occurrences: number;
    entities: number;
    relationships: number;
    places: number;
    sources: number;
    categories: number;
  };
};

export type StoryStageResult = {
  schemaVersion: "lum-story-proposal-v1";
  status: "ready-for-user-verification" | "needs-repair";
  project: JsonRecord;
  sources: StorySourceManifest[];
  unresolved: string[];
  generationNotes: string;
  preflight: StoryProjectPreflight;
  verificationRequired: true;
  verificationInstructions: string[];
};

export const DOCUMENT_STORY_GUIDE = `# Lūm document-to-story authoring guide

Use this workflow when the user asks you to build a new Lūm story or project from uploaded documents or supplied text.

## Source-first rule

Read the user-provided source material before creating canonical records. Treat those sources as the factual authority for the proposal. Do not fill factual gaps from memory, outside knowledge, or web search unless the user explicitly asks you to use those sources too.

Preserve uncertainty. If a fact, date, place, identity, or relationship is ambiguous, keep it in the proposal's unresolved list rather than inventing a canonical value.

The public MCP endpoint is stateless and does not retain source documents. The host/model reads uploaded documents and submits only canonical Lūm interchange plus a small source manifest.

## Canonical target

The project payload is Lūm Project Interchange, not a prompt-defined project approximation.

- Project schema: https://xtreemze.github.io/timeline/schemas/lum-project-v1.schema.json
- Project format: lum-project v1
- Module schema: https://xtreemze.github.io/timeline/schemas/lum-project-module-v1.schema.json
- Module format: lum-project-module v1

Use canonical entities, relationships, occurrences, places, sources, categories, and stories. Stories traverse occurrenceIds. Relationship itemIds reference those same occurrence IDs. Places are geographic records, never entity nodes. Source/provenance metadata belongs in canonical sources and sourceIds.

Explicit entity icons are optional presentation metadata at entity.attributes.style.icon and must use the supported Lūm semantic vocabulary.

For limited-context work, edit one bounded Lūm project module at a time. Module validation checks the module envelope/shape; final readiness always requires whole-project assembly and canonical semantic validation.

## Agent workflow

1. Fetch this guide and schema identifiers.
2. Read the supplied source material.
3. Create or edit bounded canonical modules.
4. Validate changed modules and repair structured diagnostics by code + JSON Pointer path.
5. Assemble the complete canonical Lūm project.
6. Run whole-project validation with lum.stage_story_project.
7. Preserve unresolved/ambiguous facts in the proposal envelope.
8. Present the proposal to the user for evidence and factual review.
9. Import/open it in Lūm and run live audit/validation before treating it as verified.

## Modeling rules

- Durable nouns become entities; actions/events/places/dates/categories/stories do not.
- Relationships are directed subject-action-object facts between two different entities.
- Occurrences carry chronology and group relationship participation.
- Reuse canonical IDs; do not duplicate or mirror the same directed fact.
- Use only dates/times supported by the source. Synthetic ordering coordinates are permitted only when the user explicitly allows them and must be marked synthetic/inferred in source text.
- Create a place only when geometry is supplied or explicitly approved. Do not geocode from model memory.
- Keep presentation metadata in attributes; never persist renderer, camera, force, cluster, hover, selection, or other transient state.
- Never auto-repair factual ambiguity during validation.

## User verification is mandatory

A successful canonical validation means the document satisfies Lūm structural and semantic rules. It is not a truth judgment and it does not commit anything to the user's browser project.

Always surface unresolved facts and require user review of sources, chronology, entities, relationships, dates, and places before calling the proposal verified.
`;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems = 500, maxLength = 500): string[] {
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

function canonicalSerialized(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function emptySummary(): StoryProjectPreflight["summary"] {
  return {
    stories: 0,
    occurrences: 0,
    entities: 0,
    relationships: 0,
    places: 0,
    sources: 0,
    categories: 0,
  };
}

export function preflightStoryProject(projectInput: unknown): StoryProjectPreflight {
  const validation = validateProjectInterchange(canonicalSerialized(projectInput));
  if (!validation.valid) {
    return {
      valid: false,
      validationScope: "project",
      diagnostics: validation.diagnostics,
      summary: emptySummary(),
    };
  }

  const project = validation.snapshot.project;
  return {
    valid: true,
    validationScope: "project",
    diagnostics: validation.diagnostics,
    summary: {
      stories: project.stories?.length ?? 0,
      occurrences: project.occurrences?.length ?? 0,
      entities: project.entities.length,
      relationships: project.relationships.length,
      places: project.places?.length ?? 0,
      sources: project.sources?.length ?? 0,
      categories: project.categories?.length ?? 0,
    },
  };
}

export function validateStoryProjectModule(input: unknown): {
  readonly valid: boolean;
  readonly validationScope: "module";
  readonly diagnostics: readonly ProjectInterchangeDiagnostic[];
  readonly module?: JsonRecord;
} {
  const validation = validateProjectModule(canonicalSerialized(input));
  if (!validation.valid) {
    return {
      valid: false,
      validationScope: "module",
      diagnostics: validation.diagnostics,
    };
  }
  return {
    valid: true,
    validationScope: "module",
    diagnostics: validation.diagnostics,
    module: validation.module as unknown as JsonRecord,
  };
}

export function stageStoryProject(input: unknown): StoryStageResult {
  const value = record(input) || {};
  const projectInput = value.project;
  const project = record(projectInput) || {};
  const sources = sourceManifest(value.sources);
  const unresolved = stringList(value.unresolved, 1000, 2000);
  const generationNotes = text(value.generationNotes, 10_000);
  const preflight = preflightStoryProject(projectInput);

  return {
    schemaVersion: "lum-story-proposal-v1",
    status: preflight.valid ? "ready-for-user-verification" : "needs-repair",
    project,
    sources,
    unresolved,
    generationNotes,
    preflight,
    verificationRequired: true,
    verificationInstructions: [
      "Review every unresolved or ambiguous source-supported fact.",
      "Import/open the canonical .lum.json project in Lūm.",
      "Run timeline.audit_graph against the live project.",
      "Run timeline.validate_project against the live project.",
      "Review source/provenance, occurrences, entities, relationships, dates, and places before accepting the story as verified.",
    ],
  };
}

function canonicalTemplate(): JsonRecord {
  return JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "source-derived-project",
      savedAt: "2026-09-28T00:00:00.000Z",
    }),
  ) as JsonRecord;
}

function minimalCanonicalExample(): JsonRecord {
  const example = canonicalTemplate();
  const project = record(example.project);
  if (!project) return example;

  project.entities = [
    {
      id: "person-alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: ["source-exhibit-a"],
      attributes: {},
    },
    {
      id: "person-bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      sourceIds: ["source-exhibit-a"],
      attributes: {},
    },
  ];
  project.relationships = [
    {
      id: "rel-alice-warns-bob",
      subjectId: "person-alice",
      predicate: "warns",
      objectId: "person-bob",
      itemIds: ["occurrence-alice-warns-bob"],
      sourceIds: ["source-exhibit-a"],
      confidence: 1,
      time: {
        type: "instant",
        start: {
          value: "2026-01-02",
          precision: "day",
          certainty: "exact",
          calendar: "gregorian",
          timeZone: null,
          utcOffset: null,
          sourceText: "on 2026-01-02",
        },
        end: null,
      },
      attributes: {},
    },
  ];
  project.occurrences = [
    {
      id: "occurrence-alice-warns-bob",
      title: "Alice warns Bob",
      time: {
        type: "instant",
        start: {
          value: "2026-01-02",
          precision: "day",
          certainty: "exact",
          calendar: "gregorian",
          timeZone: null,
          utcOffset: null,
          sourceText: "on 2026-01-02",
        },
        end: null,
      },
      participantContexts: [{ entityId: "person-alice" }, { entityId: "person-bob" }],
      relationshipIds: ["rel-alice-warns-bob"],
      sourceIds: ["source-exhibit-a"],
      confidence: 1,
      attributes: {},
    },
  ];
  project.sources = [
    {
      id: "source-exhibit-a",
      kind: "document",
      title: "Exhibit A",
      note: "The source states that Alice warned Bob on 2026-01-02.",
      attributes: { sourceLocator: { kind: "page", value: "4" } },
    },
  ];
  project.places = [];
  project.categories = [];
  project.stories = [
    {
      id: "story-exhibit-a",
      title: "Exhibit A chronology",
      description: "Occurrences supported by Exhibit A.",
      occurrenceIds: ["occurrence-alice-warns-bob"],
      placeIds: [],
      attributes: {},
    },
  ];
  return example;
}

export const STORY_PROJECT_TEMPLATE: JsonRecord = Object.freeze(canonicalTemplate());
export const STORY_PROJECT_FIELD_REFERENCE: JsonRecord = Object.freeze({
  authority: "Lūm Project Interchange schema + executable validator",
  projectSchema: LUM_PROJECT_SCHEMA_ID,
  projectFormat: LUM_PROJECT_INTERCHANGE_FORMAT,
  interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
  moduleSchema: LUM_PROJECT_MODULE_SCHEMA_ID,
  moduleFormat: LUM_PROJECT_MODULE_FORMAT,
  moduleVersion: LUM_PROJECT_MODULE_VERSION,
  diagnostics: "stable code + JSON Pointer path",
});
export const MINIMAL_STORY_PROJECT_EXAMPLE: JsonRecord = Object.freeze(
  minimalCanonicalExample(),
);

export function authoringGuideResult(): JsonRecord {
  return {
    guide: DOCUMENT_STORY_GUIDE,
    format: {
      projectSchema: LUM_PROJECT_SCHEMA_ID,
      projectFormat: LUM_PROJECT_INTERCHANGE_FORMAT,
      interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
      moduleSchema: LUM_PROJECT_MODULE_SCHEMA_ID,
      moduleFormat: LUM_PROJECT_MODULE_FORMAT,
      moduleVersion: LUM_PROJECT_MODULE_VERSION,
    },
    projectTemplate: STORY_PROJECT_TEMPLATE,
    fieldReference: STORY_PROJECT_FIELD_REFERENCE,
    minimalValidExample: MINIMAL_STORY_PROJECT_EXAMPLE,
    stagingSchemaVersion: "lum-story-proposal-v1",
    validationScopes: {
      module: "module envelope/shape validation",
      project: "whole-project structural + semantic + reference validation",
      factual: "user/source review; never asserted by MCP validation",
    },
    publicEndpointBehavior: {
      stateless: true,
      persistsDocuments: false,
      truthVerification: false,
      userVerificationRequired: true,
    },
  };
}
