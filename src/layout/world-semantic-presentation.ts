import type { WorldRenderPosition } from "./world-geographic-position.ts";

/**
 * Renderer-neutral semantic presentation rules for the WorldSurface: label
 * level-of-detail and directed relationship markers. Nothing here touches
 * canonical data or renderer state; every rule is a pure function of the
 * projection-derived render positions, weights and the current camera zoom.
 */

/** Minimum Mercator-like zoom at which each label budget applies. */
const LABEL_BUDGETS: readonly (readonly [minimumZoom: number, budget: number])[] = [
  [6, 2_000],
  [4, 600],
  [2, 150],
  [1, 60],
];
const OVERVIEW_LABEL_BUDGET = 25;

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
