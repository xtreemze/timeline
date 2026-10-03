import assert from "node:assert/strict";
import test from "node:test";

import {
  beginRetention,
  commitRetention,
  createRenderWindow,
  extendRetention,
  itemOverlapsWindow,
  queryTemporalItems,
  stableSceneKey,
  visibleIntervalAnchor,
} from "../packages/temporal-kernel/src/index.ts";

test("kernel queries point and range items by inclusive temporal overlap", () => {
  const window = { start: 400, end: 700 };
  assert.equal(itemOverlapsWindow({ id: "range", start: 0, end: 1000 }, window), true);
  assert.equal(itemOverlapsWindow({ id: "before", start: 0, end: 399 }, window), false);
  assert.equal(itemOverlapsWindow({ id: "after", start: 701 }, window), false);
  assert.equal(visibleIntervalAnchor({ id: "range", start: 0, end: 1000 }, window), 550);
});

test("kernel biases predictive overscan toward travel without unbounded growth", () => {
  const forward = createRenderWindow(
    { start: 100, end: 200 },
    {
      overscanRatio: 0.25,
      velocityTemporalPerMs: 0.5,
      predictionHorizonMs: 100,
      maxSpanMultiplier: 4,
    },
  );
  assert.ok(forward.end - 200 > 100 - forward.start);
  assert.ok(forward.end - forward.start <= 400);
});

test("kernel retention accumulates during interaction and collapses on commit", () => {
  let state = beginRetention({ start: 50, end: 250 });
  state = extendRetention(state, { start: 150, end: 350 }, { start: 200, end: 300 }, 8);
  assert.deepEqual(state, { active: true, extent: { start: 50, end: 350 } });

  assert.deepEqual(commitRetention({ start: 150, end: 350 }), {
    active: false,
    extent: { start: 150, end: 350 },
  });
});

test("kernel ordering is deterministic and does not mutate caller data", () => {
  const input = [
    { id: "b", start: 20, end: null, label: "B" },
    { id: "range", start: 0, end: 100, label: "Range" },
    { id: "a", start: 20, end: null, label: "A" },
  ];
  const before = structuredClone(input);

  assert.deepEqual(
    queryTemporalItems(input, { start: 10, end: 30 }).map((item) => item.id),
    ["range", "a", "b"],
  );
  assert.deepEqual(input, before);
});

test("kernel excludes items without finite temporal evidence instead of inventing sentinel dates", () => {
  const items = [
    { id: "known", start: 10 },
    { id: "unknown", start: Number.NaN },
  ];
  assert.deepEqual(
    queryTemporalItems(items, { start: 0, end: 20 }).map((item) => item.id),
    ["known"],
  );
});

test("stable scene keys are namespaced and reject blank identity", () => {
  assert.equal(stableSceneKey("media-edition", "edition-1"), "media-edition:edition-1");
  assert.throws(() => stableSceneKey("", "edition-1"), /namespace/i);
  assert.throws(() => stableSceneKey("media-edition", ""), /stable canonical id/i);
});
