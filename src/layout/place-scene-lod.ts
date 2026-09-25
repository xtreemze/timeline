import type { PlaceSceneLodLevel } from "../domain/place-scene.ts";

export const PLACE_SCENE_LOD_THRESHOLDS_PX = Object.freeze({
  markerOnly: 8,
  lod3: 25,
  lod2: 80,
  lod1: 180,
});

const PLACE_SCENE_LOD_HYSTERESIS_PX = 4;

export function placeSceneLodForProjectedPixels(
  projectedPixels: number,
  previous: PlaceSceneLodLevel | null = null,
): PlaceSceneLodLevel | null {
  if (!Number.isFinite(projectedPixels) || projectedPixels <= 0) return null;

  if (previous === null) {
    if (projectedPixels < PLACE_SCENE_LOD_THRESHOLDS_PX.markerOnly) return null;
    if (projectedPixels < PLACE_SCENE_LOD_THRESHOLDS_PX.lod3) return 3;
    if (projectedPixels < PLACE_SCENE_LOD_THRESHOLDS_PX.lod2) return 2;
    if (projectedPixels < PLACE_SCENE_LOD_THRESHOLDS_PX.lod1) return 1;
    return 0;
  }

  const raw = placeSceneLodForProjectedPixels(projectedPixels, null);
  if (raw === previous) return previous;

  if (raw === null) {
    return projectedPixels < PLACE_SCENE_LOD_THRESHOLDS_PX.markerOnly - PLACE_SCENE_LOD_HYSTERESIS_PX
      ? null
      : previous;
  }

  if (raw > previous) {
    const boundary =
      raw === 3
        ? PLACE_SCENE_LOD_THRESHOLDS_PX.lod3
        : raw === 2
          ? PLACE_SCENE_LOD_THRESHOLDS_PX.lod2
          : PLACE_SCENE_LOD_THRESHOLDS_PX.lod1;
    return projectedPixels < boundary - PLACE_SCENE_LOD_HYSTERESIS_PX ? raw : previous;
  }

  const boundary =
    previous === 3
      ? PLACE_SCENE_LOD_THRESHOLDS_PX.lod3
      : previous === 2
        ? PLACE_SCENE_LOD_THRESHOLDS_PX.lod2
        : previous === 1
          ? PLACE_SCENE_LOD_THRESHOLDS_PX.lod1
          : Number.POSITIVE_INFINITY;
  return projectedPixels > boundary + PLACE_SCENE_LOD_HYSTERESIS_PX ? raw : previous;
}
