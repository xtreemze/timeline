import type {
  ProjectedWorldEdge,
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldProjection,
} from "./world-projection.ts";

export interface WorldProjectionDelta {
  readonly addedInstances: readonly ProjectedWorldInstance[];
  readonly updatedInstances: readonly ProjectedWorldInstance[];
  readonly removedInstanceIds: readonly WorldInstanceId[];
  readonly addedEdges: readonly ProjectedWorldEdge[];
  readonly updatedEdges: readonly ProjectedWorldEdge[];
  readonly removedEdgeIds: readonly string[];
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
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
    .map((value) => String(value.id));

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
