/**
 * Renderer-neutral pointer initiation policy for direct world-node manipulation.
 *
 * This intentionally mirrors the useful part of d3-drag's default filter:
 * modified Ctrl gestures and non-primary buttons stay available to browser /
 * platform conventions instead of being claimed as a node drag. The world
 * surface still owns its long-press arbitration for touch.
 */

export interface WorldPointerInitiationEvent {
  readonly ctrlKey?: unknown;
  readonly button?: unknown;
  readonly srcEvent?: unknown;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

export function worldPointerDragMayStart(event: unknown): boolean {
  const outer = record(event);
  const source = record(outer?.srcEvent) ?? outer;
  if (!source) return true;

  if (source.ctrlKey === true) return false;

  const button = source.button;
  if (button === undefined || button === null) return true;
  const numericButton = Number(button);
  return Number.isFinite(numericButton) && numericButton === 0;
}
