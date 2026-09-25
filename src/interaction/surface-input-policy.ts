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
export type SurfaceNavigationAxis = "horizontal" | "vertical";
export type SurfaceNavigationCommand =
  | "fit-visible"
  | "fit-all"
  | "zoom-in"
  | "zoom-out"
  | "pan-negative"
  | "pan-positive";

interface SurfaceKeyboardTargetLike {
  readonly tagName?: unknown;
  readonly isContentEditable?: unknown;
  readonly closest?: unknown;
}

interface SurfaceKeyboardEventLike {
  readonly key?: unknown;
  readonly repeat?: unknown;
  readonly shiftKey?: unknown;
  readonly altKey?: unknown;
  readonly ctrlKey?: unknown;
  readonly metaKey?: unknown;
  readonly defaultPrevented?: unknown;
  readonly target?: unknown;
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

const NATIVE_KEYBOARD_TARGET_TAGS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "SUMMARY",
  "TEXTAREA",
]);

/**
 * Camera navigation must never steal keys from focused controls or browser /
 * platform shortcuts. The check is structural so the pure interaction core
 * stays independent of DOM constructors.
 */
export function surfaceKeyboardMayNavigate(event: SurfaceKeyboardEventLike): boolean {
  if (event.defaultPrevented === true) return false;
  if (event.altKey === true || event.ctrlKey === true || event.metaKey === true) return false;

  const target = record(event.target) as SurfaceKeyboardTargetLike | null;
  if (!target) return true;
  if (target.isContentEditable === true) return false;
  const tagName = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  return !NATIVE_KEYBOARD_TARGET_TAGS.has(tagName);
}

/**
 * True when the keyboard event originated inside a renderer/custom surface
 * that owns local navigation. Application-level presentation shortcuts use
 * this to avoid competing with deck.gl/mjolnir, Leaflet, or the retained
 * timeline while focus is inside one of those surfaces.
 */
export function surfaceKeyboardTargetOwnsNavigation(event: unknown): boolean {
  const keyboardEvent = record(event);
  const target = record(keyboardEvent?.["target"]) as SurfaceKeyboardTargetLike | null;
  const closest = target?.closest;
  if (typeof closest !== "function") return false;
  try {
    return Boolean(closest.call(target, '[data-surface-keyboard-navigation="camera"]'));
  } catch {
    return false;
  }
}

/**
 * Shared camera/navigation vocabulary for surfaces whose camera is implemented
 * by Lūm rather than a renderer-native controller. deck.gl and Leaflet keep
 * their native keyboard controller; this helper defines equivalent semantics
 * for the retained timeline and other custom surfaces.
 */
export function surfaceNavigationFromKeyboard(
  event: SurfaceKeyboardEventLike,
  axis: SurfaceNavigationAxis,
): SurfaceNavigationCommand | null {
  if (!surfaceKeyboardMayNavigate(event)) return null;

  if (event.key === "Home") return event.shiftKey === true ? "fit-all" : "fit-visible";
  if (event.key === "+" || event.key === "=") return "zoom-in";
  if (event.key === "-") return "zoom-out";

  if (axis === "horizontal") {
    if (event.key === "ArrowLeft") return "pan-negative";
    if (event.key === "ArrowRight") return "pan-positive";
    return null;
  }

  if (event.key === "ArrowUp") return "pan-negative";
  if (event.key === "ArrowDown") return "pan-positive";
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
