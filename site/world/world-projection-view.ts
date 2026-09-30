import type { CanonicalSpatialGeometry } from "../../src/domain/geotemporal.ts";
import { validateSpatialGeometry } from "../../src/domain/geotemporal.ts";
import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import { entityId, placeId, relationshipId } from "../../src/domain/ids.ts";
import type {
  CanonicalRelationship,
  CanonicalTemporalExtent,
} from "../../src/domain/relationship.ts";
import {
  SpatialAnchorIndex,
  type SpatialPlaceRecord,
} from "../../src/projection/spatial-anchor-index.ts";
import {
  occurrenceViewportWeight,
  type ProjectableOccurrence,
  relationshipOccurrenceExtent,
} from "../../src/projection/spatiotemporal-projection.ts";
import {
  createTemporalOccurrenceIndex,
  type TemporalOccurrenceIndex,
} from "../../src/projection/temporal-occurrence-index.ts";
import {
  projectWorldOccurrences,
  type WorldEntityPresentation,
} from "../../src/projection/world-occurrence-projection.ts";
import type { WorldProjection } from "../../src/projection/world-projection.ts";
import { canonicalSemanticHueColor } from "../../src/presentation/semantic-color.ts";
import { TimelineTemporal } from "../temporal-standards.ts";

export interface WorldProjectionRuntime {
  setProjection(projection: WorldProjection): void;
  setTemporalWindow(window: WorldViewViewport): void;
  setContextRelationships?(ids: readonly RelationshipId[]): void;
  focusEntity(id: EntityId): void;
  focusOccurrence(id: RelationshipId): void;
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

interface NodeSemanticStyle {
  readonly fillColor: string;
  readonly borderColor: string;
}

export interface WorldViewModel {
  readonly entities?: readonly InputEntity[];
  readonly places?: readonly InputPlace[];
  readonly relationships?: readonly InputRelationship[];
  readonly categories?: readonly InputCategory[];
  readonly items?: readonly InputItem[];
}

export interface WorldViewViewport {
  readonly start: number;
  readonly end: number;
  /**
   * The canonical logically-active relationship occurrence set published by
   * the authoritative temporal viewport (TimelineSurface). When present it is
   * consumed verbatim: an empty array means nothing is active. When absent the
   * world falls back to its own standalone temporal query.
   */
  readonly activeOccurrenceIds?: readonly string[];
}

interface WorldTemporalWindow {
  readonly start: number;
  readonly end: number;
}

interface IndexedRelationshipOccurrence extends ProjectableOccurrence {
  readonly id: RelationshipId;
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

function semanticTagColor(value: unknown): string {
  if (!isRecord(value)) return "";
  const authoredColor = text(value["color"]);
  if (authoredColor) return canonicalSemanticHueColor(authoredColor);
  const hue = Number(value["hue"]);
  return Number.isFinite(hue) ? canonicalSemanticHueColor(hue) : "";
}

function itemNodeSemanticStyle(
  item: InputItem,
  categoryColors: ReadonlyMap<string, string>,
): NodeSemanticStyle | null {
  const categoryIds = [
    text(item.categoryId),
    ...stringList(item.categoryIds),
  ].filter((id, index, values) => Boolean(id) && values.indexOf(id) === index);
  const categorySemanticColors = categoryIds
    .map((id) => categoryColors.get(id) ?? "")
    .filter(Boolean);
  const tagSemanticColors = (Array.isArray(item.tags) ? item.tags : [])
    .map(semanticTagColor)
    .filter(Boolean);

  const fillColor = categorySemanticColors[0] ?? tagSemanticColors[0] ?? "";
  if (!fillColor) return null;
  const borderColor = tagSemanticColors[0] ?? categorySemanticColors[1] ?? fillColor;
  return Object.freeze({ fillColor, borderColor });
}

function styleHasAny(
  style: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  return keys.some((key) => style[key] !== undefined && style[key] !== null && style[key] !== "");
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
  const type = value.type;
  if (type !== "instant" && type !== "interval") return null;

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

/**
 * Uses the same extent rule as TimelineSurface relationship bands, applied to
 * the raw input time so an untyped-but-dated relationship is timed in both
 * views rather than timeless in one of them.
 */
function indexedOccurrence(
  id: RelationshipId,
  rawTime: unknown,
): IndexedRelationshipOccurrence | null {
  const extent = relationshipOccurrenceExtent(rawTime, (endpoint) =>
    TimelineTemporal.sortKey(endpoint),
  );
  return extent ? Object.freeze({ id, start: extent.start, end: extent.end }) : null;
}

export class WorldProjectionView {
  readonly #runtime: WorldProjectionRuntime;

  #relationships: readonly CanonicalRelationship[] = Object.freeze([]);
  #spatialAnchors = new SpatialAnchorIndex([], []);
  #temporalIndex: TemporalOccurrenceIndex<IndexedRelationshipOccurrence> =
    createTemporalOccurrenceIndex<IndexedRelationshipOccurrence>([]);
  #timedById: ReadonlyMap<RelationshipId, IndexedRelationshipOccurrence> = new Map();
  #timelessIds: readonly RelationshipId[] = Object.freeze([]);
  #viewport: WorldTemporalWindow | null = null;
  #sharedActiveIds: readonly string[] | null = null;
  #focusId: string | null = null;
  #presentationMode = false;
  #entityIds = new Set<string>();
  #entityPresentation = new Map<EntityId, WorldEntityPresentation>();
  #nodeSemanticStyleByRelationshipId = new Map<RelationshipId, NodeSemanticStyle>();
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
          const authoredColor = text(category.color);
          const hue = Number(category.hue);
          const color =
            authoredColor || (Number.isFinite(hue) ? canonicalSemanticHueColor(hue) : "");
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
        .filter((entry): entry is readonly [string, NodeSemanticStyle] => entry !== null),
    );
    const categoryColorByRelationshipId = new Map<string, string>();
    const nodeSemanticStyleByRelationshipId = new Map<RelationshipId, NodeSemanticStyle>();
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
    this.#spatialAnchors = new SpatialAnchorIndex(places, this.#relationships);

    const rawTimes = new Map<string, unknown>();
    for (const raw of Array.isArray(model.relationships) ? model.relationships : []) {
      const id = text(raw.id);
      if (id && !rawTimes.has(id)) rawTimes.set(id, raw.time);
    }
    const timed: IndexedRelationshipOccurrence[] = [];
    const timeless: RelationshipId[] = [];
    for (const relationship of this.#relationships) {
      const indexed = indexedOccurrence(relationship.id, rawTimes.get(String(relationship.id)));
      if (indexed) timed.push(indexed);
      else timeless.push(relationship.id);
    }

    this.#temporalIndex = createTemporalOccurrenceIndex(timed);
    this.#timedById = new Map(timed.map((occurrence) => [occurrence.id, occurrence]));
    this.#timelessIds = Object.freeze(
      timeless.sort((left, right) => String(left).localeCompare(String(right))),
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
      projection.instances.some((instance) => String(instance.canonicalId) === this.#focusId)
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
    const activeIds = contextualIds?.length
      ? Object.freeze(
          contextualIds.filter((id) =>
            this.#relationships.some((relationship) => relationship.id === id),
          ),
        )
      : base.activeIds;
    const weights = contextualIds?.length
      ? new Map(activeIds.map((id) => [id, base.weights.get(id) ?? 1] as const))
      : base.weights;

    const projection = projectWorldOccurrences(
      this.#relationships,
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
    activeIds: readonly RelationshipId[],
    contextualIds: readonly RelationshipId[] | undefined,
  ): ReadonlyMap<EntityId, WorldEntityPresentation> {
    const contextualSet = new Set(contextualIds ?? []);
    const orderedIds = [
      ...(contextualIds ?? []),
      ...activeIds.filter((id) => !contextualSet.has(id)),
    ];
    const inheritedByEntity = new Map<EntityId, NodeSemanticStyle>();

    for (const id of orderedIds) {
      const semanticStyle = this.#nodeSemanticStyleByRelationshipId.get(id);
      if (!semanticStyle) continue;
      const relationship = this.#relationships.find((candidate) => candidate.id === id);
      if (!relationship) continue;
      for (const entity of [relationship.subjectId, relationship.objectId]) {
        if (!inheritedByEntity.has(entity)) inheritedByEntity.set(entity, semanticStyle);
      }
    }

    if (inheritedByEntity.size === 0) return this.#entityPresentation;

    const result = new Map<EntityId, WorldEntityPresentation>();
    for (const [id, presentation] of this.#entityPresentation) {
      const inherited = inheritedByEntity.get(id);
      if (!inherited) {
        result.set(id, presentation);
        continue;
      }
      const authored = presentation.style ?? {};
      const hasAuthoredFill = styleHasAny(authored, [
        "fillColor",
        "fill",
        "backgroundColor",
        "color",
      ]);
      const hasAuthoredBorder = styleHasAny(authored, [
        "borderColor",
        "border",
        "stroke",
        "strokeColor",
      ]);
      const style = Object.freeze({
        ...(!hasAuthoredFill ? { fillColor: inherited.fillColor } : {}),
        ...(!hasAuthoredBorder ? { borderColor: inherited.borderColor } : {}),
        ...authored,
      });
      result.set(id, Object.freeze({ ...presentation, style }));
    }
    return result;
  }

  #sharedActivation(ids: readonly string[]): {
    readonly activeIds: readonly RelationshipId[];
    readonly weights: ReadonlyMap<RelationshipId, number>;
  } {
    const known = new Set(this.#relationships.map((relationship) => String(relationship.id)));
    const activeIds = Object.freeze(
      ids.filter((id) => known.has(id)).map((id) => relationshipId(id)),
    );
    const weights = new Map<RelationshipId, number>();
    for (const id of activeIds) {
      const occurrence = this.#timedById.get(id);
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
    readonly activeIds: readonly RelationshipId[];
    readonly weights: ReadonlyMap<RelationshipId, number>;
  } {
    const activeTimed = this.#viewport
      ? this.#temporalIndex.query({ time: this.#viewport })
      : this.#temporalIndex.query({
          time: { start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY },
        });

    const activeIds = Object.freeze([
      ...activeTimed.map((occurrence) => occurrence.id),
      ...this.#timelessIds,
    ]);

    const weights = new Map<RelationshipId, number>();
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
    if (this.#relationships.some((relationship) => String(relationship.id) === this.#focusId)) {
      this.#runtime.focusOccurrence(relationshipId(this.#focusId));
    }
  }
}
