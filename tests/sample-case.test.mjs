import test from "node:test";
import assert from "node:assert/strict";

await import("../site/temporal-standards.js");
await import("../site/sample-case.js");

const sample = globalThis.TimelineSampleCase;
const temporal = globalThis.TimelineTemporal;

function storyItems(story) {
  return story.itemIds.map((id) => sample.items.find((item) => item.id === id)).filter(Boolean);
}

function storySpan(story) {
  const items = storyItems(story);
  return {
    start: Math.min(...items.map((item) => temporal.sortKey(item.time?.start || item.start))),
    end: Math.max(...items.map((item) => temporal.sortKey(item.time?.end || item.end || item.time?.start || item.start)))
  };
}

test("sample is a three-story fictional anthology with strict logical consistency", () => {
  assert.deepEqual(sample.stories.map((story) => story.title), [
    "The Three Little Pigs",
    "Snow White",
    "Cinderella"
  ]);
  assert.equal(sample.extensions?.narrative?.mode, "fictional");
  assert.equal(sample.extensions?.narrative?.validationProfile, "narrative");
  assert.equal(sample.extensions?.narrative?.forensicEvidenceRequired, false);
  assert.equal(sample.extensions?.narrative?.logicalConsistencyRequired, true);
  assert.equal(sample.extensions?.narrative?.anthology?.simultaneousStories, true);
});

test("every chronology item belongs to exactly one independently inspectable story", () => {
  const memberships = new Map(sample.items.map((item) => [item.id, 0]));
  for (const story of sample.stories) {
    assert.ok(story.itemIds.length >= 10);
    for (const id of story.itemIds) memberships.set(id, (memberships.get(id) || 0) + 1);
  }
  assert.equal(memberships.size, sample.items.length);
  for (const [id, count] of memberships) assert.equal(count, 1, id);
});

test("all three stories coexist on the same chronology and overlap during their main action", () => {
  const spans = sample.stories.map(storySpan);
  for (let i = 0; i < spans.length; i += 1) {
    for (let j = i + 1; j < spans.length; j += 1) {
      assert.ok(spans[i].end >= spans[j].start && spans[j].end >= spans[i].start);
    }
  }
  for (const story of sample.stories) {
    const labels = storyItems(story).map((item) => item.extensions?.narrative?.displayTime || "");
    assert.ok(labels.some((label) => /Day 1/i.test(label)));
    assert.ok(labels.some((label) => /Day 2/i.test(label)));
  }
});

test("sample exercises years, days, ranges, and minute-level action", () => {
  const times = sample.items.flatMap((item) => [item.start, item.end].filter(Boolean));
  const keys = times.map((value) => temporal.sortKey(value));
  const span = Math.max(...keys) - Math.min(...keys);
  assert.ok(span > 6 * 365 * 86_400_000);
  assert.ok(sample.items.some((item) => item.start.includes("T")));
  assert.ok(sample.items.some((item) => item.kind === "range" && temporal.sortKey(item.end) - temporal.sortKey(item.start) > 365 * 86_400_000));
  assert.ok(sample.items.filter((item) => item.kind === "range").length >= 6);
});

test("fictional chronology is explicitly marked instead of weakening ISO validation", () => {
  for (const item of sample.items) {
    const narrative = item.extensions?.narrative;
    assert.equal(narrative?.fictional, true);
    assert.equal(narrative?.validationProfile, "narrative");
    assert.equal(narrative?.temporalReferenceFrame, "Storybook Cycle 1000");
    assert.equal(narrative?.spatialReferenceFrame, "Storybook Realm");
    assert.ok(narrative?.displayTime);
    assert.equal(item.time?.start?.certainty, "inferred");
    assert.match(item.time?.start?.sourceText || "", /Fictional narrative ordering coordinate/);
    assert.ok(temporal.parse(item.start), item.id);
    if (item.end) {
      assert.ok(temporal.parse(item.end), item.id);
      assert.ok(temporal.sortKey(item.end) >= temporal.sortKey(item.start), item.id);
    }
  }
});

test("each story has distinct fictional geography with valid staging coordinates", () => {
  const placeSets = [];
  for (const story of sample.stories) {
    const set = new Set();
    for (const item of storyItems(story)) {
      assert.ok(item.location?.name, item.id);
      assert.match(item.location?.geographicIdentifier || "", /fictional staging anchor/);
      assert.match(item.location?.address || "", /not an Earth-location claim/);
      const coordinates = item.location?.geometry?.coordinates;
      assert.equal(coordinates?.length, 2);
      assert.ok(coordinates.every(Number.isFinite));
      set.add(item.location.name);
    }
    assert.ok(set.size >= 4);
    placeSets.push(set);
  }
  for (let i = 0; i < placeSets.length; i += 1) {
    for (let j = i + 1; j < placeSets.length; j += 1) {
      assert.deepEqual([...placeSets[i]].filter((name) => placeSets[j].has(name)), []);
    }
  }
});

test("sample exercises focus compositions, media, source surfaces, and tags", () => {
  const variants = new Set(sample.items.map((item) => item.presentation?.variant).filter(Boolean));
  assert.deepEqual([...variants].sort(), ["editorial-mosaic", "evidence-dossier", "hero-split"]);
  assert.ok(sample.items.some((item) => item.media?.length === 3));
  assert.ok(sample.items.some((item) => item.media?.length === 1));
  assert.ok(sample.items.every((item) => item.tags?.length));
  const evidenceTypes = new Set(sample.evidence.map((record) => record.type));
  assert.deepEqual([...evidenceTypes].sort(), ["article", "document", "note", "pdf"]);
  assert.ok(sample.evidence.every((record) => /fixture|Timeline demo/i.test(record.sourceName)));
});

test("the graph keeps tales separate under one anthology container", () => {
  const storyIds = new Set(sample.stories.map((story) => story.id));
  const anthologyLinks = sample.relationships.filter(
    (relationship) => relationship.subjectId === "storybook-anthology" && relationship.predicate === "containsStory"
  );
  assert.deepEqual(new Set(anthologyLinks.map((relationship) => relationship.objectId)), storyIds);

  const storyLinks = sample.relationships.filter((relationship) => storyIds.has(relationship.objectId));
  for (const story of sample.stories) {
    assert.ok(storyLinks.some(
      (relationship) => relationship.objectId === story.id && relationship.subjectId !== "storybook-anthology"
    ));
  }
});

test("each tale demonstrates an event-driven relationship lifecycle", () => {
  const dynamicIds = new Set(
    sample.relationships
      .filter((relationship) => relationship.initialState === "inactive")
      .map((relationship) => relationship.id)
  );
  assert.deepEqual(dynamicIds, new Set([
    "rel-pigs-wolf-threat",
    "rel-snow-queen-threat",
    "rel-cinderella-prince-search"
  ]));

  const changes = sample.items.flatMap((item) =>
    (item.relationChanges || []).map((change) => ({ ...change, itemId: item.id }))
  );
  for (const relationshipId of dynamicIds) {
    const lifecycle = changes.filter((change) => change.relationshipId === relationshipId);
    assert.ok(lifecycle.some((change) => change.operation === "activate"), relationshipId);
    assert.ok(lifecycle.some((change) => change.operation === "update"), relationshipId);
    assert.ok(lifecycle.some((change) => change.operation === "deactivate"), relationshipId);
  }
});

test("timed graph edges cover intervals, instants, attributes, characters, objects, and places", () => {
  const timed = sample.relationships.filter((relationship) => relationship.time?.start?.value);
  assert.ok(timed.length >= 12);
  assert.ok(timed.some((relationship) => relationship.time?.type === "interval"));
  assert.ok(timed.some((relationship) => relationship.time?.type === "instant"));
  assert.ok(timed.some((relationship) => Object.keys(relationship.attributes || {}).length > 0));
  const entityTypes = new Set(sample.entities.map((entity) => entity.type));
  for (const type of ["group", "object", "person", "place"]) assert.ok(entityTypes.has(type));
});
