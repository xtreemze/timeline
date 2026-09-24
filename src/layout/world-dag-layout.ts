import {
  coordSimplex,
  decrossTwoLayer,
  graphConnect,
  layeringLongestPath,
  sugiyama,
} from "d3-dag";

import type { PlaceId } from "../domain/ids.ts";
import type {
  ProjectedWorldInstance,
  SpatialAnchor,
  WorldInstanceId,
  WorldProjection,
} from "../projection/world-projection.ts";

export interface WorldDagLayoutTarget {
  readonly instanceId: WorldInstanceId;
  readonly placeId: PlaceId;
  readonly eastMeters: number;
  readonly northMeters: number;
}

/**
 * A weak positional preference. Collision, semantic links, drag, and place
 * constraints remain free to move nodes away from the DAG target.
 */
export const WORLD_DAG_TARGET_STRENGTH = 0.002;

const DAG_COORDINATE_UNIT_METERS = 650;
const DAG_TARGET_BASE_RADIUS_METERS = 900;
const DAG_TARGET_RADIUS_PER_SQRT_NODE_METERS = 600;
const DAG_TARGET_MAX_RADIUS_METERS = 6_000;
const DAG_CACHE_LIMIT = 64;

interface LocalDagEdge {
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
}

const targetCache = new Map<string, readonly WorldDagLayoutTarget[]>();

function primaryAnchor(instance: ProjectedWorldInstance): SpatialAnchor | null {
  if (!instance.geographicAnchors.length) return null;

  return (
    [...instance.geographicAnchors].sort(
      (left, right) =>
        right.influence - left.influence ||
        (right.certainty ?? -1) - (left.certainty ?? -1) ||
        String(left.placeId).localeCompare(String(right.placeId)),
    )[0] ?? null
  );
}

function reaches(
  adjacency: ReadonlyMap<WorldInstanceId, ReadonlySet<WorldInstanceId>>,
  start: WorldInstanceId,
  target: WorldInstanceId,
): boolean {
  const pending = [start];
  const visited = new Set<WorldInstanceId>();

  while (pending.length) {
    const current = pending.pop();
    if (current === undefined) break;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const child of adjacency.get(current) ?? []) {
      if (!visited.has(child)) pending.push(child);
    }
  }

  return false;
}

function localAcyclicEdges(
  projection: WorldProjection,
  nodeIds: ReadonlySet<WorldInstanceId>,
): readonly LocalDagEdge[] {
  const adjacency = new Map<WorldInstanceId, Set<WorldInstanceId>>();
  const accepted: LocalDagEdge[] = [];
  const acceptedPairs = new Set<string>();

  for (const id of nodeIds) adjacency.set(id, new Set());

  const candidates = projection.edges
    .filter(
      (edge) =>
        edge.visible &&
        edge.temporalWeight > 0 &&
        edge.sourceInstanceId !== edge.targetInstanceId &&
        nodeIds.has(edge.sourceInstanceId) &&
        nodeIds.has(edge.targetInstanceId),
    )
    .sort(
      (left, right) =>
        String(left.sourceInstanceId).localeCompare(String(right.sourceInstanceId)) ||
        String(left.targetInstanceId).localeCompare(String(right.targetInstanceId)) ||
        String(left.id).localeCompare(String(right.id)),
    );

  for (const edge of candidates) {
    const pairKey = JSON.stringify([
      String(edge.sourceInstanceId),
      String(edge.targetInstanceId),
    ]);
    if (acceptedPairs.has(pairKey)) continue;
    if (reaches(adjacency, edge.targetInstanceId, edge.sourceInstanceId)) continue;

    acceptedPairs.add(pairKey);
    adjacency.get(edge.sourceInstanceId)?.add(edge.targetInstanceId);
    accepted.push(
      Object.freeze({
        sourceId: edge.sourceInstanceId,
        targetId: edge.targetInstanceId,
      }),
    );
  }

  return Object.freeze(accepted);
}

function targetCacheKey(
  placeId: PlaceId,
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
): string {
  return JSON.stringify([
    String(placeId),
    nodeIds.map(String),
    edges.map((edge) => [String(edge.sourceId), String(edge.targetId)]),
  ]);
}

function cacheTargets(
  key: string,
  targets: readonly WorldDagLayoutTarget[],
): readonly WorldDagLayoutTarget[] {
  if (targetCache.has(key)) targetCache.delete(key);
  if (targetCache.size >= DAG_CACHE_LIMIT) {
    const oldest = targetCache.keys().next().value;
    if (oldest !== undefined) targetCache.delete(oldest);
  }
  targetCache.set(key, targets);
  return targets;
}

function targetsForPlace(
  placeId: PlaceId,
  instances: readonly ProjectedWorldInstance[],
  projection: WorldProjection,
): readonly WorldDagLayoutTarget[] {
  const nodeIds = instances
    .map((instance) => instance.id)
    .sort((left, right) => String(left).localeCompare(String(right)));
  const nodeIdSet = new Set(nodeIds);
  const edges = localAcyclicEdges(projection, nodeIdSet);
  const key = targetCacheKey(placeId, nodeIds, edges);
  const cached = targetCache.get(key);
  if (cached) {
    targetCache.delete(key);
    targetCache.set(key, cached);
    return cached;
  }

  const indegree = new Map<WorldInstanceId, number>(
    nodeIds.map((id) => [id, 0] as const),
  );
  for (const edge of edges) {
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1);
  }

  const rootId = `__lum-place-root__:${String(placeId)}`;
  const links: Array<readonly [string, string]> = [];

  for (const id of nodeIds) {
    if ((indegree.get(id) ?? 0) === 0) {
      links.push(Object.freeze([rootId, String(id)]));
    }
  }
  for (const edge of edges) {
    links.push(Object.freeze([String(edge.sourceId), String(edge.targetId)]));
  }

  const graph = graphConnect()(links);
  const layout = sugiyama()
    .layering(layeringLongestPath())
    .decross(decrossTwoLayer())
    .coord(coordSimplex())
    .gap([1, 1]);
  layout(graph);

  const graphNodes = [...graph.nodes()];
  const root = graphNodes.find((node) => node.data === rootId);
  if (!root) return Object.freeze([]);

  const rawTargets = graphNodes
    .filter((node) => node.data !== rootId)
    .map((node) =>
      Object.freeze({
        id: node.data,
        x: node.x - root.x,
        y: node.y - root.y,
      }),
    );

  const maxRawRadius = rawTargets.reduce(
    (radius, target) => Math.max(radius, Math.hypot(target.x, target.y)),
    0,
  );
  const maxTargetRadius = Math.min(
    DAG_TARGET_MAX_RADIUS_METERS,
    DAG_TARGET_BASE_RADIUS_METERS +
      Math.sqrt(Math.max(1, nodeIds.length)) * DAG_TARGET_RADIUS_PER_SQRT_NODE_METERS,
  );
  const coordinateScale =
    maxRawRadius > 0
      ? Math.min(DAG_COORDINATE_UNIT_METERS, maxTargetRadius / maxRawRadius)
      : DAG_COORDINATE_UNIT_METERS;
  const originalIds = new Map(nodeIds.map((id) => [String(id), id] as const));

  const targets = rawTargets
    .map((raw): WorldDagLayoutTarget | null => {
      const instanceId = originalIds.get(raw.id);
      if (instanceId === undefined) return null;
      return Object.freeze({
        instanceId,
        placeId,
        eastMeters: raw.x * coordinateScale,
        // Sugiyama is top-to-bottom in screen space; local north is positive
        // upward, so invert the vertical coordinate to preserve that reading.
        northMeters: -raw.y * coordinateScale,
      });
    })
    .filter((target): target is WorldDagLayoutTarget => target !== null)
    .sort((left, right) => String(left.instanceId).localeCompare(String(right.instanceId)));

  return cacheTargets(key, Object.freeze(targets));
}

/**
 * Derive deterministic local Sugiyama targets around each primary geographic
 * anchor. The semantic graph itself is never rewritten: cycles are removed
 * only from this temporary layout graph, cross-place edges stay out of the
 * local DAG, and multi-anchor entities remain single world instances.
 */
export function createWorldDagLayoutTargets(
  projection: WorldProjection,
): readonly WorldDagLayoutTarget[] {
  const groups = new Map<PlaceId, ProjectedWorldInstance[]>();

  for (const instance of [...projection.instances].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  )) {
    const anchor = primaryAnchor(instance);
    if (!anchor) continue;
    groups.set(anchor.placeId, [...(groups.get(anchor.placeId) ?? []), instance]);
  }

  const targets: WorldDagLayoutTarget[] = [];
  for (const [placeId, instances] of [...groups.entries()].sort(([left], [right]) =>
    String(left).localeCompare(String(right)),
  )) {
    targets.push(...targetsForPlace(placeId, instances, projection));
  }

  return Object.freeze(
    targets.sort((left, right) => String(left.instanceId).localeCompare(String(right.instanceId))),
  );
}
