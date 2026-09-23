import { entityId, placeId, relationshipId } from "../../src/domain/ids.ts";
import type { CanonicalSpatialGeometry } from "../../src/domain/geotemporal.ts";
import { validateSpatialGeometry } from "../../src/domain/geotemporal.ts";
import type {
  CanonicalRelationship,
  CanonicalTemporalExtent,
} from "../../src/domain/relationship.ts";
import {
  occurrenceViewportWeight,
  type ProjectableOccurrence,
} from "../../src/projection/spatiotemporal-projection.ts";
import {
  createTemporalOccurrenceIndex,
  type TemporalOccurrenceIndex,
} from "../../src/projection/temporal-occurrence-index.ts";
import {
  SpatialAnchorIndex,
  type SpatialPlaceRecord,
} from "../../src/projection/spatial-anchor-index.ts";
import { projectWorldOccurrences } from "../../src/projection/world-occurrence-projection.ts";
import type { RelationshipId } from "../../src/domain/ids.ts";
import { TimelineTemporal } from "../temporal-standards.ts";
import type { EntityId, PlaceId } from "../../src/domain/ids.ts";
import type { WorldProjection } from "../../src/projection/world-projection.ts";

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
}

interface InputPlace {
  readonly id?: unknown;
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

function indexedOccurrence(
  relationship: CanonicalRelationship,
): IndexedRelationshipOccurrence | null {
  if (!relationship.time?.start) return null;
  const start = TimelineTemporal.sortKey(relationship.time.start);
  if (!Number.isFinite(start)) return null;

  const rawEnd =
    relationship.time.type === "interval" && relationship.time.end
      ? TimelineTemporal.sortKey(relationship.time.end)
      : start;
  const end = Number.isFinite(rawEnd) ? rawEnd : start;

  return Object.freeze({ id: relationship.id, start, end });
}

export class WorldProjectionView {
  readonly #runtime: WorldProjectionRuntime;

  #relationships: readonly CanonicalRelationship[] = Object.freeze([]);
  #spatialAnchors = new SpatialAnchorIndex([], []);
  #temporalIndex: TemporalOccurrenceIndex<IndexedRelationshipOccurrence> =
    createTemporalOccurrenceIndex([]);
  #timelessIds: readonly RelationshipId[] = Object.freeze([]);
  #viewport: WorldViewViewport | null = null;
  #focusId: string | null = null;
  #presentationMode = false;
  #entityIds = new Set<string>();
  #placeIds = new Set<string>();

  constructor(runtime: WorldProjectionRuntime) {
    this.#runtime = runtime;
  }

  setModel(model: WorldViewModel): void {
    const entities = Array.isArray(model.entities) ? model.entities : [];
    const places = canonicalPlaces(Array.isArray(model.places) ? model.places : []);

    this.#entityIds = new Set(entities.map((entity) => text(entity.id)).filter(Boolean));
    this.#placeIds = new Set(places.map((place) => String(place.id)));

    this.#relationships = canonicalRelationships(
      Array.isArray(model.relationships) ? model.relationships : [],
      this.#entityIds,
      this.#placeIds,
    );
    this.#spatialAnchors = new SpatialAnchorIndex(places, this.#relationships);

    const timed: IndexedRelationshipOccurrence[] = [];
    const timeless: RelationshipId[] = [];
    for (const relationship of this.#relationships) {
      const indexed = indexedOccurrence(relationship);
      if (indexed) timed.push(indexed);
      else timeless.push(relationship.id);
    }

    this.#temporalIndex = createTemporalOccurrenceIndex(timed);
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

    const projection = projectWorldOccurrences(
      this.#relationships,
      activeIds,
      this.#spatialAnchors,
      { temporalWeights: weights },
    );

    this.#runtime.setProjection(projection);
    if (this.#viewport) this.#runtime.setTemporalWindow(this.#viewport);
    this.#focusCurrent();
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
