import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import type { WorldNodeDragPosition } from "../../src/interaction/world-node-drag-controller.ts";
import { resolveWorldNodeDragPosition } from "../../src/interaction/world-node-drag-geometry.ts";
import {
  resolveWorldRenderPosition,
  type WorldRenderPosition,
} from "../../src/layout/world-geographic-position.ts";
import {
  selectWorldSpatialMode,
  type WorldSpatialMode,
} from "../../src/layout/world-spatial-mode.ts";
import {
  createWorldCameraState,
  createWorldSpatialPosition,
  createWorldTemporalWindow,
  type ScreenPoint,
  type WorldCameraState,
  type WorldHit,
  type WorldSelection,
  type WorldSpatialPosition,
  type WorldSurface,
  type WorldSurfaceCapabilities,
  type WorldTemporalWindow,
} from "../../src/layout/world-surface.ts";
import type {
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldProjection,
} from "../../src/projection/world-projection.ts";

export const DECK_WORLD_LAYER_IDS = Object.freeze({
  places: "lum-world-places",
  relationships: "lum-world-relationships",
  entities: "lum-world-entities",
});

interface DeckRuntimeViewState {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
  readonly bearing?: number;
  readonly pitch?: number;
}

export interface DeckRuntimePickingInfo {
  readonly object?: unknown;
  readonly layer?: { readonly id?: string };
  readonly x?: number;
  readonly y?: number;
}

interface DeckRuntimePointerEvent {
  readonly pointerId?: unknown;
  readonly srcEvent?: unknown;
}

interface DoubleClickEvent {
  readonly offsetX?: unknown;
  readonly offsetY?: unknown;
}

export interface DeckWorldNodeDragSink {
  begin(pointerId: number, instanceId: WorldInstanceId, position: WorldNodeDragPosition): boolean;
  update(pointerId: number, position: WorldNodeDragPosition): boolean;
  release(pointerId: number): boolean;
  cancel(reason: "pointercancel" | "lostpointercapture"): void;
}

export interface DeckRuntimeViewport {
  project(coordinates: readonly number[]): readonly number[];
  unproject(
    pixels: readonly number[],
    options?: Readonly<Record<string, unknown>>,
  ): readonly number[];
}

export interface DeckRuntimeInstance {
  setProps(props: Readonly<Record<string, unknown>>): void;
  pickObject(options: Readonly<Record<string, unknown>>): DeckRuntimePickingInfo | null;
  getViewports(rect?: Readonly<Record<string, number>>): readonly DeckRuntimeViewport[];
  redraw(force?: boolean): void;
  finalize(): void;
}

export interface DeckWorldRuntime {
  createGlobeView(props: Readonly<Record<string, unknown>>): unknown;
  createMapView?(props: Readonly<Record<string, unknown>>): unknown;
  createScatterplotLayer(props: Readonly<Record<string, unknown>>): unknown;
  createPathLayer(props: Readonly<Record<string, unknown>>): unknown;
  createDeck(props: Readonly<Record<string, unknown>>): DeckRuntimeInstance;
}

interface DeckWorldEntityDatum {
  readonly kind: "entity";
  readonly entityId: EntityId;
  readonly worldInstanceId: WorldInstanceId;
  readonly position: WorldRenderPosition;
  readonly selected: boolean;
  readonly visualWeight: number;
}

interface DeckWorldRelationshipDatum {
  readonly kind: "relationship";
  readonly relationshipId: RelationshipId;
  readonly path: readonly [WorldRenderPosition, WorldRenderPosition];
  readonly selected: boolean;
  readonly temporalWeight: number;
}

interface DeckWorldPlaceDatum {
  readonly kind: "place";
  readonly placeId: PlaceId;
  readonly position: WorldRenderPosition;
  readonly selected: boolean;
}

export interface DeckWorldClusterMember {
  readonly entityId: EntityId;
  readonly worldInstanceId: WorldInstanceId;
}

/**
 * A screen-proximity grouping of entity datums at low zoom (issue #445
 * Priority 2 semantic LOD). `clusterMembers` always carries the full list of
 * canonical entity/instance ids the cluster represents, so picking a cluster
 * can still resolve back to real canonical entities rather than an opaque
 * blob.
 */
export interface DeckWorldClusterDatum {
  readonly kind: "cluster";
  readonly clusterId: string;
  readonly position: WorldRenderPosition;
  readonly clusterMembers: readonly DeckWorldClusterMember[];
  readonly visualWeight: number;
}

export type DeckWorldEntityRenderDatum = DeckWorldEntityDatum | DeckWorldClusterDatum;

/**
 * Below this globe zoom level, nearby entities are grouped into clusters.
 * The default camera (zoom 1, see `DEFAULT_CAMERA` below) sits above this
 * threshold so clustering stays fully bypassed until the viewer zooms out
 * past the initial globe overview, keeping per-entity picking/dragging
 * unaffected at working zoom levels.
 */
export const CLUSTER_ZOOM_THRESHOLD = 0.5;

/** Grid-cell size (degrees) used to bucket entities for clustering. */
const CLUSTER_CELL_DEGREES = 6;

function clusterCellKey(position: WorldRenderPosition): string {
  const cellLongitude = Math.floor(position[0] / CLUSTER_CELL_DEGREES);
  const cellLatitude = Math.floor(position[1] / CLUSTER_CELL_DEGREES);
  return `${cellLongitude}:${cellLatitude}`;
}

/**
 * Pure function grouping entity datums into clusters by screen-proximity
 * (approximated here via a lon/lat grid, since actual pixel projection would
 * require a live viewport). Fully bypassed at/above `CLUSTER_ZOOM_THRESHOLD`
 * so per-entity picking/dragging is unaffected at working zoom levels, and
 * a place-anchor's own entities are only grouped when more than one entity
 * shares proximity — a lone entity is returned unchanged (same reference),
 * preserving the Priority 3 incremental-memoization guarantee for the
 * common case.
 */
export function clusterEntityDatums(
  entities: readonly DeckWorldEntityDatum[],
  zoom: number,
): readonly DeckWorldEntityRenderDatum[] {
  if (zoom >= CLUSTER_ZOOM_THRESHOLD) return entities;

  const cells = new Map<string, DeckWorldEntityDatum[]>();
  for (const entity of entities) {
    const key = clusterCellKey(entity.position);
    const bucket = cells.get(key);
    if (bucket) {
      bucket.push(entity);
    } else {
      cells.set(key, [entity]);
    }
  }

  const result: DeckWorldEntityRenderDatum[] = [];
  for (const [key, members] of cells) {
    const [onlyMember] = members;
    if (members.length === 1 && onlyMember) {
      result.push(onlyMember);
      continue;
    }

    let sumLongitude = 0;
    let sumLatitude = 0;
    let sumAltitude = 0;
    let sumWeight = 0;
    const clusterMembers: DeckWorldClusterMember[] = [];
    for (const member of members) {
      sumLongitude += member.position[0];
      sumLatitude += member.position[1];
      sumAltitude += member.position[2];
      sumWeight += member.visualWeight;
      clusterMembers.push(
        Object.freeze({ entityId: member.entityId, worldInstanceId: member.worldInstanceId }),
      );
    }

    result.push(
      Object.freeze({
        kind: "cluster",
        clusterId: `cluster:${key}`,
        position: Object.freeze([
          sumLongitude / members.length,
          sumLatitude / members.length,
          sumAltitude / members.length,
        ]) as WorldRenderPosition,
        clusterMembers: Object.freeze(clusterMembers),
        visualWeight: sumWeight / members.length,
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) => {
      const leftId = left.kind === "cluster" ? left.clusterId : left.worldInstanceId;
      const rightId = right.kind === "cluster" ? right.clusterId : right.worldInstanceId;
      return String(leftId).localeCompare(String(rightId));
    }),
  );
}

const BASE_CAPABILITIES = Object.freeze({
  globe: true,
  depthPicking: true,
  gpuFiltering: false,
});

const DEFAULT_CAMERA = createWorldCameraState({
  longitude: 0,
  latitude: 20,
  zoom: 1,
  bearing: 0,
  pitch: 20,
});

/**
 * Mirrors the `prefers-reduced-motion` check already used elsewhere in the
 * codebase (see `site/location-map.ts` `prefersReducedMotion` and
 * `site/timeline-view.ts` `reducedMotionQuery`) rather than inventing a new
 * global preference signal: when the platform requests reduced motion,
 * deck.gl's built-in camera inertia is disabled.
 */
function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

/**
 * Explicit deck.gl `Controller` options (issue #445 Priority 4). deck.gl's
 * own `GlobeController`/`MapController` already implements orbit/rotate,
 * pointer-anchored wheel/pinch zoom (`zoomAround: "pointer"` is deck.gl's
 * default), and keyboard pan/zoom (`keyboard: true` is deck.gl's default) —
 * this file does not reimplement that gesture handling. What deck.gl
 * does *not* default to "on" is inertia, so it is set explicitly here and
 * tied to the platform's reduced-motion preference. `doubleClickZoom` is
 * left off (deck.gl's own default) because this surface wires its own
 * double-tap/double-click focus gesture (see `#handleDoubleClick`) instead.
 */
function deckControllerOptions(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    dragPan: true,
    dragRotate: true,
    scrollZoom: true,
    touchZoom: true,
    multiTouchDrag: "rotate",
    keyboard: true,
    doubleClickZoom: false,
    zoomAround: "pointer",
    inertia: !prefersReducedMotion(),
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pointerIdFromRuntimeEvent(event: DeckRuntimePointerEvent): number | null {
  const source = isRecord(event.srcEvent) ? event.srcEvent : null;
  const value = source?.["pointerId"] ?? event.pointerId;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function screenPointFromPicking(info: DeckRuntimePickingInfo): ScreenPoint | null {
  if (
    typeof info.x !== "number" ||
    typeof info.y !== "number" ||
    !Number.isFinite(info.x) ||
    !Number.isFinite(info.y)
  ) {
    return null;
  }
  return Object.freeze({ x: info.x, y: info.y });
}

function cameraFromRuntime(value: unknown, fallback: WorldCameraState): WorldCameraState | null {
  if (!isRecord(value)) return null;

  try {
    return createWorldCameraState({
      longitude: numberField(value, "longitude", fallback.longitude),
      latitude: numberField(value, "latitude", fallback.latitude),
      zoom: numberField(value, "zoom", fallback.zoom),
      bearing: numberField(value, "bearing", fallback.bearing),
      pitch: numberField(value, "pitch", fallback.pitch),
    });
  } catch {
    return null;
  }
}

function anchorPosition(instance: ProjectedWorldInstance): WorldRenderPosition | null {
  return resolveWorldRenderPosition(instance);
}

function positionEquals(left: WorldRenderPosition, right: WorldRenderPosition): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function placeDatumUnchanged(
  previous: DeckWorldPlaceDatum,
  position: WorldRenderPosition,
  selected: boolean,
): boolean {
  return previous.selected === selected && positionEquals(previous.position, position);
}

/**
 * Incremental datum construction (issue #445 Priority 3): each builder is
 * handed the previous frame's datum-by-id map and reuses the prior datum
 * object by reference whenever the fields deck.gl actually reads from it
 * (position/selection/weight) are unchanged. This preserves object identity
 * across `setProps({ layers })` calls so deck.gl's own attribute diffing can
 * skip GPU buffer recompute for unchanged rows.
 */
function placeDatums(
  instances: readonly ProjectedWorldInstance[],
  selection: WorldSelection | null,
  previous: ReadonlyMap<PlaceId, DeckWorldPlaceDatum>,
): { readonly datums: readonly DeckWorldPlaceDatum[]; readonly byId: Map<PlaceId, DeckWorldPlaceDatum> } {
  const byPlace = new Map<PlaceId, DeckWorldPlaceDatum>();

  for (const instance of instances) {
    for (const anchor of instance.geographicAnchors) {
      if (byPlace.has(anchor.placeId)) continue;
      const position = Object.freeze([
        anchor.longitude,
        anchor.latitude,
        anchor.sourceAltitude ?? 0,
      ]) as WorldRenderPosition;
      const selected = selection?.kind === "place" && selection.id === anchor.placeId;
      const prior = previous.get(anchor.placeId);
      byPlace.set(
        anchor.placeId,
        prior && placeDatumUnchanged(prior, position, selected)
          ? prior
          : Object.freeze({
              kind: "place",
              placeId: anchor.placeId,
              position,
              selected,
            }),
      );
    }
  }

  return {
    datums: Object.freeze(
      [...byPlace.values()].sort((left, right) =>
        String(left.placeId).localeCompare(String(right.placeId)),
      ),
    ),
    byId: byPlace,
  };
}

function entityDatumUnchanged(
  previous: DeckWorldEntityDatum,
  position: WorldRenderPosition,
  selected: boolean,
  visualWeight: number,
): boolean {
  return (
    previous.selected === selected &&
    previous.visualWeight === visualWeight &&
    positionEquals(previous.position, position)
  );
}

function entityDatums(
  instances: readonly ProjectedWorldInstance[],
  selection: WorldSelection | null,
  previous: ReadonlyMap<WorldInstanceId, DeckWorldEntityDatum>,
): {
  readonly datums: readonly DeckWorldEntityDatum[];
  readonly byId: Map<WorldInstanceId, DeckWorldEntityDatum>;
} {
  const byId = new Map<WorldInstanceId, DeckWorldEntityDatum>();
  const result: DeckWorldEntityDatum[] = [];

  for (const instance of instances) {
    const position = anchorPosition(instance);
    if (!position) continue;
    const selected = selection?.kind === "entity" && selection.id === instance.canonicalId;
    const prior = previous.get(instance.id);
    const datum =
      prior && entityDatumUnchanged(prior, position, selected, instance.visualWeight)
        ? prior
        : Object.freeze({
            kind: "entity" as const,
            entityId: instance.canonicalId,
            worldInstanceId: instance.id,
            position,
            selected,
            visualWeight: instance.visualWeight,
          });
    byId.set(instance.id, datum);
    result.push(datum);
  }

  return {
    datums: Object.freeze(
      result.sort((left, right) =>
        String(left.worldInstanceId).localeCompare(String(right.worldInstanceId)),
      ),
    ),
    byId,
  };
}

function relationshipDatumUnchanged(
  previous: DeckWorldRelationshipDatum,
  source: WorldRenderPosition,
  target: WorldRenderPosition,
  selected: boolean,
  temporalWeight: number,
): boolean {
  return (
    previous.selected === selected &&
    previous.temporalWeight === temporalWeight &&
    positionEquals(previous.path[0], source) &&
    positionEquals(previous.path[1], target)
  );
}

function relationshipDatums(
  projection: WorldProjection,
  positions: ReadonlyMap<WorldInstanceId, WorldRenderPosition>,
  selection: WorldSelection | null,
  previous: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum>,
): {
  readonly datums: readonly DeckWorldRelationshipDatum[];
  readonly byId: Map<RelationshipId, DeckWorldRelationshipDatum>;
} {
  const byId = new Map<RelationshipId, DeckWorldRelationshipDatum>();
  const result: DeckWorldRelationshipDatum[] = [];

  for (const edge of projection.edges) {
    const source = positions.get(edge.sourceInstanceId);
    const target = positions.get(edge.targetInstanceId);
    if (!source || !target) continue;

    const selected = selection?.kind === "relationship" && selection.id === edge.id;
    const prior = previous.get(edge.id);
    const datum =
      prior && relationshipDatumUnchanged(prior, source, target, selected, edge.temporalWeight)
        ? prior
        : Object.freeze({
            kind: "relationship" as const,
            relationshipId: edge.id,
            path: Object.freeze([source, target]) as readonly [
              WorldRenderPosition,
              WorldRenderPosition,
            ],
            selected,
            temporalWeight: edge.temporalWeight,
          });
    byId.set(edge.id, datum);
    result.push(datum);
  }

  return {
    datums: Object.freeze(
      result.sort((left, right) =>
        String(left.relationshipId).localeCompare(String(right.relationshipId)),
      ),
    ),
    byId,
  };
}

function screenPointFromDoubleClickEvent(event: DoubleClickEvent): ScreenPoint | null {
  const x = event.offsetX;
  const y = event.offsetY;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return Object.freeze({ x, y });
}

function worldHitFromPicking(info: DeckRuntimePickingInfo | null): WorldHit | null {
  if (!info || !isRecord(info.object)) return null;
  const object = info.object;

  if (
    object["kind"] === "entity" &&
    typeof object["entityId"] === "string" &&
    typeof object["worldInstanceId"] === "string"
  ) {
    return Object.freeze({
      kind: "entity",
      entityId: object["entityId"] as EntityId,
      worldInstanceId: object["worldInstanceId"] as WorldInstanceId,
    });
  }

  if (object["kind"] === "relationship" && typeof object["relationshipId"] === "string") {
    return Object.freeze({
      kind: "relationship",
      relationshipId: object["relationshipId"] as RelationshipId,
    });
  }

  if (object["kind"] === "place" && typeof object["placeId"] === "string") {
    return Object.freeze({
      kind: "place",
      placeId: object["placeId"] as PlaceId,
    });
  }

  if (object["kind"] === "cluster" && Array.isArray(object["clusterMembers"])) {
    // Clusters are a presentation-only grouping (issue #445 Priority 2):
    // picking one resolves back to its first real canonical member rather
    // than exposing the cluster as its own selectable identity, so the
    // renderer-neutral WorldHit contract never needs a "cluster" variant.
    const first = object["clusterMembers"][0] as
      | { readonly entityId?: unknown; readonly worldInstanceId?: unknown }
      | undefined;
    if (
      first &&
      typeof first.entityId === "string" &&
      typeof first.worldInstanceId === "string"
    ) {
      return Object.freeze({
        kind: "entity",
        entityId: first.entityId as EntityId,
        worldInstanceId: first.worldInstanceId as WorldInstanceId,
      });
    }
  }

  return null;
}

export class DeckWorldSurface implements WorldSurface {
  readonly #runtime: DeckWorldRuntime;
  readonly #deck: DeckRuntimeInstance;
  readonly #globeView: unknown;
  readonly #localView: unknown | null;
  readonly #container: HTMLElement;
  #projection: WorldProjection = Object.freeze({
    instances: Object.freeze([]),
    edges: Object.freeze([]),
  });
  #selection: WorldSelection | null = null;
  #camera: WorldCameraState;
  #spatialMode: WorldSpatialMode = "globe";
  #nodeDragSink: DeckWorldNodeDragSink | null = null;
  #activeDragPointerId: number | null = null;
  #destroyed = false;

  // Priority 3 (issue #445): previous frame's datum-by-id maps, kept so
  // #render can reuse unchanged datum object references across frames.
  #placeDatumCache: ReadonlyMap<PlaceId, DeckWorldPlaceDatum> = new Map();
  #entityDatumCache: ReadonlyMap<WorldInstanceId, DeckWorldEntityDatum> = new Map();
  #relationshipDatumCache: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum> = new Map();
  // Tracks which side of CLUSTER_ZOOM_THRESHOLD the last render used, so
  // camera-only zoom changes only trigger a re-render when clustering would
  // actually turn on/off (ordinary panning/zooming above the threshold stays
  // as cheap as before).
  #clusteredLastRender = false;

  readonly #handlePointerCancel = (event: PointerEvent): void => {
    if (this.#activeDragPointerId === null || event.pointerId !== this.#activeDragPointerId) {
      return;
    }
    this.#nodeDragSink?.cancel("pointercancel");
    this.#activeDragPointerId = null;
  };

  readonly #handleLostPointerCapture = (event: PointerEvent): void => {
    if (this.#activeDragPointerId === null || event.pointerId !== this.#activeDragPointerId) {
      return;
    }
    this.#nodeDragSink?.cancel("lostpointercapture");
    this.#activeDragPointerId = null;
  };

  // Double-tap/double-click focus (issue #445 Priority 4). deck.gl's own
  // `doubleClickZoom` controller option is left off (see
  // `deckControllerOptions` above) so this native `dblclick` listener — which
  // fires for both mouse double-click and touch double-tap — is the sole
  // owner of double-tap semantics: it picks whatever is under the pointer
  // and focuses that canonical entity/occurrence/place. A miss (no hit under
  // the pointer) is a no-op rather than falling back to a generic zoom.
  readonly #handleDoubleClick = (event: DoubleClickEvent): void => {
    const point = screenPointFromDoubleClickEvent(event);
    if (!point) return;

    const hit = this.pick(point);
    if (!hit) return;

    if (hit.kind === "entity") this.focusEntity(hit.entityId);
    else if (hit.kind === "relationship") this.focusOccurrence(hit.relationshipId);
    else if (hit.kind === "place") this.focusPlace(hit.placeId);
  };

  constructor(
    container: HTMLElement,
    runtime: DeckWorldRuntime,
    initialCamera: WorldCameraState = DEFAULT_CAMERA,
  ) {
    this.#runtime = runtime;
    this.#container = container;
    this.#camera = createWorldCameraState(initialCamera);

    this.#globeView = runtime.createGlobeView({ id: "lum-world" });
    this.#localView = runtime.createMapView?.({ id: "lum-world-local" }) ?? null;
    this.#deck = runtime.createDeck({
      parent: container,
      views: [this.#globeView],
      controller: deckControllerOptions(),
      initialViewState: this.#camera,
      layers: [],
      onViewStateChange: ({ viewState }: { readonly viewState: DeckRuntimeViewState }) => {
        const next = cameraFromRuntime(viewState, this.#camera);
        if (next) {
          this.#camera = next;
          this.#syncSpatialMode();
          this.#reclusterIfZoomCrossedThreshold();
        }
      },
    });

    this.#container.addEventListener?.("pointercancel", this.#handlePointerCancel);
    this.#container.addEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
    this.#container.addEventListener?.("dblclick", this.#handleDoubleClick as EventListener);
  }

  setNodeDragSink(sink: DeckWorldNodeDragSink | null): void {
    this.#assertAlive();
    this.#nodeDragSink = sink;
    if (!sink) this.#activeDragPointerId = null;
    this.#render();
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();
    this.#projection = projection;
    this.#render();
  }

  setTemporalWindow(window: WorldTemporalWindow): void {
    this.#assertAlive();
    createWorldTemporalWindow(window);
  }

  setSelection(selection: WorldSelection | null): void {
    this.#assertAlive();
    this.#selection = selection;
    this.#render();
  }

  getCamera(): WorldCameraState {
    return this.#camera;
  }

  setCamera(camera: WorldCameraState): void {
    this.#assertAlive();
    this.#camera = createWorldCameraState(camera);
    this.#syncSpatialMode();
    this.#deck.setProps({ viewState: this.#camera });
    this.#reclusterIfZoomCrossedThreshold();
  }

  focusEntity(id: EntityId): void {
    this.#focusPosition(
      entityDatums(this.#projection.instances, this.#selection, this.#entityDatumCache).datums.find(
        (datum) => datum.entityId === id,
      )?.position ?? null,
    );
  }

  focusOccurrence(id: RelationshipId): void {
    const positions = this.#positions();
    this.#focusPosition(
      relationshipDatums(
        this.#projection,
        positions,
        this.#selection,
        this.#relationshipDatumCache,
      ).datums.find((datum) => datum.relationshipId === id)?.path[0] ?? null,
    );
  }

  focusPlace(id: PlaceId): void {
    this.#focusPosition(
      placeDatums(this.#projection.instances, this.#selection, this.#placeDatumCache).datums.find(
        (datum) => datum.placeId === id,
      )?.position ?? null,
    );
  }

  project(position: WorldSpatialPosition): ScreenPoint | null {
    this.#assertAlive();
    const viewport = this.#deck.getViewports()[0];
    if (!viewport) return null;

    const validated = createWorldSpatialPosition(position);
    const projected = viewport.project([
      validated.longitude,
      validated.latitude,
      validated.altitudeMeters,
    ]);
    const x = projected[0];
    const y = projected[1];
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      return null;
    }
    return Object.freeze({ x, y });
  }

  unproject(point: ScreenPoint, targetAltitudeMeters: number): WorldSpatialPosition | null {
    this.#assertAlive();
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error("World screen point must contain finite coordinates.");
    }
    if (!Number.isFinite(targetAltitudeMeters)) {
      throw new Error("World target altitude must be finite.");
    }

    const viewport =
      this.#deck.getViewports({
        x: point.x,
        y: point.y,
        width: 1,
        height: 1,
      })[0] ?? this.#deck.getViewports()[0];
    if (!viewport) return null;

    const unprojected = viewport.unproject([point.x, point.y], {
      targetZ: targetAltitudeMeters,
    });
    const longitude = unprojected[0];
    const latitude = unprojected[1];
    const altitudeMeters = unprojected[2] ?? targetAltitudeMeters;

    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      typeof altitudeMeters !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(altitudeMeters)
    ) {
      return null;
    }

    try {
      return createWorldSpatialPosition({
        longitude,
        latitude,
        altitudeMeters,
      });
    } catch {
      return null;
    }
  }

  pick(point: ScreenPoint): WorldHit | null {
    this.#assertAlive();
    return worldHitFromPicking(
      this.#deck.pickObject({
        x: point.x,
        y: point.y,
        radius: 22,
        unproject3D: true,
        layerIds: [
          DECK_WORLD_LAYER_IDS.entities,
          DECK_WORLD_LAYER_IDS.relationships,
          DECK_WORLD_LAYER_IDS.places,
        ],
      }),
    );
  }

  getCapabilities(): WorldSurfaceCapabilities {
    return Object.freeze({
      ...BASE_CAPABILITIES,
      directNodeDrag: this.#nodeDragSink !== null,
      localPrecisionMode: this.#localView !== null,
    });
  }

  refresh(): void {
    this.#assertAlive();
    this.#deck.redraw(true);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#container.removeEventListener?.("pointercancel", this.#handlePointerCancel);
    this.#container.removeEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
    this.#container.removeEventListener?.("dblclick", this.#handleDoubleClick as EventListener);
    this.#deck.finalize();
  }

  #dragTarget(
    info: DeckRuntimePickingInfo,
  ): { readonly instanceId: WorldInstanceId; readonly position: WorldNodeDragPosition } | null {
    if (!isRecord(info.object) || info.object["kind"] !== "entity") return null;
    const worldInstanceId = info.object["worldInstanceId"];
    if (typeof worldInstanceId !== "string") return null;

    const instance = this.#projection.instances.find(
      (candidate) => candidate.id === worldInstanceId,
    );
    const point = screenPointFromPicking(info);
    if (!instance || !point) return null;

    const position = resolveWorldNodeDragPosition(this, instance, point);
    return position
      ? Object.freeze({
          instanceId: instance.id,
          position,
        })
      : null;
  }

  #beginEntityDrag(info: DeckRuntimePickingInfo, event: DeckRuntimePointerEvent): boolean {
    const sink = this.#nodeDragSink;
    const pointerId = pointerIdFromRuntimeEvent(event);
    const target = this.#dragTarget(info);
    if (!sink || pointerId === null || !target) return false;

    const claimed = sink.begin(pointerId, target.instanceId, target.position);
    if (claimed) this.#activeDragPointerId = pointerId;
    return claimed;
  }

  #updateEntityDrag(info: DeckRuntimePickingInfo, event: DeckRuntimePointerEvent): boolean {
    const sink = this.#nodeDragSink;
    const pointerId = pointerIdFromRuntimeEvent(event);
    const target = this.#dragTarget(info);
    if (!sink || pointerId === null || pointerId !== this.#activeDragPointerId || !target) {
      return false;
    }
    return sink.update(pointerId, target.position);
  }

  #endEntityDrag(event: DeckRuntimePointerEvent): boolean {
    const sink = this.#nodeDragSink;
    const pointerId = pointerIdFromRuntimeEvent(event) ?? this.#activeDragPointerId;
    if (!sink || pointerId === null || pointerId !== this.#activeDragPointerId) {
      return false;
    }

    this.#activeDragPointerId = null;
    return sink.release(pointerId);
  }

  #syncSpatialMode(): void {
    const nextMode =
      this.#localView === null ? "globe" : selectWorldSpatialMode(this.#camera, this.#spatialMode);
    if (nextMode === this.#spatialMode) return;

    this.#spatialMode = nextMode;
    this.#deck.setProps({
      views: [nextMode === "local" ? this.#localView : this.#globeView],
    });
  }

  #reclusterIfZoomCrossedThreshold(): void {
    const clusteredNow = this.#camera.zoom < CLUSTER_ZOOM_THRESHOLD;
    if (clusteredNow !== this.#clusteredLastRender) this.#render();
  }

  #positions(): ReadonlyMap<WorldInstanceId, WorldRenderPosition> {
    const result = new Map<WorldInstanceId, WorldRenderPosition>();
    for (const instance of this.#projection.instances) {
      const position = anchorPosition(instance);
      if (position) result.set(instance.id, position);
    }
    return result;
  }

  #render(): void {
    const positions = this.#positions();
    const placeResult = placeDatums(this.#projection.instances, this.#selection, this.#placeDatumCache);
    const relationshipResult = relationshipDatums(
      this.#projection,
      positions,
      this.#selection,
      this.#relationshipDatumCache,
    );
    const entityResult = entityDatums(
      this.#projection.instances,
      this.#selection,
      this.#entityDatumCache,
    );
    const places = placeResult.datums;
    const relationships = relationshipResult.datums;
    const entities = clusterEntityDatums(entityResult.datums, this.#camera.zoom);
    this.#placeDatumCache = placeResult.byId;
    this.#relationshipDatumCache = relationshipResult.byId;
    this.#entityDatumCache = entityResult.byId;
    this.#clusteredLastRender = this.#camera.zoom < CLUSTER_ZOOM_THRESHOLD;

    const layers = [
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.places,
        data: places,
        pickable: true,
        radiusUnits: "meters",
        radiusMinPixels: 3,
        getPosition: (datum: DeckWorldPlaceDatum) => datum.position,
        getRadius: 60,
        getFillColor: (datum: DeckWorldPlaceDatum) =>
          datum.selected ? [255, 255, 255, 255] : [160, 160, 160, 190],
      }),
      this.#runtime.createPathLayer({
        id: DECK_WORLD_LAYER_IDS.relationships,
        data: relationships,
        pickable: true,
        widthUnits: "pixels",
        getPath: (datum: DeckWorldRelationshipDatum) => datum.path,
        getWidth: (datum: DeckWorldRelationshipDatum) => (datum.selected ? 4 : 2),
        getColor: (datum: DeckWorldRelationshipDatum) =>
          datum.selected ? [255, 255, 255, 255] : [190, 190, 190, 190],
        parameters: { cullMode: "none" },
      }),
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.entities,
        data: entities,
        pickable: true,
        radiusUnits: "meters",
        radiusMinPixels: 5,
        radiusMaxPixels: 24,
        getPosition: (datum: DeckWorldEntityRenderDatum) => datum.position,
        getRadius: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? 120 + datum.visualWeight * 120 + Math.min(datum.clusterMembers.length, 20) * 15
            : 80 + datum.visualWeight * 120,
        getFillColor: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? [120, 170, 255, 235]
            : datum.selected
              ? [255, 255, 255, 255]
              : [220, 220, 220, 235],
        ...(this.#nodeDragSink
          ? {
              onDragStart: (info: DeckRuntimePickingInfo, event: DeckRuntimePointerEvent) =>
                this.#beginEntityDrag(info, event),
              onDrag: (info: DeckRuntimePickingInfo, event: DeckRuntimePointerEvent) =>
                this.#updateEntityDrag(info, event),
              onDragEnd: (_info: DeckRuntimePickingInfo, event: DeckRuntimePointerEvent) =>
                this.#endEntityDrag(event),
            }
          : {}),
      }),
    ];

    this.#deck.setProps({ layers });
  }

  #focusPosition(position: WorldRenderPosition | null): void {
    this.#assertAlive();
    if (!position) return;

    this.setCamera({
      ...this.#camera,
      longitude: position[0],
      latitude: position[1],
      zoom: Math.max(this.#camera.zoom, 5),
    });
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("DeckWorldSurface has been destroyed.");
  }
}
