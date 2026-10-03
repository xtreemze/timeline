import { html, LitElement, nothing } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { createIcon } from "../event-presentation.ts";
import {
  deckNavigationMode,
  normalizeOccurrenceDeckFrames,
  type OccurrenceDeckFrame,
  resolveOccurrenceDeckIndex,
  stepOccurrenceDeckIndex,
} from "../occurrence-media-deck-model.ts";

export interface OccurrenceDeckChangeDetail {
  readonly occurrenceId: string;
  readonly activeIndex: number;
}

export interface OccurrenceDeckInput {
  readonly occurrenceId: string;
  readonly frames: readonly (
    | Readonly<{
        kind: "image" | "video" | "audio";
        src?: string;
        blob?: Blob;
        mimeType?: string;
        sha256?: string;
        alt?: string;
        caption?: string;
      }>
    | Readonly<{ kind: "context"; label?: string; body?: string }>
  )[];
  readonly activeIndex?: number;
}

const IMAGE_ZOOM_STEPS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const);
const IMAGE_MIN_ZOOM = 0.5;
const IMAGE_RESET_ZOOM = 1;
const IMAGE_MAX_ZOOM = 3;
const SWIPE_THRESHOLD_PX = 52;
const SWIPE_MAX_DURATION_MS = 700;
const DOUBLE_TAP_MAX_DELAY_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 28;
const KEYBOARD_PAN_PX = 36;

const POINTER_CANCEL_EVENT = "pointercancel";
const LOST_POINTER_CAPTURE_EVENT = "lostpointercapture";

type PointerPoint = Readonly<{ x: number; y: number }>;

function occurrenceDeckFramesEqual(
  previous: readonly OccurrenceDeckFrame[],
  next: readonly OccurrenceDeckFrame[],
): boolean {
  if (previous.length !== next.length) return false;
  return previous.every((frame, index) => {
    const candidate = next[index];
    if (!candidate || frame.kind !== candidate.kind) return false;
    if (frame.kind === "context" && candidate.kind === "context") {
      return frame.label === candidate.label && frame.body === candidate.body;
    }
    if (frame.kind === "context" || candidate.kind === "context") return false;
    return (
      frame.src === candidate.src &&
      frame.blob === candidate.blob &&
      frame.mimeType === candidate.mimeType &&
      frame.sha256 === candidate.sha256 &&
      frame.alt === candidate.alt &&
      frame.caption === candidate.caption
    );
  });
}

export class LuumOccurrenceDeckElement extends LitElement {
  static override properties = {
    occurrenceId: { type: String, attribute: "occurrence-id" },
    activeIndex: { type: Number, attribute: "active-index" },
  };

  declare occurrenceId: string;
  declare activeIndex: number;

  private frames: readonly OccurrenceDeckFrame[] = Object.freeze([]);
  private readonly failedMediaIndexes = new Set<number>();
  private readonly blobObjectUrls = new Map<Blob, string>();
  private imageZoomValue = IMAGE_RESET_ZOOM;
  private imagePanX = 0;
  private imagePanY = 0;
  private readonly activePointers = new Map<number, PointerPoint>();
  private gestureOrigin: Readonly<{
    x: number;
    y: number;
    startedAt: number;
    pointerType: string;
  }> | null = null;
  private gestureWasPinch = false;
  private pinchDistance = 0;
  private pinchCenter: PointerPoint | null = null;
  private lastTouchTap: Readonly<{ x: number; y: number; at: number }> | null = null;
  private readonly imageViewportRef = createRef<HTMLElement>();
  private readonly imageRef = createRef<HTMLImageElement>();
  private imageTransformFrame = 0;
  private imageTransformNeedsRender = false;
  private gestureViewportRect: DOMRect | null = null;
  private transientViewportRect: DOMRect | null = null;
  private readonly pinchMetricScratch = { distance: 0, centerX: 0, centerY: 0 };

  constructor() {
    super();
    this.occurrenceId = "";
    this.activeIndex = 0;
  }

  override createRenderRoot(): HTMLElement {
    return this;
  }

  setDeck(input: OccurrenceDeckInput): void {
    const nextOccurrenceId = input.occurrenceId.trim();
    const nextFrames = normalizeOccurrenceDeckFrames(input.frames);
    const nextIndex = resolveOccurrenceDeckIndex({
      previousOccurrenceId: this.occurrenceId || null,
      nextOccurrenceId,
      previousIndex: this.activeIndex,
      requestedIndex: input.activeIndex ?? 0,
      frameCount: nextFrames.length,
    });

    const occurrenceChanged = nextOccurrenceId !== this.occurrenceId;
    const framesChanged = !occurrenceDeckFramesEqual(this.frames, nextFrames);
    const indexChanged = nextIndex !== this.activeIndex;
    if (!(occurrenceChanged || framesChanged || indexChanged)) return;

    if (occurrenceChanged || framesChanged) {
      this.failedMediaIndexes.clear();
      this.resetImageTransform(false);
    }
    if (framesChanged) {
      this.releaseUnusedBlobUrls(nextFrames);
      this.frames = nextFrames;
    }
    this.occurrenceId = nextOccurrenceId;
    this.activeIndex = nextIndex;
    this.dataset.frameCount = String(nextFrames.length);
    this.dataset.activeKind = nextFrames[nextIndex]?.kind ?? "";
    this.requestUpdate();
  }

  private focusControl(selector: string): void {
    void this.updateComplete.then(() => {
      this.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
    });
  }

  private selectIndex(index: number, focusSelector: string | null = null): void {
    if (this.frames.length <= 0) return;
    const next = stepOccurrenceDeckIndex(index, 0, this.frames.length);
    if (next === this.activeIndex) {
      if (focusSelector) this.focusControl(focusSelector);
      return;
    }

    this.activeIndex = next;
    this.dataset.activeKind = this.frames[next]?.kind ?? "";
    this.resetImageTransform(false);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<OccurrenceDeckChangeDetail>("occurrencedeckchange", {
        bubbles: true,
        composed: true,
        detail: Object.freeze({
          occurrenceId: this.occurrenceId,
          activeIndex: next,
        }),
      }),
    );
    if (focusSelector) this.focusControl(focusSelector);
  }

  private step(delta: number, focusSelector: string | null = null): void {
    this.selectIndex(
      stepOccurrenceDeckIndex(this.activeIndex, delta, this.frames.length),
      focusSelector,
    );
  }

  stepBy(delta: number): boolean {
    if (this.frames.length < 2) return false;
    this.step(delta);
    return true;
  }

  private onMediaError(index: number): void {
    this.failedMediaIndexes.add(index);
    this.resetImageTransform(false);
    this.requestUpdate();
  }

  private mediaSource(frame: OccurrenceDeckFrame): string {
    if (frame.kind === "context") return "";
    const direct = frame.src?.trim() ?? "";
    if (direct) return direct;
    if (!frame.blob) return "";
    const existing = this.blobObjectUrls.get(frame.blob);
    if (existing) return existing;
    const url = URL.createObjectURL(frame.blob);
    this.blobObjectUrls.set(frame.blob, url);
    return url;
  }

  private releaseUnusedBlobUrls(frames: readonly OccurrenceDeckFrame[]): void {
    const retained = new Set<Blob>();
    for (const frame of frames) {
      if (frame.kind !== "context" && frame.blob) retained.add(frame.blob);
    }
    for (const [blob, url] of this.blobObjectUrls) {
      if (retained.has(blob)) continue;
      URL.revokeObjectURL(url);
      this.blobObjectUrls.delete(blob);
    }
  }

  private releaseBlobUrls(): void {
    for (const url of this.blobObjectUrls.values()) URL.revokeObjectURL(url);
    this.blobObjectUrls.clear();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.frames.some((frame) => frame.kind !== "context" && frame.blob)) {
      this.requestUpdate();
    }
  }

  override disconnectedCallback(): void {
    if (this.imageTransformFrame) cancelAnimationFrame(this.imageTransformFrame);
    this.imageTransformFrame = 0;
    this.imageTransformNeedsRender = false;
    this.transientViewportRect = null;
    this.resetGestureState();
    this.releaseBlobUrls();
    super.disconnectedCallback();
  }

  private imageZoom(): number {
    return this.imageZoomValue;
  }

  private imageViewport(): HTMLElement | null {
    return this.imageViewportRef.value ?? null;
  }

  private imageElement(): HTMLImageElement | null {
    return this.imageRef.value ?? null;
  }

  private hasInteractiveImage(): boolean {
    const frame = this.frames[this.activeIndex];
    return frame?.kind === "image" && !this.failedMediaIndexes.has(this.activeIndex);
  }

  private imageTransformStyle(): string {
    return [
      `--occurrence-image-zoom: ${this.imageZoomValue}`,
      `--occurrence-image-pan-x: ${this.imagePanX}px`,
      `--occurrence-image-pan-y: ${this.imagePanY}px`,
    ].join("; ");
  }

  private syncImageTransform(): void {
    const image = this.imageElement();
    if (image) {
      image.style.setProperty("--occurrence-image-zoom", String(this.imageZoomValue));
      image.style.setProperty("--occurrence-image-pan-x", `${this.imagePanX}px`);
      image.style.setProperty("--occurrence-image-pan-y", `${this.imagePanY}px`);
    }
    const viewport = this.imageViewport();
    if (viewport) {
      viewport.dataset.zoomed = String(this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001);
    }
  }

  private scheduleImageTransformSync(requestRender = false): void {
    this.imageTransformNeedsRender ||= requestRender;
    if (this.imageTransformFrame) return;
    this.imageTransformFrame = requestAnimationFrame(() => {
      this.imageTransformFrame = 0;
      const shouldRender = this.imageTransformNeedsRender;
      this.imageTransformNeedsRender = false;
      this.transientViewportRect = null;
      this.syncImageTransform();
      if (shouldRender) this.requestUpdate();
    });
  }

  private resetGestureState(): void {
    this.activePointers.clear();
    this.gestureOrigin = null;
    this.gestureWasPinch = false;
    this.pinchDistance = 0;
    this.pinchCenter = null;
    this.gestureViewportRect = null;
  }

  private resetImageTransform(request = true): void {
    this.imageZoomValue = IMAGE_RESET_ZOOM;
    this.imagePanX = 0;
    this.imagePanY = 0;
    this.resetGestureState();
    if (request) this.requestUpdate();
  }

  private clampImagePan(viewport: HTMLElement | null = this.imageViewport()): void {
    if (this.imageZoomValue <= IMAGE_RESET_ZOOM + 0.001 || !viewport) {
      this.imagePanX = 0;
      this.imagePanY = 0;
      return;
    }
    const maxX = (viewport.clientWidth * (this.imageZoomValue - 1)) / 2;
    const maxY = (viewport.clientHeight * (this.imageZoomValue - 1)) / 2;
    this.imagePanX = Math.max(-maxX, Math.min(maxX, this.imagePanX));
    this.imagePanY = Math.max(-maxY, Math.min(maxY, this.imagePanY));
  }

  private setImagePan(
    x: number,
    y: number,
    viewport: HTMLElement | null = this.imageViewport(),
  ): void {
    this.imagePanX = x;
    this.imagePanY = y;
    this.clampImagePan(viewport);
    this.scheduleImageTransformSync();
  }

  private setImageZoom(
    zoom: number,
    viewport: HTMLElement | null = this.imageViewport(),
    focalPoint: PointerPoint | null = null,
  ): void {
    const previousZoom = this.imageZoomValue;
    const nextZoom = Math.max(IMAGE_MIN_ZOOM, Math.min(IMAGE_MAX_ZOOM, zoom));
    if (Math.abs(nextZoom - previousZoom) < 0.0001) return;

    if (viewport && focalPoint && previousZoom > 0) {
      let rect = this.gestureViewportRect ?? this.transientViewportRect;
      if (!rect) {
        rect = viewport.getBoundingClientRect();
        this.transientViewportRect = rect;
      }
      const focalX = focalPoint.x - rect.left - rect.width / 2;
      const focalY = focalPoint.y - rect.top - rect.height / 2;
      const ratio = nextZoom / previousZoom;
      this.imagePanX = focalX - ratio * (focalX - this.imagePanX);
      this.imagePanY = focalY - ratio * (focalY - this.imagePanY);
    }

    this.imageZoomValue = nextZoom;
    this.clampImagePan(viewport);
    this.scheduleImageTransformSync(true);
  }

  private stepImageZoom(delta: number): void {
    const epsilon = 0.001;
    const target =
      delta > 0
        ? (IMAGE_ZOOM_STEPS.find((value) => value > this.imageZoomValue + epsilon) ??
          IMAGE_MAX_ZOOM)
        : ([...IMAGE_ZOOM_STEPS].reverse().find((value) => value < this.imageZoomValue - epsilon) ??
          IMAGE_MIN_ZOOM);
    this.setImageZoom(target);
  }

  private pinchMetrics(): Readonly<{ distance: number; centerX: number; centerY: number }> | null {
    const iterator = this.activePointers.values();
    const first = iterator.next().value;
    const second = iterator.next().value;
    if (!(first && second)) return null;
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    this.pinchMetricScratch.distance = Math.hypot(dx, dy);
    this.pinchMetricScratch.centerX = (first.x + second.x) / 2;
    this.pinchMetricScratch.centerY = (first.y + second.y) / 2;
    return this.pinchMetricScratch;
  }

  private beginPinch(): void {
    const metrics = this.pinchMetrics();
    if (!metrics) return;
    this.gestureWasPinch = true;
    this.pinchDistance = Math.max(1, metrics.distance);
    this.pinchCenter = { x: metrics.centerX, y: metrics.centerY };
  }

  private onImagePointerDown(event: PointerEvent): void {
    if (!this.hasInteractiveImage()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic browser-certification pointer events may not own native capture.
    }
    viewport.focus({ preventScroll: true });
    if (this.activePointers.size === 0) {
      this.gestureOrigin = Object.freeze({
        x: event.clientX,
        y: event.clientY,
        startedAt: Date.now(),
        pointerType: event.pointerType,
      });
      this.gestureWasPinch = false;
      this.gestureViewportRect = viewport.getBoundingClientRect();
    }
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size >= 2) this.beginPinch();
  }

  private onImagePointerMove(event: PointerEvent): void {
    const previous = this.activePointers.get(event.pointerId);
    if (!previous) return;
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    const previousX = previous.x;
    const previousY = previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (this.activePointers.size >= 2) {
      event.preventDefault();
      const metrics = this.pinchMetrics();
      if (!metrics) return;
      const previousCenterX = this.pinchCenter?.x ?? metrics.centerX;
      const previousCenterY = this.pinchCenter?.y ?? metrics.centerY;
      this.imagePanX += metrics.centerX - previousCenterX;
      this.imagePanY += metrics.centerY - previousCenterY;
      const distanceRatio = this.pinchDistance > 0 ? metrics.distance / this.pinchDistance : 1;
      this.setImageZoom(this.imageZoomValue * distanceRatio, viewport, {
        x: metrics.centerX,
        y: metrics.centerY,
      });
      this.pinchDistance = Math.max(1, metrics.distance);
      if (this.pinchCenter) {
        this.pinchCenter.x = metrics.centerX;
        this.pinchCenter.y = metrics.centerY;
      } else {
        this.pinchCenter = { x: metrics.centerX, y: metrics.centerY };
      }
      return;
    }

    if (this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001) {
      event.preventDefault();
      this.setImagePan(
        this.imagePanX + event.clientX - previousX,
        this.imagePanY + event.clientY - previousY,
        viewport,
      );
    }
  }

  private releasePointer(viewport: HTMLElement, pointerId: number): void {
    try {
      if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
    } catch {
      // Ignore capture state differences for synthetic or cancelled pointers.
    }
  }

  private handleTouchTap(event: PointerEvent): void {
    const now = Date.now();
    const previous = this.lastTouchTap;
    if (
      previous &&
      now - previous.at <= DOUBLE_TAP_MAX_DELAY_MS &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <=
        DOUBLE_TAP_MAX_DISTANCE_PX
    ) {
      this.lastTouchTap = null;
      this.setImageZoom(
        this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001 ? IMAGE_RESET_ZOOM : 2,
        this.imageViewport(),
        { x: event.clientX, y: event.clientY },
      );
      return;
    }
    this.lastTouchTap = Object.freeze({ x: event.clientX, y: event.clientY, at: now });
  }

  private onImagePointerEnd(event: PointerEvent): void {
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    const active = this.activePointers.has(event.pointerId);
    const origin = this.gestureOrigin;
    this.activePointers.delete(event.pointerId);
    this.releasePointer(viewport, event.pointerId);

    if (this.activePointers.size < 2) {
      this.pinchDistance = 0;
      this.pinchCenter = null;
    }
    if (!active || this.activePointers.size > 0) return;

    const dx = origin ? event.clientX - origin.x : 0;
    const dy = origin ? event.clientY - origin.y : 0;
    const elapsed = origin ? Date.now() - origin.startedAt : Number.POSITIVE_INFINITY;
    const wasPinch = this.gestureWasPinch;
    const pointerType = origin?.pointerType ?? event.pointerType;
    this.resetGestureState();

    if (
      !wasPinch &&
      this.imageZoomValue <= IMAGE_RESET_ZOOM + 0.001 &&
      this.frames.length > 1 &&
      elapsed <= SWIPE_MAX_DURATION_MS &&
      Math.abs(dx) >= SWIPE_THRESHOLD_PX &&
      Math.abs(dx) > Math.abs(dy) * 1.15
    ) {
      this.step(dx < 0 ? 1 : -1);
      return;
    }

    if (
      !wasPinch &&
      pointerType === "touch" &&
      elapsed <= SWIPE_MAX_DURATION_MS &&
      Math.hypot(dx, dy) < 12
    ) {
      this.handleTouchTap(event);
    }
  }

  private onImagePointerCancel(event: PointerEvent): void {
    const viewport = event.currentTarget;
    if (viewport instanceof HTMLElement) this.releasePointer(viewport, event.pointerId);
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size === 0) this.resetGestureState();
  }

  private onImageLostPointerCapture(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) return;
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size === 0) this.resetGestureState();
  }

  private onImageWheel(event: WheelEvent): void {
    if (!this.hasInteractiveImage()) return;
    event.preventDefault();
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? Math.max(1, viewport.clientHeight)
          : 1;
    const factor = Math.exp(-event.deltaY * unit * 0.0015);
    this.setImageZoom(this.imageZoomValue * factor, viewport, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  private onImageDoubleClick(event: MouseEvent): void {
    if (!this.hasInteractiveImage()) return;
    event.preventDefault();
    this.setImageZoom(
      this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001 ? IMAGE_RESET_ZOOM : 2,
      this.imageViewport(),
      { x: event.clientX, y: event.clientY },
    );
  }

  private onImageKeydown(event: KeyboardEvent): void {
    const viewport = event.currentTarget;
    if (!(viewport instanceof HTMLElement)) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.stepImageZoom(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      this.stepImageZoom(-1);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      this.resetImageTransform();
      return;
    }

    if (this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.setImagePan(this.imagePanX + KEYBOARD_PAN_PX, this.imagePanY, viewport);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.setImagePan(this.imagePanX - KEYBOARD_PAN_PX, this.imagePanY, viewport);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.setImagePan(this.imagePanX, this.imagePanY + KEYBOARD_PAN_PX, viewport);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        this.setImagePan(this.imagePanX, this.imagePanY - KEYBOARD_PAN_PX, viewport);
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.resetImageTransform();
      }
      return;
    }

    if (event.key === "ArrowLeft" && this.frames.length > 1) {
      event.preventDefault();
      this.step(-1);
    } else if (event.key === "ArrowRight" && this.frames.length > 1) {
      event.preventDefault();
      this.step(1);
    } else if (event.key === "Home" && this.frames.length > 1) {
      event.preventDefault();
      this.selectIndex(0);
    } else if (event.key === "End" && this.frames.length > 1) {
      event.preventDefault();
      this.selectIndex(this.frames.length - 1);
    }
  }

  private onControlsKeydown(event: KeyboardEvent): void {
    if (this.frames.length <= 1) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.step(-1, ".timeline-focus-media-control.is-previous");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this.step(1, ".timeline-focus-media-control.is-next");
    } else if (event.key === "Home") {
      event.preventDefault();
      this.selectIndex(0, ".timeline-focus-media-control.is-previous");
    } else if (event.key === "End") {
      event.preventDefault();
      this.selectIndex(this.frames.length - 1, ".timeline-focus-media-control.is-next");
    }
  }

  private renderActiveFrame() {
    const frame = this.frames[this.activeIndex];
    if (!frame) return nothing;

    if (frame.kind === "context") {
      return html`
        <div class="timeline-focus-hero-fallback timeline-occurrence-deck-context">
          <p class="timeline-occurrence-deck-context-label">${frame.label}</p>
          ${
            frame.body
              ? html`<p class="timeline-occurrence-deck-context-body">${frame.body}</p>`
              : nothing
          }
        </div>
      `;
    }

    if (this.failedMediaIndexes.has(this.activeIndex)) {
      return html`
        <div
          class="timeline-focus-hero-fallback"
          role=${frame.alt ? "img" : nothing}
          aria-label=${frame.alt || nothing}
        ></div>
      `;
    }

    const src = this.mediaSource(frame);
    if (frame.kind === "video") {
      return html`
        <div class="timeline-occurrence-deck-native-media-viewport" data-media-kind="video">
          <video
            class="timeline-occurrence-deck-video"
            src=${src}
            controls
            playsinline
            preload="metadata"
            aria-label=${frame.alt || frame.caption || "Video evidence"}
            @error=${() => this.onMediaError(this.activeIndex)}
          ></video>
        </div>
        ${
          frame.caption
            ? html`<p class="timeline-occurrence-deck-caption">${frame.caption}</p>`
            : nothing
        }
      `;
    }

    if (frame.kind === "audio") {
      return html`
        <div class="timeline-occurrence-deck-native-media-viewport" data-media-kind="audio">
          <audio
            class="timeline-occurrence-deck-audio"
            src=${src}
            controls
            preload="metadata"
            aria-label=${frame.alt || frame.caption || "Audio evidence"}
            @error=${() => this.onMediaError(this.activeIndex)}
          ></audio>
        </div>
        ${
          frame.caption
            ? html`<p class="timeline-occurrence-deck-caption">${frame.caption}</p>`
            : nothing
        }
      `;
    }

    return html`
      <div
        ${ref(this.imageViewportRef)}
        class="timeline-occurrence-deck-image-viewport"
        data-zoomed=${String(this.imageZoomValue > IMAGE_RESET_ZOOM + 0.001)}
        tabindex="0"
        role="group"
        aria-label="Image viewer. Drag to pan above 100%; swipe to change frame at 100% or below; pinch, wheel, plus or minus to zoom from 50% to 300%; zero resets to 100%."
        aria-keyshortcuts="+ - 0 ArrowLeft ArrowRight ArrowUp ArrowDown"
        @pointerdown=${(event: PointerEvent) => this.onImagePointerDown(event)}
        @pointermove=${(event: PointerEvent) => this.onImagePointerMove(event)}
        @pointerup=${(event: PointerEvent) => this.onImagePointerEnd(event)}
        @pointercancel=${(event: PointerEvent) => this.onImagePointerCancel(event)}
        @lostpointercapture=${(event: PointerEvent) => this.onImageLostPointerCapture(event)}
        @wheel=${(event: WheelEvent) => this.onImageWheel(event)}
        @dblclick=${(event: MouseEvent) => this.onImageDoubleClick(event)}
        @keydown=${(event: KeyboardEvent) => this.onImageKeydown(event)}
      >
        <img
          ${ref(this.imageRef)}
          class="timeline-focus-hero-image"
          src=${src}
          alt=${frame.alt}
          decoding="async"
          draggable="false"
          style=${this.imageTransformStyle()}
          @error=${() => this.onMediaError(this.activeIndex)}
        />
      </div>
      ${
        frame.caption
          ? html`<p class="timeline-occurrence-deck-caption">${frame.caption}</p>`
          : nothing
      }
    `;
  }

  private renderControlIcon(name: "chevron-left" | "chevron-right" | "zoom-in" | "zoom-out") {
    return html`<span class="timeline-occurrence-deck-icon" data-deck-icon=${name}></span>`;
  }

  private renderZoomControls() {
    const frame = this.frames[this.activeIndex];
    if (frame?.kind !== "image" || this.failedMediaIndexes.has(this.activeIndex)) return nothing;
    const zoom = this.imageZoom();
    return html`
      <div
        class="timeline-occurrence-deck-zoom-controls"
        role="group"
        aria-label="Image zoom"
      >
        <button
          type="button"
          class="timeline-focus-media-control timeline-focus-media-zoom is-zoom-out"
          aria-label="Zoom image out"
          title="Zoom image out"
          ?disabled=${zoom <= IMAGE_MIN_ZOOM + 0.001}
          @click=${() => this.stepImageZoom(-1)}
        >
          ${this.renderControlIcon("zoom-out")}
        </button>
        <span class="timeline-occurrence-deck-zoom-level" aria-live="polite">
          ${Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          class="timeline-focus-media-control timeline-focus-media-zoom is-zoom-in"
          aria-label="Zoom image in"
          title="Zoom image in"
          ?disabled=${zoom >= IMAGE_MAX_ZOOM - 0.001}
          @click=${() => this.stepImageZoom(1)}
        >
          ${this.renderControlIcon("zoom-in")}
        </button>
      </div>
    `;
  }

  private renderControls() {
    const mode = deckNavigationMode(this.frames.length);
    if (mode === "none") return nothing;

    return html`
      <div
        class="timeline-focus-slideshow-controls"
        role="group"
        aria-label="Occurrence media"
        @keydown=${(event: KeyboardEvent) => this.onControlsKeydown(event)}
      >
        <button
          type="button"
          class="timeline-focus-media-control is-previous"
          aria-label="Previous frame"
          @click=${() => this.step(-1, ".timeline-focus-media-control.is-previous")}
        >
          ${this.renderControlIcon("chevron-left")}
        </button>
        ${
          mode === "dots"
            ? this.frames.map(
                (_, index) => html`
                <button
                  type="button"
                  class="timeline-focus-slide-dot ${index === this.activeIndex ? "is-active" : ""}"
                  data-slide-index=${index}
                  aria-label=${`Show frame ${index + 1} of ${this.frames.length}`}
                  aria-current=${index === this.activeIndex ? "true" : "false"}
                  @click=${() => this.selectIndex(index, `[data-slide-index="${index}"]`)}
                ></button>
              `,
              )
            : html`
              <span class="timeline-focus-slide-count" aria-live="polite">
                ${this.activeIndex + 1} / ${this.frames.length}
              </span>
            `
        }
        <button
          type="button"
          class="timeline-focus-media-control is-next"
          aria-label="Next frame"
          @click=${() => this.step(1, ".timeline-focus-media-control.is-next")}
        >
          ${this.renderControlIcon("chevron-right")}
        </button>
      </div>
    `;
  }

  override render() {
    if (!this.frames.length) return nothing;
    return html`${this.renderActiveFrame()}${this.renderZoomControls()}${this.renderControls()}`;
  }

  override updated(): void {
    this.syncImageTransform();
    for (const slot of this.querySelectorAll<HTMLElement>("[data-deck-icon]")) {
      const name = slot.dataset.deckIcon;
      if (
        name !== "chevron-left" &&
        name !== "chevron-right" &&
        name !== "zoom-in" &&
        name !== "zoom-out"
      )
        continue;
      slot.replaceChildren(createIcon(name, { size: 20 }));
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-occurrence-deck")) {
  customElements.define("luum-occurrence-deck", LuumOccurrenceDeckElement);
}
