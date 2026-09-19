(() => {
  "use strict";

  const scale = globalThis.TimelineScale;
  const clustering = globalThis.TimelineClustering;
  const motion = globalThis.TimelineMotion;
  const presentation = globalThis.TimelinePresentation;
  if (!scale) throw new Error("TimelineScale must load before TimelineView.");
  if (!clustering) throw new Error("TimelineClustering must load before TimelineView.");
  if (!motion) throw new Error("TimelineMotion must load before TimelineView.");
  if (!presentation) throw new Error("TimelinePresentation must load before TimelineView.");

  const VIEW_STORAGE_KEY = "timeline:view:v1";
  const DEFAULT_SPAN_MS = 86_400_000;
  const MIN_SPAN_MS = 1;
  const MAX_TICKS = 240;
  const BUTTON_ZOOM_FACTOR = 0.82;
  const ZOOM_RESPONSE_MS = 170;
  const WHEEL_ZOOM_SENSITIVITY = 0.00065;
  const MAX_WHEEL_EXPONENT = 0.045;
  const HORIZONTAL_CLUSTER_THRESHOLD_MIN = 156;
  const HORIZONTAL_CLUSTER_THRESHOLD_MAX = 224;
  const VERTICAL_CLUSTER_THRESHOLD = 74;
  const RELATION_LANES = 4;
  const FOCUS_VIEW_TRANSITION_NAME = "timeline-event-detail-shared";
  const FOCUS_SWAP_TRANSITION_NAME = "timeline-event-detail-swap";
  const FOCUS_TAB_PLACE_TRANSITION_NAME = "timeline-focus-tab-place";
  const FOCUS_TAB_RELATIONS_TRANSITION_NAME = "timeline-focus-tab-relations";
  const FOCUS_TAB_EVIDENCE_TRANSITION_NAME = "timeline-focus-tab-evidence";
  const FOCUS_POPOVER_MARGIN = 12;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeWheelDelta(event, pageLength) {
    let delta = Number(event.deltaY) || 0;
    if (event.deltaMode === 1) delta *= 16;
    if (event.deltaMode === 2) delta *= Math.max(1, pageLength);
    return delta;
  }

  function wheelZoomFactor(deltaPixels) {
    const exponent = clamp(
      Number(deltaPixels) * WHEEL_ZOOM_SENSITIVITY,
      -MAX_WHEEL_EXPONENT,
      MAX_WHEEL_EXPONENT
    );
    return Math.exp(exponent);
  }

  function visibleIntervalAnchor(item, viewport) {
    if (!item || !viewport || !Number.isFinite(item.start)) return null;
    if (!Number.isFinite(item.end)) return item.start;
    const visibleStart = Math.max(item.start, viewport.start);
    const visibleEnd = Math.min(item.end, viewport.end);
    if (visibleEnd < visibleStart) return null;
    return visibleStart + (visibleEnd - visibleStart) / 2;
  }

  function connectorSegment(axisCoordinate, terminalCoordinate) {
    const delta = Number(axisCoordinate) - Number(terminalCoordinate);
    if (!Number.isFinite(delta)) throw new TypeError("Connector coordinates must be finite.");
    return {
      offset: Math.min(0, delta),
      length: Math.abs(delta)
    };
  }

  function loadPreferences() {
    try {
      const raw = localStorage.getItem(VIEW_STORAGE_KEY);
      if (!raw) return { orientation: "horizontal" };
      const parsed = JSON.parse(raw);
      return { orientation: parsed.orientation === "vertical" ? "vertical" : "horizontal" };
    } catch {
      return { orientation: "horizontal" };
    }
  }

  function savePreferences(preferences) {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // View preferences are optional; timeline data persistence is handled elsewhere.
    }
  }

  class TimelineViewController {
    constructor(root) {
      this.root = root;
      this.surface = root.querySelector("#timeline-surface");
      this.focusView = root.querySelector("#timeline-focus-view");
      this.readout = root.querySelector("#timeline-window-readout");
      this.landscapeButton = root.querySelector("#timeline-orientation-landscape");
      this.portraitButton = root.querySelector("#timeline-orientation-portrait");
      this.zoomInButton = root.querySelector("#timeline-zoom-in");
      this.zoomOutButton = root.querySelector("#timeline-zoom-out");
      this.fitVisibleButton = root.querySelector("#timeline-fit");
      this.fitAllButton = root.querySelector("#timeline-fit-all");
      this.items = [];
      this.allCoordinates = [];
      this.relationships = [];
      this.viewport = null;
      this.zoomTarget = null;
      this.selectedId = null;
      this.focusMediaIndex = 0;
      this.focusId = null;
      this.focusForceUnique = false;
      this.expandedClusterItemIds = new Set();
      this.preferences = loadPreferences();
      this.orientation = this.preferences.orientation;
      this.drag = null;
      this.touchPointers = new Map();
      this.pinch = null;
      this.suppressClickUntil = 0;
      this.resizeObserver = null;
      this.focusResizeFrame = 0;
      this.renderFrame = 0;
      this.zoomAnimationFrame = 0;
      this.zoomLastFrame = 0;
      this.zoomAnimationResolve = null;
      this.focusNavigationToken = 0;
      this.inertiaAnimationFrame = 0;
      this.clusterSignature = null;
      this.lastClusterHapticAt = 0;
      this.reducedMotionQuery =
        typeof globalThis.matchMedia === "function"
          ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
          : null;
      this.bind();
      this.applyOrientation();
    }

    bind() {
      this.landscapeButton.addEventListener("click", () => this.setOrientation("horizontal"));
      this.portraitButton.addEventListener("click", () => this.setOrientation("vertical"));
      this.zoomInButton.addEventListener("click", () => this.zoomBy(BUTTON_ZOOM_FACTOR));
      this.zoomOutButton.addEventListener("click", () => this.zoomBy(1 / BUTTON_ZOOM_FACTOR));
      this.fitVisibleButton.addEventListener("click", () => this.fitVisible());
      this.fitAllButton.addEventListener("click", () => this.fitAll());

      this.surface.addEventListener(
        "wheel",
        (event) => {
          if (!this.viewport || !this.items.length) return;
          event.preventDefault();
          const rect = this.surface.getBoundingClientRect();
          const primary =
            this.orientation === "horizontal" ? event.clientX - rect.left : event.clientY - rect.top;
          const length = this.orientation === "horizontal" ? rect.width : rect.height;
          const padding = this.axisPadding(length);
          const usable = Math.max(1, length - padding * 2);
          const ratio = clamp((primary - padding) / usable, 0, 1);
          const deltaPixels = normalizeWheelDelta(event, length);
          const factor = wheelZoomFactor(deltaPixels);
          if (Math.abs(factor - 1) < 0.00001) return;
          this.cancelInertia();
          this.queueZoom(factor, ratio);
        },
        { passive: false }
      );

      this.surface.addEventListener("click", (event) => {
        if (performance.now() < this.suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!this.selectedId || event.target.closest("button, a, input, select, textarea")) return;
        this.closeFocus();
      }, true);

      const beginSurfaceDrag = (pointerId, point, sourceEvent = null) => {
        if (!this.viewport) return;
        const rect = this.surface.getBoundingClientRect();
        const coordinate = this.orientation === "horizontal" ? point.x : point.y;
        this.drag = {
          pointerId,
          coordinate,
          viewport: { ...this.viewport },
          length: this.orientation === "horizontal" ? rect.width : rect.height,
          lastTime: sourceEvent ? (Number(sourceEvent.timeStamp) || performance.now()) : performance.now(),
          samples: []
        };
        if (sourceEvent) motion.appendPointerSamples(this.drag.samples, sourceEvent, this.orientation);
        try {
          if (!this.surface.hasPointerCapture(pointerId)) this.surface.setPointerCapture(pointerId);
        } catch {
          // Pointer capture can fail when a browser has already cancelled a touch gesture.
        }
        this.surface.classList.add("is-panning");
      };

      const pinchGeometry = () => {
        if (this.touchPointers.size < 2) return null;
        const [first, second] = Array.from(this.touchPointers.values()).slice(0, 2);
        const rect = this.surface.getBoundingClientRect();
        const length = this.orientation === "horizontal" ? rect.width : rect.height;
        const padding = this.axisPadding(length);
        const usable = Math.max(1, length - padding * 2);
        const midpoint = {
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2
        };
        const primary = this.orientation === "horizontal"
          ? midpoint.x - rect.left
          : midpoint.y - rect.top;
        return {
          distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
          ratio: clamp((primary - padding) / usable, 0, 1)
        };
      };

      const beginPinch = () => {
        if (!this.viewport) return false;
        const geometry = pinchGeometry();
        if (!geometry) return false;
        const span = this.viewport.end - this.viewport.start;
        this.clearClusterExpansion();
        this.cancelInertia();
        this.cancelViewportAnimation();
        this.drag = null;
        this.surface.classList.remove("is-panning");
        this.pinch = {
          distance: geometry.distance,
          viewport: { ...this.viewport },
          anchorTime: this.viewport.start + span * geometry.ratio
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

      this.surface.addEventListener("pointerdown", (event) => {
        if (!this.viewport || !this.items.length || event.button !== 0) return;
        const interactiveTarget = event.target.closest("button, a, input, select, textarea");

        if (event.pointerType === "touch") {
          this.touchPointers.set(event.pointerId, {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY
          });
          if (this.touchPointers.size >= 2) {
            beginPinch();
            return;
          }
          if (interactiveTarget) return;
        } else if (interactiveTarget) {
          return;
        }

        if (this.pinch) return;
        this.clearClusterExpansion();
        this.cancelViewportAnimation();
        beginSurfaceDrag(
          event.pointerId,
          { x: event.clientX, y: event.clientY },
          event
        );
      });

      this.surface.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" && this.touchPointers.has(event.pointerId)) {
          this.touchPointers.set(event.pointerId, {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY
          });
        }

        if (this.pinch && this.touchPointers.size >= 2) {
          const geometry = pinchGeometry();
          if (!geometry) return;
          event.preventDefault();
          const factor = clamp(this.pinch.distance / geometry.distance, 0.05, 20);
          const zoomed = scale.zoom(
            this.pinch.viewport,
            factor,
            this.pinch.anchorTime,
            MIN_SPAN_MS
          );
          const span = zoomed.end - zoomed.start;
          const start = this.pinch.anchorTime - span * geometry.ratio;
          this.viewport = { start, end: start + span };
          this.scheduleRender();
          return;
        }

        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        motion.appendPointerSamples(this.drag.samples, event, this.orientation);
        const coordinate = this.orientation === "horizontal" ? event.clientX : event.clientY;
        const deltaPixels = coordinate - this.drag.coordinate;
        const padding = this.axisPadding(this.drag.length);
        const usable = Math.max(1, this.drag.length - padding * 2);
        const span = this.drag.viewport.end - this.drag.viewport.start;
        const deltaMs = -(deltaPixels / usable) * span;
        const target = scale.pan(this.drag.viewport, deltaMs);
        const now = Number(event.timeStamp) || performance.now();
        const response = motion.responseForElapsed(now - this.drag.lastTime);
        this.drag.lastTime = now;
        this.viewport = {
          start: this.viewport.start + (target.start - this.viewport.start) * response,
          end: this.viewport.end + (target.end - this.viewport.end) * response
        };
        this.scheduleRender();
      });

      const finishDrag = (event) => {
        const wasPinching = Boolean(this.pinch);
        if (event.pointerType === "touch") this.touchPointers.delete(event.pointerId);

        try {
          if (this.surface.hasPointerCapture(event.pointerId)) this.surface.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer capture may already have been released by pointer cancellation.
        }

        if (wasPinching) {
          this.suppressClickUntil = performance.now() + 450;
          this.drag = null;
          this.surface.classList.remove("is-panning");
          if (this.touchPointers.size >= 2) {
            beginPinch();
            return;
          }
          this.pinch = null;
          const remaining = Array.from(this.touchPointers.values())[0];
          if (remaining && this.viewport) {
            beginSurfaceDrag(remaining.pointerId, remaining);
          }
          return;
        }

        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        motion.appendPointerSamples(this.drag.samples, event, this.orientation);
        const velocity = event.type === "pointercancel"
          ? 0
          : motion.estimatePointerVelocity(this.drag.samples);
        const length = this.drag.length;
        this.drag = null;
        this.surface.classList.remove("is-panning");
        if (Math.abs(velocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
          this.startInertia(velocity, length);
          void motion.pulseHaptic("release");
        }
      };
      this.surface.addEventListener("pointerup", finishDrag);
      this.surface.addEventListener("pointercancel", finishDrag);

      this.root.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !this.selectedId) return;
        event.preventDefault();
        this.closeFocus();
      });

      this.surface.addEventListener("keydown", (event) => {
        if (!this.viewport || !this.items.length || event.target.closest("button")) return;
        const span = this.viewport.end - this.viewport.start;
        const panDelta = span * 0.12;
        const horizontalBack = event.key === "ArrowLeft";
        const horizontalForward = event.key === "ArrowRight";
        const verticalBack = event.key === "ArrowUp";
        const verticalForward = event.key === "ArrowDown";

        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          this.zoomBy(BUTTON_ZOOM_FACTOR);
        } else if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          this.zoomBy(1 / BUTTON_ZOOM_FACTOR);
        } else if (event.key === "Home") {
          event.preventDefault();
          if (event.shiftKey) this.fitAll();
          else this.fitVisible();
        } else if (
          (this.orientation === "horizontal" && (horizontalBack || horizontalForward)) ||
          (this.orientation === "vertical" && (verticalBack || verticalForward))
        ) {
          event.preventDefault();
          this.clearClusterExpansion();
          this.cancelViewportAnimation();
          const backwards = horizontalBack || verticalBack;
          this.animateViewportTo(scale.pan(this.viewport, backwards ? -panDelta : panDelta));
        }
      });


      if ("ResizeObserver" in globalThis) {
        this.resizeObserver = new ResizeObserver((entries) => {
          this.scheduleRender();
          if (
            entries.some((entry) => entry.target === this.focusView) &&
            this.selectedId &&
            this.focusView.matches(":popover-open")
          ) {
            cancelAnimationFrame(this.focusResizeFrame);
            this.focusResizeFrame = requestAnimationFrame(() => {
              this.focusResizeFrame = 0;
              this.positionFocusPopover();
            });
          }
        });
        this.resizeObserver.observe(this.surface);
        this.resizeObserver.observe(this.focusView);
      } else {
        window.addEventListener("resize", () => {
          this.scheduleRender();
          if (this.selectedId && this.focusView.matches(":popover-open")) {
            this.positionFocusPopover();
          }
        });
      }
    }

    prefersReducedMotion() {
      return Boolean(this.reducedMotionQuery && this.reducedMotionQuery.matches);
    }

    setOrientation(orientation, options = {}) {
      const next = orientation === "vertical" ? "vertical" : "horizontal";
      const persist = options.persist !== false;
      const focus = options.focus !== false;
      if (next === this.orientation) return;
      this.cancelViewportAnimation();
      this.orientation = next;
      if (persist) {
        this.preferences.orientation = next;
        savePreferences(this.preferences);
      }
      this.applyOrientation();
      this.scheduleRender();
      if (focus) this.surface.focus({ preventScroll: true });
    }

    getOrientation() {
      return this.orientation;
    }

    refreshLayout() {
      this.scheduleRender();
      if (this.selectedId && this.focusView.matches(":popover-open")) {
        requestAnimationFrame(() => this.positionFocusPopover());
      }
    }

    applyOrientation() {
      const vertical = this.orientation === "vertical";
      this.root.dataset.orientation = vertical ? "portrait" : "landscape";
      this.surface.classList.toggle("is-portrait", vertical);
      this.surface.classList.toggle("is-landscape", !vertical);
      this.landscapeButton.setAttribute("aria-pressed", String(!vertical));
      this.portraitButton.setAttribute("aria-pressed", String(vertical));
      this.surface.setAttribute(
        "aria-label",
        vertical
          ? "Portrait timeline. Time runs from top to bottom. Drag vertically to pan; use plus and minus to zoom."
          : "Landscape timeline. Time runs from left to right. Drag horizontally to pan; use plus and minus to zoom."
      );
      this.root.dispatchEvent(new CustomEvent("timelineorientationchange", {
        bubbles: true,
        detail: { orientation: this.orientation }
      }));
    }

    setItems(items, options = {}) {
      const nextItems = Array.isArray(items)
        ? items
            .filter((item) => item && Number.isFinite(item.start))
            .map((item) => ({ ...item, end: Number.isFinite(item.end) ? item.end : null }))
        : [];
      const previousSignature = this.items.map((item) => item.id).join("|");
      const nextSignature = nextItems.map((item) => item.id).join("|");
      this.items = nextItems;
      const suppliedCoordinates = Array.isArray(options.allCoordinates)
        ? options.allCoordinates.map(Number).filter(Number.isFinite)
        : [];
      this.allCoordinates = suppliedCoordinates.length ? suppliedCoordinates : this.itemCoordinates();
      this.relationships = Array.isArray(options.relationships)
        ? options.relationships
            .filter((relationship) => relationship && Number.isFinite(relationship.start))
            .map((relationship) => ({
              ...relationship,
              end: Number.isFinite(relationship.end) ? relationship.end : relationship.start
            }))
        : [];
      this.focusId = options.focusId || null;

      if (!this.items.length) {
        this.cancelViewportAnimation();
        this.viewport = null;
        this.closeFocus();
        this.root.hidden = false;
        this.scheduleRender();
        return;
      }

      this.root.hidden = false;
      if (!this.viewport || previousSignature !== nextSignature) this.ensureUsefulViewport();
      if (this.focusId && !this.selectedId) this.ensureItemVisible(this.focusId);
      if (this.selectedId && !this.items.some((item) => item.id === this.selectedId)) {
        this.closeFocus();
      } else if (this.selectedId) {
        const selected = this.items.find((item) => item.id === this.selectedId);
        if (selected) {
          this.renderFocus(selected);
          requestAnimationFrame(() => this.positionFocusPopover());
        }
      }
      this.scheduleRender();
    }

    ensureUsefulViewport() {
      const coordinates = this.itemCoordinates();
      if (!coordinates.length) return;
      if (!this.viewport) {
        this.viewport = scale.fit(coordinates, { paddingRatio: 0.1, minSpanMs: DEFAULT_SPAN_MS });
        return;
      }
      const min = Math.min(...coordinates);
      const max = Math.max(...coordinates);
      const intersects = max >= this.viewport.start && min <= this.viewport.end;
      if (!intersects) this.viewport = scale.fit(coordinates, { paddingRatio: 0.1, minSpanMs: DEFAULT_SPAN_MS });
    }

    ensureItemVisible(id) {
      const item = this.items.find((candidate) => candidate.id === id);
      const target = this.visibilityViewportForItem(item);
      if (!target) return false;
      this.cancelViewportAnimation();
      this.viewport = target;
      return true;
    }

    itemCoordinates(items = this.items) {
      const values = [];
      for (const item of items) {
        values.push(item.start);
        if (Number.isFinite(item.end)) values.push(item.end);
      }
      return values;
    }

    fitCoordinates(coordinates) {
      if (!Array.isArray(coordinates) || !coordinates.length) return;
      this.clearClusterExpansion();
      const target = scale.fit(coordinates, { paddingRatio: 0.1, minSpanMs: DEFAULT_SPAN_MS });
      this.animateViewportTo(target);
      this.surface.focus({ preventScroll: true });
    }

    fitVisible() {
      this.fitCoordinates(this.itemCoordinates());
    }

    fitAll() {
      this.fitCoordinates(this.allCoordinates);
    }

    fit() {
      this.fitVisible();
    }

    zoomBy(factor) {
      if (!this.viewport) return;
      this.queueZoom(factor, 0.5);
      this.surface.focus({ preventScroll: true });
    }

    queueZoom(factor, anchorRatio) {
      if (!this.viewport) return;
      this.clearClusterExpansion();
      this.focusNavigationToken += 1;
      this.resolveViewportAnimation(false);
      const base = this.zoomTarget || this.viewport;
      const span = base.end - base.start;
      const ratio = clamp(Number(anchorRatio), 0, 1);
      const anchor = base.start + span * ratio;
      this.zoomTarget = scale.zoom(base, factor, anchor, MIN_SPAN_MS);
      this.startViewportAnimation();
    }

    resolveViewportAnimation(completed) {
      const resolve = this.zoomAnimationResolve;
      this.zoomAnimationResolve = null;
      if (resolve) resolve(Boolean(completed));
    }

    animateViewportTo(target) {
      if (!this.viewport || this.prefersReducedMotion()) {
        this.cancelViewportAnimation();
        this.viewport = { ...target };
        this.scheduleRender();
        return Promise.resolve(true);
      }
      this.resolveViewportAnimation(false);
      this.zoomTarget = { ...target };
      return new Promise((resolve) => {
        this.zoomAnimationResolve = resolve;
        this.startViewportAnimation();
      });
    }

    startViewportAnimation() {
      if (!this.viewport || !this.zoomTarget) return;
      if (this.prefersReducedMotion()) {
        this.viewport = { ...this.zoomTarget };
        this.zoomTarget = null;
        this.scheduleRender();
        return;
      }
      if (this.zoomAnimationFrame) return;

      const step = (now) => {
        this.zoomAnimationFrame = 0;
        if (!this.viewport || !this.zoomTarget) {
          this.zoomLastFrame = 0;
          this.resolveViewportAnimation(false);
          return;
        }

        const elapsed = this.zoomLastFrame ? clamp(now - this.zoomLastFrame, 1, 48) : 16;
        this.zoomLastFrame = now;
        const response = 1 - Math.exp(-elapsed / ZOOM_RESPONSE_MS);
        const target = this.zoomTarget;
        const next = {
          start: this.viewport.start + (target.start - this.viewport.start) * response,
          end: this.viewport.end + (target.end - this.viewport.end) * response
        };
        const targetSpan = Math.max(MIN_SPAN_MS, target.end - target.start);
        const epsilon = Math.max(0.001, targetSpan * 0.00025);

        if (
          Math.abs(next.start - target.start) <= epsilon &&
          Math.abs(next.end - target.end) <= epsilon
        ) {
          this.viewport = { ...target };
          this.zoomTarget = null;
          this.zoomLastFrame = 0;
          this.scheduleRender();
          this.resolveViewportAnimation(true);
          return;
        }

        this.viewport = next;
        this.scheduleRender();
        this.zoomAnimationFrame = requestAnimationFrame(step);
      };

      this.zoomAnimationFrame = requestAnimationFrame(step);
    }

    cancelViewportAnimation() {
      if (this.zoomAnimationFrame) cancelAnimationFrame(this.zoomAnimationFrame);
      this.zoomAnimationFrame = 0;
      this.zoomLastFrame = 0;
      this.zoomTarget = null;
      this.resolveViewportAnimation(false);
      this.cancelInertia();
    }

    cancelInertia() {
      if (this.inertiaAnimationFrame) cancelAnimationFrame(this.inertiaAnimationFrame);
      this.inertiaAnimationFrame = 0;
    }

    startInertia(initialVelocityPxPerMs, pixelLength) {
      if (!this.viewport || this.prefersReducedMotion()) return;
      this.cancelInertia();
      let velocity = Number(initialVelocityPxPerMs) || 0;
      let lastFrame = 0;

      const step = (now) => {
        this.inertiaAnimationFrame = 0;
        if (!this.viewport || Math.abs(velocity) < motion.STOP_VELOCITY_PX_PER_MS) return;

        const elapsed = lastFrame ? clamp(now - lastFrame, 1, 48) : 16;
        lastFrame = now;
        velocity = motion.decayVelocity(velocity, elapsed);
        const padding = this.axisPadding(pixelLength);
        const usable = Math.max(1, pixelLength - padding * 2);
        const span = this.viewport.end - this.viewport.start;
        const deltaPixels = velocity * elapsed;
        const deltaMs = -(deltaPixels / usable) * span;
        this.viewport = scale.pan(this.viewport, deltaMs);
        this.scheduleRender();

        if (Math.abs(velocity) >= motion.STOP_VELOCITY_PX_PER_MS) {
          this.inertiaAnimationFrame = requestAnimationFrame(step);
        }
      };

      this.inertiaAnimationFrame = requestAnimationFrame(step);
    }

    axisPadding(length) {
      // Reserve enough edge room for terminal anchors and labels. The old 30px
      // minimum allowed the first/last event card to be visibly clipped.
      return clamp(length * 0.075, 48, 80);
    }

    portraitAxisCoordinate(width) {
      if (width >= 560) return width / 2;
      return clamp(width * 0.14, 42, 56);
    }

    scheduleRender() {
      cancelAnimationFrame(this.renderFrame);
      this.renderFrame = requestAnimationFrame(() => this.render());
    }

    clusterThreshold(width) {
      return this.orientation === "horizontal"
        ? clamp(width * 0.14, HORIZONTAL_CLUSTER_THRESHOLD_MIN, HORIZONTAL_CLUSTER_THRESHOLD_MAX)
        : VERTICAL_CLUSTER_THRESHOLD;
    }

    updateClusterHaptics(representations) {
      const signature = representations
        .filter((representation) => representation.kind === "cluster")
        .map((representation) => representation.id)
        .join(";");
      if (this.clusterSignature === null) {
        this.clusterSignature = signature;
        return;
      }
      if (signature === this.clusterSignature) return;
      this.clusterSignature = signature;
      const now = performance.now();
      if (now - this.lastClusterHapticAt < 140) return;
      this.lastClusterHapticAt = now;
      void motion.pulseHaptic("cluster");
    }

    renderTemporalAccents(stage, plan) {
      for (const accent of plan.edgeAccents) {
        const className = accent.kind === "year"
          ? "timeline-month-accent timeline-year-accent"
          : "timeline-month-accent";
        const label = createElement("div", className, accent.label);
        label.dataset.count = String(accent.count || 0);
        label.dataset.temporalAccent = accent.kind;
        if (this.orientation === "horizontal") label.style.left = accent.position + "px";
        else label.style.top = accent.position + "px";
        stage.append(label);
      }

      for (const month of plan.axisMonths) {
        const label = createElement("div", "timeline-axis-month-label", month.label);
        label.dataset.count = String(month.count || 0);
        if (this.orientation === "horizontal") label.style.left = month.position + "px";
        else label.style.top = month.position + "px";
        stage.append(label);
      }
    }

    renderRelationships(stage, padding, usable) {
      const active = this.relationships
        .filter((relationship) => relationship.end >= this.viewport.start && relationship.start <= this.viewport.end)
        .sort((a, b) => a.start - b.start || String(a.id).localeCompare(String(b.id)));
      if (!active.length) return;

      const zone = createElement("div", "timeline-relation-zone");
      stage.append(zone);

      active.forEach((relationship, index) => {
        const startPosition = padding + scale.coordinateFor(relationship.start, this.viewport, usable);
        const endPosition = padding + scale.coordinateFor(relationship.end, this.viewport, usable);
        const segment = createElement("div", "timeline-relation-segment");
        segment.style.setProperty("--relation-lane-offset", `${(index % RELATION_LANES) * 8}px`);
        segment.title = relationship.predicate || "Temporal relationship";
        const clippedStart = clamp(Math.min(startPosition, endPosition), padding, padding + usable);
        const clippedEnd = clamp(Math.max(startPosition, endPosition), padding, padding + usable);
        if (this.orientation === "horizontal") {
          segment.style.left = clippedStart + "px";
          segment.style.width = Math.max(6, clippedEnd - clippedStart) + "px";
        } else {
          segment.style.top = clippedStart + "px";
          segment.style.height = Math.max(6, clippedEnd - clippedStart) + "px";
        }
        stage.append(segment);
      });
    }

    createClusterNode(cluster, position, width, height, axisCross, occupied) {
      const node = createElement("div", "timeline-event timeline-cluster");
      node.dataset.id = cluster.id;
      const connector = createElement("div", "timeline-event-connector");
      const button = createElement("button", "timeline-event-terminal timeline-cluster-terminal");
      button.type = "button";
      button.setAttribute("aria-label", `Select an event and expand cluster of ${cluster.items.length} events`);

      const tiles = createElement("span", "timeline-cluster-tiles");
      for (const item of cluster.items.slice(0, 3)) {
        const tile = createElement("span", "timeline-cluster-tile");
        tile.dataset.clusterItemId = String(item.id);
        tile.title = item.title || item.startLabel || "Timeline event";
        tile.style.setProperty("--cluster-tile-color", item.color || "var(--accent)");
        const iconName = item.tags?.[0]?.icon || "milestone";
        const media = item.media?.[0];
        if (media?.src) {
          const image = document.createElement("img");
          image.className = "timeline-cluster-image";
          image.src = media.src;
          image.alt = "";
          image.decoding = "async";
          image.loading = "lazy";
          tile.append(image);
          const badge = createElement("span", "timeline-cluster-icon-badge");
          badge.append(presentation.createIcon(iconName, { size: 16 }));
          tile.append(badge);
        } else {
          tile.append(presentation.createIcon(iconName, { size: 20 }));
        }
        tiles.append(tile);
      }
      const copy = createElement("span", "timeline-event-copy");
      const title = createElement("strong", "", `${cluster.items.length} events`);
      const detail = createElement("span", "", "Nearby · select and expand");
      copy.append(title, detail);
      button.append(tiles, copy);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const tile = event.target.closest("[data-cluster-item-id]");
        const selectedId = tile?.dataset.clusterItemId || cluster.items[0]?.id;
        this.activateCluster(cluster, selectedId, button);
      });

      node.append(connector, button);

      if (this.orientation === "horizontal") {
        const lane = this.allocateEventLane(position, occupied);
        const focused = Boolean(this.selectedId);
        const side = focused ? -1 : (lane % 2 === 0 ? -1 : 1);
        const depth = focused ? lane : Math.floor(lane / 2);
        const desiredDistance = 82 + depth * 72;
        const inwardLimit = Math.max(64, axisCross - 64);
        const distance = focused ? Math.min(desiredDistance, inwardLimit) : desiredDistance;
        const eventY = axisCross + side * distance;
        const segment = connectorSegment(axisCross, eventY);
        node.style.left = position + "px";
        node.style.top = eventY + "px";
        node.dataset.side = side < 0 ? "before" : "after";
        connector.style.left = "0";
        connector.style.top = segment.offset + "px";
        connector.style.width = "2px";
        connector.style.height = Math.max(1, segment.length) + "px";
        if (position > width - 244) node.classList.add("label-before");
      } else {
        const compact = width < 560;
        const focused = Boolean(this.selectedId);
        const lane = focused ? -1 : (compact ? 1 : cluster.items.length % 2 === 0 ? -1 : 1);
        const desiredDistance = compact
          ? Math.min(110, Math.max(80, width * 0.24))
          : Math.min(232, Math.max(130, width * 0.30));
        const inwardLimit = Math.max(64, axisCross - 72);
        const distance = focused ? Math.min(desiredDistance, inwardLimit) : desiredDistance;
        const eventX = axisCross + lane * distance;
        const segment = connectorSegment(axisCross, eventX);
        node.style.left = eventX + "px";
        node.style.top = position + "px";
        node.dataset.side = lane < 0 ? "before" : "after";
        connector.style.left = segment.offset + "px";
        connector.style.top = "0";
        connector.style.width = Math.max(1, segment.length) + "px";
        connector.style.height = "2px";
        if (lane < 0) node.classList.add("label-before");
      }
      return node;
    }

    visiblePositionFor(item, padding, usable) {
      const anchor = visibleIntervalAnchor(item, this.viewport);
      const time = Number.isFinite(anchor) ? anchor : item.start;
      return padding + scale.coordinateFor(time, this.viewport, usable);
    }

    render() {
      this.renderFrame = 0;
      this.surface.replaceChildren();

      const rect = this.surface.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);

      if (!this.items.length || !this.viewport) {
        const axisCross = this.orientation === "horizontal" ? height / 2 : this.portraitAxisCoordinate(width);
        this.surface.style.setProperty("--timeline-axis-cross", axisCross + "px");
        const stage = createElement("div", "timeline-stage timeline-stage-empty");
        const axis = createElement("div", "timeline-axis");
        const hint = createElement("p", "timeline-empty-hint", "Add an event to begin.");
        stage.append(axis, hint);
        this.surface.append(stage);
        this.readout.textContent = "No events yet";
        return;
      }
      const primaryLength = this.orientation === "horizontal" ? width : height;
      const padding = this.axisPadding(primaryLength);
      const usable = Math.max(1, primaryLength - padding * 2);
      const focusInset = this.selectedId
        ? (this.orientation === "horizontal"
            ? clamp(height * 0.08, 48, 88)
            : clamp(width * 0.07, 44, 76))
        : 0;
      const axisCross = this.selectedId
        ? (this.orientation === "horizontal" ? height - focusInset : width - focusInset)
        : (this.orientation === "horizontal" ? height / 2 : this.portraitAxisCoordinate(width));
      this.surface.style.setProperty("--timeline-axis-cross", axisCross + "px");

      const stage = createElement("div", "timeline-stage");
      this.surface.append(stage);

      const axis = createElement("div", "timeline-axis");
      stage.append(axis);

      const visibleItems = this.items
        .filter((item) => {
          const end = Number.isFinite(item.end) ? item.end : item.start;
          return end >= this.viewport.start && item.start <= this.viewport.end;
        })
        .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));

      let tickSpec = scale.selectTickSpec(this.viewport, usable, 94);
      let accentPlan = clustering.planTemporalAccents(visibleItems, {
        viewport: this.viewport,
        pixelLength: usable,
        padding,
        orientation: this.orientation,
        spec: tickSpec,
        maxItemsPerMonth: 3,
        limit: 18
      });
      const tickSpacing = accentPlan.hasAmbientContext ? 112 : 94;
      const adjustedSpec = scale.selectTickSpec(this.viewport, usable, tickSpacing);
      if (adjustedSpec.unit !== tickSpec.unit || adjustedSpec.step !== tickSpec.step) {
        tickSpec = adjustedSpec;
        accentPlan = clustering.planTemporalAccents(visibleItems, {
          viewport: this.viewport,
          pixelLength: usable,
          padding,
          orientation: this.orientation,
          spec: tickSpec,
          maxItemsPerMonth: 3,
          limit: 18
        });
      }
      this.renderTemporalAccents(stage, accentPlan);

      const ticks = scale.generateTicks(this.viewport, usable, tickSpacing, MAX_TICKS);
      for (const tick of ticks) {
        const position = padding + scale.coordinateFor(tick.value, this.viewport, usable);
        const mark = createElement("div", "timeline-tick");
        const compact = clustering.compactTickLabel(
          tick.value,
          tick.spec,
          accentPlan.hasAmbientContext
        );
        const labelText = compact === null ? tick.label : compact;
        if (labelText) {
          const label = createElement("span", "timeline-tick-label", labelText);
          mark.append(label);
        }
        if (this.orientation === "horizontal") mark.style.left = position + "px";
        else mark.style.top = position + "px";
        stage.append(mark);
      }

      this.renderRelationships(stage, padding, usable);

      for (const item of visibleItems) {
        const startPosition = padding + scale.coordinateFor(item.start, this.viewport, usable);
        const endPosition = Number.isFinite(item.end)
          ? padding + scale.coordinateFor(item.end, this.viewport, usable)
          : startPosition;

        if (Number.isFinite(item.end)) {
          const range = createElement("button", "timeline-range-segment");
          range.type = "button";
          range.dataset.id = item.id;
          range.style.setProperty("--event-color", item.color || "var(--accent)");
          const rangeLabel = `${item.title} · ${item.startLabel} → ${item.endLabel}`;
          range.dataset.tooltip = rangeLabel;
          range.title = rangeLabel;
          range.setAttribute("aria-label", `Focus range ${rangeLabel}`);
          const clippedStart = clamp(Math.min(startPosition, endPosition), padding, padding + usable);
          const clippedEnd = clamp(Math.max(startPosition, endPosition), padding, padding + usable);
          if (this.orientation === "horizontal") {
            range.style.left = clippedStart + "px";
            range.style.width = Math.max(6, clippedEnd - clippedStart) + "px";
          } else {
            range.style.top = clippedStart + "px";
            range.style.height = Math.max(6, clippedEnd - clippedStart) + "px";
          }
          range.addEventListener("click", (event) => {
            event.stopPropagation();
            this.select(item.id);
            void motion.pulseHaptic("selection");
          });
          stage.append(range);
        }
      }

      const focusedItem = this.selectedId
        ? visibleItems.find((item) => String(item.id) === String(this.selectedId))
        : null;
      const clusterSource = focusedItem
        ? visibleItems.filter((item) => String(item.id) !== String(this.selectedId))
        : visibleItems;
      let representations = clustering.clusterProjectedItems(
        clusterSource,
        (item) => this.visiblePositionFor(item, padding, usable),
        this.clusterThreshold(width)
      );
      if (this.expandedClusterItemIds.size) {
        representations = representations.flatMap((representation) => {
          if (
            representation.kind !== "cluster" ||
            !representation.items.every((item) => this.expandedClusterItemIds.has(String(item.id)))
          ) {
            return [representation];
          }
          return representation.items.map((item) => ({
            kind: "item",
            id: String(item.id),
            item,
            items: [item],
            position: this.visiblePositionFor(item, padding, usable),
            start: item.start,
            end: Number.isFinite(item.end) ? item.end : item.start,
            forceUnique: true
          }));
        });
      }
      if (focusedItem) {
        representations.push({
          kind: "item",
          id: String(focusedItem.id),
          item: focusedItem,
          items: [focusedItem],
          position: this.visiblePositionFor(focusedItem, padding, usable),
          start: focusedItem.start,
          end: Number.isFinite(focusedItem.end) ? focusedItem.end : focusedItem.start,
          forceUnique: this.focusForceUnique
        });
        representations.sort((a, b) => a.position - b.position || String(a.id).localeCompare(String(b.id)));
      }
      this.updateClusterHaptics(representations);

      const occupied = [];
      representations.forEach((representation, index) => {
        if (representation.kind === "cluster") {
          stage.append(this.createClusterNode(
            representation,
            representation.position,
            width,
            height,
            axisCross,
            occupied
          ));
          return;
        }
        stage.append(this.createEventNode(
          representation.item,
          index,
          representation.position,
          width,
          height,
          axisCross,
          occupied
        ));
      });

      this.updateReadout(ticks[0]?.spec || null);
      this.root.dispatchEvent(new CustomEvent("timelineviewportchange", {
        bubbles: true,
        detail: { viewport: { ...this.viewport } }
      }));
    }

    createEventNode(item, index, position, width, height, axisCross, occupied) {
      const node = createElement("div", "timeline-event");
      node.dataset.id = item.id;
      node.dataset.terminalShape = item.terminalShape || "rounded";
      node.dataset.connectorStyle = item.connectorStyle || "solid";
      node.dataset.connectorWeight = item.connectorWeight || "normal";
      node.dataset.connectorEndpoint = item.connectorEndpoint || "none";
      node.style.setProperty("--connector-thickness", item.connectorWeight === "fine" ? "1px" : item.connectorWeight === "strong" ? "4px" : "2px");
      node.style.setProperty("--event-color", item.color || "var(--accent)");
      if (item.id === this.focusId) node.classList.add("is-story-current");
      if (item.id === this.selectedId) node.classList.add("is-selected");

      const connector = createElement("div", "timeline-event-connector");
      const button = createElement("button", "timeline-event-terminal");
      button.type = "button";
      button.setAttribute("aria-label", "Focus " + item.title + ", " + item.startLabel);
      button.setAttribute("aria-controls", "timeline-focus-view");
      button.setAttribute("aria-expanded", String(item.id === this.selectedId));
      button.title = Number.isFinite(item.end)
        ? `${item.title} · ${item.startLabel} → ${item.endLabel}`
        : `${item.title} · ${item.startLabel}`;
      const primaryTag = item.tags?.[0];
      const iconName = primaryTag?.icon || "milestone";
      const media = item.media?.[0];
      const visual = createElement("span", media?.src ? "timeline-event-art" : "timeline-event-dot");
      visual.setAttribute("aria-hidden", "true");
      if (media?.src) {
        const image = document.createElement("img");
        image.className = "timeline-event-art-image";
        image.src = media.src;
        image.alt = "";
        image.decoding = "async";
        image.loading = "lazy";
        visual.append(image);
        const badge = createElement("span", "timeline-event-icon-badge");
        badge.append(presentation.createIcon(iconName, { size: 18 }));
        visual.append(badge);
      } else {
        visual.append(presentation.createIcon(iconName, { size: 24 }));
      }
      const copy = createElement("span", "timeline-event-copy");
      const title = createElement("strong", "", item.title);
      const date = createElement("span", "", item.startLabel);
      copy.append(title, date);
      button.append(visual, copy);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.select(item.id);
        void motion.pulseHaptic("selection");
      });

      node.append(connector, button);

      if (this.orientation === "horizontal") {
        const lane = this.allocateEventLane(position, occupied);
        const focused = Boolean(this.selectedId);
        const side = focused ? -1 : (lane % 2 === 0 ? -1 : 1);
        const depth = focused ? lane : Math.floor(lane / 2);
        const desiredDistance = 82 + depth * 72;
        const inwardLimit = Math.max(64, axisCross - 64);
        const distance = focused ? Math.min(desiredDistance, inwardLimit) : desiredDistance;
        const eventY = axisCross + side * distance;
        const segment = connectorSegment(axisCross, eventY);

        node.style.left = position + "px";
        node.style.top = eventY + "px";
        node.dataset.side = side < 0 ? "before" : "after";
        connector.style.left = "0";
        connector.style.top = segment.offset + "px";
        connector.style.width = "var(--connector-thickness)";
        connector.style.height = Math.max(1, segment.length) + "px";

        if (position > width - 244) node.classList.add("label-before");
      } else {
        const compact = width < 560;
        const focused = Boolean(this.selectedId);
        const laneIndex = this.allocateEventLane(position, occupied, 78);
        const side = focused ? -1 : (compact ? 1 : laneIndex % 2 === 0 ? -1 : 1);
        const depth = focused || compact ? laneIndex : Math.floor(laneIndex / 2);
        const baseDistance = compact
          ? Math.min(96, Math.max(72, width * 0.20))
          : Math.min(156, Math.max(108, width * 0.22));
        const desiredDistance = baseDistance + depth * (compact ? 58 : 72);
        const available = side < 0 ? axisCross - 72 : width - axisCross - 72;
        const distance = Math.min(desiredDistance, Math.max(64, available));
        const eventX = axisCross + side * distance;
        const segment = connectorSegment(axisCross, eventX);

        node.style.left = eventX + "px";
        node.style.top = position + "px";
        node.dataset.side = side < 0 ? "before" : "after";
        connector.style.left = segment.offset + "px";
        connector.style.top = "0";
        connector.style.width = Math.max(1, segment.length) + "px";
        connector.style.height = "var(--connector-thickness)";

        if (side < 0) node.classList.add("label-before");
      }
      return node;
    }

    allocateEventLane(position, occupied, minDistance = 236) {
      for (let lane = 0; lane < occupied.length; lane += 1) {
        const last = occupied[lane];
        if (last === undefined || Math.abs(position - last) >= minDistance) {
          occupied[lane] = position;
          return lane;
        }
      }
      occupied.push(position);
      return occupied.length - 1;
    }

    clearClusterExpansion() {
      if (!this.expandedClusterItemIds.size) return false;
      this.expandedClusterItemIds.clear();
      return true;
    }

    clusterExpansionPlan(cluster) {
      if (!cluster || !this.viewport || !cluster.items?.length) return null;
      const rect = this.surface.getBoundingClientRect();
      const primaryLength = this.orientation === "horizontal" ? rect.width : rect.height;
      const padding = this.axisPadding(primaryLength);
      const usable = Math.max(1, primaryLength - padding * 2);
      return clustering.clusterExpansionViewport(
        cluster.items,
        this.viewport,
        usable,
        this.clusterThreshold(rect.width),
        { paddingRatio: 0.12, minSpanMs: MIN_SPAN_MS }
      );
    }

    activateCluster(cluster, selectedId, transitionOrigin = null) {
      const item = cluster?.items?.find((candidate) => String(candidate.id) === String(selectedId))
        || cluster?.items?.[0];
      if (!item) return false;
      const plan = this.clusterExpansionPlan(cluster);
      const expandedIds = new Set(cluster.items.map((candidate) => String(candidate.id)));
      this.clearClusterExpansion();
      this.select(item.id, {
        preserveViewport: true,
        forceUnique: true,
        transitionOrigin
      });
      if (plan?.viewport) {
        void this.animateViewportTo(plan.viewport).then((completed) => {
          if (!completed || !plan.forceExpanded || String(this.selectedId) !== String(item.id)) return;
          this.expandedClusterItemIds = expandedIds;
          this.scheduleRender();
        });
      } else if (plan?.forceExpanded) {
        this.expandedClusterItemIds = expandedIds;
        this.scheduleRender();
      }
      void motion.pulseHaptic("selection");
      return true;
    }

    focusItem(id, options = {}) {
      const item = this.items.find((candidate) => candidate.id === id);
      if (!item) return false;
      if (this.expandedClusterItemIds.size && !this.expandedClusterItemIds.has(String(id))) {
        this.clearClusterExpansion();
      }
      if (this.selectedId && this.selectedId !== id && !this.prefersReducedMotion()) {
        const direction = Number(options.direction) < 0 ? -1 : 1;
        void this.transitionFocusTo(item, direction);
        return true;
      }
      this.select(id);
      return true;
    }

    focusContextPlan(item, viewport = this.viewport) {
      if (!item || !viewport) return null;
      const rect = this.surface.getBoundingClientRect();
      const primaryLength = this.orientation === "horizontal" ? rect.width : rect.height;
      const padding = this.axisPadding(primaryLength);
      const usable = Math.max(1, primaryLength - padding * 2);
      return clustering.focusContextViewport(
        this.items,
        item.id,
        viewport,
        usable,
        this.clusterThreshold(rect.width),
        { desiredContext: 2, paddingRatio: 0.14, minSpanMs: MIN_SPAN_MS }
      );
    }

    visibilityViewportForItem(item, viewport = this.viewport) {
      if (!item || !viewport) return null;
      const span = viewport.end - viewport.start;
      const margin = span * 0.12;
      if (item.start >= viewport.start + margin && item.start <= viewport.end - margin) return null;
      return {
        start: item.start - span / 2,
        end: item.start + span / 2
      };
    }

    focusedNavigationPlan(item) {
      if (!item || !this.viewport) return { viewport: null, forceUnique: false };
      const visibilityViewport = this.visibilityViewportForItem(item, this.viewport);
      const baseViewport = visibilityViewport || this.viewport;
      const contextPlan = this.focusContextPlan(item, baseViewport);
      const contextViewport =
        contextPlan && (contextPlan.mode === "separate" || contextPlan.mode === "context")
          ? contextPlan.viewport
          : null;
      return {
        viewport: contextViewport || visibilityViewport || { ...this.viewport },
        forceUnique: Boolean(contextPlan?.forceUnique)
      };
    }

    async transitionFocusTo(item, direction = 1) {
      if (!item || item.id === this.selectedId) return false;
      const token = ++this.focusNavigationToken;
      const plan = this.focusedNavigationPlan(item);
      const moved = plan.viewport ? await this.animateViewportTo(plan.viewport) : true;
      if (!moved || token !== this.focusNavigationToken) return false;
      const targetOriginRect = this.focusTransitionOrigin(item.id)?.getBoundingClientRect?.() || null;
      this.select(item.id, {
        preserveViewport: true,
        forceUnique: plan.forceUnique,
        adjacentDirection: direction < 0 ? -1 : 1,
        originRect: targetOriginRect
      });
      return true;
    }

    adjustFocusedViewport(item) {
      const plan = this.focusContextPlan(item);
      if (!plan) return;
      this.focusForceUnique = Boolean(plan.forceUnique);
      if (plan.mode === "separate" || plan.mode === "context") {
        void this.animateViewportTo(plan.viewport);
      }
    }

    hasFocusedItem() {
      return Boolean(this.selectedId);
    }

    focusedItemId() {
      return this.selectedId;
    }

    ensureFocusPopover() {
      if (!this.selectedId || this.focusView.hidden) return false;
      if (
        typeof this.focusView.showPopover === "function" &&
        !this.focusView.matches(":popover-open")
      ) {
        try {
          this.focusView.showPopover();
        } catch {
          return false;
        }
      }
      return this.focusView.matches(":popover-open");
    }

    getViewport() {
      return this.viewport ? { ...this.viewport } : null;
    }

    focusAdjacent(delta, options = {}) {
      if (!this.items.length) return false;
      const wrap = Boolean(options.wrap);
      const currentIndex = this.items.findIndex((item) => item.id === this.selectedId);
      let nextIndex;
      if (currentIndex < 0) {
        nextIndex = delta < 0 ? this.items.length - 1 : 0;
      } else {
        nextIndex = currentIndex + (delta < 0 ? -1 : 1);
      }
      if (wrap) {
        nextIndex = (nextIndex + this.items.length) % this.items.length;
      }
      if (nextIndex < 0 || nextIndex >= this.items.length) return false;
      return this.focusItem(this.items[nextIndex].id, {
        direction: delta < 0 ? -1 : 1
      });
    }

    stepFocusMedia(delta) {
      const item = this.items.find((candidate) => candidate.id === this.selectedId);
      const media = item?.media || [];
      if (!item || media.length < 2) return false;
      const direction = delta < 0 ? -1 : 1;
      this.focusMediaIndex = (this.focusMediaIndex + direction + media.length) % media.length;
      this.renderFocus(item);
      this.root.dispatchEvent(new CustomEvent("timelinefocusrender", {
        bubbles: true,
        detail: { id: item.id }
      }));
      return true;
    }

    focusTransitionOrigin(id) {
      const targetId = String(id);
      const eventNode = Array.from(this.surface.querySelectorAll(".timeline-event"))
        .find((node) => node.dataset.id === targetId && !node.classList.contains("timeline-cluster"));
      if (eventNode) {
        const terminal = eventNode.querySelector(".timeline-event-terminal");
        if (terminal) return terminal;
      }
      return Array.from(this.surface.querySelectorAll(".timeline-range-segment"))
        .find((range) => range.dataset.id === targetId) || null;
    }

    focusChromeInsets() {
      const viewportWidth = Math.max(1, document.documentElement.clientWidth || globalThis.innerWidth || 1);
      const viewportHeight = Math.max(1, document.documentElement.clientHeight || globalThis.innerHeight || 1);
      const insets = {
        top: FOCUS_POPOVER_MARGIN,
        right: FOCUS_POPOVER_MARGIN,
        bottom: FOCUS_POPOVER_MARGIN,
        left: FOCUS_POPOVER_MARGIN
      };

      const reserveTopChrome = (element) => {
        const rect = element?.getBoundingClientRect?.();
        if (!rect || rect.width <= 0 || rect.height <= 0 || rect.top >= viewportHeight / 2) return;
        insets.top = Math.max(
          insets.top,
          Math.min(viewportHeight - FOCUS_POPOVER_MARGIN, rect.bottom + 8)
        );
      };

      reserveTopChrome(document.querySelector(".app-command-bar"));
      reserveTopChrome(document.querySelector(".timeline-view-toolbar:not([hidden])"));

      const dock = document.querySelector(".app-tool-dock");
      const dockRect = dock?.getBoundingClientRect?.();
      if (dockRect && dockRect.width > 0 && dockRect.height > 0) {
        const verticalDock = dockRect.height > dockRect.width * 1.35;
        if (verticalDock && dockRect.left < viewportWidth / 2) {
          insets.left = Math.max(insets.left, Math.min(viewportWidth - FOCUS_POPOVER_MARGIN, dockRect.right + 8));
        } else if (!verticalDock && dockRect.top > viewportHeight / 2) {
          insets.bottom = Math.max(insets.bottom, Math.min(viewportHeight - FOCUS_POPOVER_MARGIN, viewportHeight - dockRect.top + 8));
        }
      }

      const stage = this.root.closest("#presentation-stage");
      const contextualTimelineDocked =
        stage?.dataset.eventFocused === "true" &&
        stage?.dataset.hasContextGraph === "true" &&
        this.focusView.dataset.activeTab === "overview";
      if (contextualTimelineDocked) {
        const timelineRect = this.surface.getBoundingClientRect();
        if (this.orientation === "vertical") {
          const dockedRight =
            timelineRect.width > 0 &&
            timelineRect.width < viewportWidth * 0.6 &&
            timelineRect.right >= viewportWidth - FOCUS_POPOVER_MARGIN * 2;
          if (dockedRight) {
            insets.right = Math.max(
              insets.right,
              Math.min(
                viewportWidth - FOCUS_POPOVER_MARGIN,
                viewportWidth - timelineRect.left + FOCUS_POPOVER_MARGIN
              )
            );
          }
        } else {
          const dockedBottom =
            timelineRect.height > 0 &&
            timelineRect.height < viewportHeight * 0.6 &&
            timelineRect.bottom >= viewportHeight - FOCUS_POPOVER_MARGIN * 2;
          if (dockedBottom) {
            insets.bottom = Math.max(
              insets.bottom,
              Math.min(
                viewportHeight - FOCUS_POPOVER_MARGIN,
                viewportHeight - timelineRect.top + FOCUS_POPOVER_MARGIN
              )
            );
          }
        }
      }

      return { viewportWidth, viewportHeight, ...insets };
    }

    positionFocusPopover(originRect = null) {
      if (!this.selectedId || this.focusView.hidden || !this.focusView.matches(":popover-open")) return false;
      const bounds = this.focusChromeInsets();
      const rawAvailableWidth = Math.max(1, bounds.viewportWidth - bounds.left - bounds.right);
      const availableHeight = Math.max(1, bounds.viewportHeight - bounds.top - bounds.bottom);
      const desktop = bounds.viewportWidth >= 900 && bounds.viewportHeight >= 700;
      const compact = bounds.viewportWidth <= 760;
      const preferredWidth = compact
        ? rawAvailableWidth
        : this.orientation === "vertical"
          ? (desktop ? 620 : 520)
          : (desktop ? 760 : 640);
      const minimumDesktopWidth = this.orientation === "vertical" ? 480 : 560;
      const unreservedWidth = Math.max(
        1,
        bounds.viewportWidth - bounds.left - FOCUS_POPOVER_MARGIN
      );
      const availableWidth =
        desktop &&
        rawAvailableWidth < minimumDesktopWidth &&
        unreservedWidth >= minimumDesktopWidth
          ? unreservedWidth
          : rawAvailableWidth;
      const targetWidth = Math.max(
        1,
        Math.min(preferredWidth, availableWidth)
      );
      const preferredMaxHeight = this.orientation === "vertical"
        ? (desktop ? 700 : 660)
        : (desktop ? 500 : 640);
      const targetMaxHeight = Math.max(1, Math.min(preferredMaxHeight, availableHeight));

      this.focusView.style.inset = "auto";
      this.focusView.style.right = "auto";
      this.focusView.style.bottom = "auto";
      this.focusView.style.transform = "none";
      this.focusView.style.inlineSize = Math.round(targetWidth) + "px";
      this.focusView.style.maxInlineSize = Math.round(targetWidth) + "px";
      this.focusView.style.blockSize = "auto";
      this.focusView.style.maxBlockSize = Math.round(targetMaxHeight) + "px";

      const rect = this.focusView.getBoundingClientRect();
      const width = Math.min(rect.width, targetWidth);
      const height = Math.min(rect.height, targetMaxHeight);
      const clampPosition = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

      // Keep the opening source geometry for the View Transition, but do not let the
      // event terminal pull the final top-layer placement back toward the timeline.
      void originRect;

      let left;
      let top;
      if (this.orientation === "vertical") {
        // Vertical chronology is docked on the right: keep detail on the left and
        // center it vertically inside the chrome-safe region.
        left = bounds.left;
        top = bounds.top + Math.max(0, (availableHeight - height) / 2);
      } else {
        // Horizontal chronology is docked on the bottom: keep detail at the top and
        // center it horizontally inside the chrome-safe region.
        left = bounds.left + Math.max(0, (availableWidth - width) / 2);
        top = bounds.top;
      }

      left = clampPosition(left, bounds.left, bounds.viewportWidth - bounds.right - width);
      top = clampPosition(top, bounds.top, bounds.viewportHeight - bounds.bottom - height);
      this.focusView.style.left = Math.round(left) + "px";
      this.focusView.style.top = Math.round(top) + "px";
      return true;
    }

    select(id, options = {}) {
      const item = this.items.find((candidate) => candidate.id === id);
      if (!item) return;

      if (this.expandedClusterItemIds.size && !this.expandedClusterItemIds.has(String(id))) {
        this.clearClusterExpansion();
      }
      const openingFromTimeline = !this.selectedId;
      const transitionOrigin = openingFromTimeline
        ? options.transitionOrigin || this.focusTransitionOrigin(id)
        : null;
      const transitionOriginRect = transitionOrigin?.getBoundingClientRect?.() || null;
      if (!options.originRect && transitionOriginRect) options.originRect = transitionOriginRect;
      const applyFocus = () => {
        this.selectedId = id;
        this.focusMediaIndex = 0;
        this.focusForceUnique = Boolean(options.forceUnique);
        if (!options.preserveViewport) {
          this.ensureItemVisible(id);
          this.adjustFocusedViewport(item);
        }
        this.root.classList.add("is-event-focused");
        this.focusView.hidden = false;
        this.renderFocus(item);
        if (
          typeof this.focusView.showPopover === "function" &&
          !this.focusView.matches(":popover-open")
        ) {
          this.focusView.showPopover();
        }
        this.positionFocusPopover(options.originRect || this.focusTransitionOrigin(id)?.getBoundingClientRect?.() || null);
        this.scheduleRender();
        this.root.dispatchEvent(new CustomEvent("timelinefocuschange", {
          bubbles: true,
          detail: { id, focused: true }
        }));
        requestAnimationFrame(() => {
          this.focusView.focus({ preventScroll: true });
          this.root.scrollIntoView({
            behavior: this.prefersReducedMotion() ? "auto" : "smooth",
            block: "start"
          });
        });
      };

      const canTransition =
        !this.prefersReducedMotion() &&
        typeof document.startViewTransition === "function";
      const adjacentDirection = Number(options.adjacentDirection) || 0;

      if (canTransition && adjacentDirection) {
        document.documentElement.dataset.timelineFocusDirection = adjacentDirection < 0 ? "backward" : "forward";
        this.focusView.style.viewTransitionName = FOCUS_SWAP_TRANSITION_NAME;
        const transition = document.startViewTransition(() => {
          applyFocus();
          this.focusView.style.viewTransitionName = FOCUS_SWAP_TRANSITION_NAME;
        });
        const cleanupAdjacentTransition = () => {
          this.focusView.style.removeProperty("view-transition-name");
          delete document.documentElement.dataset.timelineFocusDirection;
        };
        void transition.finished.then(cleanupAdjacentTransition, cleanupAdjacentTransition);
      } else if (canTransition && transitionOrigin) {
        transitionOrigin.style.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME;
        const transition = document.startViewTransition(() => {
          transitionOrigin.style.removeProperty("view-transition-name");
          applyFocus();
          this.focusView.style.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME;
        });
        const cleanupTransitionNames = () => {
          transitionOrigin.style.removeProperty("view-transition-name");
          this.focusView.style.removeProperty("view-transition-name");
        };
        void transition.finished.then(cleanupTransitionNames, cleanupTransitionNames);
      } else if (canTransition) {
        document.startViewTransition(applyFocus);
      } else {
        applyFocus();
      }
    }

    createFocusHero(item) {
      const hero = createElement("section", "timeline-focus-hero");
      const media = Array.isArray(item.media) ? item.media.slice(0, 3) : [];
      const activeIndex = media.length ? this.focusMediaIndex % media.length : 0;
      const active = media[activeIndex];

      if (active) {
        const image = document.createElement("img");
        image.className = "timeline-focus-hero-image";
        image.src = active.src;
        image.alt = active.alt || "";
        image.decoding = "async";
        hero.append(image);
      } else {
        hero.classList.add("has-no-media");
        const fallback = createElement("div", "timeline-focus-hero-fallback");
        fallback.setAttribute("aria-hidden", "true");
        hero.append(fallback);
      }

      const veil = createElement("div", "timeline-focus-hero-veil");
      const eyebrow = createElement("p", "timeline-focus-kicker", item.categoryName || item.kind);
      const heading = createElement("h2", "timeline-focus-title", item.title);
      heading.id = "timeline-focus-heading";
      const time = createElement(
        "p",
        "timeline-focus-time",
        Number.isFinite(item.end) ? item.startLabel + " → " + item.endLabel : item.startLabel
      );
      const tags = createElement("div", "timeline-focus-tags");
      for (const tag of item.tags || []) {
        const tagElement = presentation.createTag(tag);
        if (tagElement) tags.append(tagElement);
      }
      veil.append(eyebrow, heading, time);
      if (tags.childElementCount) veil.append(tags);
      hero.append(veil);

      if (media.length > 1) {
        const controls = createElement("div", "timeline-focus-slideshow-controls");
        const previous = createElement("button", "button secondary", "Previous image");
        previous.type = "button";
        previous.setAttribute("aria-label", "Previous event photograph");
        previous.addEventListener("click", () => {
          this.focusMediaIndex = (activeIndex - 1 + media.length) % media.length;
          this.renderFocus(item);
          this.root.dispatchEvent(new CustomEvent("timelinefocusrender", {
            bubbles: true,
            detail: { id: item.id }
          }));
        });
        const count = createElement("span", "timeline-focus-slide-count", `${activeIndex + 1} / ${media.length}`);
        const next = createElement("button", "button secondary", "Next image");
        next.type = "button";
        next.setAttribute("aria-label", "Next event photograph");
        next.addEventListener("click", () => {
          this.focusMediaIndex = (activeIndex + 1) % media.length;
          this.renderFocus(item);
          this.root.dispatchEvent(new CustomEvent("timelinefocusrender", {
            bubbles: true,
            detail: { id: item.id }
          }));
        });
        controls.append(previous, count, next);
        hero.append(controls);
      }

      if (active?.caption) {
        const caption = createElement("p", "timeline-focus-media-caption", active.caption);
        hero.append(caption);
      }
      return hero;
    }

    renderFocus(item) {
      this.focusView.tabIndex = -1;
      this.focusView.style.setProperty("--event-color", item.color || "var(--accent)");
      this.focusView.dataset.layout = item.layoutVariant || "hero-split";
      this.focusView.setAttribute("aria-labelledby", "timeline-focus-heading");
      this.focusView.replaceChildren();
      this.focusView.dataset.activeTab = "overview";

      const hero = this.createFocusHero(item);

      const summary = createElement("section", "timeline-focus-section timeline-focus-summary");
      const summaryHeading = createElement("h3", "timeline-focus-section-heading", "Context");
      summary.append(summaryHeading);
      if (item.description) {
        summary.append(createElement("p", "timeline-focus-description", item.description));
      } else {
        summary.append(createElement("p", "timeline-focus-description", "No narrative description has been recorded for this event."));
      }

      const place = createElement("section", "timeline-focus-section timeline-focus-place");
      const placeBackdrop = createElement("div", "timeline-focus-section-backdrop timeline-focus-place-backdrop");
      placeBackdrop.dataset.focusMapSlot = "";
      const placeContent = createElement("div", "timeline-focus-section-content");
      placeContent.append(createElement("h3", "timeline-focus-section-heading", "Place"));
      if (item.location) {
        const placeName =
          item.location.name ||
          item.location.geographicIdentifier ||
          item.location.address ||
          "Coordinates";
        placeContent.append(createElement("p", "timeline-focus-place-name", placeName));
        const coordinates = item.location.geometry?.coordinates;
        if (coordinates) {
          placeContent.append(createElement(
            "p",
            "timeline-focus-place-coordinates",
            `${coordinates[1]}, ${coordinates[0]}`
          ));
        }
      } else {
        placeContent.append(createElement("p", "timeline-focus-muted", "No location assigned."));
      }
      place.append(placeBackdrop, placeContent);

      const relations = createElement("section", "timeline-focus-section timeline-focus-relations");
      const relationBackdrop = createElement("div", "timeline-focus-section-backdrop timeline-focus-relations-backdrop");
      relationBackdrop.dataset.focusGraphSlot = "";
      const relationContent = createElement("div", "timeline-focus-section-content");
      relationContent.append(createElement("h3", "timeline-focus-section-heading", "Relations"));
      if (item.relations?.length) {
        const list = createElement("ul", "timeline-focus-relation-list");
        for (const relation of item.relations.slice(0, 8)) {
          const li = createElement("li", "");
          li.append(presentation.createIcon("relation", { size: 20 }));
          const relationText = relation.subjectName && relation.objectName
            ? `${relation.subjectName} —${relation.predicate}→ ${relation.objectName}`
            : relation.predicate;
          const label = createElement(
            "span",
            "",
            relation.role ? `${relationText} · ${relation.role}` : relationText
          );
          li.append(label);
          list.append(li);
        }
        relationContent.append(list);
      } else {
        relationContent.append(createElement("p", "timeline-focus-muted", "No relationships attached."));
      }

      if (item.relationChanges?.length) {
        const changes = createElement("div", "timeline-focus-relation-changes");
        changes.append(createElement("p", "timeline-focus-kicker", "Changed by this event"));
        for (const change of item.relationChanges) {
          const row = createElement("p", "timeline-focus-relation-change");
          const relationText = change.subjectName && change.objectName
            ? `${change.subjectName} —${change.predicate || "relatedTo"}→ ${change.objectName}`
            : change.relationshipId;
          row.textContent =
            change.operation === "activate" ? `Activates ${relationText}` :
            change.operation === "deactivate" ? `Deactivates ${relationText}` :
            `Updates ${relationText}`;
          changes.append(row);
        }
        relationContent.append(changes);
      }
      relations.append(relationBackdrop, relationContent);

      const evidence = createElement("section", "timeline-focus-section timeline-focus-evidence");
      evidence.append(createElement("h3", "timeline-focus-section-heading", "Evidence"));
      if (item.evidence?.length) {
        const grid = createElement("div", "timeline-focus-evidence-grid");
        const visibleEvidence = item.evidence.slice(0, 6);
        for (const record of visibleEvidence) {
          const card = createElement("article", "timeline-focus-evidence-card");
          card.dataset.type = record.type || "note";
          const header = createElement("div", "timeline-focus-evidence-header");
          header.append(presentation.createIcon("evidence", { size: 20 }));
          const type = createElement("span", "timeline-focus-evidence-type", record.type || "source");
          header.append(type);
          const title = createElement("h4", "timeline-focus-evidence-title", record.title || "Untitled evidence");
          card.append(header, title);
          if (record.sourceName || record.publishedAt) {
            card.append(createElement(
              "p",
              "timeline-focus-evidence-meta",
              [record.sourceName, record.publishedAt].filter(Boolean).join(" · ")
            ));
          }
          const forensicDigest = record.forensic?.digests?.find((digest) => digest.algorithm === "sha-256")
            || record.forensic?.digests?.[0];
          const forensicMeta = [
            record.forensic?.recordClass ? record.forensic.recordClass.replaceAll("-", " ") : "",
            record.forensic?.exhibitNumber ? `Exhibit ${record.forensic.exhibitNumber}` : "",
            forensicDigest ? `${forensicDigest.algorithm.toUpperCase()} ${forensicDigest.value}` : ""
          ].filter(Boolean);
          if (forensicMeta.length) {
            card.append(createElement(
              "p",
              "timeline-focus-evidence-meta",
              forensicMeta.join(" · ")
            ));
          }
          if (record.note) card.append(createElement("p", "timeline-focus-evidence-note", record.note));

          const actions = createElement("div", "timeline-focus-evidence-actions");
          if (record.url) {
            const link = document.createElement("a");
            link.className = "button secondary";
            link.href = record.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = record.type === "article" ? "Open source" : "Open document";
            actions.append(link);
          }
          if (record.file?.blobKey) {
            const open = createElement("button", "button secondary", "Open local PDF");
            open.type = "button";
            open.addEventListener("click", () => {
              this.root.dispatchEvent(new CustomEvent("timelineevidenceopen", {
                bubbles: true,
                detail: { id: record.id }
              }));
            });
            actions.append(open);
          }
          if (actions.childElementCount) card.append(actions);
          grid.append(card);
        }
        evidence.append(grid);
        if (item.evidence.length > visibleEvidence.length) {
          evidence.append(createElement(
            "p",
            "timeline-focus-evidence-more",
            `${item.evidence.length - visibleEvidence.length} more evidence record${item.evidence.length - visibleEvidence.length === 1 ? "" : "s"} available`
          ));
        }
      } else {
        evidence.append(createElement("p", "timeline-focus-muted", "No supporting evidence attached."));
      }

      const actions = createElement("div", "timeline-focus-actions");
      const currentIndex = this.items.findIndex((candidate) => candidate.id === item.id);
      const previous = createElement("button", "button secondary", "Previous event");
      previous.type = "button";
      previous.disabled = currentIndex <= 0;
      previous.addEventListener("click", () => this.focusAdjacent(-1));
      const next = createElement("button", "button secondary", "Next event");
      next.type = "button";
      next.disabled = currentIndex < 0 || currentIndex >= this.items.length - 1;
      next.addEventListener("click", () => this.focusAdjacent(1));
      const close = createElement("button", "button primary", "Return to timeline");
      close.type = "button";
      close.addEventListener("click", () => this.closeFocus());
      const edit = createElement("button", "button secondary", "Edit event");
      edit.type = "button";
      edit.addEventListener("click", () => {
        this.root.dispatchEvent(new CustomEvent("timelinefocusedit", {
          bubbles: true,
          detail: { id: item.id }
        }));
        this.closeFocus();
      });
      actions.append(previous, next, edit);
      summary.append(actions);

      const tabs = createElement("div", "timeline-focus-tabs");
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Focused event views");
      const overviewTab = createElement("button", "timeline-focus-tab is-active", "Overview");
      overviewTab.type = "button";
      overviewTab.setAttribute("role", "tab");
      overviewTab.setAttribute("aria-selected", "true");
      const evidenceTab = createElement("button", "timeline-focus-tab", "Evidence");
      evidenceTab.type = "button";
      evidenceTab.setAttribute("role", "tab");
      evidenceTab.setAttribute("aria-selected", "false");
      evidence.id = "timeline-focus-evidence-panel";
      evidence.setAttribute("role", "tabpanel");
      evidence.hidden = true;
      close.classList.add("timeline-focus-close");

      const setFocusTab = (name) => {
        const evidenceActive = name === "evidence";
        const applyTabState = () => {
          this.focusView.dataset.activeTab = evidenceActive ? "evidence" : "overview";
          for (const panel of [place, relations]) panel.hidden = evidenceActive;
          evidence.hidden = !evidenceActive;
          overviewTab.classList.toggle("is-active", !evidenceActive);
          evidenceTab.classList.toggle("is-active", evidenceActive);
          overviewTab.setAttribute("aria-selected", String(!evidenceActive));
          evidenceTab.setAttribute("aria-selected", String(evidenceActive));
          this.positionFocusPopover();
        };
        const finishTabChange = () => {
          requestAnimationFrame(() => {
            if (!evidenceActive) {
              this.root.dispatchEvent(new CustomEvent("timelinefocusrender", {
                bubbles: true,
                detail: { id: item.id }
              }));
            }
          });
        };
        const canTransition =
          !this.prefersReducedMotion() &&
          typeof document.startViewTransition === "function";

        if (!canTransition) {
          applyTabState();
          finishTabChange();
          return;
        }

        place.style.viewTransitionName = FOCUS_TAB_PLACE_TRANSITION_NAME;
        relations.style.viewTransitionName = FOCUS_TAB_RELATIONS_TRANSITION_NAME;
        evidence.style.viewTransitionName = FOCUS_TAB_EVIDENCE_TRANSITION_NAME;
        try {
          const transition = document.startViewTransition(applyTabState);
          const cleanupTabTransition = () => {
            place.style.removeProperty("view-transition-name");
            relations.style.removeProperty("view-transition-name");
            evidence.style.removeProperty("view-transition-name");
          };
          void transition.ready.then(finishTabChange, finishTabChange);
          void transition.finished.then(cleanupTabTransition, cleanupTabTransition);
        } catch {
          place.style.removeProperty("view-transition-name");
          relations.style.removeProperty("view-transition-name");
          evidence.style.removeProperty("view-transition-name");
          applyTabState();
          finishTabChange();
        }
      };
      overviewTab.addEventListener("click", () => setFocusTab("overview"));
      evidenceTab.addEventListener("click", () => setFocusTab("evidence"));
      tabs.append(overviewTab, evidenceTab, close);

      this.focusView.append(tabs, hero, summary, place, relations, evidence);
    }

    closeFocus() {
      const previousId = this.selectedId;
      const transitionOrigin = previousId ? this.focusTransitionOrigin(previousId) : null;
      const clearFocus = ({ deferRender = false, deferSurfaceFocus = false } = {}) => {
        this.selectedId = null;
        this.focusMediaIndex = 0;
        this.focusForceUnique = false;
        this.clearClusterExpansion();
        this.root.classList.remove("is-event-focused");
        if (
          typeof this.focusView.hidePopover === "function" &&
          this.focusView.matches(":popover-open")
        ) {
          this.focusView.hidePopover();
        }
        this.focusView.hidden = true;
        cancelAnimationFrame(this.focusResizeFrame);
        this.focusResizeFrame = 0;
        this.focusView.removeAttribute("style");
        delete this.focusView.dataset.layout;
        this.focusView.replaceChildren();
        if (!deferRender) this.scheduleRender();
        if (previousId) {
          this.root.dispatchEvent(new CustomEvent("timelinefocuschange", {
            bubbles: true,
            detail: { id: previousId, focused: false }
          }));
        }
        if (!deferSurfaceFocus && !this.root.hidden) {
          this.surface.focus({ preventScroll: true });
        }
      };

      const canTransition =
        !this.prefersReducedMotion() &&
        typeof document.startViewTransition === "function";

      if (canTransition && transitionOrigin) {
        this.focusView.style.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME;
        const transition = document.startViewTransition(() => {
          clearFocus({ deferRender: true, deferSurfaceFocus: true });
          if (transitionOrigin.isConnected) {
            transitionOrigin.style.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME;
          }
        });
        const renderAfterCapture = () => this.scheduleRender();
        void transition.ready.then(renderAfterCapture, renderAfterCapture);
        const finishTransition = () => {
          transitionOrigin.style.removeProperty("view-transition-name");
          this.focusView.style.removeProperty("view-transition-name");
          if (!this.root.hidden) this.surface.focus({ preventScroll: true });
        };
        void transition.finished.then(finishTransition, finishTransition);
      } else if (canTransition) {
        document.startViewTransition(clearFocus);
      } else {
        clearFocus();
      }
    }

    updateReadout(spec) {
      const start = new Date(this.viewport.start);
      const end = new Date(this.viewport.end);
      const format = (date) => {
        const year = date.getUTCFullYear();
        const dateText = new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        }).format(date);
        return year <= 0 ? String(1 - year) + " BCE" : dateText;
      };
      const unit = spec ? spec.step + " " + spec.unit + (spec.step === 1 ? "" : "s") : "adaptive";
      this.readout.textContent = format(start) + " — " + format(end) + " · ticks " + unit;
    }
  }

  globalThis.TimelineView = Object.freeze({
    create(root) {
      if (!(root instanceof HTMLElement)) return null;
      return new TimelineViewController(root);
    },
    geometry: Object.freeze({
      connectorSegment,
      visibleIntervalAnchor,
      wheelZoomFactor
    })
  });
})();
