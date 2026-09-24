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
import { projectWorldOccurrences } from "../../src/projection/world-occurrence-projection.ts";
import type { WorldProjection } from "../../src/projection/world-projection.ts";
import {
  type WorldEntityVisualOverride,
  type WorldNodeShape,
  type WorldSemanticIconName,
  type WorldVisualColor,
  WORLD_NODE_SHAPES,
} from "../../src/projection/world-visual-encoding.ts";
import { TimelineTemporal } from "../temporal-standards.ts";

export interface WorldProjectionRuntime {
  setProjection(projection: WorldProjection): void;
  setTemporalWindow(window: WorldViewViewport): void;
  focusEntity(id: EntityId): void;
  focusOccurrence(id: RelationshipId): void;
  focusPlace(id: PlaceId): void;
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
}

interface InputRelationship {
  readonly id?: unknown;
  readonly subjectId?: unknown;
  readonly objectId?: unknown;
  readonly predicate?: unknown;
  readonly role?: unknown;
  readonly placeId?: unknown;
  readonly time?: unknown;
  readonly confidence?: unknown;
  readonly attributes?: unknown;
}

export interface WorldViewModel {
  readonly entities?: readonly InputEntity[];
  readonly places?: readonly InputPlace[];
  readonly relationships?: readonly InputRelationship[];
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
  const type = value["type"];
  if (type !== "instant" && type !== "interval") return null;

  const start = temporalEndpoint(value["start"]);
  const openStart = value["openStart"] === true;
  const openEnd = value["openEnd"] === true;

  if (type === "instant") {
    return Object.freeze({
      type,
      start,
      ...(openStart ? { openStart: true } : {}),
      ...(openEnd ? { openEnd: true } : {}),
    });
  }

  const end = temporalEndpoint(value["end"]);
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

const WORLD_ICONS = new Set<WorldSemanticIconName>([
  "person",
  "group",
  "object",
  "evidence",
  "place",
]);

function visualColor(value: unknown): WorldVisualColor | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match?.[1]) return undefined;
  const hex = match[1];
  return Object.freeze([
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    240,
  ]) as WorldVisualColor;
}

function entityVisualOverride(attributes: unknown): WorldEntityVisualOverride | undefined {
  if (!isRecord(attributes)) return undefined;
  const presentation = isRecord(attributes["presentation"])
    ? attributes["presentation"]
    : attributes;
  const shapeValue = text(presentation["shape"]);
  const shape = WORLD_NODE_SHAPES.includes(shapeValue as WorldNodeShape)
    ? (shapeValue as WorldNodeShape)
    : undefined;
  const iconValue = text(presentation["icon"]);
  const icon = WORLD_ICONS.has(iconValue as WorldSemanticIconName)
    ? (iconValue as WorldSemanticIconName)
    : undefined;
  const fillColor = visualColor(presentation["fillColor"] ?? presentation["color"]);
  const outlineColor = visualColor(presentation["outlineColor"]);
  const imageUrl = text(presentation["imageUrl"] ?? attributes["imageUrl"]);

  if (!shape && !icon && !fillColor && !outlineColor && !imageUrl) return undefined;
  return Object.freeze({
    ...(shape ? { shape } : {}),
    ...(icon ? { icon } : {}),
    ...(fillColor ? { fillColor } : {}),
    ...(outlineColor ? { outlineColor } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  });
}

function canonicalPlaces(input: readonly InputPlace[]): readonly SpatialPlaceRecord[] {
  const result: SpatialPlaceRecord[] = [];

  for (const raw of input) {
    const id = text(raw.id);
    const geometry = canonicalGeometry(raw.geometry);
    if (!id || !geometry) continue;

    const radius = precisionRadius(raw.accuracyMeters);
    result.push(
      Object.freeze({
        id: placeId(id),
        ...(text(raw.name) ? { label: text(raw.name) } : {}),
        geometry,
        ...(radius === undefined ? {} : { precisionRadiusMeters: radius }),
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
        attributes: isRecord(raw.attributes)
          ? Object.freeze({ ...raw.attributes })
          : Object.freeze({}),
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
    createTemporalOccurrenceIndex([]);
  #timedById: ReadonlyMap<RelationshipId, IndexedRelationshipOccurrence> = new Map();
  #timelessIds: readonly RelationshipId[] = Object.freeze([]);
  #viewport: WorldTemporalWindow | null = null;
  #sharedActiveIds: readonly string[] | null = null;
  #focusId: string | null = null;
  #presentationMode = false;
  #entityIds = new Set<string>();
  #entityPresentation = new Map<
    EntityId,
    Readonly<{ label?: string; kind?: string; visual?: WorldEntityVisualOverride }>
  >();
  #placeIds = new Set<string>();

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
          const visual = entityVisualOverride(entity.attributes);
          return [
            entityId(id),
            Object.freeze({
              ...(label ? { label } : {}),
              ...(kind ? { kind } : {}),
              ...(visual ? { visual } : {}),
            }),
          ] as const;
        })
        .filter(
          (
            entry,
          ): entry is readonly [
            EntityId,
            Readonly<{ label?: string; kind?: string; visual?: WorldEntityVisualOverride }>,
          ] => entry !== null,
        ),
    );
    this.#placeIds = new Set(places.map((place) => String(place.id)));

    this.#relationships = canonicalRelationships(
      Array.isArray(model.relationships) ? model.relationships : [],
      this.#entityIds,
      this.#placeIds,
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

  setWindow(viewport: WorldViewViewport | null): void {
    this.#viewport =
      viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? Object.freeze({ start: viewport.start, end: viewport.end })
        : null;
    this.#sharedActiveIds = Array.isArray(viewport?.activeOccurrenceIds)
      ? Object.freeze(viewport.activeOccurrenceIds.map(String))
      : null;
    this.#render();
  }

  setFocus(id: string | number | null): void {
    this.#focusId = id === null || id === undefined ? null : String(id);
    this.#focusCurrent();
  }

  setPresentationMode(active: boolean): void {
    this.#presentationMode = Boolean(active);
  }

  hasContext(): boolean {
    const projection = this.#runtime.getRenderProjection();
    if (!this.#focusId || !projection) return false;
    return (
      projection.edges.some((edge) => String(edge.id) === this.#focusId) ||
      projection.instances.some((instance) => String(instance.canonicalId) === this.#focusId)
    );
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
    const { activeIds, weights } = this.#sharedActiveIds
      ? this.#sharedActivation(this.#sharedActiveIds)
      : this.#standaloneActivation();

    const projection = projectWorldOccurrences(
      this.#relationships,
      activeIds,
      this.#spatialAnchors,
      {
        entityPresentation: this.#entityPresentation,
        temporalWeights: weights,
      },
    );

    this.#runtime.setProjection(projection);
    if (this.#viewport) this.#runtime.setTemporalWindow(this.#viewport);
    this.#focusCurrent();
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
