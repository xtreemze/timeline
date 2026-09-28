import { LitElement, css, html, nothing } from "lit";
import { iconPathData } from "../event-presentation.ts";
import {
  timelineContextFromViewport,
  worldContextFromCamera,
  type ComposerTimelineContext,
  type ComposerWorldContext,
} from "../occurrence-composer-context.ts";
import {
  acceptComposerSuggestion,
  composerCompletionSuffix,
  composerCursorSection,
  composerEditableSections,
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
  type ComposerCategoryOption,
  type ComposerEditableSection,
  type ComposerEntityOption,
  type ComposerPlaceOption,
  type ComposerSuggestion,
  type OccurrenceSentenceDraft,
} from "../occurrence-composer-model.ts";

export interface OccurrenceComposerData {
  readonly entities: readonly ComposerEntityOption[];
  readonly places: readonly ComposerPlaceOption[];
  readonly categories: readonly ComposerCategoryOption[];
  readonly tags?: readonly string[];
  readonly predicates?: readonly string[];
}

export interface OccurrenceComposerRelationshipMetadata {
  readonly role?: string | null;
  readonly initialState?: "active" | "inactive";
  readonly sourceIds?: readonly string[];
  readonly confidence?: number | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface OccurrenceComposerSelectionContext {
  readonly selectedEntityId?: string | null;
  readonly selectedOccurrenceId?: string | null;
  readonly selectedItemId?: string | null;
  readonly composition?: string | null;
  readonly relationship?: {
    readonly subjectId: string;
    readonly objectId: string;
  } | null;
  readonly place?: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly metadata?: OccurrenceComposerRelationshipMetadata | null;
}

export interface OccurrenceCommitDetail {
  readonly text: string;
  readonly draft: OccurrenceSentenceDraft;
  readonly editTarget: {
    readonly relationshipId: string;
    readonly itemId: string | null;
    readonly initialText: string;
  } | null;
  readonly metadata: {
    readonly role: string | null;
    readonly initialState: "active" | "inactive";
    readonly sourceIds: readonly string[];
    readonly confidence: number | null;
    readonly attributes: Readonly<Record<string, unknown>>;
  };
  readonly defaults: {
    readonly timeMs: number | null;
    readonly timeValue: string | null;
    readonly timePrecision: string | null;
    readonly longitude: number | null;
    readonly latitude: number | null;
    readonly worldZoom: number | null;
    readonly accuracyMeters: number | null;
    readonly placeReference: string | null;
  };
}

export class LuumOccurrenceComposerElement extends LitElement {
  static override properties = {
    active: { type: Boolean, reflect: true },
    editing: { type: Boolean, reflect: true },
  };

  static override styles = css`
    :host {
      position: relative;
      display: block;
      min-inline-size: 0;
      color: var(--ink, #191714);
      font-family: inherit;
    }

    .compact {
      appearance: none;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 0.42rem;
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: 44px;
      box-sizing: border-box;
      padding: 0 0.62rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: var(--toolbar-control-radius, 0.58rem);
      background: color-mix(in srgb, var(--paper, #fff) 86%, transparent);
      color: var(--muted, #615d56);
      cursor: text;
      text-align: start;
      touch-action: manipulation;
    }

    .compact:is(:hover, :focus-visible) {
      border-color: var(--line-strong, #b8b1a5);
      background: var(--paper-2, #f5f3ef);
      color: var(--ink, #191714);
      outline: 2px solid var(--focus, #315fbd);
      outline-offset: -3px;
    }

    .compact-prompt {
      font: 700 0.72rem/1 ui-monospace, "SFMono-Regular", Consolas, monospace;
      color: currentColor;
    }

    .compact-hint {
      min-inline-size: 0;
      overflow: hidden;
      font-size: 0.72rem;
      font-weight: 520;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .composer {
      position: relative;
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
      pointer-events: auto;
    }

    .input-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 0.35rem;
      align-items: center;
      min-inline-size: 0;
    }

    .stage {
      display: grid;
      place-items: center;
      min-inline-size: 4.6rem;
      min-block-size: 32px;
      padding-inline: 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel, #f5f3ef) 82%, transparent);
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: lowercase;
      white-space: nowrap;
    }

    .input-shell {
      position: relative;
      min-inline-size: 0;
    }

    .ghost-completion {
      position: absolute;
      z-index: 2;
      inset: 0;
      box-sizing: border-box;
      display: block;
      min-inline-size: 0;
      min-block-size: 44px;
      padding: 0.55rem 0.7rem;
      overflow: hidden;
      border: 1px solid transparent;
      pointer-events: none;
      font: 500 0.88rem/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace;
      white-space: pre;
    }

    .ghost-base {
      visibility: hidden;
    }

    .ghost-suffix {
      color: color-mix(in srgb, var(--muted, #615d56) 58%, transparent);
    }

    input {
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: 44px;
      box-sizing: border-box;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: var(--toolbar-control-radius, 0.58rem);
      padding: 0.55rem 0.7rem;
      outline: none;
      background: color-mix(in srgb, var(--paper, #fff) 92%, transparent);
      color: var(--ink, #191714);
      font: 500 0.88rem/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    input:focus-visible {
      border-color: var(--focus, #315fbd);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus, #315fbd) 20%, transparent);
    }

    .commit,
    .close {
      appearance: none;
      display: grid;
      place-items: center;
      inline-size: 44px;
      block-size: 44px;
      border: 1px solid transparent;
      border-radius: var(--toolbar-control-radius, 0.58rem);
      background: transparent;
      color: var(--muted, #615d56);
      cursor: pointer;
      touch-action: manipulation;
    }

    .commit {
      border-color: color-mix(in srgb, var(--line-strong, #b8b1a5) 76%, transparent);
      background: color-mix(in srgb, var(--paper, #fff) 92%, transparent);
      color: var(--ink, #191714);
    }

    .commit svg {
      inline-size: 20px;
      block-size: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .commit:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .close {
      font-size: 1.15rem;
    }

    .commit:not(:disabled):focus-visible,
    .commit:not(:disabled):hover,
    .close:focus-visible,
    .close:hover {
      border-color: color-mix(in srgb, var(--line-strong, #b8b1a5) 70%, transparent);
      background: var(--paper-2, #f5f3ef);
      color: var(--ink, #191714);
      outline: none;
    }

    .completion-panel {
      position: absolute;
      z-index: 20;
      inset-inline: 0;
      inset-block-end: calc(100% + 0.38rem);
      display: grid;
      max-block-size: min(18rem, var(--composer-completion-max-height, 42dvh));
      overflow: hidden;
      border: 1px solid var(--line-strong, #b8b1a5);
      border-radius: 0.72rem;
      background: color-mix(in srgb, var(--paper, #fff) 98%, transparent);
      box-shadow: 0 -10px 30px color-mix(in srgb, #000 16%, transparent);
      backdrop-filter: blur(14px);
    }

    .context-row {
      display: flex;
      gap: 0.3rem;
      min-inline-size: 0;
      padding: 0.38rem 0.45rem;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      border-block-end: 1px solid var(--line, #d1ccc4);
      scrollbar-width: none;
    }

    .context-row::-webkit-scrollbar {
      display: none;
    }

    .context-chip {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.28rem;
      min-block-size: 28px;
      max-inline-size: min(18rem, 58vw);
      padding-inline: 0.5rem;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 80%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel, #f5f3ef) 82%, transparent);
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      white-space: nowrap;
    }

    .context-chip[data-context-state="pinned"] {
      border-color: color-mix(in srgb, var(--focus, #315fbd) 42%, var(--line, #d1ccc4));
      color: var(--ink, #191714);
    }

    .context-chip[data-context-state="editing"] {
      border-color: var(--focus, #315fbd);
      background: color-mix(in srgb, var(--focus, #315fbd) 10%, var(--paper, #fff));
      color: var(--ink, #191714);
    }

    button.context-chip {
      appearance: none;
      min-block-size: 44px;
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }

    button.context-chip:hover,
    button.context-chip:focus-visible {
      border-color: var(--line-strong, #b8b1a5);
      color: var(--ink, #191714);
      outline: none;
    }

    .context-chip strong {
      max-inline-size: 12rem;
      overflow: hidden;
      color: inherit;
      text-overflow: ellipsis;
    }

    .context-state {
      font-size: 0.6rem;
      font-weight: 760;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    @media (max-width: 480px) {
      .input-row {
        grid-template-columns: minmax(0, 1fr) auto auto;
      }

      .stage {
        display: none;
      }

      .context-chip {
        max-inline-size: 72vw;
      }
    }

    .metadata-panel {
      display: grid;
      min-block-size: 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
      max-block-size: min(15rem, var(--composer-completion-max-height, 42dvh));
      padding: 0.55rem;
      overflow: auto;
      overscroll-behavior: contain;
      border-block-end: 1px solid var(--line, #d1ccc4);
      background: color-mix(in srgb, var(--paper, #fff) 96%, transparent);
    }

    .metadata-field {
      display: grid;
      gap: 0.22rem;
      min-inline-size: 0;
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      font-weight: 650;
    }

    .metadata-field-wide {
      grid-column: 1 / -1;
    }

    .metadata-field :is(input, select, textarea) {
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: 40px;
      box-sizing: border-box;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.48rem;
      outline: none;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      font: 500 0.78rem/1.35 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    .metadata-field textarea {
      min-block-size: 72px;
      resize: vertical;
    }

    .metadata-field :is(input, select, textarea):focus-visible {
      border-color: var(--focus, #315fbd);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus, #315fbd) 18%, transparent);
    }

    .metadata-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
    }

    .metadata-actions button {
      min-block-size: 40px;
      padding-inline: 0.65rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.48rem;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      cursor: pointer;
      touch-action: manipulation;
    }

    .diagnostic {
      margin: 0;
      padding: 0.5rem 0.65rem;
      border-block-end: 1px solid var(--line, #d1ccc4);
      color: var(--danger, #b42318);
      font-size: 0.72rem;
    }

    .listbox {
      display: grid;
      min-block-size: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
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

    .option-main {
      display: inline-flex;
      min-inline-size: 0;
      align-items: center;
      gap: 0.5rem;
    }

    .option-icon {
      display: inline-grid;
      flex: 0 0 auto;
      inline-size: 20px;
      block-size: 20px;
      place-items: center;
    }

    .option-icon svg {
      inline-size: 20px;
      block-size: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
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

    .help {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  declare active: boolean;
  declare editing: boolean;

  private value = "";
  private data: OccurrenceComposerData = Object.freeze({
    entities: Object.freeze([]),
    places: Object.freeze([]),
    categories: Object.freeze([]),
    predicates: Object.freeze([]),
  });
  private timelineContext: ComposerTimelineContext | null = null;
  private explicitTimelineContext: ComposerTimelineContext | null = null;
  private worldContext: ComposerWorldContext | null = null;
  private activeSuggestion = 0;
  private cursorOffset = 0;
  private externalError = "";
  private explicitPlaceContext: ComposerWorldContext | null = null;
  private selectionContext: OccurrenceComposerSelectionContext | null = null;
  private pendingSelectionContext: OccurrenceComposerSelectionContext | null = null;
  private hasPendingSelectionContext = false;
  private selectionSeeded = false;
  private sessionKey = "";
  private activeContextKind: "place" | "time" | "category" | "tag" | null = null;
  private metadataOpen = false;
  private metadataDirty = false;
  private metadataRole = "";
  private metadataInitialState: "active" | "inactive" = "active";
  private metadataSourceIds = "";
  private metadataConfidence = "";
  private metadataAttributes = "{}";

  constructor() {
    super();
    this.active = false;
    this.editing = false;
  }

  setData(data: OccurrenceComposerData): void {
    this.data = Object.freeze({
      entities: Object.freeze([...data.entities]),
      places: Object.freeze([...data.places]),
      categories: Object.freeze([...data.categories]),
      tags: Object.freeze([...(data.tags ?? [])]),
      predicates: Object.freeze([...(data.predicates ?? [])]),
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

  private frozenSelectionContext(
    context: OccurrenceComposerSelectionContext | null,
  ): OccurrenceComposerSelectionContext | null {
    return context
      ? Object.freeze({
          ...(context.selectedEntityId ? { selectedEntityId: context.selectedEntityId } : {}),
          ...(context.selectedOccurrenceId
            ? { selectedOccurrenceId: context.selectedOccurrenceId }
            : {}),
          ...(context.selectedItemId ? { selectedItemId: context.selectedItemId } : {}),
          ...(context.composition ? { composition: context.composition } : {}),
          ...(context.relationship
            ? {
                relationship: Object.freeze({
                  subjectId: context.relationship.subjectId,
                  objectId: context.relationship.objectId,
                }),
              }
            : {}),
          ...(context.place
            ? { place: Object.freeze({ id: context.place.id, name: context.place.name }) }
            : {}),
          ...(context.metadata
            ? {
                metadata: Object.freeze({
                  ...(context.metadata.role !== undefined ? { role: context.metadata.role } : {}),
                  ...(context.metadata.initialState
                    ? { initialState: context.metadata.initialState }
                    : {}),
                  sourceIds: Object.freeze([...(context.metadata.sourceIds ?? [])]),
                  ...(context.metadata.confidence !== undefined
                    ? { confidence: context.metadata.confidence }
                    : {}),
                  attributes: Object.freeze({ ...(context.metadata.attributes ?? {}) }),
                }),
              }
            : {}),
        })
      : null;
  }

  setSelectionContext(context: OccurrenceComposerSelectionContext | null): void {
    const nextContext = this.frozenSelectionContext(context);
    const previousKey = this.selectionIdentityKey(this.selectionContext);
    const nextKey = this.selectionIdentityKey(nextContext);
    const dirtyDraft =
      (Boolean(this.value.trim()) && !this.selectionSeeded) || this.metadataDirty;

    if (previousKey !== nextKey && dirtyDraft) {
      this.pendingSelectionContext = nextContext;
      this.hasPendingSelectionContext = true;
      this.requestUpdate();
      return;
    }
    if (previousKey === nextKey && dirtyDraft) {
      this.pendingSelectionContext = null;
      this.hasPendingSelectionContext = false;
      this.requestUpdate();
      return;
    }

    this.pendingSelectionContext = null;
    this.hasPendingSelectionContext = false;
    this.selectionContext = nextContext;
    if (previousKey !== nextKey) {
      this.resetDraft();
    } else if (!dirtyDraft) {
      this.resetMetadataFromSelection();
    }
    this.applySelectionSeed();
    this.requestUpdate();
  }

  private selectionIdentityKey(
    context: OccurrenceComposerSelectionContext | null,
  ): string {
    return JSON.stringify({
      occurrence: context?.selectedOccurrenceId ?? "",
      item: context?.selectedItemId ?? "",
      entity: context?.selectedEntityId ?? "",
      subject: context?.relationship?.subjectId ?? "",
      object: context?.relationship?.objectId ?? "",
      place: context?.place?.id ?? "",
    });
  }

  private acceptPendingSelectionContext(): void {
    if (!this.hasPendingSelectionContext) return;
    this.selectionContext = this.pendingSelectionContext;
    this.pendingSelectionContext = null;
    this.hasPendingSelectionContext = false;
    this.resetDraft();
    this.sessionKey = this.currentContextKey();
    this.applySelectionSeed();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(this.cursorOffset, this.cursorOffset);
    });
  }

  private selectedSubjectId(): string | null {
    return (
      this.selectionContext?.selectedEntityId ??
      this.selectionContext?.relationship?.subjectId ??
      null
    );
  }

  private selectedSubjectLabel(): string | null {
    const id = this.selectedSubjectId();
    if (!id) return null;
    return this.data.entities.find((entity) => entity.id === id)?.name ?? id;
  }

  private resetMetadataFromSelection(): void {
    const metadata = this.selectionContext?.metadata;
    this.metadataRole = metadata?.role?.trim() ?? "";
    this.metadataInitialState = metadata?.initialState === "inactive" ? "inactive" : "active";
    this.metadataSourceIds = (metadata?.sourceIds ?? []).join("\n");
    this.metadataConfidence =
      metadata?.confidence === null || metadata?.confidence === undefined
        ? ""
        : String(metadata.confidence);
    this.metadataAttributes = JSON.stringify(metadata?.attributes ?? {}, null, 2);
    this.metadataDirty = false;
  }

  private resetDraft(): void {
    this.value = "";
    this.cursorOffset = 0;
    this.selectionSeeded = false;
    this.explicitPlaceContext = null;
    this.explicitTimelineContext = null;
    this.externalError = "";
    this.activeSuggestion = 0;
    this.activeContextKind = null;
    this.metadataOpen = false;
    this.resetMetadataFromSelection();
  }

  private currentContextKey(): string {
    return JSON.stringify({
      occurrence: this.selectionContext?.selectedOccurrenceId ?? "",
      item: this.selectionContext?.selectedItemId ?? "",
      subject: this.selectedSubjectId() ?? "",
      object: this.selectionContext?.relationship?.objectId ?? "",
      place: this.selectionContext?.place?.id ?? "",
      time: this.timelineContext?.value ?? "",
      world: this.worldContext?.label ?? "",
    });
  }

  beginSession(): void {
    const nextKey = this.currentContextKey();
    if (
      this.sessionKey &&
      this.sessionKey !== nextKey &&
      (this.value.trim() || this.metadataDirty)
    ) {
      this.resetDraft();
    }
    this.sessionKey = nextKey;
    this.applySelectionSeed();
    this.requestUpdate();
  }

  private applySelectionSeed(): void {
    const composition = this.selectionContext?.composition?.trim() ?? "";
    if (composition) {
      if (!this.value.trim() || this.selectionSeeded) {
        this.value = composition;
        this.cursorOffset = composition.length;
        this.selectionSeeded = true;
      }
      return;
    }

    const subjectId = this.selectedSubjectId();
    if (!subjectId) {
      if (this.selectionSeeded) this.value = "";
      this.selectionSeeded = false;
      return;
    }
    if (!this.value.trim() || this.selectionSeeded) {
      this.value = `@${subjectId} `;
      this.cursorOffset = this.value.length;
      this.selectionSeeded = true;
    }
  }

  setEditing(editing: boolean): void {
    this.editing = editing;
  }

  show(): void {
    this.active = true;
    this.externalError = "";
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  hide(): void {
    this.sessionKey = this.currentContextKey();
    this.active = false;
    this.externalError = "";
  }

  setError(message: string): void {
    this.externalError = message;
    this.requestUpdate();
  }

  markCommitted(): void {
    this.pendingSelectionContext = null;
    this.hasPendingSelectionContext = false;
    this.resetDraft();
    this.sessionKey = this.currentContextKey();
    this.applySelectionSeed();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  private parsed(): OccurrenceSentenceDraft {
    return parseOccurrenceSentence(this.value);
  }

  private suggestions(): readonly ComposerSuggestion[] {
    const parsed = this.parsed();
    const preferredEntityIds =
      parsed.stage === "object" && this.selectionContext?.relationship?.objectId
        ? [this.selectionContext.relationship.objectId]
        : parsed.stage === "subject" && this.selectedSubjectId()
          ? [this.selectedSubjectId()!]
          : [];
    const suggestions = occurrenceComposerSuggestions(this.value, {
      entities: this.data.entities,
      places: this.data.places,
      categories: this.data.categories,
      tags: this.data.tags,
      timelineDefault: this.timelineContext?.value ?? null,
      locationDefault:
        this.selectionContext?.place?.name ??
        this.explicitPlaceContext?.label ??
        this.worldContext?.label ??
        null,
      preferredEntityIds,
      predicates: this.data.predicates,
      cursorOffset: this.cursorOffset,
    });
    if (!this.activeContextKind) return suggestions;
    const filtered = suggestions.filter((suggestion) => suggestion.kind === this.activeContextKind);
    if (this.activeContextKind === "place" && !parsed.place && this.selectionContext?.place) {
      return Object.freeze([
        {
          kind: "place" as const,
          label: this.selectionContext.place.name,
          detail: "selected place",
          icon: "place",
          insertText: `at @${this.selectionContext.place.id}`,
        },
        ...filtered,
      ]);
    }
    return Object.freeze(filtered);
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

  private setComposerValue(value: string, cursorOffset = value.length): void {
    const previousPlace = this.parsed().place?.name ?? null;
    this.value = value;
    this.cursorOffset = Math.max(0, Math.min(value.length, cursorOffset));
    this.selectionSeeded = false;
    const nextPlace = this.parsed().place?.name ?? null;
    if (!nextPlace) {
      this.explicitPlaceContext = null;
    } else if (nextPlace !== previousPlace && this.worldContext) {
      this.explicitPlaceContext = this.worldContext;
    }
    this.externalError = "";
    this.activeSuggestion = 0;
    this.activeContextKind = null;
    this.requestUpdate();
  }

  private syncCursorFromInput(target: HTMLInputElement): void {
    const next = target.selectionStart ?? target.value.length;
    if (next === this.cursorOffset) return;
    this.cursorOffset = next;
    this.activeSuggestion = 0;
    this.requestUpdate();
  }

  private onInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.setComposerValue(target.value, target.selectionStart ?? target.value.length);
  }

  private onCaretMove(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.syncCursorFromInput(target);
  }

  private editSentenceSection(section: ComposerEditableSection): void {
    this.cursorOffset = section.start;
    this.activeSuggestion = 0;
    this.externalError = "";
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(section.start, section.end);
    });
  }

  private sectionIsActive(section: ComposerEditableSection): boolean {
    return this.cursorOffset >= section.start && this.cursorOffset <= section.end;
  }

  private activateContext(kind: "place" | "time" | "category" | "tag"): void {
    this.metadataOpen = false;
    const parsed = this.parsed();
    if (parsed.stage !== "complete") {
      if (kind === "place" && this.worldContext) {
        this.explicitPlaceContext = this.worldContext;
      }
      if (kind === "time" && this.timelineContext) {
        this.explicitTimelineContext = this.timelineContext;
      }
      this.activeContextKind = null;
      this.externalError = "";
      this.requestUpdate();
      return;
    }
    this.activeContextKind = kind;
    this.activeSuggestion = 0;
    this.cursorOffset = this.value.length;
    this.externalError = "";
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  private toggleMetadata(): void {
    this.activeContextKind = null;
    this.metadataOpen = !this.metadataOpen;
    this.externalError = "";
    this.requestUpdate();
  }

  private markMetadataDirty(): void {
    this.metadataDirty = true;
    this.externalError = "";
    this.requestUpdate();
  }

  private onContextChipKeyDown(event: KeyboardEvent): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const current = event.currentTarget;
    if (!(current instanceof HTMLButtonElement)) return;
    const chips = [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>(".context-row button.context-chip"),
    ];
    const index = chips.indexOf(current);
    if (index < 0) return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    chips[(index + delta + chips.length) % chips.length]?.focus({ preventScroll: true });
  }

  private metadataValue():
    | {
        role: string | null;
        initialState: "active" | "inactive";
        sourceIds: readonly string[];
        confidence: number | null;
        attributes: Readonly<Record<string, unknown>>;
      }
    | null {
    const confidenceText = this.metadataConfidence.trim();
    const confidence = confidenceText ? Number(confidenceText) : null;
    if (
      confidence !== null &&
      (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
    ) {
      this.externalError = "Confidence must be a number from 0 to 1.";
      this.requestUpdate();
      return null;
    }
    let attributes: unknown;
    try {
      attributes = JSON.parse(this.metadataAttributes.trim() || "{}");
    } catch {
      this.externalError = "Occurrence properties must be a valid JSON object.";
      this.requestUpdate();
      return null;
    }
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
      this.externalError = "Occurrence properties must be a JSON object.";
      this.requestUpdate();
      return null;
    }
    return Object.freeze({
      role: this.metadataRole.trim() || null,
      initialState: this.metadataInitialState,
      sourceIds: Object.freeze([
        ...new Set(
          this.metadataSourceIds
            .split(/\r?\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]),
      confidence,
      attributes: Object.freeze({ ...(attributes as Record<string, unknown>) }),
    });
  }

  private requestAdvancedEdit(): void {
    const relationshipId = this.selectionContext?.selectedOccurrenceId;
    if (!relationshipId) return;
    const initialText = this.selectionContext?.composition?.trim() ?? "";
    const dirty = this.metadataDirty || this.value.trim() !== initialText;
    if (dirty) {
      this.commit();
      if (this.externalError) return;
    }
    this.dispatchEvent(
      new CustomEvent("occurrencecomposeradvancededitrequest", {
        bubbles: true,
        composed: true,
        detail: { relationshipId },
      }),
    );
  }

  private applySuggestion(suggestion: ComposerSuggestion): void {
    if (!suggestion.insertText) {
      if (suggestion.kind === "place" && this.worldContext) {
        this.explicitPlaceContext = this.worldContext;
        this.activeContextKind = null;
        this.activeSuggestion = 0;
        this.requestUpdate();
      }
      return;
    }
    const parsed = this.parsed();
    const accepted = acceptComposerSuggestion(this.value, suggestion, parsed.stage);
    this.activeContextKind = null;
    this.setComposerValue(accepted.value, accepted.cursorOffset);
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(accepted.cursorOffset, accepted.cursorOffset);
    });
  }

  private commit(): void {
    const draft = this.parsed();
    if (draft.investigation.qualifiers.length) {
      this.externalError =
        "Resolve or persist the investigative clue before committing a canonical occurrence.";
      this.requestUpdate();
      return;
    }
    if (!draft.subject || !draft.predicate || !draft.object || draft.diagnostics.length) {
      this.externalError =
        draft.diagnostics[0] ?? "Complete subject, action, and object before committing.";
      this.requestUpdate();
      return;
    }
    const metadata = this.metadataValue();
    if (!metadata) return;
    const placeContext = this.explicitPlaceContext ?? this.worldContext;
    const timelineContext = this.explicitTimelineContext ?? this.timelineContext;
    this.dispatchEvent(
      new CustomEvent<OccurrenceCommitDetail>("occurrencecommit", {
        bubbles: true,
        composed: true,
        detail: {
          text: this.value.trim(),
          draft,
          editTarget:
            this.selectionContext?.selectedOccurrenceId && this.selectionContext.composition
              ? {
                  relationshipId: this.selectionContext.selectedOccurrenceId,
                  itemId: this.selectionContext.selectedItemId ?? null,
                  initialText: this.selectionContext.composition.trim(),
                }
              : null,
          metadata,
          defaults: {
            timeMs: timelineContext?.centerMs ?? null,
            timeValue: timelineContext?.value ?? null,
            timePrecision: timelineContext?.precision ?? null,
            longitude: placeContext?.longitude ?? null,
            latitude: placeContext?.latitude ?? null,
            worldZoom: placeContext?.zoom ?? null,
            accuracyMeters: placeContext?.accuracyMeters ?? null,
            placeReference:
              !draft.place && this.selectionContext?.place
                ? `@${this.selectionContext.place.id}`
                : null,
          },
        },
      }),
    );
  }

  private onKeyDown(event: KeyboardEvent): void {
    const suggestions = this.suggestions().slice(0, 7);
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
      this.activeSuggestion = (this.activeSuggestion - 1 + suggestions.length) % suggestions.length;
      this.requestUpdate();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.metaKey || event.ctrlKey) {
      this.commit();
      return;
    }
    const draft = this.parsed();
    const cursorSection = composerCursorSection(this.value, this.cursorOffset);
    const cursorLocal = cursorSection.kind !== "tail";
    if ((draft.stage !== "complete" || cursorLocal) && suggestions.length) {
      const suggestion = suggestions[this.activeSuggestion] ?? suggestions[0];
      if (suggestion) this.applySuggestion(suggestion);
      return;
    }
    this.commit();
  }

  private stageLabel(parsed: OccurrenceSentenceDraft): string {
    const cursor = composerCursorSection(this.value, this.cursorOffset);
    if (cursor.kind !== "tail") {
      if (cursor.kind === "predicate") return "action";
      if (cursor.kind === "place" || cursor.kind === "time" || cursor.kind === "options") {
        return cursor.kind;
      }
      return cursor.kind;
    }
    if (parsed.stage === "predicate") return "action";
    if (parsed.stage === "place" || parsed.stage === "time" || parsed.stage === "options") {
      return "context";
    }
    if (parsed.stage === "complete") return "ready";
    return parsed.stage;
  }
  override render() {
    if (!this.active) {
      return html`
        <button
          class="compact"
          type="button"
          aria-label="Open occurrence composer"
          title="Compose an occurrence"
          @click=${() => this.requestOpen()}
        >
          <span class="compact-prompt" aria-hidden="true">&gt;</span>
          <span class="compact-hint">Compose occurrence…</span>
        </button>
      `;
    }

    const parsed = this.parsed();
    const entityLabel = (reference: string | null | undefined): string | null => {
      if (!reference) return null;
      if (!reference.startsWith("@")) return reference;
      const id = reference.slice(1);
      return this.data.entities.find((entity) => entity.id === id)?.name ?? reference;
    };
    const resolvedPlaceLabel = (reference: string | null | undefined): string | null => {
      if (!reference) return null;
      if (!reference.startsWith("@")) return reference;
      const id = reference.slice(1);
      return this.data.places.find((place) => place.id === id)?.name ?? reference;
    };
    const timeLabel = parsed.time
      ? parsed.time.kind === "range"
        ? `${parsed.time.start} – ${parsed.time.end ?? parsed.time.start}`
        : parsed.time.start
      : (this.explicitTimelineContext?.label ?? this.timelineContext?.label ?? null);
    const placeLabel =
      resolvedPlaceLabel(parsed.place?.name) ??
      this.selectionContext?.place?.name ??
      this.explicitPlaceContext?.label ??
      this.worldContext?.label ??
      "World center";
    const suggestions = this.metadataOpen ? [] : this.suggestions().slice(0, 7);
    const selectedIndex = Math.min(
      this.activeSuggestion,
      Math.max(0, suggestions.length - 1),
    );
    const activeSuggestion = suggestions[selectedIndex];
    const ghostSuffix =
      this.cursorOffset === this.value.length
        ? composerCompletionSuffix(this.value, activeSuggestion)
        : "";
    const diagnostic = this.externalError || parsed.diagnostics[0] || "";
    const editableSections = composerEditableSections(this.value);
    const sectionFor = (
      kind: ComposerEditableSection["kind"],
      index = 0,
    ): ComposerEditableSection | undefined =>
      editableSections.filter((section) => section.kind === kind)[index];
    const subjectSection = sectionFor("subject");
    const predicateSection = sectionFor("predicate");
    const objectSection = sectionFor("object");
    const placeSection = sectionFor("place");
    const timeSection = sectionFor("time");
    const categorySection = sectionFor("category");
    const subjectLabel = entityLabel(parsed.subject?.name) ?? this.selectedSubjectLabel();
    const placePinned = Boolean(
      parsed.place || this.selectionContext?.place || this.explicitPlaceContext,
    );
    const timePinned = Boolean(parsed.time || this.explicitTimelineContext);
    const categoryLabel = parsed.options.category ?? null;
    const tagLabels = parsed.options.tags;
    const canCommit = Boolean(
      parsed.subject && parsed.predicate && parsed.object && parsed.diagnostics.length === 0,
    );
    const commitLabel = this.selectionContext?.selectedOccurrenceId
      ? "Save occurrence"
      : "Create occurrence";
    const metadataCount =
      Number(Boolean(this.metadataRole.trim())) +
      Number(Boolean(this.metadataSourceIds.trim())) +
      Number(Boolean(this.metadataConfidence.trim())) +
      Number(this.metadataInitialState === "inactive") +
      Number(this.metadataAttributes.trim() !== "{}" && this.metadataAttributes.trim() !== "");
    const editableChip = (
      label: string,
      value: string | null | undefined,
      section: ComposerEditableSection | undefined,
    ) =>
      value && section
        ? html`<button
            class="context-chip"
            type="button"
            data-context-kind=${section.kind}
            data-context-state=${this.sectionIsActive(section) ? "editing" : "pinned"}
            aria-label=${`Edit ${label}: ${value}`}
            title=${`Select the ${label.toLocaleLowerCase()} text for editing`}
            @click=${() => this.editSentenceSection(section)}
            @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
          >
            <span>${label}</span><strong>${value}</strong
            ><span class="context-state">${this.sectionIsActive(section) ? "editing" : "edit"}</span>
          </button>`
        : nothing;

    return html`
      <section class="composer" aria-label="Occurrence composer">
        <div class="input-row">
          <span class="stage" aria-hidden="true">${this.stageLabel(parsed)}</span>
          <div class="input-shell">
            <span class="ghost-completion" aria-hidden="true">
              <span class="ghost-base">${this.value}</span><span class="ghost-suffix">${ghostSuffix}</span>
            </span>
            <input
              type="text"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="both"
              aria-expanded=${String(suggestions.length > 0)}
              aria-controls=${suggestions.length ? "occurrence-composer-listbox" : nothing}
              aria-activedescendant=${
                suggestions.length ? `occurrence-composer-option-${selectedIndex}` : nothing
              }
              aria-describedby="occurrence-composer-help occurrence-composer-diagnostic"
              placeholder=${`Who did what to whom · at ${placeLabel} · on ${timeLabel ?? "timeline center"}`}
              .value=${this.value}
              @input=${(event: Event) => this.onInput(event)}
              @focus=${(event: Event) => this.onCaretMove(event)}
              @click=${(event: Event) => this.onCaretMove(event)}
              @keyup=${(event: Event) => this.onCaretMove(event)}
              @select=${(event: Event) => this.onCaretMove(event)}
              @keydown=${(event: KeyboardEvent) => this.onKeyDown(event)}
            />
          </div>
          <button
            class="commit"
            type="button"
            ?disabled=${!canCommit}
            aria-label=${commitLabel}
            title=${`${commitLabel} · Ctrl/Cmd+Enter`}
            @click=${() => this.commit()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              ${iconPathData("check").map((path) => html`<path d=${path}></path>`)}
            </svg>
          </button>
          <button
            class="close"
            type="button"
            aria-label="Close occurrence composer"
            title="Close occurrence composer"
            @click=${() => this.requestClose()}
          >×</button>
        </div>

        <div class="completion-panel">
          <div class="context-row" aria-label="Occurrence context">
            ${this.hasPendingSelectionContext
              ? html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="pending-selection"
                  data-context-state="pending"
                  title="Replace this draft with the newly selected graph context"
                  @click=${() => this.acceptPendingSelectionContext()}
                  @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
                >
                  <span>Selection changed</span><strong>${this.pendingSelectionContext ? "Use selected context" : "Use no selection"}</strong>
                </button>`
              : nothing
            }
            ${editableChip("Subject", subjectLabel, subjectSection)}
            ${editableChip("Action", parsed.predicate, predicateSection)}
            ${editableChip("Object", entityLabel(parsed.object?.name), objectSection)}
            ${placeSection
              ? editableChip("Place", parsed.place?.name ?? placeLabel, placeSection)
              : html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="place"
                  data-context-state=${this.activeContextKind === "place" ? "editing" : placePinned ? "pinned" : "live"}
                  aria-label=${`Choose place: ${placeLabel}`}
                  title="Choose or pin the occurrence place"
                  @click=${() => this.activateContext("place")}
                  @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
                >
                  <span>Place</span><strong>${placeLabel}</strong
                  ><span class="context-state">${this.activeContextKind === "place" ? "editing" : placePinned ? "pinned" : "live"}</span>
                </button>`}
            ${timeSection
              ? editableChip("Time", timeLabel ?? "timeline center", timeSection)
              : html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="time"
                  data-context-state=${this.activeContextKind === "time" ? "editing" : timePinned ? "pinned" : "live"}
                  aria-label=${`Choose time: ${timeLabel ?? "timeline center"}`}
                  title="Choose or pin the occurrence time"
                  @click=${() => this.activateContext("time")}
                  @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
                >
                  <span>Time</span><strong>${timeLabel ?? "timeline center"}</strong
                  ><span class="context-state">${this.activeContextKind === "time" ? "editing" : timePinned ? "pinned" : "live"}</span>
                </button>`}
            ${categorySection
              ? editableChip("Category", categoryLabel, categorySection)
              : parsed.stage === "complete"
                ? html`<button
                    class="context-chip"
                    type="button"
                    data-context-kind="category"
                    data-context-state=${this.activeContextKind === "category" ? "editing" : "live"}
                    aria-label="Add occurrence category"
                    title="Choose an occurrence category"
                    @click=${() => this.activateContext("category")}
                    @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
                  >
                    <span>Category</span><strong>Add</strong
                    ><span class="context-state">${this.activeContextKind === "category" ? "editing" : "add"}</span>
                  </button>`
                : nothing}
            ${tagLabels.map((tag, index) =>
              editableChip("Tag", tag, sectionFor("tag", index)),
            )}
            ${parsed.stage === "complete"
              ? html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="add-tag"
                  data-context-state=${this.activeContextKind === "tag" ? "editing" : "live"}
                  aria-label="Add occurrence tag"
                  title="Add another occurrence tag"
                  @click=${() => this.activateContext("tag")}
                  @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
                >
                  <span>Tag</span><strong>Add</strong
                  ><span class="context-state">${this.activeContextKind === "tag" ? "editing" : "add"}</span>
                </button>`
              : nothing}
            <button
              class="context-chip"
              type="button"
              data-context-kind="details"
              data-context-state=${this.metadataOpen ? "editing" : metadataCount ? "pinned" : "live"}
              aria-expanded=${String(this.metadataOpen)}
              aria-controls="occurrence-composer-metadata"
              title="Edit role, state, provenance, confidence, and properties"
              @click=${() => this.toggleMetadata()}
              @keydown=${(event: KeyboardEvent) => this.onContextChipKeyDown(event)}
            >
              <span>Details</span><strong>${metadataCount ? `${metadataCount} set` : "More"}</strong
              ><span class="context-state">${this.metadataOpen ? "editing" : "edit"}</span>
            </button>
          </div>
          ${
            this.metadataOpen
              ? html`<div id="occurrence-composer-metadata" class="metadata-panel" aria-label="Occurrence details">
                  <label class="metadata-field">
                    <span>Role</span>
                    <input
                      type="text"
                      maxlength="120"
                      autocomplete="off"
                      placeholder="recipient, witness, owner…"
                      .value=${this.metadataRole}
                      @input=${(event: Event) => {
                        const target = event.currentTarget;
                        if (!(target instanceof HTMLInputElement)) return;
                        this.metadataRole = target.value;
                        this.markMetadataDirty();
                      }}
                    />
                  </label>
                  <label class="metadata-field">
                    <span>Initial state</span>
                    <select
                      .value=${this.metadataInitialState}
                      @change=${(event: Event) => {
                        const target = event.currentTarget;
                        if (!(target instanceof HTMLSelectElement)) return;
                        this.metadataInitialState = target.value === "inactive" ? "inactive" : "active";
                        this.markMetadataDirty();
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive until activated</option>
                    </select>
                  </label>
                  <label class="metadata-field">
                    <span>Confidence · 0–1</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      inputmode="decimal"
                      placeholder="0.85"
                      .value=${this.metadataConfidence}
                      @input=${(event: Event) => {
                        const target = event.currentTarget;
                        if (!(target instanceof HTMLInputElement)) return;
                        this.metadataConfidence = target.value;
                        this.markMetadataDirty();
                      }}
                    />
                  </label>
                  <label class="metadata-field metadata-field-wide">
                    <span>Evidence / source IDs · one per line</span>
                    <textarea
                      rows="2"
                      spellcheck="false"
                      placeholder="evidence-17&#10;source-record-3"
                      .value=${this.metadataSourceIds}
                      @input=${(event: Event) => {
                        const target = event.currentTarget;
                        if (!(target instanceof HTMLTextAreaElement)) return;
                        this.metadataSourceIds = target.value;
                        this.markMetadataDirty();
                      }}
                    ></textarea>
                  </label>
                  <label class="metadata-field metadata-field-wide">
                    <span>Properties · JSON object</span>
                    <textarea
                      rows="3"
                      spellcheck="false"
                      .value=${this.metadataAttributes}
                      @input=${(event: Event) => {
                        const target = event.currentTarget;
                        if (!(target instanceof HTMLTextAreaElement)) return;
                        this.metadataAttributes = target.value;
                        this.markMetadataDirty();
                      }}
                    ></textarea>
                  </label>
                  ${this.selectionContext?.selectedOccurrenceId
                    ? html`<div class="metadata-actions">
                        <button type="button" @click=${() => this.requestAdvancedEdit()}>
                          ${this.metadataDirty || this.value.trim() !== (this.selectionContext?.composition?.trim() ?? "")
                            ? "Save and open full edge editor"
                            : "Open full edge editor"}
                        </button>
                      </div>`
                    : nothing}
                </div>`
              : nothing
          }
          ${
            diagnostic
              ? html`<p id="occurrence-composer-diagnostic" class="diagnostic" role="alert">${diagnostic}</p>`
              : html`<span id="occurrence-composer-diagnostic" hidden></span>`
          }
          ${
            suggestions.length
              ? html`
                <div id="occurrence-composer-listbox" class="listbox" role="listbox">
                  ${suggestions.map(
                    (suggestion, index) => html`
                      <button
                        id=${`occurrence-composer-option-${index}`}
                        class="option"
                        type="button"
                        role="option"
                        aria-selected=${String(index === selectedIndex)}
                        @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                        @click=${() => this.applySuggestion(suggestion)}
                      >
                        <span class="option-main">
                          ${
                            suggestion.icon
                              ? html`<span class="option-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                  ${iconPathData(suggestion.icon).map(
                                    (path) => html`<path d=${path}></path>`,
                                  )}
                                </svg>
                              </span>`
                              : nothing
                          }
                          <span class="option-label">${suggestion.label}</span>
                        </span>
                        <span class="option-detail">${suggestion.detail ?? suggestion.kind}</span>
                      </button>
                    `,
                  )}
                </div>
              `
              : nothing
          }
        </div>

        <p id="occurrence-composer-help" class="help">
          Arrow keys navigate suggestions · Enter accepts the active suggestion or commits ·
          Ctrl/Cmd+Enter or the check button always commits · Tab moves focus · Left/Right move
          between semantic chips · Esc closes. Activate a semantic chip to edit exactly that
          component, then type or choose a suggestion. Quote multi-word entity names.
          Defaults follow ${placeLabel} and ${timeLabel ?? "the timeline center"} until explicitly pinned.
          Move the timeline or World while this is open to change unpinned defaults.
          A changed graph selection never replaces a modified draft until its context action is chosen.
        </p>
      </section>
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-occurrence-composer")) {
  customElements.define("luum-occurrence-composer", LuumOccurrenceComposerElement);
}
