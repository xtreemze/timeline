import { html, LitElement, nothing } from "lit";
import { createIcon } from "../event-presentation.ts";
import {
  deckNavigationMode,
  normalizeOccurrenceDeckFrames,
  resolveOccurrenceDeckIndex,
  stepOccurrenceDeckIndex,
  type OccurrenceDeckFrame,
} from "../occurrence-media-deck-model.ts";

export interface OccurrenceDeckChangeDetail {
  readonly occurrenceId: string;
  readonly activeIndex: number;
}

export interface OccurrenceDeckInput {
  readonly occurrenceId: string;
  readonly frames: readonly (
    | Readonly<{ kind: "image"; src?: string; alt?: string; caption?: string }>
    | Readonly<{ kind: "context"; label?: string; body?: string }>
  )[];
  readonly activeIndex?: number;
}

export class LuumOccurrenceDeckElement extends LitElement {
  static override properties = {
    occurrenceId: { type: String, attribute: "occurrence-id" },
    activeIndex: { type: Number, attribute: "active-index" },
  };

  declare occurrenceId: string;
  declare activeIndex: number;

  private frames: readonly OccurrenceDeckFrame[] = Object.freeze([]);
  private readonly failedImageIndexes = new Set<number>();

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

    if (nextOccurrenceId !== this.occurrenceId) this.failedImageIndexes.clear();
    this.occurrenceId = nextOccurrenceId;
    this.frames = nextFrames;
    this.activeIndex = nextIndex;
    this.dataset.frameCount = String(nextFrames.length);
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

  private onImageError(index: number): void {
    this.failedImageIndexes.add(index);
    this.requestUpdate();
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

    if (this.failedImageIndexes.has(this.activeIndex)) {
      return html`
        <div
          class="timeline-focus-hero-fallback"
          role=${frame.alt ? "img" : nothing}
          aria-label=${frame.alt || nothing}
        ></div>
      `;
    }

    return html`
      <img
        class="timeline-focus-hero-image"
        src=${frame.src}
        alt=${frame.alt}
        decoding="async"
        draggable="false"
        @error=${() => this.onImageError(this.activeIndex)}
      />
      ${
        frame.caption
          ? html`<p class="timeline-occurrence-deck-caption">${frame.caption}</p>`
          : nothing
      }
    `;
  }

  private renderControlIcon(name: "chevron-left" | "chevron-right") {
    return html`<span class="timeline-occurrence-deck-icon" data-deck-icon=${name}></span>`;
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
    return html`${this.renderActiveFrame()}${this.renderControls()}`;
  }

  override updated(): void {
    for (const slot of this.querySelectorAll<HTMLElement>("[data-deck-icon]")) {
      const name = slot.dataset.deckIcon;
      if (name !== "chevron-left" && name !== "chevron-right") continue;
      slot.replaceChildren(createIcon(name, { size: 20 }));
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-occurrence-deck")) {
  customElements.define("luum-occurrence-deck", LuumOccurrenceDeckElement);
}
