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
  visibleIntervalAnchor,
  type TemporalRetentionState,
  type TemporalWindow,
} from "../src/projection/temporal-scene.ts";
import { TimelineMotion as motion } from "./timeline-motion.ts";

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
  tags?: string[];
  layoutVariant?: string;
  locationName?: string;
  location?: unknown;
  evidence?: unknown[];
  relations?: unknown[];
  relationChanges?: unknown[];
  graphContext?: unknown;
}

interface SetItemsOptions {
  focusId?: string | null;
  allCoordinates?: number[];
  relationships?: unknown[];
}

interface SceneRecord {
  item: TimelineItem;
  node: HTMLDivElement;
  terminal: HTMLButtonElement;
  range: HTMLButtonElement | null;
  copy: HTMLSpanElement;
}

interface PointerSample {
  coordinate: number;
  time: number;
}

interface PointerDragState {
  pointerId: number;
  coordinate: number;
  lastCoordinate: number;
  lastTime: number;
  viewport: TemporalWindow;
  length: number;
  samples: PointerSample[];
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
  items: TimelineItem[] = [];
  relationships: unknown[] = [];
  allCoordinates: number[] = [];
  viewport: TemporalWindow = { start: 0, end: DEFAULT_SPAN_MS };
  renderWindow: TemporalWindow = { start: 0, end: DEFAULT_SPAN_MS };
  retention: TemporalRetentionState = commitRetention(this.renderWindow);
  focusedId: string | null = null;
  focusMediaIndex = 0;
  orientation: Orientation = "horizontal";
  scene = new Map<string, SceneRecord>();
  pointerDrag: PointerDragState | null = null;
  touchPointers = new Map<number, TouchPointerState>();
  pinch: PinchState | null = null;
  touchTap: TouchTapState | null = null;
  lastTouchTap: LastTouchTap | null = null;
  suppressClickUntil = 0;
  interactionVelocity = 0;
  renderFrame = 0;
  inertiaAnimationFrame = 0;
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

    this.bind();
    this.applyOrientation();
  }

  bind(): void {
    this.orientationToggle?.addEventListener("click", () => {
      this.setOrientation(this.orientation === "horizontal" ? "vertical" : "horizontal");
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

        this.beginInteraction();
        this.viewport = next;
        this.interactionVelocity = 0;
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
        // Browser cancellation or lifecycle changes may have already released capture.
      }
    };

    const beginSurfaceDrag = (
      pointerId: number,
      point: { x: number; y: number },
      sourceEvent: PointerEvent | null = null,
    ): void => {
      const rect = this.surface.getBoundingClientRect();
      const coordinate = this.orientation === "horizontal" ? point.x : point.y;
      const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
      this.cancelInertia();
      this.beginInteraction();
      this.pointerDrag = {
        pointerId,
        coordinate,
        lastCoordinate: coordinate,
        lastTime: sourceEvent ? Number(sourceEvent.timeStamp) || performance.now() : performance.now(),
        viewport: { ...this.viewport },
        length,
        samples: [],
      };
      if (sourceEvent) motion.appendPointerSamples(this.pointerDrag.samples, sourceEvent, this.orientation);
      try {
        if (!this.surface.hasPointerCapture(pointerId)) this.surface.setPointerCapture(pointerId);
      } catch {
        // Pointer capture is opportunistic; browser gesture cancellation may prevent it.
      }
      this.root.dataset.sceneState = "interacting";
    };

    const pinchGeometry = (): { distance: number; ratio: number } | null => {
      if (this.touchPointers.size < 2) return null;
      const [first, second] = Array.from(this.touchPointers.values()).slice(0, 2);
      if (!first || !second) return null;
      const rect = this.surface.getBoundingClientRect();
      const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
      const midpointX = (first.x + second.x) / 2;
      const midpointY = (first.y + second.y) / 2;
      const primary =
        this.orientation === "horizontal" ? midpointX - rect.left : midpointY - rect.top;
      return {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        ratio: clamp(primary / length, 0, 1),
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
          // A cancelled browser gesture may no longer be capturable.
        }
      }
      return true;
    };

    const registerTouchTap = (event: PointerEvent, tap: TouchTapState | null): boolean => {
      if (!tap || tap.cancelled) return false;
      const now = performance.now();
      const point = { x: event.clientX, y: event.clientY };
      const previous = this.lastTouchTap;
      this.touchTap = null;

      if (
        previous &&
        now - previous.time <= TOUCH_DOUBLE_TAP_MS &&
        Math.hypot(point.x - previous.x, point.y - previous.y) <= TOUCH_DOUBLE_TAP_DISTANCE_PX
      ) {
        const rect = this.surface.getBoundingClientRect();
        const primary =
          this.orientation === "horizontal" ? point.x - rect.left : point.y - rect.top;
        const length = Math.max(1, this.orientation === "horizontal" ? rect.width : rect.height);
        const ratio = clamp(primary / length, 0, 1);
        const currentSpan = Math.max(MIN_SPAN_MS, this.viewport.end - this.viewport.start);
        const nextSpan = Math.max(MIN_SPAN_MS, currentSpan * DOUBLE_TAP_ZOOM_FACTOR);
        const anchor = this.viewport.start + currentSpan * ratio;
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
      const interrupted = Boolean(
        this.pointerDrag || this.pinch || this.touchPointers.size || this.inertiaAnimationFrame,
      );

      this.cancelInertia();
      this.touchPointers.clear();
      this.pinch = null;
      this.touchTap = null;
      this.lastTouchTap = null;
      this.pointerDrag = null;
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
      if (!this.items.length || event.button !== 0) return;
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

      if (this.pinch) return;
      beginSurfaceDrag(event.pointerId, { x: event.clientX, y: event.clientY }, event);
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
        const nextStart = this.pinch.anchorTime - nextSpan * geometry.ratio;
        this.viewport = { start: nextStart, end: nextStart + nextSpan };
        this.interactionVelocity = 0;
        this.scheduleRender();
        this.emitViewport(false);
        return;
      }

      const drag = this.pointerDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      motion.appendPointerSamples(drag.samples, event, this.orientation);
      const coordinate = this.orientation === "horizontal" ? event.clientX : event.clientY;
      const deltaPixels = coordinate - drag.coordinate;
      const span = drag.viewport.end - drag.viewport.start;
      const temporalDelta = -(deltaPixels / drag.length) * span;
      const target = {
        start: drag.viewport.start + temporalDelta,
        end: drag.viewport.end + temporalDelta,
      };
      const now = Number(event.timeStamp) || performance.now();
      const elapsed = Math.max(1, now - drag.lastTime);
      const response = motion.responseForElapsed(elapsed);
      this.viewport = {
        start: this.viewport.start + (target.start - this.viewport.start) * response,
        end: this.viewport.end + (target.end - this.viewport.end) * response,
      };

      const incrementalPixels = coordinate - drag.lastCoordinate;
      this.interactionVelocity = -((incrementalPixels / drag.length) * span) / elapsed;
      drag.lastCoordinate = coordinate;
      drag.lastTime = now;
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

      let startedInertia = false;
      if (this.pointerDrag?.pointerId === event.pointerId) {
        motion.appendPointerSamples(this.pointerDrag.samples, event, this.orientation);
        const velocity =
          event.type === "pointercancel"
            ? 0
            : motion.estimatePointerVelocity(this.pointerDrag.samples);
        const length = this.pointerDrag.length;
        this.pointerDrag = null;

        if (Math.abs(velocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
          this.startInertia(velocity, length);
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
    this.relationships = Array.isArray(options.relationships) ? options.relationships : [];
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
    this.render();
    this.emitViewport(true);

    if (options.focusId) this.focusItem(options.focusId, { moveViewport: false });
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

  cancelInertia(): void {
    if (this.inertiaAnimationFrame) cancelAnimationFrame(this.inertiaAnimationFrame);
    this.inertiaAnimationFrame = 0;
  }

  startInertia(velocityPxPerMs: number, length: number): void {
    if (
      this.reducedMotionQuery?.matches ||
      !Number.isFinite(velocityPxPerMs) ||
      Math.abs(velocityPxPerMs) < motion.STOP_VELOCITY_PX_PER_MS
    ) {
      this.commitInteraction();
      return;
    }

    this.cancelInertia();
    this.beginInteraction();
    let velocity = velocityPxPerMs;
    let lastFrame = 0;

    const step = (now: number): void => {
      this.inertiaAnimationFrame = 0;
      if (Math.abs(velocity) < motion.STOP_VELOCITY_PX_PER_MS) {
        this.commitInteraction();
        return;
      }

      const elapsed = lastFrame ? Math.min(48, Math.max(1, now - lastFrame)) : 16;
      lastFrame = now;
      const span = Math.max(MIN_SPAN_MS, this.viewport.end - this.viewport.start);
      const temporalDelta = -((velocity * elapsed) / Math.max(1, length)) * span;
      this.viewport = {
        start: this.viewport.start + temporalDelta,
        end: this.viewport.end + temporalDelta,
      };
      this.interactionVelocity = temporalDelta / elapsed;
      this.scheduleRender();
      this.emitViewport(false);

      velocity = motion.decayVelocity(velocity, elapsed);
      if (Math.abs(velocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
        this.inertiaAnimationFrame = requestAnimationFrame(step);
      } else {
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
    this.interactionVelocity = 0;
    this.renderWindow = createRenderWindow(this.viewport, { overscanRatio: OVERSCAN_RATIO });
    this.retention = commitRetention(this.renderWindow);
    this.root.dataset.sceneState = this.focusedId ? "focused" : this.items.length ? "populated" : "empty";
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

  render(): void {
    const empty = !this.items.length;
    this.root.dataset.empty = empty ? "true" : "false";
    if (empty) {
      this.stage.dataset.sceneState = "empty";
      this.readout.textContent = "No visible events";
      for (const record of this.scene.values()) this.removeRecord(record);
      this.scene.clear();
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const width = Math.max(1, rect.width || this.surface.clientWidth || 800);
    const height = Math.max(1, rect.height || this.surface.clientHeight || 480);
    const primaryLength = this.orientation === "horizontal" ? width : height;
    const axisCross = this.orientation === "horizontal" ? height / 2 : width * 0.58;
    this.surface.style.setProperty("--timeline-axis-cross", `${axisCross}px`);

    this.renderWindow = createRenderWindow(this.viewport, {
      overscanRatio: OVERSCAN_RATIO,
      velocityTemporalPerMs: this.interactionVelocity,
      predictionHorizonMs: POINTER_PREDICTION_HORIZON_MS,
    });
    if (this.retention.active) {
      this.retention = extendRetention(this.retention, this.renderWindow, this.viewport, 8);
    } else {
      this.retention = commitRetention(this.renderWindow);
    }

    const membershipWindow = this.retention.extent;
    const candidates = queryOccurrences(this.items, membershipWindow);
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

    if (!this.retention.active) {
      for (const [key, record] of this.scene) {
        if (keep.has(key)) continue;
        this.scene.delete(key);
        this.removeRecord(record);
      }
    }

    this.stage.dataset.sceneState = this.retention.active ? "interacting" : this.focusedId ? "focused" : "populated";
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

    const dot = document.createElement("span");
    dot.className = "timeline-event-dot";
    dot.setAttribute("aria-hidden", "true");
    const icon =
      presentation && typeof presentation.createIcon === "function"
        ? presentation.createIcon("milestone", { size: 24 })
        : null;
    if (icon) dot.append(icon);
    else dot.textContent = "•";

    const copy = document.createElement("span");
    copy.className = "timeline-event-copy";
    terminal.append(dot, copy);

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
    const record = { item, node, terminal, range, copy };
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
    const { item, node, terminal, range, copy } = record;
    node.style.setProperty("--event-color", item.color || "var(--accent)");
    node.dataset.terminalShape = item.terminalShape || "rounded";
    node.dataset.connectorStyle = item.connectorStyle || "solid";
    node.dataset.connectorRouting = item.connectorRouting || "straight";
    node.dataset.connectorEndpoint = item.connectorEndpoint || "none";
    const selected = item.id === this.focusedId;
    node.classList.toggle("is-selected", selected);
    range?.classList.toggle("is-selected", selected);

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
    const lane = stableLane(item.id, item.lane);
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

    node.dataset.side = lane < 0 ? "before" : "after";
    node.classList.toggle("label-before", lane < 0);
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
      if (this.orientation === "horizontal") {
        connector.style.left = "0";
        connector.style.top = `${segment.offset}px`;
        connector.style.width = "2px";
        connector.style.height = `${Math.max(1, segment.length)}px`;
        connectorTurn.style.left = "0";
        connectorTurn.style.top = `${Math.min(-routeOffset, 0)}px`;
        connectorTurn.style.width = `${Math.max(1, Math.abs(routeOffset))}px`;
        connectorTurn.style.height = "2px";
      } else {
        connector.style.left = `${segment.offset}px`;
        connector.style.top = "0";
        connector.style.width = `${Math.max(1, segment.length)}px`;
        connector.style.height = "2px";
        connectorTurn.style.left = `${Math.min(-routeOffset, 0)}px`;
        connectorTurn.style.top = "0";
        connectorTurn.style.width = "2px";
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
    this.orientation = normalized;
    this.applyOrientation();
    this.render();
    this.root.dispatchEvent(
      new CustomEvent("timelineorientationchange", {
        bubbles: true,
        detail: { orientation: normalized, options },
      }),
    );
  }

  getOrientation(): Orientation {
    return this.orientation;
  }

  applyOrientation(): void {
    const portrait = this.orientation === "vertical";
    this.root.dataset.orientation = portrait ? "portrait" : "landscape";
    this.surface.classList.toggle("is-portrait", portrait);
    this.surface.classList.toggle("is-landscape", !portrait);
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
    this.focusView.style.setProperty("--event-color", item.color || "var(--accent)");
    this.focusView.dataset.layout = item.layoutVariant || "hero-split";
    this.focusView.setAttribute("aria-labelledby", "timeline-focus-heading");

    const hero = this.createFocusHero(item);
    const summary = document.createElement("section");
    summary.className = "timeline-focus-section timeline-focus-summary";

    if (item.description) {
      const description = document.createElement("p");
      description.className = "timeline-focus-description";
      description.textContent = item.description;
      summary.append(description);
    }

    if (item.locationName) {
      const place = document.createElement("p");
      place.className = "timeline-focus-place-name";
      place.textContent = item.locationName;
      summary.append(place);
    }

    this.focusView.replaceChildren(hero, summary);
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

      this.commitInteraction();
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

    const canTransition =
      !this.reducedMotionQuery?.matches &&
      typeof document.startViewTransition === "function" &&
      !Boolean((document as Document & { activeViewTransition?: unknown }).activeViewTransition);
    if (canTransition) {
      try {
        document.startViewTransition(update);
      } catch {
        update();
      }
    } else {
      update();
    }
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
      this.render();
      this.root.dispatchEvent(
        new CustomEvent("timelinefocuschange", {
          bubbles: true,
          detail: { focused: false, id: previous },
        }),
      );
    };
    if (
      !this.reducedMotionQuery?.matches &&
      typeof document.startViewTransition === "function" &&
      !Boolean((document as Document & { activeViewTransition?: unknown }).activeViewTransition)
    ) {
      try {
        document.startViewTransition(update);
        return;
      } catch {
        // Fall through to synchronous state update.
      }
    }
    update();
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
