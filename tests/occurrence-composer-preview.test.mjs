import assert from "node:assert/strict";
import test from "node:test";
import { occurrenceComposerSuggestions } from "../site/occurrence-composer-model.ts";
import * as previewModule from "../site/occurrence-composer-preview.ts";
import {
  projectComposerPreview,
  projectInvestigativeQualifiers,
  proposeInvestigationAction,
  proposeInvestigationQuestion,
} from "../site/occurrence-composer-preview.ts";
import { worldNodeMarker } from "../site/world/world-node-marker.ts";
import { WORLD_DARK_PALETTE, worldNodeStyle } from "../src/layout/world-graph-style.ts";
import { canonicalSemanticHueColor } from "../src/presentation/semantic-color.ts";

const entities = [
  { id: "alice", name: "Alice", icon: "person" },
  { id: "bob", name: "Bob", icon: "child" },
];

test("composer preview uses the World marker for an entity and live icon choice", () => {
  const styled = {
    id: "alice",
    name: "Alice",
    type: "person",
    icon: "person",
    attributes: { style: { fill: "#42658a", border: "#ffffff", shape: "hexagon" } },
  };
  const expected = worldNodeMarker(
    worldNodeStyle(
      { type: styled.type, attributes: { style: { ...styled.attributes.style, icon: "pig" } } },
      WORLD_DARK_PALETTE,
    ),
  );
  assert.equal(typeof previewModule.composerWorldNodeMarker, "function");
  assert.deepEqual(
    previewModule.composerWorldNodeMarker(
      { label: "Alice", icon: "pig" },
      [styled],
      WORLD_DARK_PALETTE,
    ),
    expected,
  );
});

test("inline node style edits change the World marker before approval", () => {
  const preview = projectComposerPreview(
    "Alice(icon: pig, shape: diamond, color: #876543) meets @bob",
    entities,
  );
  const marker = previewModule.composerWorldNodeMarker(
    preview.subject,
    entities,
    WORLD_DARK_PALETTE,
  );
  const expected = worldNodeMarker(
    worldNodeStyle(
      {
        type: "person",
        attributes: {
          style: { icon: "pig", shape: "diamond", color: "#876543" },
        },
      },
      WORLD_DARK_PALETTE,
    ),
  );
  assert.deepEqual(marker, expected);
  const svg = decodeURIComponent(marker.url.split(",")[1]);
  assert.match(svg, /fill="#876543"/);
});

test("hovered category and tag suggestions appear in the preview before acceptance", () => {
  const draft = "@alice meets @bob [category: Fam";
  const category = projectComposerPreview(draft, entities, {
    kind: "category",
    label: "Family",
    insertText: "Family",
    icon: "tag",
  });
  assert.equal(category.category, "Family");
  assert.equal(projectComposerPreview(draft, entities).category, "Fam");
  const tagged = projectComposerPreview("@alice meets @bob [tags: imp", entities, {
    kind: "tag",
    label: "important",
    insertText: "important",
    icon: "tag",
  });
  assert.deepEqual(tagged.tags, ["important"]);
});

test("composer mini-world uses the same category fill and tag border semantics as World", () => {
  const categories = [
    { id: "family", name: "Family", color: "hsl(12 64% 50%)" },
    { id: "danger", name: "Danger", color: "hsl(282 64% 50%)" },
  ];
  const tags = [{ label: "witness", color: "hsl(145 64% 50%)" }];
  const preview = projectComposerPreview(
    "@alice meets @bob [categories: Family|Danger, tags: witness]",
    entities,
    null,
    [],
    categories,
    tags,
  );

  const expectedSemanticStyle = {
    fillColor: canonicalSemanticHueColor(categories[0].color),
    borderColor: canonicalSemanticHueColor(tags[0].color),
  };
  assert.deepEqual(preview.categories, ["Family", "Danger"]);
  assert.deepEqual(preview.subject?.semanticStyle, expectedSemanticStyle);
  assert.deepEqual(preview.object?.semanticStyle, expectedSemanticStyle);

  const marker = previewModule.composerWorldNodeMarker(
    preview.subject,
    entities,
    WORLD_DARK_PALETTE,
  );
  const expected = worldNodeMarker(
    worldNodeStyle(
      {
        type: "person",
        attributes: {
          style: {
            ...expectedSemanticStyle,
            icon: "person",
          },
        },
      },
      WORLD_DARK_PALETTE,
    ),
  );
  assert.deepEqual(marker, expected);
});

test("composer semantic context fills only missing authored node channels", () => {
  const styled = {
    id: "alice",
    name: "Alice",
    type: "person",
    icon: "person",
    attributes: { style: { fillColor: "#112233" } },
  };
  const preview = projectComposerPreview(
    "@alice meets @bob [category: Family, tags: witness]",
    [styled, entities[1]],
    null,
    [],
    [{ id: "family", name: "Family", color: "#b42318" }],
    [{ label: "witness", color: "hsl(145 64% 50%)" }],
  );
  const marker = previewModule.composerWorldNodeMarker(
    preview.subject,
    [styled, entities[1]],
    WORLD_DARK_PALETTE,
  );
  const expected = worldNodeMarker(
    worldNodeStyle(
      {
        type: "person",
        attributes: {
          style: {
            fillColor: "#112233",
            borderColor: canonicalSemanticHueColor("hsl(145 64% 50%)"),
            icon: "person",
          },
        },
      },
      WORLD_DARK_PALETTE,
    ),
  );
  assert.deepEqual(marker, expected);
});

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
  assert.deepEqual(unfinishedSubject.subject, { label: "Alice", icon: "pig", entityId: "alice" });
  const unfinishedTarget = projectComposerPreview("@alice meets Bob(icon: pi", entities, {
    kind: "property",
    label: "icon: pig",
    insertText: "icon: pig",
    icon: "pig",
  });
  assert.deepEqual(unfinishedTarget.object, { label: "Bob", icon: "pig", entityId: "bob" });
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
    "time",
  );
  assert.equal(
    projectInvestigativeQualifiers("@alice meets @bob on 2026-09-14?").at(-1)?.scope,
    "ambiguous",
  );
  assert.equal(
    projectInvestigativeQualifiers("@alice meets @bob on 2026-09-14?").at(-1)?.normalizedText,
    "on 2026-09-14",
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
