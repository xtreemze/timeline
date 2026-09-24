export const WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO = 0.7;
export const WORLD_CLUSTER_EXPANDED_RADIUS_RATIO = 1.35;

/**
 * Hysteretic semantic-LOD decision only. This function never returns a
 * presentation progress value and must not interpolate node, edge, label,
 * tether, or cluster positions.
 *
 * Once expanded, a local graph collapses only after it becomes clearly
 * unreadable. Once clustered, it expands only after there is clearly enough
 * room for the force layout. All spatial motion belongs to the force backend.
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
