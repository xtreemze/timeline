import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addItemToStory,
  auditStoryAuthoring,
  deriveStoryPlaceIds,
  reconcileStoryContext,
  storyIdsForItem,
} from "../site/story-authoring.js";

const places = [
  { id: "forest", name: "Forest", attributes: { storyId: "story-a" } },
  { id: "castle", name: "Castle" },
  { id: "village", name: "Village" },
];

test("story authoring derives places from contextual occurrence edges without pooling other stories", () => {
  const story = { id: "story-a", itemIds: ["a1", "a2"], placeIds: ["village"] };
  const relationships = [
    { id: "r1", itemIds: ["a1"], placeId: "castle", time: { type: "instant" } },
    { id: "r2", itemIds: ["b1"], placeId: "village", time: { type: "instant" } },
  ];

  assert.deepEqual(deriveStoryPlaceIds(story, relationships, places), [
    "village",
    "castle",
    "forest",
  ]);
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
  assert.deepEqual(next[0].placeIds, ["castle", "forest"]);
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
    "forest",
  ]);
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


test("item editor exposes contextual story authoring and health feedback", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="item-story-context"/);
  assert.match(html, /saving this scene also appends it to that story/);
  assert.match(app, /storyIdsForItem\(state\.stories, itemId\)/);
  assert.match(app, /addItemToStory\([\s\S]*selectedStoryId[\s\S]*item\.id/);
  assert.match(app, /reconcileStoryContext\([\s\S]*storyDraftPlaceIds/);
  assert.match(app, /auditStoryAuthoring\(story, state\.relationships, state\.places\)/);
  assert.match(app, /context complete/);
  assert.match(app, /context \$\{health\.issueCount === 1 \? "gap" : "gaps"\}/);
});
