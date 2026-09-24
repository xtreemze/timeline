import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import type { WorldNodeDragPosition } from "../../src/interaction/world-node-drag-controller.ts";
import { resolveWorldNodeDragPosition } from "../../src/interaction/world-node-drag-geometry.ts";
import {
  createWorldTouchHoldGate,
  WORLD_TOUCH_HOLD_MS,
} from "../../src/interaction/world-touch-hold.ts";
import { fitWorldCamera, globeOverviewCamera } from "../../src/layout/world-camera-fit.ts";
import {
  resolveWorldRenderPosition,
  type WorldRenderPosition,
} from "../../src/layout/world-geographic-position.ts";
import {
  declutterWorldLabels,
  directedEdgeArrowhead,
  edgeMidpoint,
  selectPrioritizedLabels,
  typicalLocalOffsetMeters,
  WORLD_PLACE_LABEL_FLOOR,
  worldLabelBudget,
  worldLabelTierFloor,
  worldPresentationOffsetScale,
} from "../../src/layout/world-semantic-presentation.ts";
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
import { iconPathData } from "../event-presentation.ts";
import { buildWorldAccessibleOutline, WorldAccessibleMirror } from "./world-accessible-mirror.ts";
import {
  clipWorldLines,
  type WorldBasemap,
  type WorldLineBounds,
  worldGraticule,
} from "./world-basemap.ts";
import { worldEntityIconName } from "./world-entity-icon.ts";

export const DECK_WORLD_LAYER_IDS = Object.freeze({
  places: "lum-world-places",
  relationships: "lum-world-relationships",
  entities: "lum-world-entities",
  relationshipDirections: "lum-world-relationship-directions",
  labels: "lum-world-labels",
  entityIcons: "lum-world-entity-icons",
  earth: "lum-world-earth",
  graticule: "lum-world-graticule",
  coastlines: "lum-world-coastlines",
  borders: "lum-world-borders",
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
  /** Marks the gesture handled so deck's controller does not also pan. */
  readonly stopPropagation?: () => void;
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
  createTextLayer?(props: Readonly<Record<string, unknown>>): unknown;
  createIconLayer?(props: Readonly<Record<string, unknown>>): unknown;
  createSolidPolygonLayer?(props: Readonly<Record<string, unknown>>): unknown;
  createDeck(props: Readonly<Record<string, unknown>>): DeckRuntimeInstance;
}

interface DeckWorldEntityDatum {
  readonly kind: "entity";
  readonly entityId: EntityId;
  readonly worldInstanceId: WorldInstanceId;
  readonly label?: string;
  readonly entityKind?: string;
  readonly position: WorldRenderPosition;
  readonly selected: boolean;
  readonly visualWeight: number;
}

interface DeckWorldRelationshipDatum {
  readonly kind: "relationship";
  readonly relationshipId: RelationshipId;
  readonly label?: string;
  readonly sourceInstanceId: WorldInstanceId;
  readonly targetInstanceId: WorldInstanceId;
  readonly sourceEntityId: EntityId;
  readonly targetEntityId: EntityId;
  readonly path: readonly [WorldRenderPosition, WorldRenderPosition];
  readonly selected: boolean;
  readonly temporalWeight: number;
}

interface DeckWorldPlaceDatum {
  readonly kind: "place";
  readonly placeId: PlaceId;
  readonly label?: string;
  readonly position: WorldRenderPosition;
  readonly selected: boolean;
}

/**
 * A world-space arrowhead on a rendered relationship. It carries the same
 * canonical relationship and directed source/target identity as the edge it
 * marks, so picking it resolves to that relationship.
 */
interface DeckWorldDirectionDatum {
  readonly kind: "relationship-direction";
  readonly relationshipId: RelationshipId;
  readonly sourceInstanceId: WorldInstanceId;
  readonly targetInstanceId: WorldInstanceId;
  readonly sourceEntityId: EntityId;
  readonly targetEntityId: EntityId;
  readonly edge: DeckWorldRelationshipDatum;
  readonly path: readonly [WorldRenderPosition, WorldRenderPosition, WorldRenderPosition];
  readonly selected: boolean;
}

type DeckWorldLabelDatum =
  | {
      readonly kind: "entity-label";
      readonly key: string;
      readonly entityId: EntityId;
      readonly worldInstanceId: WorldInstanceId;
      readonly text: string;
      readonly position: WorldRenderPosition;
      readonly emphasized: boolean;
    }
  | {
      readonly kind: "place-label";
      readonly key: string;
      readonly placeId: PlaceId;
      readonly text: string;
      readonly position: WorldRenderPosition;
      readonly emphasized: boolean;
    }
  | {
      readonly kind: "relationship-label";
      readonly key: string;
      readonly relationshipId: RelationshipId;
      readonly sourceInstanceId: WorldInstanceId;
      readonly targetInstanceId: WorldInstanceId;
      readonly text: string;
      readonly position: WorldRenderPosition;
      readonly emphasized: boolean;
    };

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

/**
 * Dense projections need semantic LOD earlier than sparse scenes: drawing
 * tens of thousands of individually pickable glyphs at a globe overview is
 * both unreadable and needlessly expensive. This threshold is presentation
 * only; canonical membership remains in each cluster and zooming to a
 * working scale restores the original world instances.
 */
const DENSE_CLUSTER_ENTITY_THRESHOLD = 25_000;
const DENSE_CLUSTER_ZOOM_THRESHOLD = 4.5;

export function shouldClusterEntityDatums(entityCount: number, zoom: number): boolean {
  return (
    zoom < CLUSTER_ZOOM_THRESHOLD ||
    (entityCount >= DENSE_CLUSTER_ENTITY_THRESHOLD && zoom < DENSE_CLUSTER_ZOOM_THRESHOLD)
  );
}

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
  if (!shouldClusterEntityDatums(entities.length, zoom)) return entities;

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

/**
 * Renderer-neutral, non-visual description of the currently active
 * projection (issue #445 Priority 6). Derived purely from `#projection`/
 * `#selection` — never from deck.gl/GPU layer state — so it cannot drift
 * from what is canonically true; it simply reflects the same state the
 * visual layers were built from.
 */
export interface AccessibleWorldEntity {
  readonly entityId: EntityId;
  readonly worldInstanceId: WorldInstanceId;
  readonly selected: boolean;
  readonly label?: string;
}

export interface AccessibleWorldPlace {
  readonly placeId: PlaceId;
  readonly selected: boolean;
  readonly label?: string;
}

export interface AccessibleWorldRelationship {
  readonly relationshipId: RelationshipId;
  readonly selected: boolean;
  readonly label?: string;
  readonly sourceEntityId: EntityId;
  readonly targetEntityId: EntityId;
}

export interface AccessibleWorldSnapshot {
  readonly entities: readonly AccessibleWorldEntity[];
  readonly places: readonly AccessibleWorldPlace[];
  readonly relationships: readonly AccessibleWorldRelationship[];
  readonly selection: WorldSelection | null;
}

function accessibleSnapshotSummary(snapshot: AccessibleWorldSnapshot): string {
  const parts = [
    `${snapshot.places.length} place${snapshot.places.length === 1 ? "" : "s"}`,
    `${snapshot.relationships.length} relationship${snapshot.relationships.length === 1 ? "" : "s"}`,
    `${snapshot.entities.length} entit${snapshot.entities.length === 1 ? "y" : "ies"}`,
  ];
  const base = `World view: ${parts.join(", ")} visible.`;
  const selection = snapshot.selection;
  if (!selection) return `${base} No selection.`;
  const label =
    selection.kind === "entity"
      ? snapshot.entities.find((entity) => entity.entityId === selection.id)?.label
      : selection.kind === "place"
        ? snapshot.places.find((place) => place.placeId === selection.id)?.label
        : snapshot.relationships.find(
            (relationship) => relationship.relationshipId === selection.id,
          )?.label;
  return `${base} Selected ${selection.kind} ${selection.id}${label ? ` (${label})` : ""}.`;
}

const BASE_CAPABILITIES = Object.freeze({
  globe: true,
  depthPicking: true,
  gpuFiltering: false,
});

/**
 * Colours chosen to read on the app's light paper background and on dark
 * hosts alike: saturated marks with a light outline, dark text with a light
 * halo. Selection uses one accent across every kind.
 */
const WORLD_PALETTE = Object.freeze({
  // Half-opacity earth so the host page shows through; geography is lines.
  earth: [214, 226, 236, 128],
  graticule: [100, 116, 139, 46],
  coastline: [71, 85, 105, 150],
  border: [100, 116, 139, 80],
  place: [120, 113, 108, 220],
  relationship: [71, 85, 105, 200],
  direction: [51, 65, 85, 235],
  entity: [37, 99, 235, 240],
  cluster: [124, 58, 237, 235],
  outline: [255, 255, 255, 230],
  selected: [217, 119, 6, 255],
  labelText: [15, 23, 42, 255],
  labelPlace: [68, 64, 60, 255],
  labelRelationship: [71, 85, 105, 255],
  labelEmphasis: [146, 64, 14, 255],
  labelHalo: [255, 255, 255, 220],
  icon: [255, 255, 255, 255],
} as const);

/** A single world-covering polygon slightly below the surface. */
const EARTH_POLYGON = Object.freeze([
  [
    [-180, 90, -2_000],
    [0, 90, -2_000],
    [180, 90, -2_000],
    [180, -90, -2_000],
    [0, -90, -2_000],
    [-180, -90, -2_000],
  ],
]);

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

function pointerTypeFromRuntimeEvent(event: DeckRuntimePointerEvent): string | null {
  const source = isRecord(event.srcEvent) ? event.srcEvent : null;
  const value = source?.["pointerType"];
  return typeof value === "string" ? value : null;
}

interface TouchPointerEvent {
  readonly pointerType?: unknown;
  readonly pointerId?: unknown;
  readonly offsetX?: unknown;
  readonly offsetY?: unknown;
}

function touchPointer(
  event: TouchPointerEvent,
): { readonly pointerId: number; readonly point: ScreenPoint } | null {
  if (event.pointerType !== "touch") return null;
  const pointerId = Number(event.pointerId);
  const x = event.offsetX;
  const y = event.offsetY;
  if (!Number.isInteger(pointerId) || typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { pointerId, point: Object.freeze({ x, y }) };
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

/** Zoom a focus action settles on: at least a regional view. */
function focusZoom(current: number): number {
  return Math.max(current, 5);
}

function anchorPosition(
  instance: ProjectedWorldInstance,
  offsetScale = 1,
): WorldRenderPosition | null {
  return resolveWorldRenderPosition(instance, offsetScale);
}

function positionEquals(left: WorldRenderPosition, right: WorldRenderPosition): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function placeDatumUnchanged(
  previous: DeckWorldPlaceDatum,
  position: WorldRenderPosition,
  selected: boolean,
  label: string | undefined,
): boolean {
  return (
    previous.selected === selected &&
    previous.label === label &&
    positionEquals(previous.position, position)
  );
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
): {
  readonly datums: readonly DeckWorldPlaceDatum[];
  readonly byId: Map<PlaceId, DeckWorldPlaceDatum>;
} {
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
      const label = anchor.label;
      const prior = previous.get(anchor.placeId);
      byPlace.set(
        anchor.placeId,
        prior && placeDatumUnchanged(prior, position, selected, label)
          ? prior
          : Object.freeze({
              kind: "place",
              placeId: anchor.placeId,
              ...(label === undefined ? {} : { label }),
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
  label: string | undefined,
  entityKind: string | undefined,
): boolean {
  return (
    previous.selected === selected &&
    previous.visualWeight === visualWeight &&
    previous.label === label &&
    previous.entityKind === entityKind &&
    positionEquals(previous.position, position)
  );
}

function entityDatums(
  instances: readonly ProjectedWorldInstance[],
  selection: WorldSelection | null,
  previous: ReadonlyMap<WorldInstanceId, DeckWorldEntityDatum>,
  offsetScale = 1,
): {
  readonly datums: readonly DeckWorldEntityDatum[];
  readonly byId: Map<WorldInstanceId, DeckWorldEntityDatum>;
} {
  const byId = new Map<WorldInstanceId, DeckWorldEntityDatum>();
  const result: DeckWorldEntityDatum[] = [];

  for (const instance of instances) {
    const position = anchorPosition(instance, offsetScale);
    if (!position) continue;
    const selected = selection?.kind === "entity" && selection.id === instance.canonicalId;
    const prior = previous.get(instance.id);
    const datum =
      prior &&
      entityDatumUnchanged(
        prior,
        position,
        selected,
        instance.visualWeight,
        instance.label,
        instance.kind,
      )
        ? prior
        : Object.freeze({
            kind: "entity" as const,
            entityId: instance.canonicalId,
            worldInstanceId: instance.id,
            ...(instance.label === undefined ? {} : { label: instance.label }),
            ...(instance.kind === undefined ? {} : { entityKind: instance.kind }),
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
  edge: WorldProjection["edges"][number],
  source: WorldRenderPosition,
  target: WorldRenderPosition,
  selected: boolean,
): boolean {
  return (
    previous.selected === selected &&
    previous.temporalWeight === edge.temporalWeight &&
    previous.label === edge.label &&
    previous.sourceInstanceId === edge.sourceInstanceId &&
    previous.targetInstanceId === edge.targetInstanceId &&
    positionEquals(previous.path[0], source) &&
    positionEquals(previous.path[1], target)
  );
}

interface WorldInstanceIndex {
  readonly positions: ReadonlyMap<WorldInstanceId, WorldRenderPosition>;
  readonly entityIds: ReadonlyMap<WorldInstanceId, EntityId>;
}

function relationshipDatums(
  projection: WorldProjection,
  index: WorldInstanceIndex,
  selection: WorldSelection | null,
  previous: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum>,
): {
  readonly datums: readonly DeckWorldRelationshipDatum[];
  readonly byId: Map<RelationshipId, DeckWorldRelationshipDatum>;
} {
  const byId = new Map<RelationshipId, DeckWorldRelationshipDatum>();
  const result: DeckWorldRelationshipDatum[] = [];

  for (const edge of projection.edges) {
    const source = index.positions.get(edge.sourceInstanceId);
    const target = index.positions.get(edge.targetInstanceId);
    const sourceEntityId = index.entityIds.get(edge.sourceInstanceId);
    const targetEntityId = index.entityIds.get(edge.targetInstanceId);
    if (!source || !target || !sourceEntityId || !targetEntityId) continue;

    const selected = selection?.kind === "relationship" && selection.id === edge.id;
    const prior = previous.get(edge.id);
    const datum =
      prior && relationshipDatumUnchanged(prior, edge, source, target, selected)
        ? prior
        : Object.freeze({
            kind: "relationship" as const,
            relationshipId: edge.id,
            ...(edge.label === undefined ? {} : { label: edge.label }),
            sourceInstanceId: edge.sourceInstanceId,
            targetInstanceId: edge.targetInstanceId,
            sourceEntityId,
            targetEntityId,
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

/**
 * Arrowheads for rendered relationships with a visible (non-zero) extent.
 * Like labels they follow the zoom budget: selected/focused edges always
 * keep their marker, then the most temporally relevant ones. Every edge
 * still carries its directed source/target identity in its own datum and in
 * the accessibility snapshot. A marker is reused by reference while its
 * relationship datum is.
 */
function directionDatums(
  relationships: readonly DeckWorldRelationshipDatum[],
  zoom: number,
  focus: WorldLabelFocus | null,
  previous: ReadonlyMap<RelationshipId, DeckWorldDirectionDatum>,
): {
  readonly datums: readonly DeckWorldDirectionDatum[];
  readonly byId: Map<RelationshipId, DeckWorldDirectionDatum>;
} {
  const byId = new Map<RelationshipId, DeckWorldDirectionDatum>();
  const result: DeckWorldDirectionDatum[] = [];
  const marked = selectPrioritizedLabels(relationships, {
    budget: worldLabelBudget(zoom),
    isPinned: (edge) =>
      edge.selected || (focus?.kind === "relationship" && focus.id === edge.relationshipId),
    importance: (edge) => edge.temporalWeight,
    key: (edge) => edge.relationshipId,
  });

  for (const edge of marked) {
    const prior = previous.get(edge.relationshipId);
    if (prior && prior.edge === edge) {
      byId.set(edge.relationshipId, prior);
      result.push(prior);
      continue;
    }
    const path = directedEdgeArrowhead(edge.path[0], edge.path[1]);
    if (!path) continue;
    const datum: DeckWorldDirectionDatum = Object.freeze({
      kind: "relationship-direction",
      relationshipId: edge.relationshipId,
      sourceInstanceId: edge.sourceInstanceId,
      targetInstanceId: edge.targetInstanceId,
      sourceEntityId: edge.sourceEntityId,
      targetEntityId: edge.targetEntityId,
      edge,
      path,
      selected: edge.selected,
    });
    byId.set(edge.relationshipId, datum);
    result.push(datum);
  }

  return { datums: Object.freeze(result), byId };
}

interface WorldLabelFocus {
  readonly kind: WorldSelection["kind"];
  readonly id: string;
}

function labelDatumUnchanged(
  previous: DeckWorldLabelDatum,
  text: string,
  position: WorldRenderPosition,
  emphasized: boolean,
): boolean {
  return (
    previous.text === text &&
    previous.emphasized === emphasized &&
    positionEquals(previous.position, position)
  );
}

/**
 * Semantic label LOD. Text comes only from renderer-neutral projection
 * metadata (instance/anchor/edge labels). A zoom-dependent budget limits
 * optional labels per kind, preferring higher visual weight; selected and
 * focused labels are always kept. While entities are clustered only pinned
 * entity labels are drawn, because individual positions are presentation-
 * merged into cluster glyphs.
 */
const LABEL_HALO_PX = 3;
/** Same family as the app shell (site/styles.css) instead of deck's monospace default. */
/**
 * The app's own face (site/timeline-view.css). deck bakes glyphs into an
 * atlas once per family, so the surface uses the fallback stack until the
 * web font has loaded and then switches, instead of caching a fallback.
 */
const APP_FONT_FAMILY = "Monaspace Krypton Timeline";
const LABEL_FALLBACK_FONT_FAMILY = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const GRATICULE = worldGraticule();

function labelSize(datum: DeckWorldLabelDatum): number {
  return datum.emphasized ? 15 : datum.kind === "place-label" ? 13 : 12;
}

/**
 * Entity labels start 10px right of their dot, place labels sit above their
 * anchor and relationship labels below the edge midpoint, so the three kinds
 * do not contend for the same space around a shared anchor. The vertical gap
 * grows with the label so an emphasized label does not evict its neighbours.
 */
function labelPixelOffset(datum: DeckWorldLabelDatum): [number, number] {
  if (datum.kind === "entity-label") return [10, 0];
  const gap = labelSize(datum) / 2 + 6;
  return datum.kind === "relationship-label" ? [0, gap] : [0, -gap];
}

function labelDatums(input: {
  readonly places: readonly DeckWorldPlaceDatum[];
  readonly relationships: readonly DeckWorldRelationshipDatum[];
  readonly entities: readonly DeckWorldEntityDatum[];
  readonly clustered: boolean;
  readonly zoom: number;
  readonly focus: WorldLabelFocus | null;
  readonly previous: ReadonlyMap<string, DeckWorldLabelDatum>;
}): {
  readonly datums: readonly DeckWorldLabelDatum[];
  readonly byKey: Map<string, DeckWorldLabelDatum>;
} {
  const budget = worldLabelBudget(input.zoom);
  const focused = (kind: WorldSelection["kind"], id: string) =>
    input.focus?.kind === kind && input.focus.id === id;
  const byKey = new Map<string, DeckWorldLabelDatum>();
  const result: DeckWorldLabelDatum[] = [];
  // Declutter priority: pinned first, then importance across kinds (entity
  // visual weight; places fixed mid-importance; relationships down-weighted),
  // with places, entities, relationships as the tie-break order.
  const priority = new Map<DeckWorldLabelDatum, readonly [number, number, number]>();
  const emit = (
    key: string,
    text: string,
    position: WorldRenderPosition,
    emphasized: boolean,
    create: () => DeckWorldLabelDatum,
    group = 0,
    importance = 0,
  ) => {
    const prior = input.previous.get(key);
    const datum =
      prior && labelDatumUnchanged(prior, text, position, emphasized) ? prior : create();
    byKey.set(key, datum);
    result.push(datum);
    priority.set(datum, [emphasized ? 0 : 1, -importance, group]);
  };

  const places = selectPrioritizedLabels(
    input.places.filter((place) => place.label),
    {
      budget: Math.max(budget, WORLD_PLACE_LABEL_FLOOR),
      isPinned: (place) => place.selected || focused("place", place.placeId),
      importance: () => 0,
      key: (place) => place.placeId,
    },
  );
  for (const place of places) {
    const text = place.label ?? "";
    const emphasized = place.selected || focused("place", place.placeId);
    const key = `place:${place.placeId}`;
    emit(
      key,
      text,
      place.position,
      emphasized,
      () =>
        Object.freeze({
          kind: "place-label",
          key,
          placeId: place.placeId,
          text,
          position: place.position,
          emphasized,
        }),
      0,
      0.5,
    );
  }

  const pinnedEntity = (entity: DeckWorldEntityDatum) =>
    entity.selected || focused("entity", entity.entityId);
  const entities = selectPrioritizedLabels(
    input.entities.filter((entity) => entity.label && (!input.clustered || pinnedEntity(entity))),
    {
      budget,
      isPinned: pinnedEntity,
      importance: (entity) => entity.visualWeight,
      key: (entity) => entity.worldInstanceId,
    },
  );
  for (const entity of entities) {
    const text = entity.label ?? "";
    const emphasized = pinnedEntity(entity);
    const key = `entity:${entity.worldInstanceId}`;
    emit(
      key,
      text,
      entity.position,
      emphasized,
      () =>
        Object.freeze({
          kind: "entity-label",
          key,
          entityId: entity.entityId,
          worldInstanceId: entity.worldInstanceId,
          text,
          position: entity.position,
          emphasized,
        }),
      1,
      entity.visualWeight,
    );
  }

  const pinnedRelationship = (relationship: DeckWorldRelationshipDatum) =>
    relationship.selected || focused("relationship", relationship.relationshipId);
  const relationships = selectPrioritizedLabels(
    input.relationships.filter(
      (relationship) =>
        relationship.label && (!input.clustered || pinnedRelationship(relationship)),
    ),
    {
      budget,
      isPinned: pinnedRelationship,
      importance: (relationship) => relationship.temporalWeight,
      key: (relationship) => relationship.relationshipId,
    },
  );
  for (const relationship of relationships) {
    const text = relationship.label ?? "";
    const emphasized = pinnedRelationship(relationship);
    const position = edgeMidpoint(relationship.path[0], relationship.path[1]);
    const key = `relationship:${relationship.relationshipId}`;
    emit(
      key,
      text,
      position,
      emphasized,
      () =>
        Object.freeze({
          kind: "relationship-label",
          key,
          relationshipId: relationship.relationshipId,
          sourceInstanceId: relationship.sourceInstanceId,
          targetInstanceId: relationship.targetInstanceId,
          text,
          position,
          emphasized,
        }),
      2,
      relationship.temporalWeight * 0.4,
    );
  }

  const ordered = [...result].sort((left, right) => {
    const a = priority.get(left) ?? [1, 3, 0];
    const b = priority.get(right) ?? [1, 3, 0];
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  });
  const kept = declutterWorldLabels(ordered, {
    zoom: worldLabelTierFloor(input.zoom),
    isPinned: (datum) => datum.emphasized,
    // Mirrors the TextLayer anchoring below; footprints approximate glyph
    // ink (0.6em monospace advance per character, 0.9em tall) plus the halo.
    measure: (datum) => {
      const size = labelSize(datum);
      const width = datum.text.length * size * 0.6 + LABEL_HALO_PX * 2;
      const [offsetX, offsetY] = labelPixelOffset(datum);
      return {
        longitude: datum.position[0],
        latitude: datum.position[1],
        width,
        height: size * 0.9,
        offsetX: datum.kind === "entity-label" ? offsetX + width / 2 : offsetX,
        offsetY,
      };
    },
  });
  const keptKeys = new Set(kept.map((datum) => datum.key));
  for (const key of [...byKey.keys()]) {
    if (!keptKeys.has(key)) byKey.delete(key);
  }
  return { datums: kept, byKey };
}

interface DeckWorldIconDescriptor {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mask: true;
}

const ICON_ATLAS_PX = 48;
const iconDescriptors = new Map<string, DeckWorldIconDescriptor>();

/**
 * One auto-packed, tintable (mask) icon per semantic icon name, drawn from
 * the app's shared icon geometry so the globe and timeline speak one visual
 * vocabulary. Memoized so deck packs each icon once.
 */
function entityIconDescriptor(name: string): DeckWorldIconDescriptor {
  const cached = iconDescriptors.get(name);
  if (cached) return cached;
  const paths = iconPathData(name)
    .map((d) => `<path d="${d}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${ICON_ATLAS_PX}" height="${ICON_ATLAS_PX}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const descriptor: DeckWorldIconDescriptor = Object.freeze({
    id: `lum-icon:${name}`,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    width: ICON_ATLAS_PX,
    height: ICON_ATLAS_PX,
    mask: true,
  });
  iconDescriptors.set(name, descriptor);
  return descriptor;
}

function screenPointFromDoubleClickEvent(event: DoubleClickEvent): ScreenPoint | null {
  const x = event.offsetX;
  const y = event.offsetY;
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

function selectionEquals(left: WorldSelection, right: WorldSelection | null): boolean {
  return right !== null && left.kind === right.kind && left.id === right.id;
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

  if (
    (object["kind"] === "relationship" || object["kind"] === "relationship-direction") &&
    typeof object["relationshipId"] === "string"
  ) {
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
    if (first && typeof first.entityId === "string" && typeof first.worldInstanceId === "string") {
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
  #controls: HTMLElement | null = null;
  #basemap: WorldBasemap | null = null;
  #visibleLabelCache: readonly DeckWorldLabelDatum[] = [];
  readonly #lineClipCache = new Map<
    string,
    {
      readonly key: string;
      readonly source: unknown;
      readonly lines: readonly (readonly WorldRenderPosition[])[];
    }
  >();
  #labelFontFamily = LABEL_FALLBACK_FONT_FAMILY;
  #projection: WorldProjection = Object.freeze({
    instances: Object.freeze([]),
    edges: Object.freeze([]),
  });
  #selection: WorldSelection | null = null;
  #camera: WorldCameraState;
  // True once the camera was chosen explicitly (constructor, setCamera,
  // focus, or user navigation); until then content auto-fits once.
  #cameraOwned = false;
  // True while the camera is the automatic content fit and nobody has moved
  // it since; a resize then re-fits (the first fit can run before layout).
  #autoFitted = false;
  #autoFitMode: "globe" | "content" = "globe";
  #offsetScale = 1;
  #spatialMode: WorldSpatialMode = "globe";
  #nodeDragSink: DeckWorldNodeDragSink | null = null;
  #activeDragPointerId: number | null = null;
  #destroyed = false;

  // Priority 3 (issue #445): previous frame's datum-by-id maps, kept so
  // #render can reuse unchanged datum object references across frames.
  #placeDatumCache: ReadonlyMap<PlaceId, DeckWorldPlaceDatum> = new Map();
  #entityDatumCache: ReadonlyMap<WorldInstanceId, DeckWorldEntityDatum> = new Map();
  #relationshipDatumCache: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum> = new Map();
  #directionDatumCache: ReadonlyMap<RelationshipId, DeckWorldDirectionDatum> = new Map();
  #labelDatumCache: ReadonlyMap<string, DeckWorldLabelDatum> = new Map();
  // The last canonical object the camera was focused on. Presentation-only:
  // it keeps that object's label through LOD and never alters selection.
  #focus: WorldLabelFocus | null = null;
  // Tracks which side of CLUSTER_ZOOM_THRESHOLD the last render used, so
  // camera-only zoom changes only trigger a re-render when clustering would
  // actually turn on/off (ordinary panning/zooming above the threshold stays
  // as cheap as before).
  #clusteredLastRender = false;
  // Same idea for the semantic label/marker LOD tier: a tier change only
  // matters when some kind has more candidates than the smaller budget.
  #labelBudgetLastRender = -1;
  #lodCandidateCountLastRender = 0;

  // Off-screen `aria-live` region (issue #445 Priority 6) mirroring the
  // Priority 3 `.sr-only` pattern already used elsewhere in the app (see
  // `site/app.ts`). Created lazily/defensively: a fake or non-DOM container
  // (as used by this file's own tests) simply leaves this null and the
  // surface still functions without it.
  readonly #liveRegion: HTMLElement | null;
  // Navigable non-WebGL outline of the same snapshot (issue #445): lists
  // places, directed relationships and canonical entities as buttons that
  // select/focus the canonical object on this surface.
  readonly #accessibleMirror: WorldAccessibleMirror | null;

  // Touch long-press gate (issue #445): on touch a one-finger drag pans the
  // globe unless the finger first rests on an entity for the hold threshold.
  readonly #touchHold = createWorldTouchHoldGate();
  #touchHoldTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

  readonly #handleTouchPointerDown = (event: TouchPointerEvent): void => {
    const touch = touchPointer(event);
    if (!touch) return;
    this.#touchHold.press(touch.pointerId, touch.point, Date.now());
    this.#clearTouchHoldTimer();
    if (!this.#touchHold.isPending(touch.pointerId)) {
      this.#setTouchDragState(null);
      return;
    }

    const hit = this.pick(touch.point);
    if (hit?.kind !== "entity") return;
    this.#setTouchDragState("holding");
    this.#touchHoldTimer = globalThis.setTimeout(() => {
      this.#touchHoldTimer = null;
      if (this.#destroyed || !this.#touchHold.isArmed(touch.pointerId, Date.now())) return;
      this.#setTouchDragState("active");
      this.setSelection(Object.freeze({ kind: "entity" as const, id: hit.entityId }));
    }, WORLD_TOUCH_HOLD_MS);
  };

  readonly #handleTouchPointerMove = (event: TouchPointerEvent): void => {
    const touch = touchPointer(event);
    if (!touch) return;
    this.#touchHold.move(touch.pointerId, touch.point, Date.now());
    if (!this.#touchHold.isPending(touch.pointerId) && this.#activeDragPointerId === null) {
      this.#clearTouchHoldTimer();
      this.#setTouchDragState(null);
    }
  };

  readonly #handleTouchPointerUp = (event: TouchPointerEvent): void => {
    const touch = touchPointer(event);
    if (!touch) return;
    this.#touchHold.release(touch.pointerId);
    this.#clearTouchHoldTimer();
    this.#setTouchDragState(null);
  };

  readonly #handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      this.#touchHold.release(event.pointerId);
      this.#clearTouchHoldTimer();
      this.#setTouchDragState(null);
    }
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

  // Keyboard selection-cycling equivalent (issue #445 Priority 4). deck.gl's
  // controller already provides keyboard camera pan (arrow keys) and zoom
  // (+/-) as a `keyboard: true` Controller default (see
  // `deckControllerOptions`), so this handler does not reimplement camera
  // movement. What deck.gl has no notion of is canonical selection, so
  // Tab/Shift+Tab cycle through renderable places/relationships/entities and
  // Enter "confirms" the current selection by focusing the camera on it.
  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    // The accessible outline owns its own keyboard semantics (native button
    // activation and Tab order); globe selection cycling must not hijack it.
    if (this.#accessibleMirror?.contains(event.target)) return;
    if (event.key === "Tab") {
      const candidates = this.#selectionCandidates();
      if (candidates.length === 0) return;
      event.preventDefault?.();

      const currentIndex = this.#selection
        ? candidates.findIndex((candidate) => selectionEquals(candidate, this.#selection))
        : -1;
      const delta = event.shiftKey ? -1 : 1;
      const nextIndex =
        (((currentIndex + delta) % candidates.length) + candidates.length) % candidates.length;
      this.setSelection(candidates[nextIndex] ?? null);
      return;
    }

    if (event.key === "Enter" && this.#selection) {
      event.preventDefault?.();
      const selection = this.#selection;
      if (selection.kind === "entity") this.focusEntity(selection.id);
      else if (selection.kind === "relationship") this.focusOccurrence(selection.id);
      else if (selection.kind === "place") this.focusPlace(selection.id);
    }
  };

  constructor(container: HTMLElement, runtime: DeckWorldRuntime, initialCamera?: WorldCameraState) {
    this.#runtime = runtime;
    this.#container = container;
    // A caller-chosen camera is authoritative; otherwise the first projected
    // content fits the camera once (see #autoFitCamera).
    this.#cameraOwned = initialCamera !== undefined;
    this.#camera = createWorldCameraState(initialCamera ?? DEFAULT_CAMERA);

    this.#globeView = runtime.createGlobeView({ id: "lum-world" });
    this.#localView = runtime.createMapView?.({ id: "lum-world-local" }) ?? null;
    this.#deck = runtime.createDeck({
      parent: container,
      views: [this.#globeView],
      controller: deckControllerOptions(),
      initialViewState: this.#camera,
      layers: [],
      onResize: () => {
        if (!this.#autoFitted || this.#destroyed) return;
        this.#reframe(this.#autoFitMode);
      },
      onViewStateChange: ({ viewState }: { readonly viewState: DeckRuntimeViewState }) => {
        const next = cameraFromRuntime(viewState, this.#camera);
        if (next) {
          this.#cameraOwned = true;
          this.#autoFitted = false;
          this.#camera = next;
          this.#syncSpatialMode();
          this.#reclusterIfZoomCrossedThreshold();
        }
      },
    });

    this.#container.addEventListener?.("pointercancel", this.#handlePointerCancel);
    this.#container.addEventListener?.(
      "pointerdown",
      this.#handleTouchPointerDown as EventListener,
      true,
    );
    this.#container.addEventListener?.(
      "pointermove",
      this.#handleTouchPointerMove as EventListener,
      true,
    );
    this.#container.addEventListener?.(
      "pointerup",
      this.#handleTouchPointerUp as EventListener,
      true,
    );
    this.#container.addEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
    this.#container.addEventListener?.("dblclick", this.#handleDoubleClick as EventListener);
    this.#container.addEventListener?.("keydown", this.#handleKeyDown as EventListener);

    this.#liveRegion = this.#createLiveRegion();
    this.#controls = this.#createControls();
    this.#loadAppFont();
    this.#accessibleMirror = this.#liveRegion
      ? WorldAccessibleMirror.create(this.#container, {
          setSelection: (selection) => this.setSelection(selection),
          focusSelection: (selection) => {
            if (selection.kind === "entity") this.focusEntity(selection.id);
            else if (selection.kind === "relationship") this.focusOccurrence(selection.id);
            else this.focusPlace(selection.id);
          },
        })
      : null;
  }

  /**
   * Visible camera controls (zoom in, zoom out, fit to content). Plain DOM
   * buttons so pointer, touch and keyboard users all get them; they only
   * change the derived camera.
   */
  #createControls(): HTMLElement | null {
    const doc = this.#container.ownerDocument;
    if (typeof doc?.createElement !== "function") return null;
    const bar = doc.createElement("div");
    if (typeof bar.append !== "function") return null;
    bar.className = "world-camera-controls";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Globe camera");
    const button = (label: string, text: string, action: () => void) => {
      const element = doc.createElement("button");
      element.type = "button";
      element.className = "world-camera-control";
      element.setAttribute("aria-label", label);
      element.title = label;
      element.textContent = text;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        action();
      });
      return element;
    };
    bar.append(
      button("Zoom in", "+", () => this.#zoomBy(1)),
      button("Zoom out", "\u2212", () => this.#zoomBy(-1)),
      button("Fit to content", "\u2922", () => this.fitToContent()),
      button("Show whole globe", "\u25CB", () => this.showWholeGlobe()),
    );
    this.#container.appendChild?.(bar);
    return bar;
  }

  #loadAppFont(): void {
    const fonts = this.#container.ownerDocument?.fonts;
    if (typeof fonts?.load !== "function") return;
    fonts
      .load(`700 16px "${APP_FONT_FAMILY}"`)
      .then((faces) => {
        if (this.#destroyed || faces.length === 0) return;
        this.#labelFontFamily = `"${APP_FONT_FAMILY}", ${LABEL_FALLBACK_FONT_FAMILY}`;
        this.#render();
      })
      .catch(() => {});
  }

  /** Vector reference geography (coastlines, borders) drawn under the graph. */
  setBasemap(basemap: WorldBasemap | null): void {
    this.#assertAlive();
    this.#basemap = basemap;
    this.#render();
  }

  #zoomBy(delta: number): void {
    this.setCamera({ ...this.#camera, zoom: this.#camera.zoom + delta });
  }

  /** Re-frames the camera on everything in the current projection. */
  fitToContent(): void {
    this.#reframe("content");
  }

  /** Shows the whole rotatable globe, turned towards the content. */
  showWholeGlobe(): void {
    this.#reframe("globe");
  }

  #reframe(mode: "globe" | "content"): void {
    this.#assertAlive();
    this.#cameraOwned = false;
    this.#autoFitCamera(mode);
    this.#reclusterIfZoomCrossedThreshold();
    this.#render();
  }

  #createLiveRegion(): HTMLElement | null {
    const doc = this.#container.ownerDocument;
    if (!doc?.createElement) return null;

    const region = doc.createElement("div");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("role", "status");
    region.className = "sr-only";
    this.#container.appendChild?.(region);
    return region;
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
    this.#autoFitCamera();
    this.#render();
  }

  /**
   * Automatic framing when the host supplied no camera: the whole globe,
   * turned so the content faces the viewer. "Fit to content" zooms in.
   */
  #autoFitCamera(mode: "globe" | "content" = "globe"): void {
    if (this.#cameraOwned) return;
    // Frame the true geography, not the magnified presentation offsets.
    const positions = this.#projection.instances
      .map((instance) => anchorPosition(instance))
      .filter((position): position is WorldRenderPosition => position !== null);
    if (positions.length === 0) return;
    const width = Number(this.#container.clientWidth) || 1024;
    const height = Number(this.#container.clientHeight) || 768;
    const fitted =
      mode === "content"
        ? fitWorldCamera(positions, { width, height }, this.#camera)
        : globeOverviewCamera(positions, { width, height }, this.#camera);
    if (!fitted) return;
    this.#cameraOwned = true;
    this.#autoFitted = true;
    this.#autoFitMode = mode;
    this.#camera = fitted;
    this.#syncSpatialMode();
    this.#deck.setProps({ viewState: this.#camera });
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
    this.#cameraOwned = true;
    this.#autoFitted = false;
    this.#camera = createWorldCameraState(camera);
    this.#syncSpatialMode();
    // When the zoom changes LOD or the offset magnification, layers and
    // camera go to deck in one update so no frame pairs the new camera with
    // stale positions.
    if (this.#zoomNeedsRender()) this.#render(true);
    else this.#deck.setProps({ viewState: this.#camera });
  }

  focusEntity(id: EntityId): void {
    this.#setLabelFocus("entity", id);
    // Aim at where the entity is drawn at the destination zoom, since local
    // offsets are magnified per zoom.
    const scale = this.#nextOffsetScale(focusZoom(this.#camera.zoom));
    const instance = this.#projection.instances.find((candidate) => candidate.canonicalId === id);
    this.#focusPosition(instance ? anchorPosition(instance, scale) : null);
  }

  focusOccurrence(id: RelationshipId): void {
    this.#setLabelFocus("relationship", id);
    this.#focusPosition(
      relationshipDatums(
        this.#projection,
        this.#instanceIndex(),
        this.#selection,
        this.#relationshipDatumCache,
      ).datums.find((datum) => datum.relationshipId === id)?.path[0] ?? null,
    );
  }

  focusPlace(id: PlaceId): void {
    this.#setLabelFocus("place", id);
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
          DECK_WORLD_LAYER_IDS.entityIcons,
          DECK_WORLD_LAYER_IDS.entities,
          DECK_WORLD_LAYER_IDS.relationshipDirections,
          DECK_WORLD_LAYER_IDS.relationships,
          DECK_WORLD_LAYER_IDS.places,
        ],
      }),
    );
  }

  /**
   * Renderer-neutral accessibility projection (issue #445 Priority 6):
   * derived purely from `#projection`/`#selection` — the same source the
   * visual deck.gl layers are built from — never from GPU/layer state, so
   * it cannot drift from what is canonically visible/selected. Reuses the
   * Priority 3 memoized datum caches as a cheap read rather than performing
   * a fresh full scan of `#projection.instances`.
   */
  getAccessibleSnapshot(): AccessibleWorldSnapshot {
    const places = placeDatums(
      this.#projection.instances,
      this.#selection,
      this.#placeDatumCache,
    ).datums.map((datum) =>
      Object.freeze({
        placeId: datum.placeId,
        selected: datum.selected,
        ...(datum.label === undefined ? {} : { label: datum.label }),
      }),
    );
    const relationships = relationshipDatums(
      this.#projection,
      this.#instanceIndex(),
      this.#selection,
      this.#relationshipDatumCache,
    ).datums.map((datum) =>
      Object.freeze({
        relationshipId: datum.relationshipId,
        selected: datum.selected,
        ...(datum.label === undefined ? {} : { label: datum.label }),
        sourceEntityId: datum.sourceEntityId,
        targetEntityId: datum.targetEntityId,
      }),
    );
    const entities = entityDatums(
      this.#projection.instances,
      this.#selection,
      this.#entityDatumCache,
      this.#offsetScale,
    ).datums.map((datum) =>
      Object.freeze({
        entityId: datum.entityId,
        worldInstanceId: datum.worldInstanceId,
        selected: datum.selected,
        ...(datum.label === undefined ? {} : { label: datum.label }),
      }),
    );

    return Object.freeze({
      entities: Object.freeze(entities),
      places: Object.freeze(places),
      relationships: Object.freeze(relationships),
      selection: this.#selection,
    });
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
    this.#controls?.remove();
    this.#controls = null;
    this.#container.removeEventListener?.("pointercancel", this.#handlePointerCancel);
    this.#container.removeEventListener?.(
      "pointerdown",
      this.#handleTouchPointerDown as EventListener,
      true,
    );
    this.#container.removeEventListener?.(
      "pointermove",
      this.#handleTouchPointerMove as EventListener,
      true,
    );
    this.#container.removeEventListener?.(
      "pointerup",
      this.#handleTouchPointerUp as EventListener,
      true,
    );
    this.#clearTouchHoldTimer();
    this.#touchHold.clear();
    this.#container.removeEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
    this.#container.removeEventListener?.("dblclick", this.#handleDoubleClick as EventListener);
    this.#container.removeEventListener?.("keydown", this.#handleKeyDown as EventListener);
    this.#liveRegion?.remove?.();
    this.#accessibleMirror?.destroy();
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

    const position = resolveWorldNodeDragPosition(this, instance, point, this.#offsetScale);
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
    // Touch drags only claim the node after the long-press gate armed;
    // otherwise deck's controller keeps the gesture as a globe pan.
    if (
      pointerTypeFromRuntimeEvent(event) === "touch" &&
      !this.#touchHold.isArmed(pointerId, Date.now())
    ) {
      return false;
    }

    const claimed = sink.begin(pointerId, target.instanceId, target.position);
    if (claimed) {
      this.#activeDragPointerId = pointerId;
      // deck.gl ignores the layer handler's return value; only a handled
      // event stops its controller from turning the same gesture into a pan.
      event.stopPropagation?.();
    }
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

  #clearTouchHoldTimer(): void {
    if (this.#touchHoldTimer === null) return;
    globalThis.clearTimeout(this.#touchHoldTimer);
    this.#touchHoldTimer = null;
  }

  #setTouchDragState(state: "holding" | "active" | null): void {
    const dataset = (this.#container as { dataset?: DOMStringMap }).dataset;
    if (!dataset) return;
    if (state === null) delete dataset["worldTouchDrag"];
    else dataset["worldTouchDrag"] = state;
  }

  #syncSpatialMode(): void {
    const nextMode =
      this.#localView === null ? "globe" : selectWorldSpatialMode(this.#camera, this.#spatialMode);
    if (nextMode === this.#spatialMode) return;

    // A node drag mid-flight has no well-defined meaning across a
    // globe<->local view swap (the drag's screen-space geometry is tied to
    // the view it started under), so a crossing cleanly cancels an ongoing
    // drag rather than leaving dangling pointer-capture/drag state.
    if (this.#activeDragPointerId !== null) {
      this.#nodeDragSink?.cancel("pointercancel");
      this.#activeDragPointerId = null;
    }

    this.#spatialMode = nextMode;
    // Camera continuity: pass the current camera explicitly alongside the
    // view swap so longitude/latitude/zoom/bearing/pitch carry over into the
    // new view rather than relying on it implicitly surviving a separate
    // setProps call.
    this.#deck.setProps({
      views: [nextMode === "local" ? this.#localView : this.#globeView],
      viewState: this.#camera,
    });
  }

  #reclusterIfZoomCrossedThreshold(): void {
    if (this.#zoomNeedsRender()) this.#render();
  }

  #zoomNeedsRender(): boolean {
    const clusteredNow = shouldClusterEntityDatums(this.#entityDatumCache.size, this.#camera.zoom);
    const budget = worldLabelBudget(this.#camera.zoom);
    const lodChanged =
      budget !== this.#labelBudgetLastRender &&
      Math.min(budget, this.#labelBudgetLastRender) < this.#lodCandidateCountLastRender;
    return (
      clusteredNow !== this.#clusteredLastRender ||
      lodChanged ||
      this.#nextOffsetScale() !== this.#offsetScale
    );
  }

  /**
   * Presentation magnification of local offsets for the current zoom (see
   * `worldPresentationOffsetScale`). Scenes without local offsets keep 1 so
   * zooming them never invalidates memoized datums.
   */
  #nextOffsetScale(zoom = this.#camera.zoom): number {
    const instances = this.#projection.instances;
    // Clustered overviews group true geography; magnifying offsets there
    // would scatter one place's entities across cluster cells.
    if (shouldClusterEntityDatums(instances.length, zoom)) return 1;
    return worldPresentationOffsetScale(
      zoom,
      instances.length,
      this.#typicalOffsetMeters(),
      this.#camera.latitude,
    );
  }

  #typicalOffsetCache: { readonly projection: WorldProjection; readonly meters: number } | null =
    null;

  #typicalOffsetMeters(): number {
    const projection = this.#projection;
    if (this.#typicalOffsetCache?.projection === projection) return this.#typicalOffsetCache.meters;
    const meters = typicalLocalOffsetMeters(
      projection.instances.flatMap((instance) =>
        instance.localOffset ? [instance.localOffset] : [],
      ),
    );
    this.#typicalOffsetCache = { projection, meters };
    return meters;
  }

  #selectionCandidates(): readonly WorldSelection[] {
    const entities = entityDatums(
      this.#projection.instances,
      this.#selection,
      this.#entityDatumCache,
      this.#offsetScale,
    ).datums;
    const relationships = relationshipDatums(
      this.#projection,
      this.#instanceIndex(),
      this.#selection,
      this.#relationshipDatumCache,
    ).datums;
    const places = placeDatums(
      this.#projection.instances,
      this.#selection,
      this.#placeDatumCache,
    ).datums;

    const candidates: WorldSelection[] = [];
    for (const place of places) {
      candidates.push(Object.freeze({ kind: "place" as const, id: place.placeId }));
    }
    for (const relationship of relationships) {
      candidates.push(
        Object.freeze({ kind: "relationship" as const, id: relationship.relationshipId }),
      );
    }
    for (const entity of entities) {
      candidates.push(Object.freeze({ kind: "entity" as const, id: entity.entityId }));
    }
    return Object.freeze(candidates);
  }

  #instanceIndex(): WorldInstanceIndex {
    const positions = new Map<WorldInstanceId, WorldRenderPosition>();
    const entityIds = new Map<WorldInstanceId, EntityId>();
    for (const instance of this.#projection.instances) {
      const position = anchorPosition(instance, this.#offsetScale);
      if (!position) continue;
      positions.set(instance.id, position);
      entityIds.set(instance.id, instance.canonicalId);
    }
    return { positions, entityIds };
  }

  #setLabelFocus(kind: WorldSelection["kind"], id: string): void {
    this.#assertAlive();
    if (this.#focus?.kind === kind && this.#focus.id === id) return;
    this.#focus = Object.freeze({ kind, id });
    this.#render();
  }

  #render(withCamera = false): void {
    this.#offsetScale = this.#nextOffsetScale();
    const index = this.#instanceIndex();
    const placeResult = placeDatums(
      this.#projection.instances,
      this.#selection,
      this.#placeDatumCache,
    );
    const relationshipResult = relationshipDatums(
      this.#projection,
      index,
      this.#selection,
      this.#relationshipDatumCache,
    );
    const entityResult = entityDatums(
      this.#projection.instances,
      this.#selection,
      this.#entityDatumCache,
      this.#offsetScale,
    );
    const places = placeResult.datums;
    const relationships = relationshipResult.datums;
    const entities = clusterEntityDatums(entityResult.datums, this.#camera.zoom);
    this.#placeDatumCache = placeResult.byId;
    this.#relationshipDatumCache = relationshipResult.byId;
    this.#entityDatumCache = entityResult.byId;
    this.#clusteredLastRender = shouldClusterEntityDatums(
      entityResult.datums.length,
      this.#camera.zoom,
    );
    this.#labelBudgetLastRender = worldLabelBudget(this.#camera.zoom);
    this.#lodCandidateCountLastRender = Math.max(
      places.length,
      relationships.length,
      entityResult.datums.length,
    );
    const directionResult = directionDatums(
      relationships,
      this.#camera.zoom,
      this.#focus,
      this.#directionDatumCache,
    );
    this.#directionDatumCache = directionResult.byId;
    // Kind icons follow the same LOD as labels: while clustered only pinned
    // entities keep an icon; otherwise a zoom-tier budget by visual weight.
    const focus = this.#focus;
    const pinnedEntity = (entity: DeckWorldEntityDatum) =>
      entity.selected || (focus?.kind === "entity" && focus.id === entity.entityId);
    const iconDatums = this.#runtime.createIconLayer
      ? selectPrioritizedLabels(
          entityResult.datums.filter(
            (entity) =>
              worldEntityIconName(entity.entityKind) !== null &&
              (!this.#clusteredLastRender || pinnedEntity(entity)),
          ),
          {
            budget: worldLabelBudget(this.#camera.zoom),
            isPinned: pinnedEntity,
            importance: (entity) => entity.visualWeight,
            key: (entity) => entity.worldInstanceId,
          },
        )
      : null;
    const labelResult = this.#runtime.createTextLayer
      ? labelDatums({
          places,
          relationships,
          entities: entityResult.datums,
          clustered: this.#clusteredLastRender,
          zoom: this.#camera.zoom,
          focus: this.#focus,
          previous: this.#labelDatumCache,
        })
      : null;
    this.#labelDatumCache = labelResult?.byKey ?? new Map();

    const layers = [
      // Earth base: orientation on light and dark hosts, and depth-occludes
      // the far side of the globe. Never pickable.
      ...(this.#runtime.createSolidPolygonLayer
        ? [
            this.#runtime.createSolidPolygonLayer({
              id: DECK_WORLD_LAYER_IDS.earth,
              data: EARTH_POLYGON,
              getPolygon: (polygon: unknown) => polygon,
              filled: true,
              stroked: false,
              pickable: false,
              getFillColor: WORLD_PALETTE.earth,
            }),
            // Vector geography lives on the earth base; without one there
            // is nothing to orient against.
            this.#runtime.createPathLayer({
              id: DECK_WORLD_LAYER_IDS.graticule,
              data: this.#visibleLines("graticule", GRATICULE),
              pickable: false,
              widthUnits: "pixels",
              getPath: (path: unknown) => path,
              getWidth: 1,
              getColor: WORLD_PALETTE.graticule,
              parameters: { cullMode: "none" },
            }),
            ...(this.#basemap
              ? [
                  this.#runtime.createPathLayer({
                    id: DECK_WORLD_LAYER_IDS.borders,
                    data: this.#visibleLines("borders", this.#basemap.borders),
                    pickable: false,
                    widthUnits: "pixels",
                    getPath: (path: unknown) => path,
                    getWidth: 0.75,
                    getColor: WORLD_PALETTE.border,
                    parameters: { cullMode: "none" },
                  }),
                  this.#runtime.createPathLayer({
                    id: DECK_WORLD_LAYER_IDS.coastlines,
                    data: this.#visibleLines("coastlines", this.#basemap.coastlines),
                    pickable: false,
                    widthUnits: "pixels",
                    getPath: (path: unknown) => path,
                    getWidth: 1.25,
                    getColor: WORLD_PALETTE.coastline,
                    parameters: { cullMode: "none" },
                  }),
                ]
              : []),
          ]
        : []),
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.places,
        data: places,
        pickable: true,
        // Screen-constant marks: metre radii shrank to specks at overview
        // zoom and ballooned into blobs close up.
        radiusUnits: "pixels",
        getPosition: (datum: DeckWorldPlaceDatum) => datum.position,
        getRadius: (datum: DeckWorldPlaceDatum) => (datum.selected ? 7 : 5),
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        getLineColor: WORLD_PALETTE.outline,
        getFillColor: (datum: DeckWorldPlaceDatum) =>
          datum.selected ? WORLD_PALETTE.selected : WORLD_PALETTE.place,
      }),
      this.#runtime.createPathLayer({
        id: DECK_WORLD_LAYER_IDS.relationships,
        data: relationships,
        pickable: true,
        widthUnits: "pixels",
        getPath: (datum: DeckWorldRelationshipDatum) => datum.path,
        getWidth: (datum: DeckWorldRelationshipDatum) => (datum.selected ? 4 : 2),
        getColor: (datum: DeckWorldRelationshipDatum) =>
          datum.selected ? WORLD_PALETTE.selected : WORLD_PALETTE.relationship,
        parameters: { cullMode: "none" },
      }),
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.entities,
        data: entities,
        pickable: true,
        radiusUnits: "pixels",
        getPosition: (datum: DeckWorldEntityRenderDatum) => datum.position,
        getRadius: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? 10 + Math.min(datum.clusterMembers.length, 20) * 0.5
            : (datum.selected ? 11 : 9) + datum.visualWeight * 2,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        getLineColor: WORLD_PALETTE.outline,
        getFillColor: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? WORLD_PALETTE.cluster
            : datum.selected
              ? WORLD_PALETTE.selected
              : WORLD_PALETTE.entity,
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
      ...(iconDatums && this.#runtime.createIconLayer
        ? [
            this.#runtime.createIconLayer({
              id: DECK_WORLD_LAYER_IDS.entityIcons,
              data: iconDatums,
              pickable: true,
              billboard: true,
              sizeUnits: "pixels",
              getPosition: (datum: DeckWorldEntityDatum) => datum.position,
              getIcon: (datum: DeckWorldEntityDatum) =>
                entityIconDescriptor(worldEntityIconName(datum.entityKind) ?? "note"),
              getSize: (datum: DeckWorldEntityDatum) => (datum.selected ? 14 : 11),
              getColor: () => WORLD_PALETTE.icon,
              // GlobeView culls back faces; billboarded icon quads vanish
              // without this (same as the label TextLayer).
              parameters: { cullMode: "none" },
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
          ]
        : []),
      this.#runtime.createPathLayer({
        id: DECK_WORLD_LAYER_IDS.relationshipDirections,
        data: directionResult.datums,
        pickable: true,
        widthUnits: "pixels",
        widthMinPixels: 2,
        jointRounded: true,
        capRounded: true,
        getPath: (datum: DeckWorldDirectionDatum) => datum.path,
        getWidth: (datum: DeckWorldDirectionDatum) => (datum.selected ? 5 : 3),
        getColor: (datum: DeckWorldDirectionDatum) =>
          datum.selected ? WORLD_PALETTE.selected : WORLD_PALETTE.direction,
        parameters: { cullMode: "none" },
      }),
      ...(labelResult && this.#runtime.createTextLayer
        ? [
            this.#runtime.createTextLayer({
              id: DECK_WORLD_LAYER_IDS.labels,
              data: this.#cameraFacingLabels(labelResult.datums),
              pickable: false,
              billboard: true,
              characterSet: "auto",
              sizeUnits: "pixels",
              fontFamily: this.#labelFontFamily,
              fontWeight: 700,
              fontSettings: { sdf: true, fontSize: 64, buffer: 8, radius: 16 },
              outlineWidth: LABEL_HALO_PX,
              outlineColor: WORLD_PALETTE.labelHalo,
              getText: (datum: DeckWorldLabelDatum) => datum.text,
              getPosition: (datum: DeckWorldLabelDatum) => datum.position,
              getSize: labelSize,
              getColor: (datum: DeckWorldLabelDatum) =>
                datum.emphasized
                  ? WORLD_PALETTE.labelEmphasis
                  : datum.kind === "place-label"
                    ? WORLD_PALETTE.labelPlace
                    : datum.kind === "relationship-label"
                      ? WORLD_PALETTE.labelRelationship
                      : WORLD_PALETTE.labelText,
              getTextAnchor: (datum: DeckWorldLabelDatum) =>
                datum.kind === "entity-label" ? "start" : "middle",
              getAlignmentBaseline: "center",
              getPixelOffset: labelPixelOffset,
              // GlobeView culls back faces; billboarded glyph quads are
              // wound the other way and vanish without this. Labels draw
              // over marks (far-side labels are filtered out above) so
              // entity dots never bite chunks out of the text.
              parameters: { cullMode: "none", depthCompare: "always" },
            }),
          ]
        : []),
    ];

    this.#deck.setProps(withCamera ? { layers, viewState: this.#camera } : { layers });
    this.#updateLiveRegion();
  }

  #updateLiveRegion(): void {
    if (!this.#liveRegion) return;
    const snapshot = this.getAccessibleSnapshot();
    this.#liveRegion.textContent = accessibleSnapshotSummary(snapshot);
    this.#accessibleMirror?.sync(buildWorldAccessibleOutline(snapshot));
  }

  #focusPosition(position: WorldRenderPosition | null): void {
    this.#assertAlive();
    if (!position) return;

    this.setCamera({
      ...this.#camera,
      longitude: position[0],
      latitude: position[1],
      zoom: focusZoom(this.#camera.zoom),
    });
  }

  /**
   * Far-side labels are dropped (labels draw without depth testing). The
   * previous array is reused while the visible set is unchanged so the
   * TextLayer is not rebuilt on every force-simulation frame.
   */
  #cameraFacingLabels(datums: readonly DeckWorldLabelDatum[]): readonly DeckWorldLabelDatum[] {
    const visible = datums.filter((datum) => this.#facesCamera(datum.position));
    const previous = this.#visibleLabelCache;
    if (
      previous.length === visible.length &&
      previous.every((datum, index) => datum === visible[index])
    ) {
      return previous;
    }
    this.#visibleLabelCache = visible;
    return visible;
  }

  /**
   * Reference lines limited to the neighbourhood of the view. The window is
   * quantised (to a quarter of its own size) so panning reuses the same
   * arrays and deck only re-uploads when the view has moved noticeably.
   */
  #visibleLines(
    id: string,
    lines: readonly (readonly WorldRenderPosition[])[],
  ): readonly (readonly WorldRenderPosition[])[] {
    const zoom = this.#camera.zoom;
    if (zoom < 3) return lines;
    const width = Number(this.#container.clientWidth) || 1024;
    const height = Number(this.#container.clientHeight) || 768;
    const degreesPerPixel = 360 / (512 * 2 ** zoom);
    const halfSpan = Math.max(width, height) * degreesPerPixel * 0.75;
    const quantum = Math.max(halfSpan / 4, 1e-3);
    const centerLongitude = Math.round(this.#camera.longitude / quantum) * quantum;
    const centerLatitude = Math.round(this.#camera.latitude / quantum) * quantum;
    const key = `${Math.round(zoom * 2)}:${centerLongitude}:${centerLatitude}`;
    const cached = this.#lineClipCache.get(id);
    if (cached && cached.key === key && cached.source === lines) return cached.lines;
    const wrap = (longitude: number) => ((((longitude + 180) % 360) + 360) % 360) - 180;
    const bounds: WorldLineBounds =
      halfSpan >= 180
        ? { west: -180, east: 180, south: -90, north: 90 }
        : {
            west: wrap(centerLongitude - halfSpan),
            east: wrap(centerLongitude + halfSpan),
            south: Math.max(-90, centerLatitude - halfSpan),
            north: Math.min(90, centerLatitude + halfSpan),
          };
    const clipped = clipWorldLines(lines, bounds);
    this.#lineClipCache.set(id, { key, source: lines, lines: clipped });
    return clipped;
  }

  /** True when a position lies on the camera-facing hemisphere. */
  #facesCamera(position: WorldRenderPosition): boolean {
    const radians = Math.PI / 180;
    const latitude = position[1] * radians;
    const cameraLatitude = this.#camera.latitude * radians;
    const deltaLongitude = (position[0] - this.#camera.longitude) * radians;
    return (
      Math.sin(latitude) * Math.sin(cameraLatitude) +
        Math.cos(latitude) * Math.cos(cameraLatitude) * Math.cos(deltaLongitude) >
      0.05
    );
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("DeckWorldSurface has been destroyed.");
  }
}
