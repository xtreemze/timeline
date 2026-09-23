import type { WorldInstanceId } from "../projection/world-projection.ts";
import type {
  WorldForcePin,
  WorldForceSimulationBackend,
  WorldSimulationCoordinator,
} from "../layout/world-force-simulation.ts";
import type {
  InteractionCompletionReason,
  InteractionCoordinator,
} from "./interaction-coordinator.ts";

export interface WorldNodeDragPosition {
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

export interface WorldNodeDragTarget {
  readonly instanceId: WorldInstanceId;
  readonly position: WorldNodeDragPosition;
}

export interface WorldNodeDragState {
  readonly active: boolean;
  readonly instanceId: WorldInstanceId | null;
  readonly pointerId: number | null;
  readonly settling: boolean;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function nonNegative(value: number, label: string): number {
  const normalized = finite(value, label);
  if (normalized < 0) throw new Error(`${label} must be non-negative.`);
  return normalized;
}

function forcePin(
  instanceId: WorldInstanceId,
  position: WorldNodeDragPosition,
): WorldForcePin {
  return Object.freeze({
    instanceId,
    eastMeters: finite(position.eastMeters, "World drag east offset"),
    northMeters: finite(position.northMeters, "World drag north offset"),
    visualAltitudeMeters: nonNegative(
      position.visualAltitudeMeters,
      "World drag visual altitude",
    ),
  });
}

export function createWorldNodeDragController(
  interaction: InteractionCoordinator,
  simulation: WorldSimulationCoordinator,
  backend: Pick<WorldForceSimulationBackend, "setPin">,
) {
  let activeInstanceId: WorldInstanceId | null = null;
  let activePointerId: number | null = null;
  let settling = false;

  function state(): WorldNodeDragState {
    return Object.freeze({
      active: activeInstanceId !== null,
      instanceId: activeInstanceId,
      pointerId: activePointerId,
      settling,
    });
  }

  function begin(pointerId: number, target: WorldNodeDragTarget): boolean {
    if (activeInstanceId || settling) return false;
    const pin = forcePin(target.instanceId, target.position);

    if (!interaction.begin("world", pointerId)) return false;
    if (!interaction.classify("world", "node-drag")) {
      interaction.cancel("world", "aborted");
      return false;
    }
    if (!interaction.claim("world")) {
      interaction.cancel("world", "aborted");
      return false;
    }

    activeInstanceId = target.instanceId;
    activePointerId = pointerId;
    backend.setPin(pin);
    simulation.request({ reason: "drag", energyTarget: 0.2, reheat: true });
    return true;
  }

  function update(pointerId: number, position: WorldNodeDragPosition): boolean {
    if (
      activeInstanceId === null ||
      activePointerId === null ||
      activePointerId !== pointerId ||
      interaction.snapshot().owner !== "world" ||
      interaction.snapshot().gesture !== "node-drag"
    ) {
      return false;
    }

    backend.setPin(forcePin(activeInstanceId, position));
    return true;
  }

  function release(pointerId: number): boolean {
    if (
      activeInstanceId === null ||
      activePointerId === null ||
      activePointerId !== pointerId
    ) {
      return false;
    }

    backend.setPin(null);
    simulation.request({ reason: "post-drop", energyTarget: 0.035, reheat: true });
    simulation.release("drag");

    const released = interaction.release("world", pointerId);
    activeInstanceId = null;
    activePointerId = null;
    settling = released;
    return released;
  }

  function cancel(
    reason: Exclude<InteractionCompletionReason, "release">,
  ): WorldNodeDragState {
    if (activeInstanceId !== null) {
      backend.setPin(null);
      simulation.release("drag");
    }

    interaction.cancel("world", reason);
    activeInstanceId = null;
    activePointerId = null;
    settling = false;
    return state();
  }

  function commit(): boolean {
    if (!settling) return false;
    simulation.release("post-drop");
    const committed = interaction.commit("world");
    if (committed) settling = false;
    return committed;
  }

  return Object.freeze({
    begin,
    update,
    release,
    cancel,
    commit,
    state,
  });
}

export type WorldNodeDragController = ReturnType<
  typeof createWorldNodeDragController
>;
