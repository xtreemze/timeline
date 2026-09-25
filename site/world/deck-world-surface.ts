import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import {
  surfaceActivationFromKeyboard,
  surfaceCursor,
} from "../../src/interaction/surface-input-policy.ts";
import type { WorldNodeDragPosition } from "../../src/interaction/world-node-drag-controller.ts";
import { resolveWorldNodeDragPosition } from "../../src/interaction/world-node-drag-geometry.ts";
import { worldPointerDragMayStart } from "../../src/interaction/world-pointer-policy.ts";
import {
  createWorldTouchHoldGate,
  WORLD_TOUCH_HOLD_MS,
} from "../../src/interaction/world-touch-hold.ts";
import { fitWorldCamera, globeOverviewCamera } from "../../src/layout/world-camera-fit.ts";
import {
  WORLD_CLUSTER_EDGE_RELEASE_MS,
  WORLD_CLUSTER_SETTLE_MS,
  type WorldClusterLifecyclePhase,
  worldClusterMutesMembers,
  worldClusterShowsActiveEdges,
  worldClusterShowsMembers,
  worldClusterShowsReleasingEdges,
  worldClusterWantsCollapsed,
} from "../../src/layout/world-cluster-transition.ts";
import type { WorldRelationshipRouteHint } from "../../src/layout/world-force-simulation.ts";
import {
  resolveWorldLocalLayoutPosition,
  resolveWorldRenderPosition,
  type WorldRenderPosition,
  worldPrimarySpatialAnchor,
} from "../../src/layout/world-geographic-position.ts";
import {
  WORLD_DARK_PALETTE,
  WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  WORLD_LIGHT_PALETTE,
  type WorldEdgeStyle,
  type WorldGraphPalette,
  type WorldNodeStyle,
  worldColorBytes,
  worldEdgeStyle,
  worldNodeStyle,
  worldNodeVisualFootprintRadiusPx,
  worldPlaceStyle,
} from "../../src/layout/world-graph-style.ts";
import {
  directedEdgePathArrowhead,
  edgePathMidpoint,
  medianNearestPlaceMeters,
  relationshipEdgePath,
  representativeWorldNodeRadiusPx,
  selectPrioritizedLabels,
  typicalLocalOffsetMeters,
  WORLD_CLUSTER_MERGE_PX,
  WORLD_ENTITY_FLOAT_PX,
  WORLD_LOCAL_GRAPH_MAX_PLACE_SHARE,
  WORLD_LOCAL_GRAPH_RADIUS_PX,
  WORLD_PLACE_LABEL_FLOOR,
  worldArrowLengthDegreesForNodeRadius,
  worldArrowStrokeWidthPxForNodeRadius,
  worldLabelBudget,
  worldLabelTierFloor,
  worldLocalRadiusPx,
  worldNodeClearanceDegreesForRadius,
  worldPixelsToDegrees,
  worldPlaceClusterRadiusPx,
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
  worldSelectionFromHit,
} from "../../src/layout/world-surface.ts";
import type {
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldPresentationStyle,
  WorldProjection,
} from "../../src/projection/world-projection.ts";
import {
  applyWorldProjectionDelta,
  type WorldProjectionDelta,
} from "../../src/projection/world-projection-delta.ts";
import { pulseHaptic, TimelineMotion } from "../timeline-motion.ts";
import { buildWorldAccessibleOutline, WorldAccessibleMirror } from "./world-accessible-mirror.ts";
import {
  clipWorldLines,
  type WorldBasemap,
  type WorldLineBounds,
  worldGraticule,
} from "./world-basemap.ts";
import { worldNodeMarker } from "./world-node-marker.ts";
import { WorldRenderTopologyIndex } from "./world-render-topology.ts";

export const DECK_WORLD_LAYER_IDS = Object.freeze({
  places: "lum-world-places",
  placeIcons: "lum-world-place-icons",
  relationships: "lum-world-relationships",
  releasingRelationships: "lum-world-releasing-relationships",
  entities: "lum-world-entities",
  relationshipDirections: "lum-world-relationship-directions",
  labels: "lum-world-labels",
  entityIcons: "lum-world-entity-icons",
  earth: "lum-world-earth",
  tethers: "lum-world-tethers",
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

export interface DeckWorldClusterForceSink {
  setClusteredPlaceIds(
    placeIds: readonly PlaceId[],
    detachedLinkPlaceIds?: readonly PlaceId[],
  ): void;
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
  createCollisionFilterExtension?(): unknown;
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
  /** Transient selection/hover neighborhood emphasis; never canonical state. */
  readonly emphasized: boolean;
  readonly visualWeight: number;
  readonly style?: WorldPresentationStyle;
}

interface DeckWorldRelationshipDatum {
  readonly kind: "relationship";
  readonly relationshipId: RelationshipId;
  readonly label?: string;
  readonly sourceInstanceId: WorldInstanceId;
  readonly targetInstanceId: WorldInstanceId;
  readonly sourceEntityId: EntityId;
  readonly targetEntityId: EntityId;
  readonly path: readonly WorldRenderPosition[];
  readonly selected: boolean;
  /** Incident to the selected/hovered node, or endpoint of the selected edge. */
  readonly emphasized: boolean;
  readonly temporalWeight: number;
  readonly style?: WorldPresentationStyle;
}

/**
 * Stable renderer row used only to preserve deck.gl attribute identity across
 * temporal activation changes. Canonical relationship truth stays in
 * WorldProjection; the state map below owns the temporary presentation value.
 */
interface DeckWorldTemporalRelationshipDatum {
  readonly kind: "relationship";
  readonly relationshipId: RelationshipId;
}

interface DeckWorldTemporalRelationshipState {
  readonly edge: DeckWorldRelationshipDatum;
  readonly temporalActive: boolean;
}

interface DeckWorldTether {
  readonly worldInstanceId: WorldInstanceId;
  readonly path: readonly [WorldRenderPosition, WorldRenderPosition];
}

interface DeckWorldPlaceDatum {
  readonly kind: "place";
  readonly placeId: PlaceId;
  readonly label?: string;
  readonly position: WorldRenderPosition;
  readonly selected: boolean;
  readonly emphasized: boolean;
  readonly style?: WorldPresentationStyle;
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
  readonly arrowLengthDegrees: number;
  readonly targetClearanceDegrees: number;
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
      readonly pixelOffset?: readonly [number, number];
    }
  | {
      readonly kind: "place-label";
      readonly key: string;
      readonly placeId: PlaceId;
      readonly text: string;
      readonly position: WorldRenderPosition;
      readonly emphasized: boolean;
      readonly pixelOffset?: readonly [number, number];
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
      readonly pixelOffset?: readonly [number, number];
    }
  | {
      readonly kind: "cluster-label";
      readonly key: string;
      readonly clusterId: string;
      readonly placeIds: readonly PlaceId[];
      readonly memberEntityIds: readonly EntityId[];
      readonly memberCount: number;
      readonly text: string;
      readonly position: WorldRenderPosition;
      readonly emphasized: boolean;
      readonly pixelOffset?: readonly [number, number];
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
  readonly placeIds?: readonly PlaceId[];
  readonly visualWeight: number;
}

export type DeckWorldEntityRenderDatum = DeckWorldEntityDatum | DeckWorldClusterDatum;

interface DeckWorldReleasingRelationshipSegment {
  readonly edge: DeckWorldRelationshipDatum;
  readonly path: readonly [WorldRenderPosition, WorldRenderPosition];
}

function releasingRelationshipSegments(
  edges: readonly DeckWorldRelationshipDatum[],
): readonly DeckWorldReleasingRelationshipSegment[] {
  const result: DeckWorldReleasingRelationshipSegment[] = [];
  for (const edge of edges) {
    for (let pointIndex = 0; pointIndex < edge.path.length - 1; pointIndex += 1) {
      const start = edge.path[pointIndex];
      const end = edge.path[pointIndex + 1];
      if (!start || !end) continue;
      const pieces = 12;
      for (let piece = 0; piece < pieces; piece += 2) {
        const at = (value: number): WorldRenderPosition => {
          const t = value / pieces;
          return Object.freeze([
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
            start[2] + (end[2] - start[2]) * t,
          ]) as WorldRenderPosition;
        };
        result.push(
          Object.freeze({
            edge,
            path: Object.freeze([at(piece), at(Math.min(pieces, piece + 1))]) as readonly [
              WorldRenderPosition,
              WorldRenderPosition,
            ],
          }),
        );
      }
    }
  }
  return Object.freeze(result);
}

/**
 * Below this globe zoom level, nearby entities remain grouped into clusters.
 * Release ordinary compact markers once a 6-degree cluster cell occupies
 * roughly 160px on screen (zoom ~= 4.25 at the equator). Authored large
 * markers remain clustered longer; deliberately small markers may resolve
 * slightly sooner without changing their touch targets.
 */
export const CLUSTER_ZOOM_THRESHOLD = 4.25;
/** Reference visible footprint radius for the compact default marker scale. */
const WORLD_CLUSTER_BASE_NODE_RADIUS_PX = 16;
/** Bound cluster bubbles so membership does not linearly inflate overview geometry. */
const WORLD_CLUSTER_MARKER_MIN_RADIUS_PX = 22;
const WORLD_CLUSTER_MARKER_MAX_RADIUS_PX = 30;

function worldClusterMarkerRadiusPx(memberRadiusPx: number, memberCount: number): number {
  const radius = Number.isFinite(memberRadiusPx) && memberRadiusPx > 0 ? memberRadiusPx : 0;
  const count = Number.isFinite(memberCount) ? Math.max(1, memberCount) : 1;
  return Math.max(
    WORLD_CLUSTER_MARKER_MIN_RADIUS_PX,
    Math.min(WORLD_CLUSTER_MARKER_MAX_RADIUS_PX, radius + 6 + Math.log2(count) * 1.5),
  );
}
/** Arrow geometry is world-space, so refresh it on fine-grained zoom steps. */
const WORLD_SCREEN_SCALE_ZOOM_STEPS_PER_LEVEL = 32;
const WORLD_CAMERA_FACING_STEP_DEGREES = 0.1;

function screenScaleZoomStep(zoom: number): number {
  return Math.round(zoom * WORLD_SCREEN_SCALE_ZOOM_STEPS_PER_LEVEL);
}

function cameraFacingStep(camera: WorldCameraState): string {
  return [
    Math.round(camera.longitude / WORLD_CAMERA_FACING_STEP_DEGREES),
    Math.round(camera.latitude / WORLD_CAMERA_FACING_STEP_DEGREES),
  ].join(":");
}

export function clusterZoomThresholdForNodeRadius(nodeRadiusPx: number): number {
  const radius =
    Number.isFinite(nodeRadiusPx) && nodeRadiusPx > 0
      ? nodeRadiusPx
      : WORLD_CLUSTER_BASE_NODE_RADIUS_PX;
  const sizeAdjustment = Math.max(
    -0.5,
    Math.min(1.5, Math.log2(radius / WORLD_CLUSTER_BASE_NODE_RADIUS_PX)),
  );
  return CLUSTER_ZOOM_THRESHOLD + sizeAdjustment;
}

/**
 * Dense local groups must stay collapsed longer than two-node groups. The
 * threshold grows logarithmically with canonical place membership so zooming
 * progressively resolves readable groups instead of releasing an entire dense
 * place as soon as the compact-marker threshold is crossed.
 */
export function clusterZoomThresholdForPlaceDensity(
  nodeRadiusPx: number,
  memberCount: number,
): number {
  const base = clusterZoomThresholdForNodeRadius(nodeRadiusPx);
  const count = Number.isFinite(memberCount) ? Math.max(1, Math.floor(memberCount)) : 1;
  if (count <= 3) return base;
  const densityAdjustment = Math.min(2.75, Math.log2(count / 3) * 0.8);
  return base + densityAdjustment;
}

/**
 * Dense projections need semantic LOD earlier than sparse scenes: drawing
 * tens of thousands of individually pickable glyphs at a globe overview is
 * both unreadable and needlessly expensive. This threshold is presentation
 * only; canonical membership remains in each cluster and zooming to a
 * working scale restores the original world instances.
 */
const OVERVIEW_CLUSTER_MIN_ENTITY_COUNT = 3;
const DENSE_CLUSTER_ENTITY_THRESHOLD = 25_000;
const DENSE_CLUSTER_ZOOM_THRESHOLD = 5.5;

/**
 * Presentation-only radial clearance for billboarded place markers. The
 * canonical/source altitude remains untouched; this converts a small,
 * screen-consistent lift into meters so the icon quad sits just above the
 * globe depth surface instead of being clipped through its lower half.
 */
const WORLD_PLACE_ICON_LIFT_PX = 2;
/** Pickup feedback is presentation-only and never feeds back into force state. */
const WORLD_DRAG_PICKUP_LIFT_PX = 7;
const WORLD_DRAG_PICKUP_FLASH_MS = 160;
const WORLD_DRAG_PICKUP_FLASH_SCALE = 1.16;

function liftedPositionByPixels(
  position: WorldRenderPosition,
  zoom: number,
  liftPx: number,
): WorldRenderPosition {
  const metersPerPixel = worldLocalRadiusPx(1, zoom, position[1]) ** -1;
  const liftMeters = Math.max(1, metersPerPixel * liftPx);
  return Object.freeze([position[0], position[1], position[2] + liftMeters]) as WorldRenderPosition;
}

function liftedPlaceIconPosition(position: WorldRenderPosition, zoom: number): WorldRenderPosition {
  return liftedPositionByPixels(position, zoom, WORLD_PLACE_ICON_LIFT_PX);
}

function liftedDraggedEntityPosition(
  position: WorldRenderPosition,
  zoom: number,
  dragging: boolean,
): WorldRenderPosition {
  return dragging ? liftedPositionByPixels(position, zoom, WORLD_DRAG_PICKUP_LIFT_PX) : position;
}

export function shouldClusterEntityDatums(
  entityCount: number,
  zoom: number,
  nodeRadiusPx = WORLD_CLUSTER_BASE_NODE_RADIUS_PX,
): boolean {
  if (entityCount < OVERVIEW_CLUSTER_MIN_ENTITY_COUNT) return false;
  const threshold = clusterZoomThresholdForNodeRadius(nodeRadiusPx);
  return (
    zoom < threshold ||
    (entityCount >= DENSE_CLUSTER_ENTITY_THRESHOLD &&
      zoom < Math.max(DENSE_CLUSTER_ZOOM_THRESHOLD, threshold))
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
  nodeRadiusPx = WORLD_CLUSTER_BASE_NODE_RADIUS_PX,
): readonly DeckWorldEntityRenderDatum[] {
  if (!shouldClusterEntityDatums(entities.length, zoom, nodeRadiusPx)) return entities;

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
 * Anchor-first clustering. With no merge radius, each authored place owns
 * its local cluster. At overview zoom, nearby place groups can be merged by
 * true proximity using a neighbouring-cell broad phase, so cluster membership
 * is stable under force movement and across ordinary grid-cell boundaries.
 * Membership stays canonical.
 */
export function clusterEntityDatumsByPlace(
  entities: readonly DeckWorldEntityDatum[],
  instances: readonly ProjectedWorldInstance[],
  mergeCellDegrees = 0,
): readonly DeckWorldEntityRenderDatum[] {
  type Anchor = ProjectedWorldInstance["geographicAnchors"][number];
  interface PlaceGroup {
    readonly placeId: PlaceId;
    readonly anchor: Anchor;
    readonly members: DeckWorldEntityDatum[];
  }

  const anchorOf = new Map<WorldInstanceId, Anchor>();
  for (const instance of instances) {
    const anchor = instance.geographicAnchors[0];
    if (anchor) anchorOf.set(instance.id, anchor);
  }

  const groupsByPlace = new Map<PlaceId, PlaceGroup>();
  const loose: DeckWorldEntityRenderDatum[] = [];
  for (const entity of entities) {
    const anchor = anchorOf.get(entity.worldInstanceId);
    if (!anchor) {
      loose.push(entity);
      continue;
    }
    const existing = groupsByPlace.get(anchor.placeId);
    if (existing) {
      existing.members.push(entity);
    } else {
      groupsByPlace.set(anchor.placeId, {
        placeId: anchor.placeId,
        anchor,
        members: [entity],
      });
    }
  }

  const groups = [...groupsByPlace.values()].sort((left, right) =>
    String(left.placeId).localeCompare(String(right.placeId)),
  );
  const neighbours = new Map<PlaceId, Set<PlaceId>>(
    groups.map((group) => [group.placeId, new Set<PlaceId>()] as const),
  );

  const wrappedLongitudeDelta = (from: number, to: number): number =>
    ((((to - from + 180) % 360) + 360) % 360) - 180;
  const angularDistanceDegrees = (left: Anchor, right: Anchor): number => {
    const meanLatitude = ((left.latitude + right.latitude) / 2) * (Math.PI / 180);
    const longitude =
      wrappedLongitudeDelta(left.longitude, right.longitude) * Math.cos(meanLatitude);
    const latitude = right.latitude - left.latitude;
    return Math.hypot(longitude, latitude);
  };

  if (mergeCellDegrees > 0 && Number.isFinite(mergeCellDegrees)) {
    const longitudeCellCount = Math.max(1, Math.ceil(360 / mergeCellDegrees));
    const grid = new Map<string, PlaceGroup[]>();
    const wrapCellX = (value: number): number =>
      ((value % longitudeCellCount) + longitudeCellCount) % longitudeCellCount;
    const cellFor = (anchor: Anchor): readonly [number, number] => {
      const longitude = (((anchor.longitude + 180) % 360) + 360) % 360;
      return Object.freeze([
        Math.min(longitudeCellCount - 1, Math.floor(longitude / mergeCellDegrees)),
        Math.floor((anchor.latitude + 90) / mergeCellDegrees),
      ]);
    };
    const keyFor = (x: number, y: number) => `${wrapCellX(x)}:${y}`;

    for (const group of groups) {
      const [cellX, cellY] = cellFor(group.anchor);
      const latitudeCosine = Math.max(
        0.1,
        Math.abs(Math.cos((group.anchor.latitude * Math.PI) / 180)),
      );
      const longitudeReach = Math.min(
        Math.ceil(longitudeCellCount / 2),
        Math.max(1, Math.ceil(1 / latitudeCosine)),
      );
      const visitedCells = new Set<string>();

      for (let x = cellX - longitudeReach; x <= cellX + longitudeReach; x += 1) {
        for (let y = cellY - 1; y <= cellY + 1; y += 1) {
          const key = keyFor(x, y);
          if (visitedCells.has(key)) continue;
          visitedCells.add(key);
          for (const other of grid.get(key) ?? []) {
            if (angularDistanceDegrees(group.anchor, other.anchor) > mergeCellDegrees) {
              continue;
            }
            neighbours.get(group.placeId)?.add(other.placeId);
            neighbours.get(other.placeId)?.add(group.placeId);
          }
        }
      }

      const ownKey = keyFor(cellX, cellY);
      const ownCell = grid.get(ownKey);
      if (ownCell) ownCell.push(group);
      else grid.set(ownKey, [group]);
    }
  }

  const components: PlaceGroup[][] = [];
  const visited = new Set<PlaceId>();
  for (const group of groups) {
    if (visited.has(group.placeId)) continue;
    const component: PlaceGroup[] = [];
    const pending: PlaceId[] = [group.placeId];
    while (pending.length > 0) {
      const placeId = pending.pop();
      if (!placeId || visited.has(placeId)) continue;
      const memberGroup = groupsByPlace.get(placeId);
      if (!memberGroup) continue;
      visited.add(placeId);
      component.push(memberGroup);
      for (const neighbour of neighbours.get(placeId) ?? []) {
        if (!visited.has(neighbour)) pending.push(neighbour);
      }
    }
    components.push(
      component.sort((left, right) => String(left.placeId).localeCompare(String(right.placeId))),
    );
  }

  const result: DeckWorldEntityRenderDatum[] = [...loose];
  for (const component of components) {
    const members = component.flatMap((group) => group.members);
    const [only] = members;
    if (members.length === 1 && only) {
      result.push(only);
      continue;
    }

    let longitudeSin = 0;
    let longitudeCos = 0;
    let weightedLatitude = 0;
    let weightedAltitude = 0;
    let totalWeight = 0;
    let totalVisualWeight = 0;
    for (const group of component) {
      const weight = group.members.length;
      const longitudeRadians = group.anchor.longitude * (Math.PI / 180);
      longitudeSin += Math.sin(longitudeRadians) * weight;
      longitudeCos += Math.cos(longitudeRadians) * weight;
      weightedLatitude += group.anchor.latitude * weight;
      weightedAltitude += (group.anchor.sourceAltitude ?? 0) * weight;
      totalWeight += weight;
      totalVisualWeight += group.members.reduce((sum, member) => sum + member.visualWeight, 0);
    }

    const [singlePlace] = component;
    const longitude =
      component.length === 1 && singlePlace
        ? singlePlace.anchor.longitude
        : Math.atan2(longitudeSin, longitudeCos) * (180 / Math.PI);
    const latitude =
      component.length === 1 && singlePlace
        ? singlePlace.anchor.latitude
        : weightedLatitude / totalWeight;
    const altitude =
      component.length === 1 && singlePlace
        ? (singlePlace.anchor.sourceAltitude ?? 0)
        : weightedAltitude / totalWeight;
    const placeIds = component.map((group) => String(group.placeId)).sort();
    const clusterMembers = members
      .map((member) =>
        Object.freeze({
          entityId: member.entityId,
          worldInstanceId: member.worldInstanceId,
        }),
      )
      .sort((left, right) =>
        String(left.worldInstanceId).localeCompare(String(right.worldInstanceId)),
      );

    result.push(
      Object.freeze({
        kind: "cluster",
        clusterId:
          placeIds.length === 1
            ? `cluster:place:${placeIds[0]}`
            : `cluster:places:${placeIds.join("|")}`,
        position: Object.freeze([longitude, latitude, altitude]) as WorldRenderPosition,
        clusterMembers: Object.freeze(clusterMembers),
        placeIds: Object.freeze(component.map((group) => group.placeId)),
        visualWeight: totalVisualWeight / totalWeight,
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

function instanceIndexFromEntities(entities: readonly DeckWorldEntityDatum[]): WorldInstanceIndex {
  const positions = new Map<WorldInstanceId, WorldRenderPosition>();
  const entityIds = new Map<WorldInstanceId, EntityId>();
  for (const entity of entities) {
    positions.set(entity.worldInstanceId, entity.position);
    entityIds.set(entity.worldInstanceId, entity.entityId);
  }
  return { positions, entityIds };
}

function scaleAlpha(color: Rgba, factor: number): Rgba {
  const alpha = Math.max(0, Math.min(1, factor));
  return [color[0], color[1], color[2], Math.round(color[3] * alpha)];
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

type Rgba = [number, number, number, number];

/** Theme-derived colours for the non-graph layers (basemap, labels, clusters). */
const WORLD_TETHER_WIDTH_PX = 0.6;
const WORLD_TETHER_ALPHA = 48;
/** Extra deck picking tolerance keeps compact edges and markers easy to acquire. */
export const WORLD_PICKING_RADIUS_PX = 8;
const WORLD_INACTIVE_EDGE_ALPHA = 72;
const WORLD_EMPHASIZED_EDGE_ALPHA = 242;
const WORLD_CAMERA_FACING_FADE_END = 0.08;

interface WorldThemeColors {
  readonly earth: Rgba;
  readonly graticule: Rgba;
  readonly coastline: Rgba;
  readonly border: Rgba;
  readonly cluster: Rgba;
  readonly clusterBorder: Rgba;
  readonly hit: Rgba;
  readonly tether: Rgba;
  readonly labelText: Rgba;
  readonly labelPlace: Rgba;
  readonly labelRelationship: Rgba;
  readonly labelEmphasis: Rgba;
  readonly labelHalo: Rgba;
}

function worldThemeColors(palette: WorldGraphPalette): WorldThemeColors {
  return Object.freeze({
    // Vector-only globe: the earth is invisible but still writes depth, so
    // the far hemisphere's lines and marks stay hidden behind it.
    earth: [0, 0, 0, 0] as Rgba,
    graticule: worldColorBytes(palette.muted, 60),
    coastline: worldColorBytes(palette.muted, 210),
    border: worldColorBytes(palette.muted, 110),
    // Clusters are an interaction/LOD envelope around a place, not a
    // replacement glyph. Keep their interior transparent so the authored
    // place marker remains visible, and use a neutral outline rather than
    // the story-purple fill that previously covered places.
    cluster: [0, 0, 0, 0] as Rgba,
    clusterBorder: worldColorBytes(palette.muted, 150),
    hit: [0, 0, 0, 0] as Rgba,
    tether: worldColorBytes(palette.muted, WORLD_TETHER_ALPHA),
    labelText: worldColorBytes(palette.ink),
    labelPlace: worldColorBytes(palette.muted),
    labelRelationship: worldColorBytes(palette.muted),
    labelEmphasis: worldColorBytes(palette.focus),
    labelHalo: worldColorBytes(palette.paper, 230),
  });
}

/**
 * Reads the host's theme tokens (the app's light/dark CSS custom
 * properties) from the container, falling back to the built-in light or
 * dark palette by the user's colour-scheme preference.
 */
function resolveWorldPalette(container: HTMLElement): WorldGraphPalette {
  const view = container.ownerDocument?.defaultView;
  const dark = Boolean(view?.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const fallback = dark ? WORLD_DARK_PALETTE : WORLD_LIGHT_PALETTE;
  const computed =
    typeof view?.getComputedStyle === "function" && typeof container.nodeType === "number"
      ? view.getComputedStyle(container)
      : null;
  const token = (name: string, value: string) => {
    const raw = computed?.getPropertyValue(`--${name}`).trim() ?? "";
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : value;
  };
  return Object.freeze({
    ink: token("ink", fallback.ink),
    muted: token("muted", fallback.muted),
    paper: token("paper", fallback.paper),
    focus: token("focus", fallback.focus),
    story: token("story", fallback.story),
    line: token("line", fallback.line),
  });
}

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
 * explicitly disabled because this surface wires its own double-tap/double-click
 * focus gesture (see `#handleDoubleClick`) instead.
 */
function deckControllerOptions(
  mode: WorldSpatialMode = "globe",
): Readonly<Record<string, unknown>> {
  const reducedMotion = prefersReducedMotion();
  return Object.freeze({
    dragPan: true,
    dragRotate: true,
    // Keep wheel input direct under reduced motion. Otherwise let deck
    // accumulate wheel deltas into a short smooth target so zoom carries the
    // same weighted, non-stepped feel as timeline navigation.
    scrollZoom: reducedMotion ? true : { smooth: true },
    touchZoom: true,
    multiTouchDrag: "rotate",
    keyboard: true,
    doubleClickZoom: false,
    // GlobeController has globe-only pointer-anchor math. A retained globe
    // controller can briefly observe the local MapView during a mode swap,
    // so local mode deliberately anchors zoom at the viewport center.
    zoomAround: mode === "globe" ? "pointer" : "center",
    // deck.gl accepts a duration here. Reuse the timeline's decay horizon so
    // a released globe/pinch gesture loses momentum on the same tactile time
    // scale instead of relying on deck.gl's unrelated default.
    inertia: reducedMotion ? false : TimelineMotion.INERTIA_TAU_MS,
  });
}

function sameDatumSequence(next: unknown, previous: unknown): boolean {
  if (next === previous) return true;
  if (!Array.isArray(next) || !Array.isArray(previous) || next.length !== previous.length) {
    return false;
  }
  return next.every((value, index) => value === previous[index]);
}

interface DeckDataDiffRange {
  readonly startRow: number;
  readonly endRow: number;
}

function entityRenderDatumKey(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.kind === "entity" && typeof value.worldInstanceId === "string") {
    return `entity:${value.worldInstanceId}`;
  }
  if (value.kind === "cluster" && typeof value.clusterId === "string") {
    return `cluster:${value.clusterId}`;
  }
  return null;
}

/**
 * deck.gl's experimental _dataDiff only rewrites the specified attribute
 * rows. It is safe here because entity/cluster rows have fixed vertex counts.
 * Structural changes fall back to a full data range.
 */
function changedEntityDatumRanges(next: unknown, previous: unknown): readonly DeckDataDiffRange[] {
  if (!Array.isArray(next) || !Array.isArray(previous)) return Object.freeze([]);
  if (next.length !== previous.length) {
    return next.length === 0
      ? Object.freeze([])
      : Object.freeze([{ startRow: 0, endRow: next.length }]);
  }

  const ranges: DeckDataDiffRange[] = [];
  let rangeStart = -1;
  for (let index = 0; index < next.length; index += 1) {
    const nextValue = next[index];
    const previousValue = previous[index];
    const nextKey = entityRenderDatumKey(nextValue);
    const previousKey = entityRenderDatumKey(previousValue);
    if (nextKey === null || previousKey === null || nextKey !== previousKey) {
      return next.length === 0
        ? Object.freeze([])
        : Object.freeze([{ startRow: 0, endRow: next.length }]);
    }

    if (nextValue !== previousValue) {
      if (rangeStart < 0) rangeStart = index;
      continue;
    }
    if (rangeStart >= 0) {
      ranges.push(Object.freeze({ startRow: rangeStart, endRow: index }));
      rangeStart = -1;
    }
  }
  if (rangeStart >= 0) {
    ranges.push(Object.freeze({ startRow: rangeStart, endRow: next.length }));
  }
  return Object.freeze(ranges);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNativeInteractiveKeyboardTarget(target: EventTarget | null): boolean {
  if (!isRecord(target)) return false;
  const tagName = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
  return (
    tagName === "button" ||
    tagName === "a" ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea" ||
    target.isContentEditable === true
  );
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
  const value = source?.pointerType;
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
  const value = source?.pointerId ?? event.pointerId;
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
  floatMeters = 0,
): WorldRenderPosition | null {
  return resolveWorldRenderPosition(instance, offsetScale, floatMeters);
}

function positionEquals(left: WorldRenderPosition, right: WorldRenderPosition): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

/** Styles are re-frozen per projection, so compare by content. */
function styleEqual(
  left: WorldPresentationStyle | undefined,
  right: WorldPresentationStyle | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function placeDatumUnchanged(
  previous: DeckWorldPlaceDatum,
  position: WorldRenderPosition,
  selected: boolean,
  emphasized: boolean,
  label: string | undefined,
  style?: WorldPresentationStyle,
): boolean {
  return (
    previous.selected === selected &&
    previous.emphasized === emphasized &&
    previous.label === label &&
    styleEqual(previous.style, style) &&
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
  emphasizedPlaceIds?: ReadonlySet<PlaceId>,
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
      const emphasized = emphasizedPlaceIds?.has(anchor.placeId) === true;
      const label = anchor.label;
      const prior = previous.get(anchor.placeId);
      byPlace.set(
        anchor.placeId,
        prior && placeDatumUnchanged(prior, position, selected, emphasized, label, anchor.style)
          ? prior
          : Object.freeze({
              kind: "place",
              placeId: anchor.placeId,
              ...(label === undefined ? {} : { label }),
              position,
              selected,
              emphasized,
              ...(anchor.style === undefined ? {} : { style: anchor.style }),
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
  emphasized: boolean,
  visualWeight: number,
  label: string | undefined,
  entityKind: string | undefined,
  style?: WorldPresentationStyle,
): boolean {
  return (
    styleEqual(previous.style, style) &&
    previous.selected === selected &&
    previous.emphasized === emphasized &&
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
  offsetScaleForInstance: (instance: ProjectedWorldInstance) => number = () => 1,
  floatMetersForInstance: (instance: ProjectedWorldInstance) => number = () => 0,
  emphasizedEntityIds?: ReadonlySet<EntityId>,
): {
  readonly datums: readonly DeckWorldEntityDatum[];
  readonly byId: Map<WorldInstanceId, DeckWorldEntityDatum>;
} {
  const byId = new Map<WorldInstanceId, DeckWorldEntityDatum>();
  const result: DeckWorldEntityDatum[] = [];

  for (const instance of instances) {
    const position = anchorPosition(
      instance,
      offsetScaleForInstance(instance),
      floatMetersForInstance(instance),
    );
    if (!position) continue;
    const selected = selection?.kind === "entity" && selection.id === instance.canonicalId;
    const emphasized = emphasizedEntityIds?.has(instance.canonicalId) === true;
    const prior = previous.get(instance.id);
    const datum =
      prior &&
      entityDatumUnchanged(
        prior,
        position,
        selected,
        emphasized,
        instance.visualWeight,
        instance.label,
        instance.kind,
        instance.style,
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
            emphasized,
            visualWeight: instance.visualWeight,
            ...(instance.style === undefined ? {} : { style: instance.style }),
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

function worldPathEquals(
  left: readonly WorldRenderPosition[],
  right: readonly WorldRenderPosition[],
): boolean {
  return (
    left.length === right.length &&
    left.every((position, index) => {
      const counterpart = right[index];
      return counterpart !== undefined && positionEquals(position, counterpart);
    })
  );
}

function relationshipDatumUnchanged(
  previous: DeckWorldRelationshipDatum,
  edge: WorldProjection["edges"][number],
  path: readonly WorldRenderPosition[],
  selected: boolean,
  emphasized: boolean,
): boolean {
  return (
    styleEqual(previous.style, edge.style) &&
    previous.selected === selected &&
    previous.emphasized === emphasized &&
    previous.temporalWeight === edge.temporalWeight &&
    previous.label === edge.label &&
    previous.sourceInstanceId === edge.sourceInstanceId &&
    previous.targetInstanceId === edge.targetInstanceId &&
    worldPathEquals(previous.path, path)
  );
}

interface WorldInstanceIndex {
  readonly positions: ReadonlyMap<WorldInstanceId, WorldRenderPosition>;
  readonly entityIds: ReadonlyMap<WorldInstanceId, EntityId>;
}

interface RelationshipRoutingContext {
  readonly routes: ReadonlyMap<RelationshipId, WorldRelationshipRouteHint>;
  offsetScaleForInstance(instance: ProjectedWorldInstance): number;
  floatMetersForInstance(instance: ProjectedWorldInstance): number;
  readonly activeDragInstanceId: WorldInstanceId | null;
}

function routedRelationshipPath(
  route: WorldRelationshipRouteHint,
  source: WorldRenderPosition,
  target: WorldRenderPosition,
  instanceById: ReadonlyMap<WorldInstanceId, ProjectedWorldInstance>,
  context: RelationshipRoutingContext,
): readonly WorldRenderPosition[] | null {
  if (
    route.points.length < 2 ||
    context.activeDragInstanceId === route.sourceId ||
    context.activeDragInstanceId === route.targetId
  ) {
    return null;
  }
  const sourceInstance = instanceById.get(route.sourceId);
  if (!sourceInstance) return null;
  const offsetScale = context.offsetScaleForInstance(sourceInstance);
  const floatMeters = context.floatMetersForInstance(sourceInstance);

  const liveSource = resolveWorldLocalLayoutPosition(
    sourceInstance,
    source,
    offsetScale,
    floatMeters,
  );
  const liveTarget = resolveWorldLocalLayoutPosition(
    sourceInstance,
    target,
    offsetScale,
    floatMeters,
  );
  const desiredSource = route.points[0];
  const desiredTarget = route.points[route.points.length - 1];
  if (!liveSource || !liveTarget || !desiredSource || !desiredTarget) return null;

  const sourceDeltaEast = liveSource.eastMeters - desiredSource.eastMeters;
  const sourceDeltaNorth = liveSource.northMeters - desiredSource.northMeters;
  const targetDeltaEast = liveTarget.eastMeters - desiredTarget.eastMeters;
  const targetDeltaNorth = liveTarget.northMeters - desiredTarget.northMeters;
  const points: WorldRenderPosition[] = [];

  for (const [index, point] of route.points.entries()) {
    const fraction = route.points.length <= 1 ? 0 : index / (route.points.length - 1);
    const oneMinusFraction = 1 - fraction;
    const projected = resolveWorldRenderPosition(
      {
        ...sourceInstance,
        localOffset: Object.freeze({
          eastMeters:
            point.eastMeters + sourceDeltaEast * oneMinusFraction + targetDeltaEast * fraction,
          northMeters:
            point.northMeters + sourceDeltaNorth * oneMinusFraction + targetDeltaNorth * fraction,
        }),
      },
      offsetScale,
      floatMeters,
    );
    if (!projected) return null;
    points.push(
      Object.freeze([
        projected[0],
        projected[1],
        source[2] + (target[2] - source[2]) * fraction,
      ]) as WorldRenderPosition,
    );
  }

  points[0] = source;
  points[points.length - 1] = target;
  return Object.freeze(points);
}

function relationshipDatums(
  projection: WorldProjection,
  index: WorldInstanceIndex,
  topology: WorldRenderTopologyIndex,
  selection: WorldSelection | null,
  previous: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum>,
  emphasizedRelationshipIds?: ReadonlySet<RelationshipId>,
  routing?: RelationshipRoutingContext,
): {
  readonly datums: readonly DeckWorldRelationshipDatum[];
  readonly byId: Map<RelationshipId, DeckWorldRelationshipDatum>;
} {
  const byId = new Map<RelationshipId, DeckWorldRelationshipDatum>();
  const result: DeckWorldRelationshipDatum[] = [];
  const instanceById = topology.instanceById;
  const lanes = topology.lanes;

  for (const edge of projection.edges) {
    const source = index.positions.get(edge.sourceInstanceId);
    const target = index.positions.get(edge.targetInstanceId);
    const sourceEntityId = index.entityIds.get(edge.sourceInstanceId);
    const targetEntityId = index.entityIds.get(edge.targetInstanceId);
    if (!source || !target || !sourceEntityId || !targetEntityId) continue;

    const selected = selection?.kind === "relationship" && selection.id === edge.id;
    const emphasized = emphasizedRelationshipIds?.has(edge.id) === true;
    const lane = lanes.get(edge.id) ?? 0;
    const route = routing?.routes.get(edge.id);
    const routedPath =
      route &&
      route.sourceId === edge.sourceInstanceId &&
      route.targetId === edge.targetInstanceId &&
      routing
        ? routedRelationshipPath(route, source, target, instanceById, routing)
        : null;
    const canonicalForward =
      String(edge.sourceInstanceId).localeCompare(String(edge.targetInstanceId)) <= 0;
    const canonicalPath = routedPath
      ? routedPath
      : relationshipEdgePath(
          canonicalForward ? source : target,
          canonicalForward ? target : source,
          lane,
        );
    const path = routedPath
      ? routedPath
      : canonicalForward
        ? canonicalPath
        : Object.freeze([...canonicalPath].reverse());
    const prior = previous.get(edge.id);
    const datum =
      prior && relationshipDatumUnchanged(prior, edge, path, selected, emphasized)
        ? prior
        : Object.freeze({
            kind: "relationship" as const,
            relationshipId: edge.id,
            ...(edge.label === undefined ? {} : { label: edge.label }),
            sourceInstanceId: edge.sourceInstanceId,
            targetInstanceId: edge.targetInstanceId,
            sourceEntityId,
            targetEntityId,
            path,
            selected,
            emphasized,
            temporalWeight: edge.temporalWeight,
            ...(edge.style === undefined ? {} : { style: edge.style }),
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
  arrowLengthDegreesForEdge: (edge: DeckWorldRelationshipDatum) => number,
  targetClearanceDegreesForEdge: (edge: DeckWorldRelationshipDatum) => number,
): {
  readonly datums: readonly DeckWorldDirectionDatum[];
  readonly byId: Map<RelationshipId, DeckWorldDirectionDatum>;
} {
  const byId = new Map<RelationshipId, DeckWorldDirectionDatum>();
  const result: DeckWorldDirectionDatum[] = [];
  const marked = selectPrioritizedLabels(relationships, {
    budget: worldLabelBudget(zoom),
    isPinned: (edge) => focus?.kind === "relationship" && focus.id === edge.relationshipId,
    importance: (edge) => edge.temporalWeight,
    key: (edge) => edge.relationshipId,
  });

  for (const edge of marked) {
    const arrowLengthDegrees = arrowLengthDegreesForEdge(edge);
    const targetClearanceDegrees = targetClearanceDegreesForEdge(edge);
    const prior = previous.get(edge.relationshipId);
    if (
      prior &&
      prior.edge === edge &&
      prior.arrowLengthDegrees === arrowLengthDegrees &&
      prior.targetClearanceDegrees === targetClearanceDegrees
    ) {
      byId.set(edge.relationshipId, prior);
      result.push(prior);
      continue;
    }
    const path = directedEdgePathArrowhead(edge.path, arrowLengthDegrees, targetClearanceDegrees);
    if (!path) continue;
    const datum: DeckWorldDirectionDatum = Object.freeze({
      kind: "relationship-direction",
      relationshipId: edge.relationshipId,
      sourceInstanceId: edge.sourceInstanceId,
      targetInstanceId: edge.targetInstanceId,
      sourceEntityId: edge.sourceEntityId,
      targetEntityId: edge.targetEntityId,
      edge,
      arrowLengthDegrees,
      targetClearanceDegrees,
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
 * optional labels per kind, preferring higher visual weight; explicit focus
 * may pin a label. Hover and selection leave the ordinary declutter result
 * stable, but an interacted entity whose label was suppressed by LOD or
 * collision placement is appended as an interaction override. While entities
 * are clustered individual labels are suppressed because their positions are
 * presentation-merged into clusters.
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
const LABEL_MARKER_GAP_PX = 8;

/** Close/detail zoom where a claimed node drag freezes the globe camera. */
export const WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM = 6;

export function worldGraphLabelSize(
  datum: Pick<DeckWorldLabelDatum, "kind" | "emphasized">,
): number {
  // Match the surrounding interface's compact 10–15px type scale. Semantic
  // kind may establish hierarchy, but interaction state never changes metrics,
  // so hover/selection cannot trigger declutter relocation.
  if (datum.kind === "place-label" || datum.kind === "cluster-label") return 14;
  if (datum.kind === "entity-label") return 13;
  return 12;
}

export function worldLabelCollisionPriority(
  datum: Pick<DeckWorldLabelDatum, "kind" | "emphasized">,
): number {
  const semanticBase =
    datum.kind === "cluster-label"
      ? 240
      : datum.kind === "place-label"
        ? 200
        : datum.kind === "entity-label"
          ? 120
          : 80;
  return datum.emphasized ? semanticBase + 700 : semanticBase;
}

const LABEL_PLACEMENT_CELL_PX = 128;
const LABEL_PLACEMENT_PADDING_PX = 4;

function labelFootprint(datum: DeckWorldLabelDatum): {
  readonly width: number;
  readonly height: number;
} {
  const size = worldGraphLabelSize(datum);
  return Object.freeze({
    width: datum.text.length * size * 0.6 + LABEL_HALO_PX * 2,
    height: size * 0.9 + LABEL_HALO_PX * 2,
  });
}

/**
 * Prefer the conventional position for each semantic kind, then try the
 * remaining compass positions before hiding anything. Entity labels clear the
 * node body; place and relationship labels start above/below their anchors.
 */
function labelOffsetCandidates(
  datum: DeckWorldLabelDatum,
  width: number,
  height: number,
  markerRadiusPx = 0,
): readonly (readonly [number, number])[] {
  const clearance = Math.max(0, markerRadiusPx) + LABEL_MARKER_GAP_PX;
  const horizontal = clearance + width / 2;
  const vertical = clearance + height / 2;
  const nearHorizontal = width / 2 + clearance;
  const nearVertical = height / 2 + clearance;

  if (datum.kind === "entity-label") {
    return Object.freeze([
      [horizontal, 0],
      [-horizontal, 0],
      [0, -vertical],
      [0, vertical],
      [horizontal, -vertical],
      [horizontal, vertical],
      [-horizontal, -vertical],
      [-horizontal, vertical],
    ]);
  }

  if (datum.kind === "place-label") {
    return Object.freeze([
      [0, -nearVertical],
      [nearHorizontal, 0],
      [-nearHorizontal, 0],
      [0, nearVertical],
      [nearHorizontal, -nearVertical],
      [-nearHorizontal, -nearVertical],
      [nearHorizontal, nearVertical],
      [-nearHorizontal, nearVertical],
    ]);
  }

  if (datum.kind === "cluster-label") {
    return Object.freeze([
      [0, nearVertical],
      [nearHorizontal, 0],
      [-nearHorizontal, 0],
      [0, -nearVertical],
      [nearHorizontal, nearVertical],
      [-nearHorizontal, nearVertical],
      [nearHorizontal, -nearVertical],
      [-nearHorizontal, -nearVertical],
    ]);
  }

  return Object.freeze([
    [0, nearVertical],
    [0, -nearVertical],
    [nearHorizontal, 0],
    [-nearHorizontal, 0],
    [nearHorizontal, nearVertical],
    [-nearHorizontal, nearVertical],
    [nearHorizontal, -nearVertical],
    [-nearHorizontal, -nearVertical],
  ]);
}

function labelPixelOffset(datum: DeckWorldLabelDatum): [number, number] {
  const own = datum.pixelOffset;
  if (own) return [own[0], own[1]];
  const { width, height } = labelFootprint(datum);
  const [x, y] = labelOffsetCandidates(datum, width, height, 0)[0] ?? [0, 0];
  return [x, y];
}

function withLabelPixelOffset(
  datum: DeckWorldLabelDatum,
  offset: readonly [number, number],
): DeckWorldLabelDatum {
  if (datum.pixelOffset?.[0] === offset[0] && datum.pixelOffset?.[1] === offset[1]) return datum;
  return Object.freeze({
    ...datum,
    pixelOffset: Object.freeze([offset[0], offset[1]]) as readonly [number, number],
  }) as DeckWorldLabelDatum;
}

/**
 * Collision-aware screen-space placement. Labels that cannot fit after eight
 * deterministic positions are suppressed at every zoom level. Zoom itself
 * increases physical separation, so labels naturally reappear as the topology
 * becomes readable; hover/selection overrides are appended separately.
 */
function placeWorldLabelDatums(
  datums: readonly DeckWorldLabelDatum[],
  zoom: number,
  markerRadiusPx: (datum: DeckWorldLabelDatum) => number,
): readonly DeckWorldLabelDatum[] {
  const tierZoom = worldLabelTierFloor(zoom);
  const scale = (512 / 360) * 2 ** Math.max(0, tierZoom);
  interface Box {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  }
  const grid = new Map<string, Box[]>();
  const cells = (box: Box): readonly string[] => {
    const keys: string[] = [];
    for (
      let x = Math.floor(box.left / LABEL_PLACEMENT_CELL_PX);
      x <= Math.floor(box.right / LABEL_PLACEMENT_CELL_PX);
      x += 1
    ) {
      for (
        let y = Math.floor(box.top / LABEL_PLACEMENT_CELL_PX);
        y <= Math.floor(box.bottom / LABEL_PLACEMENT_CELL_PX);
        y += 1
      ) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  };
  const overlaps = (left: Box, right: Box) =>
    left.left < right.right &&
    right.left < left.right &&
    left.top < right.bottom &&
    right.top < left.bottom;

  const placed: DeckWorldLabelDatum[] = [];
  for (const datum of datums) {
    const footprint = labelFootprint(datum);
    const latitudeScale = Math.max(0.2, Math.cos((datum.position[1] * Math.PI) / 180));
    const anchorX = datum.position[0] * scale * latitudeScale;
    const anchorY = -datum.position[1] * scale;
    const candidates = labelOffsetCandidates(
      datum,
      footprint.width,
      footprint.height,
      markerRadiusPx(datum),
    );
    let chosen: readonly [number, number] | null = null;
    let chosenBox: Box | null = null;

    for (const offset of candidates) {
      const centerX = anchorX + offset[0];
      const centerY = anchorY + offset[1];
      const box: Box = {
        left: centerX - footprint.width / 2 - LABEL_PLACEMENT_PADDING_PX,
        right: centerX + footprint.width / 2 + LABEL_PLACEMENT_PADDING_PX,
        top: centerY - footprint.height / 2 - LABEL_PLACEMENT_PADDING_PX,
        bottom: centerY + footprint.height / 2 + LABEL_PLACEMENT_PADDING_PX,
      };
      const keys = cells(box);
      if (!keys.some((key) => grid.get(key)?.some((other) => overlaps(box, other)))) {
        chosen = offset;
        chosenBox = box;
        break;
      }
    }

    if (!chosen || !chosenBox) continue;

    const placedDatum = withLabelPixelOffset(datum, chosen);
    placed.push(placedDatum);
    for (const key of cells(chosenBox)) {
      const bucket = grid.get(key);
      if (bucket) bucket.push(chosenBox);
      else grid.set(key, [chosenBox]);
    }
  }

  return Object.freeze(placed);
}

function labelDatums(input: {
  readonly places: readonly DeckWorldPlaceDatum[];
  readonly clusters: readonly DeckWorldClusterDatum[];
  readonly relationships: readonly DeckWorldRelationshipDatum[];
  readonly entities: readonly DeckWorldEntityDatum[];
  readonly clustered: boolean;
  readonly zoom: number;
  readonly focus: WorldLabelFocus | null;
  readonly selection: WorldSelection | null;
  readonly hoverSelection: WorldSelection | null;
  readonly hoveredClusterId: string | null;
  readonly previous: ReadonlyMap<string, DeckWorldLabelDatum>;
  readonly entityMarkerRadiusPx: (instanceId: WorldInstanceId) => number;
  readonly placeMarkerRadiusPx: (placeId: PlaceId) => number;
  readonly clusterMarkerRadiusPx: (cluster: DeckWorldClusterDatum) => number;
}): {
  readonly datums: readonly DeckWorldLabelDatum[];
  readonly byKey: Map<string, DeckWorldLabelDatum>;
} {
  const budget = worldLabelBudget(input.zoom);
  const focused = (kind: WorldSelection["kind"], id: string) =>
    input.focus?.kind === kind && input.focus.id === id;
  const byKey = new Map<string, DeckWorldLabelDatum>();
  const result: DeckWorldLabelDatum[] = [];
  const markerRadiusByKey = new Map<string, number>();
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
    // Interaction emphasis must not affect label ordering or placement.
    priority.set(datum, [1, -importance, group]);
  };

  const placeById = new Map(input.places.map((place) => [place.placeId, place] as const));
  const clusteredPlaceIds = new Set<PlaceId>();
  for (const cluster of input.clusters) {
    for (const placeId of cluster.placeIds ?? []) clusteredPlaceIds.add(placeId);
  }
  const clusterInteracted = (cluster: DeckWorldClusterDatum): boolean => {
    if (input.hoveredClusterId === cluster.clusterId) return true;
    const placeIds = cluster.placeIds ?? [];
    if (
      placeIds.some(
        (placeId) =>
          (input.selection?.kind === "place" && input.selection.id === placeId) ||
          (input.hoverSelection?.kind === "place" && input.hoverSelection.id === placeId) ||
          (input.focus?.kind === "place" && input.focus.id === placeId),
      )
    ) {
      return true;
    }
    return cluster.clusterMembers.some(
      (member) =>
        (input.selection?.kind === "entity" && input.selection.id === member.entityId) ||
        (input.hoverSelection?.kind === "entity" && input.hoverSelection.id === member.entityId) ||
        (input.focus?.kind === "entity" && input.focus.id === member.entityId),
    );
  };
  const clusterLabelText = (cluster: DeckWorldClusterDatum): string => {
    const placeIds = cluster.placeIds ?? [];
    const memberCount = cluster.clusterMembers.length;
    if (placeIds.length === 1) {
      const [placeId] = placeIds;
      const place = placeId ? placeById.get(placeId) : undefined;
      if (place?.label) {
        return `${place.label} · ${memberCount} node${memberCount === 1 ? "" : "s"}`;
      }
    }
    if (placeIds.length > 1) return `${placeIds.length} places · ${memberCount} nodes`;
    return `${memberCount} node${memberCount === 1 ? "" : "s"}`;
  };
  const clusters = selectPrioritizedLabels(input.clusters, {
    budget,
    isPinned: clusterInteracted,
    importance: (cluster) => cluster.clusterMembers.length + cluster.visualWeight,
    key: (cluster) => cluster.clusterId,
  });
  for (const cluster of clusters) {
    const text = clusterLabelText(cluster);
    const emphasized = clusterInteracted(cluster);
    const key = `cluster:${cluster.clusterId}`;
    markerRadiusByKey.set(key, input.clusterMarkerRadiusPx(cluster));
    emit(
      key,
      text,
      cluster.position,
      emphasized,
      () =>
        Object.freeze({
          kind: "cluster-label",
          key,
          clusterId: cluster.clusterId,
          placeIds: Object.freeze([...(cluster.placeIds ?? [])]),
          memberEntityIds: Object.freeze(cluster.clusterMembers.map((member) => member.entityId)),
          memberCount: cluster.clusterMembers.length,
          text,
          position: cluster.position,
          emphasized,
        }),
      -1,
      cluster.clusterMembers.length + cluster.visualWeight,
    );
  }

  const places = selectPrioritizedLabels(
    input.places.filter(
      (place) => place.label && (!input.clustered || !clusteredPlaceIds.has(place.placeId)),
    ),
    {
      budget: Math.max(budget, WORLD_PLACE_LABEL_FLOOR),
      isPinned: (place) => focused("place", place.placeId),
      importance: () => 0,
      key: (place) => place.placeId,
    },
  );
  for (const place of places) {
    const text = place.label ?? "";
    const emphasized = focused("place", place.placeId);
    const key = `place:${place.placeId}`;
    markerRadiusByKey.set(key, input.placeMarkerRadiusPx(place.placeId));
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

  const pinnedEntity = (entity: DeckWorldEntityDatum) => focused("entity", entity.entityId);
  const entities = selectPrioritizedLabels(
    input.entities.filter((entity) => entity.label && !input.clustered),
    {
      budget,
      isPinned: (entity) => focused("entity", entity.entityId),
      importance: (entity) => entity.visualWeight,
      key: (entity) => entity.worldInstanceId,
    },
  );
  for (const entity of entities) {
    const text = entity.label ?? "";
    const emphasized = pinnedEntity(entity);
    const key = `entity:${entity.worldInstanceId}`;
    markerRadiusByKey.set(key, input.entityMarkerRadiusPx(entity.worldInstanceId));
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
    focused("relationship", relationship.relationshipId);
  const relationships = selectPrioritizedLabels(
    input.relationships.filter((relationship) => relationship.label && !input.clustered),
    {
      // Relationship predicates are semantic graph content, but they must
      // obey the same zoom budget at every scale. Dense local graphs otherwise
      // become unreadable as soon as detail zoom is reached.
      budget,
      isPinned: (relationship) => focused("relationship", relationship.relationshipId),
      importance: (relationship) => relationship.temporalWeight,
      key: (relationship) => relationship.relationshipId,
    },
  );
  for (const relationship of relationships) {
    const text = relationship.label ?? "";
    const emphasized = pinnedRelationship(relationship);
    const position = edgePathMidpoint(relationship.path);
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
  const placed = placeWorldLabelDatums(
    ordered,
    input.zoom,
    (datum) => markerRadiusByKey.get(datum.key) ?? 0,
  );
  const placedByKey = new Map(placed.map((datum) => [datum.key, datum] as const));

  // Interaction is an explicit exception to ordinary label LOD. Append only
  // labels that the stable base pass omitted, so labels already visible keep
  // their datum identity and placement while the active object can identify
  // itself without forcing the whole dense scene back into view.
  const interactionLabels: DeckWorldLabelDatum[] = [];
  const interactionPlaceIds = new Set<PlaceId>();
  if (input.selection?.kind === "place") interactionPlaceIds.add(input.selection.id);
  if (input.hoverSelection?.kind === "place") interactionPlaceIds.add(input.hoverSelection.id);
  if (input.focus?.kind === "place") interactionPlaceIds.add(input.focus.id);
  for (const place of input.places) {
    if (place.emphasized) interactionPlaceIds.add(place.placeId);
  }
  for (const place of input.places) {
    if (!place.label || !interactionPlaceIds.has(place.placeId)) continue;
    const key = `place:${place.placeId}`;
    if (placedByKey.has(key)) continue;
    const text = place.label;
    const prior = input.previous.get(key);
    const datum =
      prior && labelDatumUnchanged(prior, text, place.position, true)
        ? prior
        : Object.freeze({
            kind: "place-label",
            key,
            placeId: place.placeId,
            text,
            position: place.position,
            emphasized: true,
          });
    const footprint = labelFootprint(datum);
    const offset = labelOffsetCandidates(
      datum,
      footprint.width,
      footprint.height,
      input.placeMarkerRadiusPx(place.placeId),
    )[0] ?? [0, 0];
    const interactionDatum = withLabelPixelOffset(datum, offset);
    interactionLabels.push(interactionDatum);
    placedByKey.set(key, interactionDatum);
    byKey.set(key, interactionDatum);
  }

  const interactionEntityIds = new Set<EntityId>();
  if (input.selection?.kind === "entity") interactionEntityIds.add(input.selection.id);
  if (input.hoverSelection?.kind === "entity") interactionEntityIds.add(input.hoverSelection.id);
  if (!input.clustered && interactionEntityIds.size > 0) {
    for (const entity of input.entities) {
      if (!entity.label || !interactionEntityIds.has(entity.entityId)) continue;
      const key = `entity:${entity.worldInstanceId}`;
      if (placedByKey.has(key)) continue;

      const text = entity.label;
      const emphasized = focused("entity", entity.entityId);
      const prior = input.previous.get(key);
      const datum =
        prior && labelDatumUnchanged(prior, text, entity.position, emphasized)
          ? prior
          : Object.freeze({
              kind: "entity-label",
              key,
              entityId: entity.entityId,
              worldInstanceId: entity.worldInstanceId,
              text,
              position: entity.position,
              emphasized,
            });
      const footprint = labelFootprint(datum);
      const offset = labelOffsetCandidates(
        datum,
        footprint.width,
        footprint.height,
        input.entityMarkerRadiusPx(entity.worldInstanceId),
      )[0] ?? [0, 0];
      const interactionDatum = withLabelPixelOffset(datum, offset);
      interactionLabels.push(interactionDatum);
      placedByKey.set(key, interactionDatum);
      byKey.set(key, interactionDatum);
    }
  }

  const interactionRelationshipIds = new Set<RelationshipId>();
  if (input.selection?.kind === "relationship") interactionRelationshipIds.add(input.selection.id);
  if (input.hoverSelection?.kind === "relationship") {
    interactionRelationshipIds.add(input.hoverSelection.id);
  }
  if (input.focus?.kind === "relationship") interactionRelationshipIds.add(input.focus.id);
  if (!input.clustered && interactionRelationshipIds.size > 0) {
    for (const relationship of input.relationships) {
      if (!relationship.label || !interactionRelationshipIds.has(relationship.relationshipId)) {
        continue;
      }
      const key = `relationship:${relationship.relationshipId}`;
      if (placedByKey.has(key)) continue;
      const text = relationship.label;
      const position = edgePathMidpoint(relationship.path);
      const prior = input.previous.get(key);
      const datum =
        prior && labelDatumUnchanged(prior, text, position, true)
          ? prior
          : Object.freeze({
              kind: "relationship-label",
              key,
              relationshipId: relationship.relationshipId,
              sourceInstanceId: relationship.sourceInstanceId,
              targetInstanceId: relationship.targetInstanceId,
              text,
              position,
              emphasized: true,
            });
      const footprint = labelFootprint(datum);
      const offset = labelOffsetCandidates(datum, footprint.width, footprint.height, 0)[0] ?? [
        0, 0,
      ];
      const interactionDatum = withLabelPixelOffset(datum, offset);
      interactionLabels.push(interactionDatum);
      placedByKey.set(key, interactionDatum);
      byKey.set(key, interactionDatum);
    }
  }

  for (const key of [...byKey.keys()]) {
    const placedDatum = placedByKey.get(key);
    if (placedDatum) byKey.set(key, placedDatum);
    else byKey.delete(key);
  }
  const datums =
    interactionLabels.length === 0 ? placed : Object.freeze([...placed, ...interactionLabels]);
  return { datums, byKey };
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
    object.kind === "entity" &&
    typeof object.entityId === "string" &&
    typeof object.worldInstanceId === "string"
  ) {
    return Object.freeze({
      kind: "entity",
      entityId: object.entityId as EntityId,
      worldInstanceId: object.worldInstanceId as WorldInstanceId,
    });
  }

  if (
    (object.kind === "relationship" || object.kind === "relationship-direction") &&
    typeof object.relationshipId === "string"
  ) {
    return Object.freeze({
      kind: "relationship",
      relationshipId: object.relationshipId as RelationshipId,
    });
  }

  if (object.kind === "place" && typeof object.placeId === "string") {
    return Object.freeze({
      kind: "place",
      placeId: object.placeId as PlaceId,
    });
  }

  return null;
}

function clusterIdFromPicking(info: DeckRuntimePickingInfo | null): string | null {
  if (!info || !isRecord(info.object) || info.object.kind !== "cluster") return null;
  return typeof info.object.clusterId === "string" ? info.object.clusterId : null;
}

function clusterMemberCountFromPicking(info: DeckRuntimePickingInfo | null): number {
  if (!info || !isRecord(info.object) || info.object.kind !== "cluster") return 1;
  const members = info.object.clusterMembers;
  return Array.isArray(members) ? Math.max(1, members.length) : 1;
}

function clusterPositionFromPicking(
  info: DeckRuntimePickingInfo | null,
): WorldRenderPosition | null {
  if (!info || !isRecord(info.object) || info.object.kind !== "cluster") return null;
  const position = info.object.position;
  if (!Array.isArray(position) || position.length < 2) return null;
  const longitude = position[0];
  const latitude = position[1];
  const altitude = position[2] ?? 0;
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    typeof altitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(altitude)
  ) {
    return null;
  }
  return Object.freeze([longitude, latitude, altitude]) as WorldRenderPosition;
}

export class DeckWorldSurface implements WorldSurface {
  readonly #runtime: DeckWorldRuntime;
  readonly #labelCollisionExtension: unknown | null;
  readonly #deck: DeckRuntimeInstance;
  readonly #globeView: unknown;
  readonly #localView: unknown | null;
  readonly #container: HTMLElement;
  #controls: HTMLElement | null = null;
  #basemap: WorldBasemap | null = null;
  #palette: WorldGraphPalette = WORLD_LIGHT_PALETTE;
  #theme: WorldThemeColors = worldThemeColors(WORLD_LIGHT_PALETTE);
  #themeQuery: MediaQueryList | null = null;
  readonly #nodeStyles = new Map<string, WorldNodeStyle>();
  readonly #edgeStyles = new Map<string, WorldEdgeStyle>();
  readonly #handleThemeChange = () => {
    if (this.#destroyed) return;
    this.#applyTheme();
    this.#render();
  };
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
  readonly #topologyIndex = new WorldRenderTopologyIndex(this.#projection);
  #relationshipRouteHints: ReadonlyMap<RelationshipId, WorldRelationshipRouteHint> = new Map();
  #selection: WorldSelection | null = null;
  #hoverSelection: WorldSelection | null = null;
  #hoverClusterId: string | null = null;
  #camera: WorldCameraState;
  // True once the camera was chosen explicitly (constructor, setCamera,
  // focus, or user navigation); until then content auto-fits once.
  #cameraOwned = false;
  // True while the camera is the automatic content fit and nobody has moved
  // it since; a resize then re-fits (the first fit can run before layout).
  #autoFitted = false;
  #autoFitMode: "globe" | "content" = "globe";
  // Equatorial reference values used only to detect zoom-driven presentation changes.
  // Actual node geometry derives its scale/float from each instance's primary anchor latitude.
  #offsetScale = 1;
  #floatMeters = 0;
  #spatialMode: WorldSpatialMode = "globe";
  #nodeDragSink: DeckWorldNodeDragSink | null = null;
  #clusterForceSink: DeckWorldClusterForceSink | null = null;
  #clusterPhase: WorldClusterLifecyclePhase = "expanded";
  #clusterPlaceIds: readonly PlaceId[] = Object.freeze([]);
  #clusterEdgeReleaseTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  #clusterSettleTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  #activeDragPointerId: number | null = null;
  #activeDragInstanceId: WorldInstanceId | null = null;
  #dragFlashInstanceId: WorldInstanceId | null = null;
  #dragFlashTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  #dragClickSuppressionTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  #suppressNextDeckClick = false;
  #dragPresentationRevision = 0;
  #dragCameraLock: WorldCameraState | null = null;
  #destroyed = false;

  // Priority 3 (issue #445): previous frame's datum-by-id maps, kept so
  // #render can reuse unchanged datum object references across frames.
  #placeDatumCache: ReadonlyMap<PlaceId, DeckWorldPlaceDatum> = new Map();
  #entityDatumCache: ReadonlyMap<WorldInstanceId, DeckWorldEntityDatum> = new Map();
  #relationshipDatumCache: ReadonlyMap<RelationshipId, DeckWorldRelationshipDatum> = new Map();
  // Stable slots preserve row identity across temporal activation changes so
  // retained rows never get reassigned to another relationship after the
  // active set is reordered.
  readonly #temporalRelationshipSlots = new Map<
    RelationshipId,
    { readonly slot: number; readonly datum: DeckWorldTemporalRelationshipDatum }
  >();
  readonly #temporalRelationshipState = new Map<
    RelationshipId,
    DeckWorldTemporalRelationshipState
  >();
  #nextTemporalRelationshipSlot = 0;
  #temporalRelationshipRevision = 0;
  #relationshipPathRevision = 0;
  #relationshipStyleRevision = 0;
  #directionDatumCache: ReadonlyMap<RelationshipId, DeckWorldDirectionDatum> = new Map();
  #labelDatumCache: ReadonlyMap<string, DeckWorldLabelDatum> = new Map();
  // The last canonical object the camera was focused on. Presentation-only:
  // it keeps that object's label through LOD and never alters selection.
  #focus: WorldLabelFocus | null = null;
  // Tracks which side of CLUSTER_ZOOM_THRESHOLD the last render used, so
  // camera-only zoom changes only trigger a re-render when clustering would
  // actually turn on/off (ordinary panning/zooming above the threshold stays
  // as cheap as before).
  #clusterPhaseLastRender: WorldClusterLifecyclePhase = "expanded";
  #screenScaleZoomLastRender = Number.NaN;
  #cameraFacingStepLastRender = "";
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

    // Object-only pick: the long-press gate needs no 3D unprojection, and
    // skipping its extra depth pass keeps touch-down fast so a quick swipe's
    // move events are not delayed past the hold threshold.
    const hit = this.pick(touch.point, { depth: false });
    if (hit?.kind !== "entity") return;
    this.#setTouchDragState("holding");
    this.#touchHoldTimer = globalThis.setTimeout(() => {
      this.#touchHoldTimer = null;
      if (this.#destroyed || !this.#touchHold.isArmed(touch.pointerId, Date.now())) return;
      this.#setTouchDragState("active");
      this.#flashDragPickup(hit.worldInstanceId);
      this.setSelection(Object.freeze({ kind: "entity" as const, id: hit.entityId }));
      void pulseHaptic("drag");
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
    this.#clearDragFlash();
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
    this.#clearDragFlash({ render: false });
    this.#setActiveDragInstance(null);
    this.#dragCameraLock = null;
    this.#setPointerCursor(this.#hoverSelection);
  };

  readonly #handleLostPointerCapture = (event: PointerEvent): void => {
    if (this.#activeDragPointerId === null || event.pointerId !== this.#activeDragPointerId) {
      return;
    }
    this.#nodeDragSink?.cancel("lostpointercapture");
    this.#activeDragPointerId = null;
    this.#clearDragFlash({ render: false });
    this.#setActiveDragInstance(null);
    this.#dragCameraLock = null;
    this.#setPointerCursor(this.#hoverSelection);
  };

  #setPointerCursor(selection: WorldSelection | null, cluster = false): void {
    const style = (this.#container as HTMLElement).style;
    if (!style) return;
    const intent = cluster
      ? "cluster"
      : selection?.kind === "entity" && this.#nodeDragSink
        ? "draggable"
        : selection
          ? "action"
          : "background";
    style.cursor = surfaceCursor(intent, { dragging: this.#activeDragPointerId !== null });
  }

  #selectionFromPickingInfo(info: DeckRuntimePickingInfo): WorldSelection | null {
    const hit = worldHitFromPicking(info);
    if (
      hit?.kind === "relationship" &&
      !this.#projection.edges.some((edge) => edge.id === hit.relationshipId)
    ) {
      return null;
    }
    return worldSelectionFromHit(hit);
  }

  readonly #handleDeckHover = (info: DeckRuntimePickingInfo): void => {
    if (this.#activeDragPointerId !== null) return;
    const cluster = clusterPositionFromPicking(info);
    const nextClusterId = cluster ? clusterIdFromPicking(info) : null;
    const next = cluster ? null : this.#selectionFromPickingInfo(info);
    const selectionUnchanged =
      next === null ? this.#hoverSelection === null : selectionEquals(next, this.#hoverSelection);
    const clusterUnchanged = nextClusterId === this.#hoverClusterId;
    this.#setPointerCursor(next, cluster !== null);
    if (selectionUnchanged && clusterUnchanged) return;
    this.#hoverSelection = next;
    this.#hoverClusterId = nextClusterId;
    this.#render();
  };

  readonly #handleDeckClick = (info: DeckRuntimePickingInfo): void => {
    if (this.#activeDragPointerId !== null) return;
    if (this.#suppressNextDeckClick) {
      this.#suppressNextDeckClick = false;
      return;
    }
    const cluster = clusterPositionFromPicking(info);
    if (cluster) {
      this.#focusCluster(cluster, clusterMemberCountFromPicking(info));
      void pulseHaptic("selection");
      return;
    }
    const next = this.#selectionFromPickingInfo(info);
    const toggled = next !== null && selectionEquals(next, this.#selection) ? null : next;
    const changed =
      toggled === null ? this.#selection !== null : !selectionEquals(toggled, this.#selection);
    this.setSelection(toggled);
    if (changed) void pulseHaptic("selection");
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

  // deck.gl's controller already provides keyboard camera pan (arrow keys)
  // and zoom (+/-). Keep Tab/Shift+Tab native so focus can leave the canvas
  // and reach the camera toolbar and accessible object outline; Enter/Space
  // focus an object only after pointer/outline interaction has selected it.
  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    // Native controls and the accessible outline own their own keyboard
    // semantics. Surface-level selection cycling must never trap Tab inside
    // the graph or prevent users from reaching the camera toolbar.
    if (
      isNativeInteractiveKeyboardTarget(event.target) ||
      this.#accessibleMirror?.contains(event.target)
    ) {
      return;
    }
    const activation = surfaceActivationFromKeyboard(event);
    if (activation === "activate" && this.#selection) {
      event.preventDefault?.();
      const selection = this.#selection;
      if (selection.kind === "entity") this.focusEntity(selection.id);
      else if (selection.kind === "relationship") this.focusOccurrence(selection.id);
      else if (selection.kind === "place") this.focusPlace(selection.id);
    }
  };

  constructor(container: HTMLElement, runtime: DeckWorldRuntime, initialCamera?: WorldCameraState) {
    this.#runtime = runtime;
    this.#labelCollisionExtension = runtime.createCollisionFilterExtension?.() ?? null;
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
      controller: deckControllerOptions(this.#spatialMode),
      initialViewState: this.#camera,
      pickingRadius: WORLD_PICKING_RADIUS_PX,
      // Keep one cursor owner. deck.gl otherwise writes its own grab/pointer
      // cursor onto the canvas while hover picking writes the host cursor,
      // which makes the visible cursor oscillate as picking state changes.
      getCursor: () => "inherit",
      layers: [],
      onHover: (info: DeckRuntimePickingInfo) => this.#handleDeckHover(info),
      onClick: (info: DeckRuntimePickingInfo) => this.#handleDeckClick(info),
      onAfterRender: () => this.#afterRender(),
      onResize: () => {
        if (!this.#autoFitted || this.#destroyed) return;
        this.#reframe(this.#autoFitMode);
      },
      onViewStateChange: ({ viewState }: { readonly viewState: DeckRuntimeViewState }) => {
        // At close/detail zoom direct manipulation owns the gesture. Reject
        // controller inertia/orbit updates until the node drag ends so the
        // geographic frame and its place anchors stay visually locked.
        if (this.#dragCameraLock) {
          this.#deck.setProps({ viewState: this.#dragCameraLock });
          return;
        }
        const next = cameraFromRuntime(viewState, this.#camera);
        if (next) {
          this.#cameraOwned = true;
          this.#autoFitted = false;
          this.#camera = next;
          this.#syncSpatialMode();
          this.#syncClusterLifecycle();
          // The camera is controlled (`viewState` prop): hand deck the new
          // state or the globe snaps back and cannot be rotated or panned.
          if (this.#zoomNeedsRender()) this.#render(true);
          else this.#deck.setProps({ viewState: this.#camera });
        }
      },
    });

    // The host owns cursor semantics; deck's canvas inherits this value.
    this.#setPointerCursor(null);

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
    this.#applyTheme();
    const themeView = this.#container.ownerDocument?.defaultView;
    this.#themeQuery = themeView?.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    this.#themeQuery?.addEventListener?.("change", this.#handleThemeChange);
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

  #applyTheme(): void {
    this.#palette = resolveWorldPalette(this.#container);
    this.#theme = worldThemeColors(this.#palette);
    this.#nodeStyles.clear();
    this.#edgeStyles.clear();
  }

  /** Re-reads the host theme (e.g. after an explicit light/dark switch). */
  refreshTheme(): void {
    this.#assertAlive();
    this.#handleThemeChange();
  }

  #entityStyle(datum: DeckWorldEntityDatum, inactive = false): WorldNodeStyle {
    const styleKey = datum.style ? JSON.stringify(datum.style) : "";
    const key = `${datum.entityKind ?? ""}|${datum.selected}|${datum.emphasized}|${inactive}|${datum.visualWeight}|${styleKey}`;
    let style = this.#nodeStyles.get(key);
    if (!style) {
      style = worldNodeStyle(
        {
          ...(datum.entityKind === undefined ? {} : { type: datum.entityKind }),
          attributes: datum.style ? { style: datum.style } : undefined,
          selected: datum.selected,
          emphasized: datum.emphasized,
          visualWeight: datum.visualWeight,
        },
        this.#palette,
      );
      if (inactive) {
        style = Object.freeze({ ...style, fill: this.#palette.muted, border: this.#palette.muted });
      }
      this.#nodeStyles.set(key, style);
    }
    return style;
  }

  #placeStyle(datum: DeckWorldPlaceDatum): WorldNodeStyle {
    const key = `place|${datum.selected}|${datum.emphasized}|${datum.style ? JSON.stringify(datum.style) : ""}`;
    let style = this.#nodeStyles.get(key);
    if (!style) {
      style = worldPlaceStyle(datum.style, datum.selected, this.#palette, datum.emphasized);
      this.#nodeStyles.set(key, style);
    }
    return style;
  }

  #edgeStyle(
    datum: {
      readonly label?: string;
      readonly selected: boolean;
      readonly emphasized?: boolean;
      readonly style?: WorldPresentationStyle;
    },
    fallbackColor?: string,
  ): WorldEdgeStyle {
    const subdued = !datum.selected && datum.emphasized !== true;
    const key = `${datum.label ?? ""}|${datum.selected}|${datum.emphasized === true}|${fallbackColor ?? ""}|${datum.style ? JSON.stringify(datum.style) : ""}`;
    let style = this.#edgeStyles.get(key);
    if (!style) {
      style = worldEdgeStyle(
        {
          ...(datum.label === undefined ? {} : { predicate: datum.label }),
          attributes: datum.style ? { style: datum.style } : undefined,
          selected: datum.selected,
          emphasized: datum.emphasized,
          subdued,
          ...(fallbackColor === undefined ? {} : { fallbackColor }),
        },
        this.#palette,
      );
      this.#edgeStyles.set(key, style);
    }
    return style;
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

  /**
   * Content fit that guarantees legibility: when the geographic fit leaves
   * local graphs too small to tell entities apart, zoom in until they are
   * readable, centred on the place with the most entities.
   */
  #readableContentCamera(fitted: WorldCameraState | null): WorldCameraState | null {
    if (!fitted) return null;
    const typical = this.#typicalOffsetMeters();
    if (typical <= 0) return fitted;
    const readableAt = (zoom: number) =>
      worldLocalRadiusPx(typical * this.#nextOffsetScale(zoom), zoom, fitted.latitude) >=
      this.#clusterRadiusPx();
    if (readableAt(fitted.zoom)) return fitted;
    let zoom = fitted.zoom;
    while (zoom < 18 && !readableAt(zoom)) zoom += 0.25;
    const counts = new Map<string, { count: number; longitude: number; latitude: number }>();
    for (const instance of this.#projection.instances) {
      const anchor = instance.geographicAnchors[0];
      if (!anchor) continue;
      const entry = counts.get(anchor.placeId) ?? {
        count: 0,
        longitude: anchor.longitude,
        latitude: anchor.latitude,
      };
      entry.count += 1;
      counts.set(anchor.placeId, entry);
    }
    const busiest = [...counts.values()].sort((left, right) => right.count - left.count)[0];
    return createWorldCameraState({
      ...fitted,
      zoom,
      ...(busiest ? { longitude: busiest.longitude, latitude: busiest.latitude } : {}),
    });
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

  setClusterForceSink(sink: DeckWorldClusterForceSink | null): void {
    this.#assertAlive();
    this.#clusterForceSink = sink;
    this.#syncClusterLifecycle();
    if (!sink) return;
    const clustered =
      this.#clusterPhase === "collapsing" || this.#clusterPhase === "collapsed"
        ? this.#clusterPlaceIds
        : Object.freeze([] as PlaceId[]);
    const detached =
      this.#clusterPhase === "collapsing" ||
      this.#clusterPhase === "collapsed" ||
      this.#clusterPhase === "expanding"
        ? this.#clusterPlaceIds
        : Object.freeze([] as PlaceId[]);
    sink.setClusteredPlaceIds(clustered, detached);
  }

  #clearClusterTimers(): void {
    if (this.#clusterEdgeReleaseTimer !== null) {
      globalThis.clearTimeout(this.#clusterEdgeReleaseTimer);
      this.#clusterEdgeReleaseTimer = null;
    }
    if (this.#clusterSettleTimer !== null) {
      globalThis.clearTimeout(this.#clusterSettleTimer);
      this.#clusterSettleTimer = null;
    }
  }

  #clusterTargetPlaceIds(): readonly PlaceId[] {
    const counts = this.#topologyIndex.placeMemberCounts;
    const footprintRadiusPx = this.#clusterEntityFootprintRadiusPx();
    const globalOverview = shouldClusterEntityDatums(
      this.#projection.instances.length,
      this.#camera.zoom,
      footprintRadiusPx,
    );

    return Object.freeze(
      [...counts]
        .filter(([, count]) => {
          if (globalOverview) return true;
          if (count <= 1) return false;
          return worldClusterWantsCollapsed(
            this.#camera.zoom,
            clusterZoomThresholdForPlaceDensity(footprintRadiusPx, count),
            this.#clusterPhase,
          );
        })
        .map(([placeId]) => placeId)
        .sort((left, right) => String(left).localeCompare(String(right))),
    );
  }

  #sameClusterPlaces(placeIds: readonly PlaceId[]): boolean {
    return (
      placeIds.length === this.#clusterPlaceIds.length &&
      placeIds.every((placeId, index) => placeId === this.#clusterPlaceIds[index])
    );
  }

  #beginClusterCollapse(placeIds: readonly PlaceId[]): void {
    this.#clearClusterTimers();
    this.#clusterPlaceIds = Object.freeze([...placeIds]);
    this.#clusterPhase = "releasing";
    this.#render();

    // Orb parity: announce edge retirement first. Only after this stage are
    // links removed from D3, freeing the muted members to gather physically.
    this.#clusterEdgeReleaseTimer = globalThis.setTimeout(() => {
      this.#clusterEdgeReleaseTimer = null;
      if (this.#destroyed || this.#clusterPhase !== "releasing") return;
      this.#clusterPhase = "collapsing";
      this.#clusterForceSink?.setClusteredPlaceIds(this.#clusterPlaceIds, this.#clusterPlaceIds);
      this.#render();
      this.#clusterSettleTimer = globalThis.setTimeout(
        () => {
          this.#clusterSettleTimer = null;
          if (this.#destroyed || this.#clusterPhase !== "collapsing") return;
          this.#clusterPhase = "collapsed";
          this.#render();
        },
        Math.max(0, WORLD_CLUSTER_SETTLE_MS - WORLD_CLUSTER_EDGE_RELEASE_MS),
      );
    }, WORLD_CLUSTER_EDGE_RELEASE_MS);
  }

  #beginClusterExpansion(): void {
    this.#clearClusterTimers();
    if (this.#clusterPhase === "releasing") {
      // No force topology was detached yet, so reversing the zoom simply
      // cancels retirement without inventing movement.
      this.#clusterPhase = "expanded";
      this.#clusterPlaceIds = Object.freeze([]);
      this.#render();
      return;
    }
    this.#clusterPhase = "expanding";
    // Members are retained at their gathered place origin. Remove the inward
    // anchor directive, but keep relationship springs detached while D3
    // many-body/collision rejection scatters them. Links return only after
    // this free expansion phase completes.
    this.#clusterForceSink?.setClusteredPlaceIds(
      Object.freeze([] as PlaceId[]),
      this.#clusterPlaceIds,
    );
    this.#render();
    this.#clusterSettleTimer = globalThis.setTimeout(() => {
      this.#clusterSettleTimer = null;
      if (this.#destroyed || this.#clusterPhase !== "expanding") return;
      this.#clusterForceSink?.setClusteredPlaceIds(
        Object.freeze([] as PlaceId[]),
        Object.freeze([] as PlaceId[]),
      );
      this.#clusterPhase = "expanded";
      this.#clusterPlaceIds = Object.freeze([]);
      this.#render();
    }, WORLD_CLUSTER_SETTLE_MS);
  }

  #syncClusterLifecycle(): void {
    const placeIds = this.#clusterTargetPlaceIds();
    if (placeIds.length === 0) {
      if (this.#clusterPhase !== "expanded") this.#beginClusterExpansion();
      return;
    }

    if (this.#clusterPhase === "expanded" || this.#clusterPhase === "expanding") {
      this.#beginClusterCollapse(placeIds);
      return;
    }
    if (!this.#sameClusterPlaces(placeIds)) {
      this.#clusterPlaceIds = Object.freeze([...placeIds]);
      if (this.#clusterPhase === "collapsing" || this.#clusterPhase === "collapsed") {
        this.#clusterForceSink?.setClusteredPlaceIds(this.#clusterPlaceIds, this.#clusterPlaceIds);
      }
    }
  }

  setNodeDragSink(sink: DeckWorldNodeDragSink | null): void {
    this.#assertAlive();
    this.#nodeDragSink = sink;
    if (!sink) {
      this.#activeDragPointerId = null;
      this.#dragCameraLock = null;
    }
    this.#setPointerCursor(this.#hoverSelection);
    this.#render();
  }

  setRelationshipRoutes(routes: readonly WorldRelationshipRouteHint[]): void {
    this.#assertAlive();
    this.#relationshipRouteHints = new Map(
      routes.map((route) => [route.relationshipId, route] as const),
    );
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();
    this.#projection = projection;
    this.#topologyIndex.replace(projection);
    this.#autoFitCamera();
    this.#syncClusterLifecycle();
    this.#render();
  }

  applyProjectionDelta(delta: WorldProjectionDelta): void {
    this.#assertAlive();
    this.#projection = applyWorldProjectionDelta(this.#projection, delta);
    this.#topologyIndex.applyDelta(delta, this.#projection);
    // Force/layout deltas are derived presentation updates. Do not re-run
    // content fit or move the camera while nodes relax.
    this.#syncClusterLifecycle();
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
        ? this.#readableContentCamera(fitWorldCamera(positions, { width, height }, this.#camera))
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
    if (
      selection === null ? this.#selection === null : selectionEquals(selection, this.#selection)
    ) {
      return;
    }
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
    this.#syncClusterLifecycle();
    // When the zoom changes LOD or the offset magnification, layers and
    // camera go to deck in one update so no frame pairs the new camera with
    // stale positions.
    if (this.#zoomNeedsRender()) this.#render(true);
    else this.#deck.setProps({ viewState: this.#camera });
  }

  focusEntity(id: EntityId): void {
    this.#setLabelFocus("entity", id);
    const instance = this.#projection.instances.find((candidate) => candidate.canonicalId === id);
    const placeId = instance?.geographicAnchors[0]?.placeId;
    const placeMemberCount = placeId
      ? this.#projection.instances.filter(
          (candidate) => candidate.geographicAnchors[0]?.placeId === placeId,
        ).length
      : 1;
    // Explicit focus must cross the same density threshold that keeps a dense
    // local group clustered; otherwise the camera can center a hidden member
    // while leaving its cluster intact.
    const destinationZoom = Math.max(
      this.#detailFocusZoom(),
      placeId
        ? clusterZoomThresholdForPlaceDensity(
            this.#clusterEntityFootprintRadiusPx(),
            placeMemberCount,
          ) + 0.25
        : 0,
    );
    this.#focusPosition(
      instance
        ? anchorPosition(
            instance,
            this.#offsetScaleForInstance(instance, destinationZoom),
            this.#floatMetersForInstance(instance, destinationZoom),
          )
        : null,
      destinationZoom,
    );
  }

  focusOccurrence(id: RelationshipId): void {
    this.#setLabelFocus("relationship", id);
    this.#focusPosition(
      relationshipDatums(
        this.#projection,
        this.#instanceIndex(),
        this.#topologyIndex,
        this.#selection,
        this.#relationshipDatumCache,
      ).datums.find((datum) => datum.relationshipId === id)?.path[0] ?? null,
    );
  }

  focusPlace(id: PlaceId): void {
    this.#setLabelFocus("place", id);
    const memberCount = this.#projection.instances.filter(
      (instance) => instance.geographicAnchors[0]?.placeId === id,
    ).length;
    const destinationZoom = Math.max(
      this.#detailFocusZoom(),
      clusterZoomThresholdForPlaceDensity(this.#clusterEntityFootprintRadiusPx(), memberCount) +
        0.25,
    );
    this.#focusPosition(
      placeDatums(this.#projection.instances, this.#selection, this.#placeDatumCache).datums.find(
        (datum) => datum.placeId === id,
      )?.position ?? null,
      destinationZoom,
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

  pick(point: ScreenPoint, options: { readonly depth?: boolean } = {}): WorldHit | null {
    this.#assertAlive();
    let picked: DeckRuntimePickingInfo | null;
    try {
      picked = this.#deck.pickObject({
        x: point.x,
        y: point.y,
        radius: 22,
        unproject3D: options.depth !== false,
        layerIds: [
          DECK_WORLD_LAYER_IDS.entityIcons,
          DECK_WORLD_LAYER_IDS.entities,
          DECK_WORLD_LAYER_IDS.relationshipDirections,
          DECK_WORLD_LAYER_IDS.relationships,
          DECK_WORLD_LAYER_IDS.placeIcons,
          DECK_WORLD_LAYER_IDS.places,
        ],
      });
    } catch {
      // Backends without synchronous picking (deck.gl 9.4 WebGPU) throw;
      // treat as "nothing under the pointer" instead of breaking input.
      picked = null;
    }
    const hit = worldHitFromPicking(picked);
    if (
      hit?.kind === "relationship" &&
      !this.#projection.edges.some((edge) => edge.id === hit.relationshipId)
    ) {
      return null;
    }
    return hit;
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
      (instance) => this.#offsetScaleForInstance(instance),
      (instance) => this.#floatMetersForInstance(instance),
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
    this.#themeQuery?.removeEventListener?.("change", this.#handleThemeChange);
    this.#themeQuery = null;
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
    this.#clearClusterTimers();
    this.#clearDragFlash({ render: false });
    this.#clearDragClickSuppression();
    this.#touchHold.clear();
    this.#container.removeEventListener?.("lostpointercapture", this.#handleLostPointerCapture);
    this.#container.removeEventListener?.("dblclick", this.#handleDoubleClick as EventListener);
    this.#container.removeEventListener?.("keydown", this.#handleKeyDown as EventListener);
    this.#liveRegion?.remove?.();
    this.#accessibleMirror?.destroy();
    const style = (this.#container as HTMLElement).style;
    if (style) style.cursor = "";
    this.#deck.finalize();
  }

  #dragTarget(
    info: DeckRuntimePickingInfo,
  ): { readonly instanceId: WorldInstanceId; readonly position: WorldNodeDragPosition } | null {
    if (!isRecord(info.object) || info.object.kind !== "entity") return null;
    const worldInstanceId = info.object.worldInstanceId;
    if (typeof worldInstanceId !== "string") return null;

    const instance = this.#topologyIndex.instanceById.get(worldInstanceId);
    const point = screenPointFromPicking(info);
    if (!instance || !point) return null;

    const position = resolveWorldNodeDragPosition(
      this,
      instance,
      point,
      this.#offsetScaleForInstance(instance),
      this.#floatMetersForInstance(instance),
    );
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
    if (!sink || pointerId === null || !target || !worldPointerDragMayStart(event)) return false;
    // Touch drags only claim the node after the long-press gate armed;
    // otherwise deck's controller keeps the gesture as a globe pan.
    const touch = pointerTypeFromRuntimeEvent(event) === "touch";
    if (touch && !this.#touchHold.isArmed(pointerId, Date.now())) {
      return false;
    }

    // Mark the gesture active before handing the first pin to the layout.
    // The drag sink may synchronously publish a projection update; that first
    // frame must already bypass deck geometry interpolation so node, edges,
    // and labels all consume the same live drag position.
    this.#activeDragPointerId = pointerId;
    this.#setActiveDragInstance(target.instanceId, { render: false });
    const claimed = sink.begin(pointerId, target.instanceId, target.position);
    if (claimed) {
      if (touch) this.#touchHold.commit(pointerId);
      this.#setPointerCursor(this.#hoverSelection);
      if (!touch) void pulseHaptic("tick");
      this.#render();
      if (this.#camera.zoom >= WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM) {
        this.#dragCameraLock = this.#camera;
      }
      // deck.gl ignores the layer handler's return value; only a handled
      // event stops its controller from turning the same gesture into a pan.
      event.stopPropagation?.();
    } else {
      this.#activeDragPointerId = null;
      this.#setActiveDragInstance(null);
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
    event.stopPropagation?.();
    return sink.update(pointerId, target.position);
  }

  #endEntityDrag(event: DeckRuntimePointerEvent): boolean {
    const sink = this.#nodeDragSink;
    const pointerId = pointerIdFromRuntimeEvent(event) ?? this.#activeDragPointerId;
    if (!sink || pointerId === null || pointerId !== this.#activeDragPointerId) {
      return false;
    }

    event.stopPropagation?.();
    // Keep direct-manipulation mode active through release because the sink
    // may synchronously publish the final pinned frame. Clearing it first
    // would re-enable geometry transitions for that frame and recreate the
    // label-leading/node-lagging effect at pointer-up.
    const released = sink.release(pointerId);
    if (released) this.#armDragClickSuppression();
    this.#activeDragPointerId = null;
    this.#clearDragFlash({ render: false });
    this.#setActiveDragInstance(null);
    this.#dragCameraLock = null;
    this.#setPointerCursor(this.#hoverSelection);
    void pulseHaptic("release");
    return released;
  }

  #clearTouchHoldTimer(): void {
    if (this.#touchHoldTimer === null) return;
    globalThis.clearTimeout(this.#touchHoldTimer);
    this.#touchHoldTimer = null;
  }

  #clearDragFlashTimer(): void {
    if (this.#dragFlashTimer === null) return;
    globalThis.clearTimeout(this.#dragFlashTimer);
    this.#dragFlashTimer = null;
  }

  #armDragClickSuppression(): void {
    if (this.#dragClickSuppressionTimer !== null) {
      globalThis.clearTimeout(this.#dragClickSuppressionTimer);
    }
    this.#suppressNextDeckClick = true;
    // Mirrors d3-drag's noclick behavior: consume only the click dispatched
    // immediately after pointer-up, then restore ordinary click selection.
    this.#dragClickSuppressionTimer = globalThis.setTimeout(() => {
      this.#dragClickSuppressionTimer = null;
      this.#suppressNextDeckClick = false;
    }, 0);
  }

  #clearDragClickSuppression(): void {
    if (this.#dragClickSuppressionTimer !== null) {
      globalThis.clearTimeout(this.#dragClickSuppressionTimer);
      this.#dragClickSuppressionTimer = null;
    }
    this.#suppressNextDeckClick = false;
  }

  #clearDragFlash({ render = true }: { readonly render?: boolean } = {}): void {
    this.#clearDragFlashTimer();
    if (this.#dragFlashInstanceId === null) return;
    this.#dragFlashInstanceId = null;
    this.#dragPresentationRevision += 1;
    if (render && !this.#destroyed) this.#render();
  }

  #setActiveDragInstance(
    instanceId: WorldInstanceId | null,
    { render = true }: { readonly render?: boolean } = {},
  ): void {
    if (this.#activeDragInstanceId === instanceId) return;
    this.#activeDragInstanceId = instanceId;
    this.#dragPresentationRevision += 1;
    if (render && !this.#destroyed) this.#render();
  }

  #flashDragPickup(instanceId: WorldInstanceId): void {
    this.#clearDragFlashTimer();
    this.#dragFlashInstanceId = instanceId;
    this.#dragPresentationRevision += 1;
    if (!this.#destroyed) this.#render();
    this.#dragFlashTimer = globalThis.setTimeout(() => {
      this.#dragFlashTimer = null;
      if (this.#dragFlashInstanceId !== instanceId) return;
      this.#dragFlashInstanceId = null;
      this.#dragPresentationRevision += 1;
      if (!this.#destroyed) this.#render();
    }, WORLD_DRAG_PICKUP_FLASH_MS);
  }

  #setTouchDragState(state: "holding" | "active" | null): void {
    const dataset = (this.#container as { dataset?: DOMStringMap }).dataset;
    if (!dataset) return;
    if (state === null) delete dataset.worldTouchDrag;
    else dataset.worldTouchDrag = state;
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
      this.#clearDragFlash({ render: false });
      this.#setActiveDragInstance(null);
      this.#dragCameraLock = null;
    }

    this.#spatialMode = nextMode;
    // Camera continuity: pass the current camera explicitly alongside the
    // view swap so longitude/latitude/zoom/bearing/pitch carry over into the
    // new view rather than relying on it implicitly surviving a separate
    // setProps call.
    this.#deck.setProps({
      views: [nextMode === "local" ? this.#localView : this.#globeView],
      controller: deckControllerOptions(nextMode),
      viewState: this.#camera,
    });
  }

  #reclusterIfZoomCrossedThreshold(): void {
    this.#syncClusterLifecycle();
    if (this.#zoomNeedsRender()) this.#render();
  }

  #zoomNeedsRender(): boolean {
    const budget = worldLabelBudget(this.#camera.zoom);
    const lodChanged =
      budget !== this.#labelBudgetLastRender &&
      Math.min(budget, this.#labelBudgetLastRender) < this.#lodCandidateCountLastRender;
    const screenScaleChanged =
      screenScaleZoomStep(this.#camera.zoom) !== this.#screenScaleZoomLastRender;
    const cameraFacingChanged = cameraFacingStep(this.#camera) !== this.#cameraFacingStepLastRender;
    return (
      this.#clusterPhase !== this.#clusterPhaseLastRender ||
      lodChanged ||
      screenScaleChanged ||
      cameraFacingChanged ||
      this.#nextOffsetScale() !== this.#offsetScale ||
      this.#nextFloatMeters() !== this.#floatMeters
    );
  }

  #viewportGraphRadiusLimitPx(): number {
    const width = Number(this.#container.clientWidth) || 1024;
    const height = Number(this.#container.clientHeight) || 768;
    const shortSide = Math.min(width, height);
    return Math.max(120, Math.min(WORLD_LOCAL_GRAPH_RADIUS_PX * 2, shortSide * 0.42));
  }

  #clusterEntityFootprintCache: {
    readonly projection: WorldProjection;
    readonly radiusPx: number;
  } | null = null;

  #clusterEntityFootprintRadiusPx(): number {
    const projection = this.#projection;
    if (this.#clusterEntityFootprintCache?.projection === projection) {
      return this.#clusterEntityFootprintCache.radiusPx;
    }
    const radii = projection.instances.map((instance) =>
      worldNodeVisualFootprintRadiusPx({
        ...(instance.kind === undefined ? {} : { type: instance.kind }),
        attributes: instance.style ? { style: instance.style } : undefined,
        visualWeight: instance.visualWeight,
      }),
    );
    const radiusPx = Math.max(1, representativeWorldNodeRadiusPx(radii));
    this.#clusterEntityFootprintCache = { projection, radiusPx };
    return radiusPx;
  }

  #clusterRadiusPx(): number {
    return worldPlaceClusterRadiusPx(
      this.#clusterEntityFootprintRadiusPx(),
      this.#viewportGraphRadiusLimitPx(),
    );
  }

  /**
   * Presentation magnification of local offsets for the current zoom (see
   * `worldPresentationOffsetScale`). Scenes without local offsets keep 1 so
   * zooming them never invalidates memoized datums.
   */
  #nextOffsetScale(zoom = this.#camera.zoom, latitude = 0): number {
    const typical = this.#typicalOffsetMeters();
    const scale = worldPresentationOffsetScale(
      zoom,
      this.#projection.instances.length,
      typical,
      latitude,
      this.#viewportGraphRadiusLimitPx(),
    );

    // Keep presentation scale continuous while D3 gathers/scatters the actual
    // local offsets. Crossing a cluster threshold must never snap offsets to 1x.
    const nearest = this.#nearestPlaceMeters();
    if (nearest <= 0 || typical <= 0) return scale;
    const cap = Math.max(1, (WORLD_LOCAL_GRAPH_MAX_PLACE_SHARE * nearest) / typical);
    return Math.min(scale, cap);
  }

  /**
   * Entities float a constant on-screen height above the terrain (places
   * stay on it). Screen-space conversion is continuous; render throttling
   * controls update frequency without introducing quarter-zoom position jumps.
   * D3 owns cluster gather/scatter altitude; camera zoom only converts the
   * stable screen-space float target into metres.
   */
  #nextFloatMeters(zoom = this.#camera.zoom, latitude = 0): number {
    if (this.#projection.instances.length === 0 || this.#typicalOffsetMeters() <= 0) return 0;
    return worldLocalRadiusPx(1, zoom, latitude) ** -1 * WORLD_ENTITY_FLOAT_PX;
  }

  #instanceLatitude(instance: ProjectedWorldInstance): number {
    return worldPrimarySpatialAnchor(instance)?.latitude ?? 0;
  }

  #offsetScaleForInstance(instance: ProjectedWorldInstance, zoom = this.#camera.zoom): number {
    return this.#nextOffsetScale(zoom, this.#instanceLatitude(instance));
  }

  #floatMetersForInstance(instance: ProjectedWorldInstance, zoom = this.#camera.zoom): number {
    return this.#nextFloatMeters(zoom, this.#instanceLatitude(instance));
  }

  #nearestPlaceCache: { readonly projection: WorldProjection; readonly meters: number } | null =
    null;

  #nearestPlaceMeters(): number {
    const projection = this.#projection;
    if (this.#nearestPlaceCache?.projection === projection) return this.#nearestPlaceCache.meters;
    const seen = new Map<string, readonly [number, number]>();
    for (const instance of projection.instances) {
      const anchor = instance.geographicAnchors[0];
      if (anchor && !seen.has(anchor.placeId)) {
        seen.set(anchor.placeId, [anchor.longitude, anchor.latitude]);
      }
    }
    const meters = medianNearestPlaceMeters([...seen.values()]);
    this.#nearestPlaceCache = { projection, meters };
    return meters;
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

  #instanceIndex(): WorldInstanceIndex {
    const positions = new Map<WorldInstanceId, WorldRenderPosition>();
    const entityIds = new Map<WorldInstanceId, EntityId>();
    for (const instance of this.#projection.instances) {
      const position = anchorPosition(
        instance,
        this.#offsetScaleForInstance(instance),
        this.#floatMetersForInstance(instance),
      );
      if (!position) continue;
      positions.set(instance.id, position);
      entityIds.set(instance.id, instance.canonicalId);
    }
    return { positions, entityIds };
  }

  #temporalRelationshipDatums(
    activeRelationships: readonly DeckWorldRelationshipDatum[],
  ): readonly DeckWorldTemporalRelationshipDatum[] {
    const activeIds = new Set<RelationshipId>();
    let temporalChanged = false;
    let pathChanged = false;
    let styleChanged = false;

    for (const relationship of activeRelationships) {
      activeIds.add(relationship.relationshipId);

      if (!this.#temporalRelationshipSlots.has(relationship.relationshipId)) {
        this.#temporalRelationshipSlots.set(
          relationship.relationshipId,
          Object.freeze({
            slot: this.#nextTemporalRelationshipSlot++,
            datum: Object.freeze({
              kind: "relationship" as const,
              relationshipId: relationship.relationshipId,
            }),
          }),
        );
        temporalChanged = true;
      }

      const previous = this.#temporalRelationshipState.get(relationship.relationshipId);
      if (!previous?.temporalActive) temporalChanged = true;
      if (!previous || !worldPathEquals(previous.edge.path, relationship.path)) {
        pathChanged = true;
      }
      if (
        !previous ||
        previous.edge.label !== relationship.label ||
        previous.edge.selected !== relationship.selected ||
        previous.edge.emphasized !== relationship.emphasized ||
        !styleEqual(previous.edge.style, relationship.style)
      ) {
        styleChanged = true;
      }

      this.#temporalRelationshipState.set(
        relationship.relationshipId,
        Object.freeze({ edge: relationship, temporalActive: true }),
      );
    }

    for (const [relationshipId, state] of this.#temporalRelationshipState) {
      if (activeIds.has(relationshipId) || !state.temporalActive) continue;
      this.#temporalRelationshipState.set(
        relationshipId,
        Object.freeze({ edge: state.edge, temporalActive: false }),
      );
      temporalChanged = true;
      if (state.edge.selected || state.edge.emphasized) styleChanged = true;
    }

    if (temporalChanged) this.#temporalRelationshipRevision += 1;
    if (pathChanged) this.#relationshipPathRevision += 1;
    if (styleChanged) this.#relationshipStyleRevision += 1;

    return Object.freeze(
      [...this.#temporalRelationshipSlots.values()]
        .sort((left, right) => left.slot - right.slot)
        .map((record) => record.datum),
    );
  }

  #temporalRelationshipStateFor(
    datum: DeckWorldTemporalRelationshipDatum,
  ): DeckWorldTemporalRelationshipState {
    const state = this.#temporalRelationshipState.get(datum.relationshipId);
    if (!state) {
      throw new Error(`Missing temporal relationship state for ${datum.relationshipId}`);
    }
    return state;
  }

  #temporalEdgeStyle(
    datum: DeckWorldTemporalRelationshipDatum,
    fallbackColor?: string,
  ): WorldEdgeStyle {
    const state = this.#temporalRelationshipStateFor(datum);
    return this.#edgeStyle(
      {
        ...(state.edge.label === undefined ? {} : { label: state.edge.label }),
        ...(state.edge.style === undefined ? {} : { style: state.edge.style }),
        selected: state.temporalActive && state.edge.selected,
        emphasized: state.temporalActive && state.edge.emphasized,
      },
      fallbackColor,
    );
  }

  #setLabelFocus(kind: WorldSelection["kind"], id: string): void {
    this.#assertAlive();
    if (this.#focus?.kind === kind && this.#focus.id === id) return;
    this.#focus = Object.freeze({ kind, id });
    this.#render();
  }

  #render(withCamera = false): void {
    this.#offsetScale = this.#nextOffsetScale();
    this.#floatMeters = this.#nextFloatMeters();
    const neighborhood = this.#topologyIndex.interactionNeighborhood([
      this.#selection,
      this.#hoverSelection,
    ]);
    const placeResult = placeDatums(
      this.#projection.instances,
      this.#selection,
      this.#placeDatumCache,
      neighborhood.placeIds,
    );
    const entityResult = entityDatums(
      this.#projection.instances,
      this.#selection,
      this.#entityDatumCache,
      (instance) => this.#offsetScaleForInstance(instance),
      (instance) => this.#floatMetersForInstance(instance),
      neighborhood.entityIds,
    );

    const clusterPlaces = new Set(this.#clusterPlaceIds);
    const memberIds = new Set<WorldInstanceId>(
      this.#projection.instances
        .filter((instance) => {
          const placeId = instance.geographicAnchors[0]?.placeId;
          return placeId !== undefined && clusterPlaces.has(placeId);
        })
        .map((instance) => instance.id),
    );
    const clusterPhase: WorldClusterLifecyclePhase =
      memberIds.size > 0 ? this.#clusterPhase : "expanded";
    const showMembers = worldClusterShowsMembers(clusterPhase);
    const muteMembers = worldClusterMutesMembers(clusterPhase);
    const showActiveClusterEdges = worldClusterShowsActiveEdges(clusterPhase);
    const showReleasingClusterEdges = worldClusterShowsReleasingEdges(clusterPhase);
    const edgeIsClusterAffected = (
      edge: Pick<DeckWorldRelationshipDatum, "sourceInstanceId" | "targetInstanceId">,
    ): boolean => memberIds.has(edge.sourceInstanceId) || memberIds.has(edge.targetInstanceId);

    // Relationship geometry always consumes the exact force-resolved positions.
    // Cluster lifecycle never interpolates endpoints in the renderer.
    const relationshipResult = relationshipDatums(
      this.#projection,
      instanceIndexFromEntities(entityResult.datums),
      this.#topologyIndex,
      this.#selection,
      this.#relationshipDatumCache,
      neighborhood.relationshipIds,
      {
        routes: this.#relationshipRouteHints,
        offsetScaleForInstance: (instance) => this.#offsetScaleForInstance(instance),
        floatMetersForInstance: (instance) => this.#floatMetersForInstance(instance),
        activeDragInstanceId: this.#activeDragInstanceId,
      },
    );
    const places = placeResult.datums;
    const relationships = relationshipResult.datums;
    const temporalRelationships = this.#temporalRelationshipDatums(relationships);
    const activeTemporalRelationships = temporalRelationships.filter((datum) => {
      const edge = this.#temporalRelationshipStateFor(datum).edge;
      return !edgeIsClusterAffected(edge) || showActiveClusterEdges;
    });
    const releasingRelationships = showReleasingClusterEdges
      ? relationships.filter(edgeIsClusterAffected)
      : Object.freeze([] as DeckWorldRelationshipDatum[]);
    const releasingSegments = releasingRelationshipSegments(releasingRelationships);

    // Only the places selected by semantic density belong to the collapsed
    // representation. This matters above the global overview tier: a dense
    // story location may stay clustered while nearby sparse/singleton places
    // are already readable as ordinary nodes.
    const clusteredEntitySource = entityResult.datums.filter((entity) =>
      memberIds.has(entity.worldInstanceId),
    );
    const unclusteredEntities = entityResult.datums.filter(
      (entity) => !memberIds.has(entity.worldInstanceId),
    );
    const placeClusters = clusterEntityDatumsByPlace(
      clusteredEntitySource,
      this.#projection.instances,
      worldPixelsToDegrees(WORLD_CLUSTER_MERGE_PX, this.#camera.zoom),
    );
    const entities: readonly DeckWorldEntityRenderDatum[] =
      clusterPhase === "collapsed"
        ? Object.freeze([...placeClusters, ...unclusteredEntities])
        : Object.freeze(
            entityResult.datums.filter(
              (entity) => !memberIds.has(entity.worldInstanceId) || showMembers,
            ),
          );

    this.#placeDatumCache = placeResult.byId;
    this.#relationshipDatumCache = relationshipResult.byId;
    this.#entityDatumCache = entityResult.byId;
    this.#clusterPhaseLastRender = clusterPhase;
    this.#screenScaleZoomLastRender = screenScaleZoomStep(this.#camera.zoom);
    this.#cameraFacingStepLastRender = cameraFacingStep(this.#camera);
    this.#labelBudgetLastRender = worldLabelBudget(this.#camera.zoom);
    this.#lodCandidateCountLastRender = Math.max(
      places.length,
      relationships.length,
      entityResult.datums.length,
    );
    const visibleEntityRadiusPx = (instanceId: WorldInstanceId): number => {
      const entity = entityResult.byId.get(instanceId);
      if (!entity) return WORLD_ENTITY_MIN_HIT_RADIUS_PX;
      const style = this.#entityStyle(entity);
      return worldNodeMarker(style).size / 2;
    };
    const edgeFallbackColor = (edge: DeckWorldRelationshipDatum): string | undefined => {
      const endpointColor = (entity: DeckWorldEntityDatum | undefined): string | undefined => {
        if (!entity) return undefined;
        const style = this.#entityStyle(entity);
        return style.fill === this.#palette.paper ? style.border : style.fill;
      };
      return (
        endpointColor(entityResult.byId.get(edge.sourceInstanceId)) ??
        endpointColor(entityResult.byId.get(edge.targetInstanceId))
      );
    };
    const edgeAlpha = (
      edge: Pick<DeckWorldRelationshipDatum, "selected" | "emphasized">,
    ): number =>
      edge.selected
        ? 255
        : edge.emphasized
          ? WORLD_EMPHASIZED_EDGE_ALPHA
          : WORLD_INACTIVE_EDGE_ALPHA;
    const visibleDirectionRelationships = relationships.filter(
      (relationship) => !edgeIsClusterAffected(relationship) || showActiveClusterEdges,
    );
    const directionResult = directionDatums(
      visibleDirectionRelationships,
      this.#camera.zoom,
      this.#focus,
      this.#directionDatumCache,
      (edge) => {
        const targetRadiusPx = visibleEntityRadiusPx(edge.targetInstanceId);
        const target = edge.path[edge.path.length - 1];
        const latitude = target?.[1] ?? this.#camera.latitude;
        return worldArrowLengthDegreesForNodeRadius(targetRadiusPx, this.#camera.zoom, latitude);
      },
      (edge) => {
        const targetRadiusPx = visibleEntityRadiusPx(edge.targetInstanceId);
        const target = edge.path[edge.path.length - 1];
        const latitude = target?.[1] ?? this.#camera.latitude;
        return worldNodeClearanceDegreesForRadius(targetRadiusPx + 4, this.#camera.zoom, latitude);
      },
    );
    this.#directionDatumCache = directionResult.byId;
    const focus = this.#focus;
    const pinnedEntity = (entity: DeckWorldEntityDatum) =>
      focus?.kind === "entity" && focus.id === entity.entityId;
    const edgeExpansion = (
      edge: Pick<DeckWorldRelationshipDatum, "sourceInstanceId" | "targetInstanceId">,
    ): number => (!edgeIsClusterAffected(edge) || showActiveClusterEdges ? 1 : 0);
    const entityExpansion = (entity: DeckWorldEntityDatum): number =>
      memberIds.has(entity.worldInstanceId) && !showMembers ? 0 : 1;
    const clusterVisibility = clusterPhase === "collapsed" ? 1 : 0;
    const iconSource = entities.filter(
      (datum): datum is DeckWorldEntityDatum => datum.kind === "entity",
    );

    const labelInteractionKey = [
      this.#selection?.kind ?? "",
      this.#selection?.id ?? "",
      this.#hoverSelection?.kind ?? "",
      this.#hoverSelection?.id ?? "",
      this.#hoverClusterId ?? "",
      this.#focus?.kind ?? "",
      this.#focus?.id ?? "",
    ].join(":");
    const labelInteractionEmphasized = (datum: DeckWorldLabelDatum): boolean => {
      if (datum.kind === "cluster-label") return datum.emphasized;
      if (datum.kind === "place-label") {
        return (
          neighborhood.placeIds.has(datum.placeId) ||
          (this.#focus?.kind === "place" && this.#focus.id === datum.placeId)
        );
      }
      if (datum.kind === "relationship-label") {
        return (
          neighborhood.relationshipIds.has(datum.relationshipId) ||
          (this.#focus?.kind === "relationship" && this.#focus.id === datum.relationshipId)
        );
      }
      return (
        neighborhood.entityIds.has(datum.entityId) ||
        (this.#focus?.kind === "entity" && this.#focus.id === datum.entityId)
      );
    };

    const iconDatums = this.#runtime.createIconLayer
      ? selectPrioritizedLabels(iconSource, {
          budget:
            iconSource.length >= DENSE_CLUSTER_ENTITY_THRESHOLD
              ? worldLabelBudget(this.#camera.zoom)
              : Number.POSITIVE_INFINITY,
          isPinned: pinnedEntity,
          importance: (entity) => entity.visualWeight,
          key: (entity) => entity.worldInstanceId,
        })
      : null;
    const labelEntities = iconSource;
    const labelClusters = entities.filter(
      (datum): datum is DeckWorldClusterDatum => datum.kind === "cluster",
    );
    const labelRelationships = relationships.filter(
      (relationship) =>
        !edgeIsClusterAffected(relationship) || showActiveClusterEdges || showReleasingClusterEdges,
    );
    const labelResult = this.#runtime.createTextLayer
      ? labelDatums({
          places,
          clusters: labelClusters,
          relationships: labelRelationships,
          entities: labelEntities,
          clustered: clusterPhase === "collapsed",
          zoom: this.#camera.zoom,
          focus: this.#focus,
          selection: this.#selection,
          hoverSelection: this.#hoverSelection,
          hoveredClusterId: this.#hoverClusterId,
          previous: this.#labelDatumCache,
          entityMarkerRadiusPx: visibleEntityRadiusPx,
          placeMarkerRadiusPx: (placeId) => {
            const place = placeResult.byId.get(placeId);
            return place ? worldNodeMarker(this.#placeStyle(place)).size / 2 : 0;
          },
          clusterMarkerRadiusPx: (cluster) => {
            const memberRadius = cluster.clusterMembers.reduce(
              (radius, member) => Math.max(radius, visibleEntityRadiusPx(member.worldInstanceId)),
              0,
            );
            return worldClusterMarkerRadiusPx(memberRadius, cluster.clusterMembers.length);
          },
        })
      : null;
    this.#labelDatumCache = labelResult?.byKey ?? new Map();
    const visibleLabels = labelResult ? this.#cameraFacingLabels(labelResult.datums) : [];

    // Tethers follow force-resolved member positions and are removed only at
    // final cluster cleanup; their geometry is never renderer-interpolated.
    const tetherEntities =
      clusterPhase === "collapsed"
        ? entityResult.datums.filter((entity) => !memberIds.has(entity.worldInstanceId))
        : entityResult.datums;
    const tethers = this.#tethers(tetherEntities);
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
              getFillColor: this.#theme.earth,
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
              getColor: this.#theme.graticule,
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
                    getColor: this.#theme.border,
                    parameters: { cullMode: "none" },
                  }),
                  this.#runtime.createPathLayer({
                    id: DECK_WORLD_LAYER_IDS.coastlines,
                    data: this.#visibleLines("coastlines", this.#basemap.coastlines),
                    pickable: false,
                    widthUnits: "pixels",
                    getPath: (path: unknown) => path,
                    getWidth: 1.25,
                    getColor: this.#theme.coastline,
                    parameters: { cullMode: "none" },
                  }),
                ]
              : []),
          ]
        : []),
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.places,
        data: places,
        dataComparator: sameDatumSequence,
        pickable: true,
        // Screen-constant acquisition target. IconLayer owns the visible
        // node-like marker when available; ScatterplotLayer remains the
        // >=44px fallback and pick body.
        radiusUnits: "pixels",
        getPosition: (datum: DeckWorldPlaceDatum) => datum.position,
        getRadius: (datum: DeckWorldPlaceDatum) =>
          Math.max(
            WORLD_ENTITY_MIN_HIT_RADIUS_PX,
            this.#placeStyle(datum).radius + this.#placeStyle(datum).borderWidth,
          ),
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: (datum: DeckWorldPlaceDatum) =>
          this.#runtime.createIconLayer ? 0 : this.#placeStyle(datum).borderWidth,
        getLineColor: (datum: DeckWorldPlaceDatum) =>
          this.#runtime.createIconLayer
            ? this.#theme.hit
            : worldColorBytes(
                this.#placeStyle(datum).border,
                datum.selected ? 255 : datum.emphasized ? 242 : 215,
              ),
        getFillColor: (datum: DeckWorldPlaceDatum) =>
          this.#runtime.createIconLayer
            ? this.#theme.hit
            : worldColorBytes(
                this.#placeStyle(datum).fill,
                datum.selected ? 255 : datum.emphasized ? 242 : 215,
              ),
        updateTriggers: {
          getRadius: this.#palette,
          getLineWidth: this.#palette,
          getLineColor: this.#palette,
          getFillColor: this.#palette,
        },
      }),
      ...(this.#runtime.createIconLayer
        ? [
            this.#runtime.createIconLayer({
              id: DECK_WORLD_LAYER_IDS.placeIcons,
              data: this.#cameraFacingPlaces(places),
              dataComparator: sameDatumSequence,
              pickable: true,
              billboard: true,
              sizeUnits: "pixels",
              getPosition: (datum: DeckWorldPlaceDatum) =>
                liftedPlaceIconPosition(datum.position, this.#camera.zoom),
              getIcon: (datum: DeckWorldPlaceDatum) => worldNodeMarker(this.#placeStyle(datum)),
              getSize: (datum: DeckWorldPlaceDatum) =>
                worldNodeMarker(this.#placeStyle(datum)).size,
              getColor: (datum: DeckWorldPlaceDatum) => [
                255,
                255,
                255,
                Math.round(
                  (datum.selected ? 255 : datum.emphasized ? 242 : 215) *
                    this.#cameraFacingOpacity(datum.position),
                ),
              ],
              updateTriggers: {
                getPosition: [screenScaleZoomStep(this.#camera.zoom)],
                getIcon: this.#palette,
                getSize: this.#palette,
                getColor: [this.#palette, cameraFacingStep(this.#camera)],
              },
              // Far-side markers are filtered explicitly, so visible place
              // billboards can share entity-marker depth behavior safely.
              parameters: { cullMode: "none", depthCompare: "always" },
            }),
          ]
        : []),
      this.#runtime.createPathLayer({
        id: DECK_WORLD_LAYER_IDS.relationships,
        data: activeTemporalRelationships,
        dataComparator: sameDatumSequence,
        pickable: true,
        widthUnits: "pixels",
        getPath: (datum: DeckWorldTemporalRelationshipDatum) =>
          this.#temporalRelationshipStateFor(datum).edge.path,
        // Colour/width by relationship type (Orb semantics) unless the
        // relationship carries its own style. Temporal membership is only
        // presentation state here; WorldProjection already contains truth.
        getWidth: (datum: DeckWorldTemporalRelationshipDatum) => {
          const state = this.#temporalRelationshipStateFor(datum);
          const width = this.#temporalEdgeStyle(datum, edgeFallbackColor(state.edge)).width;
          return (state.temporalActive ? width : 0) * edgeExpansion(state.edge);
        },
        getColor: (datum: DeckWorldTemporalRelationshipDatum) => {
          const state = this.#temporalRelationshipStateFor(datum);
          return worldColorBytes(
            this.#temporalEdgeStyle(datum, edgeFallbackColor(state.edge)).color,
            state.temporalActive
              ? Math.round(edgeAlpha(state.edge) * edgeExpansion(state.edge))
              : 0,
          );
        },
        updateTriggers: {
          getPath: this.#relationshipPathRevision,
          getWidth: [
            this.#palette,
            this.#temporalRelationshipRevision,
            this.#relationshipStyleRevision,
            clusterPhase,
          ],
          getColor: [
            this.#palette,
            this.#temporalRelationshipRevision,
            this.#relationshipStyleRevision,
            clusterPhase,
          ],
        },
        parameters: { cullMode: "none" },
      }),
      ...(releasingSegments.length > 0
        ? [
            this.#runtime.createPathLayer({
              id: DECK_WORLD_LAYER_IDS.releasingRelationships,
              data: releasingSegments,
              pickable: false,
              widthUnits: "pixels",
              getPath: (segment: DeckWorldReleasingRelationshipSegment) => segment.path,
              getWidth: (segment: DeckWorldReleasingRelationshipSegment) =>
                Math.max(
                  1,
                  this.#edgeStyle(segment.edge, edgeFallbackColor(segment.edge)).width * 0.7,
                ),
              getColor: () => worldColorBytes(this.#palette.muted, 180),
              updateTriggers: { getColor: this.#palette, getWidth: clusterPhase },
              parameters: { cullMode: "none" },
            }),
          ]
        : []),
      this.#runtime.createScatterplotLayer({
        id: DECK_WORLD_LAYER_IDS.entities,
        data: entities,
        dataComparator: sameDatumSequence,
        _dataDiff: changedEntityDatumRanges,
        pickable: true,
        radiusUnits: "pixels",
        getPosition: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "entity"
            ? liftedDraggedEntityPosition(
                datum.position,
                this.#camera.zoom,
                this.#activeDragInstanceId === datum.worldInstanceId,
              )
            : datum.position,
        // Individual entities are drawn by the styled marker layer; this
        // layer is their (invisible) pick/drag target. Clusters render only
        // as an outer neutral ring so they never cover the place marker.
        getRadius: (datum: DeckWorldEntityRenderDatum) => {
          if (datum.kind === "cluster") {
            const memberRadius = datum.clusterMembers.reduce(
              (radius, member) => Math.max(radius, visibleEntityRadiusPx(member.worldInstanceId)),
              0,
            );
            return (
              worldClusterMarkerRadiusPx(memberRadius, datum.clusterMembers.length) *
              clusterVisibility
            );
          }
          const expansion = entityExpansion(datum);
          if (expansion <= 0) return 0;
          const visibleRadius =
            this.#entityStyle(datum).radius + this.#entityStyle(datum).borderWidth;
          return Math.max(WORLD_ENTITY_MIN_HIT_RADIUS_PX, visibleRadius * expansion);
        },
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster" ? 1.5 * clusterVisibility : 0,
        getLineColor: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? scaleAlpha(this.#theme.clusterBorder, clusterVisibility)
            : this.#theme.clusterBorder,
        getFillColor: (datum: DeckWorldEntityRenderDatum) =>
          datum.kind === "cluster"
            ? scaleAlpha(this.#theme.cluster, clusterVisibility)
            : this.#theme.hit,
        updateTriggers: {
          getPosition: [this.#dragPresentationRevision, screenScaleZoomStep(this.#camera.zoom)],
          getRadius: [this.#palette, clusterPhase],
          getLineWidth: [clusterPhase],
          getLineColor: [this.#palette, clusterPhase],
          getFillColor: [this.#palette, clusterPhase],
        },
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
      // Tethers: each floating entity hangs from its place on the terrain,
      // making the altitude readable. Presentation only, never pickable, and
      // only created when something floats (an extra layer still costs a
      // picking pass).
      ...(tethers.length > 0
        ? [
            this.#runtime.createPathLayer({
              id: DECK_WORLD_LAYER_IDS.tethers,
              data: tethers,
              dataComparator: sameDatumSequence,
              pickable: false,
              widthUnits: "pixels",
              getPath: (tether: DeckWorldTether) => tether.path,
              getWidth: WORLD_TETHER_WIDTH_PX,
              getColor: this.#theme.tether,
              updateTriggers: {
                getWidth: [clusterPhase],
                getColor: [this.#palette, clusterPhase],
              },
              parameters: { cullMode: "none" },
            }),
          ]
        : []),
      ...(iconDatums && this.#runtime.createIconLayer
        ? [
            this.#runtime.createIconLayer({
              id: DECK_WORLD_LAYER_IDS.entityIcons,
              data: this.#cameraFacingEntities(iconDatums),
              dataComparator: sameDatumSequence,
              _dataDiff: changedEntityDatumRanges,
              pickable: true,
              billboard: true,
              sizeUnits: "pixels",
              getPosition: (datum: DeckWorldEntityDatum) =>
                liftedDraggedEntityPosition(
                  datum.position,
                  this.#camera.zoom,
                  this.#activeDragInstanceId === datum.worldInstanceId,
                ),
              // Styled node markers: shape, fill, border and icon/image from
              // the entity's own style or the type default.
              getIcon: (datum: DeckWorldEntityDatum) =>
                worldNodeMarker(
                  this.#entityStyle(datum, muteMembers && memberIds.has(datum.worldInstanceId)),
                ),
              getSize: (datum: DeckWorldEntityDatum) =>
                worldNodeMarker(
                  this.#entityStyle(datum, muteMembers && memberIds.has(datum.worldInstanceId)),
                ).size *
                entityExpansion(datum) *
                (this.#dragFlashInstanceId === datum.worldInstanceId
                  ? WORLD_DRAG_PICKUP_FLASH_SCALE
                  : 1),
              getColor: (datum: DeckWorldEntityDatum) => {
                // Keep the authored fill visibly distinct from the app background.
                // Horizon visibility is camera-derived and never uses renderer transitions.
                const emphasisAlpha = datum.selected ? 255 : datum.emphasized ? 245 : 230;
                return [
                  255,
                  255,
                  255,
                  Math.round(emphasisAlpha * this.#cameraFacingOpacity(datum.position)),
                ] as Rgba;
              },
              updateTriggers: {
                getPosition: [
                  this.#dragPresentationRevision,
                  screenScaleZoomStep(this.#camera.zoom),
                ],
                getIcon: this.#palette,
                getSize: [
                  this.#palette,
                  clusterPhase,
                  clusterPhase,
                  this.#dragPresentationRevision,
                ],
                getColor: [clusterPhase, cameraFacingStep(this.#camera)],
              },
              // GlobeView culls back faces; billboarded icon quads vanish
              // without this (same as the label TextLayer). Markers draw
              // without depth testing so the invisible earth never clips
              // their lower half; far-side markers are filtered out above.
              parameters: { cullMode: "none", depthCompare: "always" },
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
        data: directionResult.datums.filter(
          (datum) => this.#edgeStyle(datum.edge, edgeFallbackColor(datum.edge)).arrow,
        ),
        dataComparator: sameDatumSequence,
        pickable: true,
        widthUnits: "pixels",
        widthMinPixels: 0,
        jointRounded: true,
        capRounded: true,
        getPath: (datum: DeckWorldDirectionDatum) => datum.path,
        getWidth: (datum: DeckWorldDirectionDatum) => {
          const targetRadiusPx = visibleEntityRadiusPx(datum.targetInstanceId);
          return (
            worldArrowStrokeWidthPxForNodeRadius(
              targetRadiusPx,
              this.#edgeStyle(datum.edge, edgeFallbackColor(datum.edge)).width,
            ) * edgeExpansion(datum)
          );
        },
        getColor: (datum: DeckWorldDirectionDatum) =>
          worldColorBytes(
            this.#edgeStyle(datum.edge, edgeFallbackColor(datum.edge)).color,
            Math.round(edgeAlpha(datum.edge) * edgeExpansion(datum)),
          ),
        updateTriggers: {
          getWidth: [this.#palette, clusterPhase],
          getColor: [this.#palette, clusterPhase],
        },
        parameters: { cullMode: "none" },
      }),
      ...(visibleLabels.length > 0 && this.#runtime.createTextLayer
        ? [
            this.#runtime.createTextLayer({
              id: DECK_WORLD_LAYER_IDS.labels,
              data: visibleLabels,
              dataComparator: sameDatumSequence,
              pickable: false,
              billboard: true,
              characterSet: "auto",
              sizeUnits: "pixels",
              fontFamily: this.#labelFontFamily,
              fontWeight: 700,
              fontSettings: { sdf: true, fontSize: 64, buffer: 8, radius: 16 },
              outlineWidth: LABEL_HALO_PX,
              outlineColor: this.#theme.labelHalo,
              ...(this.#labelCollisionExtension
                ? {
                    extensions: [this.#labelCollisionExtension],
                    collisionGroup: "lum-world-labels",
                    // CPU LOD/placement already owns collision handling. The
                    // extra GPU collision pass can suppress the whole TextLayer
                    // under GlobeView, so keep it inert until that path is
                    // independently certified.
                    collisionEnabled: false,
                    getCollisionPriority: worldLabelCollisionPriority,
                  }
                : {}),
              getText: (datum: DeckWorldLabelDatum) => datum.text,
              getPosition: (datum: DeckWorldLabelDatum) => datum.position,
              getSize: worldGraphLabelSize,
              getColor: (datum: DeckWorldLabelDatum) => {
                const base = labelInteractionEmphasized(datum)
                  ? this.#theme.labelEmphasis
                  : datum.kind === "place-label" || datum.kind === "cluster-label"
                    ? this.#theme.labelPlace
                    : datum.kind === "relationship-label"
                      ? this.#theme.labelRelationship
                      : this.#theme.labelText;
                const facing = this.#cameraFacingOpacity(datum.position);
                if (datum.kind === "place-label") return scaleAlpha(base, facing);
                if (datum.kind === "cluster-label") {
                  return scaleAlpha(base, facing * clusterVisibility);
                }
                if (datum.kind === "relationship-label") {
                  const edge = relationshipResult.byId.get(datum.relationshipId);
                  return scaleAlpha(base, facing * (edge ? edgeExpansion(edge) : 0));
                }
                const entity = entityResult.byId.get(datum.worldInstanceId);
                const entityBase =
                  muteMembers && memberIds.has(datum.worldInstanceId)
                    ? this.#theme.labelPlace
                    : base;
                return scaleAlpha(entityBase, facing * (entity ? entityExpansion(entity) : 0));
              },
              getTextAnchor: "middle",
              getAlignmentBaseline: "center",
              getPixelOffset: labelPixelOffset,
              updateTriggers: {
                // Interaction updates invalidate color only. Position is
                // supplied directly by force-resolved topology and must
                // never get a second deck transition on hover/selection.
                getColor: [
                  this.#palette,
                  clusterPhase,
                  clusterPhase,
                  labelInteractionKey,
                  cameraFacingStep(this.#camera),
                ],
              },
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
    this.#warmUpPicking();
    this.#updateLiveRegion();
  }

  #pickingWarm = false;
  #pickingWarmScheduled = false;

  /**
   * deck.gl compiles picking shaders lazily on the first pick, which can
   * take hundreds of milliseconds on software GPUs and would land on the
   * user's first tap (delaying a swipe's events until it reads as a long
   * press). Do one throwaway pick while the browser is idle instead.
   */
  #warmUpPicking(): void {
    if (this.#pickingWarm || this.#pickingWarmScheduled) return;
    this.#pickingWarmScheduled = true;
  }

  /** Runs after deck's first frame with layers (see `onAfterRender`). */
  #afterRender = (): void => {
    if (this.#pickingWarm || !this.#pickingWarmScheduled || this.#destroyed) return;
    this.#pickingWarm = true;
    // Next task, so the throwaway pick never lengthens the frame itself.
    globalThis.setTimeout(() => {
      if (!this.#destroyed) this.pick({ x: 1, y: 1 });
    }, 0);
  };

  #updateLiveRegion(): void {
    if (!this.#liveRegion) return;
    const snapshot = this.getAccessibleSnapshot();
    this.#liveRegion.textContent = accessibleSnapshotSummary(snapshot);
    this.#accessibleMirror?.sync(buildWorldAccessibleOutline(snapshot));
  }

  #detailFocusZoom(minimumZoom = focusZoom(this.#camera.zoom)): number {
    const markerThreshold =
      this.#projection.instances.length >= OVERVIEW_CLUSTER_MIN_ENTITY_COUNT
        ? clusterZoomThresholdForNodeRadius(this.#clusterEntityFootprintRadiusPx())
        : 0;
    const denseThreshold =
      this.#projection.instances.length >= DENSE_CLUSTER_ENTITY_THRESHOLD
        ? DENSE_CLUSTER_ZOOM_THRESHOLD
        : 0;
    return Math.max(
      minimumZoom,
      markerThreshold > 0 ? markerThreshold + 0.25 : 0,
      denseThreshold > 0 ? denseThreshold + 0.25 : 0,
    );
  }

  #focusPosition(position: WorldRenderPosition | null, zoom = this.#detailFocusZoom()): void {
    this.#assertAlive();
    if (!position) return;

    this.setCamera({
      ...this.#camera,
      longitude: position[0],
      latitude: position[1],
      zoom,
    });
  }

  #focusCluster(position: WorldRenderPosition, memberCount = 1): void {
    const densityThreshold = clusterZoomThresholdForPlaceDensity(
      this.#clusterEntityFootprintRadiusPx(),
      memberCount,
    );
    this.#focusPosition(
      position,
      Math.max(this.#detailFocusZoom(this.#camera.zoom + 1), densityThreshold + 0.25),
    );
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

  #visiblePlaceCache: readonly DeckWorldPlaceDatum[] = [];
  #visibleEntityCache: readonly DeckWorldEntityDatum[] = [];
  #tetherCache = new WeakMap<DeckWorldEntityDatum, DeckWorldTether>();

  /** Place-to-entity tethers, reused per (memoized) entity datum. */
  #tethers(entities: readonly DeckWorldEntityDatum[]): readonly DeckWorldTether[] {
    if (entities.length === 0 || this.#floatMeters <= 0) return [];
    const anchors = new Map<WorldInstanceId, WorldRenderPosition>();
    for (const instance of this.#projection.instances) {
      const anchor = instance.geographicAnchors[0];
      if (anchor) {
        anchors.set(instance.id, [anchor.longitude, anchor.latitude, anchor.sourceAltitude ?? 0]);
      }
    }
    const result: DeckWorldTether[] = [];
    for (const entity of entities) {
      const cached = this.#tetherCache.get(entity);
      if (cached) {
        result.push(cached);
        continue;
      }
      const anchor = anchors.get(entity.worldInstanceId);
      if (!anchor) continue;
      const tether: DeckWorldTether = Object.freeze({
        worldInstanceId: entity.worldInstanceId,
        path: Object.freeze([anchor, entity.position]) as readonly [
          WorldRenderPosition,
          WorldRenderPosition,
        ],
      });
      this.#tetherCache.set(entity, tether);
      result.push(tether);
    }
    return result;
  }

  /** Near-side places only (markers skip depth testing), reusing the array. */
  #cameraFacingPlaces(datums: readonly DeckWorldPlaceDatum[]): readonly DeckWorldPlaceDatum[] {
    const visible = datums.filter((datum) => this.#facesCamera(datum.position));
    const previous = this.#visiblePlaceCache;
    if (
      previous.length === visible.length &&
      previous.every((datum, index) => datum === visible[index])
    ) {
      return previous;
    }
    this.#visiblePlaceCache = visible;
    return visible;
  }

  /** Near-side entities only (markers skip depth testing), reusing the array. */
  #cameraFacingEntities(datums: readonly DeckWorldEntityDatum[]): readonly DeckWorldEntityDatum[] {
    const visible = datums.filter((datum) => this.#facesCamera(datum.position));
    const previous = this.#visibleEntityCache;
    if (
      previous.length === visible.length &&
      previous.every((datum, index) => datum === visible[index])
    ) {
      return previous;
    }
    this.#visibleEntityCache = visible;
    return visible;
  }

  /** Camera-facing opacity: fully visible away from the limb, smoothly zero at the horizon. */
  #cameraFacingOpacity(position: WorldRenderPosition): number {
    const radians = Math.PI / 180;
    const latitude = position[1] * radians;
    const cameraLatitude = this.#camera.latitude * radians;
    const deltaLongitude = (position[0] - this.#camera.longitude) * radians;
    const facing =
      Math.sin(latitude) * Math.sin(cameraLatitude) +
      Math.cos(latitude) * Math.cos(cameraLatitude) * Math.cos(deltaLongitude);
    return Math.max(0, Math.min(1, facing / WORLD_CAMERA_FACING_FADE_END));
  }

  /** True when a position is at least partially visible on the camera-facing hemisphere. */
  #facesCamera(position: WorldRenderPosition): boolean {
    return this.#cameraFacingOpacity(position) > 0;
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("DeckWorldSurface has been destroyed.");
  }
}
