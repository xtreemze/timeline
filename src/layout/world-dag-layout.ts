import {
  type Decross,
  coordGreedy,
  coordSimplex,
  decrossOpt,
  decrossTwoLayer,
  graphConnect,
  layeringLongestPath,
  layeringSimplex,
  sugiyama,
} from "d3-dag";

import type { PlaceId, RelationshipId } from "../domain/ids.ts";
import type {
  ProjectedWorldEdge,
  ProjectedWorldInstance,
  SpatialAnchor,
  WorldInstanceId,
  WorldProjection,
} from "../projection/world-projection.ts";

export interface WorldDagLayoutNodeSize {
  readonly widthMeters: number;
  readonly heightMeters: number;
}

export interface WorldDagLayoutOptions {
  readonly nodeSizes?: ReadonlyMap<WorldInstanceId, WorldDagLayoutNodeSize>;
}

export interface WorldDagLayoutTarget {
  readonly instanceId: WorldInstanceId;
  readonly placeId: PlaceId;
  readonly eastMeters: number;
  readonly northMeters: number;
}

export interface WorldDagRoutePoint {
  readonly eastMeters: number;
  readonly northMeters: number;
}

export interface WorldDagLayoutRoute {
  readonly relationshipId: RelationshipId;
  readonly placeId: PlaceId;
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
  readonly points: readonly WorldDagRoutePoint[];
}

export interface WorldDagLayoutMetrics {
  readonly placeCount: number;
  readonly nodeCount: number;
  readonly localEdgeCount: number;
  readonly routedEdgeCount: number;
  readonly crossingCount: number | null;
  readonly meanEdgeLengthMeters: number;
  readonly minSeparationMeters: number | null;
  readonly meanStableDisplacementMeters: number;
  readonly algorithmCounts: Readonly<Record<string, number>>;
}

export interface WorldDagLayoutResult {
  readonly targets: readonly WorldDagLayoutTarget[];
  readonly routes: readonly WorldDagLayoutRoute[];
  readonly metrics: WorldDagLayoutMetrics;
}

/**
 * A structural positional preference. Geographic anchors, collision, semantic
 * links and drag still own final motion; this force only biases the local
 * equilibrium toward the layered organization.
 */
export const WORLD_DAG_TARGET_STRENGTH = 0.00125;

const DAG_FALLBACK_NODE_SIZE_METERS = 720;
const DAG_MIN_GAP_METERS = 180;
const DAG_MAX_GAP_METERS = 900;
const DAG_TARGET_BASE_RADIUS_METERS = 1_500;
const DAG_TARGET_RADIUS_PER_SQRT_NODE_METERS = 900;
const DAG_TARGET_MAX_RADIUS_METERS = 12_000;
const DAG_CACHE_RETENTION_REVISIONS = 8;
const EXACT_DECROSS_MAX_NODES = 8;
const EXACT_DECROSS_MAX_EDGES = 32;
const COMPARE_LAYERING_MAX_NODES = 24;
const COMPARE_LAYERING_MAX_EDGES = 96;
const SIMPLEX_COORD_MAX_NODES = 64;
const SIMPLEX_COORD_MAX_EDGES = 384;
const SIMPLEX_LAYER_MAX_NODES = 128;
const SIMPLEX_LAYER_MAX_EDGES = 384;
const PAIRWISE_METRIC_MAX_NODES = 256;

interface LocalDagEdge {
  readonly relationshipId: RelationshipId;
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
  readonly temporalWeight: number;
  readonly retained: boolean;
}

type DagLinkData = readonly [
  source: string,
  target: string,
  relationshipId: RelationshipId | null,
];

interface LayoutIndex {
  readonly instancesByPlace: ReadonlyMap<PlaceId, readonly ProjectedWorldInstance[]>;
  readonly edgesByPlace: ReadonlyMap<PlaceId, readonly ProjectedWorldEdge[]>;
}

interface RawTarget {
  readonly id: string;
  readonly eastMeters: number;
  readonly northMeters: number;
}

interface RawRoute {
  readonly relationshipId: RelationshipId;
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
  readonly points: readonly WorldDagRoutePoint[];
}

interface CandidateLayout {
  readonly name: string;
  readonly targets: readonly RawTarget[];
  readonly routes: readonly RawRoute[];
  readonly width: number;
  readonly height: number;
  readonly crossingCount: number | null;
  readonly meanEdgeLengthMeters: number;
  readonly minSeparationMeters: number | null;
  readonly meanStableDisplacementMeters: number;
}

interface PlaceLayoutCache {
  readonly topologyKey: string;
  readonly result: {
    readonly targets: readonly WorldDagLayoutTarget[];
    readonly routes: readonly WorldDagLayoutRoute[];
    readonly metrics: Omit<
      WorldDagLayoutMetrics,
      "placeCount" | "nodeCount" | "algorithmCounts"
    > & {
      readonly algorithm: string;
      readonly nodeCount: number;
    };
  };
  readonly lastSeenRevision: number;
}

const placeCache = new Map<string, PlaceLayoutCache>();
let layoutRevision = 0;

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

function buildLayoutIndex(projection: WorldProjection): LayoutIndex {
  const mutableInstancesByPlace = new Map<PlaceId, ProjectedWorldInstance[]>();
  const primaryPlaceByInstance = new Map<WorldInstanceId, PlaceId>();

  for (const instance of projection.instances) {
    const anchor = primaryAnchor(instance);
    if (!anchor) continue;
    primaryPlaceByInstance.set(instance.id, anchor.placeId);
    const group = mutableInstancesByPlace.get(anchor.placeId);
    if (group) group.push(instance);
    else mutableInstancesByPlace.set(anchor.placeId, [instance]);
  }

  const mutableEdgesByPlace = new Map<PlaceId, ProjectedWorldEdge[]>();
  for (const edge of projection.edges) {
    if (
      !edge.visible ||
      edge.temporalWeight <= 0 ||
      edge.sourceInstanceId === edge.targetInstanceId
    ) {
      continue;
    }
    const sourcePlace = primaryPlaceByInstance.get(edge.sourceInstanceId);
    const targetPlace = primaryPlaceByInstance.get(edge.targetInstanceId);
    if (!sourcePlace || sourcePlace !== targetPlace) continue;
    const group = mutableEdgesByPlace.get(sourcePlace);
    if (group) group.push(edge);
    else mutableEdgesByPlace.set(sourcePlace, [edge]);
  }

  const instancesByPlace = new Map<PlaceId, readonly ProjectedWorldInstance[]>();
  for (const [placeId, instances] of mutableInstancesByPlace) {
    instancesByPlace.set(
      placeId,
      Object.freeze(
        [...instances].sort((left, right) => String(left.id).localeCompare(String(right.id))),
      ),
    );
  }

  const edgesByPlace = new Map<PlaceId, readonly ProjectedWorldEdge[]>();
  for (const [placeId, edges] of mutableEdgesByPlace) {
    edgesByPlace.set(
      placeId,
      Object.freeze(
        [...edges].sort(
          (left, right) =>
            right.temporalWeight - left.temporalWeight ||
            Number(right.retained) - Number(left.retained) ||
            String(left.id).localeCompare(String(right.id)),
        ),
      ),
    );
  }

  return { instancesByPlace, edgesByPlace };
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

/**
 * Preserve the most temporally relevant directed relationships when a local
 * semantic graph contains cycles. Lower-weight cycle-closing edges stay in
 * the semantic/force graph; they are omitted only from this temporary DAG.
 */
function localAcyclicEdges(
  nodeIds: ReadonlySet<WorldInstanceId>,
  candidates: readonly ProjectedWorldEdge[],
): readonly LocalDagEdge[] {
  const adjacency = new Map<WorldInstanceId, Set<WorldInstanceId>>();
  const accepted: LocalDagEdge[] = [];
  const acceptedPairs = new Set<string>();

  for (const id of nodeIds) adjacency.set(id, new Set());

  for (const edge of candidates) {
    if (!nodeIds.has(edge.sourceInstanceId) || !nodeIds.has(edge.targetInstanceId)) continue;
    const pairKey = JSON.stringify([String(edge.sourceInstanceId), String(edge.targetInstanceId)]);
    if (acceptedPairs.has(pairKey)) continue;
    if (reaches(adjacency, edge.targetInstanceId, edge.sourceInstanceId)) continue;

    acceptedPairs.add(pairKey);
    adjacency.get(edge.sourceInstanceId)?.add(edge.targetInstanceId);
    accepted.push(
      Object.freeze({
        relationshipId: edge.id,
        sourceId: edge.sourceInstanceId,
        targetId: edge.targetInstanceId,
        temporalWeight: edge.temporalWeight,
        retained: edge.retained,
      }),
    );
  }

  return Object.freeze(accepted);
}

function finitePositiveSize(size: WorldDagLayoutNodeSize | undefined): readonly [number, number] {
  const width = size?.widthMeters;
  const height = size?.heightMeters;
  return Object.freeze([
    typeof width === "number" && Number.isFinite(width) && width > 0
      ? width
      : DAG_FALLBACK_NODE_SIZE_METERS,
    typeof height === "number" && Number.isFinite(height) && height > 0
      ? height
      : DAG_FALLBACK_NODE_SIZE_METERS,
  ]);
}

function nodeSizeMap(
  nodeIds: readonly WorldInstanceId[],
  sizes: ReadonlyMap<WorldInstanceId, WorldDagLayoutNodeSize> | undefined,
): ReadonlyMap<string, readonly [number, number]> {
  return new Map(nodeIds.map((id) => [String(id), finitePositiveSize(sizes?.get(id))] as const));
}

function layoutGap(
  sizes: ReadonlyMap<string, readonly [number, number]>,
): readonly [number, number] {
  const diameters = [...sizes.values()]
    .map(([width, height]) => Math.max(width, height))
    .sort((left, right) => left - right);
  const median = diameters[Math.floor(diameters.length / 2)] ?? DAG_FALLBACK_NODE_SIZE_METERS;
  const horizontal = Math.max(DAG_MIN_GAP_METERS, Math.min(DAG_MAX_GAP_METERS, median * 0.45));
  return Object.freeze([horizontal, horizontal * 1.15]);
}

function topologyKey(
  placeId: PlaceId,
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
): string {
  return JSON.stringify([
    String(placeId),
    nodeIds.map((id) => {
      const [width, height] = sizes.get(String(id)) ?? [
        DAG_FALLBACK_NODE_SIZE_METERS,
        DAG_FALLBACK_NODE_SIZE_METERS,
      ];
      return [String(id), Math.round(width), Math.round(height)];
    }),
    // Layout invalidation follows the accepted DAG structure, not continuously
    // changing temporal weights. Weight/retained changes that alter cycle
    // priority change the accepted edge set above and therefore still invalidate.
    edges.map((edge) => [
      String(edge.relationshipId),
      String(edge.sourceId),
      String(edge.targetId),
    ]),
  ]);
}

function properSegmentIntersection(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  d: readonly [number, number],
): boolean {
  const orient = (
    p: readonly [number, number],
    q: readonly [number, number],
    r: readonly [number, number],
  ) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function candidateMetrics(
  targets: readonly RawTarget[],
  edges: readonly LocalDagEdge[],
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): Pick<
  CandidateLayout,
  "crossingCount" | "meanEdgeLengthMeters" | "minSeparationMeters" | "meanStableDisplacementMeters"
> {
  const positions = new Map(
    targets.map((target) => [target.id, [target.eastMeters, target.northMeters] as const] as const),
  );

  let totalLength = 0;
  let measuredEdges = 0;
  for (const edge of edges) {
    const source = positions.get(String(edge.sourceId));
    const target = positions.get(String(edge.targetId));
    if (!source || !target) continue;
    totalLength += Math.hypot(target[0] - source[0], target[1] - source[1]);
    measuredEdges += 1;
  }

  let crossingCount: number | null = 0;
  if (edges.length > 256) {
    crossingCount = null;
  } else {
    for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) {
      const left = edges[leftIndex];
      if (!left) continue;
      const leftSource = positions.get(String(left.sourceId));
      const leftTarget = positions.get(String(left.targetId));
      if (!leftSource || !leftTarget) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
        const right = edges[rightIndex];
        if (
          !right ||
          left.sourceId === right.sourceId ||
          left.sourceId === right.targetId ||
          left.targetId === right.sourceId ||
          left.targetId === right.targetId
        ) {
          continue;
        }
        const rightSource = positions.get(String(right.sourceId));
        const rightTarget = positions.get(String(right.targetId));
        if (
          rightSource &&
          rightTarget &&
          properSegmentIntersection(leftSource, leftTarget, rightSource, rightTarget)
        ) {
          crossingCount += 1;
        }
      }
    }
  }

  let minSeparationMeters: number | null = targets.length <= 1 ? null : Number.POSITIVE_INFINITY;
  if (targets.length > PAIRWISE_METRIC_MAX_NODES) {
    minSeparationMeters = null;
  } else {
    for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
      const left = targets[leftIndex];
      if (!left) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
        const right = targets[rightIndex];
        if (!right) continue;
        minSeparationMeters = Math.min(
          minSeparationMeters ?? Number.POSITIVE_INFINITY,
          Math.hypot(right.eastMeters - left.eastMeters, right.northMeters - left.northMeters),
        );
      }
    }
    if (minSeparationMeters === Number.POSITIVE_INFINITY) minSeparationMeters = null;
  }

  let stableDisplacement = 0;
  let stableCount = 0;
  for (const target of targets) {
    const previous = previousTargets.get(target.id);
    if (!previous) continue;
    stableDisplacement += Math.hypot(
      target.eastMeters - previous.eastMeters,
      target.northMeters - previous.northMeters,
    );
    stableCount += 1;
  }

  return {
    crossingCount,
    meanEdgeLengthMeters: measuredEdges > 0 ? totalLength / measuredEdges : 0,
    minSeparationMeters,
    meanStableDisplacementMeters: stableCount > 0 ? stableDisplacement / stableCount : 0,
  };
}

function mirrorForStability(
  targets: readonly RawTarget[],
  routes: readonly RawRoute[],
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): { readonly targets: readonly RawTarget[]; readonly routes: readonly RawRoute[] } {
  let directCost = 0;
  let mirroredCost = 0;
  let comparisons = 0;

  for (const target of targets) {
    const previous = previousTargets.get(target.id);
    if (!previous) continue;
    directCost +=
      (target.eastMeters - previous.eastMeters) ** 2 +
      (target.northMeters - previous.northMeters) ** 2;
    mirroredCost +=
      (-target.eastMeters - previous.eastMeters) ** 2 +
      (target.northMeters - previous.northMeters) ** 2;
    comparisons += 1;
  }

  if (comparisons === 0 || directCost <= mirroredCost) {
    return { targets, routes };
  }

  return {
    targets: Object.freeze(
      targets.map((target) => Object.freeze({ ...target, eastMeters: -target.eastMeters })),
    ),
    routes: Object.freeze(
      routes.map((route) =>
        Object.freeze({
          ...route,
          points: Object.freeze(
            route.points.map((point) =>
              Object.freeze({
                eastMeters: -point.eastMeters,
                northMeters: point.northMeters,
              }),
            ),
          ),
        }),
      ),
    ),
  };
}

function minimumNonOverlappingScale(
  targets: readonly RawTarget[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
): number {
  if (targets.length > PAIRWISE_METRIC_MAX_NODES) return 1;

  let minimumScale = 0;
  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    const left = targets[leftIndex];
    if (!left) continue;
    const [leftWidth, leftHeight] =
      sizes.get(left.id) ?? [DAG_FALLBACK_NODE_SIZE_METERS, DAG_FALLBACK_NODE_SIZE_METERS];

    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const right = targets[rightIndex];
      if (!right) continue;
      const [rightWidth, rightHeight] =
        sizes.get(right.id) ?? [DAG_FALLBACK_NODE_SIZE_METERS, DAG_FALLBACK_NODE_SIZE_METERS];
      const dx = Math.abs(right.eastMeters - left.eastMeters);
      const dy = Math.abs(right.northMeters - left.northMeters);
      const requiredX = (leftWidth + rightWidth) / 2;
      const requiredY = (leftHeight + rightHeight) / 2;
      const scaleX = dx > 0 ? requiredX / dx : Number.POSITIVE_INFINITY;
      const scaleY = dy > 0 ? requiredY / dy : Number.POSITIVE_INFINITY;
      minimumScale = Math.max(minimumScale, Math.min(scaleX, scaleY));
    }
  }

  return Math.min(1, minimumScale);
}

function scaledCandidate(
  candidate: Omit<
    CandidateLayout,
    | "crossingCount"
    | "meanEdgeLengthMeters"
    | "minSeparationMeters"
    | "meanStableDisplacementMeters"
  >,
  nodeCount: number,
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): CandidateLayout {
  const maxRawRadius = candidate.targets.reduce(
    (radius, target) => Math.max(radius, Math.hypot(target.eastMeters, target.northMeters)),
    0,
  );
  const maxTargetRadius = Math.min(
    DAG_TARGET_MAX_RADIUS_METERS,
    DAG_TARGET_BASE_RADIUS_METERS +
      Math.sqrt(Math.max(1, nodeCount)) * DAG_TARGET_RADIUS_PER_SQRT_NODE_METERS,
  );
  const desiredScale =
    maxRawRadius > maxTargetRadius && maxRawRadius > 0 ? maxTargetRadius / maxRawRadius : 1;
  const safeScale = minimumNonOverlappingScale(candidate.targets, sizes);
  const scale = Math.min(1, Math.max(desiredScale, safeScale));

  // If the size-aware layout still cannot fit the local presentation radius
  // without overlap, do not feed contradictory positional targets/routes to
  // the force solver. Dense neighborhoods remain owned by collision + LOD.
  const safeRadius = maxRawRadius * scale;
  if (safeRadius > maxTargetRadius + 1e-6) {
    return Object.freeze({
      ...candidate,
      name: `${candidate.name}-force-only`,
      targets: Object.freeze([]),
      routes: Object.freeze([]),
      crossingCount: null,
      meanEdgeLengthMeters: 0,
      minSeparationMeters: null,
      meanStableDisplacementMeters: 0,
    });
  }

  const targets =
    scale === 1
      ? candidate.targets
      : Object.freeze(
          candidate.targets.map((target) =>
            Object.freeze({
              ...target,
              eastMeters: target.eastMeters * scale,
              northMeters: target.northMeters * scale,
            }),
          ),
        );
  const routes =
    scale === 1
      ? candidate.routes
      : Object.freeze(
          candidate.routes.map((route) =>
            Object.freeze({
              ...route,
              points: Object.freeze(
                route.points.map((point) =>
                  Object.freeze({
                    eastMeters: point.eastMeters * scale,
                    northMeters: point.northMeters * scale,
                  }),
                ),
              ),
            }),
          ),
        );

  const stable = mirrorForStability(targets, routes, previousTargets);
  return Object.freeze({
    ...candidate,
    targets: stable.targets,
    routes: stable.routes,
    ...candidateMetrics(stable.targets, edges, previousTargets),
  });
}

function candidateScore(candidate: CandidateLayout): number {
  if (candidate.targets.length === 0) return Number.POSITIVE_INFINITY;
  const crossings = candidate.crossingCount ?? 0;
  const aspect =
    Math.max(candidate.width, candidate.height) /
    Math.max(1, Math.min(candidate.width, candidate.height));
  return (
    crossings * 100_000 +
    candidate.meanEdgeLengthMeters +
    Math.max(0, aspect - 3) * 500 +
    candidate.meanStableDisplacementMeters * 0.5
  );
}

function priorOrderInitializer(
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): Decross<string, DagLinkData> {
  return (layers) => {
    const value = (node: (typeof layers)[number][number]): number => {
      const data = node.data;
      if (data.role === "node") {
        return previousTargets.get(data.node.data)?.eastMeters ?? Number.POSITIVE_INFINITY;
      }
      const source = previousTargets.get(data.link.source.data)?.eastMeters;
      const target = previousTargets.get(data.link.target.data)?.eastMeters;
      if (source !== undefined && target !== undefined) return (source + target) / 2;
      return source ?? target ?? Number.POSITIVE_INFINITY;
    };

    for (const layer of layers) {
      layer.sort((left, right) => value(left) - value(right));
    }
  };
}

function runLayoutCandidate(
  name: string,
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
  gap: readonly [number, number],
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
  layering: "longest" | "simplex",
  decross: "opt" | "two-layer",
  coord: "simplex" | "greedy",
): CandidateLayout {
  const rootId = "__lum-place-root__";
  const indegree = new Map<WorldInstanceId, number>(nodeIds.map((id) => [id, 0] as const));
  for (const edge of edges) {
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1);
  }

  const links: DagLinkData[] = [];
  for (const id of nodeIds) {
    if ((indegree.get(id) ?? 0) === 0) links.push([rootId, String(id), null]);
  }
  for (const edge of edges) {
    links.push([String(edge.sourceId), String(edge.targetId), edge.relationshipId]);
  }

  const graph = graphConnect()(links);
  const defaultTwoLayer = decrossTwoLayer();
  const twoLayer = defaultTwoLayer
    .passes(nodeIds.length > 64 ? 8 : nodeIds.length > 24 ? 16 : 24)
    .inits([priorOrderInitializer(previousTargets), ...defaultTwoLayer.inits()]);
  const layout = sugiyama()
    .layering(layering === "longest" ? layeringLongestPath() : layeringSimplex())
    .decross(decross === "opt" ? decrossOpt() : twoLayer)
    .coord(coord === "simplex" ? coordSimplex() : coordGreedy())
    .nodeSize((node) => sizes.get(node.data) ?? [1, 1])
    .gap(gap);
  const dimensions = layout(graph);

  const graphNodes = [...graph.nodes()];
  const root = graphNodes.find((node) => node.data === rootId);
  if (!root) {
    return Object.freeze({
      name,
      targets: Object.freeze([]),
      routes: Object.freeze([]),
      width: dimensions.width,
      height: dimensions.height,
      crossingCount: 0,
      meanEdgeLengthMeters: 0,
      minSeparationMeters: null,
      meanStableDisplacementMeters: 0,
    });
  }

  const originalIds = new Map(nodeIds.map((id) => [String(id), id] as const));
  const targets = Object.freeze(
    graphNodes
      .filter((node) => node.data !== rootId && originalIds.has(node.data))
      .map((node) =>
        Object.freeze({
          id: node.data,
          eastMeters: node.x - root.x,
          // Sugiyama is top-to-bottom in screen coordinates; local north is
          // positive upward, so invert Y while keeping geography authoritative.
          northMeters: -(node.y - root.y),
        }),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
  );

  const edgeByRelationship = new Map(
    edges.map((edge) => [String(edge.relationshipId), edge] as const),
  );
  const routes: RawRoute[] = [];
  for (const link of graph.links()) {
    const relationshipId = link.data[2];
    if (!relationshipId) continue;
    const semantic = edgeByRelationship.get(String(relationshipId));
    if (!semantic) continue;
    routes.push(
      Object.freeze({
        relationshipId,
        sourceId: semantic.sourceId,
        targetId: semantic.targetId,
        points: Object.freeze(
          link.points.map(([x, y]) =>
            Object.freeze({
              eastMeters: x - root.x,
              northMeters: -(y - root.y),
            }),
          ),
        ),
      }),
    );
  }

  return scaledCandidate(
    {
      name,
      targets,
      routes: Object.freeze(
        routes.sort((left, right) =>
          String(left.relationshipId).localeCompare(String(right.relationshipId)),
        ),
      ),
      width: dimensions.width,
      height: dimensions.height,
    },
    nodeIds.length,
    edges,
    sizes,
    previousTargets,
  );
}

function chooseCandidate(
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): CandidateLayout {
  const gap = layoutGap(sizes);

  if (nodeIds.length <= EXACT_DECROSS_MAX_NODES && edges.length <= EXACT_DECROSS_MAX_EDGES) {
    try {
      return runLayoutCandidate(
        "longest-opt-simplex",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "longest",
        "opt",
        "simplex",
      );
    } catch {
      return runLayoutCandidate(
        "longest-two-layer-simplex",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "longest",
        "two-layer",
        "simplex",
      );
    }
  }

  if (
    nodeIds.length <= COMPARE_LAYERING_MAX_NODES &&
    edges.length <= COMPARE_LAYERING_MAX_EDGES
  ) {
    const longest = runLayoutCandidate(
      "longest-two-layer-simplex",
      nodeIds,
      edges,
      sizes,
      gap,
      previousTargets,
      "longest",
      "two-layer",
      "simplex",
    );
    const simplex = runLayoutCandidate(
      "simplex-two-layer-simplex",
      nodeIds,
      edges,
      sizes,
      gap,
      previousTargets,
      "simplex",
      "two-layer",
      "simplex",
    );
    return candidateScore(longest) <= candidateScore(simplex) ? longest : simplex;
  }

  const useSimplexLayering =
    nodeIds.length <= SIMPLEX_LAYER_MAX_NODES && edges.length <= SIMPLEX_LAYER_MAX_EDGES;
  const useSimplexCoord =
    nodeIds.length <= SIMPLEX_COORD_MAX_NODES && edges.length <= SIMPLEX_COORD_MAX_EDGES;
  return runLayoutCandidate(
    useSimplexCoord
      ? useSimplexLayering
        ? "simplex-two-layer-simplex"
        : "longest-two-layer-simplex"
      : useSimplexLayering
        ? "simplex-two-layer-greedy"
        : "longest-two-layer-greedy",
    nodeIds,
    edges,
    sizes,
    gap,
    previousTargets,
    useSimplexLayering ? "simplex" : "longest",
    "two-layer",
    useSimplexCoord ? "simplex" : "greedy",
  );
}

function layoutPlace(
  placeId: PlaceId,
  instances: readonly ProjectedWorldInstance[],
  candidateEdges: readonly ProjectedWorldEdge[],
  options: WorldDagLayoutOptions,
  revision: number,
): PlaceLayoutCache["result"] {
  const nodeIds = instances.map((instance) => instance.id);
  const nodeIdSet = new Set(nodeIds);
  const sizes = nodeSizeMap(nodeIds, options.nodeSizes);
  const edges = localAcyclicEdges(nodeIdSet, candidateEdges);
  const key = topologyKey(placeId, nodeIds, edges, sizes);
  const cacheKey = String(placeId);
  const cached = placeCache.get(cacheKey);

  if (cached?.topologyKey === key) {
    placeCache.set(cacheKey, { ...cached, lastSeenRevision: revision });
    return cached.result;
  }

  const previousTargets = new Map(
    (cached?.result.targets ?? []).map((target) => [String(target.instanceId), target] as const),
  );
  const candidate = chooseCandidate(nodeIds, edges, sizes, previousTargets);
  const originalIds = new Map(nodeIds.map((id) => [String(id), id] as const));

  const targets = Object.freeze(
    candidate.targets
      .map((target): WorldDagLayoutTarget | null => {
        const instanceId = originalIds.get(target.id);
        if (!instanceId) return null;
        return Object.freeze({
          instanceId,
          placeId,
          eastMeters: target.eastMeters,
          northMeters: target.northMeters,
        });
      })
      .filter((target): target is WorldDagLayoutTarget => target !== null)
      .sort((left, right) => String(left.instanceId).localeCompare(String(right.instanceId))),
  );

  const routes = Object.freeze(
    candidate.routes
      .map((route) =>
        Object.freeze({
          relationshipId: route.relationshipId,
          placeId,
          sourceId: route.sourceId,
          targetId: route.targetId,
          points: route.points,
        }),
      )
      .sort((left, right) =>
        String(left.relationshipId).localeCompare(String(right.relationshipId)),
      ),
  );

  const result: PlaceLayoutCache["result"] = Object.freeze({
    targets,
    routes,
    metrics: Object.freeze({
      localEdgeCount: edges.length,
      routedEdgeCount: routes.length,
      crossingCount: candidate.crossingCount,
      meanEdgeLengthMeters: candidate.meanEdgeLengthMeters,
      minSeparationMeters: candidate.minSeparationMeters,
      meanStableDisplacementMeters: candidate.meanStableDisplacementMeters,
      algorithm: candidate.name,
      nodeCount: nodeIds.length,
    }),
  });
  placeCache.set(cacheKey, { topologyKey: key, result, lastSeenRevision: revision });
  return result;
}

function prunePlaceCache(revision: number): void {
  for (const [key, cached] of placeCache) {
    if (revision - cached.lastSeenRevision > DAG_CACHE_RETENTION_REVISIONS) {
      placeCache.delete(key);
    }
  }
}

/**
 * Derive deterministic, size-aware local Sugiyama organization around each
 * primary geographic anchor. The semantic graph itself is never rewritten:
 * cross-place edges remain semantic/force edges, and lower-priority
 * cycle-closing edges are omitted only from the temporary layout DAG.
 */
export function createWorldDagLayout(
  projection: WorldProjection,
  options: WorldDagLayoutOptions = {},
): WorldDagLayoutResult {
  const revision = ++layoutRevision;
  const index = buildLayoutIndex(projection);
  const targets: WorldDagLayoutTarget[] = [];
  const routes: WorldDagLayoutRoute[] = [];
  const algorithms: Record<string, number> = {};

  let localEdgeCount = 0;
  let routedEdgeCount = 0;
  let totalCrossings = 0;
  let hasUnknownCrossings = false;
  let weightedEdgeLength = 0;
  let edgeLengthWeight = 0;
  let minSeparationMeters: number | null = null;
  let weightedStableDisplacement = 0;
  let stableNodeWeight = 0;

  for (const [placeId, instances] of [...index.instancesByPlace.entries()].sort(([left], [right]) =>
    String(left).localeCompare(String(right)),
  )) {
    const result = layoutPlace(
      placeId,
      instances,
      index.edgesByPlace.get(placeId) ?? Object.freeze([]),
      options,
      revision,
    );
    targets.push(...result.targets);
    routes.push(...result.routes);
    localEdgeCount += result.metrics.localEdgeCount;
    routedEdgeCount += result.metrics.routedEdgeCount;
    if (result.metrics.crossingCount === null) hasUnknownCrossings = true;
    else totalCrossings += result.metrics.crossingCount;
    weightedEdgeLength += result.metrics.meanEdgeLengthMeters * result.metrics.localEdgeCount;
    edgeLengthWeight += result.metrics.localEdgeCount;
    if (result.metrics.minSeparationMeters !== null) {
      minSeparationMeters =
        minSeparationMeters === null
          ? result.metrics.minSeparationMeters
          : Math.min(minSeparationMeters, result.metrics.minSeparationMeters);
    }
    weightedStableDisplacement +=
      result.metrics.meanStableDisplacementMeters * result.metrics.nodeCount;
    stableNodeWeight += result.metrics.nodeCount;
    algorithms[result.metrics.algorithm] = (algorithms[result.metrics.algorithm] ?? 0) + 1;
  }

  prunePlaceCache(revision);

  return Object.freeze({
    targets: Object.freeze(
      targets.sort((left, right) =>
        String(left.instanceId).localeCompare(String(right.instanceId)),
      ),
    ),
    routes: Object.freeze(
      routes.sort((left, right) =>
        String(left.relationshipId).localeCompare(String(right.relationshipId)),
      ),
    ),
    metrics: Object.freeze({
      placeCount: index.instancesByPlace.size,
      nodeCount: stableNodeWeight,
      localEdgeCount,
      routedEdgeCount,
      crossingCount: hasUnknownCrossings ? null : totalCrossings,
      meanEdgeLengthMeters: edgeLengthWeight > 0 ? weightedEdgeLength / edgeLengthWeight : 0,
      minSeparationMeters,
      meanStableDisplacementMeters:
        stableNodeWeight > 0 ? weightedStableDisplacement / stableNodeWeight : 0,
      algorithmCounts: Object.freeze({ ...algorithms }),
    }),
  });
}

/** Compatibility helper for call sites that only need node targets. */
export function createWorldDagLayoutTargets(
  projection: WorldProjection,
  options: WorldDagLayoutOptions = {},
): readonly WorldDagLayoutTarget[] {
  return createWorldDagLayout(projection, options).targets;
}
