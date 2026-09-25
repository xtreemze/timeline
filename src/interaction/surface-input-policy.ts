/**
 * Canonical input policy shared by Lūm's interactive surfaces.
 *
 * Renderers remain responsible for gesture recognition/camera mechanics:
 * deck.gl/mjolnir for the world, Leaflet for map zoom/keyboard behavior, and
 * the retained timeline controller for chronology motion. This module owns
 * only application-level acquisition and affordance semantics so every
 * surface agrees on primary pointers, activation keys, and cursor intent.
 */

export type SurfacePointerType = "mouse" | "touch" | "pen" | "unknown";
export type SurfaceActivation = "activate" | "cancel" | null;
export type SurfaceCursorIntent = "background" | "action" | "draggable" | "cluster";

interface SurfaceKeyboardEventLike {
  readonly key?: unknown;
  readonly repeat?: unknown;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function sourceEvent(event: unknown): Readonly<Record<string, unknown>> | null {
  const outer = record(event);
  return record(outer?.["srcEvent"]) ?? outer;
}

export function surfacePointerType(event: unknown): SurfacePointerType {
  const source = sourceEvent(event);
  const pointerType = source?.["pointerType"];
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }
  return "unknown";
}

/**
 * Equivalent to the useful acquisition part of d3-drag's default filter and
 * compatible with deck.gl/mjolnir drag-start events.
 *
 * Primary mouse/pen/touch input may manipulate a surface. Ctrl-modified and
 * secondary-button gestures stay available to browser/platform conventions.
 * mjolnir can emit a drag start from pointermove, where PointerEvent.button is
 * -1, so the primary-buttons bit is accepted in that case.
 */
export function surfacePointerMayStartDirectManipulation(event: unknown): boolean {
  const source = sourceEvent(event);
  if (!source) return true;
  if (source["ctrlKey"] === true) return false;

  const button = source["button"];
  if (button === undefined || button === null) return true;
  const numericButton = Number(button);
  if (!Number.isFinite(numericButton)) return false;
  if (numericButton === 0) return true;
  if (numericButton !== -1) return false;

  const buttons = source["buttons"];
  if (buttons === undefined || buttons === null) return true;
  const numericButtons = Number(buttons);
  return Number.isFinite(numericButtons) && (numericButtons & 1) === 1;
}

/**
 * Surface-level activation vocabulary. Camera/navigation keys stay owned by
 * each renderer/controller; Enter and Space are equivalent activation keys.
 */
export function surfaceActivationFromKeyboard(event: SurfaceKeyboardEventLike): SurfaceActivation {
  if (event.repeat === true) return null;
  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") return "activate";
  if (event.key === "Escape") return "cancel";
  return null;
}

export function surfaceCursor(
  intent: SurfaceCursorIntent,
  options: Readonly<{ dragging?: boolean }> = {},
): "grab" | "grabbing" | "pointer" | "zoom-in" {
  if (options.dragging) return "grabbing";
  if (intent === "cluster") return "zoom-in";
  if (intent === "action") return "pointer";
  return "grab";
}
