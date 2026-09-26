/// <reference path="../types/d3-force.d.ts" />

import {
  type ForceLink,
  type ForceX,
  type ForceY,
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

const NORMAL_MANY_BODY_STRENGTH = -2_600;
const COLLAPSE_MANY_BODY_STRENGTH = -1_400;
const NORMAL_ANCHOR_STRENGTH = 0.006;
const COLLAPSE_ANCHOR_STRENGTH = 0.08;
const COLLISION_STRENGTH = 0.82;
const COLLISION_ITERATIONS = 3;
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
 * A committed temporal re-anchor can rebase a survivor hundreds or thousands
 * of kilometres from its new place while preserving the exact visible frame.
 * Ordinary anchor forces are alpha-scaled and can cool before traversing that
 * distance, so changed-place survivors get one temporary D3 force whose
 * acceleration is independent of alpha. It releases once the node is back
 * inside ordinary local-graph scale; the normal anchor/DAG/link forces then
 * own final equilibrium.
 */
const PROJECTION_HANDOFF_FORCE_STRENGTH = 0.03;
const PROJECTION_HANDOFF_RELEASE_ERROR_METERS = 1_000;
const CROSS_PLACE_COLLISION_TICKS = 3;
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

interface D3CrossPlaceCollisionProbe extends SimulationNodeDatum {
  readonly state: D3WorldNodeState;
  readonly collisionRadiusMeters: number;
}

interface D3WorldGroup {
  readonly key: string;
  readonly placeId: PlaceId | null;
  readonly nodes: readonly D3WorldNodeState[];
  readonly maximumRadiusMeters: number;
  readonly linkForce: ForceLink<D3WorldNodeState, D3WorldLink> | null;
  readonly anchorXForce: ForceX<D3WorldNodeState>;
  readonly anchorYForce: ForceY<D3WorldNodeState>;
  readonly dagXForce: ForceX<D3WorldNodeState>;
  readonly dagYForce: ForceY<D3WorldNodeState>;
  readonly simulation: Simulation<D3WorldNodeState, SimulationLinkDatum<D3WorldNodeState>>;
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
  #pin: WorldForcePin | null = null;
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
        z:
          sameGroup
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
      this.#interactionGroupKey = this.#states.get(this.#pin.instanceId)?.group ?? null;
    } else if (
      this.#interactionGroupKey !== null &&
      ![...this.#states.values()].some((state) => state.group === this.#interactionGroupKey)
    ) {
      this.#interactionGroupKey = null;
    }
    this.#rebuildGroups(true);
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
      // Preserve the released group through post-drop settling so unrelated
      // places stay asleep.
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
      if (!this.#pin) this.#interactionGroupKey = null;
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

    if (this.#requestReason === "drag" && this.#stepCrossPlaceDragCollision()) {
      settled = false;
    }

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
      const maximumRestLength = Math.max(
        maximumRadius * 4,
        ...links.map((link) => link.edge.restLengthMeters),
      );

      const simulation = forceSimulation<D3WorldNodeState>(nodes as D3WorldNodeState[])
        .stop()
        .alphaMin(ALPHA_MIN)
        .alphaDecay(ALPHA_DECAY)
        .alphaTarget(0);

      const linkForce =
        links.length > 0
          ? forceLink<D3WorldNodeState, D3WorldLink>(links)
              .id((node) => node.id)
              .distance((link) => Math.max(link.edge.restLengthMeters, maximumRadius * 2))
              .strength((link) => this.#linkStrength(key, maximumRadius, link))
          : null;
      simulation.force("link", linkForce);

      simulation.force(
        "charge",
        forceManyBody<D3WorldNodeState>()
          .strength(collapsed ? COLLAPSE_MANY_BODY_STRENGTH : NORMAL_MANY_BODY_STRENGTH)
          .distanceMin(maximumRadius)
          .distanceMax(Math.max(7_200, maximumRestLength * 4)),
      );
      simulation.force(
        "collision",
        forceCollide<D3WorldNodeState>()
          .radius((node) => node.node.collisionRadiusMeters)
          .strength(COLLISION_STRENGTH)
          .iterations(COLLISION_ITERATIONS),
      );

      const anchorXForce = forceX<D3WorldNodeState>(0).strength((node) =>
        this.#anchorStrength(key, collapsed, node),
      );
      const anchorYForce = forceY<D3WorldNodeState>(0).strength((node) =>
        this.#anchorStrength(key, collapsed, node),
      );
      simulation.force("anchor-x", anchorXForce);
      simulation.force("anchor-y", anchorYForce);
      simulation.force("projection-handoff", projectionHandoffForce());

      // Preserve the current d3-dag organizational targets as soft forces.
      // They guide expanded topology without snapping and are disabled while
      // the place is collapsing into its geographic anchor.
      const dagXForce = forceX<D3WorldNodeState>(
        (state) => state.node.layoutTargetEastMeters ?? state.x ?? 0,
      ).strength((state) => this.#dagStrength(key, collapsed, state));
      const dagYForce = forceY<D3WorldNodeState>(
        (state) => state.node.layoutTargetNorthMeters ?? state.y ?? 0,
      ).strength((state) => this.#dagStrength(key, collapsed, state));
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

  #stepCrossPlaceDragCollision(): boolean {
    if (!this.#pin) return false;
    const pinnedState = this.#states.get(this.#pin.instanceId);
    if (!pinnedState?.anchor) return false;
    const pinnedPosition = geographicPosition(pinnedState);
    if (!pinnedPosition) return false;

    const partners = [...this.#states.values()].flatMap((state) => {
      if (state.group === pinnedState.group || !state.anchor) return [];
      const position = geographicPosition(state);
      if (!position) return [];
      const collisionDistance =
        pinnedState.node.collisionRadiusMeters + state.node.collisionRadiusMeters;
      if (surfaceDistanceMeters(pinnedPosition, position) >= collisionDistance) return [];
      const [eastMeters, northMeters] = tangentOffsetMeters(pinnedPosition, position);
      return [
        {
          state,
          position,
          eastMeters,
          northMeters,
        },
      ];
    });
    if (partners.length === 0) return false;

    const probes: D3CrossPlaceCollisionProbe[] = [
      {
        state: pinnedState,
        collisionRadiusMeters: pinnedState.node.collisionRadiusMeters,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
      },
      ...partners.map(({ state, eastMeters, northMeters }) => ({
        state,
        collisionRadiusMeters: state.node.collisionRadiusMeters,
        x: eastMeters,
        y: northMeters,
        vx: 0,
        vy: 0,
      })),
    ];

    const collisionSimulation = forceSimulation<D3CrossPlaceCollisionProbe>(probes)
      .stop()
      .alphaMin(ALPHA_MIN)
      .alphaDecay(ALPHA_DECAY)
      .alphaTarget(0);
    collisionSimulation.force(
      "collision",
      forceCollide<D3CrossPlaceCollisionProbe>()
        .radius((probe) => probe.collisionRadiusMeters)
        .strength(COLLISION_STRENGTH)
        .iterations(COLLISION_ITERATIONS),
    );
    collisionSimulation.tick(CROSS_PLACE_COLLISION_TICKS);
    collisionSimulation.stop();

    let moved = false;
    for (let index = 1; index < probes.length; index += 1) {
      const probe = probes[index];
      if (!probe?.state.anchor) continue;
      const partner = partners[index - 1];
      if (!partner) continue;

      const nextEast = probe.x ?? partner.eastMeters;
      const nextNorth = probe.y ?? partner.northMeters;
      if (
        Math.abs(nextEast - partner.eastMeters) <= Number.EPSILON &&
        Math.abs(nextNorth - partner.northMeters) <= Number.EPSILON
      ) {
        continue;
      }

      const nextGeographic = geographicFromTangentOffset(
        pinnedPosition,
        nextEast,
        nextNorth,
      );
      const [localEast, localNorth] = localOffsetForGeographicPosition(
        probe.state.anchor,
        nextGeographic,
      );
      probe.state.x = localEast;
      probe.state.y = localNorth;
      probe.state.vx = 0;
      probe.state.vy = 0;
      this.#dirtyStateIds.add(probe.state.id);
      this.#interactionCollisionGroupKeys.add(probe.state.group);
      const group = this.#groups.get(probe.state.group);
      if (group) {
        group.simulation.alpha(Math.max(group.simulation.alpha(), DRAG_MOVE_ALPHA_FLOOR));
      }
      moved = true;
    }

    return moved;
  }

  #linkStrength(groupKey: string, maximumRadiusMeters: number, link: D3WorldLink): number {
    const baseStrength = Math.max(0, link.edge.strength);
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
    const restLength = Math.max(link.edge.restLengthMeters, maximumRadiusMeters * 2);
    const extension = distance - restLength;
    const maximumStretch = Math.max(1, restLength) * INTERACTION_EDGE_MAX_STRETCH_SCALE;
    if (extension <= maximumStretch) return baseStrength;
    return baseStrength * (maximumStretch / extension);
  }

  #anchorStrength(groupKey: string, collapsed: boolean, state: D3WorldNodeState): number {
    const activePinGroup =
      this.#pin !== null && this.#states.get(this.#pin.instanceId)?.group === groupKey;
    if (activePinGroup || !state.anchor) return 0;

    const baseStrength = collapsed
      ? COLLAPSE_ANCHOR_STRENGTH
      : NORMAL_ANCHOR_STRENGTH * Math.max(0, Math.min(1, state.anchor.influence));
    const postDropLimited =
      this.#requestReason === "post-drop" && this.#interactionGroupKey === groupKey;
    if (!postDropLimited) return baseStrength;

    const error = Math.hypot(state.x ?? 0, state.y ?? 0);
    if (error <= INTERACTION_FORCE_MAX_ERROR_METERS) return baseStrength;
    return baseStrength * (INTERACTION_FORCE_MAX_ERROR_METERS / error);
  }

  #dagStrength(groupKey: string, collapsed: boolean, state: D3WorldNodeState): number {
    if (collapsed) return 0;
    const baseStrength = Math.max(0, state.node.layoutTargetStrength ?? 0);
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
        this.#linkStrength(group.key, group.maximumRadiusMeters, link),
      );
    }
    const collapsed = group.placeId !== null && this.#clusteredPlaces.has(String(group.placeId));
    group.anchorXForce.strength((state) => this.#anchorStrength(group.key, collapsed, state));
    group.anchorYForce.strength((state) => this.#anchorStrength(group.key, collapsed, state));
    group.dagXForce.strength((state) => this.#dagStrength(group.key, collapsed, state));
    group.dagYForce.strength((state) => this.#dagStrength(group.key, collapsed, state));
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
