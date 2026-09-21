import assert from "node:assert/strict";
import test from "node:test";

import * as scene from "../src/projection/temporal-scene.ts";

test("#267 tick identity is canonical time identity, not mutable display text", () => {
  assert.equal(typeof scene.tickSceneKey, "function");
  const first = scene.tickSceneKey({ unit: "year", value: 1_704_067_200_000 });
  const second = scene.tickSceneKey({
    unit: "year",
    value: 1_704_067_200_000,
    label: "2024",
  });

  assert.equal(first, second);
  assert.equal(first, "tick:year:1704067200000");
});

test("#267 temporal accent identity is stable when formatting changes", () => {
  assert.equal(typeof scene.temporalAccentSceneKey, "function");
  const first = scene.temporalAccentSceneKey({
    kind: "year",
    time: 1_704_067_200_000,
    label: "2024",
  });
  const second = scene.temporalAccentSceneKey({
    kind: "year",
    time: 1_704_067_200_000,
    label: "2024 CE",
  });

  assert.equal(first, second);
  assert.equal(first, "accent:year:1704067200000");
});

test("#267 relationship-band identity resolves to the canonical relationship id", () => {
  assert.equal(typeof scene.relationshipBandSceneKey, "function");
  assert.equal(scene.relationshipBandSceneKey(" rel-17 "), "relationship-band:rel-17");
  assert.throws(
    () => scene.relationshipBandSceneKey(""),
    /stable canonical relationship id/i,
  );
});

test("#267 retained context uses the same range intersection invariant as occurrences", () => {
  const renderWindow = { start: 400, end: 700 };
  assert.equal(
    scene.itemOverlapsWindow({ start: 0, end: 1_000 }, renderWindow),
    true,
  );
  assert.equal(
    scene.itemOverlapsWindow({ start: 0, end: 399 }, renderWindow),
    false,
  );
});

test("#267 interaction retention is bounded and commit collapses to the authoritative buffer", () => {
  let retention = scene.beginRetention({ start: 0, end: 200 });
  retention = scene.extendRetention(
    retention,
    { start: 100, end: 400 },
    { start: 150, end: 250 },
    4,
  );

  assert.equal(retention.active, true);
  assert.ok(retention.extent.end - retention.extent.start <= 400);

  const committed = scene.commitRetention({ start: 100, end: 300 });
  assert.deepEqual(committed, {
    active: false,
    extent: { start: 100, end: 300 },
  });
});
