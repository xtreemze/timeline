/**
 * Timeline UI rendering and viewport management
 * Handles interactive timeline surface with zoom, pan, focus, and navigation
 */

type TimelineViewControllerType = any;

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
    // Render items to surface
    if (this.surface) {
      const list = this.surface.querySelector("ul") || (() => {
        const ul = document.createElement("ul");
        ul.className = "timeline-items";
        this.surface.appendChild(ul);
        return ul;
      })();
      list.innerHTML = this.items
        .map((item) => `<li data-id="${item.id}" class="timeline-item">${item.title || item.id}</li>`)
        .join("");
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
