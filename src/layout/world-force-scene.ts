import type { ProjectedWorldInstance, WorldProjection } from "../projection/world-projection.ts";
import type {
  WorldForceAnchor,
  WorldForceEdge,
  WorldForceNode,
  WorldForceScene,
} from "./world-force-simulation.ts";

export interface WorldForceScenePolicy {
  readonly baseMass: number;
  readonly visualWeightMassScale: number;
  readonly baseCollisionRadiusMeters: number;
  readonly edgeStrength: number;
  readonly edgeRestLengthMeters: number;
  readonly anchorInfluenceScale: number;
}

export const DEFAULT_WORLD_FORCE_SCENE_POLICY: WorldForceScenePolicy = Object.freeze({
  baseMass: 1,
  visualWeightMassScale: 1,
  baseCollisionRadiusMeters: 6_000,
  edgeStrength: 0.08,
  edgeRestLengthMeters: 18_000,
  anchorInfluenceScale: 1,
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
): WorldForceNode {
  return Object.freeze({
    id: instance.id,
    canonicalId: instance.canonicalId,
    mass: policy.baseMass + instance.visualWeight * policy.visualWeightMassScale,
    collisionRadiusMeters:
      policy.baseCollisionRadiusMeters * (0.75 + instance.visualWeight * 0.5),
    initialEastMeters: instance.localOffset?.eastMeters ?? 0,
    initialNorthMeters: instance.localOffset?.northMeters ?? 0,
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
): WorldForceScene {
  const policy = validatePolicy(inputPolicy);

  const nodes: WorldForceNode[] = projection.instances.map((instance) =>
    nodeFromInstance(instance, policy),
  );

  const edges: WorldForceEdge[] = projection.edges.map((edge) =>
    Object.freeze({
      id: edge.id,
      sourceId: edge.sourceInstanceId,
      targetId: edge.targetInstanceId,
      strength: policy.edgeStrength * Math.max(0, Math.min(1, edge.temporalWeight)),
      restLengthMeters: policy.edgeRestLengthMeters,
    }),
  );

  const anchors = projection.instances.flatMap((instance) =>
    anchorsFromInstance(instance, policy),
  );

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
  });
}
