import test from "node:test";
import assert from "node:assert/strict";

await import("../site/temporal-standards.js");
await import("../site/event-presentation.js");
await import("../site/spatial.js");
await import("../site/timeline-graph.js");
await import("../site/sample-case.js");

const sample = globalThis.TimelineSampleCase;
const temporal = globalThis.TimelineTemporal;
const presentation = globalThis.TimelinePresentation;
const graph = globalThis.TimelineGraph;
const spatial = globalThis.TimelineSpatial;

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

test("each story has distinct reusable fictional places referenced by edges", () => {
  const placeById = new Map(sample.places.map((place) => [place.id, place]));
  const placeSets = [];
  for (const story of sample.stories) {
    const set = new Set();
    for (const item of storyItems(story)) {
      assert.equal("location" in item, false, `${item.id}: chronology item must not copy location`);
      const edges = sample.relationships.filter((relationship) => (relationship.itemIds || []).includes(item.id));
      const places = edges.map((edge) => placeById.get(edge.placeId)).filter(Boolean);
      assert.ok(places.length >= 1, `${item.id}: contextual edge place`);
      for (const place of places) {
        assert.match(place.geographicIdentifier || "", /fictional staging anchor/);
        assert.ok(place.geometry, `${place.id}: geometry`);
        assert.ok(presentation.ICON_NAMES.includes(place.icon), `${place.id}: semantic icon`);
        assert.ok(spatial.PLACE_MARKER_SHAPES.includes(place.markerShape), `${place.id}: marker shape`);
        set.add(place.name);
      }
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

test("the anthology keeps tales separate through narrative membership, not graph topology", () => {
  const storyIds = new Set(sample.stories.map((story) => story.id));
  const allStoryItems = new Set();

  for (const story of sample.stories) {
    assert.ok(story.itemIds.length > 0, story.id);
    for (const itemId of story.itemIds) {
      assert.equal(allStoryItems.has(itemId), false, `${itemId}: each fixture scene belongs to one tale`);
      allStoryItems.add(itemId);
    }
  }

  assert.equal(allStoryItems.size, sample.items.length);
  assert.ok(sample.relationships.every(
    (relationship) => !storyIds.has(relationship.subjectId) && !storyIds.has(relationship.objectId)
  ));
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

test("timed graph edges cover intervals, instants, attributes, entities, and reusable places", () => {
  const timed = sample.relationships.filter((relationship) => relationship.time?.start?.value);
  assert.ok(timed.length >= 12);
  assert.ok(timed.some((relationship) => relationship.time?.type === "interval"));
  assert.ok(timed.some((relationship) => relationship.time?.type === "instant"));
  assert.ok(timed.some((relationship) => Object.keys(relationship.attributes || {}).length > 0));
  const entityTypes = new Set(sample.entities.map((entity) => entity.type));
  for (const type of ["group", "object", "person"]) assert.ok(entityTypes.has(type));
  assert.equal(entityTypes.has("place"), false);
  assert.ok(sample.places.length >= 27);
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
  const placeById = new Map(sample.places.map((place) => [place.id, place]));
  for (const item of sample.items) {
    const storyId = item.extensions?.narrative?.storyId;
    for (const relationship of sample.relationships.filter((edge) => (edge.itemIds || []).includes(item.id))) {
      const place = placeById.get(relationship.placeId);
      if (place) placesByStory.get(storyId)?.add(place.name);
    }
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

test("chronology items remain edge context and never become graph nodes", () => {
  const itemIds = new Set(sample.items.map((item) => item.id));
  const entityIds = new Set(sample.entities.map((entity) => entity.id));
  const storyIds = new Set(sample.stories.map((story) => story.id));

  assert.deepEqual(graph.validateGraphInput(sample), []);

  for (const relationship of sample.relationships) {
    assert.ok(entityIds.has(relationship.subjectId), `${relationship.id}: subject must be an entity node`);
    assert.ok(entityIds.has(relationship.objectId), `${relationship.id}: object must be an entity node`);
    assert.equal(itemIds.has(relationship.subjectId), false, `${relationship.id}: event cannot be a subject node`);
    assert.equal(itemIds.has(relationship.objectId), false, `${relationship.id}: event cannot be an object node`);
    assert.equal(storyIds.has(relationship.subjectId), false, `${relationship.id}: story cannot be a subject node`);
    assert.equal(storyIds.has(relationship.objectId), false, `${relationship.id}: story cannot be an object node`);
    assert.equal(graph.validateActionPredicate(relationship.predicate).valid, true, `${relationship.id}: specific action predicate`);
  }

  for (const item of sample.items) {
    const edges = sample.relationships.filter(
      (relationship) => (relationship.itemIds || []).includes(item.id)
    );
    assert.ok(edges.length >= 1, `${item.id}: expected at least one semantic action edge`);

    const itemStart = temporal.sortKey(item.start);
    const itemEnd = temporal.sortKey(item.end || item.start);
    for (const edge of edges.filter((relationship) => relationship.time?.start?.value)) {
      const edgeStart = temporal.sortKey(edge.time.start.value);
      const edgeEnd = temporal.sortKey(edge.time.end?.value || edge.time.start.value);
      assert.ok(edgeEnd >= itemStart && edgeStart <= itemEnd, `${edge.id}: must overlap ${item.id}`);
    }
  }

  const orb = graph.toOrbGraph(sample);
  assert.equal(orb.nodes.length, sample.entities.length);
  assert.ok(orb.nodes.every((node) => entityIds.has(node.id)));
});

test("places are reusable spatial records and never graph nodes", () => {
  const placeIds = new Set(sample.places.map((place) => place.id));
  const entityIds = new Set(sample.entities.map((entity) => entity.id));
  assert.ok(sample.places.length >= 27);
  assert.ok(sample.entities.every((entity) => entity.type !== "place" && entity.type !== "location"));

  for (const place of sample.places) {
    assert.equal(entityIds.has(place.id), false, `${place.id}: place ID must not be a graph node`);
    assert.ok(place.geometry, `${place.id}: geometry`);
    assert.ok(presentation.ICON_NAMES.includes(place.icon), `${place.id}: icon`);
    assert.ok(spatial.PLACE_MARKER_SHAPES.includes(place.markerShape), `${place.id}: shape`);
  }
  assert.ok(sample.places.some((place) => Number.isFinite(place.radiusMeters) && place.radiusMeters > 0), "radius example");
  assert.ok(sample.places.some((place) => ["Polygon", "MultiPolygon"].includes(place.geometry?.type)), "area example");

  for (const item of sample.items) {
    assert.equal("location" in item, false, `${item.id}: no duplicated item location`);
    const edges = sample.relationships.filter((edge) => (edge.itemIds || []).includes(item.id));
    assert.ok(edges.some((edge) => placeIds.has(edge.placeId)), `${item.id}: edge references canonical place`);
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

test("story membership stays narrative metadata rather than generic graph topology", () => {
  const storyIds = new Set(sample.stories.map((story) => story.id));
  for (const story of sample.stories) {
    assert.ok(story.itemIds.length > 0, `${story.id}: narrative membership retained`);
    for (const itemId of story.itemIds) {
      assert.ok(sample.items.some((item) => item.id === itemId), `${story.id}: known chronology item ${itemId}`);
    }
  }
  assert.ok(sample.relationships.every(
    (relationship) => !storyIds.has(relationship.subjectId) && !storyIds.has(relationship.objectId)
  ));
});

test("every story scene carries multiple public-domain illustrations", () => {
  for (const item of sample.items) {
    assert.ok(item.media?.length >= 2, `${item.id}: at least two images`);
    const unique = new Set(item.media.map((media) => media.src));
    assert.equal(unique.size, item.media.length, `${item.id}: duplicate media source`);
  }
});

test("movement-heavy events keep movement in the action label and place in edge context", () => {
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
  const placeIds = new Set(sample.places.map((place) => place.id));
  for (const id of routedIds) {
    const edges = sample.relationships.filter((edge) => (edge.itemIds || []).includes(id));
    assert.ok(edges.length >= 1, id);
    assert.ok(edges.some((edge) => placeIds.has(edge.placeId)), `${id}: canonical place reference`);
    assert.ok(edges.every((edge) => !/(At|Near|During|Via|Along|Toward|From|Into|Onto|In)$/.test(edge.predicate)), `${id}: no spatial suffix in predicate`);
  }
});
