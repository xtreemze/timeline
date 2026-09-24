import type { WorldCameraState } from "./world-surface.ts";

export type WorldSpatialMode = "globe" | "local";

export interface WorldSpatialModePolicy {
  readonly enterLocalAtZoom: number;
  readonly exitLocalBelowZoom: number;
}

export const DEFAULT_WORLD_SPATIAL_MODE_POLICY: WorldSpatialModePolicy = Object.freeze({
  enterLocalAtZoom: 11.5,
  exitLocalBelowZoom: 10.5,
});

function validatePolicy(policy: WorldSpatialModePolicy): WorldSpatialModePolicy {
  if (!Number.isFinite(policy.enterLocalAtZoom) || !Number.isFinite(policy.exitLocalBelowZoom)) {
    throw new Error("World spatial-mode zoom thresholds must be finite.");
  }
  if (policy.exitLocalBelowZoom >= policy.enterLocalAtZoom) {
    throw new Error(
      "World spatial-mode exit threshold must be lower than the local-entry threshold.",
    );
  }
  return policy;
}

export function selectWorldSpatialMode(
  camera: Pick<WorldCameraState, "zoom">,
  currentMode: WorldSpatialMode = "globe",
  policy: WorldSpatialModePolicy = DEFAULT_WORLD_SPATIAL_MODE_POLICY,
): WorldSpatialMode {
  const validated = validatePolicy(policy);
  if (!Number.isFinite(camera.zoom)) {
    throw new Error("World camera zoom must be finite.");
  }

  if (currentMode === "globe") {
    return camera.zoom >= validated.enterLocalAtZoom ? "local" : "globe";
  }

  return camera.zoom <= validated.exitLocalBelowZoom ? "globe" : "local";
}
