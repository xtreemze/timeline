import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import {
  createWorldCameraState,
  createWorldTemporalWindow,
  type ScreenPoint,
  type WorldCameraState,
  type WorldHit,
  type WorldSelection,
  type WorldSurface,
  type WorldSurfaceCapabilities,
  type WorldTemporalWindow,
} from "../../src/layout/world-surface.ts";
import {
  resolveWorldRenderPosition,
  type WorldRenderPosition,
} from "../../src/layout/world-geographic-position.ts";
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
}

export interface DeckRuntimeInstance {
  setProps(props: Readonly<Record<string, unknown>>): void;
  pickObject(options: Readonly<Record<string, unknown>>): DeckRuntimePickingInfo | null;
  redraw(force?: boolean): void;
  finalize(): void;
}

export interface DeckWorldRuntime {
  createGlobeView(props: Readonly<Record<string, unknown>>): unknown;
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

const CAPABILITIES: WorldSurfaceCapabilities = Object.freeze({
  globe: true,
  depthPicking: true,
  directNodeDrag: false,
  gpuFiltering: false,
  localPrecisionMode: false,
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

function cameraFromRuntime(
  value: unknown,
  fallback: WorldCameraState,
): WorldCameraState | null {
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
    result.sort((left, right) => String(left.worldInstanceId).localeCompare(String(right.worldInstanceId))),
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
        path: Object.freeze([source, target]) as readonly [WorldRenderPosition, WorldRenderPosition],
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
  #projection: WorldProjection = Object.freeze({ instances: Object.freeze([]), edges: Object.freeze([]) });
  #selection: WorldSelection | null = null;
  #temporalWindow: WorldTemporalWindow = Object.freeze({ start: 0, end: 0 });
  #camera: WorldCameraState;
  #destroyed = false;

  constructor(
    container: HTMLElement,
    runtime: DeckWorldRuntime,
    initialCamera: WorldCameraState = DEFAULT_CAMERA,
  ) {
    this.#runtime = runtime;
    this.#camera = createWorldCameraState(initialCamera);

    const globeView = runtime.createGlobeView({ id: "lum-world" });
    this.#deck = runtime.createDeck({
      parent: container,
      views: [globeView],
      controller: true,
      initialViewState: this.#camera,
      layers: [],
      onViewStateChange: ({ viewState }: { readonly viewState: DeckRuntimeViewState }) => {
        const next = cameraFromRuntime(viewState, this.#camera);
        if (next) this.#camera = next;
      },
    });
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();
    this.#projection = projection;
    this.#render();
  }

  setTemporalWindow(window: WorldTemporalWindow): void {
    this.#assertAlive();
    this.#temporalWindow = createWorldTemporalWindow(window);
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
    this.#deck.setProps({ viewState: this.#camera });
  }

  focusEntity(id: EntityId): void {
    this.#focusPosition(
      entityDatums(this.#projection.instances, this.#selection).find((datum) => datum.entityId === id)
        ?.position ?? null,
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
    return CAPABILITIES;
  }

  refresh(): void {
    this.#assertAlive();
    this.#deck.redraw(true);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#deck.finalize();
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
