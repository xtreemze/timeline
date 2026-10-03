import { css, html, LitElement, nothing } from "lit";

export interface MediaViewerZoomDetail {
  readonly zoom: number;
}

type Point = Readonly<{ x: number; y: number }>;

const ZOOM_STEPS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const);
const RESET_ZOOM = 1;
const KEYBOARD_PAN_PX = 36;
const DOUBLE_TAP_MAX_DELAY_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 28;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Domain-neutral zoomable image viewer.
 *
 * Owns pointer, pinch, wheel and keyboard image navigation. It intentionally
 * knows nothing about occurrence selection, slideshow frames or app state.
 */
export class ReusableMediaViewerElement extends LitElement {
  static override properties = {
    src: { type: String },
    alt: { type: String },
    caption: { type: String },
    minZoom: { type: Number, attribute: "min-zoom" },
    maxZoom: { type: Number, attribute: "max-zoom" },
    zoom: { state: true },
  };

  static override styles = css`
    :host { display:block; min-inline-size:0; font:inherit; color:inherit }
    figure { display:grid; gap:.45rem; margin:0; min-inline-size:0 }
    .viewport {
      position:relative; display:grid; place-items:center; min-block-size:10rem;
      overflow:hidden; border-radius:var(--media-viewer-radius,.55rem);
      background:var(--media-viewer-surface,color-mix(in srgb,CanvasText 5%,Canvas));
      touch-action:none; user-select:none;
    }
    .viewport:focus-visible { outline:2px solid var(--media-viewer-focus,Highlight); outline-offset:2px }
    img {
      display:block; inline-size:100%; block-size:100%; max-block-size:var(--media-viewer-max-height,70dvh);
      object-fit:contain; transform:translate(var(--media-pan-x,0),var(--media-pan-y,0)) scale(var(--media-zoom,1));
      transform-origin:center; will-change:transform; pointer-events:none;
    }
    figcaption { color:var(--media-viewer-muted,GrayText); font-size:.82em }
    .controls { display:flex; align-items:center; justify-content:center; gap:.4rem }
    button {
      min-inline-size:var(--media-viewer-target-size,44px); min-block-size:var(--media-viewer-target-size,44px);
      border:1px solid color-mix(in srgb,CanvasText 18%,Canvas); border-radius:.45rem;
      background:Canvas; color:CanvasText; font:inherit;
    }
    output { min-inline-size:4ch; text-align:center; font-variant-numeric:tabular-nums }
    @media (pointer:coarse) { button { min-inline-size:48px; min-block-size:48px } }
  `;

  declare src: string;
  declare alt: string;
  declare caption: string;
  declare minZoom: number;
  declare maxZoom: number;
  declare zoom: number;

  private panX = 0;
  private panY = 0;
  private readonly pointers = new Map<number, Point>();
  private pinchDistance = 0;
  private pinchCenter: Point | null = null;
  private lastTap: Readonly<{ x: number; y: number; at: number }> | null = null;

  constructor() {
    super();
    this.src = "";
    this.alt = "";
    this.caption = "";
    this.minZoom = 0.5;
    this.maxZoom = 3;
    this.zoom = RESET_ZOOM;
  }

  private get viewport(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(".viewport");
  }

  private syncTransform(): void {
    const image = this.renderRoot.querySelector<HTMLImageElement>("img");
    if (!image) return;
    image.style.setProperty("--media-zoom", String(this.zoom));
    image.style.setProperty("--media-pan-x", `${this.panX}px`);
    image.style.setProperty("--media-pan-y", `${this.panY}px`);
  }

  private clampPan(viewport: HTMLElement | null = this.viewport): void {
    if (!viewport || this.zoom <= RESET_ZOOM + 0.001) {
      this.panX = 0;
      this.panY = 0;
      return;
    }
    const maxX = (viewport.clientWidth * (this.zoom - 1)) / 2;
    const maxY = (viewport.clientHeight * (this.zoom - 1)) / 2;
    this.panX = clamp(this.panX, -maxX, maxX);
    this.panY = clamp(this.panY, -maxY, maxY);
  }

  private setPan(x: number, y: number, viewport: HTMLElement | null = this.viewport): void {
    this.panX = x;
    this.panY = y;
    this.clampPan(viewport);
    this.syncTransform();
  }

  private setZoom(
    next: number,
    viewport: HTMLElement | null = this.viewport,
    focal: Point | null = null,
  ): void {
    const minimum = Math.min(this.minZoom, this.maxZoom);
    const maximum = Math.max(this.minZoom, this.maxZoom);
    const previous = this.zoom;
    const zoom = clamp(next, minimum, maximum);
    if (Math.abs(previous - zoom) < 0.0001) return;
    if (viewport && focal && previous > 0) {
      const rect = viewport.getBoundingClientRect();
      const focalX = focal.x - rect.left - rect.width / 2;
      const focalY = focal.y - rect.top - rect.height / 2;
      const ratio = zoom / previous;
      this.panX = focalX - ratio * (focalX - this.panX);
      this.panY = focalY - ratio * (focalY - this.panY);
    }
    this.zoom = zoom;
    this.clampPan(viewport);
    this.syncTransform();
    this.dispatchEvent(
      new CustomEvent<MediaViewerZoomDetail>("media-viewer-zoom", {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ zoom }),
      }),
    );
  }

  resetView(): void {
    this.zoom = RESET_ZOOM;
    this.panX = 0;
    this.panY = 0;
    this.pointers.clear();
    this.pinchDistance = 0;
    this.pinchCenter = null;
    this.syncTransform();
  }

  private stepZoom(delta: number): void {
    const steps = ZOOM_STEPS.filter((step) => step >= this.minZoom && step <= this.maxZoom);
    if (!steps.length) {
      this.setZoom(this.zoom + delta * 0.25);
      return;
    }
    const target =
      delta > 0
        ? (steps.find((value) => value > this.zoom + 0.001) ?? steps.at(-1) ?? this.maxZoom)
        : ([...steps].reverse().find((value) => value < this.zoom - 0.001) ??
          steps[0] ??
          this.minZoom);
    this.setZoom(target);
  }

  private pinchMetrics(): Readonly<{ distance: number; center: Point }> | null {
    const points = [...this.pointers.values()];
    if (points.length < 2) return null;
    const first = points[0];
    const second = points[1];
    if (!(first && second)) return null;
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    return Object.freeze({
      distance: Math.hypot(dx, dy),
      center: Object.freeze({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }),
    });
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.src || (event.pointerType === "mouse" && event.button !== 0)) return;
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events may not own native capture.
    }
    this.pointers.set(event.pointerId, Object.freeze({ x: event.clientX, y: event.clientY }));
    const metrics = this.pinchMetrics();
    if (metrics) {
      this.pinchDistance = Math.max(1, metrics.distance);
      this.pinchCenter = metrics.center;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    this.pointers.set(event.pointerId, Object.freeze({ x: event.clientX, y: event.clientY }));
    const metrics = this.pinchMetrics();
    if (metrics) {
      event.preventDefault();
      const previousCenter = this.pinchCenter ?? metrics.center;
      this.panX += metrics.center.x - previousCenter.x;
      this.panY += metrics.center.y - previousCenter.y;
      const ratio = this.pinchDistance > 0 ? metrics.distance / this.pinchDistance : 1;
      this.setZoom(this.zoom * ratio, viewport, metrics.center);
      this.pinchDistance = Math.max(1, metrics.distance);
      this.pinchCenter = metrics.center;
      return;
    }
    if (this.zoom > RESET_ZOOM + 0.001) {
      event.preventDefault();
      this.setPan(
        this.panX + event.clientX - previous.x,
        this.panY + event.clientY - previous.y,
        viewport,
      );
    }
  }

  private releasePointer(event: PointerEvent): void {
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    this.pointers.delete(event.pointerId);
    try {
      if (viewport.hasPointerCapture(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore capture differences for synthetic or cancelled pointers.
    }
    if (this.pointers.size < 2) {
      this.pinchDistance = 0;
      this.pinchCenter = null;
    }
    if (event.type === "pointercancel" || event.type === "lostpointercapture") {
      // An interrupted gesture is not a tap, so it must not pair with the next one.
      this.lastTap = null;
    }
    if (event.type === "pointerup" && event.pointerType === "touch" && this.pointers.size === 0) {
      const now = Date.now();
      const previous = this.lastTap;
      if (
        previous &&
        now - previous.at <= DOUBLE_TAP_MAX_DELAY_MS &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <=
          DOUBLE_TAP_MAX_DISTANCE_PX
      ) {
        this.lastTap = null;
        this.setZoom(this.zoom > RESET_ZOOM + 0.001 ? RESET_ZOOM : 2, viewport, {
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        this.lastTap = Object.freeze({ x: event.clientX, y: event.clientY, at: now });
      }
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.src) return;
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    event.preventDefault();
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? Math.max(1, viewport.clientHeight)
          : 1;
    this.setZoom(this.zoom * Math.exp(-event.deltaY * unit * 0.0015), viewport, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  private onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    this.setZoom(this.zoom > RESET_ZOOM + 0.001 ? RESET_ZOOM : 2, this.viewport, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.stepZoom(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      this.stepZoom(-1);
      return;
    }
    if (event.key === "0" || event.key === "Escape") {
      event.preventDefault();
      this.resetView();
      return;
    }
    if (this.zoom <= RESET_ZOOM + 0.001) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.setPan(this.panX + KEYBOARD_PAN_PX, this.panY);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this.setPan(this.panX - KEYBOARD_PAN_PX, this.panY);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setPan(this.panX, this.panY + KEYBOARD_PAN_PX);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setPan(this.panX, this.panY - KEYBOARD_PAN_PX);
    }
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("src")) this.resetView();
    this.syncTransform();
  }

  override render() {
    if (!this.src) return nothing;
    const zoomLabel = `${Math.round(this.zoom * 100)}%`;
    return html`
      <figure part="figure">
        <div
          class="viewport"
          part="viewport"
          tabindex="0"
          role="group"
          aria-label="Image viewer. Drag to pan when zoomed; pinch, wheel, plus or minus to zoom; zero resets."
          aria-keyshortcuts="+ - 0 ArrowLeft ArrowRight ArrowUp ArrowDown"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.releasePointer}
          @pointercancel=${this.releasePointer}
          @lostpointercapture=${this.releasePointer}
          @wheel=${this.onWheel}
          @dblclick=${this.onDoubleClick}
          @keydown=${this.onKeyDown}
        >
          <img part="image" src=${this.src} alt=${this.alt} decoding="async" draggable="false" />
        </div>
        ${this.caption ? html`<figcaption part="caption">${this.caption}</figcaption>` : nothing}
        <div class="controls" part="controls" role="group" aria-label="Image zoom">
          <button type="button" part="zoom-out" aria-label="Zoom image out" @click=${() => this.stepZoom(-1)}
            ?disabled=${this.zoom <= this.minZoom + 0.001}>−</button>
          <output part="zoom-level" aria-live="polite">${zoomLabel}</output>
          <button type="button" part="zoom-in" aria-label="Zoom image in" @click=${() => this.stepZoom(1)}
            ?disabled=${this.zoom >= this.maxZoom - 0.001}>+</button>
        </div>
      </figure>
    `;
  }
}
