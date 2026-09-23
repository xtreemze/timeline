export type GraphSimulationReason =
  | "idle"
  | "geometry-refresh"
  | "popover-exclusion"
  | "post-drop"
  | "topology"
  | "drag";

export interface GraphSimulationRequest {
  readonly reason: GraphSimulationReason;
  readonly alphaTarget: number;
  readonly reheat: boolean;
}

export interface GraphSimulationAdapter {
  apply(request: GraphSimulationRequest): void;
  stop(): void;
}

export interface GraphSimulationState {
  readonly running: boolean;
  readonly reason: GraphSimulationReason | null;
  readonly suspendedReasons: readonly string[];
  readonly pendingReasons: readonly GraphSimulationReason[];
}

export const GRAPH_SIMULATION_PRIORITY: Readonly<Record<GraphSimulationReason, number>> =
  Object.freeze({
    idle: 0,
    "geometry-refresh": 1,
    "popover-exclusion": 2,
    "post-drop": 3,
    topology: 4,
    drag: 5,
  });

function priority(reason: GraphSimulationReason): number {
  return GRAPH_SIMULATION_PRIORITY[reason] ?? 0;
}

function requestChanged(
  left: GraphSimulationRequest | null,
  right: GraphSimulationRequest | null,
): boolean {
  if (left === right) return false;
  if (!(left && right)) return true;
  return (
    left.reason !== right.reason ||
    left.alphaTarget !== right.alphaTarget ||
    left.reheat !== right.reheat
  );
}

export function createGraphSimulationCoordinator(adapter: GraphSimulationAdapter) {
  const requests = new Map<GraphSimulationReason, GraphSimulationRequest>();
  const suspended = new Set<string>();
  let applied: GraphSimulationRequest | null = null;
  let stoppedForSuspension = false;

  function highestRequest(): GraphSimulationRequest | null {
    let highest: GraphSimulationRequest | null = null;
    for (const request of requests.values()) {
      if (!highest || priority(request.reason) > priority(highest.reason)) {
        highest = request;
      }
    }
    return highest;
  }

  function reconcile(): void {
    const highest = highestRequest();
    if (suspended.size) {
      if (!stoppedForSuspension) {
        adapter.stop();
        stoppedForSuspension = true;
      }
      applied = highest;
      return;
    }

    const resumingFromSuspension = stoppedForSuspension;
    stoppedForSuspension = false;
    if (!highest) {
      if (applied && applied.reason !== "idle") {
        const idleRequest: GraphSimulationRequest = {
          reason: "idle",
          alphaTarget: 0,
          reheat: false,
        };
        applied = idleRequest;
        adapter.apply(idleRequest);
      } else {
        applied = null;
      }
      return;
    }

    if (!(resumingFromSuspension || requestChanged(applied, highest))) return;
    if (
      applied &&
      priority(highest.reason) < priority(applied.reason) &&
      requests.has(applied.reason)
    ) {
      return;
    }

    applied = highest;
    adapter.apply(highest);
  }

  function request(next: GraphSimulationRequest): GraphSimulationState {
    requests.set(next.reason, Object.freeze({ ...next }));
    reconcile();
    return getState();
  }

  function release(reason: GraphSimulationReason): GraphSimulationState {
    const wasApplied = applied?.reason === reason;
    requests.delete(reason);
    if (wasApplied) applied = null;
    reconcile();
    return getState();
  }

  function suspend(reason: string): GraphSimulationState {
    const key = String(reason || "").trim();
    if (!key) throw new Error("Graph simulation suspension requires a reason.");
    suspended.add(key);
    reconcile();
    return getState();
  }

  function resume(reason: string): GraphSimulationState {
    suspended.delete(String(reason || "").trim());
    reconcile();
    return getState();
  }

  function clear(): GraphSimulationState {
    requests.clear();
    applied = null;
    suspended.clear();
    stoppedForSuspension = false;
    return getState();
  }

  function getState(): GraphSimulationState {
    const highest = highestRequest();
    return Object.freeze({
      running: Boolean(highest) && suspended.size === 0,
      reason: highest?.reason ?? null,
      suspendedReasons: Object.freeze([...suspended].sort()),
      pendingReasons: Object.freeze(
        [...requests.keys()].sort((left, right) => priority(right) - priority(left)),
      ),
    });
  }

  return Object.freeze({
    request,
    release,
    suspend,
    resume,
    clear,
    getState,
  });
}

export type GraphSimulationCoordinator = ReturnType<typeof createGraphSimulationCoordinator>;
