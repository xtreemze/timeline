export const WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO = 0.7;
export const WORLD_CLUSTER_EXPANDED_RADIUS_RATIO = 1.35;

/** Hysteretic topology decision only. Spatial motion belongs to force state. */
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
