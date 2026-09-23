import type { WorldInstanceId, WorldProjection } from "./world-projection.ts";

export interface WorldLayoutPoint {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export interface WorldLayoutState {
  readonly positions: ReadonlyMap<WorldInstanceId, WorldLayoutPoint>;
  readonly pinned: ReadonlySet<WorldInstanceId>;
}

export interface ReconciledWorldLayout {
  readonly positions: ReadonlyMap<WorldInstanceId, WorldLayoutPoint>;
  readonly pinned: ReadonlySet<WorldInstanceId>;
  readonly entering: readonly WorldInstanceId[];
  readonly exiting: readonly WorldInstanceId[];
}

function finitePoint(point: WorldLayoutPoint): WorldLayoutPoint {
  if (!(Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new Error("World layout coordinates must be finite.");
  }
  if (point.z !== undefined && !Number.isFinite(point.z)) {
    throw new Error("World layout altitude must be finite.");
  }
  return Object.freeze({
    x: point.x,
    y: point.y,
    ...(point.z === undefined ? {} : { z: point.z }),
  });
}

export function reconcileWorldLayout(
  previous: WorldLayoutState,
  next: WorldProjection,
): ReconciledWorldLayout {
  const nextIds = new Set(next.instances.map((instance) => instance.id));
  const positions = new Map<WorldInstanceId, WorldLayoutPoint>();
  const entering: WorldInstanceId[] = [];

  for (const instance of next.instances) {
    const prior = previous.positions.get(instance.id);
    if (prior) positions.set(instance.id, finitePoint(prior));
    else entering.push(instance.id);
  }

  const exiting = [...previous.positions.keys()]
    .filter((id) => !nextIds.has(id))
    .sort((left, right) => String(left).localeCompare(String(right)));

  const pinned = new Set([...previous.pinned].filter((id) => nextIds.has(id)));

  return Object.freeze({
    positions,
    pinned,
    entering: Object.freeze(
      entering.sort((left, right) => String(left).localeCompare(String(right))),
    ),
    exiting: Object.freeze(exiting),
  });
}
