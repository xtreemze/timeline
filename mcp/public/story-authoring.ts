import { TimelineSpatial } from "../../site/spatial.ts";
import { TimelineGraph } from "../../site/timeline-graph.ts";

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
  errors: string[];
  warnings: string[];
  summary: {
    stories: number;
    items: number;
    entities: number;
    relationships: number;
    places: number;
    evidence: number;
    sources: number;
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

Read the user-provided source material before creating canonical records. Treat the documents/text as the factual authority for the generated proposal. Do not fill factual gaps from memory, outside knowledge, or web search unless the user explicitly asks you to use those sources too.

Preserve uncertainty. If a fact, date, place, identity, or relationship is ambiguous, put it in the unresolved list rather than inventing a canonical value.

The public MCP endpoint is stateless and does not retain the source documents. The host/model should read uploaded documents itself and send only the structured Lūm proposal plus a small source manifest to the staging tool.

## Build a complete project from scratch

1. Create a project title that describes the source set or case.
2. Create one evidence record for each source document or meaningful source unit. Keep provenance/source metadata separate from semantic narrative text.
3. Create one or more stories. A story is an authored traversal over chronology item IDs; it is not graph topology.
4. Extract chronology items from source-supported occurrences. Prefer concrete events and meaningful ranges over sentence-by-sentence fragmentation.
5. Use the most precise time actually supported by the source:
   - exact timestamps/dates only when stated or safely derived;
   - ranges for sustained conditions or bounded periods;
   - never invent an absolute date merely to place an event on the timeline.
   If the source only establishes relative order and Lūm cannot represent it without an invented absolute coordinate, leave that occurrence unresolved. For fictional/demo material, synthetic ordering coordinates are allowed only when the user explicitly permits them and they must be labeled as synthetic/inferred in the temporal source text.
6. Extract durable entities as nouns with independent identity: people, organizations, groups, objects, documents, systems, vehicles, and other persistent things. Do not create entity nodes for actions, events, dates, places, categories, or stories.
7. Create directed subject-action-object relationships between two different entity nodes. The predicate is one concrete action verb, optionally followed by one grammatical particle. Do not embed entity names, place, time, role, cause, or instrument in the predicate.
8. Link each relationship to the chronology item(s) it explains using relationship.itemIds. Put occurrence time on relationship.time.
9. Places are reusable spatial context, not entity nodes. Create a canonical place only when the source or user provides usable geometry/coordinates. Do not geocode from model world knowledge. A named location without geometry should remain unresolved until the user supplies or approves geometry.
10. Every durable canonical entity named in an item's narrative context should participate in at least one meaningful action relationship linked to that item. Do not invent a relationship solely to satisfy this rule; mark the missing relation evidence unresolved instead.
11. Categories classify chronology items only. Never attach category/group taxonomy to entities, relationships, or places.
12. Reuse one canonical relationship for one directed action fact and merge context/provenance instead of creating duplicates or mirrored reverse copies.
13. Make story.itemIds follow the intended reading order. Also set item.extensions.narrative.storyId when one story is the item's primary narrative.
14. Use stable human-readable IDs. IDs must be unique across entities, places, chronology items, stories, and relationships.
15. Stage the complete project with lum.stage_story_project. Repair every preflight error before presenting the result as ready for review.

## Evidence and citations

Use evidenceIds on chronology items and sourceIds on relationships to preserve source traceability. Keep short semantic notes or source-grounded summaries in evidence records; do not copy an entire uploaded document into the MCP payload.

When the host can identify page, section, paragraph, timestamp, message ID, or another locator, preserve it in evidence metadata/extensions so the user can verify the event against the source later.

## User verification is mandatory

A successful public-endpoint preflight means only that the proposal satisfies the portable structural/graph checks. It is not a truth judgment and it does not commit the proposal to the user's browser project.

After generation:
- clearly tell the user that the project is a proposal derived from the supplied sources;
- surface unresolved/ambiguous facts;
- provide or export the complete Lūm JSON;
- have the user import/open it in Lūm;
- run the live timeline.audit_graph and timeline.validate_project checks;
- let the user inspect evidence, chronology, entities, relationships, dates, and places before treating the project as verified.

Never claim that a generated story has been verified merely because this staging endpoint accepted it.`;

export const STORY_PROJECT_TEMPLATE: JsonRecord = Object.freeze({
  version: 2,
  title: "Source-derived Lūm project",
  categories: [],
  items: [],
  stories: [],
  entities: [],
  places: [],
  relationships: [],
  evidence: [],
  custodyActions: [],
  reasoning: {},
  extensions: {},
});


export const STORY_PROJECT_FIELD_REFERENCE: JsonRecord = Object.freeze({
  project: {
    version: "2",
    title: "string",
    categories: "array of { id, name, color? }; categories classify chronology items only",
    evidence:
      "array of { id, type, title, sourceName?, note?, publishedAt?, url?, extensions? }; keep source locators/provenance here",
    stories: "array of { id, title, description?, itemIds[], extensions? }",
    items:
      "array of { id, kind:'event'|'range', start, end?, time, title, description?, categoryId?, evidenceIds[], relationChanges[], extensions? }",
    entities:
      "array of { id, type, name, alternateNames?, identifiers?, sourceIds?, attributes? }",
    places:
      "array of { id, name, geometry:{ type:'Point'|'LineString'|'MultiLineString'|'Polygon'|'MultiPolygon', coordinates }, geographicIdentifier?, address?, attributes? }",
    relationships:
      "array of { id, subjectId, predicate, objectId, itemIds[], sourceIds?, time?, placeId?, confidence?, attributes? }",
    custodyActions: "optional array",
    reasoning: "optional object",
    extensions: "optional object",
  },
  temporalInstant: {
    type: "instant",
    start: {
      value: "ISO date/time supported by source",
      precision: "year|month|day|hour|minute|second",
      certainty: "stated|inferred|approximate|uncertain",
      calendar: "gregorian",
      timeZone: "IANA zone or null",
      utcOffset: "offset or null",
      sourceText: "short source phrase supporting the temporal value",
    },
    end: null,
  },
  temporalInterval:
    "same endpoint shape with type:'interval' and both start/end populated from source-supported bounds",
});

export const MINIMAL_STORY_PROJECT_EXAMPLE: JsonRecord = Object.freeze({
  version: 2,
  title: "Exhibit A chronology",
  categories: [],
  evidence: [
    {
      id: "source-exhibit-a",
      type: "document",
      title: "Exhibit A",
      sourceName: "User-provided source",
      note: "The source states that Alice warned Bob on 2026-01-02.",
      extensions: {
        sourceLocator: { kind: "page", value: "4" },
      },
    },
  ],
  stories: [
    {
      id: "story-exhibit-a",
      title: "Exhibit A chronology",
      description: "Events supported by Exhibit A.",
      itemIds: ["event-alice-warns-bob"],
    },
  ],
  items: [
    {
      id: "event-alice-warns-bob",
      kind: "event",
      start: "2026-01-02",
      end: null,
      time: {
        type: "instant",
        start: {
          value: "2026-01-02",
          precision: "day",
          certainty: "stated",
          calendar: "gregorian",
          timeZone: null,
          utcOffset: null,
          sourceText: "on 2026-01-02",
        },
        end: null,
      },
      title: "Alice warns Bob",
      description: "Alice warned Bob.",
      evidenceIds: ["source-exhibit-a"],
      relationChanges: [],
      extensions: {
        narrative: {
          storyId: "story-exhibit-a",
          sequence: 1,
        },
      },
    },
  ],
  entities: [
    {
      id: "person-alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      identifiers: [],
      sourceIds: ["source-exhibit-a"],
      attributes: { storyId: "story-exhibit-a" },
    },
    {
      id: "person-bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      identifiers: [],
      sourceIds: ["source-exhibit-a"],
      attributes: { storyId: "story-exhibit-a" },
    },
  ],
  places: [],
  relationships: [
    {
      id: "rel-alice-warns-bob",
      subjectId: "person-alice",
      predicate: "warns",
      objectId: "person-bob",
      itemIds: ["event-alice-warns-bob"],
      sourceIds: ["source-exhibit-a"],
      time: {
        type: "instant",
        start: {
          value: "2026-01-02",
          precision: "day",
          certainty: "stated",
          calendar: "gregorian",
          timeZone: null,
          utcOffset: null,
          sourceText: "on 2026-01-02",
        },
        end: null,
      },
      confidence: 1,
      attributes: {},
    },
  ],
  custodyActions: [],
  reasoning: {},
  extensions: {},
});

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

function idSet(value: unknown): Set<string> {
  return new Set(
    array(value)
      .map((entry) => text(record(entry)?.id, 160))
      .filter(Boolean),
  );
}

function referencedIds(value: unknown): string[] {
  return stringList(value, 10_000, 160);
}

function relationChangeIds(item: JsonRecord): string[] {
  return array(item.relationChanges)
    .map((entry) => text(record(entry)?.relationshipId, 160))
    .filter(Boolean);
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

function uniquePush(target: string[], message: string): void {
  if (!target.includes(message)) target.push(message);
}

export function preflightStoryProject(
  projectInput: unknown,
  sourceInput: unknown = [],
): StoryProjectPreflight {
  const project = record(projectInput) || {};
  const sources = sourceManifest(sourceInput);
  const errors: string[] = [];
  const warnings: string[] = [];

  const stories = array(project.stories);
  const items = array(project.items);
  const entities = array(project.entities);
  const relationships = array(project.relationships);
  const places = array(project.places);
  const evidence = array(project.evidence);
  const categories = array(project.categories);

  if (!text(project.title, 500)) errors.push("Project title is required.");
  if (stories.length === 0) errors.push("At least one story is required.");
  if (items.length === 0) errors.push("At least one chronology item is required.");
  if (evidence.length === 0) {
    warnings.push("No evidence records were supplied; source verification will be weak.");
  }
  if (sources.length === 0) {
    warnings.push("No source manifest was supplied.");
  }

  const graphErrors = TimelineGraph.validateGraphInput(project, TimelineSpatial);
  for (const error of graphErrors) uniquePush(errors, error);

  const itemIds = idSet(items);
  const storyIds = idSet(stories);
  const evidenceIds = idSet(evidence);
  const categoryIds = idSet(categories);
  const relationshipIds = idSet(relationships);
  const entityIds = idSet(entities);
  const evidenceById = new Map<string, JsonRecord>();
  for (const entry of evidence) {
    const value = record(entry);
    const id = text(value?.id, 160);
    if (value && id) evidenceById.set(id, value);
  }

  for (const raw of stories) {
    const story = record(raw);
    if (!story) {
      errors.push("Every story must be an object.");
      continue;
    }
    const id = text(story.id, 160);
    if (!id) continue;
    if (!text(story.title, 500)) errors.push(`Story ${id}: title is required.`);
    const ids = referencedIds(story.itemIds);
    if (ids.length === 0) errors.push(`Story ${id}: itemIds must contain at least one chronology item.`);
    for (const itemId of ids) {
      if (!itemIds.has(itemId)) errors.push(`Story ${id}: unknown itemId "${itemId}".`);
    }
  }

  for (const raw of items) {
    const item = record(raw);
    if (!item) {
      errors.push("Every chronology item must be an object.");
      continue;
    }
    const id = text(item.id, 160);
    if (!id) continue;
    if (!text(item.title, 500)) errors.push(`Chronology item ${id}: title is required.`);
    if (!text(item.start, 160) && !record(item.time)?.start) {
      errors.push(`Chronology item ${id}: source-supported temporal placement is required.`);
    }

    const categoryId = text(item.categoryId, 160);
    if (categoryId && !categoryIds.has(categoryId)) {
      errors.push(`Chronology item ${id}: unknown categoryId "${categoryId}".`);
    }

    for (const evidenceId of referencedIds(item.evidenceIds)) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(`Chronology item ${id}: unknown evidenceId "${evidenceId}".`);
      }
    }

    const primaryStoryId = text(record(record(item.extensions)?.narrative)?.storyId, 160);
    if (primaryStoryId && !storyIds.has(primaryStoryId)) {
      errors.push(`Chronology item ${id}: unknown primary narrative storyId "${primaryStoryId}".`);
    }

    const contextualRelationshipIds = new Set<string>([
      ...relationships.flatMap((entry) => {
        const relationship = record(entry);
        const relationshipId = text(relationship?.id, 160);
        return relationshipId && referencedIds(relationship?.itemIds).includes(id)
          ? [relationshipId]
          : [];
      }),
      ...relationChangeIds(item),
    ]);

    for (const relationId of contextualRelationshipIds) {
      if (!relationshipIds.has(relationId)) {
        errors.push(`Chronology item ${id}: unknown relationship "${relationId}".`);
      }
    }

    const contextualEntityIds = new Set<string>();
    for (const rawRelationship of relationships) {
      const relationship = record(rawRelationship);
      if (!relationship) continue;
      const relationshipId = text(relationship.id, 160);
      if (!contextualRelationshipIds.has(relationshipId)) continue;
      const subjectId = text(relationship.subjectId, 160);
      const objectId = text(relationship.objectId, 160);
      if (subjectId) contextualEntityIds.add(subjectId);
      if (objectId) contextualEntityIds.add(objectId);
    }

    const mentions = TimelineGraph.namedEntityMentions(item, entities, evidenceById);
    for (const rawMention of Array.isArray(mentions) ? mentions : []) {
      const mention = record(rawMention);
      const mentionIds = referencedIds(mention?.entityIds);
      if (!mentionIds.length) continue;
      if (!mentionIds.some((entityId) => contextualEntityIds.has(entityId))) {
        const label = text(mention?.label, 240) || mentionIds.join(", ");
        errors.push(
          `Chronology item ${id}: named entity "${label}" is not connected by an action relationship linked to this item.`,
        );
      }
    }
  }

  for (const raw of relationships) {
    const relationship = record(raw);
    if (!relationship) continue;
    const id = text(relationship.id, 160);
    if (!id) continue;

    for (const itemId of referencedIds(relationship.itemIds)) {
      if (!itemIds.has(itemId)) {
        errors.push(`Relationship ${id}: unknown itemId "${itemId}".`);
      }
    }
    for (const sourceId of referencedIds(relationship.sourceIds)) {
      if (!evidenceIds.has(sourceId)) {
        warnings.push(
          `Relationship ${id}: sourceId "${sourceId}" does not resolve to a project evidence record.`,
        );
      }
    }
    if (!record(relationship.time)) {
      warnings.push(
        `Relationship ${id}: no occurrence time is attached. Add source-supported relationship.time when available.`,
      );
    }
  }

  for (const raw of entities) {
    const entity = record(raw);
    if (!entity) continue;
    const id = text(entity.id, 160);
    const storyId = text(record(entity.attributes)?.storyId, 160);
    if (id && storyId && !storyIds.has(storyId)) {
      warnings.push(`Entity ${id}: attributes.storyId "${storyId}" is not a known story.`);
    }
  }

  for (const raw of places) {
    const place = record(raw);
    if (!place) continue;
    const id = text(place.id, 160);
    if (id && !record(place.geometry)) {
      errors.push(`Place ${id}: canonical places require explicit geometry.`);
    }
  }

  if (entityIds.size > 0 && relationships.length === 0) {
    errors.push("Canonical entities are present but no meaningful action relationships were supplied.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      stories: stories.length,
      items: items.length,
      entities: entities.length,
      relationships: relationships.length,
      places: places.length,
      evidence: evidence.length,
      sources: sources.length,
    },
  };
}

export function stageStoryProject(input: unknown): StoryStageResult {
  const value = record(input) || {};
  const project = record(value.project) || {};
  const sources = sourceManifest(value.sources);
  const unresolved = stringList(value.unresolved, 1000, 2000);
  const generationNotes = text(value.generationNotes, 10_000);
  const preflight = preflightStoryProject(project, sources);

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
      "Import/open the complete project JSON in Lūm.",
      "Run timeline.audit_graph against the live project.",
      "Run timeline.validate_project against the live project.",
      "Review chronology, evidence locators, entities, relationships, dates, places, and unresolved facts before accepting the story as verified.",
    ],
  };
}

export function authoringGuideResult(): JsonRecord {
  return {
    guide: DOCUMENT_STORY_GUIDE,
    graphContract: TimelineGraph.getGraphContract(),
    projectTemplate: STORY_PROJECT_TEMPLATE,
    fieldReference: STORY_PROJECT_FIELD_REFERENCE,
    minimalValidExample: MINIMAL_STORY_PROJECT_EXAMPLE,
    stagingSchemaVersion: "lum-story-proposal-v1",
    publicEndpointBehavior: {
      stateless: true,
      persistsDocuments: false,
      truthVerification: false,
      userVerificationRequired: true,
    },
  };
}
