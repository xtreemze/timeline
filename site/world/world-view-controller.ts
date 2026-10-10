import type { PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import {
  createInteractionCoordinator,
  type InteractionCompletionReason,
  type InteractionCoordinator,
} from "../../src/interaction/interaction-coordinator.ts";
import {
  createWorldNodeDragController,
  type WorldNodeDragPosition,
} from "../../src/interaction/world-node-drag-controller.ts";
import type {
  WorldDagCoordinateStrategy,
  WorldDagEdgeStyle,
  WorldDagLayoutAlgorithm,
  WorldDagLayoutOrientation,
  WorldDagLayoutPlaceOverride,
  WorldDagLayoutStrategy,
} from "../../src/layout/world-dag-layout.ts";
import {
  applyWorldForceLayoutUpdate,
  updateWorldForceLayoutInstance,
  type WorldForceLayoutSample,
} from "../../src/layout/world-force-layout.ts";
import {
  createWorldForceScene,
  type WorldForceScenePolicy,
} from "../../src/layout/world-force-scene.ts";
import {
  createWorldSimulationCoordinator,
  type WorldForceSimulationBackend,
  type WorldForceTuning,
} from "../../src/layout/world-force-simulation.ts";
import { preserveWorldProjectionRenderContinuity } from "../../src/layout/world-geographic-position.ts";
import type {
  WorldRenderContinuitySample,
  WorldSelection,
  WorldSurface,
  WorldTemporalWindow,
} from "../../src/layout/world-surface.ts";
import type {
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldProjection,
} from "../../src/projection/world-projection.ts";
import {
  diffWorldProjection,
  isEmptyWorldProjectionDelta,
} from "../../src/projection/world-projection-delta.ts";

export interface WorldLayoutReadback {
  read(): readonly WorldForceLayoutSample[];
}

export interface WorldDagOperatorSettings {
  /** "auto" follows the live viewport orientation. */
  readonly orientation?: WorldDagLayoutOrientation | "auto";
  readonly algorithm?: WorldDagLayoutAlgorithm;
  readonly strategy?: WorldDagLayoutStrategy;
  readonly coordinate?: WorldDagCoordinateStrategy;
  readonly edgeStyle?: WorldDagEdgeStyle;
  /** Omit for global layout; set to reorganize only this authored place. */
  readonly placeId?: PlaceId;
}

/**
 * Execution-only bridge for a GPU-resident force backend.
 *
 * Implementations may bind backend-owned luma resources directly into the
 * WorldSurface execution path. The bridge deliberately exposes no GPU handles
 * to projection/domain code and avoids requiring per-frame CPU position
 * readback simply to render simulation results.
 */
export interface WorldGpuLayoutBridge {
  syncFrame(): void;
  destroy(): void;
}

export interface WorldViewRuntimeOptions {
  readonly surface: WorldSurface;
  readonly forceBackend: WorldForceSimulationBackend;
  readonly interaction?: InteractionCoordinator;
  readonly forcePolicy?: WorldForceScenePolicy;
  readonly layoutReadback?: WorldLayoutReadback;
  readonly gpuLayoutBridge?: WorldGpuLayoutBridge;
}

export interface WorldViewRuntimeState {
  readonly projectionRevision: number;
  readonly hasProjection: boolean;
  readonly simulationRunning: boolean;
  readonly simulationSettled: boolean;
  readonly dragging: boolean;
  readonly settlingDrag: boolean;
}

/** Minimum simulated time between passive layout pushes to the surface. */
export const WORLD_LAYOUT_PUSH_INTERVAL_MS = 50;
/** Cap CPU readback/layer rebuilds during direct manipulation at roughly 60 Hz. */
export const WORLD_DRAG_LAYOUT_PUSH_INTERVAL_MS = 16;

export class WorldViewRuntimeController {
  readonly #surface: WorldSurface;
  readonly #forceBackend: WorldForceSimulationBackend;
  readonly #simulation;
  readonly #interaction: InteractionCoordinator;
  readonly #drag;
  readonly #forcePolicy?: WorldForceScenePolicy;
  readonly #layoutReadback?: WorldLayoutReadback;
  readonly #gpuLayoutBridge?: WorldGpuLayoutBridge;

  #sourceProjection: WorldProjection | null = null;
  #renderProjection: WorldProjection | null = null;
  #previewProjection: WorldProjection | null = null;
  #sourceInstances = new Map<WorldInstanceId, ProjectedWorldInstance>();
  #renderOverrides = new Map<WorldInstanceId, ProjectedWorldInstance>();
  #renderProjectionDirty = false;
  #projectionRevision = 0;
  #viewportDagOrientation: WorldDagLayoutOrientation = "top-to-bottom";
  #globalDagOrientation: WorldDagLayoutOrientation | null = null;
  #globalDagAlgorithm: WorldDagLayoutAlgorithm | undefined;
  #globalDagStrategy: WorldDagLayoutStrategy = "longest-auto-greedy";
  #globalDagCoordinate: WorldDagCoordinateStrategy = "greedy";
  #globalDagEdgeStyle: WorldDagEdgeStyle = "routed";
  #dagPlaceOverrides = new Map<PlaceId, WorldDagLayoutPlaceOverride>();
  #sinceLayoutPush = Number.POSITIVE_INFINITY;
  #cameraInteractionActive = false;
  #destroyed = false;

  constructor(options: WorldViewRuntimeOptions) {
    if (options.layoutReadback && options.gpuLayoutBridge) {
      throw new Error(
        "World layout readback and GPU layout bridge are mutually exclusive execution paths.",
      );
    }

    this.#surface = options.surface;
    this.#forceBackend = options.forceBackend;
    this.#interaction = options.interaction ?? createInteractionCoordinator();
    this.#simulation = createWorldSimulationCoordinator(this.#forceBackend);
    this.#drag = createWorldNodeDragController(
      this.#interaction,
      this.#simulation,
      this.#forceBackend,
    );
    this.#forcePolicy = options.forcePolicy;
    this.#layoutReadback = options.layoutReadback;
    this.#gpuLayoutBridge = options.gpuLayoutBridge;
  }

  setProjection(projection: WorldProjection): void {
    this.#assertAlive();

    // A settled timeline commit reconciles from the exact transient frame the
    // user was seeing, while force ownership remains on the prior committed
    // projection until this method installs the new scene.
    const hadPreview = this.#previewProjection !== null;
    const previous =
      this.#previewProjection ?? (this.#sourceProjection ? this.getRenderProjection() : null);
    const renderedContinuity:
      | ReadonlyMap<WorldInstanceId, WorldRenderContinuitySample>
      | undefined = previous ? this.#surface.getRenderedInstanceContinuity?.() : undefined;
    const legacyRenderedPositions =
      previous && !renderedContinuity ? this.#surface.getRenderedInstancePositions?.() : undefined;
    const renderProjection = previous
      ? preserveWorldProjectionRenderContinuity(
          previous,
          projection,
          renderedContinuity,
          legacyRenderedPositions,
        )
      : projection;

    if (renderedContinuity && renderedContinuity.size > 0) {
      this.#surface.setProjectionHandoffPresentation?.(renderedContinuity);
    } else if (previous) {
      this.#surface.clearProjectionHandoffPresentation?.();
    }

    this.#sourceProjection = projection;
    this.#renderProjection = renderProjection;
    this.#sourceInstances = new Map(
      projection.instances.map((instance) => [instance.id, instance] as const),
    );
    this.#renderOverrides.clear();
    for (const instance of renderProjection.instances) {
      const source = this.#sourceInstances.get(instance.id);
      if (source && source !== instance) this.#renderOverrides.set(instance.id, instance);
    }
    this.#renderProjectionDirty = false;
    this.#previewProjection = null;
    this.#projectionRevision += 1;

    // Canonical/new projection data owns force targets, topology, and DAG
    // orientation. The continuity projection supplies only the initial pose so
    // the first visible committed frame and first physics frame agree without
    // turning handoff offsets or altitude into permanent solver targets.
    const forceScene = createWorldForceScene(projection, this.#forcePolicy, {
      dagOrientation: this.#effectiveDagOrientation(),
      dagAlgorithm: this.#globalDagAlgorithm,
      dagStrategy: this.#globalDagStrategy,
      dagCoordinate: this.#globalDagCoordinate,
      dagEdgeStyle: this.#globalDagEdgeStyle,
      dagPlaceOverrides: this.#dagPlaceOverrides,
      initialProjection: renderProjection,
    });
    this.#forceBackend.setScene(forceScene);
    this.#surface.setRelationshipRoutes?.(forceScene.relationshipRoutes ?? Object.freeze([]));
    this.#simulation.request({
      reason: "projection-update",
      excitation: 0.08,
      reheat: true,
    });

    if (hadPreview) {
      // Commit the preview through the ordinary surface path even when the
      // visible topology is identical, so deferred clustering/fit lifecycle
      // reconciles exactly once at the settled boundary.
      this.#surface.setProjection(renderProjection);
      return;
    }

    if (previous && this.#surface.applyProjectionDelta) {
      const delta = diffWorldProjection(previous, renderProjection);
      if (!isEmptyWorldProjectionDelta(delta)) this.#surface.applyProjectionDelta(delta);
      return;
    }

    this.#surface.setProjection(renderProjection);
  }

  previewProjection(projection: WorldProjection): void {
    this.#assertAlive();
    const previous =
      this.#previewProjection ?? (this.#sourceProjection ? this.getRenderProjection() : null);
    const renderedContinuity:
      | ReadonlyMap<WorldInstanceId, WorldRenderContinuitySample>
      | undefined = previous ? this.#surface.getRenderedInstanceContinuity?.() : undefined;
    const legacyRenderedPositions =
      previous && !renderedContinuity ? this.#surface.getRenderedInstancePositions?.() : undefined;
    const renderProjection = previous
      ? preserveWorldProjectionRenderContinuity(
          previous,
          projection,
          renderedContinuity,
          legacyRenderedPositions,
        )
      : projection;

    this.#previewProjection = renderProjection;
    if (this.#surface.previewProjection) {
      this.#surface.previewProjection(renderProjection);
      return;
    }
    this.#surface.setProjection(renderProjection);
  }

  setTemporalWindow(window: WorldTemporalWindow): void {
    this.#assertAlive();
    this.#surface.setTemporalWindow(window);
  }

  setClusteredPlaceIds(
    placeIds: readonly PlaceId[],
    detachedLinkPlaceIds?: readonly PlaceId[],
  ): void {
    this.#assertAlive();
    this.#forceBackend.setClusteredPlaceIds?.(placeIds, detachedLinkPlaceIds);
    this.#simulation.request({
      reason: "topology",
      excitation: 0.14,
      reheat: true,
    });
  }

  /**
   * Reorient Sugiyama flow to the current viewport without changing authored
   * geography. D3 preserves same-place live state while new targets become soft
   * forces, so an orientation transition reorganizes instead of snapping.
   */
  setDagOrientation(orientation: WorldDagLayoutOrientation): boolean {
    this.#assertAlive();
    if (orientation === this.#viewportDagOrientation) return false;
    const previousEffective = this.#effectiveDagOrientation();
    this.#viewportDagOrientation = orientation;
    const effective = this.#effectiveDagOrientation();
    if (effective === previousEffective) return false;
    if (!this.#sourceProjection) return true;

    const projection = this.getRenderProjection() ?? this.#sourceProjection;
    const forceScene = createWorldForceScene(projection, this.#forcePolicy, {
      dagOrientation: effective,
      dagAlgorithm: this.#globalDagAlgorithm,
      dagStrategy: this.#globalDagStrategy,
      dagCoordinate: this.#globalDagCoordinate,
      dagEdgeStyle: this.#globalDagEdgeStyle,
      dagPlaceOverrides: this.#dagPlaceOverrides,
    });
    this.#forceBackend.setScene(forceScene);
    this.#surface.setRelationshipRoutes?.(forceScene.relationshipRoutes ?? Object.freeze([]));
    this.#reheatTopology(0.18);
    return true;
  }

  /**
   * Rebuild local D3 DAG targets and route hints for the current projection.
   * Geographic anchors are retained verbatim; only the entity layout around
   * each anchor is reorganized, then D3 force moves toward the new soft targets.
   */
  reorganizeDag(settings: WorldDagOperatorSettings = {}): boolean {
    this.#assertAlive();
    if (!this.#sourceProjection) return false;

    const placeId = settings.placeId;
    if (placeId !== undefined) {
      const previous = this.#dagPlaceOverrides.get(placeId);
      const nextOrientation =
        settings.orientation === undefined
          ? previous?.orientation
          : settings.orientation === "auto"
            ? undefined
            : settings.orientation;
      const nextAlgorithm =
        settings.algorithm === undefined ? previous?.algorithm : settings.algorithm;
      const nextStrategy =
        settings.strategy === undefined
          ? previous?.strategy
          : settings.strategy === "auto"
            ? undefined
            : settings.strategy;
      const nextCoordinate =
        settings.coordinate === undefined ? previous?.coordinate : settings.coordinate;
      const nextEdgeStyle =
        settings.edgeStyle === undefined ? previous?.edgeStyle : settings.edgeStyle;
      if (
        nextOrientation === undefined &&
        nextAlgorithm === undefined &&
        nextStrategy === undefined &&
        nextCoordinate === undefined &&
        nextEdgeStyle === undefined
      ) {
        this.#dagPlaceOverrides.delete(placeId);
      } else {
        this.#dagPlaceOverrides.set(
          placeId,
          Object.freeze({
            ...(nextOrientation === undefined ? {} : { orientation: nextOrientation }),
            ...(nextAlgorithm === undefined ? {} : { algorithm: nextAlgorithm }),
            ...(nextStrategy === undefined ? {} : { strategy: nextStrategy }),
            ...(nextCoordinate === undefined ? {} : { coordinate: nextCoordinate }),
            ...(nextEdgeStyle === undefined ? {} : { edgeStyle: nextEdgeStyle }),
          }),
        );
      }
    } else {
      if (settings.orientation !== undefined) {
        this.#globalDagOrientation = settings.orientation === "auto" ? null : settings.orientation;
      }
      if (settings.algorithm !== undefined) this.#globalDagAlgorithm = settings.algorithm;
      if (settings.strategy !== undefined) this.#globalDagStrategy = settings.strategy;
      if (settings.coordinate !== undefined) this.#globalDagCoordinate = settings.coordinate;
      if (settings.edgeStyle !== undefined) this.#globalDagEdgeStyle = settings.edgeStyle;
    }

    const forceScene = createWorldForceScene(this.#sourceProjection, this.#forcePolicy, {
      reorganizeDag: placeId === undefined,
      ...(placeId === undefined ? {} : { reorganizeDagPlaceId: placeId }),
      dagOrientation: this.#effectiveDagOrientation(),
      dagAlgorithm: this.#globalDagAlgorithm,
      dagStrategy: this.#globalDagStrategy,
      dagCoordinate: this.#globalDagCoordinate,
      dagEdgeStyle: this.#globalDagEdgeStyle,
      dagPlaceOverrides: this.#dagPlaceOverrides,
    });
    this.#forceBackend.setScene(forceScene);
    this.#surface.setRelationshipRoutes?.(forceScene.relationshipRoutes ?? Object.freeze([]));
    this.#reheatTopology(0.18);
    return true;
  }

  setForceTuning(tuning: WorldForceTuning, placeId?: PlaceId): boolean {
    this.#assertAlive();
    if (!this.#sourceProjection || !this.#forceBackend.setTuning) return false;
    this.#forceBackend.setTuning(tuning, placeId === undefined ? {} : { placeId });
    this.#reheatTopology(0.16);
    return true;
  }

  /** Reheat the existing D3 force scene without recomputing DAG targets. */
  relaxForce(): boolean {
    this.#assertAlive();
    if (!this.#sourceProjection) return false;
    this.#reheatTopology(0.14);
    return true;
  }

  setSelection(selection: WorldSelection | null): void {
    this.#assertAlive();
    this.#surface.setSelection(selection);
  }

  setContextRelationships(ids: readonly RelationshipId[]): void {
    this.#assertAlive();
    this.#surface.setContextRelationships?.(ids);
  }

  focusEntity(id: Parameters<WorldSurface["focusEntity"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusEntity(id);
  }

  focusOccurrence(id: Parameters<WorldSurface["focusOccurrence"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusOccurrence(id);
  }

  focusPlace(id: Parameters<WorldSurface["focusPlace"]>[0]): void {
    this.#assertAlive();
    this.#surface.focusPlace(id);
  }

  fitToContent(): boolean {
    this.#assertAlive();
    if (!this.#surface.fitToContent) return false;
    this.#surface.fitToContent();
    return true;
  }

  zoomToContent(): boolean {
    this.#assertAlive();
    if (!this.#surface.zoomToContent) return false;
    this.#surface.zoomToContent();
    return true;
  }

  /**
   * Camera navigation is presentation state only. The surface uses this signal
   * to defer camera-dependent mode/cluster changes, but world physics and
   * layout readback must keep advancing so camera gestures cannot strand the
   * rendered graph in a suspended state.
   */
  setCameraInteractionActive(active: boolean): boolean {
    this.#assertAlive();
    if (this.#cameraInteractionActive === active) return false;
    this.#cameraInteractionActive = active;
    return true;
  }

  beginNodeDrag(
    pointerId: number,
    instanceId: WorldInstanceId,
    position: WorldNodeDragPosition,
  ): boolean {
    this.#assertAlive();
    return this.#drag.begin(pointerId, { instanceId, position });
  }

  updateNodeDrag(pointerId: number, position: WorldNodeDragPosition): boolean {
    this.#assertAlive();
    return this.#drag.update(pointerId, position);
  }

  releaseNodeDrag(pointerId: number): boolean {
    this.#assertAlive();
    return this.#drag.release(pointerId);
  }

  cancelNodeDrag(reason: Exclude<InteractionCompletionReason, "release">): void {
    this.#assertAlive();
    this.#drag.cancel(reason);
  }

  step(deltaMs: number): WorldViewRuntimeState {
    this.#assertAlive();

    this.#forceBackend.step?.(deltaMs);

    // The zero-readback GPU bridge updates positions in place every frame;
    // only the CPU readback path rebuilds layers and is throttled below.
    this.#gpuLayoutBridge?.syncFrame();

    const diagnostics = this.#forceBackend.getDiagnostics();
    // Physics steps every frame, but CPU readback followed by layer rebuilding
    // is substantially more expensive. Passive settling stays at the existing
    // 20 Hz cadence; direct manipulation is capped near 60 Hz so 90/120 Hz
    // displays do not multiply main-thread work without adding visible frames.
    this.#sinceLayoutPush += Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    const dragActive = this.#drag.state().active;
    const pushIntervalMs = dragActive
      ? WORLD_DRAG_LAYOUT_PUSH_INTERVAL_MS
      : WORLD_LAYOUT_PUSH_INTERVAL_MS;
    if (diagnostics.settled || this.#sinceLayoutPush >= pushIntervalMs) {
      this.#pushLayout();
    }

    if (diagnostics.settled) {
      this.#surface.clearProjectionHandoffPresentation?.();
      this.#simulation.release("projection-update");
      this.#simulation.release("spatial-anchor-update");
      this.#simulation.release("topology");
      if (this.#drag.state().settling) this.#drag.commit();
    }

    return this.state();
  }

  /**
   * Ends the current layout run without waiting for the energy criterion:
   * stops the backend, releases the settle-driven simulation holds and
   * commits a drag that was waiting to settle. Used when the frame budget
   * for a run is spent (slow devices can otherwise animate indefinitely).
   */
  settle(): void {
    this.#assertAlive();
    this.#forceBackend.stop();
    this.#pushLayout();
    this.#surface.clearProjectionHandoffPresentation?.();
    this.#simulation.release("projection-update");
    this.#simulation.release("spatial-anchor-update");
    this.#simulation.release("topology");
    if (this.#drag.state().settling) this.#drag.commit();
  }

  #pushLayout(): void {
    this.#sinceLayoutPush = 0;
    if (this.#gpuLayoutBridge || !this.#layoutReadback || !this.#sourceProjection) return;
    const samples = this.#layoutReadback.read();
    if (samples.length === 0) return;

    // Production WorldSurface implementations support sparse projection deltas.
    // Keep this interaction path O(changed nodes): materializing the immutable
    // projection array here would otherwise copy tens of thousands of instances
    // for every drag frame even when only one local island moved.
    if (this.#surface.applyProjectionDelta) {
      const updatedInstances: ProjectedWorldInstance[] = [];
      const seen = new Set<WorldInstanceId>();

      for (const sample of samples) {
        if (seen.has(sample.instanceId)) {
          throw new Error(`Duplicate world force layout sample for ${String(sample.instanceId)}.`);
        }
        seen.add(sample.instanceId);

        const current =
          this.#renderOverrides.get(sample.instanceId) ??
          this.#sourceInstances.get(sample.instanceId);
        if (!current) {
          throw new Error(
            `World force layout sample references unknown instance ${String(sample.instanceId)}.`,
          );
        }

        const updated = updateWorldForceLayoutInstance(current, sample);
        if (updated === current) continue;
        this.#renderOverrides.set(sample.instanceId, updated);
        updatedInstances.push(updated);
      }

      if (updatedInstances.length > 0) {
        this.#renderProjectionDirty = true;
        if (this.#previewProjection) return;
        this.#surface.applyProjectionDelta(
          Object.freeze({
            addedInstances: Object.freeze([]),
            updatedInstances: Object.freeze(updatedInstances),
            removedInstanceIds: Object.freeze([]),
            addedEdges: Object.freeze([]),
            updatedEdges: Object.freeze([]),
            removedEdgeIds: Object.freeze([]),
          }),
        );
      }
      return;
    }

    // Compatibility surfaces that only accept complete projections retain the
    // original immutable reconstruction path.
    const previous = this.#renderProjection ?? this.#sourceProjection;
    const update = applyWorldForceLayoutUpdate(previous, samples);
    this.#renderProjection = update.projection;
    if (this.#previewProjection) return;
    this.#surface.setProjection(update.projection);
  }

  refresh(): void {
    this.#assertAlive();
    this.#surface.refresh();
  }

  state(): WorldViewRuntimeState {
    const diagnostics = this.#forceBackend.getDiagnostics();
    const drag = this.#drag.state();

    return Object.freeze({
      projectionRevision: this.#projectionRevision,
      hasProjection: this.#sourceProjection !== null,
      simulationRunning: diagnostics.running,
      simulationSettled: diagnostics.settled,
      dragging: drag.active,
      settlingDrag: drag.settling,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#simulation.clear();
    this.#gpuLayoutBridge?.destroy();
    this.#sourceInstances.clear();
    this.#renderOverrides.clear();
    this.#renderProjectionDirty = false;
    this.#previewProjection = null;
    this.#forceBackend.destroy();
    this.#surface.destroy();
  }

  getInteractionCoordinator(): InteractionCoordinator {
    return this.#interaction;
  }

  getRenderProjection(): WorldProjection | null {
    if (!this.#sourceProjection) return null;
    if (!this.#renderProjectionDirty) return this.#renderProjection ?? this.#sourceProjection;

    // Materialize only for consumers that explicitly need a complete snapshot.
    // High-frequency rendering consumes sparse deltas and never pays this O(N)
    // copy during ordinary drag/settle frames.
    this.#renderProjection = Object.freeze({
      instances: Object.freeze(
        this.#sourceProjection.instances.map(
          (instance) => this.#renderOverrides.get(instance.id) ?? instance,
        ),
      ),
      edges: this.#sourceProjection.edges,
    });
    this.#renderProjectionDirty = false;
    return this.#renderProjection;
  }

  #effectiveDagOrientation(): WorldDagLayoutOrientation {
    return this.#globalDagOrientation ?? this.#viewportDagOrientation;
  }

  #reheatTopology(excitation: number): void {
    // Releasing first makes repeated operator commands meaningful even while a
    // previous topology run is still active.
    this.#simulation.release("topology");
    this.#simulation.request({
      reason: "topology",
      excitation,
      reheat: true,
    });
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error("WorldViewRuntimeController has been destroyed.");
    }
  }
}
