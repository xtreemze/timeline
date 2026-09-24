import { LitElement, css, html, nothing } from "lit";

export type AuthoringMenuAction =
  | "add-place"
  | "add-node"
  | "add-relationship"
  | "edit-selection";

export interface AuthoringMenuOpenOptions {
  readonly clientX: number;
  readonly clientY: number;
  readonly date?: string | null;
  readonly placeLabel?: string | null;
  readonly selectionKind?: "node" | "edge" | "place" | null;
  readonly longitude?: number | null;
  readonly latitude?: number | null;
}

export class LuumAuthoringMenuElement extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    contextDate: { type: String, attribute: "context-date" },
    contextPlace: { type: String, attribute: "context-place" },
    selectionKind: { type: String, attribute: "selection-kind" },
    longitude: { type: Number },
    latitude: { type: Number },
  };

  static override styles = css`
    :host {
      position: fixed;
      z-index: 1200;
      display: none;
      inline-size: min(19rem, calc(100vw - 1rem));
      max-block-size: min(24rem, calc(100dvh - 1rem));
      color: var(--ink, #171717);
      font: inherit;
    }

    :host([open]) {
      display: block;
    }

    .menu {
      display: grid;
      gap: 0.375rem;
      padding: 0.5rem;
      border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
      border-radius: 0.875rem;
      background: color-mix(in srgb, var(--paper, #fff) 96%, transparent);
      box-shadow:
        0 18px 44px rgb(0 0 0 / 18%),
        0 2px 8px rgb(0 0 0 / 10%);
      backdrop-filter: blur(18px);
    }

    .context {
      display: flex;
      min-block-size: 1.75rem;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
      padding-inline: 0.25rem;
      color: var(--muted, #666);
      font-size: 0.75rem;
      line-height: 1.2;
    }

    .chip {
      min-inline-size: 0;
      overflow: hidden;
      padding: 0.25rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, currentColor 8%, transparent);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: grid;
      gap: 0.25rem;
    }

    button {
      min-block-size: 44px;
      inline-size: 100%;
      padding: 0.6rem 0.75rem;
      border: 0;
      border-radius: 0.65rem;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 650;
      text-align: start;
      cursor: pointer;
    }

    button:hover,
    button:focus-visible {
      background: color-mix(in srgb, currentColor 8%, transparent);
      outline: none;
    }

    button[data-action="edit-selection"] {
      border-block-start: 1px solid color-mix(in srgb, currentColor 12%, transparent);
      border-radius: 0 0 0.65rem 0.65rem;
    }

    @media (max-width: 540px), (pointer: coarse) {
      :host {
        inline-size: min(21rem, calc(100vw - 0.75rem));
      }

      button {
        min-block-size: 48px;
      }
    }
  `;

  open = false;
  contextDate = "";
  contextPlace = "";
  selectionKind: "node" | "edge" | "place" | "" = "";
  longitude: number | null = null;
  latitude: number | null = null;
  #returnFocus: HTMLElement | null = null;

  showAt(options: AuthoringMenuOpenOptions): void {
    const activeElement = this.ownerDocument.activeElement;
    this.#returnFocus =
      activeElement instanceof HTMLElement && activeElement !== this ? activeElement : null;
    this.contextDate = options.date ?? "";
    this.contextPlace = options.placeLabel ?? "";
    this.selectionKind = options.selectionKind ?? "";
    this.longitude = Number.isFinite(options.longitude) ? (options.longitude ?? null) : null;
    this.latitude = Number.isFinite(options.latitude) ? (options.latitude ?? null) : null;
    this.open = true;
    this.style.left = `${Math.max(8, options.clientX)}px`;
    this.style.top = `${Math.max(8, options.clientY)}px`;
    this.requestUpdate();

    void this.updateComplete.then(() => {
      this.clampToViewport();
      this.renderRoot.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  }

  close({ restoreFocus = true }: { readonly restoreFocus?: boolean } = {}): void {
    if (!this.open) return;
    this.open = false;
    const returnFocus = this.#returnFocus;
    this.#returnFocus = null;
    if (restoreFocus) {
      void this.updateComplete.then(() => returnFocus?.focus({ preventScroll: true }));
    }
  }

  private handleMenuKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      this.dispatchEvent(
        new CustomEvent("authoringdismiss", {
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>("button"));
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.findIndex((item) => item === this.ownerDocument.activeElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (current - 1 + items.length) % items.length
            : (current + 1) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
  }

  private clampToViewport(): void {
    const rect = this.getBoundingClientRect();
    const maxLeft = Math.max(8, globalThis.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, globalThis.innerHeight - rect.height - 8);
    const left = Number.parseFloat(this.style.left) || 8;
    const top = Number.parseFloat(this.style.top) || 8;
    this.style.left = `${Math.min(left, maxLeft)}px`;
    this.style.top = `${Math.min(top, maxTop)}px`;
  }

  private activate(action: AuthoringMenuAction): void {
    this.dispatchEvent(
      new CustomEvent("authoringaction", {
        bubbles: true,
        composed: true,
        detail: { action },
      }),
    );
  }

  private coordinateLabel(): string {
    if (this.latitude === null || this.longitude === null) return "";
    return `${this.latitude.toFixed(4)}, ${this.longitude.toFixed(4)}`;
  }

  override render() {
    const coordinate = this.coordinateLabel();
    const hasContext = Boolean(this.contextDate || this.contextPlace || coordinate);
    return html`
      <div
        class="menu"
        role="menu"
        aria-label="Create or edit"
        aria-orientation="vertical"
        @keydown=${(event: KeyboardEvent) => this.handleMenuKeyDown(event)}
      >
        ${
          hasContext
            ? html`
                <div class="context" aria-label="Authoring context">
                  ${this.contextDate
                    ? html`<span class="chip" title="Selected time">${this.contextDate}</span>`
                    : nothing}
                  ${this.contextPlace
                    ? html`<span class="chip" title="Selected place">${this.contextPlace}</span>`
                    : nothing}
                  ${coordinate
                    ? html`<span class="chip" title="World position">${coordinate}</span>`
                    : nothing}
                </div>
              `
            : nothing
        }
        <div class="actions">
          <button type="button" role="menuitem" @click=${() => this.activate("add-place")}>
            Add place
          </button>
          <button type="button" role="menuitem" @click=${() => this.activate("add-node")}>
            Add node
          </button>
          <button
            type="button"
            role="menuitem"
            @click=${() => this.activate("add-relationship")}
          >
            Add relationship
          </button>
          ${
            this.selectionKind
              ? html`
                  <button
                    type="button"
                    role="menuitem"
                    data-action="edit-selection"
                    @click=${() => this.activate("edit-selection")}
                  >
                    Edit selected ${this.selectionKind}
                  </button>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-authoring-menu")
) {
  customElements.define("luum-authoring-menu", LuumAuthoringMenuElement);
}
