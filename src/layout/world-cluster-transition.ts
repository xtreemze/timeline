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
 * layout owns the full node presentation. This value may control visibility
 * and scale, but it must never interpolate node, edge, label, or tether
 * positions: spatial motion is owned exclusively by the force simulation.
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
