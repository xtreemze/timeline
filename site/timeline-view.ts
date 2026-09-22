/**
 * Timeline retained-scene renderer.
 *
 * Canonical chronology stays outside this adapter. This controller consumes projected
 * occurrences, owns only viewport/interaction state, and keeps keyed DOM identities
 * alive across pan/zoom so rendering does not become a destructive per-frame rebuild.
 */

import {
  beginRetention,
  commitRetention,
  createRenderWindow,
  extendRetention,
  itemOverlapsWindow,
  occurrenceSceneKey,
  queryOccurrences,
  relationshipBandSceneKey,
  temporalAccentSceneKey,
  tickSceneKey,
  visibleIntervalAnchor,
  type TemporalRetentionState,
  type TemporalWindow,
} from "../src/projection/temporal-scene.ts";
import {
  geometryMeasurementKey,
  planCommittedTemporalLayout,
  type TemporalCommittedLayoutPlan,
  type TemporalLayoutCluster,
  type TemporalLayoutMeasurement,
} from "../src/layout/temporal-layout.ts";
import {
  createRetainedTimelineMetrics,
  type RetainedTimelineSummary,
} from "../src/performance/retained-timeline-metrics.ts";
import { TimelineMotion as motion } from "./timeline-motion.ts";
import { TimelineClustering as clustering } from "./timeline-clustering.ts";

const scale = globalThis.TimelineScale;
const presentation = globalThis.TimelinePresentation;

const DEFAULT_SPAN_MS = 86_400_000;
const MIN_SPAN_MS = 1;
const MAX_WHEEL_EXPONENT = 0.045;
const WHEEL_ZOOM_SENSITIVITY = 0.00065;
const OVERSCAN_RATIO = 0.6;
const POINTER_PREDICTION_HORIZON_MS = 260;
const WHEEL_COMMIT_DELAY_MS = 150;
const DOUBLE_TAP_ZOOM_FACTOR = 0.5;
const TOUCH_DOUBLE_TAP_MS = 320;
const TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;
const TOUCH_TAP_MOVE_TOLERANCE_PX = 12;
const CLICK_SUPPRESSION_MS = 450;
const CONNECTOR_ROUTE_OFFSET_PX = 22;
const CONNECTOR_ROUTE_EDGE_INSET_PX = 32;
const MAX_COMMITTED_LANES = 3;
const CLUSTER_ENTER_PX = 80;
const CLUSTER_EXIT_PX = 120;

type Orientation = "horizontal" | "vertical";

interface TimelineItem {
  id: string;
  kind?: string;
  title?: string;
  description?: string;
  categoryName?: string;
  color?: string;
  start: number;
  end?: number | null;
  startLabel?: string;
  endLabel?: string;
  terminalShape?: string;
  connectorStyle?: string;
  connectorRouting?: string;
  connectorWeight?: string;
  connectorEndpoint?: string;
  lane?: number | null;
  media?: Array<{ src?: string; alt?: string; caption?: string }>;
  tags?: Array<string | { label?: string; icon?: string; hue?: number }>;
  layoutVariant?: string;
  locationName?: string;
  location?: unknown;
  evidence?: unknown[];
  relations?: unknown[];
  relationChanges?: unknown[];
  graphContext?: unknown;
  editable?: boolean;
}

interface SemanticTickSpec {
  unit: string;
  step: number;
  approxMs: number;
}

interface TimelineRelationshipBand {
  id: string;
  predicate?: string;
  start: number;
  end: number;
}

interface SetItemsOptions {
  focusId?: string | null;
  allCoordinates?: number[];
  relationships?: TimelineRelationshipBand[];
}

interface SceneRecord {
  item: TimelineItem;
  node: HTMLDivElement;
  terminal: HTMLButtonElement;
  range: HTMLButtonElement | null;
  visual: HTMLSpanElement;
  copy: HTMLSpanElement;
}

interface ClusterSceneRecord {
  cluster: TemporalLayoutCluster;
  node: HTMLDivElement;
  terminal: HTMLButtonElement;
}

interface CachedGeometryMeasurement {
  key: string;
  measurement: TemporalLayoutMeasurement;
}

interface PointerDragState {
  pointerId: number;
  coordinate: number;
  lastTime: number;
  viewport: TemporalWindow;
  samples: Array<{ coordinate: number; time: number }>;
}

interface TouchPointerState {
  pointerId: number;
  x: number;
  y: number;
}

interface PinchState {
  distance: number;
  viewport: TemporalWindow;
  anchorTime: number;
}

interface TouchTapState {
  pointerId: number;
  startX: number;
  startY: number;
  cancelled: boolean;
}

interface LastTouchTap {
  time: number;
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function connectorSegment(axisCoordinate: number, terminalCoordinate: number) {
  const delta = Number(axisCoordinate) - Number(terminalCoordinate);
  if (!Number.isFinite(delta)) throw new TypeError("Connector coordinates must be finite.");
  return {
    offset: Math.min(0, delta),
    length: Math.abs(delta),
  };
}

function connectorRouteOffset(
  routing: string,
  position: number,
  extent: number,
  index = 0,
): number {
  if (routing !== "orthogonal") return 0;
  const anchor = Number(position);
  const available = Number(extent);
  if (!Number.isFinite(anchor) || !Number.isFinite(available) || available <= 0) return 0;
  const inset = Math.min(CONNECTOR_ROUTE_EDGE_INSET_PX, available / 2);
  const min = inset;
  const max = Math.max(inset, available - inset);
  const direction = index % 2 === 0 ? 1 : -1;
  const preferred = clamp(anchor + direction * CONNECTOR_ROUTE_OFFSET_PX, min, max);
  if (Math.abs(preferred - anchor) >= 1) return preferred - anchor;
  return clamp(anchor - direction * CONNECTOR_ROUTE_OFFSET_PX, min, max) - anchor;
}

function wheelZoomFactor(deltaPixels: number): number {
  const exponent = clamp(
    Number(deltaPixels) * WHEEL_ZOOM_SENSITIVITY,
    -MAX_WHEEL_EXPONENT,
    MAX_WHEEL_EXPONENT,
  );
  return Math.exp(exponent);
}

function itemOverlapsViewport(
  item: Pick<TimelineItem, "start" | "end">,
  viewport: TemporalWindow,
): boolean {
  return itemOverlapsWindow(item, viewport);
}

function stableLane(id: string, explicit: number | null | undefined): number {
  if (Number.isInteger(explicit)) return Number(explicit);
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  const magnitude = Math.abs(hash);
  const distance = (magnitude % 3) + 1;
  return magnitude % 2 === 0 ? distance : -distance;
}

function normalizedViewport(start: number, end: number): TemporalWindow {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { start: 0, end: DEFAULT_SPAN_MS };
  if (end > start) return { start, end };
  return { start: start - DEFAULT_SPAN_MS / 2, end: start + DEFAULT_SPAN_MS / 2 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordString(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function formatElapsedDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const units: Array<readonly [string, number]> = [
    ["year", 365.2425 * 86_400_000],
    ["month", 30.4375 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ];
  let remaining = durationMs;
  const parts: string[] = [];
  for (const [label, size] of units) {
    const amount =
      label === "second" ? Math.round(remaining / size) : Math.floor(remaining / size);
    if (amount <= 0) continue;
    parts.push(`${amount} ${label}${amount === 1 ? "" : "s"}`);
    remaining = Math.max(0, remaining - amount * size);
    if (parts.length >= 2) break;
  }
  return parts.length ? parts.join(" ") : "0 seconds";
}

class TimelineViewController {
  root: HTMLElement;
  surface: HTMLElement;
  focusView: HTMLElement;
  readout: HTMLElement;
  orientationToggle: HTMLButtonElement | null;
  zoomSlider: HTMLInputElement | null;
  stage: HTMLDivElement;
  axis: HTMLDivElement;
  semanticList: HTMLOListElement;
  items: TimelineItem[] = [];
  relationships: TimelineRelationshipBand[] = [];
  allCoordinates: number[] = [];
  viewport: TemporalWindow = { start: 0, end: DEFAULT_SPAN_MS };
  renderWindow: TemporalWindow = { start: 0, end: DEFAULT_SPAN_MS };
  retention: TemporalRetentionState = commitRetention(this.renderWindow);
  focusedId: string | null = null;
  focusMediaIndex = 0;
  orientation: Orientation = "horizontal";
  scene = new Map<string, SceneRecord>();
  tickScene = new Map<string, HTMLDivElement>();
  accentScene = new Map<string, HTMLDivElement>();
  relationshipBandScene = new Map<string, HTMLDivElement>();
  relationshipBandZone: HTMLDivElement | null = null;
  committedLayout: TemporalCommittedLayoutPlan = {
    lanes: Object.freeze({}),
    clusters: Object.freeze([]),
    placements: Object.freeze([]),
  };
  committedClusterByItem = new Map<string, string>();
  clusterScene = new Map<string, ClusterSceneRecord>();
  expandedClusterItemIds = new Set<string>();
  geometryMeasurements = new Map<string, CachedGeometryMeasurement>();
  committedTickSpecKey = "";
  committedTickSpec: SemanticTickSpec | null = null;
  performanceMetrics = createRetainedTimelineMetrics();
  frameCreatedObjects = 0;
  frameDestroyedObjects = 0;
  pendingPlannerDurationMs = 0;
  pendingQueryDurationMs = 0;
  pendingDirtyMeasurements = 0;
  pendingBufferExpanded = false;
  pendingInputStartedAt: number | null = null;
  pointerDrag: PointerDragState | null = null;
  touchPointers = new Map<number, TouchPointerState>();
  pinch: PinchState | null = null;
  touchTap: TouchTapState | null = null;
  lastTouchTap: LastTouchTap | null = null;
  suppressClickUntil = 0;
  interactionVelocity = 0;
  inertiaAnimationFrame = 0;
  renderFrame = 0;
  wheelCommitTimer = 0;
  viewportInitialized = false;
  reducedMotionQuery: MediaQueryList | null =
    typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.surface = root.querySelector("#timeline-surface") || root.querySelector(".timeline-surface") || root;
    this.focusView =
      root.querySelector("#timeline-focus-view") || root.querySelector(".timeline-focus-view") || root;
    this.readout =
      root.querySelector("#timeline-window-readout") || root.querySelector(".timeline-window-readout") || root;
    this.orientationToggle = root.querySelector("#timeline-orientation-toggle");
    this.zoomSlider = root.querySelector("#timeline-zoom-level");

    this.stage = document.createElement("div");
    this.stage.className = "timeline-stage timeline-retained-scene";
    this.stage.dataset.sceneState = "empty";
    this.axis = document.createElement("div");
    this.axis.className = "timeline-axis";
    this.stage.append(this.axis);
    this.surface.replaceChildren(this.stage);

    this.semanticList = document.createElement("ol");
    this.semanticList.className = "timeline-semantic-list";
    this.semanticList.setAttribute("aria-label", "Chronological timeline navigation");
    this.semanticList.dataset.semanticChronology = "";
    this.surface.insertAdjacentElement("afterend", this.semanticList);

    this.bind();
    this.applyOrientation();
  }

  bind(): void {
    this.orientationToggle?.addEventListener("click", () => {
      this.setOrientation(this.orientation === "horizontal" ? "vertical" : "horizontal");
    });
    this.zoomSlider?.addEventListener("input", () => {
      this.markInputForNextRender();
      this.setSemanticZoom(Number(this.zoomSlider?.value || 0), false);
    });
    this.zoomSlider?.addEventListener("change", () => {
      this.setSemanticZoom(Number(this.zoomSlider?.value || 0), true);
      this.surface.focus({ preventScroll: true });
    });

    this.surface.addEventListener(
      "wheel",
      (event) => {
        if (!this.items.length) return;
        event.preventDefault();
        const rect = this.surface.getBoundingClientRect();
        const primary =
          this.orientation === "horizontal" ? event.clientX - rect.left : event.clientY - rect.top;
        const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
        const ratio = clamp(primary / length, 0, 1);
        const factor = wheelZoomFactor(event.deltaY);
        const span = Math.max(MIN_SPAN_MS, (this.viewport.end - this.viewport.start) * factor);
        const anchor = this.viewport.start + (this.viewport.end - this.viewport.start) * ratio;
        const next = {
          start: anchor - span * ratio,
          end: anchor + span * (1 - ratio),
        };

        this.cancelInertia();
        this.beginInteraction();
        this.viewport = next;
        this.interactionVelocity = 0;
        this.markInputForNextRender();
        this.scheduleRender();
        this.emitViewport(false);

        globalThis.clearTimeout(this.wheelCommitTimer);
        this.wheelCommitTimer = globalThis.setTimeout(
          () => this.commitInteraction(),
          WHEEL_COMMIT_DELAY_MS,
        );
      },
      { passive: false },
    );

    const releasePointerCapture = (pointerId: number): void => {
      try {
        if (this.surface.hasPointerCapture(pointerId)) this.surface.releasePointerCapture(pointerId);
      } catch {
        // Lifecycle cancellation may already have released capture.
      }
    };

    const beginSurfaceDrag = (
      pointerId: number,
      point: { x: number; y: number },
      sourceEvent: PointerEvent | null = null,
    ): void => {
      const rect = this.surface.getBoundingClientRect();
      const coordinate =
        this.orientation === "horizontal" ? point.x - rect.left : point.y - rect.top;
      this.cancelInertia();
      this.beginInteraction();
      this.pointerDrag = {
        pointerId,
        coordinate,
        lastTime: sourceEvent ? Number(sourceEvent.timeStamp) || performance.now() : performance.now(),
        viewport: { ...this.viewport },
        samples: [],
      };
      if (sourceEvent) motion.appendPointerSamples(this.pointerDrag.samples, sourceEvent, this.orientation);
      try {
        if (!this.surface.hasPointerCapture(pointerId)) this.surface.setPointerCapture(pointerId);
      } catch {
        // Pointer capture is opportunistic.
      }
      this.root.dataset.sceneState = "interacting";
    };

    const pinchGeometry = (): { distance: number; ratio: number } | null => {
      if (this.touchPointers.size < 2) return null;
      const [first, second] = Array.from(this.touchPointers.values()).slice(0, 2);
      if (!first || !second) return null;
      const rect = this.surface.getBoundingClientRect();
      const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
      const primary =
        this.orientation === "horizontal"
          ? (first.x + second.x) / 2 - rect.left
          : (first.y + second.y) / 2 - rect.top;
      const padding = this.axisPadding(length);
      const usable = Math.max(1, length - padding * 2);
      return {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        ratio: clamp((primary - padding) / usable, 0, 1),
      };
    };

    const beginPinch = (): boolean => {
      const geometry = pinchGeometry();
      if (!geometry) return false;
      this.cancelInertia();
      this.beginInteraction();
      this.touchTap = null;
      this.lastTouchTap = null;
      this.pointerDrag = null;
      const span = this.viewport.end - this.viewport.start;
      this.pinch = {
        distance: geometry.distance,
        viewport: { ...this.viewport },
        anchorTime: this.viewport.start + span * geometry.ratio,
      };
      for (const pointerId of this.touchPointers.keys()) {
        try {
          if (!this.surface.hasPointerCapture(pointerId)) this.surface.setPointerCapture(pointerId);
        } catch {
          // Browser gesture cancellation may prevent capture.
        }
      }
      return true;
    };

    const registerTouchTap = (event: PointerEvent, tap: TouchTapState | null): boolean => {
      if (!tap || tap.cancelled) return false;
      const now = performance.now();
      const previous = this.lastTouchTap;
      const point = { x: event.clientX, y: event.clientY };
      this.touchTap = null;

      if (
        previous &&
        now - previous.time <= TOUCH_DOUBLE_TAP_MS &&
        Math.hypot(point.x - previous.x, point.y - previous.y) <= TOUCH_DOUBLE_TAP_DISTANCE_PX
      ) {
        const rect = this.surface.getBoundingClientRect();
        const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
        const primary =
          this.orientation === "horizontal" ? point.x - rect.left : point.y - rect.top;
        const padding = this.axisPadding(length);
        const usable = Math.max(1, length - padding * 2);
        const ratio = clamp((primary - padding) / usable, 0, 1);
        const span = Math.max(MIN_SPAN_MS, this.viewport.end - this.viewport.start);
        const nextSpan = Math.max(MIN_SPAN_MS, span * DOUBLE_TAP_ZOOM_FACTOR);
        const anchor = this.viewport.start + span * ratio;
        this.viewport = {
          start: anchor - nextSpan * ratio,
          end: anchor + nextSpan * (1 - ratio),
        };
        this.lastTouchTap = null;
        this.suppressClickUntil = now + CLICK_SUPPRESSION_MS;
        this.commitInteraction();
        return true;
      }

      this.lastTouchTap = { time: now, x: point.x, y: point.y };
      return false;
    };

    const abortSurfaceGesture = (): void => {
      const pointerIds = new Set(this.touchPointers.keys());
      if (this.pointerDrag) pointerIds.add(this.pointerDrag.pointerId);
      const interrupted = Boolean(this.pointerDrag || this.pinch || this.touchPointers.size);

      this.touchPointers.clear();
      this.pinch = null;
      this.touchTap = null;
      this.lastTouchTap = null;
      this.pointerDrag = null;
      this.cancelInertia();
      for (const pointerId of pointerIds) releasePointerCapture(pointerId);

      if (interrupted) {
        this.suppressClickUntil = performance.now() + CLICK_SUPPRESSION_MS;
        this.commitInteraction();
      }
    };

    this.surface.addEventListener(
      "click",
      (event) => {
        if (performance.now() >= this.suppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );

    this.surface.addEventListener("pointerdown", (event) => {
      const isPrimaryPointer = event.pointerType === "touch" || event.button === 0;
      if (!this.items.length || !isPrimaryPointer) return;
      const interactiveTarget =
        event.target instanceof Element
          ? event.target.closest("button, a, input, select, textarea")
          : null;

      if (event.pointerType === "touch") {
        this.touchPointers.set(event.pointerId, {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        });
        this.touchTap = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          cancelled: false,
        };
        if (this.touchPointers.size >= 2) {
          beginPinch();
          return;
        }
        if (interactiveTarget) return;
      } else if (interactiveTarget) {
        return;
      }

      const keyboardTarget =
        document.activeElement instanceof HTMLElement &&
        this.surface.contains(document.activeElement) &&
        document.activeElement.matches(
          ".timeline-event-terminal, .timeline-range-segment, .timeline-cluster-terminal",
        );
      if (keyboardTarget) {
        // Background camera gestures must not steal the user's keyboard position.
        event.preventDefault();
      }

      if (!this.pinch) {
        beginSurfaceDrag(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointerDrag) {
          this.pointerDrag.lastTime = Number(event.timeStamp) || performance.now();
          motion.appendPointerSamples(this.pointerDrag.samples, event, this.orientation);
        }
      }
    });

    this.surface.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" && this.touchPointers.has(event.pointerId)) {
        this.touchPointers.set(event.pointerId, {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        });
        if (this.touchTap?.pointerId === event.pointerId && !this.touchTap.cancelled) {
          const distance = Math.hypot(
            event.clientX - this.touchTap.startX,
            event.clientY - this.touchTap.startY,
          );
          if (distance > TOUCH_TAP_MOVE_TOLERANCE_PX) {
            this.touchTap.cancelled = true;
            this.lastTouchTap = null;
          }
        }
      }

      if (this.pinch && this.touchPointers.size >= 2) {
        const geometry = pinchGeometry();
        if (!geometry) return;
        event.preventDefault();
        const factor = clamp(this.pinch.distance / geometry.distance, 0.05, 20);
        const originalSpan = Math.max(
          MIN_SPAN_MS,
          this.pinch.viewport.end - this.pinch.viewport.start,
        );
        const nextSpan = Math.max(MIN_SPAN_MS, originalSpan * factor);
        const start = this.pinch.anchorTime - nextSpan * geometry.ratio;
        this.viewport = { start, end: start + nextSpan };
        this.interactionVelocity = 0;
        this.markInputForNextRender();
        this.scheduleRender();
        this.emitViewport(false);
        return;
      }

      const drag = this.pointerDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const rect = this.surface.getBoundingClientRect();
      const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
      const coordinate =
        this.orientation === "horizontal" ? event.clientX - rect.left : event.clientY - rect.top;
      motion.appendPointerSamples(drag.samples, event, this.orientation);
      const delta = coordinate - drag.coordinate;
      const span = drag.viewport.end - drag.viewport.start;
      const usable = Math.max(1, length - this.axisPadding(length) * 2);
      const temporalDelta = -(delta / usable) * span;
      const target = {
        start: drag.viewport.start + temporalDelta,
        end: drag.viewport.end + temporalDelta,
      };

      const now = Number(event.timeStamp) || performance.now();
      const response = motion.responseForElapsed(now - drag.lastTime);
      drag.lastTime = now;
      this.viewport = {
        start: this.viewport.start + (target.start - this.viewport.start) * response,
        end: this.viewport.end + (target.end - this.viewport.end) * response,
      };
      const pointerVelocity = motion.estimatePointerVelocity(drag.samples);
      this.interactionVelocity = -((pointerVelocity / usable) * span);
      this.markInputForNextRender();
      this.scheduleRender();
      this.emitViewport(false);
    });

    const finishPointer = (event: PointerEvent): void => {
      const wasPinching = Boolean(this.pinch);
      const tap =
        event.pointerType === "touch" && this.touchTap?.pointerId === event.pointerId
          ? this.touchTap
          : null;
      if (event.pointerType === "touch") this.touchPointers.delete(event.pointerId);

      if (wasPinching) {
        this.touchTap = null;
        this.lastTouchTap = null;
        this.suppressClickUntil = performance.now() + CLICK_SUPPRESSION_MS;
        this.pointerDrag = null;

        if (this.touchPointers.size >= 2) {
          beginPinch();
          releasePointerCapture(event.pointerId);
          return;
        }

        this.pinch = null;
        const remaining = Array.from(this.touchPointers.values())[0];
        if (remaining) {
          beginSurfaceDrag(remaining.pointerId, remaining);
          releasePointerCapture(event.pointerId);
          return;
        }

        releasePointerCapture(event.pointerId);
        this.commitInteraction();
        return;
      }

      const drag = this.pointerDrag;
      let startedInertia = false;
      if (drag?.pointerId === event.pointerId) {
        motion.appendPointerSamples(drag.samples, event, this.orientation);
        const releaseVelocity =
          event.type === "pointercancel" ? 0 : motion.estimatePointerVelocity(drag.samples);
        const rect = this.surface.getBoundingClientRect();
        const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
        this.pointerDrag = null;
        if (Math.abs(releaseVelocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
          this.startInertia(releaseVelocity, length);
          startedInertia = true;
          void motion.pulseHaptic("release");
        }
      }

      if (event.type === "pointercancel") {
        this.touchTap = null;
        this.lastTouchTap = null;
        releasePointerCapture(event.pointerId);
        if (!startedInertia) this.commitInteraction();
        return;
      }

      const doubleTapped = tap ? registerTouchTap(event, tap) : false;
      if (event.pointerType === "touch" && !tap) this.touchTap = null;
      releasePointerCapture(event.pointerId);
      if (!startedInertia && !doubleTapped) this.commitInteraction();
    };

    this.surface.addEventListener("pointerup", finishPointer);
    this.surface.addEventListener("pointercancel", finishPointer);
    this.surface.addEventListener("lostpointercapture", (event) => {
      if (
        this.pointerDrag?.pointerId === event.pointerId ||
        this.touchPointers.has(event.pointerId)
      ) {
        abortSurfaceGesture();
      }
    });
    window.addEventListener("blur", abortSurfaceGesture);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) abortSurfaceGesture();
    });
    window.addEventListener("orientationchange", abortSurfaceGesture);
    globalThis.screen?.orientation?.addEventListener?.("change", abortSurfaceGesture);
    window.visualViewport?.addEventListener("resize", () => {
      if (this.pointerDrag || this.pinch || this.touchPointers.size) abortSurfaceGesture();
    });


    this.surface.addEventListener("keydown", (event) => {
      if (!this.items.length) return;
      if (event.key === "Home") {
        event.preventDefault();
        this.cancelInertia();
        this.fitAll();
        return;
      }
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        const factor = event.key === "-" ? 1.25 : 0.8;
        const center = (this.viewport.start + this.viewport.end) / 2;
        const span = Math.max(MIN_SPAN_MS, (this.viewport.end - this.viewport.start) * factor);
        this.viewport = { start: center - span / 2, end: center + span / 2 };
        this.commitInteraction();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
        const alongAxis =
          this.orientation === "horizontal"
            ? event.key === "ArrowLeft" || event.key === "ArrowRight"
            : event.key === "ArrowUp" || event.key === "ArrowDown";
        if (!alongAxis) return;
        event.preventDefault();
        const sign = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const delta = (this.viewport.end - this.viewport.start) * 0.12 * sign;
        this.viewport = { start: this.viewport.start + delta, end: this.viewport.end + delta };
        this.commitInteraction();
      }
    });
  }

  setItems(items: TimelineItem[], options: SetItemsOptions = {}): void {
    this.items = (items || []).filter(
      (item) => item && typeof item.id === "string" && Number.isFinite(item.start),
    );
    this.relationships = Array.isArray(options.relationships)
      ? options.relationships.filter(
          (relationship): relationship is TimelineRelationshipBand =>
            Boolean(relationship) &&
            typeof relationship.id === "string" &&
            Number.isFinite(relationship.start) &&
            Number.isFinite(relationship.end),
        )
      : [];
    this.allCoordinates = Array.isArray(options.allCoordinates)
      ? options.allCoordinates.filter(Number.isFinite)
      : this.items.flatMap((item) =>
          Number.isFinite(item.end) ? [item.start, Number(item.end)] : [item.start],
        );

    if (!this.viewportInitialized && this.items.length) {
      this.viewport = this.initialViewport();
      this.viewportInitialized = true;
    }

    this.focusedId =
      options.focusId && this.items.some((item) => item.id === options.focusId)
        ? options.focusId
        : this.focusedId && this.items.some((item) => item.id === this.focusedId)
          ? this.focusedId
          : null;

    this.renderWindow = createRenderWindow(this.viewport, { overscanRatio: OVERSCAN_RATIO });
    this.retention = commitRetention(this.renderWindow);
    this.syncSemanticChronology();
    this.render();
    this.measureCommittedGeometry();
    this.reconcileCommittedLayout();
    this.render();
    this.emitViewport(true);

    if (options.focusId) this.focusItem(options.focusId, { moveViewport: false });
  }

  semanticChronologyLabel(item: TimelineItem): string {
    const temporalLabel =
      Number.isFinite(item.end) && item.endLabel
        ? `${item.startLabel || item.start} to ${item.endLabel}`
        : item.startLabel || String(item.start);
    return [
      temporalLabel,
      item.title || item.id,
      item.categoryName || "",
      item.locationName ? `at ${item.locationName}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  syncSemanticChronology(): void {
    const ordered = [...this.items].sort(
      (left, right) =>
        left.start - right.start ||
        (Number(left.end) || left.start) - (Number(right.end) || right.start) ||
        left.id.localeCompare(right.id),
    );
    const rows = ordered.map((item) => {
      const row = document.createElement("li");
      row.dataset.occurrenceId = item.id;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "timeline-semantic-occurrence";
      button.dataset.id = item.id;
      button.textContent = this.semanticChronologyLabel(item);
      button.setAttribute("aria-current", String(item.id === this.focusedId));
      button.addEventListener("click", () => this.focusItem(item.id));
      row.append(button);
      return row;
    });
    this.semanticList.replaceChildren(...rows);
    this.semanticList.hidden = rows.length === 0;
  }

  syncSemanticChronologySelection(): void {
    for (const button of this.semanticList.querySelectorAll<HTMLButtonElement>(
      ".timeline-semantic-occurrence",
    )) {
      button.setAttribute("aria-current", String(button.dataset.id === this.focusedId));
    }
  }

  initialViewport(): TemporalWindow {
    const sorted = [...this.items].sort((left, right) => left.start - right.start);
    if (!sorted.length) return { start: 0, end: DEFAULT_SPAN_MS };
    const local = sorted.slice(0, 3);
    const start = local[0].start;
    const end = Math.max(
      ...local.map((item) => (Number.isFinite(item.end) ? Number(item.end) : item.start)),
    );
    const raw = normalizedViewport(start, end);
    const span = Math.max(DEFAULT_SPAN_MS, raw.end - raw.start);
    const center = (raw.start + raw.end) / 2;
    return { start: center - span * 0.6, end: center + span * 0.6 };
  }

  itemCoordinates(items: readonly TimelineItem[] = this.items): number[] {
    return items.flatMap((item) =>
      Number.isFinite(item.end) ? [item.start, Number(item.end)] : [item.start],
    );
  }

  semanticZoomAnchorItem(): TimelineItem | null {
    if (!this.items.length) return null;
    if (this.focusedId) {
      const focused = this.items.find((item) => item.id === this.focusedId);
      if (focused) return focused;
    }
    const center = this.viewport.start + (this.viewport.end - this.viewport.start) / 2;
    return (
      [...this.items].sort(
        (left, right) =>
          Math.abs(left.start - center) - Math.abs(right.start - center) ||
          left.id.localeCompare(right.id),
      )[0] || null
    );
  }

  semanticZoomTargets(): {
    all: TemporalWindow;
    context: TemporalWindow;
    isolated: TemporalWindow;
  } | null {
    const coordinates = this.allCoordinates.length ? this.allCoordinates : this.itemCoordinates();
    if (!coordinates.length) return null;
    const all = scale.fit(coordinates, { paddingRatio: 0.1, minSpanMs: DEFAULT_SPAN_MS });
    const anchor = this.semanticZoomAnchorItem();
    if (!anchor) return { all, context: all, isolated: all };

    const ordered = [...this.items].sort(
      (left, right) => left.start - right.start || left.id.localeCompare(right.id),
    );
    const index = ordered.findIndex((item) => item.id === anchor.id);
    const contextItems = ordered.slice(Math.max(0, index - 1), Math.min(ordered.length, index + 2));
    const contextCoordinates = this.itemCoordinates(contextItems);
    const context = contextCoordinates.length
      ? scale.fit(contextCoordinates, { paddingRatio: 0.14, minSpanMs: MIN_SPAN_MS })
      : all;

    const anchorEnd = Number.isFinite(anchor.end) ? Number(anchor.end) : anchor.start;
    const anchorCenter = anchor.start + (anchorEnd - anchor.start) / 2;
    const distinctDistances = ordered
      .filter((item) => item.id !== anchor.id && item.start !== anchor.start)
      .map((item) => Math.abs(item.start - anchor.start))
      .filter((distance) => distance > 0);
    const nearestDistance = distinctDistances.length ? Math.min(...distinctDistances) : DEFAULT_SPAN_MS;
    const ownSpan = Math.max(MIN_SPAN_MS, Math.abs(anchorEnd - anchor.start));
    const contextSpan = Math.max(MIN_SPAN_MS, context.end - context.start);
    const minimumRequired = Math.max(MIN_SPAN_MS, ownSpan * 1.4);
    const preferred = Math.max(
      MIN_SPAN_MS,
      Math.min(nearestDistance * 0.45, contextSpan * 0.45),
    );
    const isolatedSpan = Math.min(contextSpan, Math.max(minimumRequired, preferred));
    const isolated = {
      start: anchorCenter - isolatedSpan / 2,
      end: anchorCenter + isolatedSpan / 2,
    };

    return { all, context, isolated };
  }

  interpolateSemanticViewport(from: TemporalWindow, to: TemporalWindow, ratio: number): TemporalWindow {
    const t = clamp(ratio, 0, 1);
    const fromSpan = Math.max(MIN_SPAN_MS, from.end - from.start);
    const toSpan = Math.max(MIN_SPAN_MS, to.end - to.start);
    const fromCenter = from.start + fromSpan / 2;
    const toCenter = to.start + toSpan / 2;
    const center = fromCenter + (toCenter - fromCenter) * t;
    const span = Math.exp(Math.log(fromSpan) + (Math.log(toSpan) - Math.log(fromSpan)) * t);
    return { start: center - span / 2, end: center + span / 2 };
  }

  semanticZoomValueText(value: number): string {
    const normalized = clamp(value, 0, 100);
    if (normalized <= 2) return "Whole context";
    if (Math.abs(normalized - 50) <= 2) return "Focused occurrence plus neighboring context";
    if (normalized >= 98) return "Focused time window";
    return normalized < 50
      ? `Context to focus, ${Math.round(normalized)} percent`
      : `Focus to isolate, ${Math.round(normalized)} percent`;
  }

  setSemanticZoom(value: number, commit: boolean): void {
    if (!this.items.length) return;
    const targets = this.semanticZoomTargets();
    if (!targets) return;
    const normalized = clamp(value, 0, 100);
    const next =
      normalized <= 50
        ? this.interpolateSemanticViewport(targets.all, targets.context, normalized / 50)
        : this.interpolateSemanticViewport(targets.context, targets.isolated, (normalized - 50) / 50);

    this.cancelInertia();
    this.beginInteraction();
    this.viewport = next;
    this.interactionVelocity = 0;
    if (this.zoomSlider) {
      const label = this.semanticZoomValueText(normalized);
      this.zoomSlider.value = String(Math.round(normalized));
      this.zoomSlider.setAttribute("aria-valuetext", label);
      this.zoomSlider.title = label;
    }
    if (commit) {
      this.commitInteraction();
    } else {
      this.scheduleRender();
      this.emitViewport(false);
    }
  }

  semanticZoomValueForSpan(span: number, targets: {
    all: TemporalWindow;
    context: TemporalWindow;
    isolated: TemporalWindow;
  }): number {
    const currentSpan = Math.max(MIN_SPAN_MS, span);
    const allSpan = Math.max(MIN_SPAN_MS, targets.all.end - targets.all.start);
    const contextSpan = Math.max(MIN_SPAN_MS, targets.context.end - targets.context.start);
    const isolatedSpan = Math.max(MIN_SPAN_MS, targets.isolated.end - targets.isolated.start);
    if (currentSpan >= contextSpan) {
      const denominator = Math.log(allSpan / contextSpan);
      if (Math.abs(denominator) < 1e-9) return currentSpan >= allSpan * 0.999 ? 0 : 50;
      return clamp(50 * (Math.log(allSpan / currentSpan) / denominator), 0, 50);
    }
    const denominator = Math.log(contextSpan / isolatedSpan);
    if (Math.abs(denominator) < 1e-9) return 100;
    return clamp(50 + 50 * (Math.log(contextSpan / currentSpan) / denominator), 50, 100);
  }

  syncZoomSlider(): void {
    if (!this.zoomSlider) return;
    this.zoomSlider.disabled = !this.items.length;
    this.zoomSlider.setAttribute(
      "aria-orientation",
      this.orientation === "vertical" ? "vertical" : "horizontal",
    );
    if (this.zoomSlider.disabled || this.retention.active) return;
    const targets = this.semanticZoomTargets();
    if (!targets) return;
    const value = Math.round(this.semanticZoomValueForSpan(this.viewport.end - this.viewport.start, targets));
    this.zoomSlider.value = String(value);
    const label = this.semanticZoomValueText(value);
    this.zoomSlider.setAttribute("aria-valuetext", label);
    this.zoomSlider.title = label;
  }

  positionTemporalNode(node: HTMLElement, time: number, padding: number, usable: number): void {
    const position = padding + scale.coordinateFor(time, this.viewport, usable);
    if (this.orientation === "horizontal") {
      node.style.left = `${position}px`;
      node.style.top = "";
    } else {
      node.style.top = `${position}px`;
      node.style.left = "";
    }
  }

  retainedObjectCount(): number {
    let ranges = 0;
    for (const record of this.scene.values()) {
      if (record.range) ranges += 1;
    }
    return (
      this.scene.size +
      ranges +
      this.tickScene.size +
      this.accentScene.size +
      this.relationshipBandScene.size +
      this.clusterScene.size
    );
  }

  measuredQueryOccurrences(
    items: readonly TimelineItem[],
    extent: TemporalWindow,
  ): TimelineItem[] {
    const started = performance.now();
    const result = queryOccurrences(items, extent);
    this.pendingQueryDurationMs += performance.now() - started;
    return result;
  }

  getPerformanceMetrics(): RetainedTimelineSummary {
    return this.performanceMetrics.summary();
  }

  resetPerformanceMetrics(): void {
    this.performanceMetrics.reset();
    this.frameCreatedObjects = 0;
    this.frameDestroyedObjects = 0;
    this.pendingPlannerDurationMs = 0;
    this.pendingQueryDurationMs = 0;
    this.pendingDirtyMeasurements = 0;
    this.pendingBufferExpanded = false;
    this.pendingInputStartedAt = null;
  }

  markInputForNextRender(): void {
    if (this.pendingInputStartedAt === null) {
      this.pendingInputStartedAt = performance.now();
    }
  }

  tickSpecKey(spec: SemanticTickSpec): string {
    return `${spec.unit}:${spec.step}`;
  }

  animateTemporalContextEntry(node: HTMLElement): void {
    if (this.reducedMotionQuery?.matches || typeof node.animate !== "function") return;
    const animation = node.animate(
      [
        { opacity: 0.18, transform: "scale(0.98)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 140, easing: "ease-out" },
    );
    animation.addEventListener("finish", () => animation.cancel(), { once: true });
  }

  retireTemporalContextNode(node: HTMLElement): void {
    if (this.reducedMotionQuery?.matches || typeof node.animate !== "function") {
      node.remove();
      return;
    }
    const animation = node.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 120, easing: "ease-out" },
    );
    animation.addEventListener(
      "finish",
      () => {
        node.remove();
        animation.cancel();
      },
      { once: true },
    );
  }

  materializeTickHierarchy(
    spec: SemanticTickSpec,
    extent: TemporalWindow,
    accentPlan: ReturnType<typeof clustering.planTemporalAccents>,
    padding: number,
    usable: number,
    incoming: boolean,
  ): Set<string> {
    const ticks = scale.generateTicksForSpec(extent, spec, 240);
    const keep = new Set<string>();
    const hierarchyKey = this.tickSpecKey(spec);

    for (const tick of ticks) {
      const key = tickSceneKey({ unit: tick.spec.unit, value: tick.value });
      keep.add(key);
      let node = this.tickScene.get(key);
      const created = !node;
      if (!node) {
        node = document.createElement("div");
        node.className = "timeline-tick";
        node.dataset.time = String(tick.value);
        const label = document.createElement("span");
        label.className = "timeline-tick-label";
        node.append(label);
        this.tickScene.set(key, node);
        this.stage.append(node);
        this.frameCreatedObjects += 1;
      }

      const hierarchyKeys = new Set(
        String(node.dataset.tickHierarchies || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
      hierarchyKeys.add(hierarchyKey);
      node.dataset.tickHierarchies = [...hierarchyKeys].join(",");
      node.classList.toggle("is-incoming-hierarchy", incoming && created);
      if (incoming && created) {
        node.dataset.pendingHierarchy = hierarchyKey;
        node.style.opacity = "0.35";
      }

      const label = node.querySelector(".timeline-tick-label");
      if (label) {
        label.textContent =
          clustering.compactTickLabel(tick.value, tick.spec, accentPlan.hasAmbientContext) ??
          tick.label;
      }
      this.positionTemporalNode(node, tick.value, padding, usable);
    }

    return keep;
  }

  materializeTemporalAccents(
    accentPlan: ReturnType<typeof clustering.planTemporalAccents>,
    padding: number,
    usable: number,
    incoming: boolean,
  ): Set<string> {
    const keep = new Set<string>();
    const materialize = (
      accent: (typeof accentPlan.edgeAccents)[number] | (typeof accentPlan.axisMonths)[number],
      axis: boolean,
    ): void => {
      const key = temporalAccentSceneKey({
        kind: String(accent.kind || (axis ? "axis" : "edge")),
        time: Number(accent.time),
      });
      keep.add(key);
      let node = this.accentScene.get(key);
      const created = !node;
      if (!node) {
        node = document.createElement("div");
        node.className = axis
          ? "timeline-axis-month-label"
          : accent.kind === "year"
            ? "timeline-month-accent timeline-year-accent"
            : "timeline-month-accent";
        node.dataset.time = String(accent.time);
        node.dataset.temporalAccent = String(accent.kind || "");
        this.accentScene.set(key, node);
        this.stage.append(node);
        this.frameCreatedObjects += 1;
      }
      node.classList.toggle("is-incoming-hierarchy", incoming && created);
      if (incoming && created) {
        node.dataset.pendingHierarchy = "true";
        node.style.opacity = "0.35";
      }
      node.textContent = String(accent.label || "");
      node.dataset.count = String(accent.count || 0);
      this.positionTemporalNode(node, Number(accent.time), padding, usable);
    };

    for (const accent of accentPlan.edgeAccents) materialize(accent, false);
    for (const accent of accentPlan.axisMonths) materialize(accent, true);
    return keep;
  }

  renderTemporalContext(padding: number, usable: number): void {
    const selectedSpec = scale.selectTickSpec(this.viewport, usable, 94) as SemanticTickSpec;
    const selectedKey = this.tickSpecKey(selectedSpec);
    const committedSpec = this.committedTickSpec || selectedSpec;
    const committedKey = this.tickSpecKey(committedSpec);
    const incomingHierarchy =
      this.retention.active && this.committedTickSpec !== null && selectedKey !== committedKey;

    if (!this.retention.active) {
      this.committedTickSpec = selectedSpec;
      this.committedTickSpecKey = selectedKey;
    } else if (!this.committedTickSpec) {
      this.committedTickSpec = selectedSpec;
      this.committedTickSpecKey = selectedKey;
    }

    const contextItems = this.measuredQueryOccurrences(this.items, this.retention.extent);
    const windowSpan = Math.max(
      MIN_SPAN_MS,
      this.retention.extent.end - this.retention.extent.start,
    );
    const viewportSpan = Math.max(MIN_SPAN_MS, this.viewport.end - this.viewport.start);
    const virtualLength = usable * (windowSpan / viewportSpan);

    const authoritativeSpec = this.retention.active
      ? this.committedTickSpec || selectedSpec
      : selectedSpec;
    const authoritativeAccentPlan = clustering.planTemporalAccents(contextItems, {
      viewport: this.viewport,
      pixelLength: usable,
      padding,
      orientation: this.orientation,
      spec: authoritativeSpec,
      maxItemsPerMonth: 3,
      limit: 18,
    });
    const keepTicks = this.materializeTickHierarchy(
      authoritativeSpec,
      this.retention.extent,
      authoritativeAccentPlan,
      padding,
      usable,
      false,
    );
    const keepAccents = this.materializeTemporalAccents(
      authoritativeAccentPlan,
      padding,
      usable,
      false,
    );

    if (incomingHierarchy) {
      const incomingAccentPlan = clustering.planTemporalAccents(contextItems, {
        viewport: this.viewport,
        pixelLength: usable,
        padding,
        orientation: this.orientation,
        spec: selectedSpec,
        maxItemsPerMonth: 3,
        limit: 18,
      });
      for (const key of this.materializeTickHierarchy(
        selectedSpec,
        this.retention.extent,
        incomingAccentPlan,
        padding,
        usable,
        true,
      )) {
        keepTicks.add(key);
      }
      for (const key of this.materializeTemporalAccents(
        incomingAccentPlan,
        padding,
        usable,
        true,
      )) {
        keepAccents.add(key);
      }
      this.stage.dataset.incomingTickHierarchy = selectedKey;
      this.stage.dataset.committedTickHierarchy = committedKey;
    } else {
      delete this.stage.dataset.incomingTickHierarchy;
      this.stage.dataset.committedTickHierarchy = this.tickSpecKey(authoritativeSpec);
    }

    if (!this.retention.active) {
      for (const [key, node] of this.tickScene) {
        if (keepTicks.has(key)) {
          if (node.dataset.pendingHierarchy) {
            delete node.dataset.pendingHierarchy;
            node.classList.remove("is-incoming-hierarchy");
            node.style.opacity = "";
            this.animateTemporalContextEntry(node);
          }
          continue;
        }
        this.tickScene.delete(key);
        this.frameDestroyedObjects += 1;
        this.retireTemporalContextNode(node);
      }
      for (const [key, node] of this.accentScene) {
        if (keepAccents.has(key)) {
          if (node.dataset.pendingHierarchy) {
            delete node.dataset.pendingHierarchy;
            node.classList.remove("is-incoming-hierarchy");
            node.style.opacity = "";
            this.animateTemporalContextEntry(node);
          }
          continue;
        }
        this.accentScene.delete(key);
        this.frameDestroyedObjects += 1;
        this.retireTemporalContextNode(node);
      }
    }

    if (virtualLength <= 0) return;
  }

  relationshipBandLane(id: string): number {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % 4;
  }

  renderRelationshipBands(padding: number, usable: number): void {
    if (!this.relationshipBandZone) {
      this.relationshipBandZone = document.createElement("div");
      this.relationshipBandZone.className = "timeline-relation-zone";
      this.stage.append(this.relationshipBandZone);
    }

    const retained = this.relationships
      .filter((relationship) => itemOverlapsWindow(relationship, this.retention.extent))
      .sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
    const keep = new Set<string>();

    for (const relationship of retained) {
      const key = relationshipBandSceneKey(relationship.id);
      keep.add(key);
      let segment = this.relationshipBandScene.get(key);
      if (!segment) {
        segment = document.createElement("div");
        segment.className = "timeline-relation-segment";
        segment.dataset.relationshipId = relationship.id;
        this.relationshipBandScene.set(key, segment);
        this.relationshipBandZone.append(segment);
        this.frameCreatedObjects += 1;
      }

      segment.title = relationship.predicate || "Temporal relationship";
      segment.style.setProperty(
        "--relation-lane-offset",
        `${this.relationshipBandLane(relationship.id) * 8}px`,
      );

      const visible = itemOverlapsWindow(relationship, this.viewport);
      segment.hidden = !visible;
      segment.classList.toggle("is-buffered", !visible);
      segment.setAttribute("aria-hidden", String(!visible));
      if (!visible) continue;

      const clippedStart = Math.max(this.viewport.start, Math.min(relationship.start, relationship.end));
      const clippedEnd = Math.min(this.viewport.end, Math.max(relationship.start, relationship.end));
      const startPosition = padding + scale.coordinateFor(clippedStart, this.viewport, usable);
      const endPosition = padding + scale.coordinateFor(clippedEnd, this.viewport, usable);
      const low = Math.min(startPosition, endPosition);
      const high = Math.max(startPosition, endPosition);

      if (this.orientation === "horizontal") {
        segment.style.left = `${low}px`;
        segment.style.width = `${Math.max(6, high - low)}px`;
        segment.style.top = "";
        segment.style.height = "";
      } else {
        segment.style.top = `${low}px`;
        segment.style.height = `${Math.max(6, high - low)}px`;
        segment.style.left = "";
        segment.style.width = "";
      }
    }

    if (!this.retention.active) {
      for (const [key, segment] of this.relationshipBandScene) {
        if (keep.has(key)) continue;
        segment.remove();
        this.relationshipBandScene.delete(key);
        this.frameDestroyedObjects += 1;
      }
    }
  }

  fitAll(): void {
    const coordinates = this.allCoordinates.length
      ? this.allCoordinates
      : this.items.flatMap((item) =>
          Number.isFinite(item.end) ? [item.start, Number(item.end)] : [item.start],
        );
    if (!coordinates.length) return;
    const min = Math.min(...coordinates);
    const max = Math.max(...coordinates);
    const raw = normalizedViewport(min, max);
    const span = Math.max(DEFAULT_SPAN_MS, raw.end - raw.start);
    const padding = span * 0.06;
    this.viewport = { start: raw.start - padding, end: raw.end + padding };
    this.commitInteraction();
  }

  axisPadding(length: number): number {
    return clamp(length * 0.075, 48, 80);
  }

  cancelInertia(): void {
    if (this.inertiaAnimationFrame) cancelAnimationFrame(this.inertiaAnimationFrame);
    this.inertiaAnimationFrame = 0;
    this.interactionVelocity = 0;
  }

  startInertia(initialVelocityPxPerMs: number, pixelLength: number): void {
    if (this.reducedMotionQuery?.matches) {
      this.commitInteraction();
      return;
    }
    this.cancelInertia();
    this.beginInteraction();
    let velocity = Number(initialVelocityPxPerMs) || 0;
    let lastFrame = 0;

    const step = (now: number): void => {
      this.inertiaAnimationFrame = 0;
      if (Math.abs(velocity) < motion.STOP_VELOCITY_PX_PER_MS) {
        this.interactionVelocity = 0;
        this.commitInteraction();
        return;
      }

      const elapsed = lastFrame ? clamp(now - lastFrame, 1, 48) : 16;
      lastFrame = now;
      velocity = motion.decayVelocity(velocity, elapsed);
      const usable = Math.max(1, pixelLength - this.axisPadding(pixelLength) * 2);
      const span = this.viewport.end - this.viewport.start;
      const deltaPixels = velocity * elapsed;
      const deltaTemporal = -(deltaPixels / usable) * span;
      this.interactionVelocity = deltaTemporal / elapsed;
      this.viewport = {
        start: this.viewport.start + deltaTemporal,
        end: this.viewport.end + deltaTemporal,
      };
      this.scheduleRender();
      this.emitViewport(false);

      if (Math.abs(velocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
        this.inertiaAnimationFrame = requestAnimationFrame(step);
      } else {
        this.interactionVelocity = 0;
        this.commitInteraction();
      }
    };

    this.inertiaAnimationFrame = requestAnimationFrame(step);
  }

  beginInteraction(): void {
    if (this.retention.active) return;
    this.clearHoverStates();
    this.renderWindow = createRenderWindow(this.viewport, {
      overscanRatio: OVERSCAN_RATIO,
      velocityTemporalPerMs: this.interactionVelocity,
      predictionHorizonMs: POINTER_PREDICTION_HORIZON_MS,
    });
    this.retention = beginRetention(this.renderWindow);
    this.root.dataset.sceneState = "interacting";
  }

  commitInteraction(): void {
    this.cancelInertia();
    this.renderWindow = createRenderWindow(this.viewport, { overscanRatio: OVERSCAN_RATIO });
    this.retention = commitRetention(this.renderWindow);
    this.root.dataset.sceneState = this.focusedId ? "focused" : this.items.length ? "populated" : "empty";
    this.render();
    this.measureCommittedGeometry();
    this.reconcileCommittedLayout();
    this.render();
    this.emitViewport(true);
  }

  scheduleRender(): void {
    if (this.renderFrame) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = 0;
      this.render();
    });
  }

  itemContentRevision(item: TimelineItem): string {
    const media = (item.media || [])
      .map((entry) => [entry.src || "", entry.alt || "", entry.caption || ""].join("\u0001"))
      .join("\u0002");
    return [
      item.title || "",
      item.startLabel || "",
      item.endLabel || "",
      item.layoutVariant || "",
      item.terminalShape || "",
      media,
    ].join("\u0003");
  }

  visualLaneFor(item: TimelineItem): number {
    if (Number.isInteger(item.lane)) return Number(item.lane);
    const laneIndex = this.committedLayout.lanes[item.id];
    if (!Number.isInteger(laneIndex)) return stableLane(item.id, null);
    const depth = Math.floor(Number(laneIndex) / 2) + 1;
    return Number(laneIndex) % 2 === 0 ? -depth : depth;
  }

  measureCommittedGeometry(): void {
    if (this.retention.active) return;
    for (const [sceneKey, record] of this.scene) {
      const key = geometryMeasurementKey(
        sceneKey,
        this.itemContentRevision(record.item),
      );
      const cached = this.geometryMeasurements.get(record.item.id);
      if (cached?.key === key) continue;

      const wasHidden = record.node.hidden;
      if (wasHidden) record.node.hidden = false;
      const rect = record.terminal.getBoundingClientRect();
      if (wasHidden) record.node.hidden = true;
      if (rect.width <= 0 || rect.height <= 0) continue;

      this.pendingDirtyMeasurements += 1;
      this.geometryMeasurements.set(record.item.id, {
        key,
        measurement: {
          inlineSize: this.orientation === "horizontal" ? rect.width : rect.height,
          blockSize: this.orientation === "horizontal" ? rect.height : rect.width,
        },
      });
    }
  }

  reconcileCommittedLayout(): void {
    if (this.retention.active || !this.items.length) return;
    const rect = this.surface.getBoundingClientRect();
    const primaryLength = Math.max(
      1,
      this.orientation === "horizontal"
        ? rect.width || this.surface.clientWidth
        : rect.height || this.surface.clientHeight,
    );
    const usable = Math.max(1, primaryLength - this.axisPadding(primaryLength) * 2);
    const occurrences = this.measuredQueryOccurrences(this.items, this.viewport);
    const focused = this.focusedId
      ? this.items.find((item) => item.id === this.focusedId) || null
      : null;
    if (focused && !occurrences.some((item) => item.id === focused.id)) {
      occurrences.push(focused);
    }

    const measurements: Record<string, TemporalLayoutMeasurement> = {};
    for (const item of occurrences) {
      const cached = this.geometryMeasurements.get(item.id);
      if (cached) measurements[item.id] = cached.measurement;
    }

    const plannerStarted = performance.now();
    const planned = planCommittedTemporalLayout({
      viewport: this.viewport,
      occurrences,
      pixelLength: usable,
      maxLanes: MAX_COMMITTED_LANES,
      clusterThresholds: {
        enterPx: CLUSTER_ENTER_PX,
        exitPx: CLUSTER_EXIT_PX,
      },
      measurements,
      previous: {
        lanes: this.committedLayout.lanes,
        clusters: this.committedLayout.clusters,
      },
    });
    this.pendingPlannerDurationMs += performance.now() - plannerStarted;

    const clusters = planned.clusters.filter((cluster) => {
      if (this.focusedId && cluster.itemIds.includes(this.focusedId)) return false;
      return !cluster.itemIds.every((id) => this.expandedClusterItemIds.has(id));
    });
    const liveIds = new Set(occurrences.map((item) => item.id));
    for (const id of [...this.expandedClusterItemIds]) {
      if (!liveIds.has(id)) this.expandedClusterItemIds.delete(id);
    }

    this.committedLayout = {
      lanes: planned.lanes,
      clusters,
      placements: planned.placements,
    };
    this.committedClusterByItem.clear();
    for (const cluster of clusters) {
      for (const itemId of cluster.itemIds) {
        this.committedClusterByItem.set(itemId, cluster.id);
      }
    }
    this.reconcileClusterScene(clusters);
  }

  reconcileClusterScene(clusters: readonly TemporalLayoutCluster[]): void {
    const keep = new Set<string>();
    for (const cluster of clusters) {
      keep.add(cluster.id);
      let record = this.clusterScene.get(cluster.id);
      if (!record) {
        record = this.createClusterRecord(cluster);
        this.clusterScene.set(cluster.id, record);
      }
      record.cluster = cluster;
      this.updateClusterRecord(record);
    }
    for (const [id, record] of this.clusterScene) {
      if (keep.has(id)) continue;
      record.node.remove();
      this.clusterScene.delete(id);
      this.frameDestroyedObjects += 1;
    }
  }

  createClusterRecord(cluster: TemporalLayoutCluster): ClusterSceneRecord {
    const node = document.createElement("div");
    node.className = "timeline-event timeline-cluster";
    node.dataset.id = cluster.id;
    node.dataset.connectorRouting = "straight";

    const connector = document.createElement("span");
    connector.className = "timeline-event-connector";
    const connectorTurn = document.createElement("span");
    connectorTurn.className = "timeline-event-connector-turn";
    const terminal = document.createElement("button");
    terminal.type = "button";
    terminal.className = "timeline-event-terminal timeline-cluster-terminal";
    node.append(connector, connectorTurn, terminal);
    this.stage.append(node);
    this.frameCreatedObjects += 1;

    const record: ClusterSceneRecord = { cluster, node, terminal };
    terminal.addEventListener("click", (event) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-cluster-item-id]")
        : null;
      const selectedId = target?.dataset.clusterItemId || record.cluster.itemIds[0];
      if (selectedId) this.activateCommittedCluster(record.cluster, selectedId);
    });
    this.updateClusterRecord(record);
    return record;
  }

  updateClusterRecord(record: ClusterSceneRecord): void {
    const items = record.cluster.itemIds
      .map((id) => this.items.find((item) => item.id === id))
      .filter((item): item is TimelineItem => Boolean(item));
    if (!items.length) return;
    const first = items[0];
    record.node.style.setProperty("--event-color", first.color || "var(--accent)");
    record.terminal.setAttribute(
      "aria-label",
      `Select and expand cluster of ${items.length} timeline occurrences`,
    );

    const tiles = document.createElement("span");
    tiles.className = "timeline-cluster-tiles";
    for (const item of items.slice(0, 3)) {
      const tile = document.createElement("span");
      tile.className = "timeline-cluster-tile";
      tile.dataset.clusterItemId = item.id;
      tile.title = item.title || item.startLabel || "Timeline occurrence";
      tile.style.setProperty("--cluster-tile-color", item.color || "var(--accent)");
      const media = item.media?.[0];
      if (media?.src) {
        const image = document.createElement("img");
        image.className = "timeline-cluster-image";
        image.src = media.src;
        image.alt = "";
        image.decoding = "async";
        image.loading = "lazy";
        tile.append(image);
        const badge = document.createElement("span");
        badge.className = "timeline-cluster-icon-badge";
        const icon =
          presentation && typeof presentation.createIcon === "function"
            ? presentation.createIcon("milestone", { size: 16 })
            : null;
        if (icon) badge.append(icon);
        tile.append(badge);
      } else {
        const icon =
          presentation && typeof presentation.createIcon === "function"
            ? presentation.createIcon("milestone", { size: 20 })
            : null;
        if (icon) tile.append(icon);
      }
      tiles.append(tile);
    }

    const copy = document.createElement("span");
    copy.className = "timeline-event-copy";
    const title = document.createElement("strong");
    title.textContent = `${items.length} occurrences`;
    const detail = document.createElement("span");
    detail.textContent = "Nearby · select and expand";
    copy.append(title, detail);
    record.terminal.replaceChildren(tiles, copy);
  }

  positionCommittedClusters(padding: number, usable: number, axisCross: number): void {
    for (const record of this.clusterScene.values()) {
      const { cluster, node, terminal } = record;
      const visible = itemOverlapsWindow(
        { start: cluster.start, end: cluster.end },
        this.viewport,
      );
      node.hidden = !visible;
      terminal.tabIndex = visible ? 0 : -1;
      if (!visible) continue;

      const anchor = cluster.start + (cluster.end - cluster.start) / 2;
      const primary = padding + scale.coordinateFor(anchor, this.viewport, usable);
      const representative =
        cluster.itemIds
          .map((id) => this.items.find((item) => item.id === id))
          .find(Boolean) || null;
      const lane = representative ? this.visualLaneFor(representative) : -1;
      const laneDistance = 72 + Math.max(0, Math.abs(lane) - 1) * 62;
      const terminalCross = axisCross + (lane < 0 ? -laneDistance : laneDistance);
      const segment = connectorSegment(axisCross, terminalCross);

      const labelBefore =
        this.orientation === "horizontal" ? primary > usable / 2 : lane < 0;
      node.dataset.side = labelBefore ? "before" : "after";
      node.classList.toggle("label-before", labelBefore);
      if (this.orientation === "horizontal") {
        node.style.transform = `translate3d(${primary}px, ${terminalCross}px, 0)`;
      } else {
        node.style.transform = `translate3d(${terminalCross}px, ${primary}px, 0)`;
      }

      const connector = node.querySelector<HTMLElement>(".timeline-event-connector");
      if (connector) {
        if (this.orientation === "horizontal") {
          connector.style.left = "0";
          connector.style.top = `${segment.offset}px`;
          connector.style.width = "2px";
          connector.style.height = `${Math.max(1, segment.length)}px`;
        } else {
          connector.style.left = `${segment.offset}px`;
          connector.style.top = "0";
          connector.style.width = `${Math.max(1, segment.length)}px`;
          connector.style.height = "2px";
        }
      }
    }
  }

  activateCommittedCluster(cluster: TemporalLayoutCluster, selectedId: string): void {
    const items = cluster.itemIds
      .map((id) => this.items.find((item) => item.id === id))
      .filter((item): item is TimelineItem => Boolean(item));
    if (!items.length) return;

    this.expandedClusterItemIds = new Set(cluster.itemIds);
    const rect = this.surface.getBoundingClientRect();
    const primaryLength = Math.max(
      1,
      this.orientation === "horizontal" ? rect.width : rect.height,
    );
    const usable = Math.max(1, primaryLength - this.axisPadding(primaryLength) * 2);
    const expansion = clustering.clusterExpansionViewport(
      items,
      this.viewport,
      usable,
      CLUSTER_ENTER_PX,
      { paddingRatio: 0.12, minSpanMs: MIN_SPAN_MS },
    );
    if (expansion?.viewport) this.viewport = { ...expansion.viewport };
    this.commitInteraction();
    this.focusItem(selectedId, { moveViewport: false });
  }

  render(): void {
    const phase = this.retention.active ? "interaction" : "commit";
    const started = performance.now();
    const inputStartedAt = this.pendingInputStartedAt;
    this.renderScene();
    const finished = performance.now();
    this.pendingInputStartedAt = null;
    this.performanceMetrics.recordFrame({
      phase,
      durationMs: finished - started,
      inputLatencyMs:
        inputStartedAt === null ? undefined : Math.max(0, finished - inputStartedAt),
      createdNodes: this.frameCreatedObjects,
      destroyedNodes: this.frameDestroyedObjects,
      retainedNodes: this.retainedObjectCount(),
      bufferExpanded: this.pendingBufferExpanded,
      plannerDurationMs: this.pendingPlannerDurationMs,
      queryDurationMs: this.pendingQueryDurationMs,
      dirtyMeasurements: this.pendingDirtyMeasurements,
      longTasks: 0,
    });
    this.frameCreatedObjects = 0;
    this.frameDestroyedObjects = 0;
    this.pendingPlannerDurationMs = 0;
    this.pendingQueryDurationMs = 0;
    this.pendingDirtyMeasurements = 0;
    this.pendingBufferExpanded = false;
  }

  renderScene(): void {
    const empty = !this.items.length;
    this.root.dataset.empty = empty ? "true" : "false";
    if (empty) {
      this.stage.dataset.sceneState = "empty";
      this.readout.textContent = "No visible events";
      for (const record of this.scene.values()) this.removeRecord(record);
      this.scene.clear();
      this.frameDestroyedObjects +=
        this.tickScene.size +
        this.accentScene.size +
        this.relationshipBandScene.size +
        this.clusterScene.size;
      for (const node of this.tickScene.values()) node.remove();
      for (const node of this.accentScene.values()) node.remove();
      this.tickScene.clear();
      this.accentScene.clear();
      for (const node of this.relationshipBandScene.values()) node.remove();
      this.relationshipBandScene.clear();
      this.relationshipBandZone?.remove();
      this.relationshipBandZone = null;
      for (const record of this.clusterScene.values()) record.node.remove();
      this.clusterScene.clear();
      this.committedClusterByItem.clear();
      this.committedLayout = {
        lanes: Object.freeze({}),
        clusters: Object.freeze([]),
        placements: Object.freeze([]),
      };
      this.committedTickSpecKey = "";
      this.committedTickSpec = null;
      this.syncZoomSlider();
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const width = Math.max(1, rect.width || this.surface.clientWidth || 800);
    const height = Math.max(1, rect.height || this.surface.clientHeight || 480);
    const primaryLength = this.orientation === "horizontal" ? width : height;
    const axisCross = this.orientation === "horizontal" ? height / 2 : width * 0.58;
    const padding = this.axisPadding(primaryLength);
    const usable = Math.max(1, primaryLength - padding * 2);
    this.surface.style.setProperty("--timeline-axis-cross", `${axisCross}px`);

    this.renderWindow = createRenderWindow(this.viewport, {
      overscanRatio: OVERSCAN_RATIO,
      velocityTemporalPerMs: this.interactionVelocity,
      predictionHorizonMs: POINTER_PREDICTION_HORIZON_MS,
    });
    if (this.retention.active) {
      const previousExtent = this.retention.extent;
      this.retention = extendRetention(this.retention, this.renderWindow, this.viewport, 8);
      if (
        this.retention.extent.start < previousExtent.start ||
        this.retention.extent.end > previousExtent.end
      ) {
        this.pendingBufferExpanded = true;
      }
    } else {
      this.retention = commitRetention(this.renderWindow);
    }

    this.renderTemporalContext(padding, usable);
    this.renderRelationshipBands(padding, usable);

    const membershipWindow = this.retention.extent;
    const candidates = this.measuredQueryOccurrences(this.items, membershipWindow);
    const focused = this.focusedId
      ? this.items.find((item) => item.id === this.focusedId) || null
      : null;
    if (focused && !candidates.some((item) => item.id === focused.id)) candidates.push(focused);

    const keep = new Set<string>();
    for (const item of candidates) {
      const key = occurrenceSceneKey(item.id);
      keep.add(key);
      let record = this.scene.get(key);
      if (!record) {
        record = this.createRecord(item);
        this.scene.set(key, record);
        this.animateEntry(record);
      } else {
        record.item = item;
        this.updateRecordContent(record);
      }
      this.positionRecord(record, primaryLength, axisCross);
    }

    this.positionCommittedClusters(padding, usable, axisCross);

    if (!this.retention.active) {
      for (const [key, record] of this.scene) {
        if (keep.has(key)) continue;
        this.scene.delete(key);
        this.removeRecord(record);
      }
    }

    this.stage.dataset.sceneState = this.retention.active ? "interacting" : this.focusedId ? "focused" : "populated";
    this.syncZoomSlider();
    this.updateReadout();
  }

  createRecord(item: TimelineItem): SceneRecord {
    const node = document.createElement("div");
    node.className = "timeline-event";
    node.dataset.id = item.id;

    const terminal = document.createElement("button");
    terminal.type = "button";
    terminal.className = "timeline-event-terminal";
    terminal.dataset.id = item.id;
    terminal.addEventListener("click", () => this.focusItem(item.id));

    const visual = document.createElement("span");
    visual.className = "timeline-event-dot";
    visual.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "timeline-event-copy";
    terminal.append(visual, copy);

    const connector = document.createElement("span");
    connector.className = "timeline-event-connector";
    const connectorTurn = document.createElement("span");
    connectorTurn.className = "timeline-event-connector-turn";
    node.append(connector, connectorTurn, terminal);

    let range: HTMLButtonElement | null = null;
    if (Number.isFinite(item.end)) {
      range = document.createElement("button");
      range.type = "button";
      range.className = "timeline-range-segment";
      range.dataset.id = item.id;
      range.addEventListener("click", () => this.focusItem(item.id));
      this.stage.append(range);
    }

    this.stage.append(node);
    this.frameCreatedObjects += range ? 2 : 1;
    const record = { item, node, terminal, range, visual, copy };
    this.bindRecordInteractionTarget(record, terminal);
    if (range) this.bindRecordInteractionTarget(record, range);
    this.updateRecordContent(record);
    return record;
  }

  bindRecordInteractionTarget(record: SceneRecord, target: HTMLButtonElement): void {
    target.addEventListener("pointerenter", () => {
      if (this.retention.active) return;
      this.setRecordInteractionState(record, "hovered", true);
    });
    target.addEventListener("pointerleave", () => {
      this.setRecordInteractionState(record, "hovered", false);
    });
    target.addEventListener("focus", () => {
      this.setRecordInteractionState(record, "focused", true);
    });
    target.addEventListener("blur", () => {
      this.setRecordInteractionState(record, "focused", false);
    });
  }

  setRecordInteractionState(
    record: SceneRecord,
    state: "hovered" | "focused",
    active: boolean,
  ): void {
    const className = `is-${state}`;
    record.node.classList.toggle(className, active);
    record.range?.classList.toggle(className, active);
  }

  clearHoverStates(): void {
    for (const record of this.scene.values()) {
      record.node.classList.remove("is-hovered");
      record.range?.classList.remove("is-hovered");
    }
  }

  updateRecordContent(record: SceneRecord): void {
    const { item, node, terminal, range, visual, copy } = record;
    node.style.setProperty("--event-color", item.color || "var(--accent)");
    node.dataset.terminalShape = item.terminalShape || "rounded";
    node.dataset.connectorStyle = item.connectorStyle || "solid";
    node.dataset.connectorRouting = item.connectorRouting || "straight";
    node.dataset.connectorEndpoint = item.connectorEndpoint || "none";
    const selected = item.id === this.focusedId;
    node.classList.toggle("is-selected", selected);
    range?.classList.toggle("is-selected", selected);

    const primaryTag = item.tags?.[0];
    const iconName =
      typeof primaryTag === "object" && primaryTag?.icon
        ? primaryTag.icon
        : "milestone";
    const media = item.media?.[0];
    const mediaSignature = [media?.src || "", iconName].join("\u0001");
    if (visual.dataset.signature !== mediaSignature) {
      visual.dataset.signature = mediaSignature;
      visual.className = media?.src ? "timeline-event-art" : "timeline-event-dot";
      visual.replaceChildren();
      if (media?.src) {
        const image = document.createElement("img");
        image.className = "timeline-event-art-image";
        image.src = media.src;
        image.alt = "";
        image.decoding = "async";
        image.loading = "lazy";
        visual.append(image);

        const badge = document.createElement("span");
        badge.className = "timeline-event-icon-badge";
        const badgeIcon =
          presentation && typeof presentation.createIcon === "function"
            ? presentation.createIcon(iconName, { size: 18 })
            : null;
        if (badgeIcon) badge.append(badgeIcon);
        visual.append(badge);
      } else {
        const icon =
          presentation && typeof presentation.createIcon === "function"
            ? presentation.createIcon(iconName, { size: 24 })
            : null;
        if (icon) visual.append(icon);
        else visual.textContent = "•";
      }
    }

    node.dataset.connectorWeight = item.connectorWeight || "normal";

    const strong = copy.querySelector("strong") || document.createElement("strong");
    strong.textContent = item.title || item.id;
    const detail = copy.querySelector("span") || document.createElement("span");
    detail.textContent =
      Number.isFinite(item.end) && item.endLabel
        ? `${item.startLabel || ""} → ${item.endLabel}`
        : item.startLabel || "";
    if (!strong.parentNode) copy.append(strong);
    if (!detail.parentNode) copy.append(detail);

    terminal.setAttribute(
      "aria-label",
      [item.title || item.id, detail.textContent].filter(Boolean).join(", "),
    );

    if (range) {
      range.style.setProperty("--event-color", item.color || "var(--accent)");
      const rangeLabel = `${item.title || item.id} · ${item.startLabel || item.start} → ${item.endLabel || item.end}`;
      range.dataset.tooltip = rangeLabel;
      range.title = rangeLabel;
      range.setAttribute("aria-label", rangeLabel);
    }
  }

  positionRecord(record: SceneRecord, primaryLength: number, axisCross: number): void {
    const { item, node, terminal, range } = record;
    const span = Math.max(MIN_SPAN_MS, this.viewport.end - this.viewport.start);
    const coordinate = (time: number): number =>
      ((time - this.viewport.start) / span) * primaryLength;

    const anchor =
      visibleIntervalAnchor(item, this.viewport) ??
      visibleIntervalAnchor(item, this.renderWindow) ??
      item.start;
    const primary = coordinate(anchor);
    const lane = this.visualLaneFor(item);
    const clusterId = this.committedClusterByItem.get(item.id);
    const hiddenByCluster = Boolean(clusterId) && item.id !== this.focusedId;
    node.hidden = hiddenByCluster;
    if (range) range.hidden = hiddenByCluster;
    const laneDistance = 72 + Math.max(0, Math.abs(lane) - 1) * 62;
    const terminalCross = axisCross + (lane < 0 ? -laneDistance : laneDistance);
    const routeOffset = connectorRouteOffset(
      item.connectorRouting || "straight",
      terminalCross,
      this.orientation === "horizontal"
        ? Math.max(1, this.surface.getBoundingClientRect().height)
        : Math.max(1, this.surface.getBoundingClientRect().width),
      Math.abs(lane),
    );
    const shiftedCross = terminalCross + routeOffset;

    const labelBefore =
      this.orientation === "horizontal" ? primary > primaryLength / 2 : lane < 0;
    node.dataset.side = labelBefore ? "before" : "after";
    node.classList.toggle("label-before", labelBefore);
    node.classList.toggle("is-buffered", !itemOverlapsWindow(item, this.viewport));

    if (this.orientation === "horizontal") {
      node.style.transform = `translate3d(${primary}px, ${shiftedCross}px, 0)`;
    } else {
      node.style.transform = `translate3d(${shiftedCross}px, ${primary}px, 0)`;
    }

    terminal.tabIndex = itemOverlapsWindow(item, this.viewport) ? 0 : -1;

    const connector = node.querySelector<HTMLElement>(".timeline-event-connector");
    const connectorTurn = node.querySelector<HTMLElement>(".timeline-event-connector-turn");
    if (connector && connectorTurn) {
      const segment = connectorSegment(axisCross, shiftedCross);
      const connectorThickness =
        item.connectorWeight === "fine" ? 1 : item.connectorWeight === "strong" ? 4 : 2;
      if (this.orientation === "horizontal") {
        connector.style.left = "0";
        connector.style.top = `${segment.offset}px`;
        connector.style.width = `${connectorThickness}px`;
        connector.style.height = `${Math.max(1, segment.length)}px`;
        connectorTurn.style.left = "0";
        connectorTurn.style.top = `${Math.min(-routeOffset, 0)}px`;
        connectorTurn.style.width = `${Math.max(1, Math.abs(routeOffset))}px`;
        connectorTurn.style.height = `${connectorThickness}px`;
      } else {
        connector.style.left = `${segment.offset}px`;
        connector.style.top = "0";
        connector.style.width = `${Math.max(1, segment.length)}px`;
        connector.style.height = `${connectorThickness}px`;
        connectorTurn.style.left = `${Math.min(-routeOffset, 0)}px`;
        connectorTurn.style.top = "0";
        connectorTurn.style.width = `${connectorThickness}px`;
        connectorTurn.style.height = `${Math.max(1, Math.abs(routeOffset))}px`;
      }
    }

    if (range && Number.isFinite(item.end)) {
      const clippedStart = Math.max(item.start, this.renderWindow.start);
      const clippedEnd = Math.min(Number(item.end), this.renderWindow.end);
      const startPosition = coordinate(clippedStart);
      const endPosition = coordinate(clippedEnd);
      const length = Math.max(2, endPosition - startPosition);
      range.classList.toggle("is-buffered", !itemOverlapsWindow(item, this.viewport));
      range.tabIndex = itemOverlapsWindow(item, this.viewport) ? 0 : -1;
      if (this.orientation === "horizontal") {
        range.style.transform = `translate3d(${startPosition}px, 0, 0)`;
        range.style.width = `${length}px`;
        range.style.height = "";
      } else {
        range.style.transform = `translate3d(0, ${startPosition}px, 0)`;
        range.style.height = `${length}px`;
        range.style.width = "";
      }
    }
  }

  animateEntry(record: SceneRecord): void {
    if (this.reducedMotionQuery?.matches || typeof record.terminal.animate !== "function") return;
    record.terminal.animate(
      [{ opacity: 0, scale: "0.97" }, { opacity: 1, scale: "1" }],
      { duration: 150, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
    record.range?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 150,
      easing: "ease-out",
    });
  }

  removeRecord(record: SceneRecord): void {
    record.node.remove();
    record.range?.remove();
    this.frameDestroyedObjects += record.range ? 2 : 1;
  }

  emitViewport(committed: boolean): void {
    this.root.dispatchEvent(
      new CustomEvent("timelineviewportchange", {
        bubbles: true,
        detail: {
          viewport: { ...this.viewport },
          committed,
          renderWindow: { ...this.renderWindow },
        },
      }),
    );
  }

  getViewport(): TemporalWindow {
    return { ...this.viewport };
  }

  hasFocusedItem(): boolean {
    return Boolean(this.focusedId);
  }

  focusedItemId(): string | null {
    return this.focusedId;
  }

  setOrientation(orientation: string, options = {}): void {
    const normalized: Orientation =
      orientation === "vertical" || orientation === "portrait" ? "vertical" : "horizontal";
    if (normalized === this.orientation) return;
    this.runStructuralTransaction(() => {
      this.orientation = normalized;
      this.geometryMeasurements.clear();
      this.applyOrientation();
      this.root.dispatchEvent(
        new CustomEvent("timelineorientationchange", {
          bubbles: true,
          detail: { orientation: normalized, options },
        }),
      );
    });
  }

  getOrientation(): Orientation {
    return this.orientation;
  }

  applyOrientation(): void {
    const portrait = this.orientation === "vertical";
    this.root.dataset.orientation = portrait ? "portrait" : "landscape";
    this.surface.classList.toggle("is-portrait", portrait);
    this.surface.classList.toggle("is-landscape", !portrait);
    if (this.zoomSlider) {
      this.zoomSlider.setAttribute("aria-orientation", portrait ? "vertical" : "horizontal");
    }
    if (this.orientationToggle) {
      this.orientationToggle.setAttribute(
        "aria-label",
        portrait ? "Switch to landscape timeline" : "Switch to portrait timeline",
      );
    }
  }

  refreshLayout(): void {
    this.scheduleRender();
  }

  runStructuralTransaction(update: () => void): void {
    this.cancelInertia();
    this.beginInteraction();
    this.root.dataset.sceneState = "settling";
    this.stage.dataset.sceneState = "settling";

    const activeElement =
      document.activeElement instanceof HTMLElement && this.surface.contains(document.activeElement)
        ? document.activeElement
        : null;

    const commit = (): void => {
      update();
      this.commitInteraction();
      if (activeElement?.isConnected) {
        try {
          activeElement.focus({ preventScroll: true });
        } catch {
          // Structural composition should not fail if focus restoration is rejected.
        }
      }
    };

    const canTransition =
      !this.reducedMotionQuery?.matches &&
      typeof document.startViewTransition === "function" &&
      !Boolean((document as Document & { activeViewTransition?: unknown }).activeViewTransition);

    if (canTransition) {
      try {
        document.startViewTransition(commit);
        return;
      } catch {
        // Fall through to synchronous retained transaction.
      }
    }
    commit();
  }

  createFocusHero(item: TimelineItem): HTMLElement {
    const hero = document.createElement("section");
    hero.className = "timeline-focus-hero";
    const media = Array.isArray(item.media) ? item.media.slice(0, 3) : [];
    const activeIndex = media.length ? this.focusMediaIndex % media.length : 0;
    const active = media[activeIndex];

    if (active?.src) {
      const image = document.createElement("img");
      image.className = "timeline-focus-hero-image";
      image.src = active.src;
      image.alt = active.alt || "";
      image.decoding = "async";
      hero.append(image);
    } else {
      hero.classList.add("has-no-media");
      const fallback = document.createElement("div");
      fallback.className = "timeline-focus-hero-fallback";
      fallback.setAttribute("aria-hidden", "true");
      hero.append(fallback);
    }

    const veil = document.createElement("div");
    veil.className = "timeline-focus-hero-veil";

    const kicker = document.createElement("p");
    kicker.className = "timeline-focus-kicker";
    kicker.textContent = item.categoryName || item.kind || "Occurrence";

    const heading = document.createElement("h2");
    heading.id = "timeline-focus-heading";
    heading.className = "timeline-focus-title";
    heading.textContent = item.title || item.id;

    const time = document.createElement("p");
    time.className = "timeline-focus-time";
    const duration = Number.isFinite(item.end)
      ? formatElapsedDuration(Math.max(0, Number(item.end) - item.start))
      : "";
    time.textContent =
      Number.isFinite(item.end) && item.endLabel
        ? `${item.startLabel || ""} → ${item.endLabel}${duration ? ` · Duration ${duration}` : ""}`
        : item.startLabel || "";

    veil.append(kicker, heading, time);
    hero.append(veil);

    if (media.length > 1) {
      const controls = document.createElement("div");
      controls.className = "timeline-focus-slideshow-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Event images");

      media.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "timeline-focus-slide-dot";
        dot.setAttribute("aria-label", `Show image ${index + 1} of ${media.length}`);
        dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
        dot.classList.toggle("is-active", index === activeIndex);
        dot.addEventListener("click", () => {
          this.focusMediaIndex = index;
          this.renderFocus(item);
        });
        controls.append(dot);
      });
      hero.append(controls);
    }

    return hero;
  }

  renderFocus(item: TimelineItem): void {
    this.focusView.tabIndex = -1;
    this.focusView.style.setProperty("--event-color", item.color || "var(--accent)");
    this.focusView.dataset.layout = item.layoutVariant || "hero-split";
    this.focusView.dataset.activeTab = "overview";
    this.focusView.setAttribute("aria-labelledby", "timeline-focus-heading");

    const hero = this.createFocusHero(item);

    const summary = document.createElement("section");
    summary.id = "timeline-focus-context-panel";
    summary.className = "timeline-focus-section timeline-focus-summary";
    summary.setAttribute("aria-label", "Context");
    const description = document.createElement("p");
    description.className = "timeline-focus-description";
    description.textContent =
      item.description || "No narrative description has been recorded for this event.";
    summary.append(description);

    const ordered = [...this.items].sort(
      (left, right) => left.start - right.start || left.id.localeCompare(right.id),
    );
    const currentIndex = ordered.findIndex((candidate) => candidate.id === item.id);
    const actions = document.createElement("div");
    actions.className = "timeline-focus-actions";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "button secondary";
    previous.textContent = "Previous event";
    previous.disabled = currentIndex <= 0;
    previous.addEventListener("click", () => this.focusAdjacent(-1));
    const next = document.createElement("button");
    next.type = "button";
    next.className = "button secondary";
    next.textContent = "Next event";
    next.disabled = currentIndex < 0 || currentIndex >= ordered.length - 1;
    next.addEventListener("click", () => this.focusAdjacent(1));
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary";
    edit.textContent = "Edit event";
    edit.addEventListener("click", () => {
      this.root.dispatchEvent(
        new CustomEvent("timelinefocusedit", { bubbles: true, detail: { id: item.id } }),
      );
      this.closeFocus();
    });
    actions.append(previous, next);
    if (item.editable !== false) actions.append(edit);
    summary.append(actions);

    const place = document.createElement("section");
    place.id = "timeline-focus-place-panel";
    place.className = "timeline-focus-section timeline-focus-place";
    place.setAttribute("aria-label", "Place");
    const placeBackdrop = document.createElement("div");
    placeBackdrop.className = "timeline-focus-section-backdrop timeline-focus-place-backdrop";
    placeBackdrop.dataset.focusMapSlot = "";
    const placeContent = document.createElement("div");
    placeContent.className = "timeline-focus-section-content";
    const location = isRecord(item.location) ? item.location : null;
    const placeName =
      item.locationName ||
      recordString(location, "name") ||
      recordString(location, "geographicIdentifier") ||
      recordString(location, "address");
    if (placeName) {
      const name = document.createElement("p");
      name.className = "timeline-focus-place-name";
      name.textContent = placeName;
      placeContent.append(name);
    } else {
      const missing = document.createElement("p");
      missing.className = "timeline-focus-muted";
      missing.textContent = "No location assigned.";
      placeContent.append(missing);
    }
    const geometry = location && isRecord(location.geometry) ? location.geometry : null;
    const coordinates = geometry?.coordinates;
    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      const coordinateText = document.createElement("p");
      coordinateText.className = "timeline-focus-place-coordinates";
      coordinateText.textContent = `${coordinates[1]}, ${coordinates[0]}`;
      placeContent.append(coordinateText);
    }
    place.append(placeBackdrop, placeContent);

    const evidence = document.createElement("section");
    evidence.id = "timeline-focus-evidence-panel";
    evidence.className = "timeline-focus-section timeline-focus-evidence";
    evidence.setAttribute("aria-label", "Evidence");
    evidence.setAttribute("role", "tabpanel");
    evidence.hidden = true;
    const evidenceRecords = (item.evidence || []).filter(isRecord).slice(0, 6);
    if (evidenceRecords.length) {
      const grid = document.createElement("div");
      grid.className = "timeline-focus-evidence-grid";
      for (const record of evidenceRecords) {
        const card = document.createElement("article");
        card.className = "timeline-focus-evidence-card";
        const type = recordString(record, "type") || "source";
        card.dataset.type = type;

        const header = document.createElement("div");
        header.className = "timeline-focus-evidence-header";
        const icon =
          presentation && typeof presentation.createIcon === "function"
            ? presentation.createIcon("evidence", { size: 20 })
            : null;
        if (icon) header.append(icon);
        const typeLabel = document.createElement("span");
        typeLabel.className = "timeline-focus-evidence-type";
        typeLabel.textContent = type;
        header.append(typeLabel);

        const title = document.createElement("h4");
        title.className = "timeline-focus-evidence-title";
        title.textContent = recordString(record, "title") || "Untitled evidence";
        card.append(header, title);

        const meta = [recordString(record, "sourceName"), recordString(record, "publishedAt")]
          .filter(Boolean)
          .join(" · ");
        if (meta) {
          const metadata = document.createElement("p");
          metadata.className = "timeline-focus-evidence-meta";
          metadata.textContent = meta;
          card.append(metadata);
        }
        const note = recordString(record, "note");
        if (note) {
          const noteElement = document.createElement("p");
          noteElement.className = "timeline-focus-evidence-note";
          noteElement.textContent = note;
          card.append(noteElement);
        }
        const url = recordString(record, "url");
        const file = isRecord(record.file) ? record.file : null;
        if (url || recordString(file, "blobKey")) {
          const evidenceActions = document.createElement("div");
          evidenceActions.className = "timeline-focus-evidence-actions";
          if (url) {
            const link = document.createElement("a");
            link.className = "button secondary";
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = type === "article" ? "Open source" : "Open document";
            evidenceActions.append(link);
          }
          const blobKey = recordString(file, "blobKey");
          if (blobKey) {
            const open = document.createElement("button");
            open.type = "button";
            open.className = "button secondary";
            open.textContent = "Open local PDF";
            open.addEventListener("click", () => {
              this.root.dispatchEvent(
                new CustomEvent("timelineevidenceopen", {
                  bubbles: true,
                  detail: { id: recordString(record, "id") },
                }),
              );
            });
            evidenceActions.append(open);
          }
          card.append(evidenceActions);
        }
        grid.append(card);
      }
      evidence.append(grid);
      const hiddenCount = Math.max(0, (item.evidence?.length || 0) - evidenceRecords.length);
      if (hiddenCount) {
        const more = document.createElement("p");
        more.className = "timeline-focus-evidence-more";
        more.textContent = `${hiddenCount} more evidence record${hiddenCount === 1 ? "" : "s"} available`;
        evidence.append(more);
      }
    } else {
      const missing = document.createElement("p");
      missing.className = "timeline-focus-muted";
      missing.textContent = "No supporting evidence attached.";
      evidence.append(missing);
    }

    const tabs = document.createElement("div");
    tabs.className = "timeline-focus-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Focused event views");
    const overviewTab = document.createElement("button");
    overviewTab.type = "button";
    overviewTab.className = "timeline-focus-tab is-active";
    overviewTab.textContent = "Overview";
    overviewTab.setAttribute("role", "tab");
    overviewTab.setAttribute("aria-selected", "true");
    overviewTab.setAttribute("aria-controls", "timeline-focus-context-panel timeline-focus-place-panel");
    const evidenceTab = document.createElement("button");
    evidenceTab.type = "button";
    evidenceTab.className = "timeline-focus-tab";
    evidenceTab.textContent = "Evidence";
    evidenceTab.setAttribute("role", "tab");
    evidenceTab.setAttribute("aria-selected", "false");
    evidenceTab.setAttribute("aria-controls", "timeline-focus-evidence-panel");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "button primary timeline-focus-close";
    close.textContent = "Close";
    close.setAttribute("aria-label", "Return to timeline");
    close.addEventListener("click", () => this.closeFocus());

    const setFocusTab = (name: "overview" | "evidence"): void => {
      const evidenceActive = name === "evidence";
      const apply = () => {
        this.focusView.dataset.activeTab = name;
        summary.hidden = evidenceActive;
        place.hidden = evidenceActive;
        evidence.hidden = !evidenceActive;
        overviewTab.classList.toggle("is-active", !evidenceActive);
        evidenceTab.classList.toggle("is-active", evidenceActive);
        overviewTab.setAttribute("aria-selected", String(!evidenceActive));
        evidenceTab.setAttribute("aria-selected", String(evidenceActive));
      };
      if (
        !this.reducedMotionQuery?.matches &&
        typeof document.startViewTransition === "function" &&
        !Boolean((document as Document & { activeViewTransition?: unknown }).activeViewTransition)
      ) {
        try {
          document.startViewTransition(apply);
        } catch {
          apply();
        }
      } else {
        apply();
      }
      if (!evidenceActive) {
        requestAnimationFrame(() => {
          this.root.dispatchEvent(
            new CustomEvent("timelinefocusrender", { bubbles: true, detail: { id: item.id } }),
          );
        });
      }
    };
    overviewTab.addEventListener("click", () => setFocusTab("overview"));
    evidenceTab.addEventListener("click", () => setFocusTab("evidence"));
    tabs.append(overviewTab, evidenceTab, close);

    this.focusView.replaceChildren(tabs, hero, summary, place, evidence);
    this.root.dispatchEvent(
      new CustomEvent("timelinefocusrender", {
        bubbles: true,
        detail: { id: item.id },
      }),
    );
  }

  focusAdjacent(delta: number, options: { wrap?: boolean } = {}): boolean {
    if (!this.items.length) return false;
    const ordered = [...this.items].sort(
      (left, right) => left.start - right.start || left.id.localeCompare(right.id),
    );
    const currentIndex = ordered.findIndex((item) => item.id === this.focusedId);
    let nextIndex =
      currentIndex < 0 ? (delta < 0 ? ordered.length - 1 : 0) : currentIndex + (delta < 0 ? -1 : 1);

    if (options.wrap) nextIndex = (nextIndex + ordered.length) % ordered.length;
    if (nextIndex < 0 || nextIndex >= ordered.length) return false;

    this.focusMediaIndex = 0;
    return this.focusItem(ordered[nextIndex].id);
  }

  stepFocusMedia(delta: number): boolean {
    const item = this.items.find((candidate) => candidate.id === this.focusedId);
    const media = item?.media || [];
    if (!item || media.length < 2) return false;

    const direction = delta < 0 ? -1 : 1;
    this.focusMediaIndex = (this.focusMediaIndex + direction + media.length) % media.length;
    this.renderFocus(item);
    return true;
  }

  // Keep this signature stable while callers migrate: focusItem(id, options = {})
  focusItem(id: string, options: { moveViewport?: boolean } = {}) {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item) return false;
    const moveViewport = options.moveViewport !== false;
    if (this.focusedId !== id) this.focusMediaIndex = 0;

    const update = () => {
      this.focusedId = id;
      this.syncSemanticChronologySelection();
      this.root.classList.add("is-event-focused");
      this.root.dataset.sceneState = "focused";
      this.focusView.hidden = false;
      this.renderFocus(item);
      if (typeof (this.focusView as HTMLElement & { showPopover?: () => void }).showPopover === "function") {
        try {
          (this.focusView as HTMLElement & { showPopover: () => void }).showPopover();
        } catch {
          // The popover may already be open.
        }
      }

      if (moveViewport) {
        const sorted = [...this.items].sort((left, right) => left.start - right.start);
        const index = sorted.findIndex((candidate) => candidate.id === id);
        const local = sorted.slice(Math.max(0, index - 1), Math.min(sorted.length, index + 2));
        const localStart = Math.min(...local.map((candidate) => candidate.start));
        const localEnd = Math.max(
          ...local.map((candidate) =>
            Number.isFinite(candidate.end) ? Number(candidate.end) : candidate.start,
          ),
        );
        const raw = normalizedViewport(localStart, localEnd);
        const span = Math.max(DEFAULT_SPAN_MS / 24, raw.end - raw.start);
        const center = (raw.start + raw.end) / 2;
        this.viewport = { start: center - span * 0.6, end: center + span * 0.6 };
      }

      this.root.dispatchEvent(
        new CustomEvent("timelinefocuschange", {
          bubbles: true,
          detail: { focused: true, id },
        }),
      );
      this.root.dispatchEvent(
        new CustomEvent("timelinefocusrender", {
          bubbles: true,
          detail: { id },
        }),
      );
    };

    this.runStructuralTransaction(update);
    return true;
  }

  focus(itemId: string): void {
    this.focusItem(itemId);
  }

  ensureFocusPopover(): void {
    if (!this.focusedId || this.focusView.hidden) return;
    const focus = this.focusView as HTMLElement & { matches: (selector: string) => boolean; showPopover?: () => void };
    if (focus.matches(":popover-open") || typeof focus.showPopover !== "function") return;
    try {
      focus.showPopover();
    } catch {
      // A concurrent View Transition/top-layer update can temporarily reject this.
    }
  }

  closeFocus(): void {
    if (!this.focusedId) return;
    const previous = this.focusedId;
    const update = () => {
      this.focusedId = null;
      this.syncSemanticChronologySelection();
      this.root.classList.remove("is-event-focused");
      this.root.dataset.sceneState = this.items.length ? "populated" : "empty";
      const focus = this.focusView as HTMLElement & { matches: (selector: string) => boolean; hidePopover?: () => void };
      if (focus.matches(":popover-open") && typeof focus.hidePopover === "function") {
        try {
          focus.hidePopover();
        } catch {
          // Already closing.
        }
      }
      this.focusView.hidden = true;
      this.focusView.replaceChildren();
      this.focusView.style.removeProperty("--event-color");
      this.focusView.removeAttribute("aria-labelledby");
      delete this.focusView.dataset.layout;
      delete this.focusView.dataset.activeTab;
      this.render();
      this.root.dispatchEvent(
        new CustomEvent("timelinefocuschange", {
          bubbles: true,
          detail: { focused: false, id: previous },
        }),
      );
    };
    this.runStructuralTransaction(update);
  }

  unfocus(): void {
    this.closeFocus();
  }

  updateReadout(): void {
    const start = new Date(this.viewport.start);
    const end = new Date(this.viewport.end);
    this.readout.textContent = `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`;
  }
}

export const TimelineView = Object.freeze({
  create(root: HTMLElement): TimelineViewController | null {
    if (!(root instanceof HTMLElement)) return null;
    return new TimelineViewController(root);
  },
  geometry: Object.freeze({
    connectorSegment,
    connectorRouteOffset,
    visibleIntervalAnchor,
    itemOverlapsViewport,
    wheelZoomFactor,
  }),
});
