import assert from "node:assert/strict";
import test from "node:test";

import {
  composerCursorSection,
  composerEditableSections,
  parseOccurrenceSentence,
} from "../site/occurrence-composer-model.ts";

test("postfix question mark marks an entity clue without becoming the canonical entity name", () => {
  const parsed = parseOccurrenceSentence("man? calls @alice");

  assert.equal(parsed.subject?.name, "man");
  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.object?.name, "@alice");
  assert.equal(parsed.investigation.qualifiers.length, 1);
  assert.deepEqual(parsed.investigation.qualifiers[0], {
    id: "subject:0:4",
    section: "subject",
    start: 0,
    end: 4,
    operatorIndex: 3,
    rawText: "man?",
    normalizedText: "man",
    scope: "section",
  });
  assert.equal(parsed.investigation.sentenceQuestion, false);
  assert.equal(parsed.investigation.hasAmbiguity, false);
});

test("canonical entity references can be identity candidates without losing their canonical reference", () => {
  const parsed = parseOccurrenceSentence("@alice? calls @bob");

  assert.equal(parsed.subject?.name, "@alice");
  assert.equal(parsed.object?.name, "@bob");
  assert.equal(parsed.investigation.qualifiers[0]?.normalizedText, "@alice");
  assert.equal(parsed.investigation.qualifiers[0]?.section, "subject");
});

test("predicate, place, time, category and tags can independently carry investigative qualifiers", () => {
  const input =
    '@alice calls? @bob at "Central Station"? on 2026-09-14? [category: witness?, tags: "red jacket"?|urgent?]';
  const parsed = parseOccurrenceSentence(input);

  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.place?.name, "Central Station");
  assert.equal(parsed.time?.start, "2026-09-14");
  assert.equal(parsed.options.category, "witness");
  assert.deepEqual(parsed.options.tags, ["red jacket", "urgent"]);

  assert.deepEqual(
    parsed.investigation.qualifiers.map((qualifier) => [
      qualifier.section,
      qualifier.normalizedText,
      qualifier.scope,
    ]),
    [
      ["predicate", "calls", "section"],
      ["place", "Central Station", "section"],
      ["time", "on 2026-09-14", "section"],
      ["category", "witness", "section"],
      ["tag", "red jacket", "section"],
      ["tag", "urgent", "section"],
    ],
  );
});

test("multiple investigative qualifiers retain independent exact source spans", () => {
  const input = 'man? observes "red jacket"? at "Central Station"? on 2026-09-14';
  const parsed = parseOccurrenceSentence(input);

  assert.deepEqual(
    parsed.investigation.qualifiers.map((qualifier) => input.slice(qualifier.start, qualifier.end)),
    ["man?", '"red jacket"?', '"Central Station"?'],
  );
  assert.deepEqual(
    parsed.investigation.qualifiers.map((qualifier) => qualifier.section),
    ["subject", "object", "place"],
  );
});

test("terminal question mark on a complete final section is explicitly ambiguous rather than guessed", () => {
  const input = "@alice calls @bob on 2026-09-14?";
  const parsed = parseOccurrenceSentence(input);

  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.time?.start, "2026-09-14");
  assert.equal(parsed.investigation.qualifiers.length, 1);
  assert.equal(parsed.investigation.qualifiers[0]?.section, "time");
  assert.equal(parsed.investigation.qualifiers[0]?.scope, "ambiguous");
  assert.equal(parsed.investigation.hasAmbiguity, true);
  assert.equal(parsed.investigation.sentenceQuestion, false);
});

test("detached terminal question mark becomes an open whole-sentence question", () => {
  const input = "@alice calls @bob [category: call] ?";
  const parsed = parseOccurrenceSentence(input);

  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.investigation.qualifiers.length, 1);
  assert.deepEqual(parsed.investigation.qualifiers[0], {
    id: "sentence:0:" + input.length,
    section: "sentence",
    start: 0,
    end: input.length,
    operatorIndex: input.length - 1,
    rawText: input,
    normalizedText: "@alice calls @bob [category: call]",
    scope: "sentence",
  });
  assert.equal(parsed.investigation.sentenceQuestion, true);
  assert.equal(parsed.investigation.hasAmbiguity, false);
});

test("quoted and escaped literal question marks do not engage investigation mode", () => {
  const quoted = parseOccurrenceSentence('"Who?" calls @bob');
  assert.equal(quoted.subject?.name, "Who?");
  assert.deepEqual(quoted.investigation.qualifiers, []);

  const escaped = parseOccurrenceSentence("who\\\\? calls @bob");
  assert.equal(escaped.investigation.qualifiers.length, 0);
});

test("question mark immediately after a quoted clue remains attached to that semantic section", () => {
  const input = '"red jacket"? calls @alice';
  const parsed = parseOccurrenceSentence(input);
  const qualifier = parsed.investigation.qualifiers[0];

  assert.equal(parsed.subject?.name, "red jacket");
  assert.equal(qualifier?.section, "subject");
  assert.equal(qualifier?.rawText, '"red jacket"?');

  const cursor = composerCursorSection(input, input.indexOf("?"));
  assert.equal(cursor.kind, "subject");
  assert.equal(cursor.text, "red jacket");
});

test("ordinary composer syntax remains unchanged and has an empty investigation projection", () => {
  const input =
    '@alice calls @bob at "Central Station" on 2026-09-14 [category: witness, tags: urgent]';
  const parsed = parseOccurrenceSentence(input);

  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.subject?.name, "@alice");
  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.object?.name, "@bob");
  assert.equal(parsed.place?.name, "Central Station");
  assert.equal(parsed.time?.start, "2026-09-14");
  assert.equal(parsed.options.category, "witness");
  assert.deepEqual(parsed.options.tags, ["urgent"]);
  assert.deepEqual(parsed.investigation.qualifiers, []);
});

test("editable sections retain ordinary source coordinates around investigative operators", () => {
  const input = 'man? calls @alice at "Central Station"? on 2026-09-14';
  const sections = composerEditableSections(input);

  const subject = sections.find((section) => section.kind === "subject");
  const place = sections.find((section) => section.kind === "place");

  assert.deepEqual(subject, { kind: "subject", start: 0, end: 3, text: "man" });
  assert.equal(input.slice(subject.start, subject.end), "man");
  assert.equal(place?.text, "Central Station");
  assert.equal(input[place.end], "?");
});

test("composer commit path refuses unresolved investigative qualifiers", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  const commit = source.match(/private commit\(\): void \{[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.match(commit, /draft\.investigation\.qualifiers\.length/);
  assert.match(commit, /Resolve or persist the investigative clue/);
});
