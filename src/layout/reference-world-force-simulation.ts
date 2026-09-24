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

interface NodeState {
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
const READABLE_SEPARATION_SCALE = 1.35;
const PLACE_DOMAIN_INNER_RADIUS_SCALE = 2.25;
const PLACE_DOMAIN_WIDTH_SCALE = 2.4;
const PLACE_DOMAIN_CORRECTION_SQRT_SCALE = 20;

type Vector3 = readonly [number, number, number];

interface PlaceDomain {
  readonly innerRadiusMeters: number;
  readonly outerRadiusMeters: number;
}

interface ForceGroup {
  readonly key: string;
  readonly states: readonly NodeState[];
  readonly anchor: WorldForceAnchor | null;
  readonly extentMeters: number;
  readonly center: Vector3 | null;
}

interface CrossGroupSweepEntry {
  readonly group: ForceGroup;
  readonly center: Vector3;
  readonly radiusMeters: number;
  readonly minX: number;
  readonly maxX: number;
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
    return Object.freeze({ key, states, anchor: null, extentMeters, center: null });
  }

  return Object.freeze({
    key,
    states,
    anchor,
    extentMeters,
    center: anchorCartesian(anchor),
  });
}

function placeDomain(states: readonly NodeState[]): PlaceDomain | null {
  const anchored = states.filter((state) => state.anchor !== null);
  if (anchored.length === 0) return null;

  const maxCollisionRadiusMeters = anchored.reduce(
    (radius, state) => Math.max(radius, state.node.collisionRadiusMeters),
    0,
  );
  const precisionRadiusMeters = anchored.reduce(
    (radius, state) => Math.max(radius, state.anchor?.precisionRadiusMeters ?? 0),
    0,
  );

  // A place is the centre of a local layout domain, not the target position
  // of every entity. Keep the authored place marker clear, then give the
  // group enough annular area to spread through collision/relationship
  // forces without assigning rigid angular slots.
  const innerRadiusMeters = Math.max(
    1,
    maxCollisionRadiusMeters * PLACE_DOMAIN_INNER_RADIUS_SCALE,
  );
  const packingWidthMeters =
    maxCollisionRadiusMeters *
    Math.max(2, Math.sqrt(anchored.length) * PLACE_DOMAIN_WIDTH_SCALE);
  const outerRadiusMeters = Math.max(
    innerRadiusMeters + packingWidthMeters,
    precisionRadiusMeters,
  );

  return Object.freeze({ innerRadiusMeters, outerRadiusMeters });
}

function crossGroupCandidates(
  groups: readonly ForceGroup[],
): readonly (readonly [ForceGroup, ForceGroup])[] {
  const entries: CrossGroupSweepEntry[] = groups
    .filter(
      (group): group is ForceGroup & { readonly center: Vector3 } =>
        group.anchor !== null && group.center !== null,
    )
    .map((group) => {
      // Give each group half of the cross-anchor interaction padding. Two
      // expanded spheres overlap exactly when their anchor distance is within
      // both floating extents plus the shared interaction radius.
      const radiusMeters = group.extentMeters + CROSS_ANCHOR_FORCE_RADIUS_METERS / 2;
      return Object.freeze({
        group,
        center: group.center,
        radiusMeters,
        minX: group.center[0] - radiusMeters,
        maxX: group.center[0] + radiusMeters,
      });
    })
    .sort(
      (left, right) =>
        left.minX - right.minX || left.group.key.localeCompare(right.group.key),
    );

  const active: CrossGroupSweepEntry[] = [];
  const pairs: Array<readonly [ForceGroup, ForceGroup]> = [];

  for (const current of entries) {
    // A far drag increases one group's extent. The previous bucket search
    // expanded a three-dimensional cube from that extent, making one frame
    // proportional to drag distance cubed. Sweep-and-prune only keeps groups
    // whose expanded X ranges can still overlap.
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const candidate = active[index];
      if (candidate && candidate.maxX < current.minX) active.splice(index, 1);
    }

    for (const other of active) {
      const interactionRadius = current.radiusMeters + other.radiusMeters;
      if (Math.abs(current.center[1] - other.center[1]) > interactionRadius) continue;
      if (Math.abs(current.center[2] - other.center[2]) > interactionRadius) continue;
      if (cartesianDistance(current.center, other.center) > interactionRadius) continue;
      pairs.push(Object.freeze([other.group, current.group]));
    }

    active.push(current);
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

    const forces = new Map<WorldInstanceId, [number, number, number]>();
    for (const id of this.#states.keys()) forces.set(id, [0, 0, 0]);

    const groups = new Map<string, NodeState[]>();
    for (const state of this.#states.values()) {
      groups.set(state.group, [...(groups.get(state.group) ?? []), state]);
    }

    const forceGroups = [...groups.entries()].map(([key, states]) => forceGroup(key, states));
    const crossPairs = crossGroupCandidates(forceGroups);

    // During direct manipulation geography is fixed. The dragged local group
    // remains the primary active island, but nearby floating nodes belonging
    // to other fixed place anchors must still participate in collision and
    // repulsion when their world-space footprints approach each other.
    const activeDragGroup = this.#pin
      ? (this.#states.get(this.#pin.instanceId)?.group ?? null)
      : null;
    const activeGroups = activeDragGroup ? new Set<string>([activeDragGroup]) : null;

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
      if (activeGroups && !activeGroups.has(source.group)) continue;
      this.#applyEdgeForce(edge, source, target, forces);
    }

    const placeDomains = new Map<string, PlaceDomain>();
    for (const group of forceGroups) {
      const domain = placeDomain(group.states);
      if (domain) placeDomains.set(group.key, domain);
    }

    for (const state of this.#states.values()) {
      if (activeGroups && !activeGroups.has(state.group)) continue;
      this.#applyAltitudeForce(state, forces);
    }

    const energyScale = 1 + (this.#request?.energyTarget ?? 0) * 4;
    let energy = 0;

    let activeNodeCount = 0;
    for (const state of this.#states.values()) {
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

      // Geographic membership is a positional annulus constraint rather than
      // a spring to the exact place coordinate. Tangential motion stays free
      // for collision/relationship forces, while only radial violations are
      // corrected. The whole dragged group remains unconstrained until drop.
      const domainActivity =
        !activeDragGroup || state.group !== activeDragGroup
          ? this.#applyPlaceDomainConstraint(
              state,
              placeDomains.get(state.group) ?? null,
              dt,
            )
          : 0;

      energy += state.vx ** 2 + state.vy ** 2 + state.vz ** 2 + domainActivity;
    }

    this.#iteration += 1;
    this.#energy = energy / Math.max(1, activeNodeCount);
    this.#settled = this.#energy <= this.#options.settleEnergy;
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
    this.#states.clear();
    this.#edges = Object.freeze([]);
    this.#pin = null;
    this.#request = null;
    this.#running = false;
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

  #applyPlaceDomainConstraint(
    state: NodeState,
    domain: PlaceDomain | null,
    dt: number,
  ): number {
    const anchor = state.anchor;
    if (!anchor || !domain || anchor.influence <= 0 || dt <= 0) return 0;

    const radius = Math.hypot(state.x, state.y);
    let unitX: number;
    let unitY: number;
    if (radius < 0.001) {
      const [seedX, seedY] = seededOffset(state.node.id);
      const seedRadius = Math.max(0.001, Math.hypot(seedX, seedY));
      unitX = seedX / seedRadius;
      unitY = seedY / seedRadius;
    } else {
      unitX = state.x / radius;
      unitY = state.y / radius;
    }

    let radialError = 0;
    if (radius < domain.innerRadiusMeters) {
      radialError = domain.innerRadiusMeters - radius;
    } else if (radius > domain.outerRadiusMeters) {
      radialError = domain.outerRadiusMeters - radius;
    } else {
      return 0;
    }

    // Position-based radial relaxation avoids the oscillation of a long
    // anchor spring. Correction is deliberately bounded, with a sqrt(error)
    // catch-up term so a very long drag returns promptly without a single
    // large snap. anchorStrength remains the backend softness control.
    const relaxation = Math.min(
      0.45,
      this.#options.anchorStrength * anchor.influence * 24,
    );
    if (relaxation <= 0) return 0;
    const desiredCorrection =
      radialError * (1 - Math.pow(1 - relaxation, dt));
    const maxCorrection =
      Math.max(
        state.node.collisionRadiusMeters * 2,
        Math.sqrt(Math.abs(radialError)) * PLACE_DOMAIN_CORRECTION_SQRT_SCALE,
      ) * dt;
    const correction =
      Math.sign(desiredCorrection) *
      Math.min(Math.abs(desiredCorrection), maxCorrection);

    state.x += unitX * correction;
    state.y += unitY * correction;

    // Remove only velocity that is driving farther out of the allowed band.
    // Tangential velocity and velocity returning toward the band are retained.
    const radialVelocity = state.vx * unitX + state.vy * unitY;
    const movingFartherOut =
      (radius < domain.innerRadiusMeters && radialVelocity < 0) ||
      (radius > domain.outerRadiusMeters && radialVelocity > 0);
    if (movingFartherOut) {
      state.vx -= unitX * radialVelocity;
      state.vy -= unitY * radialVelocity;
    }

    return correction ** 2;
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
