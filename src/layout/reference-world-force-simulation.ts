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
  repulsionStrength: 32_000,
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

interface ForceGroup {
  readonly key: string;
  readonly states: readonly NodeState[];
  readonly anchor: WorldForceAnchor | null;
  readonly extentMeters: number;
  readonly bucket: readonly [number, number, number] | null;
}

function shortestLongitudeDeltaDegrees(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

function anchorDeltaMeters(
  left: WorldForceAnchor,
  right: WorldForceAnchor,
): readonly [number, number] {
  const radians = Math.PI / 180;
  const meanLatitude = ((left.latitude + right.latitude) / 2) * radians;
  const eastMeters =
    shortestLongitudeDeltaDegrees(left.longitude, right.longitude) *
    radians *
    EARTH_RADIUS_METERS *
    Math.max(0.05, Math.cos(meanLatitude));
  const northMeters = (right.latitude - left.latitude) * radians * EARTH_RADIUS_METERS;
  return Object.freeze([eastMeters, northMeters]);
}

function anchorCartesian(anchor: WorldForceAnchor): readonly [number, number, number] {
  const latitude = (anchor.latitude * Math.PI) / 180;
  const longitude = (anchor.longitude * Math.PI) / 180;
  const horizontal = Math.cos(latitude) * EARTH_RADIUS_METERS;
  return Object.freeze([
    horizontal * Math.cos(longitude),
    horizontal * Math.sin(longitude),
    Math.sin(latitude) * EARTH_RADIUS_METERS,
  ]);
}

function forceGroup(key: string, states: readonly NodeState[]): ForceGroup {
  const anchor = states.find((state) => state.anchor)?.anchor ?? null;
  const extentMeters = states.reduce(
    (extent, state) =>
      Math.max(extent, Math.hypot(state.x, state.y) + state.node.collisionRadiusMeters),
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

function crossGroupCandidates(groups: readonly ForceGroup[]): readonly (readonly [ForceGroup, ForceGroup])[] {
  const buckets = new Map<string, number[]>();
  const keyFor = (x: number, y: number, z: number) => `${x}:${y}:${z}`;

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
    if (!group || !bucket) continue;

    for (let x = bucket[0] - 1; x <= bucket[0] + 1; x += 1) {
      for (let y = bucket[1] - 1; y <= bucket[1] + 1; y += 1) {
        for (let z = bucket[2] - 1; z <= bucket[2] + 1; z += 1) {
          for (const otherIndex of buckets.get(keyFor(x, y, z)) ?? []) {
            if (otherIndex <= index) continue;
            const other = groups[otherIndex];
            if (!other || !group.anchor || !other.anchor) continue;

            const [eastMeters, northMeters] = anchorDeltaMeters(group.anchor, other.anchor);
            const anchorDistance = Math.hypot(eastMeters, northMeters);
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

function pairDeltaMeters(left: NodeState, right: NodeState): readonly [number, number] | null {
  if (left.group === right.group) {
    return Object.freeze([right.x - left.x, right.y - left.y]);
  }
  if (!left.anchor || !right.anchor) return null;
  const [anchorEastMeters, anchorNorthMeters] = anchorDeltaMeters(left.anchor, right.anchor);
  return Object.freeze([
    anchorEastMeters + right.x - left.x,
    anchorNorthMeters + right.y - left.y,
  ]);
}

function crossAnchorInteractionRadius(left: NodeState, right: NodeState): number {
  return Math.max(
    CROSS_ANCHOR_FORCE_RADIUS_METERS,
    (left.node.collisionRadiusMeters + right.node.collisionRadiusMeters) * 4,
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

    for (const state of this.#states.values()) {
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

  #groupsCanInteract(leftStates: readonly NodeState[], rightStates: readonly NodeState[]): boolean {
    for (const left of leftStates) {
      for (const right of rightStates) {
        const delta = pairDeltaMeters(left, right);
        if (!delta) continue;
        if (Math.hypot(delta[0], delta[1]) <= crossAnchorInteractionRadius(left, right)) {
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

    let [dx, dy] = delta;
    let distance = Math.hypot(dx, dy);
    const minimumDistance = left.node.collisionRadiusMeters + right.node.collisionRadiusMeters;

    if (crossAnchor && distance > crossAnchorInteractionRadius(left, right)) return;

    if (distance < 0.001) {
      const [seedX, seedY] = seededOffset(right.node.id);
      dx = seedX;
      dy = seedY;
      distance = Math.max(0.001, Math.hypot(dx, dy));
    }

    const unitX = dx / distance;
    const unitY = dy / distance;
    const repulsion = this.#options.repulsionStrength / Math.max(100, distance ** 2);
    const collision =
      distance < minimumDistance
        ? (minimumDistance - distance) * this.#options.collisionStrength
        : 0;
    const magnitude = repulsion + collision;

    this.#addForce(forces, left.node.id, -unitX * magnitude, -unitY * magnitude, 0);
    this.#addForce(forces, right.node.id, unitX * magnitude, unitY * magnitude, 0);
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
