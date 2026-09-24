/// <reference path="../types/d3-force.d.ts" />

import {
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
import type {
  WorldForceAnchor,
  WorldForceEdge,
  WorldForceNode,
  WorldForcePin,
  WorldForceScene,
  WorldForceSimulationBackend,
  WorldSimulationDiagnostics,
  WorldSimulationRequest,
} from "./world-force-simulation.ts";

export interface ReferenceWorldForceOptions {
  readonly repulsionStrength: number;
  readonly collisionStrength: number;
  readonly anchorStrength: number;
  readonly altitudeStrength: number;
  readonly damping: number;
  readonly settleEnergy: number;
}

export interface ReferenceWorldForcePosition {
  readonly instanceId: WorldInstanceId;
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

interface NodeState extends SimulationNodeDatum {
  readonly node: WorldForceNode;
  readonly group: string;
  readonly anchor: WorldForceAnchor | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export const DEFAULT_REFERENCE_WORLD_FORCE_OPTIONS: ReferenceWorldForceOptions = Object.freeze({
  repulsionStrength: 48_000,
  collisionStrength: 0.28,
  anchorStrength: 0.009,
  altitudeStrength: 0.04,
  damping: 0.84,
  settleEnergy: 0.0005,
});

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function finiteUnit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
  return value;
}

function validateOptions(options: ReferenceWorldForceOptions): ReferenceWorldForceOptions {
  return Object.freeze({
    repulsionStrength: finiteNonNegative(options.repulsionStrength, "Reference repulsion strength"),
    collisionStrength: finiteNonNegative(options.collisionStrength, "Reference collision strength"),
    anchorStrength: finiteNonNegative(options.anchorStrength, "Reference anchor strength"),
    altitudeStrength: finiteNonNegative(options.altitudeStrength, "Reference altitude strength"),
    damping: finiteUnit(options.damping, "Reference damping"),
    settleEnergy: finiteNonNegative(options.settleEnergy, "Reference settle energy"),
  });
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
  const radius = 20 + ((hash >>> 12) % 80);
  return Object.freeze([Math.cos(angle) * radius, Math.sin(angle) * radius]);
}

function initialPosition(node: WorldForceNode): readonly [number, number, number] {
  const hasExplicitOffset = node.initialEastMeters !== 0 || node.initialNorthMeters !== 0;
  const [east, north] = hasExplicitOffset
    ? [node.initialEastMeters, node.initialNorthMeters]
    : seededOffset(node.id);
  return Object.freeze([east, north, node.targetVisualAltitudeMeters]);
}

function groupFor(anchor: WorldForceAnchor | null): string {
  return anchor ? `place:${String(anchor.placeId)}` : "unplaced";
}

function normalizedTimeStep(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Reference force delta must be a finite non-negative number.");
  }
  if (deltaMs === 0) return 0;
  // Bound catch-up so a missed frame cannot turn into a visible force jump.
  return Math.min(1.5, deltaMs / (1000 / 60));
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const CROSS_ANCHOR_FORCE_RADIUS_METERS = 6_000;
const CROSS_ANCHOR_BUCKET_METERS = 100_000;
const READABLE_SEPARATION_SCALE = 1.35;
const D3_CLUSTER_COLLISION_STRENGTH = 0.86;
const D3_CLUSTER_COLLISION_ITERATIONS = 3;
const D3_CLUSTER_COLLAPSE_CHARGE = -1_400;
const D3_CLUSTER_EXPAND_CHARGE = -3_600;
const D3_CLUSTER_COLLAPSE_ANCHOR_STRENGTH = 0.08;
const D3_CLUSTER_EXPAND_ANCHOR_STRENGTH = 0.004;
const D3_CLUSTER_ALPHA = 0.18;
const D3_CLUSTER_ALPHA_MIN = 0.003;
const D3_CLUSTER_ALPHA_DECAY = 0.018;

type Vector3 = readonly [number, number, number];

type D3ClusterMode = "collapse" | "expand";

interface D3ClusterLink extends SimulationLinkDatum<NodeState> {
  readonly edge: WorldForceEdge;
}

interface D3ClusterSimulation {
  readonly group: string;
  readonly placeId: string;
  readonly mode: D3ClusterMode;
  readonly simulation: Simulation<NodeState, SimulationLinkDatum<NodeState>>;
}

interface ForceGroup {
  readonly key: string;
  readonly states: readonly NodeState[];
  readonly anchor: WorldForceAnchor | null;
  readonly extentMeters: number;
  readonly bucket: readonly [number, number, number] | null;
}

interface PairDelta {
  /** Vector from left -> right expressed in the left node's local ENU frame. */
  readonly leftLocal: Vector3;
  /** Same world vector expressed in the right node's local ENU frame. */
  readonly rightLocal: Vector3;
  readonly distanceMeters: number;
}

function anchorBasis(anchor: WorldForceAnchor): Readonly<{
  east: Vector3;
  north: Vector3;
  up: Vector3;
}> {
  const latitude = (anchor.latitude * Math.PI) / 180;
  const longitude = (anchor.longitude * Math.PI) / 180;
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude);
  const cosLongitude = Math.cos(longitude);

  return Object.freeze({
    east: Object.freeze([-sinLongitude, cosLongitude, 0]) as Vector3,
    north: Object.freeze([
      -sinLatitude * cosLongitude,
      -sinLatitude * sinLongitude,
      cosLatitude,
    ]) as Vector3,
    up: Object.freeze([
      cosLatitude * cosLongitude,
      cosLatitude * sinLongitude,
      sinLatitude,
    ]) as Vector3,
  });
}

function anchorCartesian(anchor: WorldForceAnchor): Vector3 {
  const basis = anchorBasis(anchor);
  const radius = EARTH_RADIUS_METERS + anchor.sourceAltitudeMeters;
  return Object.freeze([
    basis.up[0] * radius,
    basis.up[1] * radius,
    basis.up[2] * radius,
  ]);
}

function localVectorToCartesian(anchor: WorldForceAnchor, vector: Vector3): Vector3 {
  const basis = anchorBasis(anchor);
  return Object.freeze([
    basis.east[0] * vector[0] + basis.north[0] * vector[1] + basis.up[0] * vector[2],
    basis.east[1] * vector[0] + basis.north[1] * vector[1] + basis.up[1] * vector[2],
    basis.east[2] * vector[0] + basis.north[2] * vector[1] + basis.up[2] * vector[2],
  ]);
}

function cartesianVectorToLocal(anchor: WorldForceAnchor, vector: Vector3): Vector3 {
  const basis = anchorBasis(anchor);
  return Object.freeze([
    basis.east[0] * vector[0] + basis.east[1] * vector[1] + basis.east[2] * vector[2],
    basis.north[0] * vector[0] + basis.north[1] * vector[1] + basis.north[2] * vector[2],
    basis.up[0] * vector[0] + basis.up[1] * vector[1] + basis.up[2] * vector[2],
  ]);
}

function stateCartesian(state: NodeState): Vector3 | null {
  if (!state.anchor) return null;
  const origin = anchorCartesian(state.anchor);
  const local = localVectorToCartesian(state.anchor, [state.x, state.y, state.z]);
  return Object.freeze([
    origin[0] + local[0],
    origin[1] + local[1],
    origin[2] + local[2],
  ]);
}

function cartesianDistance(left: Vector3, right: Vector3): number {
  return Math.hypot(right[0] - left[0], right[1] - left[1], right[2] - left[2]);
}

function forceGroup(key: string, states: readonly NodeState[]): ForceGroup {
  const anchor = states.find((state) => state.anchor)?.anchor ?? null;
  const extentMeters = states.reduce(
    (extent, state) =>
      Math.max(
        extent,
        Math.hypot(state.x, state.y, state.z) + state.node.collisionRadiusMeters,
      ),
    0,
  );
  if (!anchor) {
    return Object.freeze({ key, states, anchor: null, extentMeters, bucket: null });
  }

  const [x, y, z] = anchorCartesian(anchor);
  return Object.freeze({
    key,
    states,
    anchor,
    extentMeters,
    bucket: Object.freeze([
      Math.floor(x / CROSS_ANCHOR_BUCKET_METERS),
      Math.floor(y / CROSS_ANCHOR_BUCKET_METERS),
      Math.floor(z / CROSS_ANCHOR_BUCKET_METERS),
    ]),
  });
}

function crossGroupCandidates(
  groups: readonly ForceGroup[],
): readonly (readonly [ForceGroup, ForceGroup])[] {
  const buckets = new Map<string, number[]>();
  const keyFor = (x: number, y: number, z: number) => `${x}:${y}:${z}`;
  const maxExtentMeters = groups.reduce(
    (extent, group) => Math.max(extent, group.extentMeters),
    0,
  );

  for (let index = 0; index < groups.length; index += 1) {
    const bucket = groups[index]?.bucket;
    if (!bucket) continue;
    const key = keyFor(bucket[0], bucket[1], bucket[2]);
    buckets.set(key, [...(buckets.get(key) ?? []), index]);
  }

  const pairs: Array<readonly [ForceGroup, ForceGroup]> = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const bucket = group?.bucket;
    if (!group || !bucket || !group.anchor) continue;

    // A group's floating topology can extend well beyond its geographic
    // anchor. Search as many broad-phase buckets as its current world-space
    // extent can actually reach instead of assuming anchors must themselves
    // occupy adjacent buckets.
    const bucketReach = Math.max(
      1,
      Math.ceil(
        (group.extentMeters + maxExtentMeters + CROSS_ANCHOR_FORCE_RADIUS_METERS) /
          CROSS_ANCHOR_BUCKET_METERS,
      ),
    );

    for (let x = bucket[0] - bucketReach; x <= bucket[0] + bucketReach; x += 1) {
      for (let y = bucket[1] - bucketReach; y <= bucket[1] + bucketReach; y += 1) {
        for (let z = bucket[2] - bucketReach; z <= bucket[2] + bucketReach; z += 1) {
          for (const otherIndex of buckets.get(keyFor(x, y, z)) ?? []) {
            if (otherIndex <= index) continue;
            const other = groups[otherIndex];
            if (!other?.anchor) continue;

            const anchorDistance = cartesianDistance(
              anchorCartesian(group.anchor),
              anchorCartesian(other.anchor),
            );
            if (
              anchorDistance >
              group.extentMeters +
                other.extentMeters +
                CROSS_ANCHOR_FORCE_RADIUS_METERS
            ) {
              continue;
            }
            pairs.push(Object.freeze([group, other]));
          }
        }
      }
    }
  }

  return Object.freeze(pairs);
}

function pairDeltaMeters(left: NodeState, right: NodeState): PairDelta | null {
  if (left.group === right.group) {
    const delta = Object.freeze([
      right.x - left.x,
      right.y - left.y,
      right.z - left.z,
    ]) as Vector3;
    return Object.freeze({
      leftLocal: delta,
      rightLocal: delta,
      distanceMeters: Math.hypot(delta[0], delta[1], delta[2]),
    });
  }

  if (!left.anchor || !right.anchor) return null;
  const leftPosition = stateCartesian(left);
  const rightPosition = stateCartesian(right);
  if (!leftPosition || !rightPosition) return null;

  const worldDelta = Object.freeze([
    rightPosition[0] - leftPosition[0],
    rightPosition[1] - leftPosition[1],
    rightPosition[2] - leftPosition[2],
  ]) as Vector3;

  return Object.freeze({
    leftLocal: cartesianVectorToLocal(left.anchor, worldDelta),
    rightLocal: cartesianVectorToLocal(right.anchor, worldDelta),
    distanceMeters: Math.hypot(worldDelta[0], worldDelta[1], worldDelta[2]),
  });
}

function readableSeparationDistance(left: NodeState, right: NodeState): number {
  return (
    (left.node.collisionRadiusMeters + right.node.collisionRadiusMeters) *
    READABLE_SEPARATION_SCALE
  );
}

function crossAnchorInteractionRadius(left: NodeState, right: NodeState): number {
  return Math.max(
    CROSS_ANCHOR_FORCE_RADIUS_METERS,
    readableSeparationDistance(left, right) * 4,
  );
}

export class ReferenceWorldForceSimulation implements WorldForceSimulationBackend {
  readonly #options: ReferenceWorldForceOptions;
  #states = new Map<WorldInstanceId, NodeState>();
  #edges: readonly WorldForceEdge[] = Object.freeze([]);
  #pin: WorldForcePin | null = null;
  #request: WorldSimulationRequest | null = null;
  #clusteredPlaceIds = new Set<string>();
  #expandingPlaceIds = new Set<string>();
  #clusterSimulations = new Map<string, D3ClusterSimulation>();
  #running = false;
  #settled = true;
  #energy: number | null = 0;
  #iteration = 0;
  #destroyed = false;

  constructor(options: ReferenceWorldForceOptions = DEFAULT_REFERENCE_WORLD_FORCE_OPTIONS) {
    this.#options = validateOptions(options);
  }

  setScene(scene: WorldForceScene): void {
    this.#assertAlive();
    const previous = this.#states;
    const next = new Map<WorldInstanceId, NodeState>();

    for (const node of [...scene.nodes].sort((left, right) =>
      String(left.id).localeCompare(String(right.id)),
    )) {
      const anchor = primaryAnchor(node.id, scene.anchors);
      const group = groupFor(anchor);
      const old = previous.get(node.id);

      if (old && old.group === group) {
        next.set(node.id, {
          node,
          group,
          anchor,
          x: old.x,
          y: old.y,
          z: old.z,
          vx: old.vx,
          vy: old.vy,
          vz: old.vz,
          fx: old.fx ?? null,
          fy: old.fy ?? null,
        });
        continue;
      }

      const [x, y, z] = initialPosition(node);
      next.set(node.id, {
        node,
        group,
        anchor,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        fx: null,
        fy: null,
      });
    }

    this.#states = next;
    this.#edges = Object.freeze(
      [...scene.edges].sort(
        (left, right) =>
          String(left.id).localeCompare(String(right.id)) ||
          String(left.sourceId).localeCompare(String(right.sourceId)) ||
          String(left.targetId).localeCompare(String(right.targetId)),
      ),
    );

    if (this.#pin && !this.#states.has(this.#pin.instanceId)) this.#pin = null;
    this.#rebuildClusterSimulations();
    this.#settled = false;
    this.#energy = null;
    this.#iteration = 0;
  }

  setPin(pin: WorldForcePin | null): void {
    this.#assertAlive();
    const state = pin ? this.#states.get(pin.instanceId) : null;
    if (pin && !state) {
      throw new Error(`Cannot pin unknown world instance ${String(pin.instanceId)}.`);
    }
    this.#pin = pin ? Object.freeze({ ...pin }) : null;
    if (pin && state) {
      // Direct manipulation owns the dragged node: publish the pin
      // immediately instead of waiting for a global physics tick.
      state.x = pin.eastMeters;
      state.y = pin.northMeters;
      state.z = pin.visualAltitudeMeters;
      state.vx = 0;
      state.vy = 0;
      state.vz = 0;
    }
    this.#settled = false;
  }

  setClusteredPlaceIds(placeIds: readonly PlaceId[]): void {
    this.#assertAlive();
    const next = new Set(placeIds.map(String));
    const unchanged =
      next.size === this.#clusteredPlaceIds.size &&
      [...next].every((placeId) => this.#clusteredPlaceIds.has(placeId));
    if (unchanged && this.#expandingPlaceIds.size === 0) return;
    if (next.size === 0 && this.#clusteredPlaceIds.size === 0) return;

    if (next.size > 0) {
      this.#clusteredPlaceIds = next;
      this.#expandingPlaceIds.clear();
    } else {
      this.#expandingPlaceIds = new Set(this.#clusteredPlaceIds);
      this.#clusteredPlaceIds.clear();
    }

    this.#rebuildClusterSimulations();
    this.#running = true;
    this.#settled = false;
    this.#energy = null;
    this.#iteration = 0;
  }

  apply(request: WorldSimulationRequest): void {
    this.#assertAlive();
    finiteNonNegative(request.energyTarget, "World simulation energy target");
    this.#request = Object.freeze({ ...request });
    this.#running = request.reason !== "idle";
    if (request.reheat) this.#settled = false;
    if (request.reason === "idle") {
      this.#settled = true;
      this.#energy = 0;
    }
  }

  stop(): void {
    this.#assertAlive();
    this.#running = false;
  }

  step(deltaMs: number): void {
    this.#assertAlive();
    const dt = normalizedTimeStep(deltaMs);
    if (!this.#running || dt === 0 || this.#states.size === 0) return;

    const d3OwnedGroups = this.#stepClusterSimulations(deltaMs);

    const forces = new Map<WorldInstanceId, [number, number, number]>();
    for (const id of this.#states.keys()) forces.set(id, [0, 0, 0]);

    const groups = new Map<string, NodeState[]>();
    for (const state of this.#states.values()) {
      groups.set(state.group, [...(groups.get(state.group) ?? []), state]);
    }

    const forceGroups = [...groups.entries()]
      .filter(([key]) => !d3OwnedGroups.has(key))
      .map(([key, states]) => forceGroup(key, states));
    const crossPairs = crossGroupCandidates(forceGroups);

    // During direct manipulation geography is fixed. The dragged local group
    // remains the primary active island, but nearby floating nodes belonging
    // to other fixed place anchors must still participate in collision and
    // repulsion when their world-space footprints approach each other.
    const activeDragGroup = this.#pin
      ? (this.#states.get(this.#pin.instanceId)?.group ?? null)
      : null;
    const activeGroups =
      activeDragGroup && !d3OwnedGroups.has(activeDragGroup)
        ? new Set<string>([activeDragGroup])
        : null;

    if (activeDragGroup && activeGroups) {
      for (const [leftGroup, rightGroup] of crossPairs) {
        if (leftGroup.key !== activeDragGroup && rightGroup.key !== activeDragGroup) continue;
        if (!this.#groupsCanInteract(leftGroup.states, rightGroup.states)) continue;
        activeGroups.add(leftGroup.key);
        activeGroups.add(rightGroup.key);
      }
    }

    for (const group of forceGroups) {
      if (activeGroups && !activeGroups.has(group.key)) continue;
      const states = group.states;
      for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
        const left = states[leftIndex];
        if (!left) continue;
        for (let rightIndex = leftIndex + 1; rightIndex < states.length; rightIndex += 1) {
          const right = states[rightIndex];
          if (!right) continue;
          this.#applyPairForces(left, right, forces, false);
        }
      }
    }

    for (const [leftGroup, rightGroup] of crossPairs) {
      if (
        activeGroups &&
        (!activeGroups.has(leftGroup.key) || !activeGroups.has(rightGroup.key))
      ) {
        continue;
      }
      for (const left of leftGroup.states) {
        for (const right of rightGroup.states) {
          this.#applyPairForces(left, right, forces, true);
        }
      }
    }

    for (const edge of this.#edges) {
      const source = this.#states.get(edge.sourceId);
      const target = this.#states.get(edge.targetId);
      if (!source || !target || source.group !== target.group) continue;
      if (d3OwnedGroups.has(source.group)) continue;
      if (activeGroups && !activeGroups.has(source.group)) continue;
      this.#applyEdgeForce(edge, source, target, forces);
    }

    for (const state of this.#states.values()) {
      if (d3OwnedGroups.has(state.group)) continue;
      if (activeGroups && !activeGroups.has(state.group)) continue;
      // The dragged group is free from anchor tug-of-war while directly
      // manipulated. Nearby foreign groups keep their own anchor attraction,
      // so they can yield to collision without losing geographic provenance.
      if (!activeDragGroup || state.group !== activeDragGroup) {
        this.#applyAnchorForce(state, forces);
      }
      this.#applyAltitudeForce(state, forces);
    }

    const energyScale = 1 + (this.#request?.energyTarget ?? 0) * 4;
    let energy = 0;

    let activeNodeCount = 0;
    for (const state of this.#states.values()) {
      if (d3OwnedGroups.has(state.group)) continue;
      if (activeGroups && !activeGroups.has(state.group)) continue;
      activeNodeCount += 1;
      if (this.#pin?.instanceId === state.node.id) {
        state.x = this.#pin.eastMeters;
        state.y = this.#pin.northMeters;
        state.z = this.#pin.visualAltitudeMeters;
        state.vx = 0;
        state.vy = 0;
        state.vz = 0;
        continue;
      }

      const force = forces.get(state.node.id) ?? [0, 0, 0];
      const inverseMass = 1 / Math.max(0.001, state.node.mass);
      state.vx =
        (state.vx + force[0] * inverseMass * dt * energyScale) *
        Math.pow(this.#options.damping, dt);
      state.vy =
        (state.vy + force[1] * inverseMass * dt * energyScale) *
        Math.pow(this.#options.damping, dt);
      state.vz =
        (state.vz + force[2] * inverseMass * dt * energyScale) *
        Math.pow(this.#options.damping, dt);

      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.z = Math.max(0, state.z + state.vz * dt);

      energy += state.vx ** 2 + state.vy ** 2 + state.vz ** 2;
    }

    this.#iteration += 1;
    const referenceEnergy = energy / Math.max(1, activeNodeCount);
    const d3Energy =
      this.#clusterSimulations.size === 0
        ? 0
        : Math.max(
            ...[...this.#clusterSimulations.values()].map(({ simulation }) =>
              simulation.alpha() > simulation.alphaMin() ? simulation.alpha() : 0,
            ),
          );
    this.#energy = Math.max(referenceEnergy, d3Energy);
    this.#settled =
      this.#energy <= this.#options.settleEnergy &&
      this.#expandingPlaceIds.size === 0 &&
      [...this.#clusterSimulations.values()].every(
        ({ mode, simulation }) => mode === "collapse" || simulation.alpha() <= simulation.alphaMin(),
      );
  }

  getDiagnostics(): WorldSimulationDiagnostics {
    return Object.freeze({
      running: this.#running,
      settled: this.#settled,
      energy: this.#energy,
      iteration: this.#iteration,
    });
  }

  getSnapshot(): readonly ReferenceWorldForcePosition[] {
    this.#assertAlive();
    return Object.freeze(
      [...this.#states.values()]
        .sort((left, right) => String(left.node.id).localeCompare(String(right.node.id)))
        .map((state) =>
          Object.freeze({
            instanceId: state.node.id,
            eastMeters: state.x,
            northMeters: state.y,
            visualAltitudeMeters: state.z,
          }),
        ),
    );
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const { simulation } of this.#clusterSimulations.values()) simulation.stop();
    this.#clusterSimulations.clear();
    this.#clusteredPlaceIds.clear();
    this.#expandingPlaceIds.clear();
    this.#states.clear();
    this.#edges = Object.freeze([]);
    this.#pin = null;
    this.#request = null;
    this.#running = false;
  }

  #rebuildClusterSimulations(): void {
    for (const { simulation } of this.#clusterSimulations.values()) simulation.stop();
    this.#clusterSimulations.clear();

    const grouped = new Map<string, NodeState[]>();
    for (const state of this.#states.values()) {
      if (!state.anchor) continue;
      const placeId = String(state.anchor.placeId);
      const mode: D3ClusterMode | null = this.#clusteredPlaceIds.has(placeId)
        ? "collapse"
        : this.#expandingPlaceIds.has(placeId)
          ? "expand"
          : null;
      if (!mode) continue;
      const bucket = grouped.get(state.group);
      if (bucket) bucket.push(state);
      else grouped.set(state.group, [state]);
    }

    for (const [group, nodes] of grouped) {
      const placeId = String(nodes[0]?.anchor?.placeId ?? "");
      const mode: D3ClusterMode = this.#clusteredPlaceIds.has(placeId) ? "collapse" : "expand";
      const memberIds = new Set(nodes.map((state) => state.node.id));
      const links: D3ClusterLink[] =
        mode === "collapse"
          ? []
          : this.#edges
              .filter(
                (edge) => memberIds.has(edge.sourceId) && memberIds.has(edge.targetId),
              )
              .map((edge) => ({
                edge,
                source: edge.sourceId,
                target: edge.targetId,
              }));

      const maximumRadius = Math.max(
        1,
        ...nodes.map((state) => state.node.collisionRadiusMeters),
      );
      const maximumRestLength = Math.max(
        maximumRadius * 4,
        ...links.map((link) => link.edge.restLengthMeters),
      );

      const simulation = forceSimulation<NodeState>(nodes)
        .stop()
        .alpha(D3_CLUSTER_ALPHA)
        .alphaMin(D3_CLUSTER_ALPHA_MIN)
        .alphaDecay(D3_CLUSTER_ALPHA_DECAY)
        .alphaTarget(0);

      if (links.length > 0) {
        simulation.force(
          "link",
          forceLink<NodeState, D3ClusterLink>(links)
            .id((state) => state.node.id)
            .distance((link) => Math.max(link.edge.restLengthMeters, maximumRadius * 2))
            .strength((link) => link.edge.strength),
        );
      } else {
        simulation.force("link", null);
      }

      simulation.force(
        "charge",
        forceManyBody<NodeState>()
          .strength(mode === "collapse" ? D3_CLUSTER_COLLAPSE_CHARGE : D3_CLUSTER_EXPAND_CHARGE)
          .distanceMin(maximumRadius)
          .distanceMax(Math.max(7_200, maximumRestLength * 4)),
      );
      simulation.force(
        "collision",
        forceCollide<NodeState>()
          .radius((state) => state.node.collisionRadiusMeters)
          .strength(D3_CLUSTER_COLLISION_STRENGTH)
          .iterations(D3_CLUSTER_COLLISION_ITERATIONS),
      );

      const anchorStrength = (state: NodeState): number =>
        mode === "collapse"
          ? D3_CLUSTER_COLLAPSE_ANCHOR_STRENGTH
          : D3_CLUSTER_EXPAND_ANCHOR_STRENGTH *
            Math.max(0, Math.min(1, state.anchor?.influence ?? 0));
      simulation.force("cluster-x", forceX<NodeState>(0).strength(anchorStrength));
      simulation.force("cluster-y", forceY<NodeState>(0).strength(anchorStrength));

      this.#clusterSimulations.set(
        group,
        Object.freeze({
          group,
          placeId,
          mode,
          simulation,
        }),
      );
    }
  }

  #stepClusterSimulations(deltaMs: number): ReadonlySet<string> {
    if (this.#clusterSimulations.size === 0) return new Set();

    const ticks = Math.max(1, Math.min(2, Math.round(deltaMs / (1000 / 60)) || 1));
    const owned = new Set<string>();
    const finishedExpansions: string[] = [];

    for (const [group, entry] of this.#clusterSimulations) {
      owned.add(group);
      if (entry.simulation.alpha() > entry.simulation.alphaMin()) {
        entry.simulation.tick(ticks);
      }
      if (entry.mode === "expand" && entry.simulation.alpha() <= entry.simulation.alphaMin()) {
        finishedExpansions.push(entry.placeId);
      }
    }

    if (finishedExpansions.length > 0) {
      for (const placeId of finishedExpansions) this.#expandingPlaceIds.delete(placeId);
      for (const [group, entry] of this.#clusterSimulations) {
        if (entry.mode === "expand" && finishedExpansions.includes(entry.placeId)) {
          entry.simulation.stop();
          this.#clusterSimulations.delete(group);
        }
      }
    }

    return owned;
  }

  #groupsCanInteract(
    leftStates: readonly NodeState[],
    rightStates: readonly NodeState[],
  ): boolean {
    for (const left of leftStates) {
      for (const right of rightStates) {
        const delta = pairDeltaMeters(left, right);
        if (!delta) continue;
        if (delta.distanceMeters <= crossAnchorInteractionRadius(left, right)) {
          return true;
        }
      }
    }
    return false;
  }

  #applyPairForces(
    left: NodeState,
    right: NodeState,
    forces: Map<WorldInstanceId, [number, number, number]>,
    crossAnchor: boolean,
  ): void {
    const delta = pairDeltaMeters(left, right);
    if (!delta) return;

    let distance = delta.distanceMeters;
    if (crossAnchor && distance > crossAnchorInteractionRadius(left, right)) return;

    let leftUnit: Vector3;
    let rightUnit: Vector3;
    if (distance < 0.001) {
      const [seedX, seedY] = seededOffset(right.node.id);
      const seedDistance = Math.max(0.001, Math.hypot(seedX, seedY));
      leftUnit = Object.freeze([seedX / seedDistance, seedY / seedDistance, 0]);
      if (crossAnchor && left.anchor && right.anchor) {
        const worldUnit = localVectorToCartesian(left.anchor, leftUnit);
        rightUnit = cartesianVectorToLocal(right.anchor, worldUnit);
      } else {
        rightUnit = leftUnit;
      }
      distance = 0.001;
    } else {
      leftUnit = Object.freeze([
        delta.leftLocal[0] / distance,
        delta.leftLocal[1] / distance,
        delta.leftLocal[2] / distance,
      ]);
      rightUnit = Object.freeze([
        delta.rightLocal[0] / distance,
        delta.rightLocal[1] / distance,
        delta.rightLocal[2] / distance,
      ]);
    }

    const hardMinimumDistance =
      left.node.collisionRadiusMeters + right.node.collisionRadiusMeters;
    const readableDistance = readableSeparationDistance(left, right);
    const repulsion = this.#options.repulsionStrength / Math.max(100, distance ** 2);
    const readableCollision =
      distance < readableDistance
        ? (readableDistance - distance) * this.#options.collisionStrength
        : 0;
    const overlapBoost =
      distance < hardMinimumDistance
        ? (hardMinimumDistance - distance) * this.#options.collisionStrength
        : 0;
    const magnitude = repulsion + readableCollision + overlapBoost;

    this.#addForce(
      forces,
      left.node.id,
      -leftUnit[0] * magnitude,
      -leftUnit[1] * magnitude,
      -leftUnit[2] * magnitude,
    );
    this.#addForce(
      forces,
      right.node.id,
      rightUnit[0] * magnitude,
      rightUnit[1] * magnitude,
      rightUnit[2] * magnitude,
    );
  }

  #applyEdgeForce(
    edge: WorldForceEdge,
    source: NodeState,
    target: NodeState,
    forces: Map<WorldInstanceId, [number, number, number]>,
  ): void {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const unitX = dx / distance;
    const unitY = dy / distance;
    const magnitude = (distance - edge.restLengthMeters) * edge.strength * 0.01;

    this.#addForce(forces, source.node.id, unitX * magnitude, unitY * magnitude, 0);
    this.#addForce(forces, target.node.id, -unitX * magnitude, -unitY * magnitude, 0);
  }

  #applyAnchorForce(
    state: NodeState,
    forces: Map<WorldInstanceId, [number, number, number]>,
  ): void {
    if (!state.anchor) return;
    const radius = Math.hypot(state.x, state.y);
    const excess = Math.max(0, radius - state.anchor.precisionRadiusMeters);
    if (excess === 0 || radius < 0.001) return;

    const magnitude = excess * state.anchor.influence * this.#options.anchorStrength;
    this.#addForce(
      forces,
      state.node.id,
      -(state.x / radius) * magnitude,
      -(state.y / radius) * magnitude,
      0,
    );
  }

  #applyAltitudeForce(
    state: NodeState,
    forces: Map<WorldInstanceId, [number, number, number]>,
  ): void {
    const delta = state.node.targetVisualAltitudeMeters - state.z;
    this.#addForce(forces, state.node.id, 0, 0, delta * this.#options.altitudeStrength);
  }

  #addForce(
    forces: Map<WorldInstanceId, [number, number, number]>,
    id: WorldInstanceId,
    x: number,
    y: number,
    z: number,
  ): void {
    const force = forces.get(id);
    if (!force) return;
    force[0] += x;
    force[1] += y;
    force[2] += z;
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("ReferenceWorldForceSimulation has been destroyed.");
  }
}
