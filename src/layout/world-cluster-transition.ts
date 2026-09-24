export const WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO = 0.7;
export const WORLD_CLUSTER_EXPANDED_RADIUS_RATIO = 1.35;

/**
 * Hysteretic semantic-LOD decision only. This function never returns a
 * progress value and must not be used to interpolate rendered positions.
 *
 * Once expanded, a local graph does not collapse until it becomes clearly
 * unreadable. Once clustered, it does not expand until there is clearly
 * enough room for the force layout. The actual movement between these states
 * belongs entirely to the force backend.
 */
export function worldClusterTarget(
  localRadiusPx: number,
  clusterRadiusPx: number,
  currentlyClustered: boolean,
): boolean {
  if (!Number.isFinite(localRadiusPx) || localRadiusPx <= 0) return true;
  if (!Number.isFinite(clusterRadiusPx) || clusterRadiusPx <= 0) return false;

  const collapseBelow = clusterRadiusPx * WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO;
  const expandAbove = clusterRadiusPx * WORLD_CLUSTER_EXPANDED_RADIUS_RATIO;
  return currentlyClustered ? localRadiusPx < expandAbove : localRadiusPx <= collapseBelow;
}
