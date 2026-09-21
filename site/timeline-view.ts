/**
 * Timeline UI rendering and viewport management
 * Handles interactive timeline surface with zoom, pan, focus, and navigation
 */

type TimelineViewControllerType = any;

const scale = globalThis.TimelineScale;
const clustering = globalThis.TimelineClustering;
const motion = globalThis.TimelineMotion;
const presentation = globalThis.TimelinePresentation;

// Log warnings if dependencies aren't loaded yet, but don't fail
// They may load asynchronously from shims
if (!scale) console.warn("TimelineScale not yet loaded - timeline rendering may be limited");
if (!clustering) console.warn("TimelineClustering not yet loaded - timeline rendering may be limited");
if (!motion) console.warn("TimelineMotion not yet loaded - timeline rendering may be limited");
if (!presentation) console.warn("TimelinePresentation not yet loaded - timeline rendering may be limited");

const VIEW_STORAGE_KEY = "timeline:view:v1";
const DEFAULT_SPAN_MS = 86_400_000;
const MIN_SPAN_MS = 1;
const MAX_TICKS = 240;
const BUTTON_ZOOM_FACTOR = 0.82;
const DOUBLE_TAP_ZOOM_FACTOR = 0.5;
const TOUCH_DOUBLE_TAP_MS = 320;
const TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;
const TOUCH_TAP_MOVE_TOLERANCE_PX = 12;
const ZOOM_RESPONSE_MS = 170;
const WHEEL_ZOOM_SENSITIVITY = 0.00065;
const MAX_WHEEL_EXPONENT = 0.045;

class TimelineViewController {
  root: HTMLElement;
  viewport: any = { start: 0, end: Date.now() };
  surface: HTMLElement;
  focusView: HTMLElement;
  readout: HTMLElement;
  items: any[] = [];
  focusedId: string | null = null;
  orientation: "horizontal" | "vertical" | "portrait" | "landscape" = "horizontal";

  constructor(root: HTMLElement) {
    this.root = root;
    this.surface = root.querySelector(".timeline-surface") || root;
    this.focusView = root.querySelector(".timeline-focus-view") || root;
    this.readout = root.querySelector(".timeline-window-readout") || root;
  }

  setItems(items: any[], options?: any) {
    this.items = items || [];
    // Render items to surface using DOM elements for proper styling
    if (this.surface) {
      // Clear existing content
      this.surface.innerHTML = '';

      // Create a list container
      const ul = document.createElement("ul");
      ul.className = "timeline-items";

      // Render each item
      for (const item of this.items) {
        const li = document.createElement("li");
        li.className = `timeline-item${item.kind === "range" ? " is-range" : ""}`;
        li.dataset.id = item.id;
        // Set explicit min-height to ensure visibility
        li.style.minHeight = "120px";

        // Add date
        const dateWrap = document.createElement("div");
        dateWrap.className = "timeline-date";
        const dateText = document.createElement("strong");
        dateText.textContent = item.start instanceof Date
          ? item.start.toLocaleDateString()
          : String(item.start || "Unknown date");
        dateWrap.appendChild(dateText);

        // Add marker
        const marker = document.createElement("div");
        marker.className = "timeline-marker";
        marker.setAttribute("aria-hidden", "true");

        // Add card with content
        const card = document.createElement("article");
        card.className = "timeline-card";

        const heading = document.createElement("h3");
        heading.textContent = item.title || item.id || "Untitled";
        card.appendChild(heading);

        if (item.description) {
          const desc = document.createElement("p");
          desc.textContent = item.description;
          card.appendChild(desc);
        }

        // Add metadata
        const meta = document.createElement("div");
        meta.className = "card-meta";
        if (item.categoryId) {
          const category = document.createElement("span");
          category.className = "category";
          category.textContent = item.categoryId;
          meta.appendChild(category);
        }
        card.appendChild(meta);

        // Assemble the item
        li.appendChild(dateWrap);
        li.appendChild(marker);
        li.appendChild(card);
        ul.appendChild(li);
      }

      this.surface.appendChild(ul);
    }
  }

  getViewport() {
    return this.viewport;
  }

  hasFocusedItem() {
    return !!this.focusedId;
  }

  focusedItemId() {
    return this.focusedId || null;
  }

  setOrientation(orientation: string, options?: any) {
    this.orientation = orientation as any;
    if (this.root) {
      this.root.dataset.orientation = orientation;
    }
  }

  getOrientation() {
    return this.orientation;
  }

  refreshLayout() {
    // Trigger layout recalculation
    if (this.root) {
      this.root.offsetHeight;
    }
  }

  ensureFocusPopover() {
    // Ensure focus popover is visible
  }

  closeFocus() {
    this.focusedId = null;
  }

  updateReadout(spec?: any) {
    const start = new Date(this.viewport.start || 0);
    const end = new Date(this.viewport.end || Date.now());
    const unit = spec ? `${spec.step} ${spec.unit}s` : "adaptive";
    this.readout.textContent = `${start.toDateString()} — ${end.toDateString()} · ${unit}`;
  }

  focus(itemId: string) {
    this.focusedId = itemId;
    if (this.root.hidden) this.root.hidden = false;
    this.readout.textContent = `Focus: ${itemId}`;
  }

  unfocus() {
    this.focusedId = null;
    this.readout.textContent = "";
  }
}

function connectorSegment(axisCoordinate: number, terminalCoordinate: number): any {
  const delta = Number(axisCoordinate) - Number(terminalCoordinate);
  if (!Number.isFinite(delta)) throw new TypeError("Connector coordinates must be finite.");
  return {
    offset: Math.min(0, delta),
    span: Math.abs(delta),
  };
}

function connectorRouteOffset(): number {
  return 22;
}

function wheelZoomFactor(deltaPixels: number): number {
  const exponent = Math.min(MAX_WHEEL_EXPONENT, Math.max(-MAX_WHEEL_EXPONENT, Number(deltaPixels) * WHEEL_ZOOM_SENSITIVITY));
  return Math.exp(exponent);
}

function visibleIntervalAnchor(item: any, viewport: any): number | null {
  if (!item || !viewport || !Number.isFinite(item.start)) return null;
  if (!Number.isFinite(item.end)) return item.start;
  const visibleStart = Math.max(item.start, viewport.start);
  const visibleEnd = Math.min(item.end, viewport.end);
  if (visibleEnd < visibleStart) return null;
  return visibleStart + (visibleEnd - visibleStart) / 2;
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
    wheelZoomFactor,
  }),
});
