import type { CanonicalEntity } from "../domain/entity.ts";
import {
  entityId,
  occurrenceId,
  placeId,
  relationshipId,
  sourceId,
  storyId,
} from "../domain/ids.ts";
import type { CanonicalOccurrence } from "../domain/occurrence.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type {
  CanonicalCategory,
  CanonicalPlace,
  CanonicalSource,
  CanonicalStory,
} from "../domain/composition.ts";
import { CURRENT_PROJECT_SCHEMA_VERSION, type ProjectSnapshot } from "./project-repository.ts";
import { serializeProjectInterchange, validateProjectInterchange } from "./project-interchange.ts";
import { createProjectModule } from "./project-module.ts";

type JsonRecord = Record<string, unknown>;

export interface LegacyExampleStory {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly itemIds: readonly string[];
  readonly placeIds?: readonly string[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface LegacyExampleSample {
  readonly title?: string;
  readonly entities: readonly JsonRecord[];
  readonly relationships: readonly JsonRecord[];
  readonly items: readonly JsonRecord[];
  readonly places: readonly JsonRecord[];
  readonly evidence: readonly JsonRecord[];
  readonly categories: readonly JsonRecord[];
  readonly stories: readonly LegacyExampleStory[];
}

export interface CompiledExampleStoryProject {
  readonly snapshot: ProjectSnapshot;
  readonly serialized: string;
}

export interface CompiledExampleCorpusStory extends CompiledExampleStoryProject {
  readonly storyId: string;
  readonly modules: readonly string[];
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

function requiredString(value: unknown, label: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function selectedSourceIds(
  entities: readonly JsonRecord[],
  relationships: readonly JsonRecord[],
  items: readonly JsonRecord[],
  places: readonly JsonRecord[],
): string[] {
  return unique([
    ...entities.flatMap((entity) => strings(entity.sourceIds)),
    ...relationships.flatMap((relationship) => strings(relationship.sourceIds)),
    ...items.flatMap((item) => strings(item.evidenceIds)),
    ...places.flatMap((place) => strings(place.sourceIds)),
  ]);
}

function canonicalEntity(raw: JsonRecord): CanonicalEntity {
  return {
    id: entityId(requiredString(raw.id, "Entity ID")),
    type: requiredString(raw.type ?? "entity", "Entity type"),
    name: requiredString(raw.name ?? raw.id, "Entity name"),
    alternateNames: strings(raw.alternateNames),
    ...(typeof raw.identityResolution === "string"
      ? {
          identityResolution: raw.identityResolution as CanonicalEntity["identityResolution"],
        }
      : {}),
    ...(Array.isArray(raw.identifiers)
      ? {
          identifiers: structuredClone(raw.identifiers) as NonNullable<
            CanonicalEntity["identifiers"]
          >,
        }
      : {}),
    ...(Array.isArray(raw.appellations)
      ? {
          appellations: structuredClone(raw.appellations) as NonNullable<
            CanonicalEntity["appellations"]
          >,
        }
      : {}),
    ...(Array.isArray(raw.semanticMappings)
      ? {
          semanticMappings: structuredClone(raw.semanticMappings) as NonNullable<
            CanonicalEntity["semanticMappings"]
          >,
        }
      : {}),
    sourceIds: strings(raw.sourceIds).map(sourceId),
    attributes: structuredClone(record(raw.attributes)),
  };
}

function canonicalRelationship(
  raw: JsonRecord,
  allowedOccurrenceIds: ReadonlySet<string>,
): CanonicalRelationship {
  const itemIds = strings(raw.itemIds).filter((id) => allowedOccurrenceIds.has(id));
  const attributes = structuredClone(record(raw.attributes));
  if (raw.initialState !== undefined) {
    attributes.legacyInitialState = structuredClone(raw.initialState);
  }
  return {
    id: relationshipId(requiredString(raw.id, "Relationship ID")),
    subjectId: entityId(requiredString(raw.subjectId, "Relationship subjectId")),
    objectId: entityId(requiredString(raw.objectId, "Relationship objectId")),
    predicate: requiredString(raw.predicate, "Relationship predicate"),
    ...(typeof raw.role === "string" && raw.role.trim() ? { role: raw.role } : {}),
    ...(typeof raw.occurrenceType === "string" && raw.occurrenceType.trim()
      ? { occurrenceType: raw.occurrenceType }
      : {}),
    ...(raw.subjectContext && typeof raw.subjectContext === "object"
      ? {
          subjectContext: structuredClone(raw.subjectContext) as NonNullable<
            CanonicalRelationship["subjectContext"]
          >,
        }
      : {}),
    ...(raw.objectContext && typeof raw.objectContext === "object"
      ? {
          objectContext: structuredClone(raw.objectContext) as NonNullable<
            CanonicalRelationship["objectContext"]
          >,
        }
      : {}),
    ...(Array.isArray(raw.semanticMappings)
      ? {
          semanticMappings: structuredClone(raw.semanticMappings) as NonNullable<
            CanonicalRelationship["semanticMappings"]
          >,
        }
      : {}),
    ...(typeof raw.placeId === "string" && raw.placeId.trim()
      ? { placeId: placeId(raw.placeId) }
      : {}),
    itemIds: itemIds.map(occurrenceId),
    sourceIds: strings(raw.sourceIds).map(sourceId),
    confidence:
      typeof raw.confidence === "number" && Number.isFinite(raw.confidence) ? raw.confidence : null,
    time:
      raw.time && typeof raw.time === "object"
        ? (structuredClone(raw.time) as CanonicalRelationship["time"])
        : null,
    attributes,
  };
}

function canonicalOccurrence(
  item: JsonRecord,
  relationships: readonly CanonicalRelationship[],
): CanonicalOccurrence {
  const id = requiredString(item.id, "Occurrence ID");
  const linked = relationships.filter((relationship) =>
    relationship.itemIds.some((itemId) => String(itemId) === id),
  );
  const participantIds = unique(
    linked.flatMap((relationship) => [
      String(relationship.subjectId),
      String(relationship.objectId),
    ]),
  );
  const linkedPlaces = unique(
    linked.flatMap((relationship) => (relationship.placeId ? [String(relationship.placeId)] : [])),
  );
  const attributes: JsonRecord = {
    description: typeof item.description === "string" ? item.description : "",
    ...(typeof item.categoryId === "string" ? { categoryId: item.categoryId } : {}),
    ...(Array.isArray(item.categoryIds)
      ? { categoryIds: strings(item.categoryIds) }
      : {}),
    ...(Array.isArray(item.tags) ? { tags: structuredClone(item.tags) } : {}),
    ...(item.presentation && typeof item.presentation === "object"
      ? { presentation: structuredClone(item.presentation) }
      : {}),
    ...(Array.isArray(item.media) ? { media: structuredClone(item.media) } : {}),
    ...(Array.isArray(item.relationChanges)
      ? { relationChanges: structuredClone(item.relationChanges) }
      : {}),
    ...(item.extensions && typeof item.extensions === "object"
      ? { extensions: structuredClone(item.extensions) }
      : {}),
  };
  if (participantIds.length === 0 && linked.length === 0) {
    throw new Error(
      `Legacy item ${id} cannot become a canonical occurrence without a participant or relationship.`,
    );
  }

  return {
    id: occurrenceId(id),
    ...(typeof item.title === "string" && item.title.trim() ? { title: item.title } : {}),
    time:
      item.time && typeof item.time === "object"
        ? (structuredClone(item.time) as CanonicalOccurrence["time"])
        : null,
    ...(linkedPlaces.length === 1 ? { placeId: placeId(linkedPlaces[0]!) } : {}),
    participantContexts: participantIds.map((id) => ({ entityId: entityId(id) })),
    relationshipIds: linked.map((relationship) => relationship.id),
    sourceIds: strings(item.evidenceIds).map(sourceId),
    confidence:
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? item.confidence
        : null,
    attributes,
  };
}

function canonicalPlace(raw: JsonRecord): CanonicalPlace {
  const attributes = structuredClone(record(raw.attributes));
  for (const key of ["crs", "radiusMeters", "icon", "markerShape", "style"]) {
    if (raw[key] !== undefined) attributes[key] = structuredClone(raw[key]);
  }
  return {
    id: placeId(requiredString(raw.id, "Place ID")),
    name: requiredString(raw.name ?? raw.id, "Place name"),
    geometry: structuredClone(raw.geometry) as CanonicalPlace["geometry"],
    ...(typeof raw.geographicIdentifier === "string"
      ? { geographicIdentifier: raw.geographicIdentifier }
      : {}),
    ...(typeof raw.address === "string" ? { address: raw.address } : {}),
    sourceIds: strings(raw.sourceIds).map(sourceId),
    attributes,
  };
}

function canonicalSource(raw: JsonRecord, id: string): CanonicalSource {
  const known = Object.hasOwn(raw, "id");
  return {
    id: sourceId(id),
    kind:
      typeof raw.type === "string" && raw.type.trim()
        ? raw.type
        : typeof raw.kind === "string" && raw.kind.trim()
          ? raw.kind
          : "source",
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : id,
    ...(typeof raw.sourceName === "string" ? { sourceName: raw.sourceName } : {}),
    ...(typeof raw.note === "string" ? { note: raw.note } : {}),
    ...(typeof raw.publishedAt === "string" ? { publishedAt: raw.publishedAt } : {}),
    ...(typeof raw.url === "string" ? { url: raw.url } : {}),
    attributes: known ? {} : { unresolvedLegacyReference: true },
  };
}

function canonicalCategory(raw: JsonRecord): CanonicalCategory {
  return {
    id: requiredString(raw.id, "Category ID"),
    name: requiredString(raw.name ?? raw.id, "Category name"),
    ...(typeof raw.color === "string" && raw.color.trim() ? { color: raw.color } : {}),
    attributes: structuredClone(record(raw.extensions)),
  };
}

export function compileExampleStoryProject(
  sample: LegacyExampleSample,
  selectedStoryId: string,
  options: { readonly savedAt: string; readonly projectKey?: string },
): CompiledExampleStoryProject {
  const story = sample.stories.find((candidate) => candidate.id === selectedStoryId);
  if (!story) throw new Error(`Example story ${selectedStoryId} does not exist.`);

  const itemIdSet = new Set(story.itemIds);
  const itemById = new Map(sample.items.map((item) => [String(item.id), item] as const));
  const missingItems = story.itemIds.filter((id) => !itemById.has(id));
  if (missingItems.length > 0) {
    throw new Error(
      `Example story ${selectedStoryId} is missing items: ${missingItems.join(", ")}.`,
    );
  }
  const items = story.itemIds.map((id) => itemById.get(id)!);

  const relationshipRows = sample.relationships.filter((relationship) => {
    const attributes = record(relationship.attributes);
    return (
      attributes.storyId === selectedStoryId ||
      strings(relationship.itemIds).some((id) => itemIdSet.has(id))
    );
  });
  const entityIdSet = new Set(
    relationshipRows
      .flatMap((relationship) => [
        String(relationship.subjectId ?? ""),
        String(relationship.objectId ?? ""),
      ])
      .filter(Boolean),
  );
  const entities = sample.entities.filter((entity) => entityIdSet.has(String(entity.id)));
  if (entities.length !== entityIdSet.size) {
    throw new Error(`Example story ${selectedStoryId} has unresolved relationship endpoints.`);
  }

  const relationships = relationshipRows.map((relationship) =>
    canonicalRelationship(relationship, itemIdSet),
  );
  const occurrences = items.map((item) => canonicalOccurrence(item, relationships));

  const referencedPlaceIds = new Set([
    ...(story.placeIds ?? []),
    ...relationships.flatMap((relationship) =>
      relationship.placeId ? [String(relationship.placeId)] : [],
    ),
    ...occurrences.flatMap((occurrence) =>
      occurrence.placeId ? [String(occurrence.placeId)] : [],
    ),
  ]);
  const placeRows = sample.places.filter((place) => referencedPlaceIds.has(String(place.id)));
  const places = placeRows.map(canonicalPlace);
  if (places.length !== referencedPlaceIds.size) {
    const present = new Set(places.map((place) => String(place.id)));
    const missing = [...referencedPlaceIds].filter((id) => !present.has(id));
    throw new Error(
      `Example story ${selectedStoryId} has unresolved places: ${missing.join(", ")}.`,
    );
  }

  const entityRecords = entities.map(canonicalEntity);
  const sourceIds = selectedSourceIds(entities, relationshipRows, items, placeRows);
  const evidenceById = new Map(sample.evidence.map((evidence) => [String(evidence.id), evidence]));
  const sources = sourceIds.map((id) => canonicalSource(evidenceById.get(id) ?? {}, id));

  const categoryIds = new Set(
    items.flatMap((item) => [
      ...(typeof item.categoryId === "string" && item.categoryId.trim() ? [item.categoryId] : []),
      ...strings(item.categoryIds),
    ]),
  );
  const categories = sample.categories
    .filter((category) => categoryIds.has(String(category.id)))
    .map(canonicalCategory);
  if (categories.length !== categoryIds.size) {
    throw new Error(`Example story ${selectedStoryId} has unresolved categories.`);
  }

  const canonicalStory: CanonicalStory = {
    id: storyId(story.id),
    title: story.title,
    ...(story.description ? { description: story.description } : {}),
    occurrenceIds: story.itemIds.map(occurrenceId),
    placeIds: [...referencedPlaceIds].map(placeId),
    attributes: structuredClone(record(story.extensions)),
  };

  const project: CanonicalProject = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    entities: entityRecords,
    relationships,
    occurrences,
    places,
    sources,
    categories,
    stories: [canonicalStory],
  };
  const snapshot: ProjectSnapshot = {
    projectKey: options.projectKey ?? `classic-tales-${story.id.replace(/^story-/, "")}`,
    revision: 1,
    savedAt: options.savedAt,
    project,
  };
  const serialized = serializeProjectInterchange(snapshot);
  const validation = validateProjectInterchange(serialized);
  if (!validation.valid) {
    throw new Error(
      `Compiled example story ${selectedStoryId} is not valid Lūm interchange: ${validation.diagnostics
        .map((diagnostic) => `${diagnostic.path || "/"}: ${diagnostic.message}`)
        .join(" ")}`,
    );
  }
  return Object.freeze({ snapshot: validation.snapshot, serialized });
}

export function compileExampleStoryModules(
  sample: LegacyExampleSample,
  selectedStoryId: string,
  options: { readonly savedAt: string; readonly projectKey?: string },
): readonly string[] {
  const compiled = compileExampleStoryProject(sample, selectedStoryId, options);
  const project = compiled.snapshot.project;
  const ownership = {
    projectKey: compiled.snapshot.projectKey,
    storyId: selectedStoryId,
  } as const;
  return Object.freeze([
    createProjectModule({ ...ownership, collection: "entities", records: project.entities }),
    createProjectModule({
      ...ownership,
      collection: "relationships",
      records: project.relationships,
    }),
    createProjectModule({
      ...ownership,
      collection: "occurrences",
      records: project.occurrences ?? [],
    }),
    createProjectModule({ ...ownership, collection: "places", records: project.places ?? [] }),
    createProjectModule({ ...ownership, collection: "sources", records: project.sources ?? [] }),
    createProjectModule({
      ...ownership,
      collection: "categories",
      records: project.categories ?? [],
    }),
    createProjectModule({ ...ownership, collection: "stories", records: project.stories ?? [] }),
  ]);
}

export function compileExampleStoryCorpus(
  sample: LegacyExampleSample,
  selectedStoryIds: readonly string[],
  options: { readonly savedAt: string; readonly projectKeyPrefix?: string },
): readonly CompiledExampleCorpusStory[] {
  const ids = selectedStoryIds.map((value) => requiredString(value, "Example story ID"));
  if (new Set(ids).size !== ids.length) {
    throw new Error("Example corpus story IDs must not contain duplicates.");
  }

  const availableIds = new Set(sample.stories.map((story) => story.id));
  for (const id of ids) {
    if (!availableIds.has(id)) {
      throw new Error(`Example story ${id} does not exist.`);
    }
  }

  return Object.freeze(
    ids.map((id) => {
      const suffix = id.replace(/^story-/, "");
      const projectKey = options.projectKeyPrefix
        ? `${options.projectKeyPrefix}-${suffix}`
        : undefined;
      const compiled = compileExampleStoryProject(sample, id, {
        savedAt: options.savedAt,
        ...(projectKey ? { projectKey } : {}),
      });
      const modules = compileExampleStoryModules(sample, id, {
        savedAt: options.savedAt,
        ...(projectKey ? { projectKey } : {}),
      });
      return Object.freeze({
        storyId: id,
        snapshot: compiled.snapshot,
        serialized: compiled.serialized,
        modules,
      });
    }),
  );
}
