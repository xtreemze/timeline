import { css, html, LitElement, nothing } from "lit";
import { embedThemeStyles } from "./embed-theme.ts";
import { runScopedViewTransition } from "./project-site-motion.ts";

export interface EmbedTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly timeLabel: string;
  readonly detail?: string;
  readonly color?: string;
}

export class LuumEmbedTimelineElement extends LitElement {
  static properties = {
    items: { attribute: false },
    selectedId: { type: String, attribute: "selected-id" },
    ariaLabel: { type: String, attribute: "aria-label" },
  };

  static styles = [
    embedThemeStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      [part="surface"] {
        position: relative;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
        padding: 1rem 0.35rem 1.2rem;
      }

      [part="rail"] {
        position: relative;
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(10rem, 1fr);
        align-items: stretch;
        gap: 1rem;
        min-inline-size: max(100%, calc(var(--luum-embed-item-count, 1) * 11rem));
      }

      [part="rail"]::before {
        content: "";
        position: absolute;
        inset-inline: 0;
        inset-block-start: 2.15rem;
        block-size: 2px;
        background: color-mix(in srgb, var(--_luum-line) 38%, transparent);
      }

      [part="item"] {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 0.3rem;
        min-block-size: 7.2rem;
        padding: 0.75rem 0.8rem;
        border: 2px solid var(--_luum-line);
        border-radius: var(--_luum-radius);
        background: var(--_luum-paper);
        color: inherit;
        box-shadow: var(--_luum-shadow);
        text-align: start;
        cursor: pointer;
        view-transition-name: match-element;
      }

      [part="item"]::before {
        content: "";
        inline-size: 0.9rem;
        block-size: 0.9rem;
        margin-block-start: -1.15rem;
        border: 2px solid var(--_luum-line);
        border-radius: 999px;
        background: var(--item-color, var(--_luum-accent));
      }

      [part="item"][aria-current="true"] {
        border-color: var(--item-color, var(--_luum-accent));
        box-shadow:
          inset 0 4px 0 var(--item-color, var(--_luum-accent)),
          var(--_luum-shadow);
      }

      [part="time"] {
        color: var(--_luum-muted);
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 0.75rem;
        font-weight: 850;
        letter-spacing: 0.05em;
      }

      [part="label"] {
        font-size: 1rem;
        font-weight: 900;
        line-height: 1.05;
      }

      [part="detail"] {
        color: var(--_luum-muted);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      @media (prefers-reduced-motion: reduce) {
        [part="surface"] {
          scroll-behavior: auto;
        }
      }
    `,
  ];

  declare items: readonly EmbedTimelineItem[];
  declare selectedId: string;
  declare ariaLabel: string;

  constructor() {
    super();
    this.items = [];
    this.selectedId = "";
    this.ariaLabel = "Timeline";
  }

  private selectItem(id: string): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('[part="surface"]');
    void runScopedViewTransition(surface, async () => {
      this.selectedId = id;
      this.dispatchEvent(
        new CustomEvent("luum-embed-select", {
          bubbles: true,
          composed: true,
          detail: Object.freeze({ kind: "timeline", id }),
        }),
      );
      await this.updateComplete;
    });
  }

  protected override render() {
    const count = Math.max(1, this.items.length);
    return html`
      <div
        part="surface"
        role="region"
        aria-label=${this.ariaLabel}
        style=${`--luum-embed-item-count:${String(count)}`}
      >
        <div part="rail" role="group" aria-label="Timeline items">
          ${this.items.map(
            (item) => html`
              <button
                part="item"
                type="button"
                aria-current=${this.selectedId === item.id ? "true" : nothing}
                style=${item.color ? `--item-color:${item.color}` : nothing}
                @click=${() => this.selectItem(item.id)}
              >
                <span part="time">${item.timeLabel}</span>
                <span part="label">${item.label}</span>
                ${item.detail ? html`<span part="detail">${item.detail}</span>` : nothing}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }
}
