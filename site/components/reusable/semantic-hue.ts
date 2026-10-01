import { LitElement, css, html } from "lit";

export interface SemanticHueChangeDetail {
  readonly value: number;
}

function normalizeHue(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(359, Math.round(numeric)));
}

/**
 * Domain-neutral hue editor.
 *
 * The component owns only hue selection and synchronized range/number inputs.
 * Consumers remain responsible for converting hue into theme/state-specific
 * saturation, lightness/value and contrast.
 */
export class SemanticHueElement extends LitElement {
  static override properties = {
    value: { type: Number, reflect: true },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
  };

  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
      color: var(--semantic-hue-ink, CanvasText);
      font: inherit;
    }
    label {
      display: grid;
      gap: 0.35rem;
      min-inline-size: 0;
    }
    .label {
      font-size: 0.82em;
      font-weight: 650;
    }
    .controls {
      display: grid;
      grid-template-columns: minmax(6rem, 1fr) minmax(4.5rem, auto) auto;
      gap: 0.45rem;
      align-items: center;
      min-inline-size: 0;
    }
    input {
      min-block-size: var(--semantic-hue-target-size, 44px);
      box-sizing: border-box;
      font: inherit;
    }
    input[type="range"] {
      inline-size: 100%;
      min-inline-size: 5rem;
      accent-color: hsl(var(--semantic-hue) 65% 50%);
    }
    input[type="number"] {
      inline-size: 5.25rem;
      padding-inline: 0.45rem;
    }
    output {
      min-inline-size: 3.25ch;
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    @media (pointer: coarse) {
      input { min-block-size: max(48px, var(--semantic-hue-target-size, 44px)); }
    }
  `;

  declare value: number;
  declare label: string;
  declare disabled: boolean;

  constructor() {
    super();
    this.value = 220;
    this.label = "Hue";
    this.disabled = false;
  }

  private setValue(value: unknown, eventName: "semantic-hue-input" | "semantic-hue-change"): void {
    const next = normalizeHue(value);
    if (next !== this.value) this.value = next;
    this.style.setProperty("--semantic-hue", String(next));
    this.dispatchEvent(
      new CustomEvent<SemanticHueChangeDetail>(eventName, {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ value: next }),
      }),
    );
  }

  private onInput(event: InputEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.setValue(target.value, "semantic-hue-input");
  }

  private onChange(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.setValue(target.value, "semantic-hue-change");
  }

  protected override updated(): void {
    this.value = normalizeHue(this.value);
    this.style.setProperty("--semantic-hue", String(this.value));
  }

  override render() {
    const value = String(normalizeHue(this.value));
    return html`
      <label part="control">
        <span class="label" part="label">${this.label}</span>
        <span class="controls" part="controls">
          <input
            part="range"
            type="range"
            min="0"
            max="359"
            step="1"
            .value=${value}
            ?disabled=${this.disabled}
            aria-label=${`${this.label} slider`}
            @input=${this.onInput}
            @change=${this.onChange}
          />
          <input
            part="number"
            type="number"
            min="0"
            max="359"
            step="1"
            inputmode="numeric"
            .value=${value}
            ?disabled=${this.disabled}
            aria-label=${`${this.label} in degrees`}
            @input=${this.onInput}
            @change=${this.onChange}
          />
          <output part="output" aria-live="polite">${value}°</output>
        </span>
      </label>
    `;
  }
}
