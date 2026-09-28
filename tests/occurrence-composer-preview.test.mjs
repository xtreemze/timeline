import assert from "node:assert/strict";
import test from "node:test";
import {
  projectComposerPreview,
  projectInvestigativeQualifiers,
  proposeInvestigationQuestion,
  proposeInvestigationAction,
} from "../site/occurrence-composer-preview.ts";
import { occurrenceComposerSuggestions } from "../site/occurrence-composer-model.ts";

const entities = [
  { id: "alice", name: "Alice", icon: "person" },
  { id: "bob", name: "Bob", icon: "child" },
];

test("composer preview builds the world incrementally and previews icon suggestions without committing", () => {
  const subject = projectComposerPreview("@alice", entities);
  assert.equal(subject.subject?.icon, "person");
  assert.equal(subject.edge, null);
  assert.equal(subject.object, null);

  const edge = projectComposerPreview("@alice meets", entities);
  assert.equal(edge.edge?.label, "meets");
  assert.equal(edge.object, null);

  const complete = projectComposerPreview(
    "@alice meets @bob [category: Family, tags: important]",
    entities,
  );
  assert.equal(complete.object?.icon, "child");
  assert.equal(complete.category, "Family");
  assert.deepEqual(complete.tags, ["important"]);

  const draft = "Alice(icon: pi) meets @bob";
  const preview = projectComposerPreview(draft, entities, {
    kind: "property",
    label: "icon: pig",
    insertText: "icon: pig",
    icon: "pig",
  });
  assert.equal(preview.subject?.icon, "pig");
  assert.equal(projectComposerPreview(draft, entities).subject?.icon, "person");
  const targetDraft = "@alice meets Bob(icon: pi)";
  const targetPreview = projectComposerPreview(targetDraft, entities, {
    kind: "property",
    label: "icon: pig",
    insertText: "icon: pig",
    icon: "pig",
  });
  assert.equal(targetPreview.object?.icon, "pig");
  const unfinishedSubject = projectComposerPreview("Alice(icon: pi", entities, {
    kind: "property",
    label: "icon: pig",
    insertText: "icon: pig",
    icon: "pig",
  });
  assert.deepEqual(unfinishedSubject.subject, { label: "Alice", icon: "pig" });
  const unfinishedTarget = projectComposerPreview("@alice meets Bob(icon: pi", entities, {
    kind: "property",
    label: "icon: pig",
    insertText: "icon: pig",
    icon: "pig",
  });
  assert.deepEqual(unfinishedTarget.object, { label: "Bob", icon: "pig" });
});

test("method actions stay in reasoning collections and retain falsification intent", () => {
  const text = "man? calls @alice";
  assert.deepEqual(
    ["question", "assumption", "enquiry", "falsify", "information-review"].map(
      (action) => proposeInvestigationAction(text, action)?.collection,
    ),
    ["questions", "assumptions", "linesOfEnquiry", "linesOfEnquiry", "informationReviews"],
  );
  assert.equal(proposeInvestigationAction(text, "falsify")?.record.testType, "falsify");
  assert.equal(proposeInvestigationAction(text, "information-review")?.record.finding, "unknown");
  assert.equal(proposeInvestigationAction(text, "assertion"), null);
});

test("investigation action proposes an open question, preserving the unresolved syntax", () => {
  const source = "man? calls @alice";
  const proposal = proposeInvestigationQuestion(source);
  assert.equal(proposal?.collection, "questions");
  assert.equal(proposal?.record.status, "open");
  assert.match(proposal?.record.text ?? "", /man\? calls @alice/);
  assert.equal(source, "man? calls @alice");
  assert.equal(proposeInvestigationQuestion("@bob calls @alice"), null);
});

test("icon completion offers a named visual icon to preview", () => {
  const text = "Alice(icon: pi";
  const suggestions = occurrenceComposerSuggestions(text, {
    entities: [],
    places: [],
    categories: [],
    cursorOffset: text.length,
  });
  assert.deepEqual(suggestions.find((suggestion) => suggestion.label === "icon: pig")?.icon, "pig");
});

test("known place anchors the mini world preview without inventing coordinates", () => {
  const places = [{ id: "stockholm", name: "Stockholm", longitude: 18.06, latitude: 59.33 }];
  const known = projectComposerPreview("@alice meets @bob at Stockholm", entities, null, places);
  assert.deepEqual(known.place, { label: "Stockholm", longitude: 18.06, latitude: 59.33 });
  const unknown = projectComposerPreview("@alice meets @bob at Unknown", entities, null, places);
  assert.deepEqual(unknown.place, { label: "Unknown", longitude: null, latitude: null });
});

test("unresolved clues retain exact spans and ambiguous interpretations without canonical mutation", () => {
  const text = 'man? calls @alice at "Central Station"?';
  const qualifiers = projectInvestigativeQualifiers(text);
  assert.deepEqual(
    qualifiers.map(({ kind, text }) => [kind, text]),
    [
      ["subject", "man?"],
      ["place", '"Central Station"?'],
    ],
  );
  for (const qualifier of qualifiers) {
    assert.equal(text.slice(qualifier.start, qualifier.end), qualifier.text);
  }
  assert.deepEqual(qualifiers[0].interpretations, [
    "entity type",
    "property",
    "identity",
    "descriptor",
  ]);
  assert.equal(
    projectInvestigativeQualifiers("@alice meets @bob on 2026-09-14?").at(-1)?.kind,
    "question",
  );
  assert.deepEqual(projectInvestigativeQualifiers('"what?" meets @bob'), []);
  assert.deepEqual(projectInvestigativeQualifiers('"what\\?" meets @bob'), []);
  assert.deepEqual(
    projectInvestigativeQualifiers('man? calls @alice at "Central Station"?').map(
      (entry) => entry.kind,
    ),
    ["subject", "place"],
  );
});
