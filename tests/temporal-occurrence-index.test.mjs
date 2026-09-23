import assert from "node:assert/strict";
import test from "node:test";

import { createTemporalOccurrenceIndex } from "../src/projection/temporal-occurrence-index.ts";

test("TemporalOccurrenceIndex returns deterministic inclusive window queries", () => {
  const index = createTemporalOccurrenceIndex([
    { id: "later", start: 30, end: 40 },
    { id: "range", start: 0, end: 100 },
    { id: "instant-b", start: 20 },
    { id: "instant-a", start: 20 },
  ]);

  assert.equal(index.size, 4);
  assert.deepEqual(
    index.query({ time: { start: 20, end: 30 } }).map((occurrence) => occurrence.id),
    ["range", "instant-a", "instant-b", "later"],
  );
});

test("TemporalOccurrenceIndex replacement is immutable and does not mutate the prior index", () => {
  const original = createTemporalOccurrenceIndex([{ id: "a", start: 0 }]);
  const replaced = original.replace([{ id: "b", start: 10, end: 20 }]);

  assert.deepEqual(
    original.query({ time: { start: 0, end: 0 } }).map((occurrence) => occurrence.id),
    ["a"],
  );
  assert.deepEqual(
    replaced.query({ time: { start: 10, end: 20 } }).map((occurrence) => occurrence.id),
    ["b"],
  );
});
