import { LitElement, css, html, nothing } from "lit";

export interface ComposerOption {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly color?: string;
  readonly iconLabel?: string;
  readonly disabled?: boolean;
  readonly keywords?: readonly string[];
}

export class ReusableComposerElement extends LitElement {
  static override properties = {
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    multiple: { type: Boolean, reflect: true },
    selectOnSpace: { type: Boolean, attribute: "select-on-space" },
    wheelSelection: { type: Boolean, attribute: "wheel-selection" },
    suggestions: { attribute: false },
    selected: { attribute: false },
    activeIndex: { state: true },
  };

  static override styles = css`
    :host { display:block; min-inline-size:0; color:var(--composer-ink, CanvasText); font:inherit }
    .control { position:relative; min-inline-size:0 }
    .field {
      display:flex; align-items:center; gap:.3rem; min-block-size:var(--composer-target-size,44px);
      box-sizing:border-box; padding:.25rem .42rem; overflow-x:auto; overscroll-behavior-inline:contain;
      border:1px solid var(--composer-border,color-mix(in srgb,CanvasText 22%,Canvas));
      border-radius:var(--composer-radius,.58rem); background:var(--composer-surface,Canvas);
      scroll-snap-type:inline proximity;
    }
    .field:focus-within { border-color:var(--composer-focus,Highlight); outline:2px solid color-mix(in srgb,var(--composer-focus,Highlight) 35%,transparent); outline-offset:-2px }
    .chip {
      display:inline-flex; flex:0 0 auto; align-items:center; gap:.25rem; min-block-size:28px;
      max-inline-size:min(16rem,65cqi); box-sizing:border-box; padding:.18rem .48rem; overflow:hidden;
      border:1px solid color-mix(in srgb,var(--chip-accent,CanvasText) 34%,transparent);
      border-radius:999px; background:color-mix(in srgb,var(--chip-accent,CanvasText) 8%,Canvas);
      font-size:.78em; font-weight:650; text-overflow:ellipsis; white-space:nowrap; scroll-snap-align:center;
    }
    .swatch { flex:0 0 auto; inline-size:.62rem; block-size:.62rem; border-radius:50%; background:var(--item-accent,currentColor) }
    input { flex:1 1 8rem; min-inline-size:5rem; min-block-size:34px; padding:0 .28rem; border:0; outline:0; background:transparent; color:inherit; font:inherit }
    .listbox {
      position:absolute; z-index:var(--composer-list-z,20); inset-inline:0; inset-block-start:calc(100% + .32rem);
      display:grid; max-block-size:min(var(--composer-list-max-height,18rem),55dvh); overflow-y:auto;
      overscroll-behavior:contain; border:1px solid var(--composer-border,color-mix(in srgb,CanvasText 22%,Canvas));
      border-radius:var(--composer-radius,.58rem); background:var(--composer-surface,Canvas);
      box-shadow:0 .55rem 1.4rem color-mix(in srgb,CanvasText 14%,transparent); scrollbar-gutter:stable;
    }
    .option {
      appearance:none; display:grid; grid-template-columns:auto minmax(0,1fr); gap:.5rem; align-items:center;
      min-block-size:var(--composer-target-size,44px); padding:.48rem .62rem; border:0;
      border-block-end:1px solid color-mix(in srgb,CanvasText 10%,transparent); background:transparent;
      color:inherit; font:inherit; text-align:start; cursor:pointer; --item-accent:var(--composer-focus,Highlight);
    }
    .option:is([data-active="true"],:hover,:focus-visible) { background:color-mix(in srgb,var(--item-accent) 9%,var(--composer-surface,Canvas)); outline:0 }
    .option[aria-selected="true"] { box-shadow:inset 3px 0 0 var(--item-accent) }
    .copy { display:grid; min-inline-size:0 }
    .label,.detail { overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
    .label { font-weight:650 }
    .detail,.empty { color:var(--composer-muted,GrayText); font-size:.78em }
    .empty { padding:.72rem }
    @media (pointer:coarse) { .field,.option { min-block-size:max(48px,var(--composer-target-size,44px)) } }
  `;

  declare value: string;
  declare placeholder: string;
  declare disabled: boolean;
  declare multiple: boolean;
  declare selectOnSpace: boolean;
  declare wheelSelection: boolean;
  declare suggestions: readonly ComposerOption[];
  declare selected: readonly ComposerOption[];
  declare activeIndex: number;

  constructor() {
    super();
    this.value = "";
    this.placeholder = "Type a command…";
    this.disabled = false;
    this.multiple = false;
    this.selectOnSpace = false;
    this.wheelSelection = true;
    this.suggestions = Object.freeze([]);
    this.selected = Object.freeze([]);
    this.activeIndex = 0;
  }

  private get options(): readonly ComposerOption[] {
    const query = this.value.trim().toLocaleLowerCase();
    if (!query) return this.suggestions;
    return this.suggestions.filter((option) =>
      [option.label, option.detail ?? "", ...(option.keywords ?? [])].join(" ").toLocaleLowerCase().includes(query),
    );
  }

  private isSelected(id: string): boolean {
    return this.selected.some((option) => option.id === id);
  }

  private move(delta: number): void {
    const count = this.options.length;
    if (count) this.activeIndex = (this.activeIndex + delta + count) % count;
  }

  private choose(option: ComposerOption): void {
    if (option.disabled) return;
    const exists = this.isSelected(option.id);
    this.selected = Object.freeze(
      this.multiple
        ? exists ? this.selected.filter((entry) => entry.id !== option.id) : [...this.selected, option]
        : [option],
    );
    this.value = this.multiple ? "" : option.label;
    this.activeIndex = 0;
    this.dispatchEvent(new CustomEvent("composer-selection-change", {
      bubbles:true, composed:true, detail:Object.freeze({ option, selected:this.selected }),
    }));
  }

  private onInput(event: InputEvent): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.value = input.value;
    this.activeIndex = 0;
    this.dispatchEvent(new CustomEvent("composer-input", {
      bubbles:true, composed:true, detail:Object.freeze({ value:this.value }),
    }));
  }

  private onKeyDown(event: KeyboardEvent): void {
    const options = this.options;
    const activeOption = options[this.activeIndex];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === " " && this.multiple && this.selectOnSpace && this.value.trim() && activeOption) {
      event.preventDefault();
      this.choose(activeOption);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) this.choose(activeOption);
      else this.dispatchEvent(new CustomEvent("composer-commit", {
        bubbles:true, composed:true, detail:Object.freeze({ value:this.value, selected:this.selected }),
      }));
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.dispatchEvent(new CustomEvent("composer-dismiss", { bubbles:true, composed:true }));
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.wheelSelection || this.options.length < 2 || event.deltaY === 0) return;
    event.preventDefault();
    this.move(event.deltaY > 0 ? 1 : -1);
  }

  protected override updated(): void {
    const count = this.options.length;
    this.activeIndex = count ? Math.max(0, Math.min(this.activeIndex, count - 1)) : 0;
    this.renderRoot.querySelector<HTMLElement>('.option[data-active="true"]')
      ?.scrollIntoView({ block:"center", inline:"nearest" });
  }

  override render() {
    const options = this.options;
    const activeId = options[this.activeIndex] ? `composer-option-${this.activeIndex}` : nothing;
    return html`
      <div class="control" part="control">
        <div class="field" part="field" @wheel=${this.onWheel}>
          <slot name="prefix"></slot>
          ${this.selected.map((option) => html`
            <span class="chip" part="chip" style=${option.color ? `--chip-accent:${option.color}` : nothing}>
              ${option.color ? html`<span class="swatch" style=${`--item-accent:${option.color}`} aria-hidden="true"></span>` : nothing}
              <span>${option.label}</span>
            </span>
          `)}
          <input
            part="input" .value=${this.value} placeholder=${this.placeholder} ?disabled=${this.disabled}
            role="combobox" aria-autocomplete="list" aria-expanded=${String(!this.disabled && options.length > 0)}
            aria-controls="composer-listbox" aria-activedescendant=${activeId}
            @input=${this.onInput} @keydown=${this.onKeyDown}
          />
          <slot name="suffix"></slot>
        </div>
        ${!this.disabled && (this.value.length > 0 || options.length > 0) ? html`
          <div id="composer-listbox" class="listbox" part="listbox" role="listbox">
            ${options.length ? options.map((option,index) => html`
              <button
                id=${`composer-option-${index}`} class="option" part="option" type="button" role="option"
                data-active=${String(index === this.activeIndex)} aria-selected=${String(this.isSelected(option.id))}
                ?disabled=${option.disabled} style=${option.color ? `--item-accent:${option.color}` : nothing}
                @pointerenter=${() => { this.activeIndex = index; }} @click=${() => this.choose(option)}
              >
                <span aria-hidden="true">${option.iconLabel ?? (option.color ? html`<span class="swatch"></span>` : "")}</span>
                <span class="copy"><span class="label">${option.label}</span>${option.detail ? html`<span class="detail">${option.detail}</span>` : nothing}</span>
              </button>
            `) : html`<div class="empty" part="empty">No matching suggestions</div>`}
          </div>
        ` : nothing}
      </div>
    `;
  }
}
