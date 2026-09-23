import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import { resolveWorldNodeDragPosition } from "../../src/interaction/world-node-drag-geometry.ts";
import type { WorldNodeDragPosition } from "../../src/interaction/world-node-drag-controller.ts";
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
import {
  resolveWorldRenderPosition,
  type WorldRenderPosition,
} from "../../src/layout/world-geographic-position.ts";
import {
  selectWorldSpatialMode,
  type WorldSpatialMode,
} from "../../src/layout/world-spatial-mode.ts";
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

interface DeckRuntimePickingInfo {
  readonly object?: unknown;
  readonly layer?: { readonly id?: string };
  readonly x?: number;
  readonly y?: number;
}

interface DeckRuntimePointerEvent {
  readonly pointerId?: unknown;
  readonly srcEvent?: unknown;
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

function placeDatums(
  instances: readonly ProjectedWorldInstance[],
  selection: WorldSelection | null,
): readonly DeckWorldPlaceDatum[] {
  const byPlace = new Map<PlaceId, DeckWorldPlaceDatum>();

  for (const instance of instances) {
    for (const anchor of instance.geographicAnchors) {
      if (byPlace.has(anchor.placeId)) continue;
      byPlace.set(
        anchor.placeId,
        Object.freeze({
          kind: "place",
          placeId: anchor.placeId,
          position: Object.freeze([
            anchor.longitude,
            anchor.latitude,
            anchor.sourceAltitude ?? 0,
          ]) as WorldRenderPosition,
          selected: selection?.kind === "place" && selection.id === anchor.placeId,
        }),
      );
    }
  }

  return Object.freeze(
    [...byPlace.values()].sort((left, right) =>
      String(left.placeId).localeCompare(String(right.placeId)),
    ),
  );
}

function entityDatums(
  instances: readonly ProjectedWorldInstance[],
  selection: WorldSelection | null,
): readonly DeckWorldEntityDatum[] {
  const result: DeckWorldEntityDatum[] = [];

  for (const instance of instances) {
    const position = anchorPosition(instance);
    if (!position) continue;
    result.push(
      Object.freeze({
        kind: "entity",
        entityId: instance.canonicalId,
        worldInstanceId: instance.id,
        position,
        selected: selection?.kind === "entity" && selection.id === instance.canonicalId,
        visualWeight: instance.visualWeight,
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) =>
      String(left.worldInstanceId).localeCompare(String(right.worldInstanceId)),
    ),
  );
}

function relationshipDatums(
  projection: WorldProjection,
  positions: ReadonlyMap<WorldInstanceId, WorldRenderPosition>,
  selection: WorldSelection | null,
): readonly DeckWorldRelationshipDatum[] {
  const result: DeckWorldRelationshipDatum[] = [];

  for (const edge of projection.edges) {
    const source = positions.get(edge.sourceInstanceId);
    const target = positions.get(edge.targetInstanceId);
    if (!source || !target) continue;

    result.push(
      Object.freeze({
        kind: "relationship",
        relationshipId: edge.id,
        path: Object.freeze([source, target]) as readonly [
          WorldRenderPosition,
          WorldRenderPosition,
        ],
        selected: selection?.kind === "relationship" && selection.id === edge.id,
        temporalWeight: edge.temporalWeight,
      }),
    );
  }

  return Object.freeze(
    result.sort((left, right) =>
      String(left.relationshipId).localeCompare(String(right.relationshipId)),
    ),
  );
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
      controller: true,
      initialViewState: this.#camera,
      layers: [],
      onViewStateChange: ({ viewState }: { readonly viewState: DeckRuntimeViewState }) => {
        const next = cameraFromRuntime(viewState, this.#camera);
        if (next) {
          this.#camera = next;
          this.#syncSpatialMode();
        }
      },
    });

    this.#container.addEventListener?.("pointercancel", this.#handlePointerCancel);
    this.#container.addEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
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
  }

  focusEntity(id: EntityId): void {
    this.#focusPosition(
      entityDatums(this.#projection.instances, this.#selection).find(
        (datum) => datum.entityId === id,
      )?.position ?? null,
    );
  }

  focusOccurrence(id: RelationshipId): void {
    const positions = this.#positions();
    this.#focusPosition(
      relationshipDatums(this.#projection, positions, this.#selection).find(
        (datum) => datum.relationshipId === id,
      )?.path[0] ?? null,
    );
  }

  focusPlace(id: PlaceId): void {
    this.#focusPosition(
      placeDatums(this.#projection.instances, this.#selection).find((datum) => datum.placeId === id)
        ?.position ?? null,
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
      localPrecisionMode: this.#localView !== null,
      directNodeDrag: this.#nodeDragSink !== null,
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
    this.#deck.finalize();
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
    const places = placeDatums(this.#projection.instances, this.#selection);
    const relationships = relationshipDatums(this.#projection, positions, this.#selection);
    const entities = entityDatums(this.#projection.instances, this.#selection);

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
        getPosition: (datum: DeckWorldEntityDatum) => datum.position,
        getRadius: (datum: DeckWorldEntityDatum) => 80 + datum.visualWeight * 120,
        getFillColor: (datum: DeckWorldEntityDatum) =>
          datum.selected ? [255, 255, 255, 255] : [220, 220, 220, 235],
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
