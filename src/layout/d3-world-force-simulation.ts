/// <reference path="../types/d3-force.d.ts" />

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type ForceX,
  type ForceY,
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

interface D3WorldNodeState extends SimulationNodeDatum {
  readonly id: WorldInstanceId;
  readonly node: WorldForceNode;
  readonly group: string;
  readonly placeId: PlaceId | null;
  readonly anchor: WorldForceAnchor | null;
  z: number;
  vz: number;
}

interface D3WorldLink extends SimulationLinkDatum<D3WorldNodeState> {
  readonly edge: WorldForceEdge;
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

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function sameStringSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
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
      const [seedX, seedY] = explicit
        ? [node.initialEastMeters, node.initialNorthMeters]
        : seededOffset(node.id);

      next.set(node.id, {
        id: node.id,
        node,
        group,
        placeId: anchor?.placeId ?? null,
        anchor,
        x: prior?.group === group ? (prior.x ?? seedX) : seedX,
        y: prior?.group === group ? (prior.y ?? seedY) : seedY,
        vx: prior?.group === group ? (prior.vx ?? 0) : 0,
        vy: prior?.group === group ? (prior.vy ?? 0) : 0,
        fx: prior?.group === group ? prior.fx : null,
        fy: prior?.group === group ? prior.fy : null,
        z: prior?.group === group ? prior.z : node.targetVisualAltitudeMeters,
        vz: prior?.group === group ? prior.vz : 0,
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
    }

    if (request.reason === "idle") {
      this.stop();
      this.#settled = true;
      return;
    }

    this.#running = true;
    this.#settled = false;
    const alpha = Math.max(request.excitation, request.reheat ? DEFAULT_ALPHA : DRAG_MOVE_ALPHA_FLOOR);
    const interactionGroup =
      interactionReason && this.#interactionGroupKey !== null
        ? (this.#groups.get(this.#interactionGroupKey) ?? null)
        : null;
    const groups = interactionGroup ? [interactionGroup] : [...this.#groups.values()];
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
    const interactionReason =
      this.#requestReason === "drag" || this.#requestReason === "post-drop";
    const interactionGroup =
      interactionReason && this.#interactionGroupKey !== null
        ? (this.#groups.get(this.#interactionGroupKey) ?? null)
        : null;
    const groups = interactionGroup ? [interactionGroup] : [...this.#groups.values()];

    let settled = true;
    for (const group of groups) {
      if (interactionReason) this.#refreshGroupForceStrengths(group);
      group.simulation.tick(ticks);
      this.#stepAltitude(group.nodes, ticks);
      for (const state of group.nodes) this.#dirtyStateIds.add(state.id);
      if (group.simulation.alpha() > group.simulation.alphaMin()) settled = false;
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
      const linksDetached =
        placeId !== null && this.#detachedLinkPlaces.has(String(placeId));
      const activeDragGroup =
        this.#pin !== null && this.#states.get(this.#pin.instanceId)?.group === key;

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
  }

  #linkStrength(
    groupKey: string,
    maximumRadiusMeters: number,
    link: D3WorldLink,
  ): number {
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
    const collapsed =
      group.placeId !== null && this.#clusteredPlaces.has(String(group.placeId));
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
