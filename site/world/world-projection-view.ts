import type { CanonicalSpatialGeometry } from "../../src/domain/geotemporal.ts";
import { validateSpatialGeometry } from "../../src/domain/geotemporal.ts";
import type { CanonicalOccurrenceId, EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import { entityId, occurrenceId, placeId, relationshipId } from "../../src/domain/ids.ts";
import type { CanonicalOccurrence, CanonicalOccurrenceParticipant } from "../../src/domain/occurrence.ts";
import type {
  CanonicalRelationship,
  CanonicalTemporalExtent,
} from "../../src/domain/relationship.ts";
import {
  SpatialAnchorIndex,
  type SpatialPlaceRecord,
} from "../../src/projection/spatial-anchor-index.ts";
import { occurrenceViewportWeight } from "../../src/projection/spatiotemporal-projection.ts";
import {
  projectCanonicalOccurrences,
  type CanonicalProjectedOccurrence,
} from "../../src/projection/canonical-occurrence-projection.ts";
import {
  createTemporalOccurrenceIndex,
  type TemporalOccurrenceIndex,
} from "../../src/projection/temporal-occurrence-index.ts";
import {
  projectCanonicalWorldOccurrences,
  type WorldEntityPresentation,
} from "../../src/projection/world-occurrence-projection.ts";
import type { WorldProjection } from "../../src/projection/world-projection.ts";
import {
  mergeOccurrenceNodeSemanticStyle,
  occurrenceNodeSemanticStyle,
  type OccurrenceNodeSemanticStyle,
} from "../../src/presentation/occurrence-semantic-color.ts";
import {
  canonicalSemanticHueColor,
  normalizeSemanticColorSource,
} from "../../src/presentation/semantic-color.ts";
import { TimelineTemporal } from "../temporal-standards.ts";

export interface WorldProjectionRuntime {
  setProjection(projection: WorldProjection): void;
  setTemporalWindow(window: WorldViewViewport): void;
  setContextRelationships?(ids: readonly RelationshipId[]): void;
  focusEntity(id: EntityId): void;
  focusOccurrence(id: CanonicalOccurrenceId): void;
  focusPlace(id: PlaceId): void;
  fitToContent(): boolean;
  zoomToContent(): boolean;
  refresh(): void;
  getRenderProjection(): WorldProjection | null;
  destroy(): void;
}

interface InputEntity {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly type?: unknown;
  readonly attributes?: unknown;
}

interface InputPlace {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly geometry?: unknown;
  readonly accuracyMeters?: unknown;
  readonly icon?: unknown;
  readonly markerShape?: unknown;
  readonly marker?: unknown;
  readonly style?: unknown;
  readonly mapStyle?: unknown;
  readonly attributes?: unknown;
}

interface InputRelationship {
  readonly id?: unknown;
  readonly subjectId?: unknown;
  readonly objectId?: unknown;
  readonly predicate?: unknown;
  readonly role?: unknown;
  readonly placeId?: unknown;
  readonly itemIds?: unknown;
  readonly time?: unknown;
  readonly confidence?: unknown;
  readonly attributes?: unknown;
}

interface InputOccurrence {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly occurrenceType?: unknown;
  readonly time?: unknown;
  readonly placeId?: unknown;
  readonly participantContexts?: unknown;
  readonly relationshipIds?: unknown;
  readonly confidence?: unknown;
  readonly attributes?: unknown;
}

interface InputCategory {
  readonly id?: unknown;
  readonly color?: unknown;
  readonly hue?: unknown;
}

interface InputItem {
  readonly id?: unknown;
  readonly categoryId?: unknown;
  readonly categoryIds?: unknown;
  readonly tags?: unknown;
}

export interface WorldViewModel {
  readonly entities?: readonly InputEntity[];
  readonly places?: readonly InputPlace[];
  readonly relationships?: readonly InputRelationship[];
  readonly occurrences?: readonly InputOccurrence[];
  readonly categories?: readonly InputCategory[];
  readonly items?: readonly InputItem[];
}

export interface WorldViewViewport {
  readonly start: number;
  readonly end: number;
  /**
   * The canonical logically-active occurrence set published by the
   * authoritative temporal viewport (TimelineSurface). IDs may identify a
   * standalone occurrence or a relationship-derived occurrence. When present it is
   * consumed verbatim: an empty array means nothing is active. When absent the
   * world falls back to its own standalone temporal query.
   */
  readonly activeOccurrenceIds?: readonly string[];
}

interface WorldTemporalWindow {
  readonly start: number;
  readonly end: number;
}


function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map(text).filter(Boolean));
}

function itemNodeSemanticStyle(
  item: InputItem,
  categoryColors: ReadonlyMap<string, string>,
): OccurrenceNodeSemanticStyle | null {
  const categoryIds = [
    text(item.categoryId),
    ...stringList(item.categoryIds),
  ].filter((id, index, values) => Boolean(id) && values.indexOf(id) === index);
  const categorySemanticColors = categoryIds
    .map((id) => categoryColors.get(id) ?? "")
    .filter(Boolean);
  const tagSemanticColors = (Array.isArray(item.tags) ? item.tags : [])
    .map((tag) => {
      if (!isRecord(tag)) return null;
      const color = normalizeSemanticColorSource(tag["color"]);
      if (color !== null) return color;
      const hue = Number(tag["hue"]);
      return Number.isFinite(hue) ? hue : null;
    })
    .filter((value) => value !== null);
  return occurrenceNodeSemanticStyle(categorySemanticColors, tagSemanticColors);
}

function addSemanticStyleConsensus(
  target: Map<EntityId, OccurrenceNodeSemanticStyle | null>,
  entity: EntityId,
  incoming: OccurrenceNodeSemanticStyle,
): void {
  if (!target.has(entity)) {
    target.set(entity, incoming);
    return;
  }
  const current = target.get(entity);
  if (
    current &&
    current.fillColor === incoming.fillColor &&
    current.borderColor === incoming.borderColor
  ) {
    return;
  }
  target.set(entity, null);
}

function canonicalGeometry(value: unknown): CanonicalSpatialGeometry | null {
  if (validateSpatialGeometry(value).length > 0) return null;
  return value as CanonicalSpatialGeometry;
}

function temporalEndpoint(value: unknown): Readonly<Record<string, unknown>> | null {
  if (value === null || value === undefined) return null;
  return isRecord(value) ? Object.freeze({ ...value }) : null;
}

function canonicalTime(value: unknown): CanonicalTemporalExtent | null {
  if (!isRecord(value)) return null;
  const declaredType = value.type;
  const type =
    declaredType === "instant" || declaredType === "interval"
      ? declaredType
      : value.end !== undefined && value.end !== null
        ? "interval"
        : "instant";

  const start = temporalEndpoint(value.start);
  const openStart = value.openStart === true;
  const openEnd = value.openEnd === true;

  if (type === "instant") {
    return Object.freeze({
      type,
      start,
      ...(openStart ? { openStart: true } : {}),
      ...(openEnd ? { openEnd: true } : {}),
    });
  }

  const end = temporalEndpoint(value.end);
  return Object.freeze({
    type,
    start,
    end,
    ...(openStart ? { openStart: true } : {}),
    ...(openEnd ? { openEnd: true } : {}),
  });
}

function precisionRadius(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function confidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

function placePresentationStyle(raw: InputPlace): Readonly<Record<string, unknown>> | undefined {
  const attributes = isRecord(raw.attributes) ? raw.attributes : {};
  const attributeStyle = isRecord(attributes.style) ? attributes.style : {};
  const mapStyle = isRecord(raw.mapStyle) ? raw.mapStyle : {};
  const directStyle = isRecord(raw.style) ? raw.style : {};
  const directMarker = isRecord(raw.marker) ? raw.marker : {};
  const marker = Object.freeze({
    ...(isRecord(attributeStyle.marker) ? attributeStyle.marker : {}),
    ...directMarker,
    ...(isRecord(mapStyle.marker) ? mapStyle.marker : {}),
    ...(isRecord(directStyle.marker) ? directStyle.marker : {}),
  });
  const icon = text(raw.icon) || text(directMarker.icon) || text(attributes.icon);
  const markerShape =
    text(raw.markerShape) || text(directMarker.shape) || text(attributes.markerShape);
  const resolvedMarker =
    Object.keys(marker).length > 0 || icon || markerShape
      ? Object.freeze({
          ...marker,
          ...(icon ? { icon } : {}),
          ...(markerShape ? { shape: markerShape } : {}),
        })
      : undefined;
  const style = {
    ...attributeStyle,
    ...mapStyle,
    ...directStyle,
    ...(resolvedMarker ? { marker: resolvedMarker } : {}),
  };
  return Object.keys(style).length > 0 ? Object.freeze(style) : undefined;
}

function canonicalPlaces(input: readonly InputPlace[]): readonly SpatialPlaceRecord[] {
  const result: SpatialPlaceRecord[] = [];

  for (const raw of input) {
    const id = text(raw.id);
    const geometry = canonicalGeometry(raw.geometry);
    if (!id || !geometry) continue;

    const radius = precisionRadius(raw.accuracyMeters);
    const style = placePresentationStyle(raw);
    result.push(
      Object.freeze({
        id: placeId(id),
        ...(text(raw.name) ? { label: text(raw.name) } : {}),
        geometry,
        ...(radius === undefined ? {} : { precisionRadiusMeters: radius }),
        ...(style === undefined ? {} : { style }),
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) => String(left.id).localeCompare(String(right.id))),
  );
}

function canonicalRelationships(
  input: readonly InputRelationship[],
  entityIds: ReadonlySet<string>,
  renderablePlaceIds: ReadonlySet<string>,
  categoryColorByRelationshipId: ReadonlyMap<string, string> = new Map(),
): readonly CanonicalRelationship[] {
  const result: CanonicalRelationship[] = [];

  for (const raw of input) {
    const id = text(raw.id);
    const subject = text(raw.subjectId);
    const object = text(raw.objectId);
    const predicate = text(raw.predicate);
    if (!id || !subject || !object || !predicate) continue;
    if (!entityIds.has(subject) || !entityIds.has(object) || subject === object) continue;

    const rawPlaceId = text(raw.placeId);
    const attributes: Record<string, unknown> = isRecord(raw.attributes)
      ? { ...raw.attributes }
      : {};
    const categoryColor = categoryColorByRelationshipId.get(id);
    if (categoryColor) {
      const style: Record<string, unknown> = isRecord(attributes.style)
        ? { ...attributes.style }
        : {};
      style.categoryColor = categoryColor;
      attributes.style = Object.freeze(style);
    }
    result.push(
      Object.freeze({
        id: relationshipId(id),
        subjectId: entityId(subject),
        objectId: entityId(object),
        predicate,
        ...(text(raw.role) ? { role: text(raw.role) } : {}),
        ...(rawPlaceId && renderablePlaceIds.has(rawPlaceId)
          ? { placeId: placeId(rawPlaceId) }
          : {}),
        itemIds: Object.freeze([]),
        sourceIds: Object.freeze([]),
        confidence: confidence(raw.confidence),
        time: canonicalTime(raw.time),
        attributes: Object.freeze(attributes),
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) => String(left.id).localeCompare(String(right.id))),
  );
}

function canonicalOccurrences(
  input: readonly InputOccurrence[],
  entityIds: ReadonlySet<string>,
  relationshipIds: ReadonlySet<string>,
  renderablePlaceIds: ReadonlySet<string>,
): readonly CanonicalOccurrence[] {
  const result: CanonicalOccurrence[] = [];

  for (const raw of input) {
    const id = text(raw.id);
    if (!id) continue;

    const participantContexts = (Array.isArray(raw.participantContexts)
      ? raw.participantContexts
      : []
    )
      .map((value) => {
        if (!isRecord(value)) return null;
        const participantId = text(value["entityId"]);
        if (!participantId || !entityIds.has(participantId)) return null;
        const representedEntityId = text(value["representedEntityId"]);
        const organizationId = text(value["organizationId"]);
        const roleType = text(value["roleType"]);
        return Object.freeze({
          entityId: entityId(participantId),
          ...(roleType ? { roleType } : {}),
          ...(representedEntityId && entityIds.has(representedEntityId)
            ? { representedEntityId: entityId(representedEntityId) }
            : {}),
          ...(organizationId && entityIds.has(organizationId)
            ? { organizationId: entityId(organizationId) }
            : {}),
        });
      })
      .filter((value): value is CanonicalOccurrenceParticipant => value !== null);

    const linkedRelationshipIds = stringList(raw.relationshipIds)
      .filter((id) => relationshipIds.has(id))
      .map(relationshipId);

    if (participantContexts.length === 0 && linkedRelationshipIds.length === 0) continue;

    const rawPlaceId = text(raw.placeId);
    const attributes = isRecord(raw.attributes)
      ? Object.freeze({ ...raw.attributes })
      : Object.freeze({});
    result.push(
      Object.freeze({
        id: occurrenceId(id),
        ...(text(raw.title) ? { title: text(raw.title) } : {}),
        ...(text(raw.occurrenceType) ? { occurrenceType: text(raw.occurrenceType) } : {}),
        time: canonicalTime(raw.time),
        ...(rawPlaceId && renderablePlaceIds.has(rawPlaceId)
          ? { placeId: placeId(rawPlaceId) }
          : {}),
        participantContexts: Object.freeze(participantContexts),
        relationshipIds: Object.freeze(linkedRelationshipIds),
        sourceIds: Object.freeze([]),
        confidence: confidence(raw.confidence),
        attributes,
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) => String(left.id).localeCompare(String(right.id))),
  );
}

export class WorldProjectionView {
  readonly #runtime: WorldProjectionRuntime;

  #relationships: readonly CanonicalRelationship[] = Object.freeze([]);
  #relationshipById = new Map<RelationshipId, CanonicalRelationship>();
  #occurrences: readonly CanonicalOccurrence[] = Object.freeze([]);
  #occurrenceByStringId = new Map<string, CanonicalOccurrence>();
  #spatialAnchors = new SpatialAnchorIndex([], []);
  #temporalIndex: TemporalOccurrenceIndex<CanonicalProjectedOccurrence> =
    createTemporalOccurrenceIndex<CanonicalProjectedOccurrence>([]);
  #timedById: ReadonlyMap<string, CanonicalProjectedOccurrence> = new Map();
  #timelessIds: readonly CanonicalOccurrenceId[] = Object.freeze([]);
  #viewport: WorldTemporalWindow | null = null;
  #sharedActiveIds: readonly string[] | null = null;
  #focusId: string | null = null;
  #presentationMode = false;
  #entityIds = new Set<string>();
  #entityPresentation = new Map<EntityId, WorldEntityPresentation>();
  #nodeSemanticStyleByRelationshipId = new Map<RelationshipId, OccurrenceNodeSemanticStyle>();
  #placeIds = new Set<string>();
  #relationshipIdsByItem = new Map<string, readonly RelationshipId[]>();

  constructor(runtime: WorldProjectionRuntime) {
    this.#runtime = runtime;
  }

  setModel(model: WorldViewModel): void {
    const entities = Array.isArray(model.entities) ? model.entities : [];
    const places = canonicalPlaces(Array.isArray(model.places) ? model.places : []);

    this.#entityIds = new Set(entities.map((entity) => text(entity.id)).filter(Boolean));
    this.#entityPresentation = new Map(
      entities
        .map((entity) => {
          const id = text(entity.id);
          if (!id) return null;
          const label = text(entity.name);
          const kind = text(entity.type);
          const style = isRecord(entity.attributes) ? entity.attributes.style : undefined;
          return [
            entityId(id),
            Object.freeze({
              ...(label ? { label } : {}),
              ...(kind ? { kind } : {}),
              ...(isRecord(style) ? { style: Object.freeze({ ...style }) } : {}),
            }),
          ] as const;
        })
        .filter((entry): entry is readonly [EntityId, WorldEntityPresentation] => entry !== null),
    );
    this.#placeIds = new Set(places.map((place) => String(place.id)));

    const categories = Array.isArray(model.categories) ? model.categories : [];
    const items = Array.isArray(model.items) ? model.items : [];
    const categoryColors = new Map(
      categories
        .map((category) => {
          const id = text(category.id);
          const source = normalizeSemanticColorSource(category.color);
          const hue = Number(category.hue);
          const color =
            source !== null
              ? typeof source === "number"
                ? canonicalSemanticHueColor(source)
                : source
              : Number.isFinite(hue)
                ? canonicalSemanticHueColor(hue)
                : "";
          return [id, color] as const;
        })
        .filter(([id, color]) => Boolean(id && color)),
    );
    const itemCategoryColors = new Map(
      items
        .map((item) => {
          const id = text(item.id);
          const categoryId = text(item.categoryId) || stringList(item.categoryIds)[0] || "";
          const categoryColor = categoryColors.get(categoryId) ?? "";
          return [id, categoryColor] as const;
        })
        .filter(([id, color]) => Boolean(id && color)),
    );
    const itemNodeSemanticStyles = new Map(
      items
        .map((item) => {
          const id = text(item.id);
          const style = itemNodeSemanticStyle(item, categoryColors);
          return style && id ? ([id, style] as const) : null;
        })
        .filter(
          (entry): entry is readonly [string, OccurrenceNodeSemanticStyle] => entry !== null,
        ),
    );
    const categoryColorByRelationshipId = new Map<string, string>();
    const nodeSemanticStyleByRelationshipId = new Map<RelationshipId, OccurrenceNodeSemanticStyle>();
    for (const relationship of Array.isArray(model.relationships) ? model.relationships : []) {
      const id = text(relationship.id);
      if (!id || !Array.isArray(relationship.itemIds)) continue;
      for (const itemIdValue of relationship.itemIds) {
        const itemId = text(itemIdValue);
        const categoryColor = itemCategoryColors.get(itemId);
        if (categoryColor && !categoryColorByRelationshipId.has(id)) {
          categoryColorByRelationshipId.set(id, categoryColor);
        }
        const semanticStyle = itemNodeSemanticStyles.get(itemId);
        if (semanticStyle && !nodeSemanticStyleByRelationshipId.has(relationshipId(id))) {
          nodeSemanticStyleByRelationshipId.set(relationshipId(id), semanticStyle);
        }
        if (
          categoryColorByRelationshipId.has(id) &&
          nodeSemanticStyleByRelationshipId.has(relationshipId(id))
        ) {
          break;
        }
      }
    }
    this.#nodeSemanticStyleByRelationshipId = nodeSemanticStyleByRelationshipId;

    const relationshipIdsByItem = new Map<string, RelationshipId[]>();
    for (const raw of Array.isArray(model.relationships) ? model.relationships : []) {
      const rawId = text(raw.id);
      if (!rawId || !Array.isArray(raw.itemIds)) continue;
      const canonicalId = relationshipId(rawId);
      for (const rawItemId of raw.itemIds) {
        const itemId = text(rawItemId);
        if (!itemId) continue;
        const ids = relationshipIdsByItem.get(itemId) ?? [];
        ids.push(canonicalId);
        relationshipIdsByItem.set(itemId, ids);
      }
    }
    this.#relationshipIdsByItem = new Map(
      [...relationshipIdsByItem].map(
        ([itemId, ids]) =>
          [
            itemId,
            Object.freeze(
              [...new Set(ids)].sort((left, right) => String(left).localeCompare(String(right))),
            ),
          ] as const,
      ),
    );

    this.#relationships = canonicalRelationships(
      Array.isArray(model.relationships) ? model.relationships : [],
      this.#entityIds,
      this.#placeIds,
      categoryColorByRelationshipId,
    );
    this.#relationshipById = new Map(
      this.#relationships.map((relationship) => [relationship.id, relationship] as const),
    );
    this.#occurrences = canonicalOccurrences(
      Array.isArray(model.occurrences) ? model.occurrences : [],
      this.#entityIds,
      new Set(this.#relationships.map((relationship) => String(relationship.id))),
      this.#placeIds,
    );
    this.#occurrenceByStringId = new Map(
      this.#occurrences.map((occurrence) => [String(occurrence.id), occurrence] as const),
    );
    this.#spatialAnchors = new SpatialAnchorIndex(
      places,
      this.#relationships,
      this.#occurrences,
    );

    const projected = projectCanonicalOccurrences(
      {
        schemaVersion: 3,
        entities: [],
        relationships: this.#relationships,
        occurrences: this.#occurrences,
      },
      (endpoint) => TimelineTemporal.sortKey(endpoint),
    );
    this.#temporalIndex = createTemporalOccurrenceIndex(projected);
    this.#timedById = new Map(
      projected.map((occurrence) => [String(occurrence.id), occurrence] as const),
    );

    const groupedRelationshipIds = new Set(
      this.#occurrences.flatMap((occurrence) =>
        occurrence.relationshipIds.map((id) => String(id)),
      ),
    );
    const projectedIds = new Set(projected.map((occurrence) => String(occurrence.id)));
    const timelessStandaloneIds = this.#occurrences
      .filter(
        (occurrence) =>
          !projectedIds.has(String(occurrence.id)) &&
          occurrence.time === null &&
          !occurrence.relationshipIds.some((id) => projectedIds.has(String(id))),
      )
      .map((occurrence) => occurrence.id);
    this.#timelessIds = Object.freeze(
      [
        ...timelessStandaloneIds,
        ...this.#relationships
          .filter(
            (relationship) =>
              relationship.time === null &&
              !groupedRelationshipIds.has(String(relationship.id)),
          )
          .map((relationship) => relationship.id),
      ].sort((left, right) => String(left).localeCompare(String(right))),
    );
    this.#render();
  }

  /**
   * Applies the shared temporal window. Returns false, without re-rendering,
   * when the window and active set are unchanged: the timeline re-publishes
   * its committed viewport after every settled gesture, including taps.
   */
  previewWindow(viewport: WorldViewViewport | null): void {
    const next =
      viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? Object.freeze({ start: viewport.start, end: viewport.end })
        : null;
    if (next) this.#runtime.setTemporalWindow(next);
  }

  setWindow(viewport: WorldViewViewport | null): boolean {
    const next =
      viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? Object.freeze({ start: viewport.start, end: viewport.end })
        : null;
    const nextActiveIds = Array.isArray(viewport?.activeOccurrenceIds)
      ? Object.freeze(viewport.activeOccurrenceIds.map(String))
      : null;
    const previous = this.#viewport;
    const previousActiveIds = this.#sharedActiveIds;
    if (
      previous?.start === next?.start &&
      previous?.end === next?.end &&
      (previousActiveIds === nextActiveIds ||
        (previousActiveIds !== null &&
          nextActiveIds !== null &&
          previousActiveIds.length === nextActiveIds.length &&
          previousActiveIds.every((id, index) => id === nextActiveIds[index])))
    ) {
      return false;
    }
    this.#viewport = next;
    this.#sharedActiveIds = nextActiveIds;
    this.#render();
    return true;
  }

  setFocus(id: string | number | null): void {
    const next = id === null || id === undefined ? null : String(id);
    if (next === this.#focusId) return;
    const previousContextual = Boolean(
      this.#focusId && this.#relationshipIdsByItem.has(this.#focusId),
    );
    const nextContextual = Boolean(next && this.#relationshipIdsByItem.has(next));
    this.#focusId = next;
    if (previousContextual || nextContextual) this.#render();
    else this.#focusCurrent();
  }

  setPresentationMode(active: boolean): void {
    this.#presentationMode = Boolean(active);
  }

  hasContext(): boolean {
    const projection = this.#runtime.getRenderProjection();
    if (!this.#focusId || !projection) return false;
    if (this.#relationshipIdsByItem.has(this.#focusId)) {
      return projection.instances.length > 0 && projection.edges.length > 0;
    }
    return (
      projection.edges.some((edge) => String(edge.id) === this.#focusId) ||
      projection.instances.some(
        (instance) =>
          String(instance.canonicalId) === this.#focusId ||
          instance.occurrenceIds?.some((id) => String(id) === this.#focusId),
      )
    );
  }

  fitContext(): boolean {
    if (!this.hasContext()) return false;
    return this.#runtime.fitToContent();
  }

  zoomContext(): boolean {
    if (!this.hasContext()) return false;
    return this.#runtime.zoomToContent();
  }

  refreshLayout(): void {
    this.#runtime.refresh();
  }

  isPresentationMode(): boolean {
    return this.#presentationMode;
  }

  destroy(): void {
    this.#runtime.destroy();
  }

  #render(): void {
    const base = this.#sharedActiveIds
      ? this.#sharedActivation(this.#sharedActiveIds)
      : this.#standaloneActivation();
    const contextualIds = this.#focusId
      ? this.#relationshipIdsByItem.get(this.#focusId)
      : undefined;
    const contextualOccurrence = this.#focusId
      ? this.#occurrenceByStringId.get(this.#focusId)
      : undefined;
    const activeIds: readonly CanonicalOccurrenceId[] = contextualIds?.length
      ? contextualOccurrence
        ? Object.freeze([contextualOccurrence.id])
        : Object.freeze(contextualIds.filter((id) => this.#relationshipById.has(id)))
      : base.activeIds;
    const weights = contextualIds?.length
      ? new Map(activeIds.map((id) => [id, base.weights.get(id) ?? 1] as const))
      : base.weights;

    const projection = projectCanonicalWorldOccurrences(
      {
        relationships: this.#relationships,
        occurrences: this.#occurrences,
      },
      activeIds,
      this.#spatialAnchors,
      {
        entityPresentation: this.#entityPresentationFor(activeIds, contextualIds),
        temporalWeights: weights,
      },
    );

    this.#runtime.setProjection(projection);
    this.#runtime.setContextRelationships?.(contextualIds ?? Object.freeze([]));
    if (this.#viewport) this.#runtime.setTemporalWindow(this.#viewport);
    this.#focusCurrent();
  }

  #entityPresentationFor(
    activeIds: readonly CanonicalOccurrenceId[],
    contextualIds: readonly RelationshipId[] | undefined,
  ): ReadonlyMap<EntityId, WorldEntityPresentation> {
    const contextualSet = new Set(contextualIds ?? []);
    const contextualStyles = new Map<EntityId, OccurrenceNodeSemanticStyle | null>();
    const ambientStyles = new Map<EntityId, OccurrenceNodeSemanticStyle | null>();

    for (const id of activeIds) {
      const standalone = this.#occurrenceByStringId.get(String(id));
      const relationshipIds = standalone
        ? standalone.relationshipIds
        : this.#relationshipById.has(id as RelationshipId)
          ? [id as RelationshipId]
          : [];
      for (const relationshipId of relationshipIds) {
        const semanticStyle = this.#nodeSemanticStyleByRelationshipId.get(relationshipId);
        if (!semanticStyle) continue;
        const relationship = this.#relationshipById.get(relationshipId);
        if (!relationship) continue;
        const target = contextualSet.has(relationshipId) ? contextualStyles : ambientStyles;
        for (const entity of [relationship.subjectId, relationship.objectId]) {
          addSemanticStyleConsensus(target, entity, semanticStyle);
        }
      }
    }

    if (contextualStyles.size === 0 && ambientStyles.size === 0) {
      return this.#entityPresentation;
    }

    const result = new Map<EntityId, WorldEntityPresentation>();
    for (const [id, presentation] of this.#entityPresentation) {
      // Focused occurrence semantics outrank ambient context. Conflicts
      // deliberately resolve to null so the entity falls back to authored/type
      // presentation instead of choosing an arbitrary active occurrence hue.
      const inherited = contextualStyles.has(id)
        ? contextualStyles.get(id)
        : ambientStyles.get(id);
      if (!inherited) {
        result.set(id, presentation);
        continue;
      }
      const authored = presentation.style ?? {};
      const style = mergeOccurrenceNodeSemanticStyle(authored, inherited);
      result.set(id, Object.freeze({ ...presentation, style }));
    }
    return result;
  }

  #sharedActivation(ids: readonly string[]): {
    readonly activeIds: readonly CanonicalOccurrenceId[];
    readonly weights: ReadonlyMap<CanonicalOccurrenceId, number>;
  } {
    const activeIds = Object.freeze(
      ids
        .map((id): CanonicalOccurrenceId | null => {
          const standalone = this.#occurrenceByStringId.get(id);
          if (standalone) return standalone.id;
          const relationship = relationshipId(id);
          return this.#relationshipById.has(relationship) ? relationship : null;
        })
        .filter((id): id is CanonicalOccurrenceId => id !== null),
    );
    const weights = new Map<CanonicalOccurrenceId, number>();
    for (const id of activeIds) {
      const occurrence = this.#timedById.get(String(id));
      // Weight is presentation emphasis only; it never gates membership, so an
      // occurrence the shared set activates keeps a visible floor weight.
      const weight =
        occurrence && this.#viewport
          ? occurrenceViewportWeight(occurrence, { time: this.#viewport })
          : 1;
      weights.set(id, weight > 0 ? weight : 1);
    }
    return { activeIds, weights };
  }

  #standaloneActivation(): {
    readonly activeIds: readonly CanonicalOccurrenceId[];
    readonly weights: ReadonlyMap<CanonicalOccurrenceId, number>;
  } {
    const activeTimed = this.#viewport
      ? this.#temporalIndex.query({ time: this.#viewport })
      : this.#temporalIndex.query({
          time: { start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY },
        });

    const activeIds = Object.freeze<CanonicalOccurrenceId[]>([
      ...activeTimed.map((occurrence) => occurrence.id),
      ...this.#timelessIds,
    ]);

    const weights = new Map<CanonicalOccurrenceId, number>();
    if (this.#viewport) {
      for (const occurrence of activeTimed) {
        weights.set(occurrence.id, occurrenceViewportWeight(occurrence, { time: this.#viewport }));
      }
    }
    for (const id of this.#timelessIds) weights.set(id, 1);
    return { activeIds, weights };
  }

  #focusCurrent(): void {
    if (!this.#focusId) return;

    if (this.#entityIds.has(this.#focusId)) {
      this.#runtime.focusEntity(entityId(this.#focusId));
      return;
    }
    if (this.#placeIds.has(this.#focusId)) {
      this.#runtime.focusPlace(placeId(this.#focusId));
      return;
    }
    const standalone = this.#occurrenceByStringId.get(this.#focusId);
    if (standalone) {
      this.#runtime.focusOccurrence(standalone.id);
      return;
    }

    const focusedRelationshipId = relationshipId(this.#focusId);
    if (this.#relationshipById.has(focusedRelationshipId)) {
      this.#runtime.focusOccurrence(focusedRelationshipId);
    }
  }
}
