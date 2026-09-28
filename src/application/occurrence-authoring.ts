import { suggestSemanticIcon } from "../presentation/semantic-icon-inference.ts";
import {
  defaultSemanticIconForEntityType,
  normalizeSemanticIconName,
} from "../presentation/semantic-icons.ts";

export interface OccurrenceAuthoringEndpointReference {
  readonly name: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface OccurrenceAuthoringTime<TExtent = unknown> {
  readonly extent: TExtent;
  readonly kind: "event" | "range";
  readonly startValue: string;
  readonly endValue: string | null;
}

export interface OccurrenceAuthoringRequest<TExtent = unknown> {
  readonly subject: OccurrenceAuthoringEndpointReference | null | undefined;
  readonly object: OccurrenceAuthoringEndpointReference | null | undefined;
  readonly predicate: string | null | undefined;
  readonly placeName?: string | null;
  readonly longitude: number | null;
  readonly latitude: number | null;
  readonly accuracyMeters: number | null;
  readonly time: OccurrenceAuthoringTime<TExtent>;
  readonly categoryName?: string;
  readonly tags: readonly string[];
  readonly activeStoryId?: string | null;
}

interface AuthoringEntity {
  id: string;
  name: string;
  type?: string;
  alternateNames?: string[];
  identifiers?: unknown[];
  sourceIds?: string[];
  attributes?: Record<string, unknown>;
}

interface AuthoringPlace {
  id: string;
  name: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
}

interface AuthoringCategory {
  id: string;
  name: string;
  color: string;
}

interface AuthoringStory {
  id: string;
  itemIds: string[];
}

interface AuthoringRelationship<TExtent = unknown> {
  id: string;
  subjectId: string;
  objectId: string;
  predicate: string;
  role?: string;
  occurrenceType?: string;
  subjectContext?: Record<string, unknown>;
  objectContext?: Record<string, unknown>;
  semanticMappings?: unknown[];
  placeId?: string;
  itemIds?: string[];
  initialState?: "active" | "inactive";
  time?: TExtent | null;
  sourceIds?: string[];
  confidence?: number | null;
  attributes?: Record<string, unknown>;
}

export interface OccurrenceAuthoringState<TExtent = unknown> {
  categories: AuthoringCategory[];
  items: unknown[];
  stories: AuthoringStory[];
  entities: AuthoringEntity[];
  places: AuthoringPlace[];
  relationships: AuthoringRelationship<TExtent>[];
}

interface ValidationResult {
  readonly valid: boolean;
  readonly message?: string;
}

export interface OccurrenceUpdateRequest<TExtent = unknown> {
  readonly relationshipId: string;
  readonly itemId?: string | null;
  readonly subject: OccurrenceAuthoringEndpointReference | null | undefined;
  readonly object: OccurrenceAuthoringEndpointReference | null | undefined;
  readonly predicate: string | null | undefined;
  /**
   * undefined preserves the existing place; null clears it; a string resolves or creates it.
   */
  readonly placeName?: string | null;
  readonly longitude: number | null;
  readonly latitude: number | null;
  readonly accuracyMeters: number | null;
  /**
   * undefined preserves the exact canonical extent; null makes the relationship timeless.
   */
  readonly time?: OccurrenceAuthoringTime<TExtent> | null;
  /**
   * undefined preserves the linked chronology item's category.
   */
  readonly categoryName?: string | null;
  /**
   * undefined preserves tags; an empty array explicitly clears them.
   */
  readonly tags?: readonly string[];
}

export interface OccurrenceAuthoringDependencies<
  TExtent,
  TState extends OccurrenceAuthoringState<TExtent>,
> {
  cloneState(state: TState): TState;
  newId(kind: "entity" | "place" | "category" | "item" | "relationship"): string;
  validatePredicate(predicate: string): ValidationResult;
  validateEntity(entity: AuthoringEntity): ValidationResult;
  createPointPlace(input: {
    readonly id: string;
    readonly name: string;
    readonly longitude: number;
    readonly latitude: number;
    readonly accuracyMeters: number | null;
  }): AuthoringPlace | null;
  placeIdentity(place: AuthoringPlace): string;
  findDuplicateRelationship(
    relationship: AuthoringRelationship<TExtent>,
    relationships: readonly AuthoringRelationship<TExtent>[],
    relationshipId: string,
  ): { readonly id: string } | null | undefined;
  findMirroredRelationship(
    relationship: AuthoringRelationship<TExtent>,
    relationships: readonly AuthoringRelationship<TExtent>[],
    relationshipId: string,
  ): { readonly id: string } | null | undefined;
  normalizeState(state: TState): TState;
}

export interface OccurrenceAuthoringResult<TState> {
  readonly state: TState;
  readonly itemId: string;
  readonly relationshipId: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly placeId: string;
  readonly categoryId: string;
  readonly semanticReviewRequired?: boolean;
  readonly semanticReviewReasons?: readonly string[];
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function resolveEntity<TState extends OccurrenceAuthoringState<TExtent>, TExtent>(
  reference: OccurrenceAuthoringEndpointReference,
  draft: TState,
  dependencies: OccurrenceAuthoringDependencies<TExtent, TState>,
): AuthoringEntity {
  const rawName = reference.name.trim();
  if (!rawName) throw new Error("Each endpoint needs an entity name.");

  if (rawName.startsWith("@")) {
    const id = rawName.slice(1);
    const entity = draft.entities.find((candidate) => candidate.id === id);
    if (!entity) throw new Error(`No entity exists with ID “${id}”.`);
    return entity;
  }

  const key = normalizedName(rawName);
  const matches = draft.entities.filter((candidate) =>
    [candidate.name, ...(candidate.alternateNames ?? [])].some(
      (name) => normalizedName(name) === key,
    ),
  );
  if (matches.length > 1) {
    throw new Error(
      `“${rawName}” is ambiguous. Choose the intended completion or enter @<entity-id>.`,
    );
  }
  const existing = matches[0];
  if (existing) return existing;

  const type = reference.properties["type"]?.trim() || "entity";
  const attributes: Record<string, unknown> = Object.fromEntries(
    Object.entries(reference.properties).filter(
      ([property]) => !["type", "icon", "color"].includes(property),
    ),
  );
  const rawIcon = reference.properties["icon"]?.trim();
  const rawColor = reference.properties["color"]?.trim();
  const style: Record<string, unknown> = {};
  if (rawIcon) {
    const icon = normalizeSemanticIconName(rawIcon);
    if (!icon) throw new Error(`Unsupported semantic icon “${rawIcon}”.`);
    style["icon"] = icon;
  } else {
    const inferredIcon =
      suggestSemanticIcon({ name: rawName, type })?.icon ??
      defaultSemanticIconForEntityType(type);
    if (inferredIcon) style["icon"] = inferredIcon;
  }
  if (rawColor) {
    if (!/^#[0-9a-f]{6}$/i.test(rawColor)) {
      throw new Error("Entity color must use #RRGGBB hexadecimal notation.");
    }
    style["fillColor"] = rawColor.toLowerCase();
  }
  if (Object.keys(style).length > 0) attributes["style"] = style;
  const entity: AuthoringEntity = {
    id: dependencies.newId("entity"),
    name: rawName.slice(0, 180),
    type: type.slice(0, 60),
    alternateNames: [],
    identifiers: [],
    sourceIds: [],
    attributes,
  };
  const validation = dependencies.validateEntity(entity);
  if (!validation.valid) {
    throw new Error(validation.message || "The entity is invalid.");
  }
  draft.entities.push(entity);
  return entity;
}

function pointCoordinates(place: AuthoringPlace): readonly [number, number] | null {
  if (place.geometry?.type !== "Point" || !Array.isArray(place.geometry.coordinates)) return null;
  const [longitude, latitude] = place.geometry.coordinates;
  return typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    typeof latitude === "number" &&
    Number.isFinite(latitude)
    ? [longitude, latitude]
    : null;
}

function resolvePlace<TState extends OccurrenceAuthoringState<TExtent>, TExtent>(
  request: Pick<
    OccurrenceAuthoringRequest<TExtent>,
    "placeName" | "longitude" | "latitude" | "accuracyMeters"
  >,
  draft: TState,
  dependencies: OccurrenceAuthoringDependencies<TExtent, TState>,
): AuthoringPlace {
  const requested = request.placeName?.trim() || "";
  if (requested.startsWith("@")) {
    const id = requested.slice(1);
    const place = draft.places.find((candidate) => candidate.id === id);
    if (!place) throw new Error(`No place exists with ID “${id}”.`);
    return place;
  }

  if (requested) {
    const key = normalizedName(requested);
    const matches = draft.places.filter((candidate) => normalizedName(candidate.name) === key);
    if (matches.length > 1) {
      throw new Error(
        `“${requested}” is ambiguous. Choose the intended completion or enter @<place-id>.`,
      );
    }
    const existing = matches[0];
    if (existing) return existing;
  }

  const { longitude, latitude } = request;
  if (
    longitude === null ||
    latitude === null ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new Error(
      "A place is required. Move the World view to the intended location or type an existing place after “at”.",
    );
  }

  const coordinateMatch = draft.places.find((candidate) => {
    const coordinates = pointCoordinates(candidate);
    return (
      coordinates !== null &&
      Math.abs(coordinates[0] - longitude) < 1e-6 &&
      Math.abs(coordinates[1] - latitude) < 1e-6
    );
  });
  if (!requested && coordinateMatch) return coordinateMatch;

  const name = requested || `Location ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  const place = dependencies.createPointPlace({
    id: dependencies.newId("place"),
    name,
    longitude,
    latitude,
    accuracyMeters:
      request.accuracyMeters !== null &&
      Number.isFinite(request.accuracyMeters) &&
      request.accuracyMeters >= 0
        ? request.accuracyMeters
        : null,
  });
  if (!place?.geometry) {
    throw new Error("The current World center could not become a place.");
  }

  const identity = dependencies.placeIdentity(place);
  const duplicate = draft.places.find(
    (candidate) => dependencies.placeIdentity(candidate) === identity,
  );
  if (duplicate) return duplicate;

  draft.places.push(place);
  return place;
}

function resolveCategory<TState extends OccurrenceAuthoringState<TExtent>, TExtent>(
  name: string | undefined,
  draft: TState,
  dependencies: OccurrenceAuthoringDependencies<TExtent, TState>,
): AuthoringCategory {
  if (!name?.trim()) {
    const fallback = draft.categories[0];
    if (!fallback) throw new Error("The project has no occurrence categories.");
    return fallback;
  }

  const key = normalizedName(name);
  const existing = draft.categories.find(
    (category) => normalizedName(category.id) === key || normalizedName(category.name) === key,
  );
  if (existing) return existing;

  const category: AuthoringCategory = {
    id: dependencies.newId("category"),
    name: name.trim().slice(0, 60),
    color: "#667085",
  };
  draft.categories.push(category);
  return category;
}

export function authorOccurrence<TExtent, TState extends OccurrenceAuthoringState<TExtent>>(
  state: TState,
  request: OccurrenceAuthoringRequest<TExtent>,
  dependencies: OccurrenceAuthoringDependencies<TExtent, TState>,
): OccurrenceAuthoringResult<TState> {
  const subjectReference = request.subject;
  const objectReference = request.object;
  const predicate = request.predicate?.trim() || "";
  if (!subjectReference || !objectReference || !predicate) {
    throw new Error("Complete subject, action, and object before committing.");
  }

  const predicateValidation = dependencies.validatePredicate(predicate);
  if (!predicateValidation.valid) {
    throw new Error(predicateValidation.message || "The action predicate is invalid.");
  }

  const draft = dependencies.cloneState(state);
  const subject = resolveEntity(subjectReference, draft, dependencies);
  const object = resolveEntity(objectReference, draft, dependencies);
  if (subject.id === object.id) {
    throw new Error("An occurrence must connect two different entities.");
  }

  const place = resolvePlace(request, draft, dependencies);
  const category = resolveCategory(request.categoryName, draft, dependencies);
  const itemId = dependencies.newId("item");
  const item = {
    id: itemId,
    kind: request.time.kind,
    start: request.time.startValue,
    end: request.time.endValue,
    time: request.time.extent,
    title: `${subject.name} ${predicate} ${object.name}`.slice(0, 160),
    description: "",
    categoryId: category.id,
    presentation: {
      variant: "hero-split",
      terminalShape: "rounded",
      connectorStyle: "solid",
      connectorRouting: "straight",
      connectorWeight: "normal",
      connectorEndpoint: "none",
      lane: null,
    },
    relationChanges: [],
    evidenceIds: [],
    ...(request.tags.length
      ? {
          tags: request.tags
            .map((label) => label.trim())
            .filter(Boolean)
            .map((label) => ({ label: label.slice(0, 80) })),
        }
      : {}),
  };

  const relationship: AuthoringRelationship<TExtent> = {
    id: dependencies.newId("relationship"),
    subjectId: subject.id,
    objectId: object.id,
    predicate: predicate.slice(0, 120),
    placeId: place.id,
    itemIds: [itemId],
    initialState: "active",
    time: request.time.extent,
    sourceIds: [],
    confidence: null,
    attributes: {},
  };

  const duplicate = dependencies.findDuplicateRelationship(
    relationship,
    draft.relationships,
    relationship.id,
  );
  if (duplicate) {
    throw new Error(
      `This occurrence duplicates canonical relationship “${duplicate.id}”. Edit or enrich the existing fact instead.`,
    );
  }

  const mirrored = dependencies.findMirroredRelationship(
    relationship,
    draft.relationships,
    relationship.id,
  );
  if (mirrored) {
    throw new Error(
      `A reverse copy of this action already exists as “${mirrored.id}”. Use a different action only when the reverse fact is genuinely distinct.`,
    );
  }

  draft.items.push(item);
  draft.relationships.push(relationship);

  const activeStory = request.activeStoryId
    ? draft.stories.find((story) => story.id === request.activeStoryId)
    : null;
  if (activeStory && !activeStory.itemIds.includes(itemId)) {
    activeStory.itemIds = [...activeStory.itemIds, itemId];
  }

  return {
    state: dependencies.normalizeState(draft),
    itemId,
    relationshipId: relationship.id,
    subjectId: subject.id,
    objectId: object.id,
    placeId: place.id,
    categoryId: category.id,
  };
}


function itemRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function itemIdOf(value: unknown): string {
  const record = itemRecord(value);
  const id = record?.["id"];
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
}

type OccurrenceSemanticReviewReason =
  | "subject-changed"
  | "object-changed"
  | "predicate-changed"
  | "place-changed"
  | "time-changed";

function relationshipHasSemanticSupport(
  relationship: AuthoringRelationship,
  items: readonly unknown[],
  linkedItemIds: readonly string[],
): boolean {
  if ((relationship.sourceIds ?? []).length > 0) return true;
  if (relationship.confidence !== null && relationship.confidence !== undefined) return true;
  if ((relationship.semanticMappings ?? []).length > 0) return true;
  if (Boolean(relationship.role?.trim()) || Boolean(relationship.occurrenceType?.trim())) return true;
  if (relationship.subjectContext || relationship.objectContext) return true;
  return linkedItemIds.some((itemId) => {
    const item = items.find((candidate) => itemIdOf(candidate) === itemId);
    const record = itemRecord(item);
    const evidenceIds = record?.["evidenceIds"];
    return Array.isArray(evidenceIds) && evidenceIds.length > 0;
  });
}

function semanticReviewReasons(
  attributes: Record<string, unknown> | undefined,
): OccurrenceSemanticReviewReason[] {
  const review = itemRecord(attributes?.["semanticReview"]);
  const reasons = Array.isArray(review?.["reasons"]) ? review!["reasons"] : [];
  return reasons.filter(
    (reason): reason is OccurrenceSemanticReviewReason =>
      reason === "subject-changed" ||
      reason === "object-changed" ||
      reason === "predicate-changed" ||
      reason === "place-changed" ||
      reason === "time-changed",
  );
}

function markSemanticReview(
  relationship: AuthoringRelationship,
  reasons: readonly OccurrenceSemanticReviewReason[],
): void {
  if (!reasons.length) return;
  const mergedReasons = [...new Set([...semanticReviewReasons(relationship.attributes), ...reasons])];
  relationship.attributes = {
    ...(relationship.attributes ?? {}),
    semanticReview: {
      required: true,
      reasons: mergedReasons,
    },
  };
}

function derivedRelationshipTitle(
  state: Pick<OccurrenceAuthoringState, "entities">,
  relationship: Pick<AuthoringRelationship, "subjectId" | "predicate" | "objectId">,
): string {
  const subject =
    state.entities.find((entity) => entity.id === relationship.subjectId)?.name ??
    relationship.subjectId;
  const object =
    state.entities.find((entity) => entity.id === relationship.objectId)?.name ??
    relationship.objectId;
  return `${subject} ${relationship.predicate} ${object}`.slice(0, 160);
}

export function updateOccurrence<TExtent, TState extends OccurrenceAuthoringState<TExtent>>(
  state: TState,
  request: OccurrenceUpdateRequest<TExtent>,
  dependencies: OccurrenceAuthoringDependencies<TExtent, TState>,
): OccurrenceAuthoringResult<TState> {
  const relationshipId = request.relationshipId.trim();
  const predicate = request.predicate?.trim() || "";
  if (!relationshipId) throw new Error("An occurrence edit target is required.");
  if (!request.subject || !request.object || !predicate) {
    throw new Error("Complete subject, action, and object before committing.");
  }

  const predicateValidation = dependencies.validatePredicate(predicate);
  if (!predicateValidation.valid) {
    throw new Error(predicateValidation.message || "The action predicate is invalid.");
  }

  const draft = dependencies.cloneState(state);
  const existingIndex = draft.relationships.findIndex(
    (relationship) => relationship.id === relationshipId,
  );
  if (existingIndex < 0) {
    throw new Error(`Occurrence “${relationshipId}” no longer exists.`);
  }
  const existing = draft.relationships[existingIndex]!;
  const oldTitle = derivedRelationshipTitle(draft, existing);

  const subject = resolveEntity(request.subject, draft, dependencies);
  const object = resolveEntity(request.object, draft, dependencies);
  if (subject.id === object.id) {
    throw new Error("An occurrence must connect two different entities.");
  }

  const nextPredicate = predicate.slice(0, 120);
  const subjectChanged = existing.subjectId !== subject.id;
  const objectChanged = existing.objectId !== object.id;
  const predicateChanged = existing.predicate !== nextPredicate;
  const next: AuthoringRelationship<TExtent> = {
    ...existing,
    subjectId: subject.id,
    objectId: object.id,
    predicate: nextPredicate,
  };
  if (subjectChanged) delete next.subjectContext;
  if (objectChanged) delete next.objectContext;

  if (request.placeName !== undefined) {
    if (request.placeName === null) {
      delete next.placeId;
    } else {
      const place = resolvePlace(
        {
          placeName: request.placeName,
          longitude: request.longitude,
          latitude: request.latitude,
          accuracyMeters: request.accuracyMeters,
        },
        draft,
        dependencies,
      );
      next.placeId = place.id;
    }
  }

  if (request.time !== undefined) {
    next.time = request.time?.extent ?? null;
  }

  const duplicate = dependencies.findDuplicateRelationship(
    next,
    draft.relationships,
    relationshipId,
  );
  if (duplicate) {
    throw new Error(
      `This edit would duplicate canonical relationship “${duplicate.id}”. Keep one canonical fact and enrich it instead.`,
    );
  }
  const mirrored = dependencies.findMirroredRelationship(
    next,
    draft.relationships,
    relationshipId,
  );
  if (mirrored) {
    throw new Error(
      `This edit would duplicate the reverse action represented by “${mirrored.id}”.`,
    );
  }

  draft.relationships[existingIndex] = next;

  const linkedItemIds = [...new Set((existing.itemIds ?? []).map(String).filter(Boolean))];
  const reviewReasons: OccurrenceSemanticReviewReason[] = [];
  if (subjectChanged) reviewReasons.push("subject-changed");
  if (objectChanged) reviewReasons.push("object-changed");
  if (predicateChanged) reviewReasons.push("predicate-changed");
  if ((existing.placeId ?? "") !== (next.placeId ?? "")) reviewReasons.push("place-changed");
  if (
    request.time !== undefined &&
    JSON.stringify(existing.time ?? null) !== JSON.stringify(next.time ?? null)
  ) {
    reviewReasons.push("time-changed");
  }
  const requiresSemanticReview =
    reviewReasons.length > 0 &&
    relationshipHasSemanticSupport(existing, draft.items, linkedItemIds);
  if (requiresSemanticReview) {
    next.confidence = null;
    markSemanticReview(next, reviewReasons);
  }

  const requestedItemId = request.itemId?.trim() || "";
  if (requestedItemId && !linkedItemIds.includes(requestedItemId)) {
    throw new Error(
      `Chronology item “${requestedItemId}” is not linked to occurrence “${relationshipId}”.`,
    );
  }
  const exactItemId =
    requestedItemId || (linkedItemIds.length === 1 ? linkedItemIds[0]! : "");

  // Relationship endpoint/action edits affect every linked chronology projection.
  // Update only titles that are still mechanically derived from the old fact;
  // custom editorial titles remain untouched.
  const nextDerivedTitle = derivedRelationshipTitle(draft, next);
  for (const linkedItemId of linkedItemIds) {
    const linkedIndex = draft.items.findIndex((item) => itemIdOf(item) === linkedItemId);
    if (linkedIndex < 0) continue;
    const linkedRecord = itemRecord(draft.items[linkedIndex]);
    if (!linkedRecord) continue;
    const title = typeof linkedRecord["title"] === "string" ? linkedRecord["title"] : "";
    if (!title || title === oldTitle) {
      draft.items[linkedIndex] = { ...linkedRecord, title: nextDerivedTitle };
    }
  }

  const itemScopedContextChanged =
    request.categoryName !== undefined || request.tags !== undefined;
  if (itemScopedContextChanged && linkedItemIds.length > 1 && !exactItemId) {
    throw new Error(
      "This occurrence is linked to multiple chronology items. Focus the exact timeline item before editing category or tags.",
    );
  }
  if (itemScopedContextChanged && linkedItemIds.length === 0) {
    throw new Error(
      "This occurrence has no linked chronology item. Category and tags require an exact timeline item.",
    );
  }
  if (request.time === null && linkedItemIds.length > 0) {
    throw new Error(
      "A linked chronology item requires time. Unlink every timeline item before making the canonical relationship timeless.",
    );
  }

  if (request.time) {
    for (const linkedItemId of linkedItemIds) {
      const linkedIndex = draft.items.findIndex((item) => itemIdOf(item) === linkedItemId);
      if (linkedIndex < 0) {
        throw new Error(
          `Chronology item “${linkedItemId}” linked to occurrence “${relationshipId}” no longer exists.`,
        );
      }
      const linkedRecord = itemRecord(draft.items[linkedIndex]);
      if (!linkedRecord) {
        throw new Error(`Chronology item “${linkedItemId}” is invalid.`);
      }
      draft.items[linkedIndex] = {
        ...linkedRecord,
        kind: request.time.kind,
        start: request.time.startValue,
        end: request.time.endValue,
        time: request.time.extent,
      };
    }
  }

  let categoryId = "";
  const itemId = exactItemId;
  if (exactItemId) {
    const itemIndex = draft.items.findIndex((item) => itemIdOf(item) === exactItemId);
    if (itemIndex < 0) {
      throw new Error(`Chronology item “${exactItemId}” no longer exists.`);
    }
    const currentItem = itemRecord(draft.items[itemIndex]);
    if (!currentItem) {
      throw new Error(`Chronology item “${exactItemId}” is invalid.`);
    }
    const updatedItem: Record<string, unknown> = { ...currentItem };

    if (request.categoryName !== undefined) {
      if (request.categoryName === null || !request.categoryName.trim()) {
        throw new Error("Timeline items require a category. Choose another category instead.");
      }
      const category = resolveCategory(request.categoryName, draft, dependencies);
      updatedItem["categoryId"] = category.id;
      categoryId = category.id;
    } else if (typeof currentItem["categoryId"] === "string") {
      categoryId = currentItem["categoryId"];
    }

    if (request.tags !== undefined) {
      updatedItem["tags"] = request.tags
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => ({ label: label.slice(0, 80) }));
    }

    draft.items[itemIndex] = updatedItem;
  }

  if (!categoryId) {
    const linkedItem = linkedItemIds
      .map((id) => draft.items.find((item) => itemIdOf(item) === id))
      .map(itemRecord)
      .find(Boolean);
    categoryId =
      linkedItem && typeof linkedItem["categoryId"] === "string"
        ? linkedItem["categoryId"]
        : draft.categories[0]?.id ?? "";
  }

  return {
    state: dependencies.normalizeState(draft),
    itemId,
    relationshipId,
    subjectId: subject.id,
    objectId: object.id,
    placeId: next.placeId ?? "",
    categoryId,
    ...(requiresSemanticReview
      ? {
          semanticReviewRequired: true,
          semanticReviewReasons: Object.freeze([...reviewReasons]),
        }
      : {}),
  };
}
