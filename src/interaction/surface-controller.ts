import type {
  GestureKind,
  InteractionCompletionReason,
  InteractionCoordinator,
  InteractionOwner,
  InteractionSnapshot,
} from "./interaction-coordinator.ts";

export interface SurfacePointerBeginOptions {
  /**
   * Claim the gesture immediately. Set false when a surface must preserve a
   * tap/drag ambiguity until movement or a long-press threshold resolves it.
   */
  readonly claim?: boolean;
}

export interface SurfaceFinishOptions {
  /** Commit the epoch immediately after it enters settling. */
  readonly commit?: boolean;
}

/**
 * Renderer-neutral interaction adapter for one application surface.
 *
 * This controller never recognizes gestures and never moves a camera. DOM,
 * deck.gl/mjolnir, Leaflet, and retained-timeline adapters recognize their
 * native inputs, then report the resulting application gesture here.
 */
export interface SurfaceInteractionController {
  readonly owner: InteractionOwner;
  snapshot(): InteractionSnapshot;
  beginPointer(
    pointerId: number,
    gesture: GestureKind,
    options?: SurfacePointerBeginOptions,
  ): boolean;
  claimGesture(gesture: GestureKind): boolean;
  releasePointer(pointerId: number, options?: SurfaceFinishOptions): boolean;
  beginDiscrete(gesture: GestureKind): boolean;
  finishDiscrete(options?: SurfaceFinishOptions): boolean;
  commit(): boolean;
  cancel(reason: Exclude<InteractionCompletionReason, "release">): InteractionSnapshot;
}

export function createSurfaceInteractionController(
  owner: InteractionOwner,
  coordinator: InteractionCoordinator,
): SurfaceInteractionController {
  const snapshot = (): InteractionSnapshot => coordinator.snapshot();

  const claimGesture = (gesture: GestureKind): boolean => {
    const current = snapshot();
    if (current.owner !== owner) return false;

    if (current.phase === "owned") {
      return coordinator.reclassify(owner, gesture);
    }

    if (current.phase !== "acquisition" && current.phase !== "classification") {
      return false;
    }

    if (!coordinator.classify(owner, gesture)) return false;
    return coordinator.claim(owner);
  };

  return Object.freeze({
    owner,
    snapshot,

    beginPointer(pointerId, gesture, options = {}) {
      const before = snapshot();
      if (!coordinator.begin(owner, pointerId)) return false;

      const claim = options.claim !== false;
      const accepted = !claim
        ? // Classification records the unresolved intent without claiming it.
          // This is used by touch taps that may later promote to pan.
          before.phase === "owned"
          ? coordinator.reclassify(owner, gesture)
          : coordinator.classify(owner, gesture)
        : claimGesture(gesture);

      if (accepted) return true;

      // Failed promotion/acquisition is transactional. In particular, a
      // second pointer cannot remain registered after an exclusive node drag
      // rejects pinch takeover.
      const current = snapshot();
      if (!before.pointerIds.includes(pointerId) && current.pointerIds.includes(pointerId)) {
        coordinator.release(owner, pointerId);
        if (snapshot().phase === "settling") coordinator.cancel(owner, "aborted");
      }
      return false;
    },

    claimGesture,

    releasePointer(pointerId, options = {}) {
      if (!coordinator.release(owner, pointerId)) return false;
      if (options.commit === true && snapshot().phase === "settling") {
        return coordinator.commit(owner);
      }
      return true;
    },

    beginDiscrete(gesture) {
      return coordinator.beginDiscrete(owner, gesture);
    },

    finishDiscrete(options = {}) {
      if (!coordinator.finishDiscrete(owner)) return false;
      if (options.commit !== false) return coordinator.commit(owner);
      return true;
    },

    commit() {
      return coordinator.commit(owner);
    },

    cancel(reason) {
      return coordinator.cancel(owner, reason);
    },
  });
}
