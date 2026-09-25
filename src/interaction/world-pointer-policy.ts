import { surfacePointerMayStartDirectManipulation } from "./surface-input-policy.ts";

/**
 * Backwards-compatible world-specific alias.
 *
 * World node dragging now shares the same acquisition policy as timeline and
 * map direct manipulation. Keep this export while callers/tests migrate so
 * renderer-specific code does not define a competing notion of "primary".
 */
export function worldPointerDragMayStart(event: unknown): boolean {
  return surfacePointerMayStartDirectManipulation(event);
}
