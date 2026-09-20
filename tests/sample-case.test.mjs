import test from "node:test";
import assert from "node:assert/strict";

await import("../site/temporal-standards.js");
await import("../site/event-presentation.js");
await import("../site/sample-case.js");

const sample = globalThis.TimelineSampleCase;
const temporal = globalThis.TimelineTemporal;
const presentation = globalThis.TimelinePresentation;

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
  assert.ok(sample.items.every((item) => item.media?.length >= 2));
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


test("storybook scenes remain recognizable through distributed media and semantic icons", () => {
  const supported = new Set(presentation.ICON_NAMES);
  const requiredStoryIcons = new Set(["home", "danger", "magic", "search", "crown", "object"]);
  for (const icon of requiredStoryIcons) assert.ok(supported.has(icon), icon);

  for (const story of sample.stories) {
    const items = storyItems(story);
    const mediaItems = items.filter((item) => item.media?.length);
    const icons = new Set(items.map((item) => item.tags?.[0]?.icon).filter(Boolean));
    assert.ok(mediaItems.length >= 3, `${story.title} should expose several visual scenes`);
    assert.ok(icons.size >= 4, `${story.title} should use several distinct semantic silhouettes`);
    for (const icon of icons) assert.ok(supported.has(icon), `${story.title}: unsupported icon ${icon}`);
  }
});


test("categories classify event semantics independently from story membership", () => {
  const categoryIds = new Set(sample.categories.map((category) => category.id));
  const categoryNames = new Set(sample.categories.map((category) => category.name));
  const storyTitles = new Set(sample.stories.map((story) => story.title));

  assert.equal(sample.categories.length, 9);
  for (const title of storyTitles) assert.equal(categoryNames.has(title), false, title);
  for (const item of sample.items) assert.ok(categoryIds.has(item.categoryId), item.id);

  for (const story of sample.stories) {
    const categories = new Set(storyItems(story).map((item) => item.categoryId));
    assert.ok(categories.size >= 4, `${story.title} should span multiple event categories`);
  }

  const storyIdsByCategory = new Map(sample.categories.map((category) => [category.id, new Set()]));
  for (const item of sample.items) {
    storyIdsByCategory.get(item.categoryId)?.add(item.extensions?.narrative?.storyId);
  }
  const sharedCategories = [...storyIdsByCategory.values()].filter((storyIds) => storyIds.size > 1);
  assert.ok(sharedCategories.length >= 4, "taxonomy should be reusable across stories");

  assert.deepEqual(
    sample.categories.map((category) => category.id),
    [
      "context",
      "movement",
      "creation",
      "conflict",
      "decision",
      "discovery",
      "relationship",
      "state-change",
      "resolution"
    ]
  );
});


test("each story exposes a detailed causal sequence rather than summary-only beats", () => {
  const expectedMinimums = new Map([
    ["story-three-little-pigs", 16],
    ["story-snow-white", 20],
    ["story-cinderella", 19]
  ]);
  for (const story of sample.stories) {
    const items = storyItems(story);
    assert.ok(items.length >= expectedMinimums.get(story.id), `${story.title}: narrative depth`);
    assert.deepEqual(
      items.map((item) => item.extensions?.narrative?.sequence),
      items.map((_, index) => index + 1),
      `${story.title}: sequence numbering`
    );
    assert.ok(items.every((item) => item.description.length >= 80), `${story.title}: descriptions should carry causal context`);
  }
});

test("Three Little Pigs includes material choices, escapes, regrouping and alternate-entry escalation", () => {
  const story = sample.stories.find((candidate) => candidate.id === "story-three-little-pigs");
  const ids = new Set(story.itemIds);
  for (const id of [
    "pigs-acquire-straw",
    "pigs-acquire-sticks",
    "pigs-acquire-bricks",
    "pigs-first-flees",
    "pigs-two-flee",
    "pigs-wolf-roof"
  ]) assert.ok(ids.has(id), id);
  assert.ok(sample.entities.some((entity) => entity.id === "pigs-material-vendors"));
  assert.ok(sample.relationships.some((relationship) => relationship.id === "rel-pigs-third-bricks"));
});

test("Snow White separates the disguised attacks, recoveries, apple preparation and coffin encounter", () => {
  const story = sample.stories.find((candidate) => candidate.id === "story-snow-white");
  const ids = new Set(story.itemIds);
  for (const id of [
    "snow-forest-flight",
    "snow-laces",
    "snow-laces-recovery",
    "snow-comb",
    "snow-comb-recovery",
    "snow-apple-prepared",
    "snow-prince-arrives"
  ]) assert.ok(ids.has(id), id);
  for (const entityId of ["snow-laces-object", "snow-comb-object", "snow-coffin-object"]) {
    assert.ok(sample.entities.some((entity) => entity.id === entityId), entityId);
  }
  assert.ok(sample.relationships.some((relationship) => relationship.id === "rel-snow-prince-coffin"));
});

test("Cinderella includes household formation, practical transformation, palace encounters, flight and slipper trials", () => {
  const story = sample.stories.find((candidate) => candidate.id === "story-cinderella");
  const ids = new Set(story.itemIds);
  for (const id of [
    "cinderella-stepfamily-arrives",
    "cinderella-extra-chores",
    "cinderella-coach-created",
    "cinderella-prince-dance",
    "cinderella-first-return",
    "cinderella-midnight-flight",
    "cinderella-stepsisters-try",
    "cinderella-asks-to-try"
  ]) assert.ok(ids.has(id), id);
  for (const entityId of ["cinderella-father", "cinderella-pumpkin", "cinderella-gown", "cinderella-herald"]) {
    assert.ok(sample.entities.some((entity) => entity.id === entityId), entityId);
  }
  assert.ok(sample.relationships.some((relationship) => relationship.id === "rel-cinderella-herald-slipper"));
});

test("detailed stories add graph and place depth without conflating categories with stories", () => {
  assert.ok(sample.items.length >= 55);
  assert.ok(sample.entities.length >= 40);
  assert.ok(sample.relationships.length >= 46);
  assert.ok(sample.relationships.filter((relationship) => relationship.time?.start?.value).length >= 30);

  const storyTitles = new Set(sample.stories.map((story) => story.title));
  for (const category of sample.categories) assert.equal(storyTitles.has(category.name), false);

  const placesByStory = new Map(sample.stories.map((story) => [story.id, new Set()]));
  for (const item of sample.items) {
    placesByStory.get(item.extensions?.narrative?.storyId)?.add(item.location?.name);
  }
  for (const [storyId, places] of placesByStory) {
    assert.ok(places.size >= 5, `${storyId}: expected richer geography`);
  }
});


test("main-action chronology is spread across realistic multi-day spans without duplicate timestamps", () => {
  for (const story of sample.stories) {
    const items = storyItems(story).filter((item) => item.start.startsWith("1000-"));
    const starts = items.map((item) => temporal.sortKey(item.start));
    const spanDays = (Math.max(...starts) - Math.min(...starts)) / 86_400_000;
    assert.ok(spanDays >= 14, `${story.title}: main action should span at least two weeks`);

    const exactStarts = new Set();
    const startsPerDay = new Map();
    for (const item of items) {
      assert.equal(exactStarts.has(item.start), false, `${story.title}: duplicate exact timestamp ${item.start}`);
      exactStarts.add(item.start);
      const day = item.start.slice(0, 10);
      startsPerDay.set(day, (startsPerDay.get(day) || 0) + 1);
    }
    assert.ok(Math.max(...startsPerDay.values()) <= 3, `${story.title}: too many events compressed onto one date`);
    assert.ok(startsPerDay.size >= 8, `${story.title}: chronology should use many distinct dates`);
  }
});

test("every chronology item has public-domain illustrative media", () => {
  assert.equal(sample.items.filter((item) => item.media?.length).length, sample.items.length);
  for (const item of sample.items) {
    assert.ok(item.media.length >= 1, item.id);
    for (const media of item.media) {
      assert.match(media.src, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//, item.id);
      assert.match(media.caption || "", /Public-domain story illustration via Wikimedia Commons/i, item.id);
    }
  }
});

test("every event is a direct graph node with actor and place edges", () => {
  const itemIds = new Set(sample.items.map((item) => item.id));
  const entityIds = new Set(sample.entities.map((entity) => entity.id));
  const storyIds = new Set(sample.stories.map((story) => story.id));

  for (const id of itemIds) {
    assert.equal(entityIds.has(id), false, `item/entity graph id collision: ${id}`);
    assert.equal(storyIds.has(id), false, `item/story graph id collision: ${id}`);
  }
  for (const id of entityIds) assert.equal(storyIds.has(id), false, `entity/story graph id collision: ${id}`);

  for (const item of sample.items) {
    const edges = sample.relationships.filter(
      (relationship) => relationship.subjectId === item.id || relationship.objectId === item.id
    );
    assert.ok(edges.length >= 2, `${item.id}: expected direct graph connectivity`);
    assert.ok(edges.some((relationship) => relationship.predicate === "occursAt"), `${item.id}: place edge`);
    assert.ok(edges.some((relationship) => relationship.predicate === "participatesIn"), `${item.id}: actor edge`);

    const itemStart = temporal.sortKey(item.start);
    const itemEnd = temporal.sortKey(item.end || item.start);
    for (const edge of edges.filter((relationship) => relationship.time?.start?.value)) {
      const edgeStart = temporal.sortKey(edge.time.start.value);
      const edgeEnd = temporal.sortKey(edge.time.end?.value || edge.time.start.value);
      assert.ok(edgeEnd >= itemStart && edgeStart <= itemEnd, `${edge.id}: must overlap ${item.id}`);
    }
  }
});

test("every event place has a coordinate-backed graph node and map marker", () => {
  const placeEntities = sample.entities.filter((entity) => entity.type === "place");
  const placeIndex = new Map(
    placeEntities.map((entity) => [`${entity.attributes?.storyId}|${entity.name}`, entity])
  );
  const placesByStory = new Map(sample.stories.map((story) => [story.id, new Set()]));

  for (const item of sample.items) {
    const storyId = item.extensions?.narrative?.storyId;
    const coordinates = item.location?.geometry?.coordinates;
    assert.equal(coordinates?.length, 2, `${item.id}: marker coordinates`);
    assert.ok(coordinates.every(Number.isFinite), `${item.id}: finite marker coordinates`);

    const place = placeIndex.get(`${storyId}|${item.location.name}`);
    assert.ok(place, `${item.id}: matching place graph node`);
    assert.equal(place.attributes?.mapMarker, true, `${item.id}: map marker enabled`);
    assert.deepEqual(place.attributes?.geometry?.coordinates, coordinates, `${item.id}: graph/map coordinates match`);

    const edge = sample.relationships.find((relationship) =>
      relationship.subjectId === item.id &&
      relationship.objectId === place.id &&
      relationship.predicate === "occursAt"
    );
    assert.ok(edge, `${item.id}: occursAt relationship to marker node`);
    assert.equal(edge.attributes?.mapMarker, true, `${item.id}: relationship marks location for map use`);
    placesByStory.get(storyId)?.add(item.location.name);
  }

  assert.ok(placeEntities.length >= 27);
  for (const [storyId, places] of placesByStory) {
    assert.ok(places.size >= 8, `${storyId}: expected richer mapped geography`);
  }
});


test("widened anthology chronology keeps same-day density low across all stories", () => {
  const startsPerDay = new Map();
  for (const item of sample.items.filter((candidate) => candidate.start.startsWith("1000-"))) {
    const day = item.start.slice(0, 10);
    startsPerDay.set(day, (startsPerDay.get(day) || 0) + 1);
  }
  assert.ok(Math.max(...startsPerDay.values()) <= 3, "no synthetic date should carry more than three chronology starts");
  assert.ok([...startsPerDay.values()].filter((count) => count === 3).length <= 4, "three-event dates should remain exceptional");
});

test("every event has story, actor and place graph context", () => {
  for (const item of sample.items) {
    const edges = sample.relationships.filter(
      (relationship) => relationship.subjectId === item.id || relationship.objectId === item.id
    );
    assert.ok(edges.length >= 3, `${item.id}: expected story + actor + place connectivity`);
    assert.ok(edges.some((relationship) => relationship.predicate === "partOfStory"), `${item.id}: story edge`);
    assert.ok(edges.some((relationship) => relationship.predicate === "occursAt"), `${item.id}: place edge`);
    assert.ok(edges.some((relationship) => relationship.predicate === "participatesIn"), `${item.id}: actor edge`);
  }
});

test("every story scene carries multiple public-domain illustrations", () => {
  for (const item of sample.items) {
    assert.ok(item.media?.length >= 2, `${item.id}: at least two images`);
    const unique = new Set(item.media.map((media) => media.src));
    assert.equal(unique.size, item.media.length, `${item.id}: duplicate media source`);
  }
});

test("movement and travel-heavy events expose routes and named endpoint markers", () => {
  const routedIds = new Set([
    "pigs-leave-home",
    "pigs-first-flees",
    "pigs-two-flee",
    "snow-forest-flight",
    "snow-disguises",
    "cinderella-first-return",
    "cinderella-midnight-flight",
    "cinderella-search"
  ]);
  for (const id of routedIds) {
    const item = sample.items.find((candidate) => candidate.id === id);
    assert.ok(item, id);
    const features = item.location?.mapFeatures || [];
    assert.ok(features.some((feature) => feature.geometry?.type === "LineString"), `${id}: route line`);
    const markers = features.filter((feature) => feature.geometry?.type === "Point");
    assert.ok(markers.length >= 2, `${id}: endpoint markers`);
    assert.ok(markers.every((feature) => feature.properties?.name), `${id}: named markers`);
  }
});
