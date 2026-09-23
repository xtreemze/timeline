import {
  resolveWorldLocalLayoutPosition,
  resolveWorldRenderPosition,
} from "../layout/world-geographic-position.ts";
import type { ScreenPoint, WorldSurface } from "../layout/world-surface.ts";
import type { ProjectedWorldInstance } from "../projection/world-projection.ts";
import type { WorldNodeDragPosition } from "./world-node-drag-controller.ts";

export function resolveWorldNodeDragPosition(
  surface: Pick<WorldSurface, "unproject">,
  instance: ProjectedWorldInstance,
  point: ScreenPoint,
): WorldNodeDragPosition | null {
  const currentPosition = resolveWorldRenderPosition(instance);
  if (!currentPosition) return null;

  const worldPosition = surface.unproject(point, currentPosition[2]);
  if (!worldPosition) return null;

  return resolveWorldLocalLayoutPosition(instance, [
    worldPosition.longitude,
    worldPosition.latitude,
    worldPosition.altitudeMeters,
  ]);
}
