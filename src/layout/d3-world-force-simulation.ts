/// <reference path="../types/d3-force.d.ts" />

import {
  type ForceLink,
  type ForceX,
  type ForceY,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { PlaceId } from "../domain/ids.ts";
import type { WorldInstanceId } from "../projection/world-projection.ts";
import {
  type WorldForceAnchor,
  type WorldForceEdge,
  type WorldForceNode,
  type WorldForcePin,
  type WorldForceScene,
  type WorldForceSimulationBackend,
  type WorldForceTuning,
  type WorldForceTuningScope,
  type WorldSimulationDiagnostics,
  type WorldSimulationRequest,
} from "./world-force-simulation.ts";

const NORMAL_MANY_BODY_STRENGTH = -2_600;
const COLLAPSE_MANY_BODY_STRENGTH = -1_400;
const NORMAL_ANCHOR_STRENGTH = 0.006;
const COLLAPSE_ANCHOR_STRENGTH = 0.08;
const COLLISION_STRENGTH = 0.82;
const COLLISION_ITERATIONS = 3;
const CONNECTIVITY_SPACING_STRENGTH = 0.35;

export const DEFAULT_D3_WORLD_FORCE_TUNING: WorldForceTuning = Object.freeze({
  centerStrength: 0,
  centerEastMeters: 0,
  centerNorthMeters: 0,
  collisionStrength: COLLISION_STRENGTH,
  collisionIterations: COLLISION_ITERATIONS,
  connectivityClearanceScale: 1,
  manyBodyStrength: NORMAL_MANY_BODY_STRENGTH,
  linkStrengthScale: 1,
  linkDistanceScale: 1,
  linkIterations: 1,
  anchorStrengthScale: 1,
  dagStrengthScale: 1,
});
const CONNECTIVITY_SPACING_ITERATIONS = 2;
const ALTITUDE_STRENGTH = 0.06;
const ALTITUDE_DAMPING = 0.82;
const DEFAULT_ALPHA = 0.14;
const ALPHA_MIN = 0.003;
const ALPHA_DECAY = 0.018;
/** Match the reference solver's bounded long-link interaction contract. */
const INTERACTION_EDGE_MAX_STRETCH_SCALE = 8;
/** Bound post-drop target error so a distant release cannot inject a one-frame force spike. */
const INTERACTION_FORCE_MAX_ERROR_METERS = 6_000;
const DRAG_MOVE_ALPHA_FLOOR = 0.04;
/**
 * A committed temporal re-anchor can preserve a visible pose far from its new
 * place. This temporary alpha-independent force returns that survivor to local
 * graph scale, then releases so ordinary anchor/DAG/link forces own equilibrium.
 */
const PROJECTION_HANDOFF_FORCE_STRENGTH = 0.03;
const PROJECTION_HANDOFF_RELEASE_ERROR_METERS = 1_000;
const CROSS_PLACE_INTERACTION_TICKS = 3;
const EARTH_RADIUS_METERS = 6_371_008.8;
const POLAR_COSINE_EPSILON = 1e-9;

interface D3WorldNodeState extends SimulationNodeDatum {
  readonly id: WorldInstanceId;
  readonly node: WorldForceNode;
  readonly group: string;
  readonly placeId: PlaceId | null;
  readonly anchor: WorldForceAnchor | null;
  projectionHandoff: boolean;
  z: number;
  vz: number;
}

interface D3WorldLink extends SimulationLinkDatum<D3WorldNodeState> {
  readonly edge: WorldForceEdge;
}

interface D3CrossPlaceInteractionProbe extends SimulationNodeDatum {
  readonly state: D3WorldNodeState;
  readonly tuning: WorldForceTuning;
  readonly collisionRadiusMeters: number;
  readonly preferredRadiusMeters: number;
}

interface D3WorldGroup {
  readonly key: string;
  readonly placeId: PlaceId | null;
  readonly nodes: readonly D3WorldNodeState[];
  readonly maximumRadiusMeters: number;
  readonly tuning: WorldForceTuning;
  readonly linkForce: ForceLink<D3WorldNodeState, D3WorldLink> | null;
  readonly anchorXForce: ForceX<D3WorldNodeState>;
  readonly anchorYForce: ForceY<D3WorldNodeState>;
  readonly dagXForce: ForceX<D3WorldNodeState>;
  readonly dagYForce: ForceY<D3WorldNodeState>;
  readonly simulation: Simulation<D3WorldNodeState, SimulationLinkDatum<D3WorldNodeState>>;
}

interface D3WorldGroupBounds {
  readonly group: D3WorldGroup;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface D3WorldForcePosition {
  readonly instanceId: WorldInstanceId;
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededOffset(id: WorldInstanceId): readonly [number, number] {
  const hash = stableHash(String(id));
  const angle = ((hash % 3600) / 3600) * Math.PI * 2;
  const radius = 40 + ((hash >>> 12) % 120);
  return Object.freeze([Math.cos(angle) * radius, Math.sin(angle) * radius]);
}

function primaryAnchor(
  instanceId: WorldInstanceId,
  anchors: readonly WorldForceAnchor[],
): WorldForceAnchor | null {
  return (
    anchors
      .filter((anchor) => anchor.instanceId === instanceId)
      .sort(
        (left, right) =>
          right.influence - left.influence ||
          String(left.placeId).localeCompare(String(right.placeId)),
      )[0] ?? null
  );
}

function groupKey(anchor: WorldForceAnchor | null): string {
  return anchor ? `place:${String(anchor.placeId)}` : "unplaced";
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}

function wrapLongitude(value: number): number {
  if (value >= -180 && value <= 180) return Object.is(value, -0) ? 0 : value;
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function shortestLongitudeDelta(from: number, to: number): number {
  return wrapLongitude(to - from);
}

function geographicPosition(
  state: D3WorldNodeState,
): readonly [longitude: number, latitude: number] | null {
  const anchor = state.anchor;
  if (!anchor) return null;

  const northMeters = state.y ?? 0;
  const latitude = Math.max(
    -90,
    Math.min(90, anchor.latitude + degrees(northMeters / EARTH_RADIUS_METERS)),
  );
  const cosine = Math.cos(radians(anchor.latitude));
  const longitudeDelta =
    Math.abs(cosine) <= POLAR_COSINE_EPSILON
      ? 0
      : degrees((state.x ?? 0) / (EARTH_RADIUS_METERS * cosine));

  return Object.freeze([wrapLongitude(anchor.longitude + longitudeDelta), latitude]);
}

function surfaceDistanceMeters(
  left: readonly [number, number],
  right: readonly [number, number],
): number {
  const leftLatitude = radians(left[1]);
  const rightLatitude = radians(right[1]);
  const deltaLatitude = rightLatitude - leftLatitude;
  const deltaLongitude = radians(shortestLongitudeDelta(left[0], right[0]));
  const sinLatitude = Math.sin(deltaLatitude / 2);
  const sinLongitude = Math.sin(deltaLongitude / 2);
  const a =
    sinLatitude * sinLatitude +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * sinLongitude * sinLongitude;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(Math.max(0, a))));
}

function tangentOffsetMeters(
  origin: readonly [number, number],
  position: readonly [number, number],
): readonly [eastMeters: number, northMeters: number] {
  const meanLatitude = radians((origin[1] + position[1]) / 2);
  return Object.freeze([
    radians(shortestLongitudeDelta(origin[0], position[0])) *
      EARTH_RADIUS_METERS *
      Math.cos(meanLatitude),
    radians(position[1] - origin[1]) * EARTH_RADIUS_METERS,
  ]);
}

function geographicFromTangentOffset(
  origin: readonly [number, number],
  eastMeters: number,
  northMeters: number,
): readonly [longitude: number, latitude: number] {
  const latitude = Math.max(
    -90,
    Math.min(90, origin[1] + degrees(northMeters / EARTH_RADIUS_METERS)),
  );
  const cosine = Math.cos(radians(origin[1]));
  const longitudeDelta =
    Math.abs(cosine) <= POLAR_COSINE_EPSILON
      ? 0
      : degrees(eastMeters / (EARTH_RADIUS_METERS * cosine));
  return Object.freeze([wrapLongitude(origin[0] + longitudeDelta), latitude]);
}

function stateNeighborhoodRadiusMeters(
  state: D3WorldNodeState,
  tuning: WorldForceTuning,
): number {
  const collisionRadius = Math.max(1, tunedPreferredRadiusMeters(state.node, tuning));
  const precisionRadius = Math.max(0, state.anchor?.precisionRadiusMeters ?? 0);
  const targetEast = state.node.layoutTargetEastMeters ?? 0;
  const targetNorth = state.node.layoutTargetNorthMeters ?? 0;
  const targetRadius = Math.hypot(targetEast, targetNorth) + collisionRadius * 2;
  return Math.max(collisionRadius * 8, precisionRadius, targetRadius);
}

function pairNeighborhoodRadiusMeters(
  left: D3WorldNodeState,
  right: D3WorldNodeState,
  leftTuning: WorldForceTuning,
  rightTuning: WorldForceTuning,
): number {
  return (
    stateNeighborhoodRadiusMeters(left, leftTuning) +
    stateNeighborhoodRadiusMeters(right, rightTuning)
  );
}

function surfaceCartesianMeters(
  position: readonly [longitude: number, latitude: number],
): readonly [x: number, y: number, z: number] {
  const longitude = radians(position[0]);
  const latitude = radians(position[1]);
  const cosine = Math.cos(latitude);
  return Object.freeze([
    EARTH_RADIUS_METERS * cosine * Math.cos(longitude),
    EARTH_RADIUS_METERS * cosine * Math.sin(longitude),
    EARTH_RADIUS_METERS * Math.sin(latitude),
  ]);
}

function crossPlaceGroupBounds(group: D3WorldGroup): D3WorldGroupBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let paddingMeters = 0;
  let bounded = false;

  for (const state of group.nodes) {
    const position = geographicPosition(state);
    if (!position) continue;
    const [x, y, z] = surfaceCartesianMeters(position);
    bounded = true;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
    paddingMeters = Math.max(
      paddingMeters,
      stateNeighborhoodRadiusMeters(state, group.tuning),
      tunedPreferredRadiusMeters(state.node, group.tuning) * 4,
    );
  }

  if (!bounded) return null;
  return Object.freeze({
    group,
    minX: minX - paddingMeters,
    maxX: maxX + paddingMeters,
    minY: minY - paddingMeters,
    maxY: maxY + paddingMeters,
    minZ: minZ - paddingMeters,
    maxZ: maxZ + paddingMeters,
  });
}

function crossPlaceBoundsOverlap(left: D3WorldGroupBounds, right: D3WorldGroupBounds): boolean {
  return (
    left.minX <= right.maxX &&
    right.minX <= left.maxX &&
    left.minY <= right.maxY &&
    right.minY <= left.maxY &&
    left.minZ <= right.maxZ &&
    right.minZ <= left.maxZ
  );
}

function crossPlaceGroupPairs(
  groups: readonly D3WorldGroup[],
): readonly (readonly [D3WorldGroup, D3WorldGroup])[] {
  const bounds = groups
    .flatMap((group) => {
      const entry = crossPlaceGroupBounds(group);
      return entry ? [entry] : [];
    })
    .sort((left, right) => left.minX - right.minX || left.group.key.localeCompare(right.group.key));
  const active: D3WorldGroupBounds[] = [];
  const pairs: Array<readonly [D3WorldGroup, D3WorldGroup]> = [];

  for (const current of bounds) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const candidate = active[index];
      if (candidate && candidate.maxX < current.minX) active.splice(index, 1);
    }

    for (const other of active) {
      if (crossPlaceBoundsOverlap(other, current)) {
        pairs.push(Object.freeze([other.group, current.group]));
      }
    }
    active.push(current);
  }

  return Object.freeze(pairs);
}

function localOffsetForGeographicPosition(
  anchor: WorldForceAnchor,
  position: readonly [number, number],
): readonly [eastMeters: number, northMeters: number] {
  const cosine = Math.cos(radians(anchor.latitude));
  const eastMeters =
    Math.abs(cosine) <= POLAR_COSINE_EPSILON
      ? 0
      : radians(shortestLongitudeDelta(anchor.longitude, position[0])) *
        EARTH_RADIUS_METERS *
        cosine;
  const northMeters = radians(position[1] - anchor.latitude) * EARTH_RADIUS_METERS;
  return Object.freeze([eastMeters, northMeters]);
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function validatedTuning(tuning: WorldForceTuning): WorldForceTuning {
  const centerStrength = finiteNonNegative(
    tuning.centerStrength ?? DEFAULT_D3_WORLD_FORCE_TUNING.centerStrength ?? 0,
    "Center strength",
  );
  if (centerStrength > 1) throw new Error("Center strength must not exceed 1.");
  const centerEastMeters =
    tuning.centerEastMeters ?? DEFAULT_D3_WORLD_FORCE_TUNING.centerEastMeters ?? 0;
  const centerNorthMeters =
    tuning.centerNorthMeters ?? DEFAULT_D3_WORLD_FORCE_TUNING.centerNorthMeters ?? 0;
  if (!Number.isFinite(centerEastMeters) || !Number.isFinite(centerNorthMeters)) {
    throw new Error("Center coordinates must be finite.");
  }
  const collisionStrength = finiteNonNegative(tuning.collisionStrength, "Collision strength");
  if (collisionStrength > 1) throw new Error("Collision strength must not exceed 1.");
  const collisionIterations = finiteNonNegative(
    tuning.collisionIterations,
    "Collision iterations",
  );
  if (!Number.isInteger(collisionIterations) || collisionIterations < 1 || collisionIterations > 12) {
    throw new Error("Collision iterations must be an integer from 1 to 12.");
  }
  const connectivityClearanceScale = finiteNonNegative(
    tuning.connectivityClearanceScale,
    "Connectivity clearance scale",
  );
  const linkStrengthScale = finiteNonNegative(tuning.linkStrengthScale, "Link strength scale");
  const linkDistanceScale = finiteNonNegative(
    tuning.linkDistanceScale ?? DEFAULT_D3_WORLD_FORCE_TUNING.linkDistanceScale ?? 1,
    "Link distance scale",
  );
  const linkIterations = finiteNonNegative(
    tuning.linkIterations ?? DEFAULT_D3_WORLD_FORCE_TUNING.linkIterations ?? 1,
    "Link iterations",
  );
  if (!Number.isInteger(linkIterations) || linkIterations < 1 || linkIterations > 12) {
    throw new Error("Link iterations must be an integer from 1 to 12.");
  }
  const anchorStrengthScale = finiteNonNegative(
    tuning.anchorStrengthScale,
    "Anchor strength scale",
  );
  const dagStrengthScale = finiteNonNegative(tuning.dagStrengthScale, "DAG strength scale");
  if (!Number.isFinite(tuning.manyBodyStrength)) {
    throw new Error("Many-body strength must be finite.");
  }
  return Object.freeze({
    centerStrength,
    centerEastMeters,
    centerNorthMeters,
    collisionStrength,
    collisionIterations,
    connectivityClearanceScale,
    manyBodyStrength: tuning.manyBodyStrength,
    linkStrengthScale,
    linkDistanceScale,
    linkIterations,
    anchorStrengthScale,
    dagStrengthScale,
  });
}

function tunedPreferredRadiusMeters(node: WorldForceNode, tuning: WorldForceTuning): number {
  return (
    node.collisionRadiusMeters +
    Math.max(0, node.connectivityClearanceMeters ?? 0) * tuning.connectivityClearanceScale
  );
}

function sameStringSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

type D3ProjectionHandoffForce = ((alpha: number) => void) & {
  initialize(nodes: D3WorldNodeState[]): void;
};

function projectionHandoffForce(): D3ProjectionHandoffForce {
  let nodes: D3WorldNodeState[] = [];
  const force = ((_alpha: number) => {
    for (const state of nodes) {
      if (!state.projectionHandoff || !state.anchor) continue;

      const x = state.x ?? 0;
      const y = state.y ?? 0;
      const error = Math.hypot(x, y);
      if (error <= PROJECTION_HANDOFF_RELEASE_ERROR_METERS) {
        state.projectionHandoff = false;
        continue;
      }

      // D3 applies velocity decay and integrates position after all forces run.
      // Keeping this impulse independent of alpha lets a geographic handoff
      // finish within the bounded scheduler run without ever teleporting.
      state.vx = (state.vx ?? 0) - x * PROJECTION_HANDOFF_FORCE_STRENGTH;
      state.vy = (state.vy ?? 0) - y * PROJECTION_HANDOFF_FORCE_STRENGTH;
    }
  }) as D3ProjectionHandoffForce;
  force.initialize = (next) => {
    nodes = next;
  };
  return force;
}

/**
 * Live, frame-stepped D3 force backend.
 *
 * graph-layers' D3ForceLayout worker only publishes final positions after it
 * converges. That is useful for one-shot layout, but it cannot satisfy Lūm's
 * continuity rule without a second renderer interpolation. This adapter uses
 * the same D3 force primitives directly and advances them from the existing
 * world RAF scheduler, so every visible position is a real physics state.
 */
export class D3WorldForceSimulation implements WorldForceSimulationBackend {
  #scene: WorldForceScene = Object.freeze({
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    anchors: Object.freeze([]),
  });
  #states = new Map<WorldInstanceId, D3WorldNodeState>();
  #groups = new Map<string, D3WorldGroup>();
  #clusteredPlaces = new Set<string>();
  #detachedLinkPlaces = new Set<string>();
  #globalTuning: WorldForceTuning = DEFAULT_D3_WORLD_FORCE_TUNING;
  #placeTunings = new Map<string, WorldForceTuning>();
  #pin: WorldForcePin | null = null;
  #interactionInstanceId: WorldInstanceId | null = null;
  #interactionGroupKey: string | null = null;
  #interactionCollisionGroupKeys = new Set<string>();
  #requestReason: WorldSimulationRequest["reason"] = "idle";
  #dirtyStateIds = new Set<WorldInstanceId>();
  #running = false;
  #settled = true;
  #iteration = 0;
  #destroyed = false;

  setScene(scene: WorldForceScene): void {
    this.#assertAlive();
    const previous = this.#states;
    const next = new Map<WorldInstanceId, D3WorldNodeState>();

    for (const node of scene.nodes) {
      const anchor = primaryAnchor(node.id, scene.anchors);
      const group = groupKey(anchor);
      const prior = previous.get(node.id);
      const explicit = node.initialEastMeters !== 0 || node.initialNorthMeters !== 0;
      const sameGroup = prior?.group === group;
      const changedPlaceHandoff = prior !== undefined && !sameGroup && explicit;
      const [seedX, seedY] = explicit
        ? [node.initialEastMeters, node.initialNorthMeters]
        : seededOffset(node.id);

      next.set(node.id, {
        id: node.id,
        node,
        group,
        placeId: anchor?.placeId ?? null,
        anchor,
        projectionHandoff: changedPlaceHandoff,
        x: sameGroup ? (prior.x ?? seedX) : seedX,
        y: sameGroup ? (prior.y ?? seedY) : seedY,
        vx: sameGroup ? (prior.vx ?? 0) : 0,
        vy: sameGroup ? (prior.vy ?? 0) : 0,
        fx: sameGroup ? prior.fx : null,
        fy: sameGroup ? prior.fy : null,
        z: sameGroup
          ? prior.z
          : (node.initialVisualAltitudeMeters ?? node.targetVisualAltitudeMeters),
        vz: sameGroup ? prior.vz : 0,
      });
    }

    this.#scene = scene;
    this.#states = next;
    this.#dirtyStateIds = new Set(next.keys());
    if (this.#pin && !this.#states.has(this.#pin.instanceId)) this.#pin = null;
    if (this.#pin) {
      this.#interactionInstanceId = this.#pin.instanceId;
      this.#interactionGroupKey = this.#states.get(this.#pin.instanceId)?.group ?? null;
    } else {
      if (this.#interactionInstanceId !== null && !this.#states.has(this.#interactionInstanceId)) {
        this.#interactionInstanceId = null;
      }
      if (
        this.#interactionGroupKey !== null &&
        ![...this.#states.values()].some((state) => state.group === this.#interactionGroupKey)
      ) {
        this.#interactionGroupKey = null;
      }
    }
    this.#rebuildGroups(true);
    this.#settled = false;
    this.#iteration = 0;
  }

  setTuning(tuning: WorldForceTuning, scope: WorldForceTuningScope = {}): void {
    this.#assertAlive();
    const validated = validatedTuning(tuning);
    if (scope.placeId === undefined) {
      this.#globalTuning = validated;
    } else {
      this.#placeTunings.set(String(scope.placeId), validated);
    }
    this.#rebuildGroups(true);
    this.#running = true;
    this.#settled = false;
    this.#iteration = 0;
  }

  setPin(pin: WorldForcePin | null): void {
    this.#assertAlive();
    const nextState = pin ? this.#states.get(pin.instanceId) : null;
    if (pin && !nextState) {
      throw new Error(`Cannot pin unknown world instance ${String(pin.instanceId)}.`);
    }

    const previousPin = this.#pin;
    const previousState = previousPin ? this.#states.get(previousPin.instanceId) : null;
    const previousInstanceId = previousPin?.instanceId ?? null;
    const nextInstanceId = pin?.instanceId ?? null;

    if (nextInstanceId !== null && previousInstanceId !== nextInstanceId) {
      this.#interactionCollisionGroupKeys.clear();
    }

    if (previousState && previousInstanceId !== nextInstanceId) {
      previousState.fx = null;
      previousState.fy = null;
    }

    this.#pin = pin ? Object.freeze({ ...pin }) : null;
    if (pin && nextState) {
      const changed =
        nextState.x !== pin.eastMeters ||
        nextState.y !== pin.northMeters ||
        nextState.z !== pin.visualAltitudeMeters;
      nextState.x = pin.eastMeters;
      nextState.y = pin.northMeters;
      nextState.z = pin.visualAltitudeMeters;
      nextState.vx = 0;
      nextState.vy = 0;
      nextState.vz = 0;
      nextState.fx = pin.eastMeters;
      nextState.fy = pin.northMeters;
      if (changed) this.#dirtyStateIds.add(nextState.id);
      this.#interactionInstanceId = nextState.id;
      this.#interactionGroupKey = nextState.group;

      // A pointer update must not reconstruct every D3 simulation. Keep the
      // existing group alive and only ensure a settled group can respond to
      // the new direct-manipulation position.
      const group = this.#groups.get(nextState.group);
      if (group) {
        group.simulation.alpha(Math.max(group.simulation.alpha(), DRAG_MOVE_ALPHA_FLOOR));
      }
      this.#running = true;
    } else if (previousState) {
      // Preserve the released node and group through post-drop settling so
      // nearby foreign-anchor nodes continue participating while remote places
      // remain asleep.
      this.#interactionInstanceId = previousState.id;
      this.#interactionGroupKey = previousState.group;
    }

    if (previousInstanceId !== nextInstanceId) {
      const affectedGroups = new Set(
        [previousState?.group, nextState?.group].filter(
          (groupKey): groupKey is string => typeof groupKey === "string",
        ),
      );
      for (const groupKey of affectedGroups) {
        const group = this.#groups.get(groupKey);
        if (group) this.#refreshGroupForceStrengths(group);
      }
    }

    this.#settled = false;
  }

  setClusteredPlaceIds(
    placeIds: readonly PlaceId[],
    detachedLinkPlaceIds: readonly PlaceId[] = placeIds,
  ): void {
    this.#assertAlive();
    const nextClustered = new Set(placeIds.map(String));
    const nextDetached = new Set(detachedLinkPlaceIds.map(String));
    if (
      sameStringSet(nextClustered, this.#clusteredPlaces) &&
      sameStringSet(nextDetached, this.#detachedLinkPlaces)
    ) {
      return;
    }
    this.#clusteredPlaces = nextClustered;
    this.#detachedLinkPlaces = nextDetached;
    this.#rebuildGroups(true);
    this.#running = true;
    this.#settled = false;
    this.#iteration = 0;
  }

  apply(request: WorldSimulationRequest): void {
    this.#assertAlive();
    finiteNonNegative(request.excitation, "World simulation excitation");

    const interactionReason = request.reason === "drag" || request.reason === "post-drop";
    const previousInteractionGroupKey = this.#interactionGroupKey;
    this.#requestReason = request.reason;

    if (!interactionReason && previousInteractionGroupKey !== null) {
      const previousInteractionGroup = this.#groups.get(previousInteractionGroupKey);
      if (previousInteractionGroup) this.#refreshGroupForceStrengths(previousInteractionGroup);
      if (!this.#pin) {
        this.#interactionInstanceId = null;
        this.#interactionGroupKey = null;
      }
      this.#interactionCollisionGroupKeys.clear();
    }

    if (request.reason === "idle") {
      this.stop();
      this.#settled = true;
      return;
    }

    this.#running = true;
    this.#settled = false;
    const alpha = Math.max(
      request.excitation,
      request.reheat ? DEFAULT_ALPHA : DRAG_MOVE_ALPHA_FLOOR,
    );
    const groups = this.#groupsForRequest(interactionReason);
    for (const group of groups) {
      if (interactionReason) this.#refreshGroupForceStrengths(group);
      group.simulation.alpha(Math.max(group.simulation.alpha(), alpha)).alphaTarget(0);
    }
  }

  stop(): void {
    this.#assertAlive();
    this.#running = false;
    for (const group of this.#groups.values()) group.simulation.stop();
  }

  step(deltaMs: number): void {
    this.#assertAlive();
    if (!this.#running || this.#groups.size === 0) return;
    finiteNonNegative(deltaMs, "D3 world force delta");

    const ticks = Math.max(1, Math.min(2, Math.round(deltaMs / (1000 / 60)) || 1));
    const interactionReason = this.#requestReason === "drag" || this.#requestReason === "post-drop";
    const groups = this.#groupsForRequest(interactionReason);

    let settled = true;
    for (const group of groups) {
      if (interactionReason) this.#refreshGroupForceStrengths(group);
      group.simulation.tick(ticks);
      this.#stepAltitude(group.nodes, ticks);
      for (const state of group.nodes) this.#dirtyStateIds.add(state.id);
      if (group.simulation.alpha() > group.simulation.alphaMin()) settled = false;
    }

    const crossPlaceMoved = interactionReason
      ? this.#stepCrossPlaceInteractionForces()
      : this.#stepCrossPlaceTopologyForces();
    if (crossPlaceMoved) settled = false;

    this.#iteration += ticks;
    this.#settled = settled;
    if (settled) this.#running = false;
  }

  getSnapshot(): readonly D3WorldForcePosition[] {
    this.#assertAlive();
    return Object.freeze(
      [...this.#states.values()]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))
        .map((state) =>
          Object.freeze({
            instanceId: state.id,
            eastMeters: state.x ?? 0,
            northMeters: state.y ?? 0,
            visualAltitudeMeters: state.z,
          }),
        ),
    );
  }

  getChangedSnapshot(): readonly D3WorldForcePosition[] {
    this.#assertAlive();
    const changedIds = [...this.#dirtyStateIds].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
    this.#dirtyStateIds.clear();
    return Object.freeze(
      changedIds.flatMap((instanceId) => {
        const state = this.#states.get(instanceId);
        return state
          ? [
              Object.freeze({
                instanceId: state.id,
                eastMeters: state.x ?? 0,
                northMeters: state.y ?? 0,
                visualAltitudeMeters: state.z,
              }),
            ]
          : [];
      }),
    );
  }

  getDiagnostics(): WorldSimulationDiagnostics {
    this.#assertAlive();
    const alpha =
      this.#groups.size === 0
        ? 0
        : Math.max(...[...this.#groups.values()].map((group) => group.simulation.alpha()));
    return Object.freeze({
      running: this.#running,
      settled: this.#settled,
      energy: alpha,
      iteration: this.#iteration,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    for (const group of this.#groups.values()) group.simulation.stop();
    this.#groups.clear();
    this.#states.clear();
    this.#dirtyStateIds.clear();
    this.#pin = null;
    this.#interactionInstanceId = null;
    this.#interactionGroupKey = null;
    this.#interactionCollisionGroupKeys.clear();
    this.#requestReason = "idle";
    this.#destroyed = true;
  }

  #rebuildGroups(reheat: boolean): void {
    for (const group of this.#groups.values()) group.simulation.stop();

    const grouped = new Map<string, D3WorldNodeState[]>();
    for (const state of this.#states.values()) {
      const bucket = grouped.get(state.group);
      if (bucket) bucket.push(state);
      else grouped.set(state.group, [state]);
    }

    const nextGroups = new Map<string, D3WorldGroup>();
    for (const [key, nodes] of grouped) {
      const placeId = nodes[0]?.placeId ?? null;
      const collapsed = placeId !== null && this.#clusteredPlaces.has(String(placeId));
      const tuning =
        (placeId === null ? undefined : this.#placeTunings.get(String(placeId))) ??
        this.#globalTuning;
      const linksDetached = placeId !== null && this.#detachedLinkPlaces.has(String(placeId));

      const memberIds = new Set(nodes.map((node) => node.id));
      const links: D3WorldLink[] = linksDetached
        ? []
        : this.#scene.edges
            .filter((edge) => memberIds.has(edge.sourceId) && memberIds.has(edge.targetId))
            .map((edge) => ({
              edge,
              source: edge.sourceId,
              target: edge.targetId,
            }));

      const maximumRadius = Math.max(1, ...nodes.map((node) => node.node.collisionRadiusMeters));
      const simulation = forceSimulation<D3WorldNodeState>(nodes as D3WorldNodeState[])
        .stop()
        .alphaMin(ALPHA_MIN)
        .alphaDecay(ALPHA_DECAY)
        .alphaTarget(0);

      const linkForce =
        links.length > 0
          ? forceLink<D3WorldNodeState, D3WorldLink>(links)
              .id((node) => node.id)
              .distance((link) =>
                Math.max(
                  link.edge.restLengthMeters * (tuning.linkDistanceScale ?? 1),
                  maximumRadius * 2,
                ),
              )
              .strength((link) => this.#linkStrength(key, maximumRadius, link, tuning))
              .iterations(tuning.linkIterations ?? 1)
          : null;
      simulation.force("link", linkForce);
      simulation.force(
        "center",
        forceCenter<D3WorldNodeState>(
          tuning.centerEastMeters ?? 0,
          tuning.centerNorthMeters ?? 0,
        ).strength(tuning.centerStrength ?? 0),
      );

      simulation.force(
        "charge",
        forceManyBody<D3WorldNodeState>()
          .strength(collapsed ? COLLAPSE_MANY_BODY_STRENGTH : tuning.manyBodyStrength)
          .distanceMin(maximumRadius),
      );
      simulation.force(
        "collision",
        forceCollide<D3WorldNodeState>()
          .radius((node) => node.node.collisionRadiusMeters)
          .strength(tuning.collisionStrength)
          .iterations(tuning.collisionIterations),
      );

      const hasConnectivityClearance = nodes.some(
        (state) => (state.node.connectivityClearanceMeters ?? 0) > 0,
      );
      simulation.force(
        "connectivity-spacing",
        !collapsed && hasConnectivityClearance
          ? forceCollide<D3WorldNodeState>()
              .radius((state) => tunedPreferredRadiusMeters(state.node, tuning))
              .strength(CONNECTIVITY_SPACING_STRENGTH)
              .iterations(CONNECTIVITY_SPACING_ITERATIONS)
          : null,
      );

      const anchorXForce = forceX<D3WorldNodeState>(0).strength((node) =>
        this.#anchorStrength(key, collapsed, node, tuning),
      );
      const anchorYForce = forceY<D3WorldNodeState>(0).strength((node) =>
        this.#anchorStrength(key, collapsed, node, tuning),
      );
      simulation.force("anchor-x", anchorXForce);
      simulation.force("anchor-y", anchorYForce);
      simulation.force("projection-handoff", projectionHandoffForce());

      // Preserve the current d3-dag organizational targets as soft forces.
      // They guide expanded topology without snapping and are disabled while
      // the place is collapsing into its geographic anchor.
      const dagXForce = forceX<D3WorldNodeState>(
        (state) => state.node.layoutTargetEastMeters ?? state.x ?? 0,
      ).strength((state) => this.#dagStrength(key, collapsed, state, tuning));
      const dagYForce = forceY<D3WorldNodeState>(
        (state) => state.node.layoutTargetNorthMeters ?? state.y ?? 0,
      ).strength((state) => this.#dagStrength(key, collapsed, state, tuning));
      simulation.force("dag-x", dagXForce);
      simulation.force("dag-y", dagYForce);

      if (reheat) simulation.alpha(DEFAULT_ALPHA);
      nextGroups.set(
        key,
        Object.freeze({
          key,
          placeId,
          nodes: Object.freeze(nodes),
          maximumRadiusMeters: maximumRadius,
          tuning,
          linkForce,
          anchorXForce,
          anchorYForce,
          dagXForce,
          dagYForce,
          simulation,
        }),
      );
    }

    this.#groups = nextGroups;
    this.#interactionCollisionGroupKeys = new Set(
      [...this.#interactionCollisionGroupKeys].filter((groupKey) => nextGroups.has(groupKey)),
    );
  }

  #groupsForRequest(interactionReason: boolean): D3WorldGroup[] {
    if (!interactionReason || this.#interactionGroupKey === null) {
      return [...this.#groups.values()];
    }

    const keys = new Set([this.#interactionGroupKey, ...this.#interactionCollisionGroupKeys]);
    return [...keys].flatMap((groupKey) => {
      const group = this.#groups.get(groupKey);
      return group ? [group] : [];
    });
  }

  #stepCrossPlaceTopologyForces(): boolean {
    let moved = false;
    for (const [leftGroup, rightGroup] of crossPlaceGroupPairs([...this.#groups.values()])) {
      const alpha = Math.max(leftGroup.simulation.alpha(), rightGroup.simulation.alpha());
      const alphaMin = Math.max(leftGroup.simulation.alphaMin(), rightGroup.simulation.alphaMin());
      if (alpha <= alphaMin) continue;

      for (const left of leftGroup.nodes) {
        if (!left.anchor) continue;
        for (const right of rightGroup.nodes) {
          if (!right.anchor) continue;
          if (this.#stepCrossPlacePairForces(left, right, alpha) === false) continue;
          moved = true;
        }
      }
    }
    return moved;
  }

  #stepCrossPlacePairForces(
    left: D3WorldNodeState,
    right: D3WorldNodeState,
    alpha: number,
  ): boolean {
    const leftPosition = geographicPosition(left);
    const rightPosition = geographicPosition(right);
    if (!leftPosition || !rightPosition) return false;

    const leftTuning = this.#tuningForState(left);
    const rightTuning = this.#tuningForState(right);
    const collisionDistance =
      left.node.collisionRadiusMeters + right.node.collisionRadiusMeters;
    const preferredDistance =
      tunedPreferredRadiusMeters(left.node, leftTuning) +
      tunedPreferredRadiusMeters(right.node, rightTuning);
    const interactionDistance = Math.max(
      collisionDistance * 4,
      preferredDistance * 4,
      pairNeighborhoodRadiusMeters(left, right, leftTuning, rightTuning),
    );
    if (surfaceDistanceMeters(leftPosition, rightPosition) > interactionDistance) return false;

    const [rightEast, rightNorth] = tangentOffsetMeters(leftPosition, rightPosition);
    const pinLeft = this.#pin?.instanceId === left.id;
    const pinRight = this.#pin?.instanceId === right.id;
    const probes: D3CrossPlaceInteractionProbe[] = [
      {
        state: left,
        tuning: leftTuning,
        collisionRadiusMeters: left.node.collisionRadiusMeters,
        preferredRadiusMeters: tunedPreferredRadiusMeters(left.node, leftTuning),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ...(pinLeft ? { fx: 0, fy: 0 } : {}),
      },
      {
        state: right,
        tuning: rightTuning,
        collisionRadiusMeters: right.node.collisionRadiusMeters,
        preferredRadiusMeters: tunedPreferredRadiusMeters(right.node, rightTuning),
        x: rightEast,
        y: rightNorth,
        vx: 0,
        vy: 0,
        ...(pinRight ? { fx: rightEast, fy: rightNorth } : {}),
      },
    ];

    const pairSimulation = forceSimulation<D3CrossPlaceInteractionProbe>(probes)
      .stop()
      .alpha(alpha)
      .alphaMin(ALPHA_MIN)
      .alphaDecay(ALPHA_DECAY)
      .alphaTarget(0);
    pairSimulation.force(
      "charge",
      forceManyBody<D3CrossPlaceInteractionProbe>()
        .strength((probe) => probe.tuning.manyBodyStrength)
        .distanceMin(
          Math.max(1, Math.min(left.node.collisionRadiusMeters, right.node.collisionRadiusMeters)),
        )
        .distanceMax(interactionDistance),
    );
    pairSimulation.force(
      "collision",
      forceCollide<D3CrossPlaceInteractionProbe>()
        .radius((probe) => probe.collisionRadiusMeters)
        .strength(Math.max(leftTuning.collisionStrength, rightTuning.collisionStrength))
        .iterations(Math.max(leftTuning.collisionIterations, rightTuning.collisionIterations)),
    );
    if (preferredDistance > collisionDistance) {
      pairSimulation.force(
        "connectivity-spacing",
        forceCollide<D3CrossPlaceInteractionProbe>()
          .radius((probe) => probe.preferredRadiusMeters)
          .strength(CONNECTIVITY_SPACING_STRENGTH)
          .iterations(CONNECTIVITY_SPACING_ITERATIONS),
      );
    }
    pairSimulation.tick(CROSS_PLACE_INTERACTION_TICKS);
    pairSimulation.stop();

    let moved = false;
    for (let index = 0; index < probes.length; index += 1) {
      const probe = probes[index];
      if (!probe || (index === 0 ? pinLeft : pinRight) || !probe.state.anchor) continue;
      const beforeEast = index === 0 ? 0 : rightEast;
      const beforeNorth = index === 0 ? 0 : rightNorth;
      const nextEast = probe.x ?? beforeEast;
      const nextNorth = probe.y ?? beforeNorth;
      if (
        Math.abs(nextEast - beforeEast) <= Number.EPSILON &&
        Math.abs(nextNorth - beforeNorth) <= Number.EPSILON
      ) {
        continue;
      }

      const nextGeographic = geographicFromTangentOffset(leftPosition, nextEast, nextNorth);
      const [localEast, localNorth] = localOffsetForGeographicPosition(
        probe.state.anchor,
        nextGeographic,
      );
      probe.state.x = localEast;
      probe.state.y = localNorth;
      probe.state.vx = 0;
      probe.state.vy = 0;
      this.#dirtyStateIds.add(probe.state.id);

      moved = true;
    }

    return moved;
  }

  #stepCrossPlaceInteractionForces(): boolean {
    const interactionId = this.#pin?.instanceId ?? this.#interactionInstanceId;
    if (!interactionId) return false;
    const focalState = this.#states.get(interactionId);
    if (!focalState?.anchor) return false;
    const focalPosition = geographicPosition(focalState);
    if (!focalPosition) return false;

    const partners = [...this.#states.values()].flatMap((state) => {
      if (state.id === focalState.id || state.group === focalState.group || !state.anchor)
        return [];
      const position = geographicPosition(state);
      if (!position) return [];
      const focalTuning = this.#tuningForState(focalState);
      const stateTuning = this.#tuningForState(state);
      const collisionDistance =
        focalState.node.collisionRadiusMeters + state.node.collisionRadiusMeters;
      const preferredDistance =
        tunedPreferredRadiusMeters(focalState.node, focalTuning) +
        tunedPreferredRadiusMeters(state.node, stateTuning);
      const interactionDistance = Math.max(
        collisionDistance * 4,
        preferredDistance * 4,
        pairNeighborhoodRadiusMeters(focalState, state, focalTuning, stateTuning),
      );
      if (surfaceDistanceMeters(focalPosition, position) > interactionDistance) return [];
      const [eastMeters, northMeters] = tangentOffsetMeters(focalPosition, position);
      return [{ state, tuning: stateTuning, eastMeters, northMeters }];
    });
    if (partners.length === 0) return false;

    const participants = [
      {
        state: focalState,
        tuning: this.#tuningForState(focalState),
        eastMeters: 0,
        northMeters: 0,
      },
      ...partners,
    ];
    const pinFocal = this.#pin?.instanceId === focalState.id;
    const probes: D3CrossPlaceInteractionProbe[] = participants.map(
      ({ state, tuning, eastMeters, northMeters }, index) => ({
        state,
        tuning,
        collisionRadiusMeters: state.node.collisionRadiusMeters,
        preferredRadiusMeters: tunedPreferredRadiusMeters(state.node, tuning),
        x: eastMeters,
        y: northMeters,
        vx: 0,
        vy: 0,
        ...(pinFocal && index === 0 ? { fx: 0, fy: 0 } : {}),
      }),
    );

    const interactionSimulation = forceSimulation<D3CrossPlaceInteractionProbe>(probes)
      .stop()
      .alpha(DEFAULT_ALPHA)
      .alphaMin(ALPHA_MIN)
      .alphaDecay(ALPHA_DECAY)
      .alphaTarget(0);
    const maximumInteractionDistance = Math.max(
      ...participants
        .slice(1)
        .map(({ state, tuning }) =>
          pairNeighborhoodRadiusMeters(
            focalState,
            state,
            participants[0]?.tuning ?? this.#globalTuning,
            tuning,
          ),
        ),
    );
    interactionSimulation.force(
      "charge",
      forceManyBody<D3CrossPlaceInteractionProbe>()
        .strength((probe) => probe.tuning.manyBodyStrength)
        .distanceMin(Math.max(1, Math.min(...probes.map((probe) => probe.collisionRadiusMeters))))
        .distanceMax(maximumInteractionDistance),
    );
    interactionSimulation.force(
      "collision",
      forceCollide<D3CrossPlaceInteractionProbe>()
        .radius((probe) => probe.collisionRadiusMeters)
        .strength(Math.max(...probes.map((probe) => probe.tuning.collisionStrength)))
        .iterations(Math.max(...probes.map((probe) => probe.tuning.collisionIterations))),
    );
    if (probes.some((probe) => probe.preferredRadiusMeters > probe.collisionRadiusMeters)) {
      interactionSimulation.force(
        "connectivity-spacing",
        forceCollide<D3CrossPlaceInteractionProbe>()
          .radius((probe) => probe.preferredRadiusMeters)
          .strength(CONNECTIVITY_SPACING_STRENGTH)
          .iterations(CONNECTIVITY_SPACING_ITERATIONS),
      );
    }
    interactionSimulation.tick(CROSS_PLACE_INTERACTION_TICKS);
    interactionSimulation.stop();

    let moved = false;
    for (let index = pinFocal ? 1 : 0; index < probes.length; index += 1) {
      const probe = probes[index];
      const participant = participants[index];
      if (!probe?.state.anchor || !participant) continue;

      const nextEast = probe.x ?? participant.eastMeters;
      const nextNorth = probe.y ?? participant.northMeters;
      if (
        Math.abs(nextEast - participant.eastMeters) <= Number.EPSILON &&
        Math.abs(nextNorth - participant.northMeters) <= Number.EPSILON
      ) {
        continue;
      }

      const nextGeographic = geographicFromTangentOffset(focalPosition, nextEast, nextNorth);
      const [localEast, localNorth] = localOffsetForGeographicPosition(
        probe.state.anchor,
        nextGeographic,
      );
      probe.state.x = localEast;
      probe.state.y = localNorth;
      probe.state.vx = 0;
      probe.state.vy = 0;
      this.#dirtyStateIds.add(probe.state.id);

      if (probe.state.group !== focalState.group) {
        this.#interactionCollisionGroupKeys.add(probe.state.group);
      }
      const group = this.#groups.get(probe.state.group);
      if (group) {
        group.simulation.alpha(Math.max(group.simulation.alpha(), DRAG_MOVE_ALPHA_FLOOR));
      }
      moved = true;
    }

    return moved;
  }

  #tuningForState(state: D3WorldNodeState): WorldForceTuning {
    return (
      (state.placeId === null ? undefined : this.#placeTunings.get(String(state.placeId))) ??
      this.#globalTuning
    );
  }

  #linkStrength(
    groupKey: string,
    maximumRadiusMeters: number,
    link: D3WorldLink,
    tuning: WorldForceTuning,
  ): number {
    const baseStrength = Math.max(0, link.edge.strength) * tuning.linkStrengthScale;
    const interactionLimited =
      this.#interactionGroupKey === groupKey &&
      (this.#requestReason === "drag" || this.#requestReason === "post-drop");
    if (!interactionLimited || typeof link.source !== "object" || typeof link.target !== "object") {
      return baseStrength;
    }

    const source = link.source;
    const target = link.target;
    const dx = (target.x ?? 0) - (source.x ?? 0);
    const dy = (target.y ?? 0) - (source.y ?? 0);
    const distance = Math.hypot(dx, dy);
    const restLength = Math.max(
      link.edge.restLengthMeters * (tuning.linkDistanceScale ?? 1),
      maximumRadiusMeters * 2,
    );
    const extension = distance - restLength;
    const maximumStretch = Math.max(1, restLength) * INTERACTION_EDGE_MAX_STRETCH_SCALE;
    if (extension <= maximumStretch) return baseStrength;
    return baseStrength * (maximumStretch / extension);
  }

  #anchorStrength(
    groupKey: string,
    collapsed: boolean,
    state: D3WorldNodeState,
    tuning: WorldForceTuning,
  ): number {
    const activePinGroup =
      this.#pin !== null && this.#states.get(this.#pin.instanceId)?.group === groupKey;
    if (activePinGroup || !state.anchor) return 0;

    const baseStrength = collapsed
      ? COLLAPSE_ANCHOR_STRENGTH
      : NORMAL_ANCHOR_STRENGTH *
        tuning.anchorStrengthScale *
        Math.max(0, Math.min(1, state.anchor.influence));
    const postDropLimited =
      this.#requestReason === "post-drop" && this.#interactionGroupKey === groupKey;
    if (!postDropLimited) return baseStrength;

    const error = Math.hypot(state.x ?? 0, state.y ?? 0);
    if (error <= INTERACTION_FORCE_MAX_ERROR_METERS) return baseStrength;
    return baseStrength * (INTERACTION_FORCE_MAX_ERROR_METERS / error);
  }

  #dagStrength(
    groupKey: string,
    collapsed: boolean,
    state: D3WorldNodeState,
    tuning: WorldForceTuning,
  ): number {
    if (collapsed) return 0;
    const baseStrength =
      Math.max(0, state.node.layoutTargetStrength ?? 0) * tuning.dagStrengthScale;
    const postDropLimited =
      this.#requestReason === "post-drop" && this.#interactionGroupKey === groupKey;
    if (!postDropLimited || baseStrength === 0) return baseStrength;

    const targetX = state.node.layoutTargetEastMeters ?? state.x ?? 0;
    const targetY = state.node.layoutTargetNorthMeters ?? state.y ?? 0;
    const error = Math.hypot(targetX - (state.x ?? 0), targetY - (state.y ?? 0));
    if (error <= INTERACTION_FORCE_MAX_ERROR_METERS) return baseStrength;
    return baseStrength * (INTERACTION_FORCE_MAX_ERROR_METERS / error);
  }

  #refreshGroupForceStrengths(group: D3WorldGroup): void {
    if (group.linkForce) {
      group.linkForce.strength((link) =>
        this.#linkStrength(group.key, group.maximumRadiusMeters, link, group.tuning),
      );
    }
    const collapsed = group.placeId !== null && this.#clusteredPlaces.has(String(group.placeId));
    group.anchorXForce.strength((state) =>
      this.#anchorStrength(group.key, collapsed, state, group.tuning),
    );
    group.anchorYForce.strength((state) =>
      this.#anchorStrength(group.key, collapsed, state, group.tuning),
    );
    group.dagXForce.strength((state) =>
      this.#dagStrength(group.key, collapsed, state, group.tuning),
    );
    group.dagYForce.strength((state) =>
      this.#dagStrength(group.key, collapsed, state, group.tuning),
    );
  }

  #stepAltitude(nodes: readonly D3WorldNodeState[], ticks: number): void {
    for (let tick = 0; tick < ticks; tick += 1) {
      for (const state of nodes) {
        if (this.#pin?.instanceId === state.id) {
          state.z = this.#pin.visualAltitudeMeters;
          state.vz = 0;
          continue;
        }
        const collapsed =
          state.placeId !== null && this.#clusteredPlaces.has(String(state.placeId));
        const target = collapsed ? 0 : state.node.targetVisualAltitudeMeters;
        state.vz = (state.vz + (target - state.z) * ALTITUDE_STRENGTH) * ALTITUDE_DAMPING;
        state.z = Math.max(0, state.z + state.vz);
      }
    }
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("D3 world force simulation has been destroyed.");
  }
}
