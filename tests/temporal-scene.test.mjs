import assert from "node:assert/strict";
import test from "node:test";

import {
  beginRetention,
  commitRetention,
  createRenderWindow,
  extendRetention,
  itemOverlapsWindow,
  occurrenceSceneKey,
  queryOccurrences,
  visibleIntervalAnchor,
} from "../src/projection/temporal-scene.ts";

test("render window overscans both sides of the logical viewport", () => {
  assert.deepEqual(
    createRenderWindow({ start: 100, end: 200 }, { overscanRatio: 0.5 }),
    { start: 50, end: 250 },
  );
});

test("render window biases overscan toward predicted pan travel", () => {
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

  const backward = createRenderWindow(
    { start: 100, end: 200 },
    {
      overscanRatio: 0.25,
      velocityTemporalPerMs: -0.5,
      predictionHorizonMs: 100,
      maxSpanMultiplier: 4,
    },
  );
  assert.ok(100 - backward.start > backward.end - 200);
});

test("ranges are selected by interval intersection even when both endpoints are outside", () => {
  const window = { start: 400, end: 700 };
  assert.equal(itemOverlapsWindow({ start: 0, end: 1000 }, window), true);
  assert.equal(itemOverlapsWindow({ start: 0, end: 399 }, window), false);
  assert.equal(itemOverlapsWindow({ start: 701, end: 900 }, window), false);
  assert.equal(visibleIntervalAnchor({ start: 0, end: 1000 }, window), 550);
});

test("interaction retention accumulates render windows and collapses on commit", () => {
  let state = beginRetention({ start: 50, end: 250 });
  state = extendRetention(state, { start: 150, end: 350 }, { start: 200, end: 300 }, 8);
  assert.equal(state.active, true);
  assert.deepEqual(state.extent, { start: 50, end: 350 });

  const committed = commitRetention({ start: 150, end: 350 });
  assert.equal(committed.active, false);
  assert.deepEqual(committed.extent, { start: 150, end: 350 });
});

test("retention window is bounded around the logical viewport", () => {
  let state = beginRetention({ start: -1000, end: 1000 });
  state = extendRetention(state, { start: -2000, end: 2000 }, { start: 100, end: 200 }, 4);
  assert.equal(state.extent.end - state.extent.start, 400);
  assert.equal((state.extent.start + state.extent.end) / 2, 150);
});

test("query keeps stable chronology ordering and scene keys use canonical ids", () => {
  const occurrences = [
    { id: "b", start: 20, end: null },
    { id: "range", start: 0, end: 100 },
    { id: "a", start: 20, end: null },
  ];
  assert.deepEqual(
    queryOccurrences(occurrences, { start: 10, end: 30 }).map((occurrence) => occurrence.id),
    ["range", "a", "b"],
  );
  assert.equal(occurrenceSceneKey("edge-1"), "occurrence:edge-1");
  assert.throws(() => occurrenceSceneKey(""), /stable canonical id/);
});
