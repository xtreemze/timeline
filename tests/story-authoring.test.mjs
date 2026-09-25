import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addItemToStory,
  auditStoryAuthoring,
  deriveStoryPlaceIds,
  narrativeStoryEpoch,
  nextNarrativeSequence,
  parseNarrativeRelativeTime,
  reconcileStoryContext,
  resolveNarrativeRelativeTime,
  storyIdsForItem,
} from "../site/story-authoring.js";

const places = [
  { id: "forest", name: "Forest", attributes: { storyId: "story-a" } },
  { id: "castle", name: "Castle" },
  { id: "village", name: "Village" },
];

test("narrative story sequencing derives the next scene number from authored metadata", () => {
  const story = { id: "story-a", itemIds: ["a1", "a2"] };
  const items = [
    { id: "a1", extensions: { narrative: { sequence: 2 } } },
    { id: "a2", extensions: { narrative: { sequence: 5 } } },
  ];

  assert.equal(nextNarrativeSequence(story, items), 6);
  assert.equal(nextNarrativeSequence({ id: "new", itemIds: [] }, items), 1);
});

test("narrative story epoch prefers an explicit synthetic epoch and otherwise uses the earliest scene", () => {
  const items = [
    { id: "a1", start: "1061-06-05T09:00Z" },
    { id: "a2", time: { start: { value: "1061-06-01T07:30Z" } } },
  ];

  assert.equal(
    narrativeStoryEpoch(
      {
        id: "story-a",
        itemIds: ["a1", "a2"],
        extensions: { narrative: { syntheticEpoch: "1061-05-30T00:00Z" } },
      },
      items,
    ),
    "1061-05-30T00:00Z",
  );
  assert.equal(
    narrativeStoryEpoch({ id: "story-a", itemIds: ["a1", "a2"] }, items),
    "1061-06-01T07:30Z",
  );
});

test("narrative-relative parser accepts day coordinates, offsets, and following dayparts", () => {
  assert.deepEqual(parseNarrativeRelativeTime("Day 3 · 18:45"), {
    kind: "day",
    day: 3,
    hour: 18,
    minute: 45,
    displayTime: "Day 3 · 18:45",
  });
  assert.deepEqual(parseNarrativeRelativeTime("two days later"), {
    kind: "offset",
    days: 2,
    displayTime: "two days later",
  });
  assert.deepEqual(parseNarrativeRelativeTime("the following evening"), {
    kind: "offset-daypart",
    days: 1,
    daypart: "evening",
    hour: 19,
    displayTime: "the following evening",
  });
  assert.equal(parseNarrativeRelativeTime("sometime later"), null);
});

test("narrative-relative time resolves to stable synthetic ISO anchors", () => {
  assert.deepEqual(
    resolveNarrativeRelativeTime("Day 3 · 18:45", {
      epoch: "1061-06-01T07:30Z",
    }),
    {
      value: "1061-06-03T18:45Z",
      precision: "minute",
      displayTime: "Day 3 · 18:45",
      intent: {
        kind: "day",
        day: 3,
        hour: 18,
        minute: 45,
        displayTime: "Day 3 · 18:45",
      },
    },
  );

  assert.equal(
    resolveNarrativeRelativeTime("two days later", {
      previousStart: "1061-06-03T18:45Z",
    }).value,
    "1061-06-05T18:45Z",
  );
  assert.equal(
    resolveNarrativeRelativeTime("the following evening", {
      previousStart: "1061-06-05",
    }).value,
    "1061-06-06T19:00Z",
  );
});

test("narrative-relative time refuses missing anchors and duplicate exact timestamps", () => {
  assert.throws(
    () => resolveNarrativeRelativeTime("Day 2"),
    /narrative epoch is required/i,
  );
  assert.throws(
    () =>
      resolveNarrativeRelativeTime("Day 2 · 09:00", {
        epoch: "1061-06-01",
        occupiedValues: ["1061-06-02T09:00Z"],
      }),
    /occupied anchor/i,
  );
});

test("story authoring derives places from contextual occurrence edges without pooling other stories", () => {
  const story = { id: "story-a", itemIds: ["a1", "a2"], placeIds: ["village"] };
  const relationships = [
    { id: "r1", itemIds: ["a1"], placeId: "castle", time: { type: "instant" } },
    { id: "r2", itemIds: ["b1"], placeId: "village", time: { type: "instant" } },
  ];

  assert.deepEqual(deriveStoryPlaceIds(story, relationships, places), ["village", "castle"]);
});

test("adding a scene to a story is additive and reconciles contextual places atomically", () => {
  const stories = [
    { id: "story-a", itemIds: ["a1"], placeIds: [] },
    { id: "story-b", itemIds: ["a2"], placeIds: [] },
  ];
  const relationships = [
    { id: "r1", itemIds: ["a1", "a3"], placeId: "castle", time: { type: "instant" } },
  ];

  const next = addItemToStory(stories, "story-a", "a3", relationships, places);
  assert.deepEqual(next[0].itemIds, ["a1", "a3"]);
  assert.deepEqual(next[0].placeIds, ["castle"]);
  assert.deepEqual(next[1], stories[1]);
  assert.deepEqual(storyIdsForItem(next, "a3"), ["story-a"]);
});

test("reconciling story context removes stale place ids while retaining manual valid places", () => {
  const story = { id: "story-a", itemIds: ["a1"], placeIds: ["village", "missing"] };
  const relationships = [
    { id: "r1", itemIds: ["a1"], placeId: "castle", time: { type: "instant" } },
  ];

  assert.deepEqual(reconcileStoryContext(story, relationships, places).placeIds, [
    "village",
    "castle",
  ]);
});

test("story-attributed places remain a legacy fallback when no stronger context exists", () => {
  const story = { id: "story-a", itemIds: ["a1"], placeIds: [] };
  assert.deepEqual(deriveStoryPlaceIds(story, [], places), ["forest"]);
});

test("story health reports only concrete context integrity gaps", () => {
  const story = { id: "story-a", itemIds: ["a1", "a2"], placeIds: ["village", "missing"] };
  const relationships = [
    { id: "r1", itemIds: ["a1"], placeId: "castle", time: null },
    { id: "r2", itemIds: ["a2"], placeId: "", time: { type: "instant" } },
    { id: "r3", itemIds: ["other"], placeId: "missing", time: null },
  ];

  const audit = auditStoryAuthoring(story, relationships, places);
  assert.equal(audit.relationshipCount, 2);
  assert.equal(audit.healthy, false);
  assert.deepEqual(
    audit.issues.map((issue) => issue.kind).sort(),
    [
      "relationship-place",
      "relationship-time",
      "story-place-reference",
      "story-place-registry",
    ].sort(),
  );
});

test("item editor exposes contextual story authoring and actionable health feedback", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="item-story-context"/);
  assert.match(html, /saving this scene also appends it to that story/);
  assert.match(app, /storyIdsForItem\(state\.stories, itemId\)/);
  assert.match(app, /addItemToStory\([\s\S]*selectedStoryId[\s\S]*item\.id/);
  assert.match(app, /reconcileStoryContext\([\s\S]*storyDraftPlaceIds/);
  assert.match(app, /auditStoryAuthoring\(story, state\.relationships, state\.places\)/);
  assert.match(app, /context valid/);
  assert.match(app, /story-health-inspector/);
  assert.match(app, /edit-story-health-edge/);
  assert.match(app, /beginGraphEdgeEdit\(relationshipId\)/);
  assert.match(app, /edit-story-health-story/);
  assert.match(app, /beginStoryEdit\(storyId\)/);
  assert.match(css, /\.story-health-inspector summary[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.story-health-row[\s\S]*grid-template-columns:/);
});
