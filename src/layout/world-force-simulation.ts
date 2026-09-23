import type { EntityId, PlaceId, RelationshipId } from "../domain/ids.ts";
import type { WorldInstanceId } from "../projection/world-projection.ts";

export type WorldSimulationReason =
  | "idle"
  | "projection-update"
  | "spatial-anchor-update"
  | "post-drop"
  | "topology"
  | "drag";

export interface WorldForceNode {
  readonly id: WorldInstanceId;
  readonly canonicalId: EntityId;
  readonly mass: number;
  readonly collisionRadiusMeters: number;
  readonly initialEastMeters: number;
  readonly initialNorthMeters: number;
  readonly targetVisualAltitudeMeters: number;
}

export interface WorldForceEdge {
  readonly id: RelationshipId;
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
  readonly strength: number;
  readonly restLengthMeters: number;
}

export interface WorldForceAnchor {
  readonly instanceId: WorldInstanceId;
  readonly placeId: PlaceId;
  readonly longitude: number;
  readonly latitude: number;
  readonly sourceAltitudeMeters: number;
  readonly influence: number;
  readonly precisionRadiusMeters: number;
}

export interface WorldForcePin {
  readonly instanceId: WorldInstanceId;
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

export interface WorldForceScene {
  readonly nodes: readonly WorldForceNode[];
  readonly edges: readonly WorldForceEdge[];
  readonly anchors: readonly WorldForceAnchor[];
}

export interface WorldSimulationRequest {
  readonly reason: WorldSimulationReason;
  readonly energyTarget: number;
  readonly reheat: boolean;
}

export interface WorldSimulationDiagnostics {
  readonly running: boolean;
  readonly settled: boolean;
  readonly energy: number | null;
  readonly iteration: number | null;
}

export interface WorldForceSimulationBackend {
  setScene(scene: WorldForceScene): void;
  setPin(pin: WorldForcePin | null): void;
  apply(request: WorldSimulationRequest): void;
  stop(): void;
  step?(deltaMs: number): void;
  getDiagnostics(): WorldSimulationDiagnostics;
  destroy(): void;
}

export interface WorldSimulationState {
  readonly running: boolean;
  readonly reason: WorldSimulationReason | null;
  readonly suspendedReasons: readonly string[];
  readonly pendingReasons: readonly WorldSimulationReason[];
}

export const WORLD_SIMULATION_PRIORITY: Readonly<Record<WorldSimulationReason, number>> =
  Object.freeze({
    idle: 0,
    "projection-update": 1,
    "spatial-anchor-update": 2,
    "post-drop": 3,
    topology: 4,
    drag: 5,
  });

function priority(reason: WorldSimulationReason): number {
  return WORLD_SIMULATION_PRIORITY[reason] ?? 0;
}

function requestChanged(
  left: WorldSimulationRequest | null,
  right: WorldSimulationRequest | null,
): boolean {
  if (left === right) return false;
  if (!left || !right) return true;
  return (
    left.reason !== right.reason ||
    left.energyTarget !== right.energyTarget ||
    left.reheat !== right.reheat
  );
}

export function createWorldSimulationCoordinator(backend: WorldForceSimulationBackend) {
  const requests = new Map<WorldSimulationReason, WorldSimulationRequest>();
  const suspended = new Set<string>();
  let applied: WorldSimulationRequest | null = null;
  let stoppedForSuspension = false;

  function highestRequest(): WorldSimulationRequest | null {
    let highest: WorldSimulationRequest | null = null;
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
        backend.stop();
        stoppedForSuspension = true;
      }
      applied = highest;
      return;
    }

    const resumingFromSuspension = stoppedForSuspension;
    stoppedForSuspension = false;

    if (!highest) {
      if (applied && applied.reason !== "idle") {
        const idleRequest: WorldSimulationRequest = {
          reason: "idle",
          energyTarget: 0,
          reheat: false,
        };
        applied = idleRequest;
        backend.apply(idleRequest);
      } else {
        applied = null;
      }
      return;
    }

    if (!resumingFromSuspension && !requestChanged(applied, highest)) return;

    if (
      applied &&
      priority(highest.reason) < priority(applied.reason) &&
      requests.has(applied.reason)
    ) {
      return;
    }

    applied = highest;
    backend.apply(highest);
  }

  function request(next: WorldSimulationRequest): WorldSimulationState {
    requests.set(next.reason, Object.freeze({ ...next }));
    reconcile();
    return getState();
  }

  function release(reason: WorldSimulationReason): WorldSimulationState {
    const wasApplied = applied?.reason === reason;
    requests.delete(reason);
    if (wasApplied) applied = null;
    reconcile();
    return getState();
  }

  function suspend(reason: string): WorldSimulationState {
    const key = reason.trim();
    if (!key) throw new Error("World simulation suspension requires a reason.");
    suspended.add(key);
    reconcile();
    return getState();
  }

  function resume(reason: string): WorldSimulationState {
    suspended.delete(reason.trim());
    reconcile();
    return getState();
  }

  function clear(): WorldSimulationState {
    requests.clear();
    applied = null;
    suspended.clear();
    stoppedForSuspension = false;
    return getState();
  }

  function getState(): WorldSimulationState {
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

export type WorldSimulationCoordinator = ReturnType<
  typeof createWorldSimulationCoordinator
>;
