import {
  coordGreedy,
  type Decross,
  decrossOpt,
  decrossTwoLayer,
  type GraphNode,
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
  /** Layout-only footprint reserved around each authored geographic anchor. */
  readonly placeSizes?: ReadonlyMap<PlaceId, WorldDagLayoutNodeSize>;
  /**
   * Explicit operator-requested reorganization. Bypasses the per-place result
   * cache and stability hysteresis for this pass, but remains deterministic.
   * Geographic anchors still define the local coordinate frame and are never
   * rewritten or promoted into DAG nodes.
   */
  readonly reorganize?: boolean;
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
const DAG_TARGET_HARD_MAX_RADIUS_METERS = 36_000;
const DAG_CACHE_RETENTION_REVISIONS = 8;
const EXACT_DECROSS_MAX_NODES = 8;
const EXACT_DECROSS_MAX_EDGES = 32;
const COMPARE_LAYERING_MAX_NODES = 24;
const COMPARE_LAYERING_MAX_EDGES = 96;
const SIMPLEX_LAYER_MAX_NODES = 128;
const SIMPLEX_LAYER_MAX_EDGES = 384;
const PAIRWISE_METRIC_MAX_NODES = 256;
const ROUTE_METRIC_MAX_SEGMENTS = 512;
const LAYOUT_HYSTERESIS_SCORE_RATIO = 1.12;
const COMPARE_LAYERING_HYSTERESIS_NODES = 4;
const COMPARE_LAYERING_HYSTERESIS_EDGES = 16;
const SIMPLEX_LAYER_HYSTERESIS_NODES = 16;
const SIMPLEX_LAYER_HYSTERESIS_EDGES = 64;

interface LocalDagEdge {
  readonly relationshipId: RelationshipId;
  readonly sourceId: WorldInstanceId;
  readonly targetId: WorldInstanceId;
  readonly temporalWeight: number;
  readonly retained: boolean;
}

type DagLinkData = readonly [source: string, target: string, relationshipId: RelationshipId | null];

interface LayoutIndex {
  readonly instancesByPlace: ReadonlyMap<PlaceId, readonly ProjectedWorldInstance[]>;
  readonly edgesByPlace: ReadonlyMap<PlaceId, readonly ProjectedWorldEdge[]>;
  readonly primaryPlaceByInstance: ReadonlyMap<WorldInstanceId, PlaceId>;
  readonly structuralEdges: readonly ProjectedWorldEdge[];
  readonly crossPlaceInstanceIds: ReadonlySet<WorldInstanceId>;
}

interface DagPlaceObstacle {
  readonly id: string;
  readonly placeId: PlaceId;
  readonly nodeIds: readonly WorldInstanceId[];
  readonly size: readonly [number, number];
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
interface CrossPlaceLayoutCache {
  readonly topologyKey: string;
  readonly targets: readonly WorldDagLayoutTarget[];
  readonly routes: readonly WorldDagLayoutRoute[];
  readonly algorithm: string;
  readonly lastSeenRevision: number;
}
let crossPlaceCache: CrossPlaceLayoutCache | null = null;
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
  const crossPlaceInstanceIds = new Set<WorldInstanceId>();

  for (const instance of projection.instances) {
    const anchor = primaryAnchor(instance);
    if (!anchor) continue;
    primaryPlaceByInstance.set(instance.id, anchor.placeId);
    const group = mutableInstancesByPlace.get(anchor.placeId);
    if (group) group.push(instance);
    else mutableInstancesByPlace.set(anchor.placeId, [instance]);
  }

  const mutableEdgesByPlace = new Map<PlaceId, ProjectedWorldEdge[]>();
  const structuralEdges: ProjectedWorldEdge[] = [];
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
    if (!sourcePlace || !targetPlace) continue;
    structuralEdges.push(edge);
    if (sourcePlace !== targetPlace) {
      crossPlaceInstanceIds.add(edge.sourceInstanceId);
      crossPlaceInstanceIds.add(edge.targetInstanceId);
      continue;
    }
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

  return {
    instancesByPlace,
    edgesByPlace,
    primaryPlaceByInstance,
    structuralEdges: Object.freeze(
      structuralEdges.sort(
        (left, right) =>
          right.temporalWeight - left.temporalWeight ||
          Number(right.retained) - Number(left.retained) ||
          String(left.id).localeCompare(String(right.id)),
      ),
    ),
    crossPlaceInstanceIds: Object.freeze(crossPlaceInstanceIds),
  };
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

function stronglyConnectedComponentIndex(
  nodeIds: ReadonlySet<WorldInstanceId>,
  candidates: readonly ProjectedWorldEdge[],
): ReadonlyMap<WorldInstanceId, number> {
  const adjacency = new Map<WorldInstanceId, WorldInstanceId[]>(
    [...nodeIds].map((id) => [id, []] as const),
  );
  for (const edge of candidates) {
    if (!nodeIds.has(edge.sourceInstanceId) || !nodeIds.has(edge.targetInstanceId)) continue;
    adjacency.get(edge.sourceInstanceId)?.push(edge.targetInstanceId);
  }
  for (const entries of adjacency.values()) {
    entries.sort((left, right) => String(left).localeCompare(String(right)));
  }

  let nextIndex = 0;
  let nextComponent = 0;
  const indexes = new Map<WorldInstanceId, number>();
  const lowLinks = new Map<WorldInstanceId, number>();
  const stack: WorldInstanceId[] = [];
  const stacked = new Set<WorldInstanceId>();
  const componentByNode = new Map<WorldInstanceId, number>();

  const visit = (node: WorldInstanceId): void => {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    stacked.add(node);

    for (const child of adjacency.get(node) ?? []) {
      if (!indexes.has(child)) {
        visit(child);
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, lowLinks.get(child) ?? 0));
      } else if (stacked.has(child)) {
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, indexes.get(child) ?? 0));
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return;
    while (stack.length) {
      const member = stack.pop();
      if (member === undefined) break;
      stacked.delete(member);
      componentByNode.set(member, nextComponent);
      if (member === node) break;
    }
    nextComponent += 1;
  };

  for (const node of [...nodeIds].sort((left, right) =>
    String(left).localeCompare(String(right)),
  )) {
    if (!indexes.has(node)) visit(node);
  }

  return componentByNode;
}

/**
 * Build an acyclic structural view without letting one arbitrary cycle-closing
 * choice redefine the hierarchy outside that cycle. Strongly connected
 * components are identified first; all unique inter-component relationships
 * are retained, while cycle breaking is confined to relationships inside an
 * SCC. The semantic/force graph remains untouched.
 */
function localAcyclicEdges(
  nodeIds: ReadonlySet<WorldInstanceId>,
  candidates: readonly ProjectedWorldEdge[],
): readonly LocalDagEdge[] {
  const componentByNode = stronglyConnectedComponentIndex(nodeIds, candidates);
  const accepted: LocalDagEdge[] = [];
  const acceptedPairs = new Set<string>();
  const internalAdjacency = new Map<WorldInstanceId, Set<WorldInstanceId>>(
    [...nodeIds].map((id) => [id, new Set()] as const),
  );

  const append = (edge: ProjectedWorldEdge): void => {
    const pairKey = JSON.stringify([String(edge.sourceInstanceId), String(edge.targetInstanceId)]);
    if (acceptedPairs.has(pairKey)) return;
    acceptedPairs.add(pairKey);
    accepted.push(
      Object.freeze({
        relationshipId: edge.id,
        sourceId: edge.sourceInstanceId,
        targetId: edge.targetInstanceId,
        temporalWeight: edge.temporalWeight,
        retained: edge.retained,
      }),
    );
  };

  for (const edge of candidates) {
    if (!nodeIds.has(edge.sourceInstanceId) || !nodeIds.has(edge.targetInstanceId)) continue;
    const sourceComponent = componentByNode.get(edge.sourceInstanceId);
    const targetComponent = componentByNode.get(edge.targetInstanceId);
    if (sourceComponent === undefined || targetComponent === undefined) continue;

    if (sourceComponent !== targetComponent) {
      append(edge);
      continue;
    }

    if (reaches(internalAdjacency, edge.targetInstanceId, edge.sourceInstanceId)) continue;
    append(edge);
    internalAdjacency.get(edge.sourceInstanceId)?.add(edge.targetInstanceId);
  }

  return Object.freeze(accepted);
}

function placeObstacleId(placeId: PlaceId): string {
  return `__lum-place:${JSON.stringify(String(placeId))}`;
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
  placeSize: readonly [number, number],
): string {
  return JSON.stringify([
    String(placeId),
    [Math.round(placeSize[0]), Math.round(placeSize[1])],
    nodeIds.map((id) => {
      const [width, height] = sizes.get(String(id)) ?? [
        DAG_FALLBACK_NODE_SIZE_METERS,
        DAG_FALLBACK_NODE_SIZE_METERS,
      ];
      return [String(id), Math.round(width), Math.round(height)];
    }),
    edges
      .map((edge) => [String(edge.relationshipId), String(edge.sourceId), String(edge.targetId)])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
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

function routeSegments(
  route: RawRoute,
): readonly (readonly [WorldDagRoutePoint, WorldDagRoutePoint])[] {
  const segments: Array<readonly [WorldDagRoutePoint, WorldDagRoutePoint]> = [];
  for (let index = 1; index < route.points.length; index += 1) {
    const source = route.points[index - 1];
    const target = route.points[index];
    if (source && target) segments.push(Object.freeze([source, target]));
  }
  return Object.freeze(segments);
}

function candidateMetrics(
  targets: readonly RawTarget[],
  routes: readonly RawRoute[],
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
): Pick<
  CandidateLayout,
  "crossingCount" | "meanEdgeLengthMeters" | "minSeparationMeters" | "meanStableDisplacementMeters"
> {
  const segmentedRoutes = routes.map((route) => ({ route, segments: routeSegments(route) }));
  let totalLength = 0;
  let measuredRoutes = 0;
  let segmentCount = 0;

  for (const { segments } of segmentedRoutes) {
    if (segments.length === 0) continue;
    measuredRoutes += 1;
    segmentCount += segments.length;
    for (const [source, target] of segments) {
      totalLength += Math.hypot(
        target.eastMeters - source.eastMeters,
        target.northMeters - source.northMeters,
      );
    }
  }

  let crossingCount: number | null = 0;
  if (segmentCount > ROUTE_METRIC_MAX_SEGMENTS) {
    crossingCount = null;
  } else {
    for (let leftIndex = 0; leftIndex < segmentedRoutes.length; leftIndex += 1) {
      const left = segmentedRoutes[leftIndex];
      if (!left) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < segmentedRoutes.length; rightIndex += 1) {
        const right = segmentedRoutes[rightIndex];
        if (
          !right ||
          left.route.sourceId === right.route.sourceId ||
          left.route.sourceId === right.route.targetId ||
          left.route.targetId === right.route.sourceId ||
          left.route.targetId === right.route.targetId
        ) {
          continue;
        }

        for (const [leftSource, leftTarget] of left.segments) {
          for (const [rightSource, rightTarget] of right.segments) {
            if (
              properSegmentIntersection(
                [leftSource.eastMeters, leftSource.northMeters],
                [leftTarget.eastMeters, leftTarget.northMeters],
                [rightSource.eastMeters, rightSource.northMeters],
                [rightTarget.eastMeters, rightTarget.northMeters],
              )
            ) {
              crossingCount += 1;
            }
          }
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
    meanEdgeLengthMeters: measuredRoutes > 0 ? totalLength / measuredRoutes : 0,
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
    const [leftWidth, leftHeight] = sizes.get(left.id) ?? [
      DAG_FALLBACK_NODE_SIZE_METERS,
      DAG_FALLBACK_NODE_SIZE_METERS,
    ];

    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const right = targets[rightIndex];
      if (!right) continue;
      const [rightWidth, rightHeight] = sizes.get(right.id) ?? [
        DAG_FALLBACK_NODE_SIZE_METERS,
        DAG_FALLBACK_NODE_SIZE_METERS,
      ];
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

  // The preferred radius is soft: modest deep DAGs may expand their place
  // domain rather than lose size-aware separation. The hard bound prevents a
  // pathological local hierarchy from stretching across geographic scales;
  // those neighborhoods remain owned by collision + LOD.
  const safeRadius = maxRawRadius * scale;
  if (safeRadius > DAG_TARGET_HARD_MAX_RADIUS_METERS + 1e-6) {
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
    ...candidateMetrics(stable.targets, stable.routes, previousTargets),
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
  placeObstacles: readonly DagPlaceObstacle[] = Object.freeze([]),
  rootSize: readonly [number, number] = Object.freeze([1, 1]),
): CandidateLayout {
  const rootId = "__lum-layout-root__";
  const indegree = new Map<WorldInstanceId, number>(nodeIds.map((id) => [id, 0] as const));
  for (const edge of edges) {
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1);
  }

  const layoutSizes = new Map<string, readonly [number, number]>(sizes);
  layoutSizes.set(rootId, rootSize);
  for (const obstacle of placeObstacles) layoutSizes.set(obstacle.id, obstacle.size);

  const links: DagLinkData[] = [];
  if (placeObstacles.length === 0) {
    for (const id of nodeIds) {
      if ((indegree.get(id) ?? 0) === 0) links.push([rootId, String(id), null]);
    }
  } else {
    for (const obstacle of placeObstacles) {
      links.push([rootId, obstacle.id, null]);
      const members = obstacle.nodeIds.filter((id) => indegree.has(id));
      const roots = members.filter((id) => (indegree.get(id) ?? 0) === 0);
      const entryNodes =
        roots.length > 0
          ? roots
          : [...members]
              .sort(
                (left, right) =>
                  (indegree.get(left) ?? 0) - (indegree.get(right) ?? 0) ||
                  String(left).localeCompare(String(right)),
              )
              .slice(0, 1);
      for (const id of entryNodes) links.push([obstacle.id, String(id), null]);
    }
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
    .coord(coordGreedy())
    .nodeSize((node: GraphNode<string, DagLinkData>) => layoutSizes.get(node.data) ?? [1, 1])
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

  const targets = Object.freeze(
    graphNodes
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
    nodeIds.length + placeObstacles.length,
    layoutSizes,
    previousTargets,
  );
}

function stableAlgorithmName(name: string | undefined): string | null {
  if (!name) return null;
  return name.endsWith("-force-only") ? name.slice(0, -"-force-only".length) : name;
}

function preferPreviousCandidate(
  previousAlgorithm: string | undefined,
  candidates: readonly CandidateLayout[],
): CandidateLayout {
  const best = [...candidates].sort(
    (left, right) =>
      candidateScore(left) - candidateScore(right) || left.name.localeCompare(right.name),
  )[0];
  if (!best) {
    throw new Error("World DAG candidate selection requires at least one candidate.");
  }

  const priorName = stableAlgorithmName(previousAlgorithm);
  const prior = candidates.find((candidate) => candidate.name === priorName);
  if (!prior || prior.targets.length === 0) return best;

  return candidateScore(prior) <= candidateScore(best) * LAYOUT_HYSTERESIS_SCORE_RATIO
    ? prior
    : best;
}

function chooseCandidate(
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
  previousTargets: ReadonlyMap<string, WorldDagLayoutTarget>,
  previousAlgorithm?: string,
  placeObstacles: readonly DagPlaceObstacle[] = Object.freeze([]),
  rootSize: readonly [number, number] = Object.freeze([1, 1]),
): CandidateLayout {
  const gapSizes = new Map<string, readonly [number, number]>(sizes);
  for (const obstacle of placeObstacles) gapSizes.set(obstacle.id, obstacle.size);
  const gap = layoutGap(gapSizes);
  const previousName = stableAlgorithmName(previousAlgorithm);

  if (nodeIds.length === 0) {
    return Object.freeze({
      name: "sparse-force-only",
      targets: Object.freeze([]),
      routes: Object.freeze([]),
      width: 0,
      height: 0,
      crossingCount: null,
      meanEdgeLengthMeters: 0,
      minSeparationMeters: null,
      meanStableDisplacementMeters: 0,
    });
  }

  if (nodeIds.length <= EXACT_DECROSS_MAX_NODES && edges.length <= EXACT_DECROSS_MAX_EDGES) {
    const candidates: CandidateLayout[] = [];
    try {
      candidates.push(
        runLayoutCandidate(
          "longest-opt-greedy",
          nodeIds,
          edges,
          sizes,
          gap,
          previousTargets,
          "longest",
          "opt",
          placeObstacles,
          rootSize,
        ),
      );
    } catch {
      // Exact decross can reject pathological tiny graphs; bounded heuristics remain available.
    }
    candidates.push(
      runLayoutCandidate(
        "longest-two-layer-greedy",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "longest",
        "two-layer",
        placeObstacles,
        rootSize,
      ),
      runLayoutCandidate(
        "simplex-two-layer-greedy",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "simplex",
        "two-layer",
        placeObstacles,
        rootSize,
      ),
    );
    return preferPreviousCandidate(previousAlgorithm, candidates);
  }

  const compareLayering =
    (nodeIds.length <= COMPARE_LAYERING_MAX_NODES && edges.length <= COMPARE_LAYERING_MAX_EDGES) ||
    ((previousName === "longest-two-layer-greedy" ||
      previousName === "simplex-two-layer-greedy") &&
      nodeIds.length <= COMPARE_LAYERING_MAX_NODES + COMPARE_LAYERING_HYSTERESIS_NODES &&
      edges.length <= COMPARE_LAYERING_MAX_EDGES + COMPARE_LAYERING_HYSTERESIS_EDGES);

  if (compareLayering) {
    return preferPreviousCandidate(previousAlgorithm, [
      runLayoutCandidate(
        "longest-two-layer-greedy",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "longest",
        "two-layer",
        placeObstacles,
        rootSize,
      ),
      runLayoutCandidate(
        "simplex-two-layer-greedy",
        nodeIds,
        edges,
        sizes,
        gap,
        previousTargets,
        "simplex",
        "two-layer",
        placeObstacles,
        rootSize,
      ),
    ]);
  }

  const previousUsedSimplexLayering = previousName === "simplex-two-layer-greedy";
  const useSimplexLayering =
    (nodeIds.length <= SIMPLEX_LAYER_MAX_NODES && edges.length <= SIMPLEX_LAYER_MAX_EDGES) ||
    (previousUsedSimplexLayering &&
      nodeIds.length <= SIMPLEX_LAYER_MAX_NODES + SIMPLEX_LAYER_HYSTERESIS_NODES &&
      edges.length <= SIMPLEX_LAYER_MAX_EDGES + SIMPLEX_LAYER_HYSTERESIS_EDGES);
  return runLayoutCandidate(
    useSimplexLayering ? "simplex-two-layer-greedy" : "longest-two-layer-greedy",
    nodeIds,
    edges,
    sizes,
    gap,
    previousTargets,
    useSimplexLayering ? "simplex" : "longest",
    "two-layer",
    placeObstacles,
    rootSize,
  );
}

function layoutPlace(
  placeId: PlaceId,
  instances: readonly ProjectedWorldInstance[],
  candidateEdges: readonly ProjectedWorldEdge[],
  options: WorldDagLayoutOptions,
  revision: number,
  crossPlaceInstanceIds: ReadonlySet<WorldInstanceId>,
): PlaceLayoutCache["result"] {
  const nodeIds = instances.map((instance) => instance.id);
  const nodeIdSet = new Set(nodeIds);
  const sizes = nodeSizeMap(nodeIds, options.nodeSizes);
  const placeSize = finitePositiveSize(options.placeSizes?.get(placeId));
  const edges = localAcyclicEdges(nodeIdSet, candidateEdges);
  const structuredNodeSet = new Set<WorldInstanceId>();
  for (const edge of edges) {
    structuredNodeSet.add(edge.sourceId);
    structuredNodeSet.add(edge.targetId);
  }
  for (const id of crossPlaceInstanceIds) {
    if (nodeIdSet.has(id)) structuredNodeSet.add(id);
  }
  const structuredNodeIds = nodeIds.filter((id) => structuredNodeSet.has(id));
  const key = topologyKey(placeId, nodeIds, edges, sizes, placeSize);
  const cacheKey = String(placeId);
  const cached = placeCache.get(cacheKey);

  if (!options.reorganize && cached?.topologyKey === key) {
    placeCache.set(cacheKey, { ...cached, lastSeenRevision: revision });
    return cached.result;
  }

  const previousTargets = new Map(
    (options.reorganize ? [] : (cached?.result.targets ?? [])).map(
      (target) => [String(target.instanceId), target] as const,
    ),
  );
  const candidate = chooseCandidate(
    structuredNodeIds,
    edges,
    sizes,
    previousTargets,
    options.reorganize ? undefined : cached?.result.metrics.algorithm,
    Object.freeze([]),
    placeSize,
  );
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


function crossPlaceConnectedNodeIds(index: LayoutIndex): ReadonlySet<WorldInstanceId> {
  if (index.crossPlaceInstanceIds.size === 0) return new Set();

  const adjacency = new Map<WorldInstanceId, Set<WorldInstanceId>>();
  for (const edge of index.structuralEdges) {
    const source = adjacency.get(edge.sourceInstanceId);
    if (source) source.add(edge.targetInstanceId);
    else adjacency.set(edge.sourceInstanceId, new Set([edge.targetInstanceId]));

    const target = adjacency.get(edge.targetInstanceId);
    if (target) target.add(edge.sourceInstanceId);
    else adjacency.set(edge.targetInstanceId, new Set([edge.sourceInstanceId]));
  }

  const connected = new Set<WorldInstanceId>();
  const pending = [...index.crossPlaceInstanceIds];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || connected.has(current)) continue;
    connected.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!connected.has(neighbor)) pending.push(neighbor);
    }
  }
  return connected;
}

function crossPlaceTopologyKey(
  nodeIds: readonly WorldInstanceId[],
  edges: readonly LocalDagEdge[],
  sizes: ReadonlyMap<string, readonly [number, number]>,
  places: ReadonlyMap<WorldInstanceId, PlaceId>,
  placeSizes: ReadonlyMap<PlaceId, WorldDagLayoutNodeSize> | undefined,
): string {
  const usedPlaces = [
    ...new Set(
      nodeIds
        .map((id) => places.get(id))
        .filter((id): id is PlaceId => id !== undefined),
    ),
  ].sort((left, right) => String(left).localeCompare(String(right)));

  return JSON.stringify([
    "cross-place",
    nodeIds.map((id) => {
      const [width, height] = sizes.get(String(id)) ?? [
        DAG_FALLBACK_NODE_SIZE_METERS,
        DAG_FALLBACK_NODE_SIZE_METERS,
      ];
      return [String(id), String(places.get(id) ?? ""), Math.round(width), Math.round(height)];
    }),
    usedPlaces.map((placeId) => {
      const [width, height] = finitePositiveSize(placeSizes?.get(placeId));
      return [String(placeId), Math.round(width), Math.round(height)];
    }),
    edges
      .map((edge) => [String(edge.relationshipId), String(edge.sourceId), String(edge.targetId)])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  ]);
}

function layoutCrossPlaceTopology(
  projection: WorldProjection,
  index: LayoutIndex,
  options: WorldDagLayoutOptions,
  revision: number,
): CrossPlaceLayoutCache | null {
  const connectedIds = crossPlaceConnectedNodeIds(index);
  if (connectedIds.size === 0) {
    crossPlaceCache = null;
    return null;
  }

  const nodeIds = projection.instances
    .map((instance) => instance.id)
    .filter((id) => connectedIds.has(id) && index.primaryPlaceByInstance.has(id));
  if (nodeIds.length === 0) return null;

  const nodeIdSet = new Set(nodeIds);
  const candidateEdges = index.structuralEdges.filter(
    (edge) => nodeIdSet.has(edge.sourceInstanceId) && nodeIdSet.has(edge.targetInstanceId),
  );
  const edges = localAcyclicEdges(nodeIdSet, candidateEdges);
  const sizes = nodeSizeMap(nodeIds, options.nodeSizes);
  const placeIds = [
    ...new Set(
      nodeIds
        .map((id) => index.primaryPlaceByInstance.get(id))
        .filter((id): id is PlaceId => id !== undefined),
    ),
  ].sort((left, right) => String(left).localeCompare(String(right)));
  const placeObstacles = Object.freeze(
    placeIds.map((placeId) =>
      Object.freeze({
        id: placeObstacleId(placeId),
        placeId,
        nodeIds: Object.freeze(
          nodeIds.filter((id) => index.primaryPlaceByInstance.get(id) === placeId),
        ),
        size: finitePositiveSize(options.placeSizes?.get(placeId)),
      }),
    ),
  );
  const key = crossPlaceTopologyKey(
    nodeIds,
    edges,
    sizes,
    index.primaryPlaceByInstance,
    options.placeSizes,
  );

  if (!options.reorganize && crossPlaceCache?.topologyKey === key) {
    crossPlaceCache = { ...crossPlaceCache, lastSeenRevision: revision };
    return crossPlaceCache;
  }

  const previousTargets = new Map(
    (options.reorganize ? [] : (crossPlaceCache?.targets ?? [])).map(
      (target) => [String(target.instanceId), target] as const,
    ),
  );
  const candidate = chooseCandidate(
    nodeIds,
    edges,
    sizes,
    previousTargets,
    options.reorganize ? undefined : crossPlaceCache?.algorithm,
    placeObstacles,
  );
  if (candidate.targets.length === 0) {
    crossPlaceCache = {
      topologyKey: key,
      targets: Object.freeze([]),
      routes: Object.freeze([]),
      algorithm: candidate.name,
      lastSeenRevision: revision,
    };
    return crossPlaceCache;
  }

  const rawById = new Map(candidate.targets.map((target) => [target.id, target] as const));
  const placeOrigins = new Map(
    placeObstacles.flatMap((obstacle) => {
      const origin = rawById.get(obstacle.id);
      return origin ? [[obstacle.placeId, origin] as const] : [];
    }),
  );

  const centeredTargets = Object.freeze(
    nodeIds.flatMap((instanceId) => {
      const raw = rawById.get(String(instanceId));
      const placeId = index.primaryPlaceByInstance.get(instanceId);
      const origin = placeId ? placeOrigins.get(placeId) : undefined;
      if (!raw || !placeId || !origin) return [];
      return [
        Object.freeze({
          instanceId,
          placeId,
          eastMeters: raw.eastMeters - origin.eastMeters,
          northMeters: raw.northMeters - origin.northMeters,
        }),
      ];
    }),
  );

  const centeredRoutes = Object.freeze(
    candidate.routes.flatMap((route): readonly WorldDagLayoutRoute[] => {
      const sourcePlace = index.primaryPlaceByInstance.get(route.sourceId);
      const targetPlace = index.primaryPlaceByInstance.get(route.targetId);
      if (!sourcePlace || sourcePlace !== targetPlace) return [];
      const origin = placeOrigins.get(sourcePlace);
      if (!origin) return [];
      return [
        Object.freeze({
          relationshipId: route.relationshipId,
          placeId: sourcePlace,
          sourceId: route.sourceId,
          targetId: route.targetId,
          points: Object.freeze(
            route.points.map((point) =>
              Object.freeze({
                eastMeters: point.eastMeters - origin.eastMeters,
                northMeters: point.northMeters - origin.northMeters,
              }),
            ),
          ),
        }),
      ];
    }),
  );

  crossPlaceCache = {
    topologyKey: key,
    targets: centeredTargets,
    routes: centeredRoutes,
    algorithm: candidate.name,
    lastSeenRevision: revision,
  };
  return crossPlaceCache;
}

function prunePlaceCache(revision: number): void {
  for (const [key, cached] of placeCache) {
    if (revision - cached.lastSeenRevision > DAG_CACHE_RETENTION_REVISIONS) {
      placeCache.delete(key);
    }
  }
}

/**
 * Derive deterministic, size-aware Sugiyama organization while keeping each
 * primary geographic anchor authoritative. Local-only neighborhoods are laid
 * out per place. Any connected component that crosses a place boundary is
 * additionally laid out as one structural DAG containing layout-only place
 * obstacles. Entity coordinates are measured from their corresponding place
 * obstacle so topology and decrossing can propagate through geography without
 * relocating authored anchors or promoting places into semantic graph nodes.
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
      index.crossPlaceInstanceIds,
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

  const crossPlace = layoutCrossPlaceTopology(projection, index, options, revision);
  if (crossPlace) {
    const crossTargetIds = new Set(crossPlace.targets.map((target) => target.instanceId));
    const crossRouteIds = new Set(crossPlace.routes.map((route) => route.relationshipId));
    for (let index = targets.length - 1; index >= 0; index -= 1) {
      const target = targets[index];
      if (target && crossTargetIds.has(target.instanceId)) targets.splice(index, 1);
    }
    for (let index = routes.length - 1; index >= 0; index -= 1) {
      const route = routes[index];
      if (
        route &&
        (crossTargetIds.has(route.sourceId) ||
          crossTargetIds.has(route.targetId) ||
          crossRouteIds.has(route.relationshipId))
      ) {
        routes.splice(index, 1);
      }
    }
    targets.push(...crossPlace.targets);
    routes.push(...crossPlace.routes);
    algorithms[`cross-place:${crossPlace.algorithm}`] =
      (algorithms[`cross-place:${crossPlace.algorithm}`] ?? 0) + 1;
  }

  prunePlaceCache(revision);
  if (crossPlaceCache && revision - crossPlaceCache.lastSeenRevision > DAG_CACHE_RETENTION_REVISIONS) {
    crossPlaceCache = null;
  }

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
