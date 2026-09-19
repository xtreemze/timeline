import test from "node:test";
import assert from "node:assert/strict";

await import("../site/sample-case.js");

const sample = globalThis.TimelineSampleCase;

function dateValue(value) {
  return Date.parse(value.length === 10 ? value + "T00:00:00Z" : value);
}

function storySpanMs(story) {
  const items = story.itemIds.map((id) => sample.items.find((item) => item.id === id)).filter(Boolean);
  const starts = items.map((item) => dateValue(item.start));
  const ends = items.map((item) => dateValue(item.end || item.start));
  return Math.max(...ends) - Math.min(...starts);
}

test("sample contains five simultaneous stories spanning day, months, and years", () => {
  assert.equal(sample.stories.length, 5);
  const spans = sample.stories.map(storySpanMs);
  const day = 86_400_000;
  assert.ok(spans.some((span) => span < day));
  assert.ok(spans.some((span) => span >= day * 60 && span < day * 730));
  assert.ok(spans.some((span) => span >= day * 365 * 2));
});

test("sample uses exactly three recurring geographic locations", () => {
  const places = new Set(sample.items.map((item) => item.location?.name).filter(Boolean));
  assert.deepEqual([...places].sort(), ["Copenhagen", "Malmö", "Stockholm"]);
});

test("three people groups explicitly connect to all five story graph nodes", () => {
  const groups = sample.entities.filter((entity) => entity.type === "group");
  assert.equal(groups.length, 3);
  const storyIds = new Set(sample.stories.map((story) => story.id));
  const covered = new Set();
  for (const relationship of sample.relationships) {
    if (groups.some((group) => group.id === relationship.subjectId) && storyIds.has(relationship.objectId)) {
      covered.add(relationship.objectId);
    }
  }
  assert.deepEqual([...covered].sort(), [...storyIds].sort());
  for (const group of groups) {
    const members = sample.relationships.filter(
      (relationship) => relationship.predicate === "memberOf" && relationship.objectId === group.id
    );
    assert.equal(members.length, 3);
  }
});

test("sample exercises all three focus compositions and evidence source types", () => {
  const variants = new Set(sample.items.map((item) => item.presentation?.variant).filter(Boolean));
  assert.deepEqual([...variants].sort(), ["editorial-mosaic", "evidence-dossier", "hero-split"]);
  const evidenceTypes = new Set(sample.evidence.map((record) => record.type));
  for (const type of ["article", "pdf", "note", "document"]) assert.ok(evidenceTypes.has(type));
  assert.ok(sample.items.some((item) => item.evidenceIds?.length >= 2));
  assert.ok(sample.items.some((item) => item.media?.length === 3));
});

test("sample defaults use case-oriented categories", () => {
  const names = new Set(sample.categories.map((category) => category.name));
  for (const name of [
    "Incident",
    "Witness / Interview",
    "Communication",
    "Evidence",
    "Document / Record",
    "Decision / Action",
    "Transaction",
    "Observation"
  ]) assert.ok(names.has(name));
});
