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
  const source = record(outer?.["srcEvent"]) ?? outer;
  if (!source) return true;

  if (source["ctrlKey"] === true) return false;

  const button = source["button"];
  if (button === undefined || button === null) return true;
  const numericButton = Number(button);
  if (!Number.isFinite(numericButton)) return false;
  if (numericButton === 0) return true;
  if (numericButton !== -1) return false;

  // deck.gl/mjolnir may deliver onDragStart from the pointermove/panstart
  // that crosses the drag threshold. PointerEvent.button is -1 for such
  // movement events even while the primary button remains depressed, so
  // consult the buttons bitmask before rejecting an otherwise valid drag.
  const buttons = source["buttons"];
  if (buttons === undefined || buttons === null) return true;
  const numericButtons = Number(buttons);
  return Number.isFinite(numericButtons) && (numericButtons & 1) === 1;
}
