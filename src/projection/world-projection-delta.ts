import {
  createWorldProjection,
  type ProjectedWorldEdge,
  type ProjectedWorldInstance,
  type WorldInstanceId,
  type WorldProjection,
} from "./world-projection.ts";

export interface WorldProjectionDelta {
  readonly addedInstances: readonly ProjectedWorldInstance[];
  readonly updatedInstances: readonly ProjectedWorldInstance[];
  readonly removedInstanceIds: readonly WorldInstanceId[];
  readonly addedEdges: readonly ProjectedWorldEdge[];
  readonly updatedEdges: readonly ProjectedWorldEdge[];
  readonly removedEdgeIds: readonly ProjectedWorldEdge["id"][];
}

function sameValue(left: unknown, right: unknown): boolean {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

export function diffWorldProjection(
  previous: WorldProjection,
  next: WorldProjection,
): WorldProjectionDelta {
  const previousInstances = new Map(previous.instances.map((value) => [value.id, value]));
  const nextInstances = new Map(next.instances.map((value) => [value.id, value]));
  const previousEdges = new Map(previous.edges.map((value) => [value.id, value]));
  const nextEdges = new Map(next.edges.map((value) => [value.id, value]));

  const addedInstances = next.instances.filter((value) => !previousInstances.has(value.id));
  const updatedInstances = next.instances.filter((value) => {
    const previousValue = previousInstances.get(value.id);
    return previousValue !== undefined && !sameValue(previousValue, value);
  });
  const removedInstanceIds = previous.instances
    .filter((value) => !nextInstances.has(value.id))
    .map((value) => value.id);

  const addedEdges = next.edges.filter((value) => !previousEdges.has(value.id));
  const updatedEdges = next.edges.filter((value) => {
    const previousValue = previousEdges.get(value.id);
    return previousValue !== undefined && !sameValue(previousValue, value);
  });
  const removedEdgeIds = previous.edges
    .filter((value) => !nextEdges.has(value.id))
    .map((value) => value.id);

  return Object.freeze({
    addedInstances: Object.freeze(addedInstances),
    updatedInstances: Object.freeze(updatedInstances),
    removedInstanceIds: Object.freeze(removedInstanceIds),
    addedEdges: Object.freeze(addedEdges),
    updatedEdges: Object.freeze(updatedEdges),
    removedEdgeIds: Object.freeze(removedEdgeIds),
  });
}

export function isEmptyWorldProjectionDelta(delta: WorldProjectionDelta): boolean {
  return (
    delta.addedInstances.length === 0 &&
    delta.updatedInstances.length === 0 &&
    delta.removedInstanceIds.length === 0 &&
    delta.addedEdges.length === 0 &&
    delta.updatedEdges.length === 0 &&
    delta.removedEdgeIds.length === 0
  );
}

function instanceIndex(
  instances: readonly ProjectedWorldInstance[],
  instanceId: WorldInstanceId,
): number {
  let low = 0;
  let high = instances.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const current = instances[middle];
    if (!current) break;
    const comparison = current.id.localeCompare(instanceId);
    if (comparison === 0) return middle;
    if (comparison < 0) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

function isDerivedPositionOnlyUpdate(
  previous: ProjectedWorldInstance,
  next: ProjectedWorldInstance,
): boolean {
  if (
    !Object.isFrozen(next) ||
    (next.localOffset !== undefined && !Object.isFrozen(next.localOffset))
  ) {
    return false;
  }

  if (
    previous.id !== next.id ||
    previous.canonicalId !== next.canonicalId ||
    previous.label !== next.label ||
    previous.kind !== next.kind ||
    previous.occurrenceId !== next.occurrenceId ||
    previous.occurrenceIds !== next.occurrenceIds ||
    previous.geographicAnchors !== next.geographicAnchors ||
    previous.temporalWeight !== next.temporalWeight ||
    previous.visualWeight !== next.visualWeight ||
    previous.retained !== next.retained ||
    previous.style !== next.style
  ) {
    return false;
  }

  if (
    next.localOffset &&
    !(Number.isFinite(next.localOffset.eastMeters) && Number.isFinite(next.localOffset.northMeters))
  ) {
    return false;
  }
  return !(
    next.visualAltitude !== undefined &&
    (!Number.isFinite(next.visualAltitude) || next.visualAltitude < 0)
  );
}

function applyDerivedPositionOnlyDelta(
  previous: WorldProjection,
  delta: WorldProjectionDelta,
): WorldProjection | null {
  if (
    delta.addedInstances.length !== 0 ||
    delta.removedInstanceIds.length !== 0 ||
    delta.addedEdges.length !== 0 ||
    delta.updatedEdges.length !== 0 ||
    delta.removedEdgeIds.length !== 0
  ) {
    return null;
  }
  if (delta.updatedInstances.length === 0) return previous;

  const seen = new Set<WorldInstanceId>();
  const replacements: Array<{ index: number; value: ProjectedWorldInstance }> = [];
  for (const update of delta.updatedInstances) {
    if (seen.has(update.id)) return null;
    seen.add(update.id);
    const index = instanceIndex(previous.instances, update.id);
    if (index < 0) return null;
    const current = previous.instances[index];
    if (!(current && isDerivedPositionOnlyUpdate(current, update))) return null;
    replacements.push({ index, value: update });
  }

  const instances = [...previous.instances];
  for (const replacement of replacements) instances[replacement.index] = replacement.value;
  return Object.freeze({
    instances: Object.freeze(instances),
    edges: previous.edges,
  });
}

export function applyWorldProjectionDelta(
  previous: WorldProjection,
  delta: WorldProjectionDelta,
): WorldProjection {
  const derivedOnly = applyDerivedPositionOnlyDelta(previous, delta);
  if (derivedOnly) return derivedOnly;
  const instances = new Map(previous.instances.map((value) => [value.id, value]));
  const edges = new Map(previous.edges.map((value) => [value.id, value]));

  for (const id of delta.removedInstanceIds) {
    instances.delete(id);
  }
  for (const id of delta.removedEdgeIds) {
    edges.delete(id);
  }

  for (const value of delta.updatedInstances) {
    if (!instances.has(value.id)) {
      throw new Error(`Cannot update missing world instance: ${String(value.id)}`);
    }
    instances.set(value.id, value);
  }
  for (const value of delta.addedInstances) {
    if (instances.has(value.id)) {
      throw new Error(`Cannot add existing world instance: ${String(value.id)}`);
    }
    instances.set(value.id, value);
  }

  for (const value of delta.updatedEdges) {
    if (!edges.has(value.id)) {
      throw new Error(`Cannot update missing world edge: ${String(value.id)}`);
    }
    edges.set(value.id, value);
  }
  for (const value of delta.addedEdges) {
    if (edges.has(value.id)) {
      throw new Error(`Cannot add existing world edge: ${String(value.id)}`);
    }
    edges.set(value.id, value);
  }

  return createWorldProjection({
    instances: [...instances.values()],
    edges: [...edges.values()],
  });
}
