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
  readonly anchors: readonly WorldForceAnchor[];
  readonly anchor: WorldForceAnchor | null;
  readonly anchorFrame: AnchorFrame | null;
  readonly anchorBias: AnchorBias | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  forceX: number;
  forceY: number;
  forceZ: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  dirty: boolean;
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

function anchorsByInstance(
  anchors: readonly WorldForceAnchor[],
): ReadonlyMap<WorldInstanceId, readonly WorldForceAnchor[]> {
  const mutable = new Map<WorldInstanceId, WorldForceAnchor[]>();
  for (const anchor of anchors) {
    const entries = mutable.get(anchor.instanceId);
    if (entries) entries.push(anchor);
    else mutable.set(anchor.instanceId, [anchor]);
  }

  return new Map(
    [...mutable.entries()].map(([instanceId, entries]) => [
      instanceId,
      Object.freeze(
        [...entries].sort(
          (left, right) =>
            right.influence - left.influence ||
            String(left.placeId).localeCompare(String(right.placeId)),
        ),
      ),
    ]),
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
const SAME_PLACE_SPATIAL_INDEX_THRESHOLD = 96;
const SAME_PLACE_NEIGHBORHOOD_SCALE = 4;
const SAME_PLACE_PRECISION_SCALE = 8;
const PLACE_DOMAIN_INNER_RADIUS_SCALE = 2.25;
const PLACE_DOMAIN_WIDTH_SCALE = 2.4;
const PLACE_DOMAIN_CORRECTION_SQRT_SCALE = 20;
const MULTI_ANCHOR_BIAS_RADIUS_SCALE = 4;
const MULTI_ANCHOR_BIAS_STRENGTH_SCALE = 0.35;

type Vector3 = readonly [number, number, number];

interface AnchorFrame {
  readonly east: Vector3;
  readonly north: Vector3;
  readonly up: Vector3;
  readonly origin: Vector3;
}

interface PlaceDomain {
  readonly innerRadiusMeters: number;
  readonly outerRadiusMeters: number;
}

interface AnchorBias {
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly strength: number;
}

interface ForceGroup {
  readonly key: string;
  readonly states: readonly NodeState[];
  readonly bounded: boolean;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

function createAnchorFrame(anchor: WorldForceAnchor): AnchorFrame {
  const latitude = (anchor.latitude * Math.PI) / 180;
  const longitude = (anchor.longitude * Math.PI) / 180;
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude);
  const cosLongitude = Math.cos(longitude);

  const east: Vector3 = [-sinLongitude, cosLongitude, 0];
  const north: Vector3 = [-sinLatitude * cosLongitude, -sinLatitude * sinLongitude, cosLatitude];
  const up: Vector3 = [cosLatitude * cosLongitude, cosLatitude * sinLongitude, sinLatitude];
  const radius = EARTH_RADIUS_METERS + anchor.sourceAltitudeMeters;

  return {
    east,
    north,
    up,
    origin: [up[0] * radius, up[1] * radius, up[2] * radius],
  };
}

function anchorBias(
  primary: WorldForceAnchor,
  primaryFrame: AnchorFrame,
  anchors: readonly WorldForceAnchor[],
  node: WorldForceNode,
): AnchorBias | null {
  if (anchors.length <= 1) return null;

  const maxBiasRadiusMeters = Math.max(
    1,
    primary.precisionRadiusMeters,
    node.collisionRadiusMeters * MULTI_ANCHOR_BIAS_RADIUS_SCALE,
  );
  let weightedEast = 0;
  let weightedNorth = 0;
  let secondaryInfluence = 0;

  for (const anchor of anchors) {
    if (anchor === primary || anchor.influence <= 0) continue;
    const frame = createAnchorFrame(anchor);
    const worldDx = frame.origin[0] - primaryFrame.origin[0];
    const worldDy = frame.origin[1] - primaryFrame.origin[1];
    const worldDz = frame.origin[2] - primaryFrame.origin[2];
    const east =
      primaryFrame.east[0] * worldDx +
      primaryFrame.east[1] * worldDy +
      primaryFrame.east[2] * worldDz;
    const north =
      primaryFrame.north[0] * worldDx +
      primaryFrame.north[1] * worldDy +
      primaryFrame.north[2] * worldDz;
    const distance = Math.hypot(east, north);
    if (distance < 0.001) continue;

    // Secondary places steer organization inside the primary place domain.
    // They never relocate the rendered instance toward a potentially distant
    // geographic midpoint; occurrences that truly happen at separate places
    // remain separate world instances.
    const targetDistance = Math.min(distance, maxBiasRadiusMeters);
    weightedEast += (east / distance) * targetDistance * anchor.influence;
    weightedNorth += (north / distance) * targetDistance * anchor.influence;
    secondaryInfluence += anchor.influence;
  }

  if (secondaryInfluence <= 0) return null;
  const totalInfluence = Math.max(0.001, Math.max(0, primary.influence) + secondaryInfluence);
  return Object.freeze({
    eastMeters: weightedEast / secondaryInfluence,
    northMeters: weightedNorth / secondaryInfluence,
    strength: Math.min(1, secondaryInfluence / totalInfluence),
  });
}

function updateStateCartesian(state: NodeState): void {
  const frame = state.anchorFrame;
  if (!frame) {
    state.worldX = Number.NaN;
    state.worldY = Number.NaN;
    state.worldZ = Number.NaN;
    return;
  }

  state.worldX =
    frame.origin[0] + frame.east[0] * state.x + frame.north[0] * state.y + frame.up[0] * state.z;
  state.worldY =
    frame.origin[1] + frame.east[1] * state.x + frame.north[1] * state.y + frame.up[1] * state.z;
  state.worldZ =
    frame.origin[2] + frame.east[2] * state.x + frame.north[2] * state.y + frame.up[2] * state.z;
}

function forceGroup(key: string, states: readonly NodeState[]): ForceGroup {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let maxCollisionRadiusMeters = 0;
  let bounded = false;

  for (const state of states) {
    if (!state.anchorFrame) continue;
    updateStateCartesian(state);
    bounded = true;
    minX = Math.min(minX, state.worldX);
    maxX = Math.max(maxX, state.worldX);
    minY = Math.min(minY, state.worldY);
    maxY = Math.max(maxY, state.worldY);
    minZ = Math.min(minZ, state.worldZ);
    maxZ = Math.max(maxZ, state.worldZ);
    maxCollisionRadiusMeters = Math.max(maxCollisionRadiusMeters, state.node.collisionRadiusMeters);
  }

  if (!bounded) {
    return {
      key,
      states,
      bounded: false,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
    };
  }

  // Expand actual world-space bounds, not an anchor-centred sphere. A node
  // dragged thousands of kilometres therefore does not wake every group
  // between its authored place and its current pointer position.
  const paddingMeters = Math.max(
    CROSS_ANCHOR_FORCE_RADIUS_METERS / 2,
    maxCollisionRadiusMeters * READABLE_SEPARATION_SCALE * 4,
  );

  return {
    key,
    states,
    bounded: true,
    minX: minX - paddingMeters,
    maxX: maxX + paddingMeters,
    minY: minY - paddingMeters,
    maxY: maxY + paddingMeters,
    minZ: minZ - paddingMeters,
    maxZ: maxZ + paddingMeters,
  };
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
  const layoutTargetRadiusMeters = anchored.reduce((radius, state) => {
    const east = state.node.layoutTargetEastMeters;
    const north = state.node.layoutTargetNorthMeters;
    return east === undefined || north === undefined
      ? radius
      : Math.max(radius, Math.hypot(east, north) + state.node.collisionRadiusMeters);
  }, 0);

  // A place is the centre of a local layout domain, not the target position
  // of every entity. Keep the authored place marker clear, then give the
  // group enough annular area to spread through collision/relationship
  // forces. A feasible Sugiyama target must fit inside the same domain so the
  // anchor constraint never fights the structural target.
  const innerRadiusMeters = Math.max(1, maxCollisionRadiusMeters * PLACE_DOMAIN_INNER_RADIUS_SCALE);
  const packingWidthMeters =
    maxCollisionRadiusMeters * Math.max(2, Math.sqrt(anchored.length) * PLACE_DOMAIN_WIDTH_SCALE);
  const outerRadiusMeters = Math.max(
    innerRadiusMeters + packingWidthMeters,
    precisionRadiusMeters,
    layoutTargetRadiusMeters,
  );

  return Object.freeze({ innerRadiusMeters, outerRadiusMeters });
}

function boundsOverlap(left: ForceGroup, right: ForceGroup): boolean {
  return (
    left.minX <= right.maxX &&
    right.minX <= left.maxX &&
    left.minY <= right.maxY &&
    right.minY <= left.maxY &&
    left.minZ <= right.maxZ &&
    right.minZ <= left.maxZ
  );
}

function crossGroupCandidates(
  groups: readonly ForceGroup[],
  activeGroupKey: string | null,
  activeInstanceId: WorldInstanceId | null,
): readonly (readonly [ForceGroup, ForceGroup])[] {
  const bounded = groups.filter((group) => group.bounded);

  // Dragging only needs pairs incident to the dragged island. Test each
  // active node against other group bounds instead of using the active group's
  // union bounds: one node dragged across a continent must not wake every
  // place lying inside the long box between its anchor and the pointer.
  if (activeGroupKey) {
    const activeGroup = bounded.find((group) => group.key === activeGroupKey);
    if (!activeGroup) return [];

    const interactionState =
      activeInstanceId === null
        ? null
        : (activeGroup.states.find((state) => state.node.id === activeInstanceId) ?? null);
    if (!interactionState?.anchorFrame) return [];

    const pairs: Array<readonly [ForceGroup, ForceGroup]> = [];
    const paddingMeters = Math.max(
      CROSS_ANCHOR_FORCE_RADIUS_METERS / 2,
      interactionState.node.collisionRadiusMeters * READABLE_SEPARATION_SCALE * 4,
    );
    for (const other of bounded) {
      if (other === activeGroup) continue;
      const overlaps =
        interactionState.worldX + paddingMeters >= other.minX &&
        interactionState.worldX - paddingMeters <= other.maxX &&
        interactionState.worldY + paddingMeters >= other.minY &&
        interactionState.worldY - paddingMeters <= other.maxY &&
        interactionState.worldZ + paddingMeters >= other.minZ &&
        interactionState.worldZ - paddingMeters <= other.maxZ;
      if (overlaps) pairs.push([activeGroup, other]);
    }
    return pairs;
  }

  const entries = [...bounded].sort(
    (left, right) => left.minX - right.minX || left.key.localeCompare(right.key),
  );
  const active: ForceGroup[] = [];
  const pairs: Array<readonly [ForceGroup, ForceGroup]> = [];

  for (const current of entries) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const candidate = active[index];
      if (candidate && candidate.maxX < current.minX) active.splice(index, 1);
    }

    for (const other of active) {
      if (boundsOverlap(other, current)) pairs.push([other, current]);
    }

    active.push(current);
  }

  return pairs;
}

function readableSeparationDistance(left: NodeState, right: NodeState): number {
  return (
    (left.node.collisionRadiusMeters + right.node.collisionRadiusMeters) * READABLE_SEPARATION_SCALE
  );
}

function samePlaceNeighborhoodRadius(state: NodeState): number {
  const readableDiameter = state.node.collisionRadiusMeters * 2 * READABLE_SEPARATION_SCALE;
  const precisionRadius = state.anchor?.precisionRadiusMeters ?? 0;
  return Math.max(
    readableDiameter * SAME_PLACE_NEIGHBORHOOD_SCALE,
    Math.min(precisionRadius, readableDiameter * SAME_PLACE_PRECISION_SCALE),
  );
}

function samePlacePairRadius(left: NodeState, right: NodeState): number {
  return Math.max(
    samePlaceNeighborhoodRadius(left),
    samePlaceNeighborhoodRadius(right),
    readableSeparationDistance(left, right) * SAME_PLACE_NEIGHBORHOOD_SCALE,
  );
}

function visitSamePlacePairs(
  states: readonly NodeState[],
  visit: (left: NodeState, right: NodeState) => void,
  focus: NodeState | null = null,
): void {
  if (focus) {
    for (const other of states) {
      if (other === focus) continue;
      if (states.length >= SAME_PLACE_SPATIAL_INDEX_THRESHOLD) {
        const distance = Math.hypot(other.x - focus.x, other.y - focus.y, other.z - focus.z);
        if (distance > samePlacePairRadius(focus, other)) continue;
      }
      visit(focus, other);
    }
    return;
  }

  if (states.length < SAME_PLACE_SPATIAL_INDEX_THRESHOLD) {
    for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
      const left = states[leftIndex];
      if (!left) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < states.length; rightIndex += 1) {
        const right = states[rightIndex];
        if (right) visit(left, right);
      }
    }
    return;
  }

  // Dense place groups use a deterministic local spatial hash. The cell size is
  // derived from rendered collision footprints and bounded place precision, so
  // hard collision/readability neighbors remain exact while distant inverse-square
  // repulsion is intentionally omitted. Link springs are evaluated separately.
  let cellSize = 1;
  for (const state of states) {
    cellSize = Math.max(cellSize, samePlaceNeighborhoodRadius(state));
  }

  const buckets = new Map<string, number[]>();
  const cells: Array<readonly [number, number]> = [];
  const cellKey = (x: number, y: number) => `${x}:${y}`;

  for (let index = 0; index < states.length; index += 1) {
    const state = states[index];
    if (!state) continue;
    const cellX = Math.floor(state.x / cellSize);
    const cellY = Math.floor(state.y / cellSize);
    cells[index] = [cellX, cellY];
    const key = cellKey(cellX, cellY);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(index);
    else buckets.set(key, [index]);
  }

  for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
    const left = states[leftIndex];
    const cell = cells[leftIndex];
    if (!left || !cell) continue;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const bucket = buckets.get(cellKey(cell[0] + offsetX, cell[1] + offsetY));
        if (!bucket) continue;

        for (const rightIndex of bucket) {
          if (rightIndex <= leftIndex) continue;
          const right = states[rightIndex];
          if (!right) continue;
          const distance = Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
          if (distance <= samePlacePairRadius(left, right)) visit(left, right);
        }
      }
    }
  }
}

function crossAnchorInteractionRadius(left: NodeState, right: NodeState): number {
  return Math.max(CROSS_ANCHOR_FORCE_RADIUS_METERS, readableSeparationDistance(left, right) * 4);
}

type EdgeForcePolicy = "local-spring" | "visual-only";

function edgeForcePolicy(source: NodeState, target: NodeState): EdgeForcePolicy {
  return source.group === target.group ? "local-spring" : "visual-only";
}

export class ReferenceWorldForceSimulation implements WorldForceSimulationBackend {
  readonly #options: ReferenceWorldForceOptions;
  #states = new Map<WorldInstanceId, NodeState>();
  #orderedStates: readonly NodeState[] = Object.freeze([]);
  #dirtyStateIds = new Set<WorldInstanceId>();
  #groups = new Map<string, readonly NodeState[]>();
  #groupBounds = new Map<string, ForceGroup>();
  #dirtyGroupBounds = new Set<string>();
  #placeDomains = new Map<string, PlaceDomain>();
  #edges: readonly WorldForceEdge[] = Object.freeze([]);
  #edgesByGroup = new Map<string, readonly WorldForceEdge[]>();
  #pin: WorldForcePin | null = null;
  #interactionInstanceId: WorldInstanceId | null = null;
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
    const orderedStates: NodeState[] = [];
    const anchorsForInstance = anchorsByInstance(scene.anchors);

    const orderedNodes = [...scene.nodes].sort((left, right) =>
      String(left.id).localeCompare(String(right.id)),
    );

    for (const node of orderedNodes) {
      const anchors = anchorsForInstance.get(node.id) ?? Object.freeze([]);
      const anchor = anchors[0] ?? null;
      const group = groupFor(anchor);
      const old = previous.get(node.id);
      const anchorFrame = anchor ? createAnchorFrame(anchor) : null;
      const bias = anchor && anchorFrame ? anchorBias(anchor, anchorFrame, anchors, node) : null;

      if (old && old.group === group) {
        const state: NodeState = {
          node,
          group,
          anchors,
          anchor,
          anchorFrame,
          anchorBias: bias,
          x: old.x,
          y: old.y,
          z: old.z,
          vx: old.vx,
          vy: old.vy,
          vz: old.vz,
          forceX: 0,
          forceY: 0,
          forceZ: 0,
          worldX: old.worldX,
          worldY: old.worldY,
          worldZ: old.worldZ,
          dirty: true,
        };
        updateStateCartesian(state);
        next.set(node.id, state);
        orderedStates.push(state);
        continue;
      }

      const [x, y, z] = initialPosition(node);
      const state: NodeState = {
        node,
        group,
        anchors,
        anchor,
        anchorFrame,
        anchorBias: bias,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        forceX: 0,
        forceY: 0,
        forceZ: 0,
        worldX: Number.NaN,
        worldY: Number.NaN,
        worldZ: Number.NaN,
        dirty: true,
      };
      updateStateCartesian(state);
      next.set(node.id, state);
      orderedStates.push(state);
    }

    const mutableGroups = new Map<string, NodeState[]>();
    for (const state of orderedStates) {
      const states = mutableGroups.get(state.group);
      if (states) states.push(state);
      else mutableGroups.set(state.group, [state]);
    }

    this.#states = next;
    this.#orderedStates = Object.freeze(orderedStates);
    this.#groups = new Map(
      [...mutableGroups.entries()].map(([key, states]) => [key, Object.freeze(states)]),
    );
    this.#dirtyStateIds = new Set(orderedStates.map((state) => state.node.id));
    this.#groupBounds = new Map(
      [...this.#groups.entries()].map(([key, states]) => [key, forceGroup(key, states)]),
    );
    this.#dirtyGroupBounds.clear();
    this.#placeDomains = new Map();
    for (const [key, states] of this.#groups) {
      const domain = placeDomain(states);
      if (domain) this.#placeDomains.set(key, domain);
    }

    this.#edges = Object.freeze(
      [...scene.edges].sort(
        (left, right) =>
          String(left.id).localeCompare(String(right.id)) ||
          String(left.sourceId).localeCompare(String(right.sourceId)) ||
          String(left.targetId).localeCompare(String(right.targetId)),
      ),
    );

    const mutableEdgesByGroup = new Map<string, WorldForceEdge[]>();
    for (const edge of this.#edges) {
      const source = this.#states.get(edge.sourceId);
      const target = this.#states.get(edge.targetId);
      if (!source || !target || edgeForcePolicy(source, target) !== "local-spring") continue;
      const edges = mutableEdgesByGroup.get(source.group);
      if (edges) edges.push(edge);
      else mutableEdgesByGroup.set(source.group, [edge]);
    }
    this.#edgesByGroup = new Map(
      [...mutableEdgesByGroup.entries()].map(([key, edges]) => [key, Object.freeze(edges)]),
    );

    if (this.#pin && !this.#states.has(this.#pin.instanceId)) this.#pin = null;
    if (this.#interactionInstanceId !== null && !this.#states.has(this.#interactionInstanceId)) {
      this.#interactionInstanceId = null;
    }
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
      this.#interactionInstanceId = pin.instanceId;
      // Direct manipulation owns the dragged node: publish the pin
      // immediately instead of waiting for a global physics tick.
      const changed =
        state.x !== pin.eastMeters ||
        state.y !== pin.northMeters ||
        state.z !== pin.visualAltitudeMeters;
      state.x = pin.eastMeters;
      state.y = pin.northMeters;
      state.z = pin.visualAltitudeMeters;
      state.vx = 0;
      state.vy = 0;
      state.vz = 0;
      if (changed) {
        state.dirty = true;
        this.#dirtyStateIds.add(state.node.id);
        this.#dirtyGroupBounds.add(state.group);
        updateStateCartesian(state);
      }
    }
    this.#settled = false;
  }

  apply(request: WorldSimulationRequest): void {
    this.#assertAlive();
    finiteNonNegative(request.excitation, "World simulation excitation");
    this.#request = Object.freeze({ ...request });
    this.#running = request.reason !== "idle";
    if (request.reason !== "drag" && request.reason !== "post-drop") {
      this.#interactionInstanceId = null;
    }
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

    const interactionInstanceId =
      this.#pin?.instanceId ??
      (this.#request?.reason === "post-drop" ? this.#interactionInstanceId : null);
    const interactionState =
      interactionInstanceId === null ? null : (this.#states.get(interactionInstanceId) ?? null);
    const interactionGroup = interactionState?.group ?? null;
    const activeDragGroup = this.#pin ? interactionGroup : null;
    const forceGroups: ForceGroup[] = [];
    for (const [key, states] of this.#groups) {
      let group = this.#groupBounds.get(key);
      if (!group || this.#dirtyGroupBounds.has(key)) {
        group = forceGroup(key, states);
        this.#groupBounds.set(key, group);
        this.#dirtyGroupBounds.delete(key);
      }
      forceGroups.push(group);
    }
    const crossPairs = crossGroupCandidates(forceGroups, interactionGroup, interactionInstanceId);

    // Direct manipulation and its post-drop relaxation are one local force
    // epoch. Keep unrelated geography asleep while the released island
    // settles; only the active drag suspends the place-domain constraint.
    const activeGroups = interactionGroup ? new Set<string>([interactionGroup]) : null;
    if (activeGroups) {
      for (const [leftGroup, rightGroup] of crossPairs) {
        const canInteract =
          interactionState && leftGroup.key === interactionGroup
            ? this.#stateCanInteractWithGroup(interactionState, rightGroup.states)
            : this.#groupsCanInteract(leftGroup.states, rightGroup.states);
        if (!canInteract) continue;
        activeGroups.add(leftGroup.key);
        activeGroups.add(rightGroup.key);
      }
    }

    const activeForceGroups = activeGroups
      ? forceGroups.filter((group) => activeGroups.has(group.key))
      : forceGroups;
    const activeStates = activeGroups
      ? [...activeGroups].flatMap((groupKey) => this.#groups.get(groupKey) ?? [])
      : this.#orderedStates;

    for (const state of activeStates) {
      state.forceX = 0;
      state.forceY = 0;
      state.forceZ = 0;
    }

    for (const group of activeForceGroups) {
      const dragFocus =
        this.#pin && interactionState && group.key === interactionGroup ? interactionState : null;
      visitSamePlacePairs(
        group.states,
        (left, right) => {
          this.#applyPairForces(left, right, false);
        },
        dragFocus,
      );
    }

    for (const [leftGroup, rightGroup] of crossPairs) {
      if (activeGroups && (!activeGroups.has(leftGroup.key) || !activeGroups.has(rightGroup.key))) {
        continue;
      }
      const leftStates =
        interactionState && leftGroup.key === interactionGroup
          ? [interactionState]
          : leftGroup.states;
      const rightStates =
        interactionState && rightGroup.key === interactionGroup
          ? [interactionState]
          : rightGroup.states;
      for (const left of leftStates) {
        for (const right of rightStates) {
          this.#applyPairForces(left, right, true);
        }
      }
    }

    if (activeGroups) {
      for (const groupKey of activeGroups) {
        for (const edge of this.#edgesByGroup.get(groupKey) ?? []) {
          const source = this.#states.get(edge.sourceId);
          const target = this.#states.get(edge.targetId);
          if (source && target) this.#applyEdgeForce(edge, source, target);
        }
      }
    } else {
      for (const edge of this.#edges) {
        const source = this.#states.get(edge.sourceId);
        const target = this.#states.get(edge.targetId);
        if (!source || !target || edgeForcePolicy(source, target) !== "local-spring") continue;
        this.#applyEdgeForce(edge, source, target);
      }
    }

    for (const state of activeStates) {
      this.#applyLayoutTargetForce(state);
      this.#applyAnchorBiasForce(state);
      this.#applyAltitudeForce(state);
    }

    // Excitation is a dimensionless backend-neutral force gain, not d3 alpha.
    // Zero preserves baseline forces; interaction requests may temporarily increase
    // acceleration while damping and settle-energy continue to define convergence.
    const excitationScale = 1 + (this.#request?.excitation ?? 0) * 4;
    const damping = this.#options.damping ** dt;
    let energy = 0;
    let activeNodeCount = 0;

    for (const state of activeStates) {
      activeNodeCount += 1;

      if (this.#pin?.instanceId === state.node.id) {
        const changed =
          state.x !== this.#pin.eastMeters ||
          state.y !== this.#pin.northMeters ||
          state.z !== this.#pin.visualAltitudeMeters;
        state.x = this.#pin.eastMeters;
        state.y = this.#pin.northMeters;
        state.z = this.#pin.visualAltitudeMeters;
        state.vx = 0;
        state.vy = 0;
        state.vz = 0;
        if (changed) {
          state.dirty = true;
          this.#dirtyStateIds.add(state.node.id);
          this.#dirtyGroupBounds.add(state.group);
        }
        continue;
      }

      const beforeX = state.x;
      const beforeY = state.y;
      const beforeZ = state.z;
      const inverseMass = 1 / Math.max(0.001, state.node.mass);
      state.vx = (state.vx + state.forceX * inverseMass * dt * excitationScale) * damping;
      state.vy = (state.vy + state.forceY * inverseMass * dt * excitationScale) * damping;
      state.vz = (state.vz + state.forceZ * inverseMass * dt * excitationScale) * damping;

      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.z = Math.max(0, state.z + state.vz * dt);

      const domainActivity =
        !activeDragGroup || state.group !== activeDragGroup
          ? this.#applyPlaceDomainConstraint(state, this.#placeDomains.get(state.group) ?? null, dt)
          : 0;

      if (state.x !== beforeX || state.y !== beforeY || state.z !== beforeZ) {
        state.dirty = true;
        this.#dirtyStateIds.add(state.node.id);
        this.#dirtyGroupBounds.add(state.group);
      }
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
      this.#orderedStates.map((state) =>
        Object.freeze({
          instanceId: state.node.id,
          eastMeters: state.x,
          northMeters: state.y,
          visualAltitudeMeters: state.z,
        }),
      ),
    );
  }

  /**
   * Sparse CPU readback for interactive frames. Scene updates mark every node
   * dirty once; subsequent drag frames publish only nodes whose force-derived
   * position actually changed.
   */
  getChangedSnapshot(): readonly ReferenceWorldForcePosition[] {
    this.#assertAlive();
    const changed: ReferenceWorldForcePosition[] = [];
    const dirtyIds = [...this.#dirtyStateIds].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
    this.#dirtyStateIds.clear();
    for (const instanceId of dirtyIds) {
      const state = this.#states.get(instanceId);
      if (!state?.dirty) continue;
      changed.push(
        Object.freeze({
          instanceId: state.node.id,
          eastMeters: state.x,
          northMeters: state.y,
          visualAltitudeMeters: state.z,
        }),
      );
      state.dirty = false;
    }
    return Object.freeze(changed);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#states.clear();
    this.#orderedStates = Object.freeze([]);
    this.#dirtyStateIds.clear();
    this.#groups.clear();
    this.#groupBounds.clear();
    this.#dirtyGroupBounds.clear();
    this.#placeDomains.clear();
    this.#edges = Object.freeze([]);
    this.#edgesByGroup.clear();
    this.#pin = null;
    this.#interactionInstanceId = null;
    this.#request = null;
    this.#running = false;
  }

  #stateCanInteractWithGroup(state: NodeState, otherStates: readonly NodeState[]): boolean {
    if (!state.anchorFrame) return false;
    for (const other of otherStates) {
      if (!other.anchorFrame) continue;
      const distance = Math.hypot(
        other.worldX - state.worldX,
        other.worldY - state.worldY,
        other.worldZ - state.worldZ,
      );
      if (distance <= crossAnchorInteractionRadius(state, other)) return true;
    }
    return false;
  }

  #groupsCanInteract(leftStates: readonly NodeState[], rightStates: readonly NodeState[]): boolean {
    for (const left of leftStates) {
      if (this.#stateCanInteractWithGroup(left, rightStates)) return true;
    }
    return false;
  }

  #applyPairForces(left: NodeState, right: NodeState, crossAnchor: boolean): void {
    let leftDx: number;
    let leftDy: number;
    let leftDz: number;
    let rightDx: number;
    let rightDy: number;
    let rightDz: number;
    let distance: number;

    if (crossAnchor) {
      const leftFrame = left.anchorFrame;
      const rightFrame = right.anchorFrame;
      if (!leftFrame || !rightFrame) return;

      const worldDx = right.worldX - left.worldX;
      const worldDy = right.worldY - left.worldY;
      const worldDz = right.worldZ - left.worldZ;
      distance = Math.hypot(worldDx, worldDy, worldDz);
      if (distance > crossAnchorInteractionRadius(left, right)) return;

      leftDx =
        leftFrame.east[0] * worldDx + leftFrame.east[1] * worldDy + leftFrame.east[2] * worldDz;
      leftDy =
        leftFrame.north[0] * worldDx + leftFrame.north[1] * worldDy + leftFrame.north[2] * worldDz;
      leftDz = leftFrame.up[0] * worldDx + leftFrame.up[1] * worldDy + leftFrame.up[2] * worldDz;
      rightDx =
        rightFrame.east[0] * worldDx + rightFrame.east[1] * worldDy + rightFrame.east[2] * worldDz;
      rightDy =
        rightFrame.north[0] * worldDx +
        rightFrame.north[1] * worldDy +
        rightFrame.north[2] * worldDz;
      rightDz =
        rightFrame.up[0] * worldDx + rightFrame.up[1] * worldDy + rightFrame.up[2] * worldDz;
    } else {
      leftDx = right.x - left.x;
      leftDy = right.y - left.y;
      leftDz = right.z - left.z;
      rightDx = leftDx;
      rightDy = leftDy;
      rightDz = leftDz;
      distance = Math.hypot(leftDx, leftDy, leftDz);
    }

    let leftUnitX: number;
    let leftUnitY: number;
    let leftUnitZ: number;
    let rightUnitX: number;
    let rightUnitY: number;
    let rightUnitZ: number;

    if (distance < 0.001) {
      const [seedX, seedY] = seededOffset(right.node.id);
      const seedDistance = Math.max(0.001, Math.hypot(seedX, seedY));
      leftUnitX = seedX / seedDistance;
      leftUnitY = seedY / seedDistance;
      leftUnitZ = 0;

      if (crossAnchor && left.anchorFrame && right.anchorFrame) {
        const leftFrame = left.anchorFrame;
        const rightFrame = right.anchorFrame;
        const worldUnitX = leftFrame.east[0] * leftUnitX + leftFrame.north[0] * leftUnitY;
        const worldUnitY = leftFrame.east[1] * leftUnitX + leftFrame.north[1] * leftUnitY;
        const worldUnitZ = leftFrame.east[2] * leftUnitX + leftFrame.north[2] * leftUnitY;
        rightUnitX =
          rightFrame.east[0] * worldUnitX +
          rightFrame.east[1] * worldUnitY +
          rightFrame.east[2] * worldUnitZ;
        rightUnitY =
          rightFrame.north[0] * worldUnitX +
          rightFrame.north[1] * worldUnitY +
          rightFrame.north[2] * worldUnitZ;
        rightUnitZ =
          rightFrame.up[0] * worldUnitX +
          rightFrame.up[1] * worldUnitY +
          rightFrame.up[2] * worldUnitZ;
      } else {
        rightUnitX = leftUnitX;
        rightUnitY = leftUnitY;
        rightUnitZ = leftUnitZ;
      }
      distance = 0.001;
    } else {
      leftUnitX = leftDx / distance;
      leftUnitY = leftDy / distance;
      leftUnitZ = leftDz / distance;
      rightUnitX = rightDx / distance;
      rightUnitY = rightDy / distance;
      rightUnitZ = rightDz / distance;
    }

    const hardMinimumDistance = left.node.collisionRadiusMeters + right.node.collisionRadiusMeters;
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

    this.#addForce(left, -leftUnitX * magnitude, -leftUnitY * magnitude, -leftUnitZ * magnitude);
    this.#addForce(right, rightUnitX * magnitude, rightUnitY * magnitude, rightUnitZ * magnitude);
  }

  #applyEdgeForce(edge: WorldForceEdge, source: NodeState, target: NodeState): void {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const unitX = dx / distance;
    const unitY = dy / distance;
    const magnitude = (distance - edge.restLengthMeters) * edge.strength * 0.01;

    this.#addForce(source, unitX * magnitude, unitY * magnitude, 0);
    this.#addForce(target, -unitX * magnitude, -unitY * magnitude, 0);
  }

  #applyPlaceDomainConstraint(state: NodeState, domain: PlaceDomain | null, dt: number): number {
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
    const relaxation = Math.min(0.45, this.#options.anchorStrength * anchor.influence * 24);
    if (relaxation <= 0) return 0;
    const desiredCorrection = radialError * (1 - (1 - relaxation) ** dt);
    const maxCorrection =
      Math.max(
        state.node.collisionRadiusMeters * 2,
        Math.sqrt(Math.abs(radialError)) * PLACE_DOMAIN_CORRECTION_SQRT_SCALE,
      ) * dt;
    const correction =
      Math.sign(desiredCorrection) * Math.min(Math.abs(desiredCorrection), maxCorrection);

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

  #applyLayoutTargetForce(state: NodeState): void {
    const east = state.node.layoutTargetEastMeters;
    const north = state.node.layoutTargetNorthMeters;
    const strength = state.node.layoutTargetStrength ?? 0;
    if (
      east === undefined ||
      north === undefined ||
      !Number.isFinite(east) ||
      !Number.isFinite(north) ||
      !Number.isFinite(strength) ||
      strength <= 0
    ) {
      return;
    }

    this.#addForce(state, (east - state.x) * strength, (north - state.y) * strength, 0);
  }

  #applyAnchorBiasForce(state: NodeState): void {
    const bias = state.anchorBias;
    if (!bias || bias.strength <= 0) return;
    const strength =
      this.#options.anchorStrength * bias.strength * MULTI_ANCHOR_BIAS_STRENGTH_SCALE;
    this.#addForce(
      state,
      (bias.eastMeters - state.x) * strength,
      (bias.northMeters - state.y) * strength,
      0,
    );
  }

  #applyAltitudeForce(state: NodeState): void {
    const delta = state.node.targetVisualAltitudeMeters - state.z;
    this.#addForce(state, 0, 0, delta * this.#options.altitudeStrength);
  }

  #addForce(state: NodeState, x: number, y: number, z: number): void {
    state.forceX += x;
    state.forceY += y;
    state.forceZ += z;
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("ReferenceWorldForceSimulation has been destroyed.");
  }
}
