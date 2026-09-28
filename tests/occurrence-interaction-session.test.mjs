import assert from "node:assert/strict";
import test from "node:test";

import {
  activateComposerHost,
  completeComposerCommit,
  createOccurrenceInteractionSession,
  resolveOccurrencePresentation,
  setComposerDraft,
  setComposerTarget,
  setContentView,
  setInvestigationQualifiers,
  setMediaIndex,
  setPresentation,
  switchOccurrenceSelection,
} from "../site/occurrence-interaction-session.ts";

test("occurrence interaction session keeps presentation, content, media and authoring state orthogonal", () => {
  const initial = createOccurrenceInteractionSession({ occurrenceId: "occ-1" });
  const withEvidence = setContentView(initial, "evidence");
  const withMedia = setMediaIndex(withEvidence, 3);
  const withDraft = setComposerDraft(withMedia, {
    ownerId: "occ-1",
    text: "@alice calls @bob",
    dirty: true,
    selectionStart: 7,
    selectionEnd: 12,
  });
  const targeted = setComposerTarget(withDraft, {
    kind: "predicate",
    start: 7,
    end: 12,
  });
  const expanded = setPresentation(targeted, "expanded");

  assert.equal(expanded.occurrenceId, "occ-1");
  assert.equal(expanded.presentation, "expanded");
  assert.equal(expanded.contentView, "evidence");
  assert.equal(expanded.mediaIndex, 3);
  assert.equal(expanded.composer.text, "@alice calls @bob");
  assert.equal(expanded.composer.dirty, true);
  assert.deepEqual(expanded.composer.activeSection, {
    kind: "predicate",
    start: 7,
    end: 12,
  });
});

test("committed logical viewport controls density expansion while explicit open remains an override", () => {
  let session = createOccurrenceInteractionSession({ occurrenceId: "occ-1" });
  session = setPresentation(session, "focused");

  session = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-1", "occ-2"],
    focused: true,
  });
  assert.equal(session.presentation, "focused");

  session = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-1"],
    focused: true,
  });
  assert.equal(session.presentation, "expanded");

  session = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-1", "occ-2"],
    demotionOccurrenceIds: ["occ-1"],
    focused: true,
  });
  assert.equal(
    session.presentation,
    "expanded",
    "hysteresis keeps an already-expanded card open while a neighbor only touches the outer boundary",
  );

  session = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-1", "occ-2"],
    demotionOccurrenceIds: ["occ-1", "occ-2"],
    focused: true,
  });
  assert.equal(session.presentation, "focused");

  session = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-1", "occ-2"],
    explicitDetailOpen: true,
    focused: true,
  });
  assert.equal(session.presentation, "expanded");
});

test("coincident occurrences never qualify as density-isolated", () => {
  const session = createOccurrenceInteractionSession({
    occurrenceId: "occ-a",
    presentation: "focused",
  });

  const resolved = resolveOccurrencePresentation(session, {
    logicalOccurrenceIds: ["occ-a", "occ-b"],
    focused: true,
  });

  assert.equal(resolved.presentation, "focused");
});

test("dirty draft blocks cross-occurrence selection unless caller chooses an explicit policy", () => {
  const dirty = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: "@alice calls @bob",
      dirty: true,
      selectionStart: 0,
      selectionEnd: 0,
    },
  );

  const blocked = switchOccurrenceSelection(dirty, "occ-2");
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.reason, "dirty-draft");
  assert.strictEqual(blocked.session, dirty);

  const preserved = switchOccurrenceSelection(dirty, "occ-2", {
    dirtyDraftPolicy: "preserve",
  });
  assert.equal(preserved.blocked, false);
  assert.equal(preserved.session.occurrenceId, "occ-2");
  assert.equal(preserved.session.composer.draftOwnerId, "occ-1");
  assert.equal(preserved.session.composer.text, "@alice calls @bob");
  assert.equal(preserved.session.composer.dirty, true);

  const discarded = switchOccurrenceSelection(dirty, "occ-2", {
    dirtyDraftPolicy: "discard",
  });
  assert.equal(discarded.blocked, false);
  assert.equal(discarded.session.occurrenceId, "occ-2");
  assert.equal(discarded.session.composer.dirty, false);
  assert.equal(discarded.session.composer.text, "");
  assert.equal(discarded.session.composer.draftOwnerId, null);
});

test("selecting the same occurrence is idempotent even with a dirty draft", () => {
  const dirty = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: "@alice calls @bob",
      dirty: true,
      selectionStart: 4,
      selectionEnd: 4,
    },
  );

  const result = switchOccurrenceSelection(dirty, "occ-1");
  assert.equal(result.blocked, false);
  assert.strictEqual(result.session, dirty);
});

test("moving the active composer host preserves one authoritative draft and native selection", () => {
  let session = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: '@alice calls "Bob Smith"',
      dirty: true,
      selectionStart: 7,
      selectionEnd: 12,
      activeSuggestion: 2,
    },
  );
  session = activateComposerHost(session, "footer");
  const card = activateComposerHost(session, "card");

  assert.equal(card.composer.activeHost, "card");
  assert.equal(card.composer.text, session.composer.text);
  assert.equal(card.composer.selectionStart, 7);
  assert.equal(card.composer.selectionEnd, 12);
  assert.equal(card.composer.activeSuggestion, 2);
  assert.equal(card.composer.dirty, true);

  const footerAgain = activateComposerHost(card, "footer");
  assert.equal(footerAgain.composer.activeHost, "footer");
  assert.equal(footerAgain.composer.text, session.composer.text);
  assert.equal(footerAgain.composer.activeSuggestion, 2);
});

test("investigative qualifiers live in the same composer session and survive unrelated view changes", () => {
  let session = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: 'man? calls @alice at "Central Station"?',
      dirty: true,
      selectionStart: 0,
      selectionEnd: 4,
    },
  );

  session = setInvestigationQualifiers(session, {
    qualifiers: [
      {
        id: "q-subject",
        section: "subject",
        start: 0,
        end: 4,
        rawText: "man?",
        normalizedText: "man",
      },
      {
        id: "q-place",
        section: "place",
        start: 21,
        end: 39,
        rawText: '"Central Station"?',
        normalizedText: "Central Station",
      },
    ],
    activeQualifierId: "q-subject",
    activeInterpretationId: "literal-descriptor",
    proposedMethodAction: "compare-candidates",
  });

  session = setMediaIndex(setContentView(session, "evidence"), 2);
  session = activateComposerHost(session, "card");

  assert.equal(session.composer.mode, "investigating");
  assert.equal(session.composer.activeHost, "card");
  assert.equal(session.contentView, "evidence");
  assert.equal(session.mediaIndex, 2);
  assert.equal(session.composer.investigation.qualifiers.length, 2);
  assert.equal(session.composer.investigation.activeQualifierId, "q-subject");
  assert.equal(session.composer.investigation.activeInterpretationId, "literal-descriptor");
  assert.equal(session.composer.investigation.proposedMethodAction, "compare-candidates");
  assert.equal(session.composer.text, 'man? calls @alice at "Central Station"?');
});

test("clearing investigative qualifiers returns the same draft to ordinary authoring mode", () => {
  let session = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: "man? calls @alice",
      dirty: true,
      selectionStart: 0,
      selectionEnd: 4,
    },
  );
  session = setInvestigationQualifiers(session, {
    qualifiers: [
      {
        id: "q-subject",
        section: "subject",
        start: 0,
        end: 4,
        rawText: "man?",
        normalizedText: "man",
      },
    ],
    activeQualifierId: "q-subject",
  });

  const ordinary = setInvestigationQualifiers(session, { qualifiers: [] });
  assert.equal(ordinary.composer.mode, "authoring");
  assert.equal(ordinary.composer.text, "man? calls @alice");
  assert.equal(ordinary.composer.dirty, true);
  assert.deepEqual(ordinary.composer.investigation.qualifiers, []);
});

test("failed commit preserves the draft while successful commit clears dirty state", () => {
  const session = setComposerDraft(
    createOccurrenceInteractionSession({ occurrenceId: "occ-1" }),
    {
      ownerId: "occ-1",
      text: "@alice calls @bob",
      dirty: true,
      selectionStart: 17,
      selectionEnd: 17,
    },
  );

  const failed = completeComposerCommit(session, { success: false });
  assert.strictEqual(failed, session);

  const committed = completeComposerCommit(session, {
    success: true,
    committedText: "@alice calls @bob",
  });
  assert.equal(committed.composer.dirty, false);
  assert.equal(committed.composer.text, "@alice calls @bob");
  assert.equal(committed.composer.draftOwnerId, "occ-1");
});
