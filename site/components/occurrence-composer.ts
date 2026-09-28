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

export interface OccurrenceComposerMetadata {
  readonly role: string | null;
  readonly initialState: "active" | "inactive";
  readonly sourceIds: readonly string[];
  readonly confidence: number | null;
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
  readonly metadata?: Partial<OccurrenceComposerMetadata> | null;
}

export interface OccurrenceCommitDetail {
  readonly text: string;
  readonly draft: OccurrenceSentenceDraft;
  readonly editTarget: {
    readonly relationshipId: string;
    readonly itemId: string | null;
    readonly initialText: string;
  } | null;
  readonly metadata: OccurrenceComposerMetadata;
  readonly metadataDirty: boolean;
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
      inline-size: 44px;
      block-size: 44px;
      border: 1px solid transparent;
      border-radius: var(--toolbar-control-radius, 0.58rem);
      background: transparent;
      color: var(--muted, #615d56);
      cursor: pointer;
      font-size: 1.15rem;
      touch-action: manipulation;
    }

    .commit {
      border: 1px solid color-mix(in srgb, var(--line-strong, #b8b1a5) 78%, transparent);
      background: color-mix(in srgb, var(--ink, #191714) 8%, var(--paper, #fff));
      color: var(--ink, #191714);
      font-size: 1rem;
      font-weight: 800;
    }

    .commit:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }

    .commit:not(:disabled):is(:hover, :focus-visible),
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

    .diagnostic {
      margin: 0;
      padding: 0.5rem 0.65rem;
      border-block-end: 1px solid var(--line, #d1ccc4);
      color: var(--danger, #b42318);
      font-size: 0.72rem;
    }

    .metadata-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      min-block-size: 0;
      padding: 0.5rem;
      overflow: auto;
      overscroll-behavior: contain;
    }

    .metadata-field {
      display: grid;
      gap: 0.2rem;
      min-inline-size: 0;
      color: var(--muted, #615d56);
      font-size: 0.66rem;
      font-weight: 700;
    }

    .metadata-field-wide {
      grid-column: 1 / -1;
    }

    .metadata-field :is(input, select) {
      min-block-size: 40px;
      padding: 0.42rem 0.5rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.5rem;
      background: color-mix(in srgb, var(--paper, #fff) 94%, transparent);
      color: var(--ink, #191714);
      font: 500 0.78rem/1.25 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    @media (max-width: 480px) {
      .metadata-panel {
        grid-template-columns: minmax(0, 1fr);
      }

      .metadata-field-wide {
        grid-column: 1;
      }
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
  private worldContext: ComposerWorldContext | null = null;
  private activeSuggestion = 0;
  private cursorOffset = 0;
  private externalError = "";
  private explicitPlaceContext: ComposerWorldContext | null = null;
  private explicitTimeContext: ComposerTimelineContext | null = null;
  private selectionContext: OccurrenceComposerSelectionContext | null = null;
  private pendingSelectionContext: OccurrenceComposerSelectionContext | null = null;
  private hasPendingSelectionContext = false;
  private selectionSeeded = false;
  private sessionKey = "";
  private metadataPanelOpen = false;
  private metadataDirty = false;
  private metadataRole = "";
  private metadataInitialState: "active" | "inactive" = "active";
  private metadataSourceIds = "";
  private metadataConfidence = "";
  private useSelectionPlaceContext = true;
  private contextDirty = false;

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
                  role: context.metadata.role ?? null,
                  initialState: context.metadata.initialState ?? "active",
                  sourceIds: Object.freeze([...(context.metadata.sourceIds ?? [])]),
                  confidence: context.metadata.confidence ?? null,
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
      (Boolean(this.value.trim()) && !this.selectionSeeded) ||
      this.metadataDirty ||
      this.contextDirty;

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
    }
    this.applySelectionSeed();
    if (!this.metadataDirty) this.applySelectionMetadata();
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
    this.applySelectionMetadata();
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

  private resetDraft(): void {
    this.value = "";
    this.cursorOffset = 0;
    this.selectionSeeded = false;
    this.explicitPlaceContext = null;
    this.explicitTimeContext = null;
    this.externalError = "";
    this.activeSuggestion = 0;
    this.metadataPanelOpen = false;
    this.metadataDirty = false;
    this.metadataRole = "";
    this.metadataInitialState = "active";
    this.metadataSourceIds = "";
    this.metadataConfidence = "";
    this.useSelectionPlaceContext = true;
    this.contextDirty = false;
  }

  private refreshContextDirty(): void {
    this.contextDirty = Boolean(
      this.explicitPlaceContext || this.explicitTimeContext || !this.useSelectionPlaceContext,
    );
  }

  private selectionMetadataSnapshot(): OccurrenceComposerMetadata {
    const metadata = this.selectionContext?.metadata;
    return Object.freeze({
      role: metadata?.role?.trim() || null,
      initialState: metadata?.initialState ?? "active",
      sourceIds: Object.freeze(
        [...new Set((metadata?.sourceIds ?? []).map((sourceId) => sourceId.trim()).filter(Boolean))],
      ),
      confidence: metadata?.confidence ?? null,
    });
  }

  private metadataIdentity(metadata: OccurrenceComposerMetadata): string {
    return JSON.stringify([
      metadata.role ?? "",
      metadata.initialState,
      [...metadata.sourceIds],
      metadata.confidence,
    ]);
  }

  private applySelectionMetadata(): void {
    const metadata = this.selectionMetadataSnapshot();
    this.metadataRole = metadata.role ?? "";
    this.metadataInitialState = metadata.initialState;
    this.metadataSourceIds = metadata.sourceIds.join("\n");
    this.metadataConfidence = metadata.confidence === null ? "" : String(metadata.confidence);
    this.metadataDirty = false;
  }

  private metadataSnapshot(): OccurrenceComposerMetadata {
    const confidenceText = this.metadataConfidence.trim();
    const confidence = confidenceText ? Number(confidenceText) : null;
    return Object.freeze({
      role: this.metadataRole.trim() || null,
      initialState: this.metadataInitialState,
      sourceIds: Object.freeze(
        [...new Set(
          this.metadataSourceIds
            .split(/[\n,]+/)
            .map((sourceId) => sourceId.trim())
            .filter(Boolean),
        )],
      ),
      confidence:
        confidence !== null && Number.isFinite(confidence) ? confidence : null,
    });
  }

  private setMetadataValue(
    field: "role" | "initialState" | "sourceIds" | "confidence",
    value: string,
  ): void {
    if (field === "role") this.metadataRole = value;
    else if (field === "initialState") {
      this.metadataInitialState = value === "inactive" ? "inactive" : "active";
    } else if (field === "sourceIds") this.metadataSourceIds = value;
    else this.metadataConfidence = value;
    this.metadataDirty =
      this.metadataIdentity(this.metadataSnapshot()) !==
      this.metadataIdentity(this.selectionMetadataSnapshot());
    this.externalError = "";
    this.requestUpdate();
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
      (this.value.trim() || this.metadataDirty || this.contextDirty)
    ) {
      this.resetDraft();
    }
    this.sessionKey = nextKey;
    this.applySelectionSeed();
    if (!this.metadataDirty) this.applySelectionMetadata();
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
    this.applySelectionMetadata();
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
    return occurrenceComposerSuggestions(this.value, {
      entities: this.data.entities,
      places: this.data.places,
      categories: this.data.categories,
      tags: this.data.tags,
      timelineDefault: this.timelineContext?.value ?? null,
      locationDefault:
        (this.useSelectionPlaceContext ? this.selectionContext?.place?.name : null) ??
        this.explicitPlaceContext?.label ??
        this.worldContext?.label ??
        null,
      preferredEntityIds,
      predicates: this.data.predicates,
      cursorOffset: this.cursorOffset,
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

  private setComposerValue(value: string, cursorOffset = value.length): void {
    const previousDraft = this.parsed();
    const previousPlace = previousDraft.place?.name ?? null;
    const previousTime = previousDraft.time;
    this.value = value;
    this.cursorOffset = Math.max(0, Math.min(value.length, cursorOffset));
    this.selectionSeeded = false;
    const nextDraft = this.parsed();
    const nextPlace = nextDraft.place?.name ?? null;
    if (!nextPlace && previousPlace) {
      this.explicitPlaceContext = null;
    } else if (
      nextPlace &&
      nextPlace !== previousPlace &&
      !this.explicitPlaceContext &&
      this.worldContext
    ) {
      this.explicitPlaceContext = this.worldContext;
    }
    if (nextDraft.time && !previousTime) {
      this.explicitTimeContext = null;
    }
    this.refreshContextDirty();
    this.externalError = "";
    this.activeSuggestion = 0;
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
    this.metadataPanelOpen = false;
    this.setComposerValue(target.value, target.selectionStart ?? target.value.length);
  }

  private onCaretMove(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.syncCursorFromInput(target);
  }

  private editSentenceSection(section: ComposerEditableSection): void {
    this.metadataPanelOpen = false;
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

  private focusComposerInput(cursorOffset = this.cursorOffset): void {
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(cursorOffset, cursorOffset);
    });
  }

  private activateLivePlaceContext(): void {
    if (this.selectionContext?.place) {
      this.useSelectionPlaceContext = !this.useSelectionPlaceContext;
      this.refreshContextDirty();
      this.externalError = "";
      this.requestUpdate();
      return;
    }
    if (!this.worldContext) return;
    this.explicitPlaceContext = this.explicitPlaceContext ? null : this.worldContext;
    this.refreshContextDirty();
    this.externalError = "";
    this.requestUpdate();
  }

  private activateLiveTimeContext(): void {
    if (this.explicitTimeContext) {
      this.explicitTimeContext = null;
      this.refreshContextDirty();
      this.externalError = "";
      this.requestUpdate();
      return;
    }
    const context = this.timelineContext;
    if (!context?.value) return;
    const parsed = this.parsed();
    if (parsed.stage === "complete") {
      const separator = this.value.trimEnd() ? " " : "";
      const next = `${this.value.trimEnd()}${separator}on ${context.value} `;
      this.setComposerValue(next, next.length);
      this.focusComposerInput(next.length);
      return;
    }
    this.explicitTimeContext = context;
    this.refreshContextDirty();
    this.externalError = "";
    this.requestUpdate();
  }

  private onMetadataKeyDown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.commit();
      return;
    }
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.metadataPanelOpen = false;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<HTMLButtonElement>('button.context-chip[data-context-kind="metadata"]')
        ?.focus({ preventScroll: true });
    });
  }

  private onContextRowKeyDown(event: KeyboardEvent): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("context-chip")) {
      return;
    }
    const row = target.closest(".context-row");
    if (!(row instanceof HTMLElement)) return;
    const chips = [...row.querySelectorAll<HTMLButtonElement>("button.context-chip")].filter(
      (chip) => !chip.disabled,
    );
    if (!chips.length) return;
    const current = chips.indexOf(target);
    if (current < 0) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? chips.length - 1
          : event.key === "ArrowLeft"
            ? (current - 1 + chips.length) % chips.length
            : (current + 1) % chips.length;
    chips[nextIndex]?.focus({ preventScroll: true });
  }

  private applySuggestion(suggestion: ComposerSuggestion): void {
    if (!suggestion.insertText) return;
    const parsed = this.parsed();
    const accepted = acceptComposerSuggestion(this.value, suggestion, parsed.stage);
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
    if (!draft.subject || !draft.predicate || !draft.object || draft.diagnostics.length) {
      this.externalError =
        draft.diagnostics[0] ?? "Complete subject, action, and object before committing.";
      this.requestUpdate();
      return;
    }
    const metadata = this.metadataSnapshot();
    if (
      metadata.confidence !== null &&
      (metadata.confidence < 0 || metadata.confidence > 1)
    ) {
      this.externalError = "Confidence must be between 0 and 1.";
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
          editTarget:
            this.selectionContext?.selectedOccurrenceId && this.selectionContext.composition
              ? {
                  relationshipId: this.selectionContext.selectedOccurrenceId,
                  itemId: this.selectionContext.selectedItemId ?? null,
                  initialText: this.selectionContext.composition.trim(),
                }
              : null,
          metadata,
          metadataDirty: this.metadataDirty,
          defaults: {
            timeMs: this.explicitTimeContext?.centerMs ?? this.timelineContext?.centerMs ?? null,
            timeValue: this.explicitTimeContext?.value ?? this.timelineContext?.value ?? null,
            timePrecision:
              this.explicitTimeContext?.precision ?? this.timelineContext?.precision ?? null,
            longitude:
              this.explicitPlaceContext?.longitude ?? this.worldContext?.longitude ?? null,
            latitude:
              this.explicitPlaceContext?.latitude ?? this.worldContext?.latitude ?? null,
            worldZoom:
              this.explicitPlaceContext?.zoom ?? this.worldContext?.zoom ?? null,
            accuracyMeters:
              this.explicitPlaceContext?.accuracyMeters ?? this.worldContext?.accuracyMeters ?? null,
            placeReference:
              !draft.place && this.useSelectionPlaceContext && this.selectionContext?.place
                ? `@${this.selectionContext.place.id}`
                : null,
          },
        },
      }),
    );
  }

  private onKeyDown(event: KeyboardEvent): void {
    const suggestions = this.metadataPanelOpen ? [] : this.suggestions().slice(0, 7);
    if (event.isComposing) return;
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.commit();
      return;
    }
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
      : (this.explicitTimeContext?.label ?? this.timelineContext?.label ?? null);
    const placeLabel =
      resolvedPlaceLabel(parsed.place?.name) ??
      (this.useSelectionPlaceContext ? this.selectionContext?.place?.name : null) ??
      this.explicitPlaceContext?.label ??
      this.worldContext?.label ??
      "World center";
    const suggestions = this.suggestions().slice(0, 7);
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
      parsed.place ||
        (this.useSelectionPlaceContext && this.selectionContext?.place) ||
        this.explicitPlaceContext,
    );
    const timePinned = Boolean(parsed.time || this.explicitTimeContext);
    const categoryLabel = parsed.options.category ?? null;
    const tagLabels = parsed.options.tags;
    const metadata = this.metadataSnapshot();
    const metadataCount =
      Number(Boolean(metadata.role)) +
      Number(metadata.initialState !== "active") +
      metadata.sourceIds.length +
      Number(metadata.confidence !== null);
    const canCommit = Boolean(
      parsed.subject && parsed.predicate && parsed.object && parsed.diagnostics.length === 0,
    );
    const listboxVisible = !this.metadataPanelOpen && suggestions.length > 0;
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
              aria-expanded=${String(listboxVisible)}
              aria-controls=${listboxVisible ? "occurrence-composer-listbox" : nothing}
              aria-activedescendant=${
                listboxVisible ? `occurrence-composer-option-${selectedIndex}` : nothing
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
            aria-label=${this.selectionContext?.selectedOccurrenceId ? "Save occurrence" : "Create occurrence"}
            title=${this.selectionContext?.selectedOccurrenceId
              ? "Save occurrence (Ctrl/Cmd+Enter)"
              : "Create occurrence (Ctrl/Cmd+Enter)"}
            @click=${() => this.commit()}
          ><span aria-hidden="true">✓</span></button>
          <button
            class="close"
            type="button"
            aria-label="Close occurrence composer"
            title="Close occurrence composer"
            @click=${() => this.requestClose()}
          >×</button>
        </div>

        <div class="completion-panel">
          <div
            class="context-row"
            aria-label="Occurrence context"
            @keydown=${(event: KeyboardEvent) => this.onContextRowKeyDown(event)}
          >
            ${this.hasPendingSelectionContext
              ? html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="pending-selection"
                  data-context-state="pending"
                  title="Replace this draft with the newly selected graph context"
                  @click=${() => this.acceptPendingSelectionContext()}
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
                  data-context-state=${placePinned ? "pinned" : "live"}
                  aria-label=${this.selectionContext?.place
                    ? this.useSelectionPlaceContext
                      ? `Stop using selected place context: ${this.selectionContext.place.name}`
                      : `Use selected place context: ${this.selectionContext.place.name}`
                    : this.explicitPlaceContext
                      ? `Unpin place context: ${placeLabel}`
                      : `Pin current World place context: ${placeLabel}`}
                  aria-pressed=${this.selectionContext?.place
                    ? String(this.useSelectionPlaceContext)
                    : String(Boolean(this.explicitPlaceContext))}
                  title=${this.selectionContext?.place
                    ? this.useSelectionPlaceContext
                      ? "Use the live World center instead of the selected place"
                      : "Use the selected canonical place as the occurrence context"
                    : this.explicitPlaceContext
                      ? "Return place context to the live World center"
                      : "Pin the current World center for this occurrence"}
                  @click=${() => this.activateLivePlaceContext()}
                >
                  <span>Place</span><strong>${this.selectionContext?.place?.name ?? placeLabel}</strong
                  ><span class="context-state">${this.selectionContext?.place
                    ? this.useSelectionPlaceContext
                      ? "context"
                      : "off"
                    : this.explicitPlaceContext
                      ? "pinned"
                      : placePinned
                        ? "context"
                        : "live"}</span>
                </button>`}
            ${timeSection
              ? editableChip("Time", timeLabel ?? "timeline center", timeSection)
              : html`<button
                  class="context-chip"
                  type="button"
                  data-context-kind="time"
                  data-context-state=${timePinned ? "pinned" : "live"}
                  aria-label=${this.explicitTimeContext
                    ? `Unpin timeline time: ${timeLabel ?? "timeline center"}`
                    : `Pin timeline time: ${timeLabel ?? "timeline center"}`}
                  title=${this.explicitTimeContext
                    ? "Return time context to the live timeline center"
                    : "Pin the current timeline center; complete facts become an explicit on-clause"}
                  ?disabled=${!this.timelineContext?.value && !this.explicitTimeContext}
                  @click=${() => this.activateLiveTimeContext()}
                >
                  <span>Time</span><strong>${timeLabel ?? "timeline center"}</strong
                  ><span class="context-state">${this.explicitTimeContext ? "pinned" : timePinned ? "context" : "live"}</span>
                </button>`}
            ${editableChip("Category", categoryLabel, categorySection)}
            ${tagLabels.map((tag, index) =>
              editableChip("Tag", tag, sectionFor("tag", index)),
            )}
            <button
              class="context-chip"
              type="button"
              data-context-kind="metadata"
              data-context-state=${this.metadataPanelOpen ? "editing" : metadataCount ? "pinned" : "live"}
              aria-expanded=${String(this.metadataPanelOpen)}
              aria-controls="occurrence-composer-metadata"
              @click=${() => {
                this.metadataPanelOpen = !this.metadataPanelOpen;
                this.requestUpdate();
              }}
            >
              <span>Details</span><strong>${metadataCount ? `${metadataCount} set` : "Role · support"}</strong
              ><span class="context-state">${this.metadataPanelOpen ? "editing" : "edit"}</span>
            </button>
          </div>
          ${
            diagnostic
              ? html`<p id="occurrence-composer-diagnostic" class="diagnostic" role="alert">${diagnostic}</p>`
              : html`<span id="occurrence-composer-diagnostic" hidden></span>`
          }
          ${
            this.metadataPanelOpen
              ? html`
                <div
                  id="occurrence-composer-metadata"
                  class="metadata-panel"
                  aria-label="Occurrence details"
                  @keydown=${(event: KeyboardEvent) => this.onMetadataKeyDown(event)}
                >
                  <label class="metadata-field">
                    <span>Role</span>
                    <input
                      type="text"
                      maxlength="120"
                      autocomplete="off"
                      placeholder="recipient, witness…"
                      .value=${this.metadataRole}
                      @input=${(event: Event) =>
                        this.setMetadataValue("role", (event.currentTarget as HTMLInputElement).value)}
                    />
                  </label>
                  <label class="metadata-field">
                    <span>Initial state</span>
                    <select
                      .value=${this.metadataInitialState}
                      @change=${(event: Event) =>
                        this.setMetadataValue("initialState", (event.currentTarget as HTMLSelectElement).value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
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
                      @input=${(event: Event) =>
                        this.setMetadataValue("confidence", (event.currentTarget as HTMLInputElement).value)}
                    />
                  </label>
                  <label class="metadata-field metadata-field-wide">
                    <span>Evidence / provenance IDs · comma or line separated</span>
                    <input
                      type="text"
                      autocomplete="off"
                      placeholder="evidence-17, source-record-3"
                      .value=${this.metadataSourceIds}
                      @input=${(event: Event) =>
                        this.setMetadataValue("sourceIds", (event.currentTarget as HTMLInputElement).value)}
                    />
                  </label>
                </div>
              `
              : listboxVisible
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
          Ctrl/Cmd+Enter always saves · the check button saves by touch or pointer · Esc closes.
          Left/Right/Home/End move across semantic chips. Activate a chip to edit or pin its
          context, then type or choose a suggestion. Quote multi-word entity names.
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
