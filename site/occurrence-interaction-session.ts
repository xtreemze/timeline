import type { ComposerEditableSectionKind } from "./occurrence-composer-model.ts";

export type OccurrencePresentationState = "resting" | "selected" | "focused" | "expanded";
export type OccurrenceContentView = "context" | "evidence";
export type OccurrenceComposerHost = "footer" | "card";
export type OccurrenceComposerMode = "authoring" | "investigating";
export type DirtyDraftSelectionPolicy = "block" | "preserve" | "discard";

export interface ComposerSectionTarget {
  readonly kind: ComposerEditableSectionKind | "sentence";
  readonly start: number;
  readonly end: number;
  readonly index?: number;
}

export interface InvestigativeQualifierState {
  readonly id: string;
  readonly section: ComposerEditableSectionKind | "sentence";
  readonly start: number;
  readonly end: number;
  readonly rawText: string;
  readonly normalizedText: string;
}

export interface ComposerInvestigationState {
  readonly qualifiers: readonly InvestigativeQualifierState[];
  readonly activeQualifierId: string | null;
  readonly activeInterpretationId: string | null;
  readonly proposedMethodAction: string | null;
}

export interface OccurrenceComposerSessionState {
  readonly draftOwnerId: string | null;
  readonly text: string;
  readonly dirty: boolean;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly activeSection: ComposerSectionTarget | null;
  readonly activeSuggestion: number | null;
  readonly activeHost: OccurrenceComposerHost | null;
  readonly mode: OccurrenceComposerMode;
  readonly investigation: ComposerInvestigationState;
}

export interface OccurrenceInteractionSession {
  readonly occurrenceId: string | null;
  readonly presentation: OccurrencePresentationState;
  readonly contentView: OccurrenceContentView;
  readonly mediaIndex: number;
  readonly composer: OccurrenceComposerSessionState;
}

export interface OccurrenceInteractionSessionInput {
  readonly occurrenceId?: string | null;
  readonly presentation?: OccurrencePresentationState;
  readonly contentView?: OccurrenceContentView;
  readonly mediaIndex?: number;
}

export interface CommittedViewportState {
  readonly logicalOccurrenceIds: readonly string[];
  readonly demotionOccurrenceIds?: readonly string[];
  readonly explicitDetailOpen?: boolean;
  readonly focused?: boolean;
}

export interface ComposerDraftUpdate {
  readonly ownerId: string | null;
  readonly text: string;
  readonly dirty: boolean;
  readonly selectionStart?: number;
  readonly selectionEnd?: number;
  readonly activeSuggestion?: number | null;
}

export interface InvestigationQualifierUpdate {
  readonly qualifiers: readonly InvestigativeQualifierState[];
  readonly activeQualifierId?: string | null;
  readonly activeInterpretationId?: string | null;
  readonly proposedMethodAction?: string | null;
}

export interface OccurrenceSelectionResult {
  readonly session: OccurrenceInteractionSession;
  readonly blocked: boolean;
  readonly reason: "dirty-draft" | null;
}

const EMPTY_INVESTIGATION = Object.freeze({
  qualifiers: Object.freeze([]) as readonly InvestigativeQualifierState[],
  activeQualifierId: null,
  activeInterpretationId: null,
  proposedMethodAction: null,
}) satisfies ComposerInvestigationState;

function clampOffset(value: number | undefined, length: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(length, Math.trunc(value)));
}

function normalizedMediaIndex(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function freezeTarget(target: ComposerSectionTarget | null): ComposerSectionTarget | null {
  if (!target) return null;
  return Object.freeze({
    kind: target.kind,
    start: target.start,
    end: target.end,
    ...(target.index === undefined ? {} : { index: target.index }),
  });
}

function freezeQualifier(qualifier: InvestigativeQualifierState): InvestigativeQualifierState {
  return Object.freeze({
    id: qualifier.id,
    section: qualifier.section,
    start: qualifier.start,
    end: qualifier.end,
    rawText: qualifier.rawText,
    normalizedText: qualifier.normalizedText,
  });
}

function freezeInvestigation(state: ComposerInvestigationState): ComposerInvestigationState {
  return Object.freeze({
    qualifiers: Object.freeze(state.qualifiers.map(freezeQualifier)),
    activeQualifierId: state.activeQualifierId,
    activeInterpretationId: state.activeInterpretationId,
    proposedMethodAction: state.proposedMethodAction,
  });
}

function freezeComposer(state: OccurrenceComposerSessionState): OccurrenceComposerSessionState {
  return Object.freeze({
    ...state,
    activeSection: freezeTarget(state.activeSection),
    investigation: freezeInvestigation(state.investigation),
  });
}

function freezeSession(state: OccurrenceInteractionSession): OccurrenceInteractionSession {
  return Object.freeze({
    occurrenceId: state.occurrenceId,
    presentation: state.presentation,
    contentView: state.contentView,
    mediaIndex: state.mediaIndex,
    composer: freezeComposer(state.composer),
  });
}

function emptyComposer(): OccurrenceComposerSessionState {
  return Object.freeze({
    draftOwnerId: null,
    text: "",
    dirty: false,
    selectionStart: 0,
    selectionEnd: 0,
    activeSection: null,
    activeSuggestion: null,
    activeHost: null,
    mode: "authoring",
    investigation: EMPTY_INVESTIGATION,
  });
}

export function createOccurrenceInteractionSession(
  input: OccurrenceInteractionSessionInput = {},
): OccurrenceInteractionSession {
  const occurrenceId = input.occurrenceId?.trim() || null;
  const presentation =
    input.presentation ?? (occurrenceId ? ("selected" as const) : ("resting" as const));
  return freezeSession({
    occurrenceId,
    presentation: occurrenceId ? presentation : "resting",
    contentView: input.contentView ?? "context",
    mediaIndex: normalizedMediaIndex(input.mediaIndex),
    composer: emptyComposer(),
  });
}

export function setPresentation(
  session: OccurrenceInteractionSession,
  presentation: OccurrencePresentationState,
): OccurrenceInteractionSession {
  const nextPresentation = session.occurrenceId ? presentation : "resting";
  if (nextPresentation === session.presentation) return session;
  return freezeSession({ ...session, presentation: nextPresentation });
}

export function setContentView(
  session: OccurrenceInteractionSession,
  contentView: OccurrenceContentView,
): OccurrenceInteractionSession {
  if (contentView === session.contentView) return session;
  return freezeSession({ ...session, contentView });
}

export function setMediaIndex(
  session: OccurrenceInteractionSession,
  mediaIndex: number,
): OccurrenceInteractionSession {
  const next = normalizedMediaIndex(mediaIndex);
  if (next === session.mediaIndex) return session;
  return freezeSession({ ...session, mediaIndex: next });
}

export function resolveOccurrencePresentation(
  session: OccurrenceInteractionSession,
  viewport: CommittedViewportState,
): OccurrenceInteractionSession {
  if (!session.occurrenceId) return setPresentation(session, "resting");

  // Occurrence detail is owned by the persistent composer. Timeline density,
  // viewport isolation, and the legacy explicit-detail flag must never promote
  // a retained timeline card into a competing detached detail surface.
  return setPresentation(session, viewport.focused ? "focused" : "selected");
}

export function setComposerDraft(
  session: OccurrenceInteractionSession,
  update: ComposerDraftUpdate,
): OccurrenceInteractionSession {
  const selectionStart = clampOffset(update.selectionStart, update.text.length);
  const selectionEnd = Math.max(
    selectionStart,
    clampOffset(update.selectionEnd ?? selectionStart, update.text.length),
  );
  const composer = freezeComposer({
    ...session.composer,
    draftOwnerId: update.ownerId?.trim() || null,
    text: update.text,
    dirty: update.dirty,
    selectionStart,
    selectionEnd,
    activeSuggestion:
      update.activeSuggestion === undefined
        ? session.composer.activeSuggestion
        : update.activeSuggestion,
  });
  return freezeSession({ ...session, composer });
}

export function setComposerTarget(
  session: OccurrenceInteractionSession,
  target: ComposerSectionTarget | null,
): OccurrenceInteractionSession {
  if (!target) {
    if (!session.composer.activeSection) return session;
    return freezeSession({
      ...session,
      composer: freezeComposer({ ...session.composer, activeSection: null }),
    });
  }

  const start = clampOffset(target.start, session.composer.text.length);
  const end = Math.max(start, clampOffset(target.end, session.composer.text.length));
  const nextTarget = freezeTarget({
    kind: target.kind,
    start,
    end,
    ...(target.index === undefined ? {} : { index: target.index }),
  });

  return freezeSession({
    ...session,
    composer: freezeComposer({
      ...session.composer,
      activeSection: nextTarget,
      selectionStart: start,
      selectionEnd: end,
    }),
  });
}

export function activateComposerHost(
  session: OccurrenceInteractionSession,
  activeHost: OccurrenceComposerHost | null,
): OccurrenceInteractionSession {
  if (activeHost === session.composer.activeHost) return session;
  return freezeSession({
    ...session,
    composer: freezeComposer({ ...session.composer, activeHost }),
  });
}

export function setInvestigationQualifiers(
  session: OccurrenceInteractionSession,
  update: InvestigationQualifierUpdate,
): OccurrenceInteractionSession {
  const qualifiers = Object.freeze(update.qualifiers.map(freezeQualifier));
  const qualifierIds = new Set(qualifiers.map((qualifier) => qualifier.id));
  const requestedActive =
    update.activeQualifierId === undefined
      ? session.composer.investigation.activeQualifierId
      : update.activeQualifierId;
  const activeQualifierId =
    requestedActive && qualifierIds.has(requestedActive) ? requestedActive : null;

  const investigation = freezeInvestigation({
    qualifiers,
    activeQualifierId,
    activeInterpretationId:
      qualifiers.length === 0
        ? null
        : update.activeInterpretationId === undefined
          ? session.composer.investigation.activeInterpretationId
          : update.activeInterpretationId,
    proposedMethodAction:
      qualifiers.length === 0
        ? null
        : update.proposedMethodAction === undefined
          ? session.composer.investigation.proposedMethodAction
          : update.proposedMethodAction,
  });

  return freezeSession({
    ...session,
    composer: freezeComposer({
      ...session.composer,
      mode: qualifiers.length ? "investigating" : "authoring",
      investigation,
    }),
  });
}

export function switchOccurrenceSelection(
  session: OccurrenceInteractionSession,
  occurrenceId: string | null,
  options: Readonly<{ dirtyDraftPolicy?: DirtyDraftSelectionPolicy }> = {},
): OccurrenceSelectionResult {
  const nextId = occurrenceId?.trim() || null;
  if (nextId === session.occurrenceId) {
    return Object.freeze({ session, blocked: false, reason: null });
  }

  const policy = options.dirtyDraftPolicy ?? "block";
  if (session.composer.dirty && policy === "block") {
    return Object.freeze({ session, blocked: true, reason: "dirty-draft" });
  }

  const composer =
    session.composer.dirty && policy === "preserve" ? session.composer : emptyComposer();

  return Object.freeze({
    session: freezeSession({
      ...session,
      occurrenceId: nextId,
      presentation: nextId ? "selected" : "resting",
      composer,
    }),
    blocked: false,
    reason: null,
  });
}

export function completeComposerCommit(
  session: OccurrenceInteractionSession,
  result: Readonly<{ success: boolean; committedText?: string }>,
): OccurrenceInteractionSession {
  if (!result.success) return session;

  const text = result.committedText ?? session.composer.text;
  const offset = Math.min(session.composer.selectionStart, text.length);
  const end = Math.min(Math.max(offset, session.composer.selectionEnd), text.length);
  return freezeSession({
    ...session,
    composer: freezeComposer({
      ...session.composer,
      text,
      dirty: false,
      selectionStart: offset,
      selectionEnd: end,
      activeSuggestion: null,
    }),
  });
}
