import type { WorldRenderPosition } from "./world-geographic-position.ts";

/**
 * Renderer-neutral semantic presentation rules for the WorldSurface: label
 * level-of-detail and directed relationship markers. Nothing here touches
 * canonical data or renderer state; every rule is a pure function of the
 * projection-derived render positions, weights and the current camera zoom.
 */

/** Minimum Mercator-like zoom at which each label budget applies. */
// Tuned on real projects: co-located occurrences stack their labels at one
// anchor, so regional zooms keep only a handful of the most important ones.
const LABEL_BUDGETS: readonly (readonly [minimumZoom: number, budget: number])[] = [
  [9, 4_000],
  [7, 2_000],
  [5, 240],
  [3, 48],
  [1.5, 24],
];
const OVERVIEW_LABEL_BUDGET = 12;

/** Places are sparse canonical geography; their labels get a higher floor. */
export const WORLD_PLACE_LABEL_FLOOR = 40;

/**
 * How many optional labels of one kind may be drawn at a zoom level. Pinned
 * (selected/focused) labels never count against this budget.
 */
export function worldLabelBudget(zoom: number): number {
  if (!Number.isFinite(zoom)) return OVERVIEW_LABEL_BUDGET;
  for (const [minimumZoom, budget] of LABEL_BUDGETS) {
    if (zoom >= minimumZoom) return budget;
  }
  return OVERVIEW_LABEL_BUDGET;
}

export interface WorldLabelPriority<T> {
  readonly budget: number;
  isPinned(candidate: T): boolean;
  importance(candidate: T): number;
  key(candidate: T): string;
}

/**
 * Keeps every pinned candidate plus the most important remaining ones up to
 * `budget`. Ties break on the stable key, and the result is returned in the
 * candidates' original order so memoized downstream data stays stable.
 */
export function selectPrioritizedLabels<T>(
  candidates: readonly T[],
  priority: WorldLabelPriority<T>,
): readonly T[] {
  const budget = Math.max(0, Math.floor(priority.budget));
  if (candidates.length <= budget) return candidates;

  const optional: T[] = [];
  const kept = new Set<T>();
  for (const candidate of candidates) {
    if (priority.isPinned(candidate)) kept.add(candidate);
    else optional.push(candidate);
  }

  optional.sort(
    (left, right) =>
      priority.importance(right) - priority.importance(left) ||
      priority.key(left).localeCompare(priority.key(right)),
  );
  for (let index = 0; index < budget && index < optional.length; index += 1) {
    const candidate = optional[index];
    if (candidate !== undefined) kept.add(candidate);
  }

  return Object.freeze(candidates.filter((candidate) => kept.has(candidate)));
}

/** Arrowhead apex position along the edge, as a fraction from the source. */
const ARROW_APEX_FRACTION = 0.82;
/** Arrowhead length as a fraction of the edge length. */
const ARROW_LENGTH_FRACTION = 0.1;
/** Half of the arrowhead base width relative to its length. */
const ARROW_HALF_WIDTH_RATIO = 0.55;
const MINIMUM_EDGE_LENGTH_DEGREES = 1e-9;
const MINIMUM_LONGITUDE_SCALE = 1e-3;

function shortestLongitudeDelta(from: number, to: number): number {
  const delta = to - from;
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

function wrapLongitude(value: number): number {
  return value >= -180 && value <= 180 ? value : ((((value + 180) % 360) + 360) % 360) - 180;
}

function clampLatitude(value: number): number {
  return Math.max(-90, Math.min(90, value));
}

/**
 * A chevron `[wing, apex, wing]` placed on the source→target edge with its
 * apex toward the target, so the direction of every rendered relationship is
 * visible in world space (it rotates with the camera instead of relying on
 * screen-space glyph orientation). Returns null for a zero-length edge,
 * which has no visible direction to mark.
 */
export function directedEdgeArrowhead(
  source: WorldRenderPosition,
  target: WorldRenderPosition,
): readonly [WorldRenderPosition, WorldRenderPosition, WorldRenderPosition] | null {
  const midLatitude = ((source[1] + target[1]) / 2) * (Math.PI / 180);
  const longitudeScale = Math.max(MINIMUM_LONGITUDE_SCALE, Math.cos(midLatitude));
  const dx = shortestLongitudeDelta(source[0], target[0]) * longitudeScale;
  const dy = target[1] - source[1];
  const length = Math.hypot(dx, dy);
  if (!(length > MINIMUM_EDGE_LENGTH_DEGREES)) return null;

  const ux = dx / length;
  const uy = dy / length;
  const head = length * ARROW_LENGTH_FRACTION;
  const halfWidth = head * ARROW_HALF_WIDTH_RATIO;
  const apexX = dx * ARROW_APEX_FRACTION;
  const apexY = dy * ARROW_APEX_FRACTION;
  const baseX = apexX - ux * head;
  const baseY = apexY - uy * head;
  const baseFraction = ARROW_APEX_FRACTION - ARROW_LENGTH_FRACTION;
  const altitudeAt = (fraction: number) => source[2] + (target[2] - source[2]) * fraction;

  const point = (x: number, y: number, fraction: number): WorldRenderPosition =>
    Object.freeze([
      wrapLongitude(source[0] + x / longitudeScale),
      clampLatitude(source[1] + y),
      altitudeAt(fraction),
    ]) as WorldRenderPosition;

  return Object.freeze([
    point(baseX - uy * halfWidth, baseY + ux * halfWidth, baseFraction),
    point(apexX, apexY, ARROW_APEX_FRACTION),
    point(baseX + uy * halfWidth, baseY - ux * halfWidth, baseFraction),
  ]) as readonly [WorldRenderPosition, WorldRenderPosition, WorldRenderPosition];
}

/** Geographic midpoint of an edge, used to anchor its relationship label. */
export function edgeMidpoint(
  source: WorldRenderPosition,
  target: WorldRenderPosition,
): WorldRenderPosition {
  return Object.freeze([
    wrapLongitude(source[0] + shortestLongitudeDelta(source[0], target[0]) / 2),
    (source[1] + target[1]) / 2,
    (source[2] + target[2]) / 2,
  ]) as WorldRenderPosition;
}

/** Fixed topology lets deck interpolate straight<->curved relationship paths. */
const WORLD_RELATIONSHIP_PATH_SEGMENTS = 8;
/**
 * Quadratic control-point displacement relative to endpoint distance. The
 * visible maximum bend is half this value at t=.5 (14% for lane 1).
 */
const WORLD_PARALLEL_EDGE_CONTROL_OFFSET_RATIO = 0.28;

function edgePathPointAtFraction(
  path: readonly WorldRenderPosition[],
  fraction: number,
): WorldRenderPosition {
  if (path.length === 0) {
    return Object.freeze([0, 0, 0]) as WorldRenderPosition;
  }
  if (path.length === 1) return path[0]!;
  const clamped = Math.max(0, Math.min(1, fraction));
  const scaled = clamped * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const left = path[index]!;
  const right = path[index + 1]!;
  return Object.freeze([
    wrapLongitude(left[0] + shortestLongitudeDelta(left[0], right[0]) * local),
    left[1] + (right[1] - left[1]) * local,
    left[2] + (right[2] - left[2]) * local,
  ]) as WorldRenderPosition;
}

/**
 * Stable world-space relationship geometry. lane=0 is visually straight;
 * non-zero lanes bend in the tangent plane while preserving both endpoints.
 * All paths contain the same point count so renderer transitions can morph
 * between straight and curved states when parallel topology changes.
 */
export function relationshipEdgePath(
  source: WorldRenderPosition,
  target: WorldRenderPosition,
  lane = 0,
): readonly WorldRenderPosition[] {
  const midLatitude = ((source[1] + target[1]) / 2) * (Math.PI / 180);
  const longitudeScale = Math.max(MINIMUM_LONGITUDE_SCALE, Math.cos(midLatitude));
  const dx = shortestLongitudeDelta(source[0], target[0]) * longitudeScale;
  const dy = target[1] - source[1];
  const length = Math.hypot(dx, dy);
  const finiteLane = Number.isFinite(lane) ? lane : 0;
  const perpendicularX = length > MINIMUM_EDGE_LENGTH_DEGREES ? -dy / length : 0;
  const perpendicularY = length > MINIMUM_EDGE_LENGTH_DEGREES ? dx / length : 0;
  const controlOffset = length * WORLD_PARALLEL_EDGE_CONTROL_OFFSET_RATIO * finiteLane;
  const controlX = dx / 2 + perpendicularX * controlOffset;
  const controlY = dy / 2 + perpendicularY * controlOffset;
  const points: WorldRenderPosition[] = [];

  for (let index = 0; index <= WORLD_RELATIONSHIP_PATH_SEGMENTS; index += 1) {
    const t = index / WORLD_RELATIONSHIP_PATH_SEGMENTS;
    const oneMinusT = 1 - t;
    const x = 2 * oneMinusT * t * controlX + t * t * dx;
    const y = 2 * oneMinusT * t * controlY + t * t * dy;
    points.push(
      Object.freeze([
        wrapLongitude(source[0] + x / longitudeScale),
        clampLatitude(source[1] + y),
        source[2] + (target[2] - source[2]) * t,
      ]) as WorldRenderPosition,
    );
  }

  return Object.freeze(points);
}

/** Midpoint on the rendered path, used by relationship labels. */
export function edgePathMidpoint(path: readonly WorldRenderPosition[]): WorldRenderPosition {
  return edgePathPointAtFraction(path, 0.5);
}

/**
 * Direction chevron aligned to the local tangent of a rendered path, so
 * parallel curved relationships retain unambiguous source→target direction.
 */
export function directedEdgePathArrowhead(
  path: readonly WorldRenderPosition[],
): readonly [WorldRenderPosition, WorldRenderPosition, WorldRenderPosition] | null {
  if (path.length < 2) return null;
  const source = path[0]!;
  const target = path[path.length - 1]!;
  const apex = edgePathPointAtFraction(path, ARROW_APEX_FRACTION);
  const before = edgePathPointAtFraction(path, ARROW_APEX_FRACTION - 0.06);
  const after = edgePathPointAtFraction(path, ARROW_APEX_FRACTION + 0.06);

  const tangentLatitude = ((before[1] + after[1]) / 2) * (Math.PI / 180);
  const tangentLongitudeScale = Math.max(MINIMUM_LONGITUDE_SCALE, Math.cos(tangentLatitude));
  const tangentX = shortestLongitudeDelta(before[0], after[0]) * tangentLongitudeScale;
  const tangentY = after[1] - before[1];
  const tangentLength = Math.hypot(tangentX, tangentY);

  const chordLatitude = ((source[1] + target[1]) / 2) * (Math.PI / 180);
  const chordLongitudeScale = Math.max(MINIMUM_LONGITUDE_SCALE, Math.cos(chordLatitude));
  const chordX = shortestLongitudeDelta(source[0], target[0]) * chordLongitudeScale;
  const chordY = target[1] - source[1];
  const chordLength = Math.hypot(chordX, chordY);
  if (
    !(tangentLength > MINIMUM_EDGE_LENGTH_DEGREES) ||
    !(chordLength > MINIMUM_EDGE_LENGTH_DEGREES)
  ) {
    return null;
  }

  const ux = tangentX / tangentLength;
  const uy = tangentY / tangentLength;
  const head = chordLength * ARROW_LENGTH_FRACTION;
  const halfWidth = head * ARROW_HALF_WIDTH_RATIO;
  const baseX = -ux * head;
  const baseY = -uy * head;
  const baseAltitude = edgePathPointAtFraction(
    path,
    ARROW_APEX_FRACTION - ARROW_LENGTH_FRACTION,
  )[2];
  const apexLongitudeScale = Math.max(
    MINIMUM_LONGITUDE_SCALE,
    Math.cos((apex[1] * Math.PI) / 180),
  );
  const point = (x: number, y: number): WorldRenderPosition =>
    Object.freeze([
      wrapLongitude(apex[0] + x / apexLongitudeScale),
      clampLatitude(apex[1] + y),
      baseAltitude,
    ]) as WorldRenderPosition;

  return Object.freeze([
    point(baseX - uy * halfWidth, baseY + ux * halfWidth),
    apex,
    point(baseX + uy * halfWidth, baseY - ux * halfWidth),
  ]) as readonly [WorldRenderPosition, WorldRenderPosition, WorldRenderPosition];
}

/** Most zoomed-out zoom of the LOD tier containing `zoom`. */
export function worldLabelTierFloor(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0;
  for (const [minimumZoom] of LABEL_BUDGETS) {
    if (zoom >= minimumZoom) return minimumZoom;
  }
  return 0;
}

export interface WorldLabelFootprint {
  readonly longitude: number;
  readonly latitude: number;
  /** Estimated on-screen size in pixels. */
  readonly width: number;
  readonly height: number;
  /** Pixel offset of the label box centre from its anchor (y down). */
  readonly offsetX?: number;
  readonly offsetY?: number;
}

export interface WorldLabelDeclutterOptions<T> {
  readonly zoom: number;
  measure(candidate: T): WorldLabelFootprint;
  isPinned(candidate: T): boolean;
}

const WORLD_PIXELS_PER_DEGREE_AT_ZOOM_0 = 512 / 360;
const DECLUTTER_CELL_PX = 96;

/**
 * Greedy screen-space declutter: walks candidates in priority order and
 * drops a label whose estimated screen box would overlap one already kept.
 * Pinned (selected/focused) labels are always kept. Screen positions are
 * approximated from geography at `zoom` (callers pass the LOD tier floor so
 * labels cannot collide anywhere within the tier). A spatial grid keeps the
 * pass near-linear for large label sets.
 */
export function declutterWorldLabels<T>(
  candidates: readonly T[],
  options: WorldLabelDeclutterOptions<T>,
): readonly T[] {
  const scale = WORLD_PIXELS_PER_DEGREE_AT_ZOOM_0 * 2 ** Math.max(0, options.zoom);
  interface Box {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  }
  const grid = new Map<string, Box[]>();
  const cells = (box: Box) => {
    const keys: string[] = [];
    for (
      let x = Math.floor(box.left / DECLUTTER_CELL_PX);
      x <= Math.floor(box.right / DECLUTTER_CELL_PX);
      x += 1
    ) {
      for (
        let y = Math.floor(box.top / DECLUTTER_CELL_PX);
        y <= Math.floor(box.bottom / DECLUTTER_CELL_PX);
        y += 1
      ) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  };
  const overlaps = (a: Box, b: Box) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  const kept: T[] = [];
  for (const candidate of candidates) {
    const footprint = options.measure(candidate);
    const latitudeScale = Math.max(0.2, Math.cos((footprint.latitude * Math.PI) / 180));
    const x = footprint.longitude * scale * latitudeScale + (footprint.offsetX ?? 0);
    const y = -footprint.latitude * scale + (footprint.offsetY ?? 0);
    const box: Box = {
      left: x - footprint.width / 2,
      right: x + footprint.width / 2,
      top: y - footprint.height / 2,
      bottom: y + footprint.height / 2,
    };
    const keys = cells(box);
    const pinned = options.isPinned(candidate);
    if (!pinned && keys.some((key) => grid.get(key)?.some((other) => overlaps(box, other)))) {
      continue;
    }
    kept.push(candidate);
    for (const key of keys) {
      const bucket = grid.get(key);
      if (bucket) bucket.push(box);
      else grid.set(key, [box]);
    }
  }
  return Object.freeze(kept);
}

/**
 * Semantic-zoom magnification of local layout offsets. Local graphs are laid
 * out in metres around a place, which is sub-pixel at city or country zoom;
 * magnifying offsets so a place's typical local radius stays readable while
 * the stored offsets stay untouched. At detail zoom, the floating topology
 * intentionally grows in screen space instead of treating zoom as globe-only:
 * geography remains anchored while the graph gains room for direct
 * manipulation. Never shrinks (scale >= 1), and is quantised to quarter
 * octaves so positions only rebuild on meaningful zoom changes. Dense scenes
 * (already clustered) keep 1.
 */
export const WORLD_LOCAL_GRAPH_RADIUS_PX = 320;
export const WORLD_FLOATING_GRAPH_DETAIL_ZOOM = 7;
export const WORLD_FLOATING_GRAPH_MAX_EXPANSION = 2;
const WORLD_FLOATING_GRAPH_DETAIL_GROWTH_PER_ZOOM = 0.25;
const WORLD_METERS_PER_PIXEL_AT_ZOOM_0 = 40_075_016.686 / 512;

export function worldFloatingGraphRadiusPx(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= WORLD_FLOATING_GRAPH_DETAIL_ZOOM) {
    return WORLD_LOCAL_GRAPH_RADIUS_PX;
  }
  const expansion = Math.min(
    WORLD_FLOATING_GRAPH_MAX_EXPANSION,
    2 ** ((zoom - WORLD_FLOATING_GRAPH_DETAIL_ZOOM) * WORLD_FLOATING_GRAPH_DETAIL_GROWTH_PER_ZOOM),
  );
  return WORLD_LOCAL_GRAPH_RADIUS_PX * expansion;
}

export function worldPresentationOffsetScale(
  zoom: number,
  entityCount: number,
  typicalOffsetMeters: number,
  latitude = 0,
): number {
  if (
    !Number.isFinite(zoom) ||
    entityCount >= 25_000 ||
    !Number.isFinite(typicalOffsetMeters) ||
    typicalOffsetMeters <= 0
  ) {
    return 1;
  }
  const cosine = Math.max(0.05, Math.cos((latitude * Math.PI) / 180));
  const metersPerPixel = (WORLD_METERS_PER_PIXEL_AT_ZOOM_0 * cosine) / 2 ** zoom;
  const wanted = (worldFloatingGraphRadiusPx(zoom) * metersPerPixel) / typicalOffsetMeters;
  if (wanted <= 1) return 1;
  return 2 ** (Math.round(Math.log2(wanted) * 4) / 4);
}

/** 90th-percentile distance of local offsets from their anchors, in metres. */
export function typicalLocalOffsetMeters(
  offsets: readonly { readonly eastMeters: number; readonly northMeters: number }[],
): number {
  const distances = offsets
    .map((offset) => Math.hypot(offset.eastMeters, offset.northMeters))
    .filter((distance) => Number.isFinite(distance) && distance > 0)
    .sort((left, right) => left - right);
  if (distances.length === 0) return 0;
  return distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.9))] ?? 0;
}

const EARTH_RADIUS_M = 6_371_008.8;

function haversineMeters(a: readonly [number, number], b: readonly [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Median distance from a place to its nearest other place (metres), from up
 * to `sample` places so very large projects stay cheap. 0 for < 2 places.
 */
export function medianNearestPlaceMeters(
  places: readonly (readonly [number, number])[],
  sample = 400,
): number {
  if (places.length < 2) return 0;
  const step = Math.max(1, Math.floor(places.length / sample));
  const nearest: number[] = [];
  for (let index = 0; index < places.length; index += step) {
    const origin = places[index] as readonly [number, number];
    let best = Number.POSITIVE_INFINITY;
    for (let other = 0; other < places.length; other += 1) {
      if (other === index) continue;
      const distance = haversineMeters(origin, places[other] as readonly [number, number]);
      if (distance > 0 && distance < best) best = distance;
    }
    if (Number.isFinite(best)) nearest.push(best);
  }
  nearest.sort((left, right) => left - right);
  return nearest[Math.floor(nearest.length / 2)] ?? 0;
}

/**
 * Multiple of the median nearest-place distance a magnified local graph may
 * span: neighbouring places' graphs may overlap a little (as in one planar
 * graph), but a place's entities never spread across a region.
 */
export const WORLD_LOCAL_GRAPH_MAX_PLACE_SHARE = 3;
/** Clusters closer than this on screen merge into one bubble. */
export const WORLD_CLUSTER_MERGE_PX = 96;
/** Local graphs at least this large on screen count as readable. */
export const WORLD_READABLE_LOCAL_RADIUS_PX = 200;

/** Degrees of longitude spanned by `pixels` at `zoom` (GlobeView scale). */
export function worldPixelsToDegrees(pixels: number, zoom: number): number {
  return (pixels * 360) / (512 * 2 ** zoom);
}
/** Below this on-screen local radius a place's entities cluster. */
export const WORLD_PLACE_CLUSTER_RADIUS_PX = 112;

/** On-screen radius (pixels) of a local graph of `meters` at `zoom`. */
export function worldLocalRadiusPx(meters: number, zoom: number, latitude = 0): number {
  const cosine = Math.max(0.05, Math.cos((latitude * Math.PI) / 180));
  const metersPerPixel = (WORLD_METERS_PER_PIXEL_AT_ZOOM_0 * cosine) / 2 ** zoom;
  return meters / metersPerPixel;
}

/** On-screen height (pixels) entities float above their place's terrain. */
export const WORLD_ENTITY_FLOAT_PX = 64;
