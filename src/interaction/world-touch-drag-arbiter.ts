import {
  createWorldTouchHoldGate,
  WORLD_TOUCH_HOLD_MS,
  type WorldTouchPoint,
} from "./world-touch-hold.ts";

export type WorldTouchDragDisposition = "camera" | "holding" | "ready" | "owned" | "blocked";

export interface WorldTouchDragInput {
  readonly pointerId: number;
  readonly point: WorldTouchPoint;
  readonly wallTime: number;
  readonly eventTimeStamp?: number | null;
}

export interface WorldTouchDragSnapshot {
  readonly candidatePointerId: number | null;
  readonly ownerPointerId: number | null;
  readonly disposition: WorldTouchDragDisposition;
}

interface TouchTiming {
  readonly eventTimeStamp: number | null;
  readonly wallTime: number;
}

function finiteTime(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Renderer-neutral arbitration for touch node dragging in the world surface.
 *
 * A stationary single-finger hold may become a node drag after
 * WORLD_TOUCH_HOLD_MS. Movement that physically happened before the threshold
 * remains camera-owned even if main-thread congestion delivers it later.
 * A second finger before ownership yields to the renderer's multi-touch camera;
 * once a node drag is owned, later contacts cannot steal or clear that owner.
 *
 * Scheduling the threshold itself stays with the renderer adapter because the
 * adapter owns the browser event loop. All classification/ownership semantics
 * live here so deck.gl and future world renderers share one contract.
 */
export function createWorldTouchDragArbiter() {
  const hold = createWorldTouchHoldGate();
  const timing = new Map<number, TouchTiming>();
  let candidatePointerId: number | null = null;
  let ownerPointerId: number | null = null;
  let disposition: WorldTouchDragDisposition = "camera";

  const snapshot = (): WorldTouchDragSnapshot =>
    Object.freeze({
      candidatePointerId,
      ownerPointerId,
      disposition,
    });

  const occurredAt = (
    pointerId: number,
    wallTime: number,
    eventTimeStamp?: number | null,
  ): number => {
    const started = timing.get(pointerId);
    const eventTime = finiteTime(eventTimeStamp);
    if (!started || started.eventTimeStamp === null || eventTime === null) return wallTime;

    const elapsed = eventTime - started.eventTimeStamp;
    return Number.isFinite(elapsed) && elapsed >= 0 ? started.wallTime + elapsed : wallTime;
  };

  const releaseTracking = (pointerId: number): void => {
    hold.release(pointerId);
    timing.delete(pointerId);
    if (candidatePointerId === pointerId) candidatePointerId = null;
  };

  const refreshDisposition = (): void => {
    if (ownerPointerId !== null) disposition = "owned";
    else if (candidatePointerId !== null) disposition = "holding";
    else disposition = "camera";
  };

  return Object.freeze({
    snapshot,

    press(input: WorldTouchDragInput): WorldTouchDragDisposition {
      if (ownerPointerId !== null && ownerPointerId !== input.pointerId) {
        disposition = "blocked";
        return disposition;
      }

      timing.set(input.pointerId, {
        eventTimeStamp: finiteTime(input.eventTimeStamp),
        wallTime: input.wallTime,
      });
      hold.press(input.pointerId, input.point, input.wallTime);

      if (!hold.isPending(input.pointerId)) {
        candidatePointerId = null;
        disposition = "camera";
        return disposition;
      }

      candidatePointerId = input.pointerId;
      disposition = "holding";
      return disposition;
    },

    move(input: WorldTouchDragInput): WorldTouchDragDisposition {
      if (ownerPointerId === input.pointerId) {
        disposition = "owned";
        return disposition;
      }
      if (ownerPointerId !== null) {
        disposition = "blocked";
        return disposition;
      }

      hold.move(
        input.pointerId,
        input.point,
        occurredAt(input.pointerId, input.wallTime, input.eventTimeStamp),
      );

      if (!hold.isPending(input.pointerId)) {
        if (candidatePointerId === input.pointerId) candidatePointerId = null;
        disposition = "camera";
        return disposition;
      }

      candidatePointerId = input.pointerId;
      disposition = hold.isArmed(input.pointerId, input.wallTime) ? "ready" : "holding";
      return disposition;
    },

    threshold(pointerId: number, now: number): boolean {
      if (ownerPointerId !== null) return ownerPointerId === pointerId;
      if (candidatePointerId !== pointerId || !hold.isArmed(pointerId, now)) return false;
      disposition = "ready";
      return true;
    },

    claim(pointerId: number, now: number): boolean {
      if (ownerPointerId !== null) return ownerPointerId === pointerId;
      if (
        disposition !== "ready" ||
        candidatePointerId !== pointerId ||
        !hold.isArmed(pointerId, now)
      ) {
        return false;
      }

      hold.commit(pointerId);
      ownerPointerId = pointerId;
      candidatePointerId = null;
      disposition = "owned";
      return true;
    },

    isOwnedBy(pointerId: number): boolean {
      return ownerPointerId === pointerId;
    },

    hasOwner(): boolean {
      return ownerPointerId !== null;
    },

    isPending(pointerId: number): boolean {
      return candidatePointerId === pointerId && hold.isPending(pointerId);
    },

    release(pointerId: number): boolean {
      const owned = ownerPointerId === pointerId;
      releaseTracking(pointerId);
      if (owned) ownerPointerId = null;
      refreshDisposition();
      return owned;
    },

    cancel(pointerId: number): boolean {
      const owned = ownerPointerId === pointerId;
      releaseTracking(pointerId);
      if (owned) ownerPointerId = null;
      refreshDisposition();
      return owned;
    },

    clear(): void {
      hold.clear();
      timing.clear();
      candidatePointerId = null;
      ownerPointerId = null;
      disposition = "camera";
    },
  });
}

export type WorldTouchDragArbiter = ReturnType<typeof createWorldTouchDragArbiter>;
export { WORLD_TOUCH_HOLD_MS };
