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
  offsetScale = 1,
  floatMeters = 0,
): WorldNodeDragPosition | null {
  const currentPosition = resolveWorldRenderPosition(instance, offsetScale, floatMeters);
  if (!currentPosition) return null;

  const worldPosition = surface.unproject(point, currentPosition[2]);
  if (!worldPosition) return null;

  // Pointer interaction owns tangent-space X/Y only. Preserve the node's
  // pre-gesture rendered altitude exactly: viewport unprojection may return a
  // depth-derived Z that varies with camera/globe projection and would otherwise
  // make a stationary long-press appear to lift or drop the node.
  return resolveWorldLocalLayoutPosition(
    instance,
    [worldPosition.longitude, worldPosition.latitude, currentPosition[2]],
    offsetScale,
    floatMeters,
  );
}
