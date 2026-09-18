(() => {
  "use strict";

  const scale = globalThis.TimelineScale;
  if (!scale) throw new Error("TimelineScale must load before TimelineView.");

  const VIEW_STORAGE_KEY = "timeline:view:v1";
  const DEFAULT_SPAN_MS = 86_400_000;
  const MIN_SPAN_MS = 1;
  const MAX_TICKS = 240;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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
      this.detail = root.querySelector("#timeline-detail");
      this.readout = root.querySelector("#timeline-window-readout");
      this.landscapeButton = root.querySelector("#timeline-orientation-landscape");
      this.portraitButton = root.querySelector("#timeline-orientation-portrait");
      this.zoomInButton = root.querySelector("#timeline-zoom-in");
      this.zoomOutButton = root.querySelector("#timeline-zoom-out");
      this.fitButton = root.querySelector("#timeline-fit");
      this.items = [];
      this.viewport = null;
      this.selectedId = null;
      this.focusId = null;
      this.preferences = loadPreferences();
      this.orientation = this.preferences.orientation;
      this.drag = null;
      this.resizeObserver = null;
      this.renderFrame = 0;
      this.bind();
      this.applyOrientation();
    }

    bind() {
      this.landscapeButton.addEventListener("click", () => this.setOrientation("horizontal"));
      this.portraitButton.addEventListener("click", () => this.setOrientation("vertical"));
      this.zoomInButton.addEventListener("click", () => this.zoomBy(0.5));
      this.zoomOutButton.addEventListener("click", () => this.zoomBy(2));
      this.fitButton.addEventListener("click", () => this.fit());

      this.surface.addEventListener("wheel", (event) => {
        if (!this.viewport || !this.items.length) return;
        event.preventDefault();
        const rect = this.surface.getBoundingClientRect();
        const primary = this.orientation === "horizontal" ? event.clientX - rect.left : event.clientY - rect.top;
        const length = this.orientation === "horizontal" ? rect.width : rect.height;
        const padding = this.axisPadding(length);
        const usable = Math.max(1, length - padding * 2);
        const ratio = clamp((primary - padding) / usable, 0, 1);
        const anchor = this.viewport.start + (this.viewport.end - this.viewport.start) * ratio;
        this.viewport = scale.zoom(this.viewport, event.deltaY < 0 ? 0.82 : 1.22, anchor, MIN_SPAN_MS);
        this.scheduleRender();
      }, { passive: false });

      this.surface.addEventListener("pointerdown", (event) => {
        if (!this.viewport || !this.items.length || event.button !== 0 || event.target.closest("button")) return;
        const rect = this.surface.getBoundingClientRect();
        this.drag = {
          pointerId: event.pointerId,
          coordinate: this.orientation === "horizontal" ? event.clientX : event.clientY,
          viewport: { ...this.viewport },
          length: this.orientation === "horizontal" ? rect.width : rect.height
        };
        this.surface.setPointerCapture(event.pointerId);
        this.surface.classList.add("is-panning");
      });

      this.surface.addEventListener("pointermove", (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        const coordinate = this.orientation === "horizontal" ? event.clientX : event.clientY;
        const deltaPixels = coordinate - this.drag.coordinate;
        const padding = this.axisPadding(this.drag.length);
        const usable = Math.max(1, this.drag.length - padding * 2);
        const span = this.drag.viewport.end - this.drag.viewport.start;
        const deltaMs = -(deltaPixels / usable) * span;
        this.viewport = scale.pan(this.drag.viewport, deltaMs);
        this.scheduleRender();
      });

      const finishDrag = (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        this.drag = null;
        this.surface.classList.remove("is-panning");
        if (this.surface.hasPointerCapture(event.pointerId)) this.surface.releasePointerCapture(event.pointerId);
      };
      this.surface.addEventListener("pointerup", finishDrag);
      this.surface.addEventListener("pointercancel", finishDrag);

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
          this.zoomBy(0.5);
        } else if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          this.zoomBy(2);
        } else if (event.key === "Home") {
          event.preventDefault();
          this.fit();
        } else if (
          (this.orientation === "horizontal" && (horizontalBack || horizontalForward)) ||
          (this.orientation === "vertical" && (verticalBack || verticalForward))
        ) {
          event.preventDefault();
          const backwards = horizontalBack || verticalBack;
          this.viewport = scale.pan(this.viewport, backwards ? -panDelta : panDelta);
          this.scheduleRender();
        }
      });

      if ("ResizeObserver" in globalThis) {
        this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
        this.resizeObserver.observe(this.surface);
      } else {
        window.addEventListener("resize", () => this.scheduleRender());
      }
    }

    setOrientation(orientation) {
      const next = orientation === "vertical" ? "vertical" : "horizontal";
      if (next === this.orientation) return;
      this.orientation = next;
      this.preferences.orientation = next;
      savePreferences(this.preferences);
      this.applyOrientation();
      this.scheduleRender();
      this.surface.focus({ preventScroll: true });
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
      this.focusId = options.focusId || null;

      if (!this.items.length) {
        this.viewport = null;
        this.selectedId = null;
        this.detail.hidden = true;
        this.root.hidden = true;
        this.scheduleRender();
        return;
      }

      this.root.hidden = false;
      if (!this.viewport || previousSignature !== nextSignature) this.ensureUsefulViewport();
      if (this.focusId) this.ensureItemVisible(this.focusId);
      if (this.selectedId && !this.items.some((item) => item.id === this.selectedId)) {
        this.selectedId = null;
        this.detail.hidden = true;
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
      if (!item || !this.viewport) return;
      const span = this.viewport.end - this.viewport.start;
      const margin = span * 0.12;
      if (item.start < this.viewport.start + margin || item.start > this.viewport.end - margin) {
        this.viewport = {
          start: item.start - span / 2,
          end: item.start + span / 2
        };
      }
    }

    itemCoordinates() {
      const values = [];
      for (const item of this.items) {
        values.push(item.start);
        if (Number.isFinite(item.end)) values.push(item.end);
      }
      return values;
    }

    fit() {
      if (!this.items.length) return;
      this.viewport = scale.fit(this.itemCoordinates(), { paddingRatio: 0.1, minSpanMs: DEFAULT_SPAN_MS });
      this.scheduleRender();
      this.surface.focus({ preventScroll: true });
    }

    zoomBy(factor) {
      if (!this.viewport) return;
      const anchor = this.viewport.start + (this.viewport.end - this.viewport.start) / 2;
      this.viewport = scale.zoom(this.viewport, factor, anchor, MIN_SPAN_MS);
      this.scheduleRender();
      this.surface.focus({ preventScroll: true });
    }

    axisPadding(length) {
      return clamp(length * 0.07, 30, 64);
    }

    scheduleRender() {
      cancelAnimationFrame(this.renderFrame);
      this.renderFrame = requestAnimationFrame(() => this.render());
    }

    render() {
      this.renderFrame = 0;
      this.surface.replaceChildren();
      if (!this.items.length || !this.viewport) {
        this.readout.textContent = "No visible events";
        return;
      }

      const rect = this.surface.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const primaryLength = this.orientation === "horizontal" ? width : height;
      const padding = this.axisPadding(primaryLength);
      const usable = Math.max(1, primaryLength - padding * 2);

      const stage = createElement("div", "timeline-stage");
      stage.setAttribute("aria-hidden", "true");
      this.surface.append(stage);

      const axis = createElement("div", "timeline-axis");
      stage.append(axis);

      const ticks = scale.generateTicks(this.viewport, usable, 94, MAX_TICKS);
      for (const tick of ticks) {
        const position = padding + scale.coordinateFor(tick.value, this.viewport, usable);
        const mark = createElement("div", "timeline-tick");
        const label = createElement("span", "timeline-tick-label", tick.label);
        mark.append(label);
        if (this.orientation === "horizontal") {
          mark.style.left = position + "px";
        } else {
          mark.style.top = position + "px";
        }
        stage.append(mark);
      }

      const visibleItems = this.items
        .filter((item) => {
          const end = Number.isFinite(item.end) ? item.end : item.start;
          return end >= this.viewport.start && item.start <= this.viewport.end;
        })
        .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));

      const occupied = [];
      visibleItems.forEach((item, index) => {
        const startPosition = padding + scale.coordinateFor(item.start, this.viewport, usable);
        const endPosition = Number.isFinite(item.end)
          ? padding + scale.coordinateFor(item.end, this.viewport, usable)
          : startPosition;

        if (Number.isFinite(item.end)) {
          const range = createElement("div", "timeline-range-segment");
          range.style.setProperty("--event-color", item.color || "var(--accent)");
          if (this.orientation === "horizontal") {
            range.style.left = Math.min(startPosition, endPosition) + "px";
            range.style.width = Math.max(2, Math.abs(endPosition - startPosition)) + "px";
          } else {
            range.style.top = Math.min(startPosition, endPosition) + "px";
            range.style.height = Math.max(2, Math.abs(endPosition - startPosition)) + "px";
          }
          stage.append(range);
        }

        const event = this.createEventNode(item, index, startPosition, width, height, occupied);
        stage.append(event);
      });

      this.updateReadout(ticks[0]?.spec || null);
    }

    createEventNode(item, index, position, width, height, occupied) {
      const node = createElement("div", "timeline-event");
      node.dataset.id = item.id;
      node.style.setProperty("--event-color", item.color || "var(--accent)");
      if (item.id === this.focusId) node.classList.add("is-story-current");
      if (item.id === this.selectedId) node.classList.add("is-selected");

      const connector = createElement("div", "timeline-event-connector");
      const button = createElement("button", "timeline-event-terminal");
      button.type = "button";
      button.setAttribute("aria-label", "Open " + item.title + ", " + item.startLabel);
      const dot = createElement("span", "timeline-event-dot");
      const copy = createElement("span", "timeline-event-copy");
      const title = createElement("strong", "", item.title);
      const date = createElement("span", "", item.startLabel);
      copy.append(title, date);
      button.append(dot, copy);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.select(item.id);
      });

      node.append(connector, button);

      if (this.orientation === "horizontal") {
        const lane = this.allocateHorizontalLane(position, occupied);
        const side = lane % 2 === 0 ? -1 : 1;
        const depth = Math.floor(lane / 2);
        const axisY = height / 2;
        const distance = 62 + depth * 72;
        const eventY = axisY + side * distance;
        node.style.left = position + "px";
        node.style.top = eventY + "px";
        connector.style.height = Math.max(20, Math.abs(eventY - axisY) - 18) + "px";
        connector.classList.toggle("toward-start", side < 0);
      } else {
        const compact = width < 560;
        const axisX = compact ? 42 : width / 2;
        const lane = compact ? 1 : index % 2 === 0 ? -1 : 1;
        const eventX = compact ? axisX + 28 : axisX + lane * Math.min(190, width * 0.28);
        node.style.left = eventX + "px";
        node.style.top = position + "px";
        connector.style.width = compact ? "24px" : Math.max(24, Math.abs(eventX - axisX) - 18) + "px";
        connector.classList.toggle("toward-start", lane < 0);
        node.classList.toggle("align-end", lane < 0);
      }
      return node;
    }

    allocateHorizontalLane(position, occupied) {
      const minDistance = 138;
      for (let lane = 0; lane < 6; lane += 1) {
        const last = occupied[lane];
        if (last === undefined || Math.abs(position - last) >= minDistance) {
          occupied[lane] = position;
          return lane;
        }
      }
      let bestLane = 0;
      let bestDistance = Infinity;
      for (let lane = 0; lane < occupied.length; lane += 1) {
        const distance = Math.abs(position - occupied[lane]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLane = lane;
        }
      }
      occupied[bestLane] = position;
      return bestLane;
    }

    select(id) {
      this.selectedId = id;
      const item = this.items.find((candidate) => candidate.id === id);
      if (!item) return;
      this.renderDetail(item);
      this.scheduleRender();
    }

    renderDetail(item) {
      const heading = createElement("h3", "", item.title);
      const when = createElement(
        "p",
        "timeline-detail-time",
        Number.isFinite(item.end) ? item.startLabel + " → " + item.endLabel : item.startLabel
      );
      const meta = createElement("p", "timeline-detail-meta", item.categoryName + " · " + item.kind);
      const actions = createElement("div", "timeline-detail-actions");
      const locate = createElement("button", "button secondary", "Locate in chronology");
      locate.type = "button";
      locate.addEventListener("click", () => {
        const row = document.querySelector('#timeline-list [data-id="' + CSS.escape(item.id) + '"]');
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        row?.querySelector("button, a")?.focus({ preventScroll: true });
      });
      const close = createElement("button", "button ghost", "Close");
      close.type = "button";
      close.addEventListener("click", () => {
        this.selectedId = null;
        this.detail.hidden = true;
        this.scheduleRender();
        this.surface.focus({ preventScroll: true });
      });
      actions.append(locate, close);

      const children = [heading, when, meta];
      if (item.description) children.push(createElement("p", "timeline-detail-description", item.description));
      children.push(actions);
      this.detail.replaceChildren(...children);
      this.detail.hidden = false;
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
    }
  });
})();
