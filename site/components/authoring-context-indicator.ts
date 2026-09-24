import { css, html, LitElement, nothing } from "lit";

export interface AuthoringContextIndicatorState {
  readonly date?: string | null;
  readonly place?: string | null;
  readonly story?: string | null;
  readonly empty?: boolean;
  readonly showGuide?: boolean;
}

export class LuumAuthoringContextIndicatorElement extends LitElement {
  static override properties = {
    contextDate: { type: String, attribute: "context-date" },
    contextPlace: { type: String, attribute: "context-place" },
    contextStory: { type: String, attribute: "context-story" },
    empty: { type: Boolean, reflect: true },
    showGuide: { type: Boolean, attribute: "show-guide", reflect: true },
  };

  static override styles = css`
    :host {
      position: fixed;
      z-index: 52;
      inset-block-start: max(0.75rem, env(safe-area-inset-top));
      inset-inline-start: max(0.75rem, env(safe-area-inset-left));
      display: grid;
      inline-size: min(28rem, calc(100vw - 1.5rem));
      max-block-size: min(14rem, calc(100dvh - 7rem));
      gap: 0.45rem;
      pointer-events: none;
      color: var(--ink, #171717);
      font: inherit;
    }

    .context {
      display: flex;
      inline-size: fit-content;
      max-inline-size: 100%;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
      padding: 0.3rem;
      border: 1px solid color-mix(in srgb, currentColor 11%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--paper, #fff) 88%, transparent);
      box-shadow: 0 8px 24px rgb(0 0 0 / 8%);
      backdrop-filter: blur(14px);
    }

    .chip {
      min-inline-size: 0;
      overflow: hidden;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, currentColor 7%, transparent);
      color: color-mix(in srgb, currentColor 76%, transparent);
      font-size: 0.72rem;
      line-height: 1.15;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .guide {
      display: grid;
      inline-size: min(25rem, 100%);
      gap: 0.35rem;
      padding: 0.8rem 0.9rem;
      border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
      border-radius: 0.9rem;
      background: color-mix(in srgb, var(--paper, #fff) 94%, transparent);
      box-shadow: 0 14px 34px rgb(0 0 0 / 13%);
      backdrop-filter: blur(18px);
      pointer-events: auto;
    }

    .guide strong {
      font-size: 0.9rem;
      line-height: 1.25;
    }

    .guide p {
      margin: 0;
      color: color-mix(in srgb, currentColor 72%, transparent);
      font-size: 0.78rem;
      line-height: 1.4;
    }

    .guide-actions {
      display: flex;
      justify-content: flex-end;
    }

    button {
      min-block-size: 44px;
      padding: 0.45rem 0.7rem;
      border: 0;
      border-radius: 0.65rem;
      background: color-mix(in srgb, currentColor 8%, transparent);
      color: inherit;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 650;
      cursor: pointer;
    }

    button:hover,
    button:focus-visible {
      background: color-mix(in srgb, currentColor 13%, transparent);
      outline: 2px solid color-mix(in srgb, currentColor 36%, transparent);
      outline-offset: 2px;
    }

    :host(:not([show-guide])) .guide {
      display: none;
    }

    @media (pointer: coarse) {
      button {
        min-block-size: 48px;
      }
    }
  `;

  contextDate = "";
  contextPlace = "";
  contextStory = "";
  empty = false;
  showGuide = false;

  setContext(state: AuthoringContextIndicatorState): void {
    this.contextDate = state.date ?? "";
    this.contextPlace = state.place ?? "";
    this.contextStory = state.story ?? "";
    this.empty = Boolean(state.empty);
    this.showGuide = Boolean(state.showGuide);
  }

  private dismissGuide(): void {
    this.showGuide = false;
    this.dispatchEvent(
      new CustomEvent("authoringguidedismiss", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const hasContext = Boolean(this.contextDate || this.contextPlace || this.contextStory);
    return html`
      ${
        hasContext
          ? html`
              <div class="context" aria-label="Authoring context">
                ${
                  this.contextDate
                    ? html`<span class="chip" title="Selected time">${this.contextDate}</span>`
                    : nothing
                }
                ${
                  this.contextPlace
                    ? html`<span class="chip" title="Selected place">${this.contextPlace}</span>`
                    : nothing
                }
                ${
                  this.contextStory
                    ? html`<span class="chip" title="Active story">${this.contextStory}</span>`
                    : nothing
                }
              </div>
            `
          : nothing
      }
      <section class="guide" aria-label="Create your first project item">
        <strong>Build directly on the stage</strong>
        <p>
          Choose a time on the timeline, move to a location, then right-click or long-press empty
          space to add a place, node, or relationship.
        </p>
        <div class="guide-actions">
          <button type="button" @click=${this.dismissGuide}>Dismiss</button>
        </div>
      </section>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-authoring-context-indicator")
) {
  customElements.define("luum-authoring-context-indicator", LuumAuthoringContextIndicatorElement);
}
