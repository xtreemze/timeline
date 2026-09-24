import type { WorldRenderPosition } from "./world-geographic-position.ts";

export const WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO = 0.7;
export const WORLD_CLUSTER_EXPANDED_RADIUS_RATIO = 1.35;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clampUnit(value);
  return t * t * (3 - 2 * t);
}

/**
 * Continuous semantic-zoom progress for a place-local graph.
 *
 * 0 means the place owns a fully collapsed cluster. 1 means the active force
 * layout owns the full node positions. The band around the clustering radius
 * deliberately overlaps both states so zoom never swaps one representation
 * for the other in a single frame.
 */
export function worldClusterExpansionProgress(
  localRadiusPx: number,
  clusterRadiusPx: number,
): number {
  if (!Number.isFinite(localRadiusPx) || localRadiusPx <= 0) return 0;
  if (!Number.isFinite(clusterRadiusPx) || clusterRadiusPx <= 0) return 1;

  const collapsed = clusterRadiusPx * WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO;
  const expanded = clusterRadiusPx * WORLD_CLUSTER_EXPANDED_RADIUS_RATIO;
  if (localRadiusPx <= collapsed) return 0;
  if (localRadiusPx >= expanded) return 1;
  return smoothstep((localRadiusPx - collapsed) / (expanded - collapsed));
}

function shortestLongitudeDelta(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

function wrapLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

/**
 * Moves a force-resolved node along the shortest geographic path from its
 * cluster/place origin. Reversing progress gives the exact collapse path.
 */
export function interpolateClusterPosition(
  origin: WorldRenderPosition,
  target: WorldRenderPosition,
  progress: number,
): WorldRenderPosition {
  const t = clampUnit(progress);
  return Object.freeze([
    wrapLongitude(origin[0] + shortestLongitudeDelta(origin[0], target[0]) * t),
    origin[1] + (target[1] - origin[1]) * t,
    origin[2] + (target[2] - origin[2]) * t,
  ]) as WorldRenderPosition;
}
