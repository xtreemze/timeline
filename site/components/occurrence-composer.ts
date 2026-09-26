import { LitElement, css, html, nothing } from "lit";
import {
  timelineContextFromViewport,
  worldContextFromCamera,
  type ComposerTimelineContext,
  type ComposerWorldContext,
} from "../occurrence-composer-context.ts";
import {
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
  replaceComposerTail,
  type ComposerCategoryOption,
  type ComposerEntityOption,
  type ComposerPlaceOption,
  type ComposerSuggestion,
  type OccurrenceSentenceDraft,
} from "../occurrence-composer-model.ts";

export interface OccurrenceComposerData {
  readonly entities: readonly ComposerEntityOption[];
  readonly places: readonly ComposerPlaceOption[];
  readonly categories: readonly ComposerCategoryOption[];
}

export interface OccurrenceCommitDetail {
  readonly text: string;
  readonly draft: OccurrenceSentenceDraft;
  readonly defaults: {
    readonly timeMs: number | null;
    readonly timeValue: string | null;
    readonly timePrecision: string | null;
    readonly longitude: number | null;
    readonly latitude: number | null;
    readonly worldZoom: number | null;
    readonly accuracyMeters: number | null;
  };
}

export class LuumOccurrenceComposerElement extends LitElement {
  static override properties = {
    active: { type: Boolean, reflect: true },
    editing: { type: Boolean, reflect: true },
  };

  static override styles = css`
    :host {
      position: fixed;
      z-index: 1700;
      inset-inline: 0.5rem;
      inset-block-end: calc(52px + max(0.5rem, env(safe-area-inset-bottom)));
      display: grid;
      justify-items: center;
      pointer-events: none;
      color: var(--ink, #191714);
      font-family: inherit;
    }

    .collapsed,
    .composer {
      pointer-events: auto;
      inline-size: min(52rem, calc(100% - 0.5rem));
      border: 1px solid var(--line-strong, #b8b1a5);
      background: color-mix(in srgb, var(--paper, #fff) 94%, transparent);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(16px);
    }

    .collapsed {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-block-size: 44px;
      padding: 0.35rem 0.55rem;
      border-radius: 0.75rem;
      color: var(--muted, #615d56);
      text-align: start;
      cursor: text;
    }

    .collapsed-copy {
      min-inline-size: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: inherit;
    }

    .context-mini {
      flex: 0 0 auto;
      max-inline-size: 45%;
      overflow: hidden;
      color: var(--muted, #615d56);
      font-size: 0.72rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .composer {
      display: grid;
      gap: 0.4rem;
      padding: 0.45rem;
      border-radius: 0.9rem;
    }

    .grammar,
    .context {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      min-inline-size: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .grammar::-webkit-scrollbar,
    .context::-webkit-scrollbar {
      display: none;
    }

    .grammar span,
    .chip {
      flex: 0 0 auto;
      padding: 0.16rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel, #f5f3ef) 82%, transparent);
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      white-space: nowrap;
    }

    .grammar .active-slot {
      color: var(--ink, #191714);
      font-weight: 750;
    }

    .input-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.35rem;
      align-items: center;
    }

    input {
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: 46px;
      box-sizing: border-box;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.62rem;
      padding: 0.65rem 0.75rem;
      outline: none;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      font: 500 0.9rem/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    input:focus-visible {
      border-color: var(--focus, #315fbd);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus, #315fbd) 18%, transparent);
    }

    .close {
      inline-size: 44px;
      block-size: 44px;
      border: 0;
      border-radius: 0.62rem;
      background: transparent;
      color: var(--muted, #615d56);
      cursor: pointer;
      font-size: 1.15rem;
    }

    .close:focus-visible,
    .close:hover {
      background: color-mix(in srgb, var(--panel, #f5f3ef) 88%, transparent);
      color: var(--ink, #191714);
    }

    .diagnostic {
      margin: 0;
      padding-inline: 0.2rem;
      color: var(--danger, #b42318);
      font-size: 0.72rem;
    }

    .help {
      margin: 0;
      padding-inline: 0.2rem;
      color: var(--muted, #615d56);
      font-size: 0.68rem;
    }

    .listbox {
      display: grid;
      max-block-size: min(16rem, 34dvh);
      overflow-y: auto;
      overscroll-behavior: contain;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.65rem;
      background: var(--paper, #fff);
    }

    .option {
      appearance: none;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.6rem;
      align-items: center;
      min-block-size: 44px;
      padding: 0.48rem 0.65rem;
      border: 0;
      border-block-end: 1px solid var(--line, #d1ccc4);
      background: transparent;
      color: inherit;
      text-align: start;
      cursor: pointer;
    }

    .option:last-child {
      border-block-end: 0;
    }

    .option[aria-selected="true"],
    .option:focus-visible,
    .option:hover {
      background: color-mix(in srgb, var(--panel, #f5f3ef) 88%, transparent);
    }

    .option-label {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .option-detail {
      color: var(--muted, #615d56);
      font-size: 0.7rem;
      white-space: nowrap;
    }

    @media (min-width: 700px) {
      :host {
        inset-inline: 1rem;
        inset-block-end: calc(56px + max(0.75rem, env(safe-area-inset-bottom)));
      }

      .composer {
        padding: 0.55rem;
      }
    }
  `;

  active = false;
  editing = false;

  private value = "";
  private data: OccurrenceComposerData = Object.freeze({
    entities: Object.freeze([]),
    places: Object.freeze([]),
    categories: Object.freeze([]),
  });
  private timelineContext: ComposerTimelineContext | null = null;
  private worldContext: ComposerWorldContext | null = null;
  private activeSuggestion = 0;
  private externalError = "";
  private explicitPlaceContext: ComposerWorldContext | null = null;

  setData(data: OccurrenceComposerData): void {
    this.data = Object.freeze({
      entities: Object.freeze([...data.entities]),
      places: Object.freeze([...data.places]),
      categories: Object.freeze([...data.categories]),
    });
    this.requestUpdate();
  }

  setTimelineViewport(start: number | null, end: number | null): void {
    this.timelineContext = timelineContextFromViewport(start, end);
    this.requestUpdate();
  }

  setWorldContext(longitude: number | null, latitude: number | null, zoom: number | null): void {
    this.worldContext = worldContextFromCamera({ longitude, latitude, zoom });
    this.requestUpdate();
  }

  setEditing(editing: boolean): void {
    this.editing = editing;
    if (!editing) this.active = false;
  }

  show(): void {
    this.active = true;
    this.externalError = "";
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  hide(): void {
    this.active = false;
    this.externalError = "";
  }

  setError(message: string): void {
    this.externalError = message;
    this.requestUpdate();
  }

  markCommitted(): void {
    this.value = "";
    this.explicitPlaceContext = null;
    this.externalError = "";
    this.activeSuggestion = 0;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  private parsed(): OccurrenceSentenceDraft {
    return parseOccurrenceSentence(this.value);
  }

  private suggestions(): readonly ComposerSuggestion[] {
    return occurrenceComposerSuggestions(this.value, {
      entities: this.data.entities,
      places: this.data.places,
      categories: this.data.categories,
      timelineDefault: this.timelineContext?.value ?? null,
      locationDefault: this.worldContext?.label ?? null,
    });
  }

  private requestOpen(): void {
    this.dispatchEvent(
      new CustomEvent("occurrencecomposeropenrequest", { bubbles: true, composed: true }),
    );
  }

  private requestClose(): void {
    this.dispatchEvent(
      new CustomEvent("occurrencecomposercloserequest", { bubbles: true, composed: true }),
    );
  }

  private setComposerValue(value: string): void {
    const previousPlace = this.parsed().place?.name ?? null;
    this.value = value;
    const nextPlace = this.parsed().place?.name ?? null;
    if (!nextPlace) {
      this.explicitPlaceContext = null;
    } else if (nextPlace !== previousPlace && this.worldContext) {
      this.explicitPlaceContext = this.worldContext;
    }
    this.externalError = "";
    this.activeSuggestion = 0;
    this.requestUpdate();
  }

  private onInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.setComposerValue(target.value);
  }

  private applySuggestion(suggestion: ComposerSuggestion): void {
    if (!suggestion.insertText) return;
    const parsed = this.parsed();
    this.setComposerValue(
      replaceComposerTail(this.value, suggestion.insertText, parsed.stage),
    );
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  private commit(): void {
    const draft = this.parsed();
    if (!draft.subject || !draft.predicate || !draft.object || draft.diagnostics.length) {
      this.externalError =
        draft.diagnostics[0] ?? "Complete subject, action, and object before committing.";
      this.requestUpdate();
      return;
    }
    this.dispatchEvent(
      new CustomEvent<OccurrenceCommitDetail>("occurrencecommit", {
        bubbles: true,
        composed: true,
        detail: {
          text: this.value.trim(),
          draft,
          defaults: {
            timeMs: this.timelineContext?.centerMs ?? null,
            timeValue: this.timelineContext?.value ?? null,
            timePrecision: this.timelineContext?.precision ?? null,
            longitude:
              draft.place && this.explicitPlaceContext
                ? this.explicitPlaceContext.longitude
                : (this.worldContext?.longitude ?? null),
            latitude:
              draft.place && this.explicitPlaceContext
                ? this.explicitPlaceContext.latitude
                : (this.worldContext?.latitude ?? null),
            worldZoom:
              draft.place && this.explicitPlaceContext
                ? this.explicitPlaceContext.zoom
                : (this.worldContext?.zoom ?? null),
            accuracyMeters:
              draft.place && this.explicitPlaceContext
                ? this.explicitPlaceContext.accuracyMeters
                : (this.worldContext?.accuracyMeters ?? null),
          },
        },
      }),
    );
  }

  private onKeyDown(event: KeyboardEvent): void {
    const suggestions = this.suggestions();
    if (event.key === "Escape") {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      this.activeSuggestion = (this.activeSuggestion + 1) % suggestions.length;
      this.requestUpdate();
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      this.activeSuggestion =
        (this.activeSuggestion - 1 + suggestions.length) % suggestions.length;
      this.requestUpdate();
      return;
    }
    if (event.key === "Tab" && suggestions.length) {
      event.preventDefault();
      const suggestion = suggestions[this.activeSuggestion] ?? suggestions[0];
      if (suggestion) this.applySuggestion(suggestion);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const draft = this.parsed();
    if (draft.stage !== "complete" && suggestions.length) {
      const suggestion = suggestions[this.activeSuggestion] ?? suggestions[0];
      if (suggestion) this.applySuggestion(suggestion);
      return;
    }
    this.commit();
  }

  private grammarSlotClass(slot: string, parsed: OccurrenceSentenceDraft): string {
    if (
      (slot === "subject" && parsed.stage === "subject") ||
      (slot === "action" && parsed.stage === "predicate") ||
      (slot === "object" && parsed.stage === "object") ||
      (slot === "context" && ["place", "time", "options", "complete"].includes(parsed.stage))
    ) {
      return "active-slot";
    }
    return "";
  }

  override render() {
    const parsed = this.parsed();
    const timeLabel = parsed.time?.start ?? this.timelineContext?.label ?? null;
    const placeLabel = parsed.place?.name ?? this.worldContext?.label ?? "World center";
    const suggestions = this.suggestions();
    const diagnostic = this.externalError || parsed.diagnostics[0] || "";

    if (!this.active) {
      return html`
        <button
          class="collapsed"
          type="button"
          aria-label="Compose an occurrence"
          title="Compose an occurrence"
          @click=${() => this.requestOpen()}
        >
          <span class="collapsed-copy">Who … did what … to whom …</span>
          <span class="context-mini">${timeLabel ?? "timeline center"} · ${placeLabel}</span>
        </button>
      `;
    }

    return html`
      <section class="composer" aria-label="Occurrence composer">
        <div class="grammar" aria-hidden="true">
          <span class=${this.grammarSlotClass("subject", parsed)}>subject</span>
          <span>→</span>
          <span class=${this.grammarSlotClass("action", parsed)}>action</span>
          <span>→</span>
          <span class=${this.grammarSlotClass("object", parsed)}>object</span>
          <span>→</span>
          <span class=${this.grammarSlotClass("context", parsed)}>where / when / options</span>
        </div>

        <div class="input-row">
          <input
            type="text"
            autocomplete="off"
            autocapitalize="sentences"
            spellcheck="false"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded=${String(suggestions.length > 0)}
            aria-controls="occurrence-composer-listbox"
            aria-activedescendant=${
              suggestions.length ? `occurrence-composer-option-${this.activeSuggestion}` : nothing
            }
            aria-describedby="occurrence-composer-help occurrence-composer-diagnostic"
            placeholder=${`Who did what to whom · at ${placeLabel} · on ${timeLabel ?? "timeline center"}`}
            .value=${this.value}
            @input=${(event: Event) => this.onInput(event)}
            @keydown=${(event: KeyboardEvent) => this.onKeyDown(event)}
          />
          <button
            class="close"
            type="button"
            aria-label="Close occurrence composer"
            title="Close"
            @click=${() => this.requestClose()}
          >×</button>
        </div>

        <div class="context" aria-label="Occurrence defaults">
          <span class="chip">
            ${parsed.place ? "Place" : "World center"}: ${placeLabel}
          </span>
          <span class="chip">
            ${parsed.time
              ? "Time"
              : `Timeline center (${this.timelineContext?.precision ?? "unresolved"})`}: ${timeLabel ?? "not available"}
          </span>
          ${parsed.options.category
            ? html`<span class="chip">Category: ${parsed.options.category}</span>`
            : nothing}
        </div>

        ${diagnostic
          ? html`<p id="occurrence-composer-diagnostic" class="diagnostic" role="alert">${diagnostic}</p>`
          : html`<span id="occurrence-composer-diagnostic" hidden></span>`}

        ${suggestions.length
          ? html`
              <div id="occurrence-composer-listbox" class="listbox" role="listbox">
                ${suggestions.map(
                  (suggestion, index) => html`
                    <button
                      id=${`occurrence-composer-option-${index}`}
                      class="option"
                      type="button"
                      role="option"
                      aria-selected=${String(index === this.activeSuggestion)}
                      @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                      @click=${() => this.applySuggestion(suggestion)}
                    >
                      <span class="option-label">${suggestion.label}</span>
                      <span class="option-detail">${suggestion.detail ?? suggestion.kind}</span>
                    </button>
                  `,
                )}
              </div>
            `
          : nothing}

        <p id="occurrence-composer-help" class="help">
          Tab completes · Enter commits · Esc closes. Quote multi-word entity names.
          Move the timeline or World while this is open to change the unpinned time/place defaults.
        </p>
      </section>
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-occurrence-composer")) {
  customElements.define("luum-occurrence-composer", LuumOccurrenceComposerElement);
}
