/**
 * Touch long-press gate for WorldSurface node dragging.
 *
 * On touch, a one-finger drag belongs to the camera (globe pan) unless the
 * finger first rests on a node for `WORLD_TOUCH_HOLD_MS` without moving past
 * `WORLD_TOUCH_HOLD_TOLERANCE_PX`. A second finger cancels every pending hold so
 * pinch and rotate keep camera ownership. Mouse and pen are not gated.
 *
 * Pure and renderer-neutral: callers pass explicit timestamps and points.
 */

/** Matches the legacy Orb surface's touch node hold threshold. */
export const WORLD_TOUCH_HOLD_MS = 420;
export const WORLD_TOUCH_HOLD_TOLERANCE_PX = 10;

export interface WorldTouchPoint {
  readonly x: number;
  readonly y: number;
}

interface WorldTouchPress {
  readonly origin: WorldTouchPoint;
  readonly startedAt: number;
  cancelled: boolean;
  armed: boolean;
}

export function createWorldTouchHoldGate() {
  const presses = new Map<number, WorldTouchPress>();

  function heldLongEnough(press: WorldTouchPress, now: number): boolean {
    return now - press.startedAt >= WORLD_TOUCH_HOLD_MS;
  }

  function press(pointerId: number, point: WorldTouchPoint, now: number): void {
    const next: WorldTouchPress = {
      origin: Object.freeze({ x: point.x, y: point.y }),
      startedAt: now,
      cancelled: false,
      armed: false,
    };
    if (presses.size > 0) {
      // Multi-touch: every pending hold yields to the camera gesture.
      for (const existing of presses.values()) {
        if (!existing.armed) existing.cancelled = true;
      }
      next.cancelled = true;
    }
    presses.set(pointerId, next);
  }

  function move(pointerId: number, point: WorldTouchPoint, now: number): void {
    const current = presses.get(pointerId);
    if (!current || current.cancelled || current.armed) return;
    if (heldLongEnough(current, now)) {
      current.armed = true;
      return;
    }
    const distance = Math.hypot(point.x - current.origin.x, point.y - current.origin.y);
    if (distance > WORLD_TOUCH_HOLD_TOLERANCE_PX) current.cancelled = true;
  }

  function isArmed(pointerId: number, now: number): boolean {
    const current = presses.get(pointerId);
    if (!current || current.cancelled) return false;
    if (!current.armed && heldLongEnough(current, now)) current.armed = true;
    return current.armed;
  }

  function isPending(pointerId: number): boolean {
    const current = presses.get(pointerId);
    return Boolean(current && !current.cancelled);
  }

  function release(pointerId: number): void {
    presses.delete(pointerId);
  }

  function clear(): void {
    presses.clear();
  }

  return Object.freeze({ press, move, isArmed, isPending, release, clear });
}

export type WorldTouchHoldGate = ReturnType<typeof createWorldTouchHoldGate>;
