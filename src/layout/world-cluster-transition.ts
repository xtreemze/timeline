export const WORLD_CLUSTER_EDGE_RELEASE_MS = 420;
export const WORLD_CLUSTER_SETTLE_MS = 1_500;
export const WORLD_CLUSTER_ZOOM_HYSTERESIS = 0.2;

export type WorldClusterLifecyclePhase =
  | "expanded"
  | "releasing"
  | "collapsing"
  | "collapsed"
  | "expanding";

/**
 * Hysteretic zoom decision only. This function never computes an interpolated
 * position: all topology motion belongs to D3 force.
 */
export function worldClusterWantsCollapsed(
  zoom: number,
  threshold: number,
  phase: WorldClusterLifecyclePhase,
): boolean {
  if (!Number.isFinite(zoom) || !Number.isFinite(threshold)) return false;
  const clustered =
    phase === "releasing" || phase === "collapsing" || phase === "collapsed";
  return clustered
    ? zoom < threshold + WORLD_CLUSTER_ZOOM_HYSTERESIS
    : zoom < threshold - WORLD_CLUSTER_ZOOM_HYSTERESIS;
}

export function worldClusterShowsMembers(phase: WorldClusterLifecyclePhase): boolean {
  return phase !== "collapsed";
}

export function worldClusterShowsActiveEdges(phase: WorldClusterLifecyclePhase): boolean {
  return phase === "expanded";
}

export function worldClusterShowsReleasingEdges(phase: WorldClusterLifecyclePhase): boolean {
  return phase === "releasing";
}

export function worldClusterMutesMembers(phase: WorldClusterLifecyclePhase): boolean {
  return phase === "releasing" || phase === "collapsing" || phase === "expanding";
}
