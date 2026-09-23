export type InteractionOwner = "timeline" | "world" | "graph" | "map";

export type GestureKind = "tap" | "pan" | "pinch" | "node-drag" | "wheel" | "keyboard";

export type InteractionPhase =
  | "idle"
  | "acquisition"
  | "classification"
  | "owned"
  | "settling"
  | "committed";

export type InteractionCompletionReason =
  | "release"
  | "pointercancel"
  | "lostpointercapture"
  | "blur"
  | "orientationchange"
  | "visibilitychange"
  | "aborted";

export interface InteractionSnapshot {
  readonly phase: InteractionPhase;
  readonly owner: InteractionOwner | null;
  readonly gesture: GestureKind | null;
  readonly pointerIds: readonly number[];
  readonly reason: InteractionCompletionReason | null;
  readonly revision: number;
}

export interface InteractionCoordinator {
  snapshot(): InteractionSnapshot;
  begin(owner: InteractionOwner, pointerId: number): boolean;
  classify(owner: InteractionOwner, gesture: GestureKind): boolean;
  claim(owner: InteractionOwner): boolean;
  release(owner: InteractionOwner, pointerId: number): boolean;
  commit(owner: InteractionOwner): boolean;
  cancel(
    owner: InteractionOwner,
    reason: Exclude<InteractionCompletionReason, "release">,
  ): InteractionSnapshot;
  reset(): InteractionSnapshot;
}

function pointerId(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function createInteractionCoordinator(): InteractionCoordinator {
  let phase: InteractionPhase = "idle";
  let owner: InteractionOwner | null = null;
  let gesture: GestureKind | null = null;
  let reason: InteractionCompletionReason | null = null;
  let revision = 0;
  const pointers = new Set<number>();

  const snapshot = (): InteractionSnapshot =>
    Object.freeze({
      phase,
      owner,
      gesture,
      pointerIds: Object.freeze([...pointers].sort((left, right) => left - right)),
      reason,
      revision,
    });

  const mutate = (): void => {
    revision += 1;
  };

  const clearCommittedOwnership = (
    completionReason: InteractionCompletionReason,
  ): InteractionSnapshot => {
    phase = "committed";
    owner = null;
    gesture = null;
    reason = completionReason;
    pointers.clear();
    mutate();
    return snapshot();
  };

  return Object.freeze({
    snapshot,

    begin(nextOwner: InteractionOwner, rawPointerId: number) {
      const id = pointerId(rawPointerId);
      if (id === null) return false;

      if (phase === "committed") {
        phase = "idle";
        reason = null;
      }

      if (owner && owner !== nextOwner) return false;
      if (phase === "owned" || phase === "settling") return false;

      owner = nextOwner;
      pointers.add(id);
      if (phase === "idle") phase = "acquisition";
      reason = null;
      mutate();
      return true;
    },

    classify(nextOwner: InteractionOwner, nextGesture: GestureKind) {
      if (!owner || owner !== nextOwner) return false;
      if (phase !== "acquisition" && phase !== "classification") return false;
      if (nextGesture === "pinch" && pointers.size < 2) return false;

      gesture = nextGesture;
      phase = "classification";
      mutate();
      return true;
    },

    claim(nextOwner: InteractionOwner) {
      if (!owner || owner !== nextOwner) return false;
      if (phase !== "classification" || !gesture) return false;
      phase = "owned";
      mutate();
      return true;
    },

    release(nextOwner: InteractionOwner, rawPointerId: number) {
      const id = pointerId(rawPointerId);
      if (id === null || !owner || owner !== nextOwner || !pointers.has(id)) {
        return false;
      }

      pointers.delete(id);
      if (pointers.size > 0) {
        mutate();
        return true;
      }

      if (phase === "owned" || phase === "classification" || phase === "acquisition") {
        phase = "settling";
        reason = "release";
        mutate();
        return true;
      }

      return false;
    },

    commit(nextOwner: InteractionOwner) {
      if (!owner || owner !== nextOwner || phase !== "settling") return false;
      clearCommittedOwnership(reason ?? "release");
      return true;
    },

    cancel(
      nextOwner: InteractionOwner,
      completionReason: Exclude<InteractionCompletionReason, "release">,
    ) {
      if (!owner || owner !== nextOwner) return snapshot();
      return clearCommittedOwnership(completionReason);
    },

    reset() {
      phase = "idle";
      owner = null;
      gesture = null;
      reason = null;
      pointers.clear();
      mutate();
      return snapshot();
    },
  });
}
