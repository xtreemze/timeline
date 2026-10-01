import { LitElement, css, html, nothing, svg } from "lit";
import {
  interpretInvestigativeQualifier,
  projectInvestigativeCandidateMatrix,
} from "../../src/application/investigative-query.ts";
import { iconPathData } from "../event-presentation.ts";
import { semanticColorCss } from "../../src/presentation/semantic-color.ts";
import { LuumOccurrenceDeckElement } from "./occurrence-media-deck.ts";
import { occurrenceContextDeckFrames } from "../occurrence-context-deck.ts";
import {
  WORLD_DARK_PALETTE,
  WORLD_LIGHT_PALETTE,
  type WorldGraphPalette,
} from "../../src/layout/world-graph-style.ts";
import {
  composerWorldNodeMarker,
  projectComposerPreview,
  projectInvestigativeQualifiers,
} from "../occurrence-composer-preview.ts";
import {
  timelineContextFromViewport,
  worldContextFromCamera,
  type ComposerTimelineContext,
  type ComposerWorldContext,
} from "../occurrence-composer-context.ts";
import {
  acceptComposerSuggestion,
  advanceComposerMultiOption,
  composerEditableSections,
  composerCompletionSuffix,
  composerCursorSection,
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
  normalizeComposerSemanticColor,
  toggleComposerMultiOption,
  type ComposerCategoryOption,
  type ComposerEntityOption,
  type ComposerPlaceOption,
  type ComposerPredicateOption,
  type ComposerSuggestion,
  type ComposerTagOption,
  type OccurrenceSentenceDraft,
} from "../occurrence-composer-model.ts";

export interface ComposerIdentityEvidenceAssessment {
  readonly unknownEntityId: string;
  readonly candidateEntityId: string;
  readonly assessment: "consistent" | "contradicts";
  readonly reason: string;
  readonly recordIds: readonly string[];
}

export interface OccurrenceComposerData {
  readonly entities: readonly ComposerEntityOption[];
  readonly places: readonly ComposerPlaceOption[];
  readonly categories: readonly ComposerCategoryOption[];
  readonly tags?: readonly (string | ComposerTagOption)[];
  readonly predicates?: readonly (string | ComposerPredicateOption)[];
  readonly identityEvidence?: readonly ComposerIdentityEvidenceAssessment[];
}

export interface OccurrenceComposerSelectionContext {
  readonly selectedEntityId?: string | null;
  readonly selectedOccurrenceId?: string | null;
  readonly selectedItemId?: string | null;
  readonly composition?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly media?: readonly {
    readonly kind?: "image" | "video" | "audio";
    readonly src?: string;
    readonly blob?: Blob;
    readonly mimeType?: string;
    readonly sha256?: string;
    readonly alt?: string;
    readonly caption?: string;
  }[] | null;
  readonly metadata?: {
    readonly role?: string | null;
    readonly initialState?: "active" | "inactive";
    readonly sourceIds?: readonly string[];
    readonly confidence?: number | null;
    readonly attributes?: Readonly<Record<string, unknown>>;
  } | null;
  readonly appearance?: {
    readonly color?: string | null;
    readonly icon?: string | null;
  } | null;
  readonly relationship?: {
    readonly subjectId: string;
    readonly objectId: string;
  } | null;
  readonly place?: {
    readonly id: string;
    readonly name: string;
  } | null;
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
      --composer-semantic-accent: var(--ink, #191714);
    }

    .composer[data-semantic-color="true"] .input-shell {
      border-color: color-mix(
        in srgb,
        var(--composer-semantic-accent) 34%,
        var(--line, #d1ccc4)
      );
    }

    .composer[data-semantic-color="true"] .completion-panel {
      border-color: color-mix(
        in srgb,
        var(--composer-semantic-accent) 48%,
        var(--line-strong, #b8b1a5)
      );
    }

    .input-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 0.35rem;
      align-items: center;
      min-inline-size: 0;
    }

    .composer-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.26rem;
      min-block-size: 24px;
      max-inline-size: 100%;
      box-sizing: border-box;
      padding: 0.18rem 0.46rem;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 82%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--paper, #fff) 78%, transparent);
      color: var(--muted, #615d56);
      font-size: 0.66rem;
      font-weight: 720;
      line-height: 1.15;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .composer-chip[data-chip-tone="strong"],
    .composer-chip[data-chip-tone="active"] {
      border-color: color-mix(in srgb, var(--focus, #315fbd) 44%, var(--line, #d1ccc4));
      background: color-mix(in srgb, var(--focus, #315fbd) 8%, var(--paper, #fff));
      color: var(--ink, #191714);
    }

    .composer-chip[data-chip-tone="investigative"] {
      border-color: color-mix(in srgb, var(--accent, #b7472a) 58%, var(--line, #d1ccc4));
      background: color-mix(in srgb, var(--accent, #b7472a) 9%, var(--paper, #fff));
      color: var(--ink, #191714);
    }

    .composer-chip[data-chip-variant="ghost"] {
      border-style: dashed;
      background: color-mix(in srgb, var(--paper, #fff) 50%, transparent);
      color: var(--muted, #615d56);
      font-weight: 620;
    }

    .composer-chip-button {
      appearance: none;
      min-block-size: 44px;
      padding-inline: 0.58rem;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      font: inherit;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      touch-action: manipulation;
    }

    .composer-chip-button:is(:hover, :focus-visible) {
      border-color: var(--focus, #315fbd);
      outline: 2px solid color-mix(in srgb, var(--focus, #315fbd) 42%, transparent);
      outline-offset: -2px;
    }

    .composer-chip-button:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }

    .stage {
      justify-content: center;
      min-inline-size: max-content;
      min-block-size: 32px;
      text-transform: none;
    }

    .input-shell {
      position: relative;
      block-size: 44px;
      min-inline-size: 0;
      box-sizing: border-box;
      overflow: hidden;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: var(--toolbar-control-radius, 0.58rem);
      background: color-mix(in srgb, var(--paper, #fff) 92%, transparent);
      anchor-name: --occurrence-composer-input;
    }

    .input-decoration {
      position: absolute;
      z-index: 0;
      inset: 0;
      box-sizing: border-box;
      padding: 0.55rem 0.7rem;
      overflow: hidden;
      pointer-events: none;
      color: transparent;
      font: 500 0.88rem/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace;
      white-space: pre;
    }

    .input-decoration-content {
      display: inline-block;
      min-inline-size: max-content;
      transform: translateX(0);
      transform-origin: left center;
      will-change: transform;
    }

    .input-decoration-text {
      color: transparent;
    }

    .input-token {
      position: relative;
      display: inline-block;
      border-radius: 0.34rem;
      background: color-mix(in srgb, var(--ink, #191714) 12%, var(--paper, #fff));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--ink, #191714) 34%, transparent),
        0 1px 2px color-mix(in srgb, #000 8%, transparent);
      color: transparent;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .input-token-icon {
      position: absolute;
      z-index: 1;
      inset-inline-start: 0;
      inset-block-start: 50%;
      display: grid;
      inline-size: 0.72rem;
      block-size: 0.72rem;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--line-strong, #b8b1a5) 70%, transparent);
      border-radius: 50%;
      background: var(--paper, #fff);
      color: var(--muted, #615d56);
      transform: translate(-45%, -50%);
      pointer-events: none;
    }

    .input-token-icon svg {
      inline-size: 0.52rem;
      block-size: 0.52rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .input-token-text {
      color: inherit;
    }

    .input-token[data-active="true"] {
      background: color-mix(in srgb, var(--focus, #315fbd) 16%, var(--paper, #fff));
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--focus, #315fbd) 58%, transparent),
        0 1px 2px color-mix(in srgb, #000 8%, transparent);
    }

    .input-token[data-active="true"] .input-token-icon {
      border-color: color-mix(in srgb, var(--focus, #315fbd) 70%, transparent);
      color: var(--focus, #315fbd);
    }

    .composer[data-semantic-color="true"] .input-token[data-active="true"] {
      background: color-mix(
        in srgb,
        var(--composer-semantic-accent) 16%,
        var(--paper, #fff)
      );
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--composer-semantic-accent) 58%, transparent),
        0 1px 2px color-mix(in srgb, #000 8%, transparent);
    }

    .composer[data-semantic-color="true"] .input-token[data-active="true"] .input-token-icon {
      border-color: color-mix(in srgb, var(--composer-semantic-accent) 70%, transparent);
      color: var(--composer-semantic-accent);
    }

    .input-token[data-investigative="true"] {
      background: color-mix(in srgb, var(--accent, #b7472a) 14%, var(--paper, #fff));
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent, #b7472a) 48%, transparent),
        inset 0 -2px 0 color-mix(in srgb, var(--accent, #b7472a) 88%, transparent);
    }

    .input-token[data-investigative="true"] .input-token-icon {
      border-color: color-mix(in srgb, var(--accent, #b7472a) 70%, transparent);
      color: var(--accent, #b7472a);
    }

    .input-token[data-investigative="true"][data-active="true"] {
      background: color-mix(in srgb, var(--accent, #b7472a) 20%, var(--paper, #fff));
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--accent, #b7472a) 72%, transparent),
        inset 0 -2px 0 var(--accent, #b7472a);
    }

    .ghost-suffix {
      color: color-mix(in srgb, var(--muted, #615d56) 58%, transparent);
    }

    input {
      position: relative;
      z-index: 1;
      inline-size: 100%;
      block-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      border: 0;
      border-radius: inherit;
      padding: 0.55rem 0.7rem;
      outline: none;
      background: transparent;
      color: var(--ink, #191714);
      caret-color: var(--ink, #191714);
      font: 500 0.88rem/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }

    input::placeholder {
      color: var(--muted, #615d56);
      opacity: 0.72;
    }

    input::selection {
      background: color-mix(in srgb, var(--focus, #315fbd) 24%, transparent);
      color: var(--ink, #191714);
    }

    input:focus-visible {
      outline: none;
    }

    .input-shell:focus-within {
      border-color: var(--focus, #315fbd);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus, #315fbd) 20%, transparent);
    }

    .close {
      display: grid;
      inline-size: 44px;
      block-size: 44px;
      place-items: center;
      border: 1px solid transparent;
      border-radius: var(--toolbar-control-radius, 0.58rem);
      background: transparent;
      color: var(--muted, #615d56);
      cursor: pointer;
      touch-action: manipulation;
    }

    .close svg,
    .approval svg {
      inline-size: 20px;
      block-size: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .close:focus-visible,
    .close:hover {
      border-color: color-mix(in srgb, var(--line-strong, #b8b1a5) 70%, transparent);
      background: var(--paper-2, #f5f3ef);
      color: var(--ink, #191714);
      outline: none;
    }

    .completion-panel {
      position: absolute;
      z-index: 2400;
      pointer-events: auto;
      isolation: isolate;
      inset-inline: 0;
      inset-block-end: calc(100% + 0.38rem);
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      max-block-size: min(32rem, var(--composer-completion-max-height, 65dvh));
      overflow: hidden;
      border: 1px solid var(--line-strong, #b8b1a5);
      border-radius: 0.72rem;
      background: color-mix(in srgb, var(--paper, #fff) 98%, transparent);
      box-shadow: 0 -10px 30px color-mix(in srgb, #000 16%, transparent);
      backdrop-filter: blur(14px);
    }

    .completion-context-scroll {
      min-block-size: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .composer-occurrence-card {
      display: grid;
      gap: 0.5rem;
      min-inline-size: 0;
      padding: 0.65rem;
      border-block-end: 1px solid var(--line, #d1ccc4);
      border-inline-start: 3px solid transparent;
      background: var(--panel, #f5f3ef);
    }

    .composer[data-semantic-color="true"] .composer-occurrence-card {
      border-inline-start-color: color-mix(
        in srgb,
        var(--composer-semantic-accent) 72%,
        transparent
      );
      background: linear-gradient(
        112deg,
        color-mix(in srgb, var(--composer-semantic-accent) 7%, var(--panel, #f5f3ef)),
        var(--panel, #f5f3ef) 42%
      );
    }

    .composer-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.8rem; }
    .composer-card-heading-main { display: inline-flex; min-inline-size: 0; align-items: center; gap: 0.42rem; }
    .composer-heading-icon { display: inline-grid; flex: 0 0 auto; inline-size: 20px; block-size: 20px; place-items: center; color: var(--muted, #615d56); }
    .composer[data-semantic-color="true"] .composer-heading-icon { color: var(--composer-semantic-accent); }
    .composer-heading-icon svg { inline-size: 20px; block-size: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .composer-card-heading strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .composer-card-meta-chips,
    .composer-context-hints {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem;
      min-inline-size: 0;
    }
    .metadata-chip[data-chip-kind="source"],
    .source-chip {
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-weight: 620;
    }
    .card-status-chip {
      flex: 0 0 auto;
    }
    .composer-card-details {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      min-inline-size: 0;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 78%, transparent);
      border-radius: 0.6rem;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      color-scheme: light dark;
      isolation: isolate;
    }
    .composer-card-media {
      position: relative;
      min-inline-size: 0;
      min-block-size: clamp(9rem, 22vh, 14rem);
      overflow: hidden;
      background: color-mix(in srgb, var(--panel, #f5f3ef) 78%, var(--paper, #fff));
      isolation: isolate;
    }
    .composer-card-context {
      display: grid;
      min-inline-size: 0;
      align-content: center;
      gap: 0.5rem;
      box-sizing: border-box;
      padding: 1rem;
      border-block-start: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 70%, transparent);
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--panel, #f5f3ef) 88%, var(--paper, #fff)),
        var(--paper, #fff)
      );
      color: var(--ink, #191714);
    }
    .composer-card-context-label,
    .composer-card-context-body {
      margin: 0;
    }
    .composer-card-context-label {
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      font-weight: 760;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .composer-card-context-body {
      max-inline-size: 52ch;
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .composer-context-deck {
      position: absolute;
      inset: 0;
      display: block;
      min-inline-size: 0;
      min-block-size: 0;
    }
    .composer-context-deck .timeline-occurrence-deck-image-viewport {
      position: absolute;
      inset: 0;
      overflow: hidden;
      outline: none;
      background: var(--paper, #fff);
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      overscroll-behavior: contain;
    }
    .composer-context-deck .timeline-occurrence-deck-image-viewport:active {
      cursor: grabbing;
    }
    .composer-context-deck .timeline-occurrence-deck-image-viewport:focus-visible {
      box-shadow: inset 0 0 0 2px var(--focus, #315fbd);
    }
    .composer-context-deck .timeline-occurrence-deck-native-media-viewport {
      position: absolute;
      inset: 0;
      display: grid;
      min-inline-size: 0;
      min-block-size: 0;
      place-items: center;
      overflow: hidden;
      background: var(--paper, #fff);
    }
    .composer-context-deck .timeline-occurrence-deck-video {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      max-inline-size: 100%;
      max-block-size: 100%;
      object-fit: contain;
      background: var(--paper, #fff);
    }
    .composer-context-deck .timeline-occurrence-deck-audio {
      display: block;
      inline-size: min(32rem, calc(100% - 1rem));
      max-inline-size: calc(100% - 1rem);
    }
    .composer-context-deck .timeline-focus-hero-image,
    .composer-context-deck .timeline-focus-hero-fallback {
      position: absolute;
      inset: 0;
      inline-size: 100%;
      block-size: 100%;
    }
    .composer-context-deck .timeline-focus-hero-image {
      object-fit: contain;
      object-position: center;
      pointer-events: none;
      transform:
        translate3d(
          var(--occurrence-image-pan-x, 0px),
          var(--occurrence-image-pan-y, 0px),
          0
        )
        scale(var(--occurrence-image-zoom, 1));
      transform-origin: center;
      transition: transform 160ms ease;
      will-change: transform;
    }
    .composer-context-deck .timeline-focus-hero-fallback {
      background:
        radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--preview-accent, var(--focus, #315fbd)) 32%, transparent), transparent 42%),
        linear-gradient(135deg, var(--paper, #fff), var(--panel, #f5f3ef));
    }
    .composer-context-deck .timeline-occurrence-deck-caption {
      position: absolute;
      z-index: 3;
      inset-inline: 0.6rem;
      inset-block-start: 0.55rem;
      width: fit-content;
      max-inline-size: calc(100% - 1.2rem);
      margin: 0;
      padding: 0.3rem 0.46rem;
      border-radius: 0.42rem;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 72%, transparent);
      background: color-mix(in srgb, var(--paper, #fff) 88%, transparent);
      color: var(--ink, #191714);
      font-size: 0.7rem;
      line-height: 1.35;
    }
    .composer-context-deck .timeline-occurrence-deck-context {
      z-index: 1;
      display: grid;
      align-content: center;
      gap: 0.45rem;
      box-sizing: border-box;
      padding: 1rem;
      color: var(--ink, #191714);
    }
    .composer-context-deck .timeline-occurrence-deck-context-label,
    .composer-context-deck .timeline-occurrence-deck-context-body {
      position: relative;
      z-index: 1;
      margin: 0;
    }
    .composer-context-deck .timeline-occurrence-deck-context-label {
      font-size: 0.9rem;
      font-weight: 760;
    }
    .composer-context-deck .timeline-occurrence-deck-context-body {
      max-inline-size: 48ch;
      font-size: 0.76rem;
      line-height: 1.45;
    }
    .composer-context-deck .timeline-focus-slideshow-controls {
      position: absolute;
      z-index: 4;
      inset-inline-start: 50%;
      inset-block-end: 0.35rem;
      display: flex;
      align-items: center;
      transform: translateX(-50%);
    }
    .composer-context-deck[data-active-kind="video"] .timeline-focus-slideshow-controls {
      inset-block-end: 3.5rem;
    }
    .composer-context-deck .timeline-focus-media-control,
    .composer-context-deck .timeline-focus-slide-dot {
      display: grid;
      inline-size: 44px;
      block-size: 44px;
      padding: 0;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 72%, transparent);
      border-radius: 50%;
      background: color-mix(in srgb, var(--paper, #fff) 82%, transparent);
      color: var(--ink, #191714);
      cursor: pointer;
      backdrop-filter: blur(10px);
    }
    .composer-context-deck .timeline-focus-media-control:disabled {
      cursor: default;
      opacity: 0.42;
    }
    .composer-context-deck .timeline-focus-slide-dot {
      border-color: transparent;
      background: transparent;
    }
    .composer-context-deck .timeline-focus-slide-dot::before {
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border: 1px solid color-mix(in srgb, var(--ink, #191714) 68%, transparent);
      border-radius: 50%;
      background: color-mix(in srgb, var(--paper, #fff) 72%, transparent);
      content: "";
    }
    .composer-context-deck .timeline-focus-slide-dot.is-active::before {
      background: var(--ink, #191714);
    }
    .composer-context-deck .timeline-focus-slide-count {
      display: grid;
      min-inline-size: 3rem;
      min-block-size: 44px;
      place-items: center;
      color: var(--ink, #191714);
      font: 700 0.68rem/1 ui-monospace, "SFMono-Regular", Consolas, monospace;
    }
    .composer-context-deck .timeline-occurrence-deck-zoom-controls {
      position: absolute;
      z-index: 5;
      inset-inline-end: 0.4rem;
      inset-block-end: 0.4rem;
      display: flex;
      align-items: center;
      border: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 72%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--paper, #fff) 86%, transparent);
      box-shadow: 0 4px 16px color-mix(in srgb, #000 12%, transparent);
      backdrop-filter: blur(10px);
    }
    .composer-context-deck[data-frame-count]:not([data-frame-count="1"])
      .timeline-occurrence-deck-zoom-controls {
      inset-block-end: 3.6rem;
    }
    .composer-context-deck .timeline-occurrence-deck-zoom-controls .timeline-focus-media-control {
      border: 0;
      background: transparent;
      backdrop-filter: none;
    }
    .composer-context-deck .timeline-occurrence-deck-zoom-level {
      min-inline-size: 3.2rem;
      color: var(--ink, #191714);
      font: 700 0.66rem/1 ui-monospace, "SFMono-Regular", Consolas, monospace;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .composer-context-deck .timeline-occurrence-deck-icon {
      display: grid;
      place-items: center;
    }
    .composer-world-preview {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(4.5rem, 0.7fr) minmax(0, 1fr);
      align-items: center;
      gap: 0.2rem;
      min-block-size: 8rem;
      padding: 0.65rem 0.5rem 1.2rem;
      overflow: hidden;
      border: 1px solid var(--preview-accent, var(--line, #d1ccc4));
      border-radius: 0.65rem;
      background:
        radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--preview-accent, var(--focus, #315fbd)) 16%, transparent), transparent 65%),
        var(--paper, #fff);
      color: var(--ink, #191714);
    }
    .mini-world-pin { position: absolute; inset-inline-start: 50%; inset-block-end: 0.45rem; inline-size: 0.4rem; block-size: 0.4rem; border-radius: 50%; background: color-mix(in srgb, var(--success, #3e6d5b) 78%, var(--ink, #191714)); box-shadow: 0 0 0 2px var(--paper, #fff); transform: translateX(-50%); }
    .mini-world-place { position: absolute; inset-inline-start: 0.5rem; inset-block-start: 0.3rem; max-inline-size: calc(100% - 1rem); overflow: hidden; color: var(--muted, #615d56); text-overflow: ellipsis; white-space: nowrap; font-size: 0.66rem; }
    .preview-node { position: relative; z-index: 1; display: grid; justify-items: center; gap: 0.3rem; min-inline-size: 0; font-size: 0.72rem; font-weight: 650; text-align: center; }
    .preview-node img { inline-size: 44px; block-size: 44px; object-fit: contain; }
    .preview-node span { max-inline-size: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-edge { position: relative; z-index: 1; display: grid; gap: 0.3rem; min-inline-size: 0; color: var(--preview-accent, #a79bf4); font-size: 0.72rem; text-align: center; overflow-wrap: anywhere; }
    .preview-edge svg { inline-size: 100%; block-size: 14px; overflow: visible; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .preview-pending { opacity: 0.4; }
    .interpretation-chip { flex: 0 0 auto; min-block-size: 44px; padding: 0.2rem 0.5rem; border: 1px solid var(--line, #d1ccc4); border-radius: 0.5rem; background: var(--paper, #fff); color: inherit; font: inherit; cursor: pointer; }
    .interpretation-chip:focus-visible { outline: 2px solid var(--accent, #315fbd); outline-offset: -2px; }
    .investigation-panel { display: grid; gap: 0.3rem; padding: 0.45rem 0.65rem; border-block-end: 1px solid var(--line, #d1ccc4); font-size: 0.75rem; }
    .interpretation-row { display: flex; gap: 0.25rem; overflow-x: auto; }
    .candidate-matrix { display: grid; gap: 0.3rem; max-block-size: 12rem; overflow: auto; overscroll-behavior: contain; }
    .candidate-row { display: grid; grid-template-columns: minmax(6rem, 0.8fr) auto minmax(10rem, 1.8fr); gap: 0.4rem; align-items: start; padding: 0.35rem 0.4rem; border: 1px solid var(--line, #d1ccc4); border-radius: 0.45rem; background: color-mix(in srgb, var(--paper, #fff) 92%, transparent); }
    .candidate-row[data-scope="none-known"] { border-style: dashed; }
    .candidate-row[data-active="true"] { outline: 2px solid var(--focus, #315fbd); outline-offset: -2px; }
    .candidate-assessment { justify-self: start; font-weight: 760; text-transform: lowercase; }
    .candidate-assessment[data-assessment="consistent"] {
      border-color: color-mix(in srgb, var(--success, #18794e) 46%, var(--line, #d1ccc4));
      color: var(--success, #18794e);
    }
    .candidate-assessment[data-assessment="contradicts"] {
      border-color: color-mix(in srgb, var(--danger, #b42318) 46%, var(--line, #d1ccc4));
      color: var(--danger, #b42318);
    }
    .candidate-reason { color: var(--muted, #615d56); line-height: 1.3; }
    .candidate-select { appearance: none; inline-size: 100%; min-block-size: 44px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 700; text-align: start; cursor: pointer; touch-action: manipulation; }
    .candidate-select:focus-visible { outline: 2px solid var(--focus, #315fbd); outline-offset: 2px; }
    .candidate-sources {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
      min-inline-size: 0;
    }
    .approval { min-inline-size: 44px; min-block-size: 44px; border: 1px solid var(--line, #d1ccc4); border-radius: 0.58rem; background: var(--paper, #fff); color: var(--ink, #191714); cursor: pointer; }

    .pending-selection-action {
      appearance: none;
      justify-self: start;
      min-block-size: 36px;
      padding: 0.32rem 0.55rem;
      border: 1px solid color-mix(in srgb, var(--focus, #315fbd) 42%, var(--line, #d1ccc4));
      border-radius: 0.45rem;
      background: var(--paper, #fff);
      color: var(--ink, #191714);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
    }

    .pending-selection-action:is(:hover, :focus-visible) {
      outline: 2px solid var(--focus, #315fbd);
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .composer-context-deck .timeline-focus-hero-image {
        transition: none;
      }
    }

    @media (min-width: 721px) {
      .composer-card-details[data-split="true"] {
        grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
      }

      .composer-card-details[data-split="true"] .composer-card-media {
        aspect-ratio: 16 / 10;
        min-block-size: 0;
      }

      .composer-card-details[data-split="true"] .composer-card-context {
        border-block-start: 0;
        border-inline-start: 1px solid color-mix(in srgb, var(--line, #d1ccc4) 55%, transparent);
      }
    }

    @media (max-width: 699px) {
      .composer {
        inline-size: max-content;
        min-inline-size: 100dvi;
        max-inline-size: none;
      }

      .input-row {
        grid-template-columns: 100dvi auto auto;
        inline-size: max-content;
        max-inline-size: none;
      }

      .input-shell {
        inline-size: 100dvi;
        max-inline-size: 100dvi;
        scroll-snap-align: center;
        scroll-snap-stop: always;
      }

      .stage {
        display: none;
      }

      .completion-panel {
        position: fixed;
        position-anchor: --occurrence-composer-input;
        inset-inline-start: auto;
        inset-inline-end: auto;
        left: anchor(center);
        right: auto;
        inset-block-end: calc(anchor(top) + 0.38rem);
        inline-size: anchor-size(width);
        transform: translateX(-50%);
        max-inline-size: 100dvi;
        box-sizing: border-box;
      }

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
      max-block-size: min(14rem, 34dvh);
      overflow-y: auto;
      overscroll-behavior: contain;
      border-block-start: 1px solid var(--line-strong, #b8b1a5);
      background: color-mix(in srgb, var(--paper, #fff) 99%, transparent);
      box-shadow: 0 -8px 18px color-mix(in srgb, #000 8%, transparent);
      scrollbar-gutter: stable;
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
      border-inline-start: 3px solid transparent;
      border-block-end: 1px solid var(--line, #d1ccc4);
      background: transparent;
      color: inherit;
      text-align: start;
      cursor: pointer;
      --suggestion-accent: currentColor;
    }

    .option[data-semantic-color="true"] {
      border-inline-start-color: color-mix(
        in srgb,
        var(--suggestion-accent) 42%,
        var(--line, #d1ccc4)
      );
    }

    .option:last-child {
      border-block-end: 0;
    }

    .option[data-active="true"],
    .option:focus-visible,
    .option:hover {
      background: color-mix(in srgb, var(--panel, #f5f3ef) 88%, transparent);
    }

    .option[data-semantic-color="true"][data-active="true"],
    .option[data-semantic-color="true"]:focus-visible,
    .option[data-semantic-color="true"]:hover {
      border-inline-start-color: var(--suggestion-accent);
      background: color-mix(
        in srgb,
        var(--suggestion-accent) 10%,
        var(--panel, #f5f3ef)
      );
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
      inline-size: 24px;
      block-size: 24px;
      place-items: center;
      border: 1px solid transparent;
      border-radius: 0.36rem;
      color: var(--muted, #6b6965);
    }

    .option[data-semantic-color="true"] .option-icon {
      border-color: color-mix(in srgb, var(--suggestion-accent) 38%, var(--line, #d1ccc4));
      background: color-mix(in srgb, var(--suggestion-accent) 9%, var(--paper, #fff));
      color: color-mix(in srgb, var(--suggestion-accent) 72%, var(--muted, #6b6965));
    }

    .option[data-semantic-color="true"]:is([data-active="true"], :focus-visible, :hover) .option-icon {
      border-color: color-mix(in srgb, var(--suggestion-accent) 68%, var(--line, #d1ccc4));
      background: color-mix(in srgb, var(--suggestion-accent) 15%, var(--paper, #fff));
      color: var(--suggestion-accent);
    }

    .option-color {
      display: inline-block;
      flex: 0 0 auto;
      inline-size: 0.62rem;
      block-size: 0.62rem;
      border: 1px solid color-mix(in srgb, var(--ink, #191714) 24%, transparent);
      border-radius: 50%;
      background: color-mix(in srgb, var(--suggestion-accent) 54%, var(--paper, #fff));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--line, #d1ccc4) 76%, transparent);
    }

    .option:is([data-active="true"], :focus-visible, :hover) .option-color {
      background: var(--suggestion-accent);
    }

    .option-icon svg {
      inline-size: 18px;
      block-size: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
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
      justify-self: end;
      min-block-size: 22px;
      max-inline-size: min(14rem, 42vw);
      font-size: 0.64rem;
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
    identityEvidence: Object.freeze([]),
  });
  private timelineContext: ComposerTimelineContext | null = null;
  private worldContext: ComposerWorldContext | null = null;
  private activeSuggestion = 0;
  private previewSuggestion: ComposerSuggestion | null = null;
  private activeInterpretation = "";
  private activeCandidate = 0;
  private choiceWheelLastStepAt = 0;
  private composing = false;
  private programmaticSelection = false;
  private cursorOffset = 0;
  private externalError = "";
  private explicitPlaceContext: ComposerWorldContext | null = null;
  private selectionContext: OccurrenceComposerSelectionContext | null = null;
  private pendingSelectionContext: OccurrenceComposerSelectionContext | null = null;
  private hasPendingSelectionContext = false;
  private selectionSeeded = false;
  private sessionKey = "";

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
      identityEvidence: Object.freeze(
        (data.identityEvidence ?? []).map((entry) =>
          Object.freeze({ ...entry, recordIds: Object.freeze([...entry.recordIds]) }),
        ),
      ),
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
          ...(context.title ? { title: context.title } : {}),
          ...(context.description ? { description: context.description } : {}),
          ...(context.media?.length
            ? {
                media: Object.freeze(
                  context.media.map((entry) => Object.freeze({ ...entry })),
                ),
              }
            : {}),
          ...(context.metadata
            ? {
                metadata: Object.freeze({
                  ...context.metadata,
                  sourceIds: Object.freeze([...(context.metadata.sourceIds ?? [])]),
                  attributes: Object.freeze({ ...(context.metadata.attributes ?? {}) }),
                }),
              }
            : {}),
          ...(context.appearance
            ? {
                appearance: Object.freeze({
                  color: context.appearance.color ?? null,
                  icon: context.appearance.icon ?? null,
                }),
              }
            : {}),
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
        })
      : null;
  }

  setSelectionContext(context: OccurrenceComposerSelectionContext | null): void {
    const nextContext = this.frozenSelectionContext(context);
    const previousKey = this.selectionIdentityKey(this.selectionContext);
    const nextKey = this.selectionIdentityKey(nextContext);
    const dirtyDraft = Boolean(this.value.trim()) && !this.selectionSeeded;

    if (previousKey !== nextKey && dirtyDraft) {
      this.pendingSelectionContext = nextContext;
      this.hasPendingSelectionContext = true;
      this.requestUpdate();
      return;
    }
    if (previousKey === nextKey && dirtyDraft) {
      this.selectionContext = nextContext;
      this.pendingSelectionContext = null;
      this.hasPendingSelectionContext = false;
      this.requestUpdate();
      return;
    }

    this.pendingSelectionContext = null;
    this.hasPendingSelectionContext = false;
    this.selectionContext = nextContext;
    if (previousKey !== nextKey) {
      this.value = "";
      this.cursorOffset = 0;
      this.selectionSeeded = false;
      this.externalError = "";
      this.resetSuggestionSelection();
    }
    this.applySelectionSeed();
    this.requestUpdate();
  }

  setSelectionMedia(
    context: OccurrenceComposerSelectionContext,
    media: NonNullable<OccurrenceComposerSelectionContext["media"]>,
  ): void {
    const nextContext = this.frozenSelectionContext({ ...context, media });
    if (!nextContext) return;
    const nextKey = this.selectionIdentityKey(nextContext);

    if (
      this.hasPendingSelectionContext &&
      this.pendingSelectionContext &&
      this.selectionIdentityKey(this.pendingSelectionContext) === nextKey
    ) {
      this.pendingSelectionContext = nextContext;
      this.requestUpdate();
      return;
    }

    if (this.selectionIdentityKey(this.selectionContext) !== nextKey) return;
    this.selectionContext = nextContext;
    this.requestUpdate();
  }

  private selectionIdentityKey(context: OccurrenceComposerSelectionContext | null): string {
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

  private resetDraft(): void {
    this.value = "";
    this.cursorOffset = 0;
    this.selectionSeeded = false;
    this.explicitPlaceContext = null;
    this.externalError = "";
    this.resetSuggestionSelection();
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
    if (this.sessionKey && this.sessionKey !== nextKey && this.value.trim()) {
      this.resetDraft();
    }
    this.sessionKey = nextKey;
    this.applySelectionSeed();
    this.requestUpdate();
  }

  focusSection(
    field: "subject" | "predicate" | "object" | "place" | "time" | "category" | "tag",
  ): void {
    this.beginSession();
    const section = composerEditableSections(this.value).find(
      (candidate) => candidate.kind === field,
    );
    const start = section?.start ?? this.value.length;
    const end = section?.end ?? this.value.length;
    this.cursorOffset = start;
    this.resetSuggestionSelection();
    this.requestUpdate();
    this.focusInputRange(start, end);
  }

  private focusInputRange(start: number, end = start): void {
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input) return;
      this.programmaticSelection = true;
      this.cursorOffset = start;
      input.focus({ preventScroll: true });
      input.setSelectionRange(start, end);
      let remainingFrames = 3;
      const reinforceSelection = () => {
        requestAnimationFrame(() => {
          const liveInput = this.renderRoot.querySelector<HTMLInputElement>("input");
          if (liveInput) {
            liveInput.setSelectionRange(start, end);
            this.syncInputDecorationScroll(liveInput);
          }
          remainingFrames -= 1;
          if (remainingFrames > 0) {
            reinforceSelection();
          } else {
            this.programmaticSelection = false;
          }
        });
      };
      reinforceSelection();
    });
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

  inputHasFocus(): boolean {
    return this.shadowRoot?.activeElement instanceof HTMLInputElement;
  }

  revealMobileInputLane(): void {
    if (!this.active) return;
    if (typeof matchMedia === "function" && !matchMedia("(max-width: 699px)").matches) return;
    const footer = this.closest<HTMLElement>(".app-footer-bar");
    const shell = this.renderRoot.querySelector<HTMLElement>(".input-shell");
    if (!footer || !shell) return;
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const shellRect = shell.getBoundingClientRect();
    const delta =
      shellRect.left + shellRect.width / 2 - (viewportLeft + viewportWidth / 2);
    const maximum = Math.max(0, footer.scrollWidth - footer.clientWidth);
    footer.scrollTo({
      left: Math.max(0, Math.min(maximum, footer.scrollLeft + delta)),
      behavior: "auto",
    });
  }

  show(): void {
    this.active = true;
    this.externalError = "";
    void this.updateComplete.then(() => {
      const footer = this.closest<HTMLElement>(".app-footer-bar");
      this.revealMobileInputLane();
      const centeredScrollLeft = footer?.scrollLeft ?? null;
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        if (
          footer &&
          centeredScrollLeft !== null &&
          Math.abs(footer.scrollLeft - centeredScrollLeft) > 1
        ) {
          return;
        }
        this.revealMobileInputLane();
      });
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
    return occurrenceComposerSuggestions(this.value, {
      entities: this.data.entities,
      places: this.data.places,
      categories: this.data.categories,
      tags: this.data.tags,
      timelineDefault: this.timelineContext?.value ?? null,
      locationDefault: this.selectionContext?.place?.name ?? this.worldContext?.label ?? null,
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

  private inputTokenLabel(segment: Readonly<{ kind: string | null; investigative: boolean }>): string {
    if (segment.investigative) return "investigate";
    switch (segment.kind) {
      case "subject":
        return "subject";
      case "predicate":
        return "action";
      case "object":
        return "object";
      case "place":
        return "place";
      case "time":
        return "time";
      case "category":
        return "category";
      case "tag":
        return "tag";
      default:
        return segment.kind ?? "context";
    }
  }

  private inputTokenIcon(
    segment: Readonly<{ kind: string | null; investigative: boolean }>,
  ): string {
    if (segment.investigative) return "search";
    switch (segment.kind) {
      case "subject":
        return "person";
      case "predicate":
        return "relation";
      case "object":
        return "object";
      case "place":
        return "place";
      case "time":
        return "timeline";
      case "category":
        return "folder";
      case "tag":
        return "note";
      default:
        return "note";
    }
  }

  private inputDecorationSegments(
    sections: ReturnType<typeof composerEditableSections>,
    qualifiers: ReturnType<typeof projectInvestigativeQualifiers>,
  ): readonly Readonly<{
    text: string;
    kind: string | null;
    investigative: boolean;
    active: boolean;
  }>[] {
    if (!this.value) return Object.freeze([]);

    const cursorWithin = (candidate: { start: number; end: number }) =>
      this.cursorOffset >= candidate.start && this.cursorOffset <= candidate.end;
    const activeQualifier = qualifiers.find(cursorWithin) ?? null;
    const activeSection = activeQualifier ? null : (sections.find(cursorWithin) ?? null);

    const markerAt = (offset: number) => {
      const qualifier = qualifiers.find(
        (candidate) => offset >= candidate.start && offset < candidate.end,
      );
      if (qualifier) {
        return {
          kind: qualifier.kind,
          investigative: true,
          active: qualifier === activeQualifier,
        };
      }
      const section = sections.find(
        (candidate) => offset >= candidate.start && offset < candidate.end,
      );
      return section
        ? {
            kind: section.kind,
            investigative: false,
            active: section === activeSection,
          }
        : { kind: null, investigative: false, active: false };
    };

    const result: Array<
      Readonly<{ text: string; kind: string | null; investigative: boolean; active: boolean }>
    > = [];
    let start = 0;
    let marker = markerAt(0);
    for (let offset = 1; offset <= this.value.length; offset += 1) {
      const next = offset < this.value.length ? markerAt(offset) : null;
      if (
        offset === this.value.length ||
        next?.kind !== marker.kind ||
        next?.investigative !== marker.investigative ||
        next?.active !== marker.active
      ) {
        result.push(
          Object.freeze({
            text: this.value.slice(start, offset),
            kind: marker.kind,
            investigative: marker.investigative,
            active: marker.active,
          }),
        );
        start = offset;
        if (next) marker = next;
      }
    }
    return Object.freeze(result);
  }

  private syncInputDecorationScroll(target: HTMLInputElement): void {
    const content = this.renderRoot.querySelector<HTMLElement>(".input-decoration-content");
    if (!content) return;
    content.style.transform = `translateX(${-target.scrollLeft}px)`;
  }

  private onInputScroll(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.syncInputDecorationScroll(target);
  }

  private centerActiveChoice(kind: "suggestion" | "candidate"): void {
    void this.updateComplete.then(() => {
      const container = this.renderRoot.querySelector<HTMLElement>(
        kind === "suggestion" ? ".listbox" : ".candidate-matrix",
      );
      const choice = this.renderRoot.querySelector<HTMLElement>(
        kind === "suggestion"
          ? '.option[data-active="true"]'
          : '.candidate-row[data-active="true"]',
      );
      if (!container || !choice) return;

      const containerRect = container.getBoundingClientRect();
      const choiceRect = choice.getBoundingClientRect();
      const choiceCenter =
        choiceRect.top - containerRect.top + container.scrollTop + choiceRect.height / 2;
      const maximum = Math.max(0, container.scrollHeight - container.clientHeight);
      const target = Math.max(
        0,
        Math.min(maximum, choiceCenter - container.clientHeight / 2),
      );
      container.scrollTo({ top: target, behavior: "auto" });

      const panel =
        kind === "candidate"
          ? this.renderRoot.querySelector<HTMLElement>(".completion-context-scroll")
          : null;
      if (!panel || panel === container) return;
      const panelRect = panel.getBoundingClientRect();
      const visibleChoiceRect = choice.getBoundingClientRect();
      const delta =
        visibleChoiceRect.top < panelRect.top
          ? visibleChoiceRect.top - panelRect.top
          : visibleChoiceRect.bottom > panelRect.bottom
            ? visibleChoiceRect.bottom - panelRect.bottom
            : 0;
      if (delta === 0) return;
      const panelMaximum = Math.max(0, panel.scrollHeight - panel.clientHeight);
      panel.scrollTo({
        top: Math.max(0, Math.min(panelMaximum, panel.scrollTop + delta)),
        behavior: "auto",
      });
    });
  }

  private resetSuggestionSelection(): void {
    this.activeSuggestion = 0;
    this.previewSuggestion = null;
    this.choiceWheelLastStepAt = 0;
    this.requestUpdate();
    this.centerActiveChoice("suggestion");
  }

  private resetCandidateSelection(): void {
    this.activeCandidate = 0;
    this.requestUpdate();
    this.centerActiveChoice("candidate");
  }

  private selectSuggestion(
    index: number,
    suggestions: readonly ComposerSuggestion[],
    wrap = true,
  ): void {
    if (!suggestions.length) return;
    this.activeSuggestion = wrap
      ? (index + suggestions.length) % suggestions.length
      : Math.max(0, Math.min(suggestions.length - 1, index));
    this.previewSuggestion = suggestions[this.activeSuggestion] ?? null;
    this.requestUpdate();
    this.centerActiveChoice("suggestion");
  }

  private selectCandidate(
    index: number,
    candidates: readonly unknown[],
    wrap = true,
  ): void {
    if (!candidates.length) return;
    this.activeCandidate = wrap
      ? (index + candidates.length) % candidates.length
      : Math.max(0, Math.min(candidates.length - 1, index));
    this.requestUpdate();
    this.centerActiveChoice("candidate");
  }

  private wheelNavigationStep(event: WheelEvent): -1 | 0 | 1 | null {
    const vertical = Math.abs(event.deltaY);
    const horizontal = Math.abs(event.deltaX);
    if (event.ctrlKey || vertical === 0 || vertical <= horizontal * 1.25) return null;

    event.preventDefault();
    const now = event.timeStamp;
    if (
      this.choiceWheelLastStepAt > 0 &&
      now - this.choiceWheelLastStepAt < 48
    ) {
      return 0;
    }

    this.choiceWheelLastStepAt = now;
    return event.deltaY > 0 ? 1 : -1;
  }

  private onSuggestionWheel(event: WheelEvent): void {
    const investigation = this.investigationProjection();
    const candidates = investigation.candidateMatrix?.candidates ?? [];
    const suggestions = investigation.qualifiers.length ? [] : this.suggestions().slice(0, 7);
    if (!candidates.length && !suggestions.length) return;

    const step = this.wheelNavigationStep(event);
    if (step === null || step === 0) return;

    if (candidates.length) {
      this.selectCandidate(this.activeCandidate + step, candidates, false);
      return;
    }
    this.selectSuggestion(this.activeSuggestion + step, suggestions, false);
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
    this.resetSuggestionSelection();
    this.activeInterpretation = "";
    this.resetCandidateSelection();
    this.requestUpdate();
  }

  private syncCursorFromInput(target: HTMLInputElement): void {
    this.syncInputDecorationScroll(target);
    const next = target.selectionStart ?? target.value.length;
    if (next === this.cursorOffset) return;
    this.cursorOffset = next;
    this.resetSuggestionSelection();
    this.requestUpdate();
  }

  private onBeforeInput(event: InputEvent): void {
    if (event.isComposing || this.composing || event.inputType !== "insertText" || event.data !== " ") {
      return;
    }
    const suggestions = this.suggestions().slice(0, 7);
    const activeSuggestion = suggestions[this.activeSuggestion] ?? suggestions[0];
    if (!activeSuggestion?.multiSelect) return;
    event.preventDefault();
    this.toggleMultiSelectSuggestion(activeSuggestion);
  }

  private onInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    if (this.composing) {
      this.value = target.value;
      this.cursorOffset = target.selectionStart ?? target.value.length;
      this.selectionSeeded = false;
      this.syncInputDecorationScroll(target);
      this.requestUpdate();
      return;
    }
    this.setComposerValue(target.value, target.selectionStart ?? target.value.length);
  }

  private onCompositionStart(): void {
    this.composing = true;
  }

  private onCompositionEnd(event: CompositionEvent): void {
    this.composing = false;
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.setComposerValue(target.value, target.selectionStart ?? target.value.length);
  }

  private onCaretMove(event: Event): void {
    if (this.programmaticSelection) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    this.syncCursorFromInput(target);
  }

  private onInputDoubleClick(event: MouseEvent): void {
    if (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const offset = target.selectionStart ?? this.cursorOffset;
    const qualifier = projectInvestigativeQualifiers(this.value).find(
      (candidate) => offset >= candidate.start && offset <= candidate.end,
    );
    const section = composerEditableSections(this.value).find(
      (candidate) => offset >= candidate.start && offset <= candidate.end,
    );
    const range = qualifier ?? section;
    if (!range) return;
    event.preventDefault();
    this.cursorOffset = range.start;
    this.resetSuggestionSelection();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>("input");
      if (!input || input.value !== this.value) return;
      input.setSelectionRange(range.start, range.end);
      input.focus({ preventScroll: true });
    });
  }

  private focusComposerOffset(cursorOffset: number): void {
    this.focusInputRange(cursorOffset);
  }

  private toggleMultiSelectSuggestion(suggestion: ComposerSuggestion): void {
    if (!suggestion.multiSelect || (suggestion.kind !== "category" && suggestion.kind !== "tag")) {
      return;
    }
    const activeLabel = suggestion.label;
    const accepted = toggleComposerMultiOption(this.value, suggestion.kind, suggestion.label);
    this.setComposerValue(accepted.value, accepted.cursorOffset);
    void this.updateComplete.then(() => {
      const suggestions = this.suggestions().slice(0, 7);
      const matching = suggestions.findIndex(
        (candidate) => candidate.kind === suggestion.kind && candidate.label === activeLabel,
      );
      this.activeSuggestion = matching >= 0 ? matching : 0;
      this.previewSuggestion = suggestions[this.activeSuggestion] ?? null;
      this.requestUpdate();
      this.centerActiveChoice("suggestion");
      this.focusComposerOffset(accepted.cursorOffset);
    });
  }

  private advanceMultiSelectSuggestion(suggestion: ComposerSuggestion): void {
    if (!suggestion.multiSelect || (suggestion.kind !== "category" && suggestion.kind !== "tag")) {
      return;
    }
    const accepted = advanceComposerMultiOption(this.value, suggestion.kind);
    this.setComposerValue(accepted.value, accepted.cursorOffset);
    this.focusComposerOffset(accepted.cursorOffset);
  }

  private applySuggestion(suggestion: ComposerSuggestion): void {
    if (suggestion.multiSelect) {
      this.toggleMultiSelectSuggestion(suggestion);
      return;
    }
    if (!suggestion.insertText) return;
    const parsed = this.parsed();
    const accepted = acceptComposerSuggestion(this.value, suggestion, parsed.stage);
    this.setComposerValue(accepted.value, accepted.cursorOffset);
    this.focusComposerOffset(accepted.cursorOffset);
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
    const metadata = this.selectionContext?.metadata;
    const normalizedMetadata = Object.freeze({
      role: metadata?.role?.trim() || null,
      initialState: metadata?.initialState === "inactive" ? "inactive" as const : "active" as const,
      sourceIds: Object.freeze([
        ...new Set((metadata?.sourceIds ?? []).map((id) => id.trim()).filter(Boolean)),
      ]),
      confidence: metadata?.confidence ?? null,
      attributes: Object.freeze({ ...(metadata?.attributes ?? {}) }),
    });
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
          metadata: normalizedMetadata,
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
            placeReference:
              !draft.place && this.selectionContext?.place
                ? `@${this.selectionContext.place.id}`
                : null,
          },
        },
      }),
    );
  }

  private investigationProjection() {
    const qualifiers = this.composing ? [] : projectInvestigativeQualifiers(this.value);
    const activeQualifier =
      qualifiers.find(
        (qualifier) => this.cursorOffset >= qualifier.start && this.cursorOffset <= qualifier.end,
      ) ?? qualifiers[0] ?? null;
    const investigativeEntities = this.data.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      alternateNames: entity.alternateNames,
      attributes: entity.attributes,
      sourceIds: entity.sourceIds,
    }));
    const activeQualifierId = activeQualifier
      ? `composer:${activeQualifier.kind}:${activeQualifier.start}:${activeQualifier.end}`
      : "";
    const activeInterpretations = activeQualifier
      ? interpretInvestigativeQualifier(
          {
            id: activeQualifierId,
            section: activeQualifier.kind,
            text: activeQualifier.normalizedText,
          },
          { entities: investigativeEntities },
        )
      : [];
    const chosenInterpretation =
      activeInterpretations.find((interpretation) => interpretation.id === this.activeInterpretation) ??
      activeInterpretations[0] ??
      null;
    const unknownEntityId = (() => {
      if (!activeQualifier || !["subject", "object"].includes(activeQualifier.kind)) return null;
      const clueId = activeQualifier.text.replace(/\?$/, "").replace(/^@/, "").trim();
      if (clueId && this.data.entities.some((entity) => entity.id === clueId)) return clueId;
      const contextualId =
        activeQualifier.kind === "subject"
          ? this.selectedSubjectId()
          : (this.selectionContext?.relationship?.objectId ?? null);
      return contextualId && this.data.entities.some((entity) => entity.id === contextualId)
        ? contextualId
        : null;
    })();
    const explicitEvidenceAssessments = unknownEntityId
      ? (this.data.identityEvidence ?? [])
          .filter((entry) => entry.unknownEntityId === unknownEntityId)
          .map((entry) => ({
            candidateEntityId: entry.candidateEntityId,
            qualifierId: activeQualifierId,
            assessment: entry.assessment,
            reason: entry.reason,
            recordIds: entry.recordIds,
          }))
      : [];
    const candidateMatrix = chosenInterpretation
      ? projectInvestigativeCandidateMatrix({
          entities: investigativeEntities,
          qualifiers: [{ id: activeQualifierId, interpretation: chosenInterpretation }],
          evidenceAssessments: explicitEvidenceAssessments,
          limit: 12,
        })
      : null;
    return {
      qualifiers,
      activeQualifier,
      activeInterpretations,
      chosenInterpretation,
      candidateMatrix,
      unknownEntityId,
    };
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.isComposing || this.composing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.requestClose();
      return;
    }
    const investigation = this.investigationProjection();
    if (investigation.qualifiers.length) {
      const interpretations = investigation.activeInterpretations;
      const candidates = investigation.candidateMatrix?.candidates ?? [];
      const currentInterpretation = Math.max(
        0,
        interpretations.findIndex(
          (interpretation) => interpretation.id === investigation.chosenInterpretation?.id,
        ),
      );
      if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && interpretations.length) {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = (currentInterpretation + delta + interpretations.length) % interpretations.length;
        this.activeInterpretation = interpretations[next]?.id ?? "";
        this.resetCandidateSelection();
        this.requestUpdate();
        return;
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && candidates.length) {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        this.selectCandidate(this.activeCandidate + delta, candidates);
        return;
      }
      if ((event.key === "Home" || event.key === "End") && candidates.length) {
        event.preventDefault();
        this.selectCandidate(event.key === "Home" ? 0 : candidates.length - 1, candidates, false);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        return;
      }
      return;
    }
    const suggestions = this.suggestions().slice(0, 7);
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      this.selectSuggestion(this.activeSuggestion + 1, suggestions);
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      this.selectSuggestion(this.activeSuggestion - 1, suggestions);
      return;
    }
    const activeSuggestion = suggestions[this.activeSuggestion] ?? suggestions[0];
    const spacePressed =
      event.key === " " || event.key === "Spacebar" || event.code === "Space";
    if (spacePressed && activeSuggestion?.multiSelect) {
      event.preventDefault();
      this.toggleMultiSelectSuggestion(activeSuggestion);
      return;
    }
    if (event.key === "Enter" && activeSuggestion?.multiSelect) {
      event.preventDefault();
      this.advanceMultiSelectSuggestion(activeSuggestion);
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

  private stageGuidance(
    parsed: OccurrenceSentenceDraft,
    qualifiers: ReturnType<typeof projectInvestigativeQualifiers>,
    suggestions: readonly ComposerSuggestion[],
    activeSuggestion: ComposerSuggestion | undefined,
  ): string {
    if (qualifiers.length) return "Resolve clue";

    const cursor = composerCursorSection(this.value, this.cursorOffset);
    const selectingOptions =
      Boolean(activeSuggestion?.multiSelect) ||
      suggestions.some(
        (suggestion) =>
          suggestion.multiSelect &&
          (suggestion.kind === "category" || suggestion.kind === "tag"),
      );

    if (selectingOptions) return "Space toggle · Enter next";
    if (suggestions.length && cursor.kind !== "tail") return "↑↓ choose · Enter accept";
    if (parsed.stage === "complete" && parsed.diagnostics.length === 0) return "Enter save";
    if (suggestions.length) return "↑↓ choose · Enter accept";
    if (parsed.diagnostics.length) return "Fix highlighted text";

    switch (parsed.stage) {
      case "subject":
        return "Choose who";
      case "predicate":
        return "Choose action";
      case "object":
        return "Choose target";
      case "place":
      case "time":
      case "options":
        return "Add context";
      default:
        return "Continue";
    }
  }

  private previewPalette(): WorldGraphPalette {
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const fallback = dark ? WORLD_DARK_PALETTE : WORLD_LIGHT_PALETTE;
    const computed = getComputedStyle(this);
    const token = (name: string, value: string) => {
      const raw = computed.getPropertyValue(`--${name}`).trim();
      return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : value;
    };
    return {
      ink: token("ink", fallback.ink), muted: token("muted", fallback.muted),
      paper: token("paper", fallback.paper), focus: token("focus", fallback.focus),
      story: token("story", fallback.story), line: token("line", fallback.line),
    };
  }

  private previewNode(node: { label: string; icon: string; entityId?: string } | null, label: string, palette: WorldGraphPalette) {
    return node
      ? html`<span class="preview-node"><img alt="" src=${composerWorldNodeMarker(node, this.data.entities, palette).url}>
        <span title=${node.label}>${node.label}</span></span>`
      : html`<span class="preview-node preview-pending">${label}</span>`;
  }
  private contextDeckFrames() {
    return occurrenceContextDeckFrames(this.selectionContext?.media, null);
  }

  private syncContextDeck(): void {
    const deck = this.renderRoot.querySelector<LuumOccurrenceDeckElement>(".composer-context-deck");
    if (!deck) return;
    deck.setDeck({
      occurrenceId:
        this.selectionContext?.selectedOccurrenceId ??
        this.selectionContext?.selectedItemId ??
        "composer-draft",
      frames: this.contextDeckFrames(),
      activeIndex: deck.activeIndex,
    });
  }

  override updated(): void {
    this.syncContextDeck();
    const input = this.renderRoot.querySelector<HTMLInputElement>("input");
    if (input) this.syncInputDecorationScroll(input);
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
    const timeLabel = parsed.time?.start ?? this.timelineContext?.label ?? null;
    const placeLabel =
      parsed.place?.name ??
      this.selectionContext?.place?.name ??
      this.worldContext?.label ??
      "World center";
    const investigation = this.investigationProjection();
    const {
      qualifiers,
      activeQualifier,
      activeInterpretations,
      chosenInterpretation,
      candidateMatrix,
      unknownEntityId,
    } = investigation;
    const suggestions =
      this.composing || qualifiers.length ? [] : this.suggestions().slice(0, 7);
    const selectedIndex = Math.min(this.activeSuggestion, Math.max(0, suggestions.length - 1));
    const activeSuggestion = suggestions[selectedIndex];
    const ghostSuffix =
      this.cursorOffset === this.value.length
        ? composerCompletionSuffix(this.value, activeSuggestion)
        : "";
    const diagnostic = this.externalError || parsed.diagnostics[0] || "";
    const sections = composerEditableSections(this.value);
    const preview = projectComposerPreview(
      this.value,
      this.data.entities,
      this.previewSuggestion,
      this.data.places,
      this.data.categories,
      this.data.tags ?? [],
    );
    const previewCategory = this.data.categories.find(
      (category) => category.name === preview.category,
    );
    const semanticSuggestion = this.previewSuggestion ?? null;
    const relationshipAttributes = this.selectionContext?.metadata?.attributes;
    const relationshipStyle =
      relationshipAttributes?.["style"] &&
      typeof relationshipAttributes["style"] === "object" &&
      !Array.isArray(relationshipAttributes["style"])
        ? (relationshipAttributes["style"] as Readonly<Record<string, unknown>>)
        : relationshipAttributes;
    const relationshipAccent = normalizeComposerSemanticColor(
      relationshipStyle?.["categoryColor"] ??
        relationshipStyle?.["color"] ??
        relationshipStyle?.["stroke"] ??
        relationshipStyle?.["lineColor"],
    );
    const relationshipIcon =
      typeof relationshipStyle?.["icon"] === "string" ? relationshipStyle["icon"] : null;
    const occurrenceAccent = normalizeComposerSemanticColor(
      this.selectionContext?.appearance?.color,
    );
    const occurrenceIcon = this.selectionContext?.appearance?.icon ?? null;
    const predicateVisual = (this.data.predicates ?? [])
      .map((predicate): ComposerPredicateOption =>
        typeof predicate === "string"
          ? { name: predicate }
          : predicate,
      )
      .find((predicate) => predicate.name === preview.edge?.label);
    const subjectEntity = preview.subject
      ? this.data.entities.find(
          (entity) =>
            entity.id === preview.subject?.entityId || entity.name === preview.subject?.label,
        )
      : null;
    const objectEntity = preview.object
      ? this.data.entities.find(
          (entity) =>
            entity.id === preview.object?.entityId || entity.name === preview.object?.label,
        )
      : null;
    const entityVisual = (entity: ComposerEntityOption | null | undefined) => {
      const attributes = entity?.attributes;
      const style =
        attributes?.["style"] &&
        typeof attributes["style"] === "object" &&
        !Array.isArray(attributes["style"])
          ? (attributes["style"] as Readonly<Record<string, unknown>>)
          : attributes;
      return {
        color: normalizeComposerSemanticColor(
          style?.["color"] ?? style?.["fill"] ?? style?.["fillColor"] ?? style?.["border"],
        ),
        icon: entity?.icon ?? null,
      };
    };
    const subjectVisual = entityVisual(subjectEntity);
    const objectVisual = entityVisual(objectEntity);
    const activeTagVisual = preview.tags
      .map((label) =>
        (this.data.tags ?? [])
          .map((tag): ComposerTagOption => (typeof tag === "string" ? { label: tag } : tag))
          .find((tag) => tag.label === label),
      )
      .find((tag) => Boolean(tag?.color || tag?.icon));
    const deckAccentSource =
      normalizeComposerSemanticColor(semanticSuggestion?.color) ??
      occurrenceAccent ??
      relationshipAccent ??
      normalizeComposerSemanticColor(predicateVisual?.color) ??
      subjectVisual.color ??
      objectVisual.color ??
      normalizeComposerSemanticColor(previewCategory?.color) ??
      normalizeComposerSemanticColor(activeTagVisual?.color);
    const deckAccent = deckAccentSource ? semanticColorCss(deckAccentSource, "active") : null;
    const deckIcon =
      semanticSuggestion?.icon ??
      occurrenceIcon ??
      relationshipIcon ??
      predicateVisual?.icon ??
      subjectVisual.icon ??
      objectVisual.icon ??
      previewCategory?.icon ??
      activeTagVisual?.icon ??
      null;
    const previewPalette = this.previewPalette();
    const inputSegments = this.inputDecorationSegments(sections, qualifiers);
    const metadata = this.selectionContext?.metadata ?? null;
    const metadataSourceIds = metadata?.sourceIds ?? [];
    const metadataConfidence =
      typeof metadata?.confidence === "number"
        ? `${Math.round(metadata.confidence * 100)}% confidence`
        : null;
    const hasExplicitPlace = sections.some((section) => section.kind === "place");
    const hasExplicitTime = sections.some((section) => section.kind === "time");
    const cardStatus = qualifiers.length ? "Investigating" : preview.category || "Draft";

    return html`
      <section
        class="composer"
        aria-label="Occurrence composer"
        data-semantic-color=${String(Boolean(deckAccent))}
        style=${deckAccent ? `--composer-semantic-accent: ${deckAccent}` : nothing}
      >
        <div class="input-row">
          <span
            class="stage composer-chip"
            data-chip-kind="guidance"
            role="status"
            aria-live="polite"
          >${this.stageGuidance(parsed, qualifiers, suggestions, activeSuggestion)}</span>
          <div class="input-shell">
            <span class="input-decoration" aria-hidden="true">
              <span class="input-decoration-content">
                ${inputSegments.map((segment) =>
                  segment.kind
                    ? html`<span
                        class="input-token"
                        data-kind=${segment.kind}
                        data-label=${this.inputTokenLabel(segment)}
                        data-investigative=${String(segment.investigative)}
                        data-active=${String(segment.active)}
                      >
                        <span
                          class="input-token-icon"
                          data-icon=${this.inputTokenIcon(segment)}
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24" focusable="false">
                            ${iconPathData(this.inputTokenIcon(segment)).map(
                              (path) => svg`<path d=${path}></path>`,
                            )}
                          </svg>
                        </span>
                        <span class="input-token-text">${segment.text}</span>
                      </span>`
                    : html`<span class="input-decoration-text">${segment.text}</span>`,
                )}<span class="ghost-suffix">${ghostSuffix}</span>
              </span>
            </span>
            <input
              type="text"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="both"
              aria-expanded=${String(suggestions.length > 0 || qualifiers.length > 0)}
              aria-controls=${
                qualifiers.length
                  ? "occurrence-investigation-panel"
                  : suggestions.length
                    ? "occurrence-composer-listbox"
                    : nothing
              }
              aria-activedescendant=${
                qualifiers.length && candidateMatrix?.candidates.length
                  ? `occurrence-composer-candidate-${Math.min(
                      this.activeCandidate,
                      candidateMatrix.candidates.length - 1,
                    )}`
                  : suggestions.length
                    ? `occurrence-composer-option-${selectedIndex}`
                    : nothing
              }
              aria-describedby="occurrence-composer-help occurrence-composer-diagnostic occurrence-investigation-status"
              placeholder=${`Who did what to whom · at ${placeLabel} · on ${timeLabel ?? "timeline center"}`}
              .value=${this.value}
              @compositionstart=${() => this.onCompositionStart()}
              @compositionend=${(event: CompositionEvent) => this.onCompositionEnd(event)}
              @beforeinput=${(event: InputEvent) => this.onBeforeInput(event)}
              @input=${(event: Event) => this.onInput(event)}
              @focus=${(event: Event) => this.onCaretMove(event)}
              @click=${(event: Event) => this.onCaretMove(event)}
              @keyup=${(event: Event) => this.onCaretMove(event)}
              @select=${(event: Event) => this.onCaretMove(event)}
              @dblclick=${(event: MouseEvent) => this.onInputDoubleClick(event)}
              @scroll=${(event: Event) => this.onInputScroll(event)}
              @wheel=${(event: WheelEvent) => this.onSuggestionWheel(event)}
              @keydown=${(event: KeyboardEvent) => this.onKeyDown(event)}
            />
          </div>
          <button
            class="close"
            type="button"
            aria-label="Close occurrence composer"
            title="Close occurrence composer"
            @click=${() => this.requestClose()}
          >
            <svg
              class="semantic-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              ${iconPathData("close").map((path) => svg`<path d=${path}></path>`)}
            </svg>
          </button>
          <button class="approval" type="button" aria-label="Approve occurrence" title="Approve occurrence"
            @click=${() => this.commit()}>
            <svg
              class="semantic-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              ${iconPathData("check").map((path) => svg`<path d=${path}></path>`)}
            </svg>
          </button>
        </div>

        <div class="completion-panel">
          <div class="completion-context-scroll">
          <section class="composer-occurrence-card" aria-label="Occurrence card in composer">
            <div class="composer-card-heading">
              <span class="composer-card-heading-main">
                ${deckIcon
                  ? html`<span class="composer-heading-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        ${iconPathData(deckIcon).map((path) => html`<path d=${path}></path>`)}
                      </svg>
                    </span>`
                  : nothing}
                <strong>${this.selectionContext?.title || "New occurrence"}</strong>
              </span>
              <span
                class="composer-chip card-status-chip"
                data-chip-kind="status"
                data-chip-tone=${qualifiers.length ? "investigative" : preview.category ? "strong" : "neutral"}
              >${cardStatus}</span>
            </div>
            ${metadata
              ? html`<div class="composer-card-meta-chips" aria-label="Occurrence metadata">
                  ${metadata.role?.trim()
                    ? html`<span class="composer-chip metadata-chip" data-chip-kind="role">${metadata.role.trim()}</span>`
                    : nothing}
                  <span class="composer-chip metadata-chip" data-chip-kind="state">${metadata.initialState ?? "active"}</span>
                  ${metadataConfidence
                    ? html`<span class="composer-chip metadata-chip" data-chip-kind="confidence">${metadataConfidence}</span>`
                    : nothing}
                  ${metadataSourceIds.map(
                    (sourceId) => html`<span class="composer-chip metadata-chip" data-chip-kind="source">source · ${sourceId}</span>`,
                  )}
                </div>`
              : nothing}
            ${!hasExplicitPlace || !hasExplicitTime
              ? html`<div class="composer-context-hints" aria-label="Live composer defaults">
                  ${!hasExplicitPlace
                    ? html`<span class="composer-chip" data-chip-kind="live-place" data-chip-variant="ghost">live place · ${placeLabel}</span>`
                    : nothing}
                  ${!hasExplicitTime
                    ? html`<span class="composer-chip" data-chip-kind="live-time" data-chip-variant="ghost">live time · ${timeLabel ?? "timeline center"}</span>`
                    : nothing}
                </div>`
              : nothing}
            ${this.contextDeckFrames().length || this.selectionContext?.description?.trim()
              ? html`<div
                  class="composer-card-details"
                  data-split=${String(Boolean(this.contextDeckFrames().length && this.selectionContext?.description?.trim()))}
                  aria-label="Occurrence media and context"
                >
                  ${this.contextDeckFrames().length
                    ? html`<div class="composer-card-media" aria-label="Occurrence slideshow">
                        <luum-occurrence-deck class="composer-context-deck"></luum-occurrence-deck>
                      </div>`
                    : nothing}
                  ${this.selectionContext?.description?.trim()
                    ? html`<aside class="composer-card-context" aria-label="Occurrence context">
                        <strong class="composer-card-context-label">Context</strong>
                        <p class="composer-card-context-body">${this.selectionContext.description.trim()}</p>
                      </aside>`
                    : nothing}
                </div>`
              : nothing}
            <div class="composer-world-preview" role="img"
              style=${`--preview-accent: ${deckAccent ?? "var(--accent, #315fbd)"}`}
              aria-label=${`World preview: ${preview.subject?.label ?? "subject pending"}, ${preview.edge?.label ?? "action pending"}, ${preview.object?.label ?? "target pending"}${preview.place ? ` at ${preview.place.label}${preview.place.longitude === null ? " (coordinates unknown)" : ""}` : ""}`}>
              ${preview.place ? html`<span class="mini-world-place">${preview.place.label}</span>` : nothing}
              ${
                preview.place?.longitude !== null &&
                preview.place?.longitude !== undefined &&
                preview.place.latitude !== null
                  ? html`<span class="mini-world-pin" aria-hidden="true"></span>`
                  : nothing
              }
              ${this.previewNode(preview.subject, "Subject", previewPalette)}
              <span class="preview-edge ${preview.edge ? "" : "preview-pending"}">
                <span>${preview.edge?.label ?? "Action"}</span>
                <svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M1 7H96M89 1L97 7L89 13"></path></svg>
              </span>
              ${this.previewNode(preview.object, "Target", previewPalette)}
            </div>
            ${this.hasPendingSelectionContext
              ? html`<button
                  class="composer-chip composer-chip-button pending-selection-action"
                  type="button"
                  data-context-kind="pending-selection"
                  data-context-state="pending"
                  title="Replace this draft with the newly selected graph context"
                  @click=${() => this.acceptPendingSelectionContext()}
                >${this.pendingSelectionContext ? "Use selected context" : "Use no selection"}</button>`
              : nothing}
          </section>
          ${
            qualifiers.length
              ? html`<section id="occurrence-investigation-panel" class="investigation-panel" aria-label="Investigative clues">
            <strong class="investigation-heading">Investigating “${activeQualifier?.text ?? "unresolved clue"}”</strong>
            <div class="interpretation-row" aria-label="Possible interpretations">
              ${activeInterpretations.map(
                (interpretation) => html`<button
                class="composer-chip composer-chip-button interpretation-chip" type="button"
                aria-pressed=${String(chosenInterpretation?.id === interpretation.id)}
                @click=${() => {
                  this.activeInterpretation = interpretation.id;
                  this.resetCandidateSelection();
                  this.requestUpdate();
                }}>${interpretation.label}</button>`,
              )}
            </div>
            ${candidateMatrix
              ? html`<div class="candidate-matrix" role="table" aria-label="Candidate comparison">
                  ${candidateMatrix.candidates.map((candidate, index) => {
                    const cell = candidate.cells[0];
                    const active = index === Math.min(this.activeCandidate, candidateMatrix.candidates.length - 1);
                    return html`<div id=${`occurrence-composer-candidate-${index}`} class="candidate-row" role="row" data-scope=${candidate.candidateScope}
                      data-active=${String(active)} aria-current=${active ? "true" : nothing}
                      aria-label=${`${candidate.label}: ${cell?.assessment ?? "unknown"}. ${cell?.reason ?? "No comparison available."}`}>
                      <div role="cell"><button class="candidate-select" type="button"
                        aria-pressed=${String(active)}
                        @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                        @click=${() =>
                          this.selectCandidate(index, candidateMatrix.candidates, false)
                        }>${candidate.label}</button></div>
                      <span class="composer-chip candidate-assessment" role="cell" data-chip-kind="assessment"
                        data-assessment=${cell?.assessment ?? "unknown"}>${cell?.assessment ?? "unknown"}</span>
                      <span class="candidate-reason" role="cell">${cell?.reason ?? "No comparison available."}</span>
                      ${cell?.recordIds.length
                        ? html`<div class="candidate-sources" aria-label="Sources">
                            ${cell.recordIds.map(
                              (recordId) => html`<span class="composer-chip source-chip" data-chip-kind="source">${recordId}</span>`,
                            )}
                          </div>`
                        : nothing}
                    </div>`;
                  })}
                </div>
                ${candidateMatrix.hasMoreKnownCandidates
                  ? html`<span>${candidateMatrix.visibleKnownCandidates} of ${candidateMatrix.totalKnownCandidates} known candidates shown.</span>`
                  : nothing}`
              : html`<span>Select an interpretation to compare known candidates. None known remains possible.</span>`}
            <div class="interpretation-row" aria-label="Investigation methods">
              ${(
                [
                  ["question", "Ask this question"],
                  ["compare-candidates", "Compare candidates"],
                  ["assumption", "Add assumption"],
                  ["enquiry", "Create enquiry"],
                  ["falsify", "What would disconfirm this?"],
                  ["information-review", "Review information quality"],
                  ["promote-observation", "Record source observation"],
                  ["promote-assertion", "Record source assertion"],
                ] as const
              ).map(
                ([action, label]) => {
                  const comparing = action === "compare-candidates";
                  const promoting = action === "promote-observation" || action === "promote-assertion";
                  const candidates = candidateMatrix?.candidates
                    .filter((candidate) => candidate.candidateScope === "entity" && candidate.candidateEntityId)
                    .map((candidate) => ({
                      entityId: candidate.candidateEntityId!,
                      label: candidate.label,
                    })) ?? [];
                  const sourceIds = [...(this.selectionContext?.metadata?.sourceIds ?? [])];
                  const canPromote = Boolean(
                    activeQualifier && this.selectionContext?.selectedOccurrenceId && sourceIds.length,
                  );
                  const disabled =
                    (comparing && (!unknownEntityId || candidates.length === 0)) ||
                    (promoting && !canPromote);
                  const title = comparing && !unknownEntityId
                    ? "Select a canonical unresolved entity before comparing identities."
                    : promoting && !canPromote
                      ? "Source observation/assertion promotion requires a selected occurrence with source evidence."
                      : label;
                  const qualifierEntityId = activeQualifier?.kind === "subject"
                    ? this.selectionContext?.relationship?.subjectId ?? null
                    : activeQualifier?.kind === "object"
                      ? this.selectionContext?.relationship?.objectId ?? null
                      : null;
                  return html`<button class="composer-chip composer-chip-button interpretation-chip"
                    type="button"
                    ?disabled=${disabled}
                    title=${title}
                    @click=${() =>
                      this.dispatchEvent(
                        new CustomEvent("occurrenceinvestigationactionrequest", {
                          bubbles: true,
                          composed: true,
                          detail: {
                            text: this.value,
                            action,
                            unknownEntityId,
                            candidates,
                            qualifier: activeQualifier
                              ? {
                                  kind: activeQualifier.kind,
                                  text: activeQualifier.text,
                                  normalizedText: activeQualifier.normalizedText,
                                  scope: activeQualifier.scope,
                                }
                              : null,
                            provenance: {
                              sourceIds,
                              relationshipId: this.selectionContext?.selectedOccurrenceId ?? null,
                              itemId: this.selectionContext?.selectedItemId ?? null,
                              entityId: qualifierEntityId,
                              placeId: activeQualifier?.kind === "place"
                                ? this.selectionContext?.place?.id ?? null
                                : null,
                            },
                          },
                        }),
                      )}>${label}</button>`;
                },
              )}
            </div>
          </section>`
              : nothing
          }
          <span id="occurrence-investigation-status" class="help" aria-live="polite">
            ${qualifiers.length && candidateMatrix?.candidates.length
              ? (() => {
                  const active = candidateMatrix.candidates[
                    Math.min(this.activeCandidate, candidateMatrix.candidates.length - 1)
                  ];
                  const cell = active?.cells[0];
                  return `Investigation. Interpretation ${chosenInterpretation?.label ?? "unresolved"}. Candidate ${active?.label ?? "none"}: ${cell?.assessment ?? "unknown"}.`;
                })()
              : qualifiers.length
                ? "Investigation mode. Choose an interpretation to compare candidates."
                : ""}
          </span>
          ${
            diagnostic
              ? html`<p id="occurrence-composer-diagnostic" class="diagnostic" role="alert">${diagnostic}</p>`
              : html`<span id="occurrence-composer-diagnostic" hidden></span>`
          }
          </div>
          ${
            suggestions.length
              ? html`
                <div
                  id="occurrence-composer-listbox"
                  class="listbox"
                  role="listbox"
                  aria-multiselectable=${suggestions.some((suggestion) => suggestion.multiSelect) ? "true" : nothing}
                >
                  ${suggestions.map(
                    (suggestion, index) => html`
                      <button
                        id=${`occurrence-composer-option-${index}`}
                        class="option"
                        type="button"
                        role="option"
                        aria-selected=${String(suggestion.multiSelect ? Boolean(suggestion.selected) : index === selectedIndex)}
                        data-active=${String(index === selectedIndex)}
                        data-multiselect=${String(Boolean(suggestion.multiSelect))}
                        data-selected=${String(Boolean(suggestion.selected))}
                        data-semantic-color=${String(Boolean(normalizeComposerSemanticColor(suggestion.color)))}
                        style=${
                          normalizeComposerSemanticColor(suggestion.color)
                            ? `--suggestion-accent: ${semanticColorCss(normalizeComposerSemanticColor(suggestion.color), "active")}`
                            : nothing
                        }
                        @pointerdown=${(event: PointerEvent) => event.preventDefault()}
                        @pointerenter=${() => {
                          this.previewSuggestion = suggestion;
                          this.requestUpdate();
                        }}
                        @pointerleave=${() => {
                          this.previewSuggestion = null;
                          this.requestUpdate();
                        }}
                        @focus=${() => {
                          this.previewSuggestion = suggestion;
                          this.requestUpdate();
                        }}
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
                              : normalizeComposerSemanticColor(suggestion.color)
                                ? html`<span class="option-color" aria-hidden="true"></span>`
                                : nothing
                          }
                          <span class="option-label">${suggestion.label}</span>
                        </span>
                        <span
                          class="composer-chip option-detail"
                          data-chip-kind="suggestion"
                          data-chip-tone=${suggestion.selected ? "active" : "neutral"}
                        >${suggestion.detail ?? suggestion.kind}</span>
                      </button>
                    `,
                  )}
                </div>
              `
              : nothing
          }
        </div>

        <p id="occurrence-composer-help" class="help">
          Without unresolved clues, Arrow keys navigate suggestions. In category/tag lists, Space toggles choices and Enter advances to the next part; otherwise Enter accepts or commits.
          In investigation mode, Left/Right changes interpretation, Up/Down and Home/End navigate candidates, and Enter never commits a candidate.
          Tab moves focus · Esc closes. Quote multi-word entity names.
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
