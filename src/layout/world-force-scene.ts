import type { PlaceId } from "../domain/ids.ts";
import type { ProjectedWorldInstance, WorldProjection } from "../projection/world-projection.ts";
import {
  createWorldDagLayout,
  WORLD_DAG_TARGET_STRENGTH,
  type WorldDagCoordinateStrategy,
  type WorldDagEdgeStyle,
  type WorldDagLayoutAlgorithm,
  type WorldDagLayoutNodeSize,
  type WorldDagLayoutOrientation,
  type WorldDagLayoutPlaceOverride,
  type WorldDagLayoutStrategy,
  type WorldDagLayoutTarget,
} from "./world-dag-layout.ts";
import {
  type WorldForceAnchor,
  type WorldForceEdge,
  type WorldForceNode,
  type WorldForceScene,
  worldForceNodePreferredRadiusMeters,
} from "./world-force-simulation.ts";
import {
  WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  worldNodeFootprintRadiusPx,
  worldPlaceFootprintRadiusPx,
} from "./world-graph-style.ts";

export interface WorldForceScenePolicy {
  readonly baseMass: number;
  readonly visualWeightMassScale: number;
  readonly baseCollisionRadiusMeters: number;
  readonly edgeStrength: number;
  readonly edgeRestLengthMeters: number;
  readonly anchorInfluenceScale: number;
}

export interface WorldForceSceneBuildOptions {
  /**
   * Recompute local d3-dag targets without cached stability hysteresis.
   * Anchors remain geographic constraints and never become force nodes.
   */
  readonly reorganizeDag?: boolean;
  /** Reorganize only one selected authored place, leaving other cached layouts intact. */
  readonly reorganizeDagPlaceId?: PlaceId;
  /** Structural flow direction selected from the current world viewport shape. */
  readonly dagOrientation?: WorldDagLayoutOrientation;
  readonly dagAlgorithm?: WorldDagLayoutAlgorithm;
  readonly dagStrategy?: WorldDagLayoutStrategy;
  readonly dagCoordinate?: WorldDagCoordinateStrategy;
  readonly dagEdgeStyle?: WorldDagEdgeStyle;
  readonly dagPlaceOverrides?: ReadonlyMap<PlaceId, WorldDagLayoutPlaceOverride>;
  /**
   * Optional continuity-preserving starting pose. Canonical/new projection
   * data still owns force targets, anchors, weights, topology, and DAG goals.
   */
  readonly initialProjection?: WorldProjection;
}

/**
 * Physical graph spacing is deliberately independent from screen marker scale.
 * Compact markers must not collapse the force layout or DAG target geometry.
 */
const WORLD_FORCE_LAYOUT_SCALE = 2;
/** Nodes with one or two incident relationships keep only their physical footprint. */
const CONNECTIVITY_CLEARANCE_FREE_DEGREE = 2;
/** Square-root growth gives hubs more room without allowing degree to explode layout size. */
const CONNECTIVITY_CLEARANCE_SQRT_SCALE = 0.35;
/** Connectivity may at most add 1.5 physical radii of preferred clearance. */
const CONNECTIVITY_CLEARANCE_MAX_RADIUS_SCALE = 1.5;

export const DEFAULT_WORLD_FORCE_SCENE_POLICY: WorldForceScenePolicy = Object.freeze({
  baseMass: 1,
  visualWeightMassScale: 1,
  baseCollisionRadiusMeters: 180 * WORLD_FORCE_LAYOUT_SCALE,
  edgeStrength: 0.035,
  edgeRestLengthMeters: 900 * WORLD_FORCE_LAYOUT_SCALE,
  anchorInfluenceScale: 0.75,
});

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number.`);
  }
  return value;
}

function connectivityDegreeByInstance(
  projection: WorldProjection,
): ReadonlyMap<ProjectedWorldInstance["id"], number> {
  const degree = new Map<ProjectedWorldInstance["id"], number>(
    projection.instances.map((instance) => [instance.id, 0]),
  );

  for (const edge of projection.edges) {
    if (edge.sourceInstanceId === edge.targetInstanceId) continue;
    if (degree.has(edge.sourceInstanceId)) {
      degree.set(edge.sourceInstanceId, (degree.get(edge.sourceInstanceId) ?? 0) + 1);
    }
    if (degree.has(edge.targetInstanceId)) {
      degree.set(edge.targetInstanceId, (degree.get(edge.targetInstanceId) ?? 0) + 1);
    }
  }

  return degree;
}

function connectivityClearanceMeters(collisionRadiusMeters: number, degree: number): number {
  const excessDegree = Math.max(0, degree - CONNECTIVITY_CLEARANCE_FREE_DEGREE);
  if (excessDegree === 0) return 0;
  const scale = Math.min(
    CONNECTIVITY_CLEARANCE_MAX_RADIUS_SCALE,
    Math.sqrt(excessDegree) * CONNECTIVITY_CLEARANCE_SQRT_SCALE,
  );
  return collisionRadiusMeters * scale;
}

function validatePolicy(policy: WorldForceScenePolicy): WorldForceScenePolicy {
  return Object.freeze({
    baseMass: finitePositive(policy.baseMass, "World force base mass"),
    visualWeightMassScale: finiteNonNegative(
      policy.visualWeightMassScale,
      "World force visual-weight mass scale",
    ),
    baseCollisionRadiusMeters: finitePositive(
      policy.baseCollisionRadiusMeters,
      "World force collision radius",
    ),
    edgeStrength: finiteNonNegative(policy.edgeStrength, "World force edge strength"),
    edgeRestLengthMeters: finitePositive(
      policy.edgeRestLengthMeters,
      "World force edge rest length",
    ),
    anchorInfluenceScale: finiteNonNegative(
      policy.anchorInfluenceScale,
      "World force anchor influence scale",
    ),
  });
}

function nodeFromInstance(
  instance: ProjectedWorldInstance,
  policy: WorldForceScenePolicy,
  connectivityDegree: number,
  initialInstance: ProjectedWorldInstance = instance,
): WorldForceNode {
  const styleInput = {
    ...(instance.kind === undefined ? {} : { type: instance.kind }),
    attributes: instance.style ? { style: instance.style } : undefined,
    visualWeight: instance.visualWeight,
  };
  const collisionRadiusPx = worldNodeFootprintRadiusPx(styleInput);
  const collisionRadiusMeters =
    policy.baseCollisionRadiusMeters * (collisionRadiusPx / WORLD_ENTITY_MIN_HIT_RADIUS_PX);
  return Object.freeze({
    id: instance.id,
    canonicalId: instance.canonicalId,
    mass: policy.baseMass + instance.visualWeight * policy.visualWeightMassScale,
    collisionRadiusPx,
    collisionRadiusMeters,
    connectivityDegree,
    connectivityClearanceMeters: connectivityClearanceMeters(
      collisionRadiusMeters,
      connectivityDegree,
    ),
    initialEastMeters: initialInstance.localOffset?.eastMeters ?? 0,
    initialNorthMeters: initialInstance.localOffset?.northMeters ?? 0,
    initialVisualAltitudeMeters: initialInstance.visualAltitude ?? 0,
    targetVisualAltitudeMeters: instance.visualAltitude ?? 0,
  });
}

function anchorsFromInstance(
  instance: ProjectedWorldInstance,
  policy: WorldForceScenePolicy,
): readonly WorldForceAnchor[] {
  return Object.freeze(
    instance.geographicAnchors
      .map((anchor) =>
        Object.freeze({
          instanceId: instance.id,
          placeId: anchor.placeId,
          longitude: anchor.longitude,
          latitude: anchor.latitude,
          sourceAltitudeMeters: anchor.sourceAltitude ?? 0,
          influence:
            anchor.influence *
            policy.anchorInfluenceScale *
            Math.max(0, Math.min(1, instance.temporalWeight)),
          precisionRadiusMeters: anchor.precisionRadiusMeters ?? 0,
        }),
      )
      .sort(
        (left, right) =>
          String(left.instanceId).localeCompare(String(right.instanceId)) ||
          String(left.placeId).localeCompare(String(right.placeId)),
      ),
  );
}

export function createWorldForceScene(
  projection: WorldProjection,
  inputPolicy: WorldForceScenePolicy = DEFAULT_WORLD_FORCE_SCENE_POLICY,
  options: WorldForceSceneBuildOptions = {},
): WorldForceScene {
  const policy = validatePolicy(inputPolicy);
  const initialInstances = new Map(
    (options.initialProjection?.instances ?? projection.instances).map(
      (instance) => [instance.id, instance] as const,
    ),
  );

  const connectivityDegrees = connectivityDegreeByInstance(projection);
  const baseNodes = projection.instances.map((instance) =>
    nodeFromInstance(
      instance,
      policy,
      connectivityDegrees.get(instance.id) ?? 0,
      initialInstances.get(instance.id) ?? instance,
    ),
  );
  const nodeSizes = new Map(
    baseNodes.map(
      (node) =>
        [
          node.id,
          Object.freeze({
            widthMeters: worldForceNodePreferredRadiusMeters(node) * 2,
            heightMeters: worldForceNodePreferredRadiusMeters(node) * 2,
          }),
        ] as const,
    ),
  );
  const placeSizes = new Map<PlaceId, WorldDagLayoutNodeSize>();
  for (const instance of projection.instances) {
    for (const anchor of instance.geographicAnchors) {
      const footprintPx = worldPlaceFootprintRadiusPx(anchor.style);
      const radiusMeters =
        policy.baseCollisionRadiusMeters * (footprintPx / WORLD_ENTITY_MIN_HIT_RADIUS_PX);
      const diameterMeters = radiusMeters * 2;
      const previous = placeSizes.get(anchor.placeId);
      if (!previous || previous.widthMeters < diameterMeters) {
        placeSizes.set(
          anchor.placeId,
          Object.freeze({
            widthMeters: diameterMeters,
            heightMeters: diameterMeters,
          }),
        );
      }
    }
  }

  const dagLayout = createWorldDagLayout(projection, {
    nodeSizes,
    placeSizes,
    orientation: options.dagOrientation ?? "top-to-bottom",
    algorithm: options.dagAlgorithm ?? "sugiyama",
    strategy: options.dagStrategy ?? "auto",
    coordinate: options.dagCoordinate ?? "greedy",
    edgeStyle: options.dagEdgeStyle ?? "routed",
    placeOverrides: options.dagPlaceOverrides,
    reorganize: options.reorganizeDag === true,
    reorganizePlaceId: options.reorganizeDagPlaceId,
  });
  const dagTargets = new Map(
    dagLayout.targets.map((target) => [target.instanceId, target] as const),
  );
  const nodes: WorldForceNode[] = baseNodes.map((node) => {
    const dagTarget: WorldDagLayoutTarget | undefined = dagTargets.get(node.id);
    return dagTarget
      ? Object.freeze({
          ...node,
          layoutTargetEastMeters: dagTarget.eastMeters,
          layoutTargetNorthMeters: dagTarget.northMeters,
          layoutTargetStrength: WORLD_DAG_TARGET_STRENGTH,
        })
      : node;
  });

  const edges: WorldForceEdge[] = projection.edges.map((edge) =>
    Object.freeze({
      id: edge.id,
      sourceId: edge.sourceInstanceId,
      targetId: edge.targetInstanceId,
      strength: policy.edgeStrength * Math.max(0, Math.min(1, edge.temporalWeight)),
      restLengthMeters: policy.edgeRestLengthMeters,
    }),
  );

  const anchors = projection.instances.flatMap((instance) => anchorsFromInstance(instance, policy));

  return Object.freeze({
    nodes: Object.freeze(
      [...nodes].sort((left, right) => String(left.id).localeCompare(String(right.id))),
    ),
    edges: Object.freeze(
      [...edges].sort(
        (left, right) =>
          String(left.id).localeCompare(String(right.id)) ||
          String(left.sourceId).localeCompare(String(right.sourceId)) ||
          String(left.targetId).localeCompare(String(right.targetId)),
      ),
    ),
    anchors: Object.freeze(anchors),
    relationshipRoutes: dagLayout.routes,
  });
}

/**
 * graph-layers D3ForceLayout currently accepts one scalar collision radius
 * per layout. Use the largest exact rendered footprint in the component so
 * no node receives a smaller force body than its visible marker.
 */
export function worldForceComponentCollisionRadiusPx(nodes: readonly WorldForceNode[]): number {
  return nodes.reduce(
    (radius, node) => Math.max(radius, node.collisionRadiusPx),
    WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  );
}
