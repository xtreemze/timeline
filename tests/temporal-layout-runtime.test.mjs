import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseStableLane,
  clusterMembershipWithHysteresis,
  geometryMeasurementKey,
  planCommittedTemporalLayout,
} from "../src/layout/temporal-layout.ts";

test("cluster hysteresis uses separate enter and exit thresholds", () => {
  const thresholds = { enterPx: 80, exitPx: 120 };
  assert.equal(clusterMembershipWithHysteresis(false, 90, thresholds), false);
  assert.equal(clusterMembershipWithHysteresis(false, 79, thresholds), true);
  assert.equal(clusterMembershipWithHysteresis(true, 100, thresholds), true);
  assert.equal(clusterMembershipWithHysteresis(true, 121, thresholds), false);
});

test("rapid reversal inside hysteresis band cannot flap cluster membership", () => {
  const thresholds = { enterPx: 80, exitPx: 120 };
  let clustered = clusterMembershipWithHysteresis(false, 79, thresholds);
  for (const distance of [84, 92, 105, 88, 117, 96]) {
    clustered = clusterMembershipWithHysteresis(clustered, distance, thresholds);
    assert.equal(clustered, true);
  }
});

test("stable lane is retained while legal", () => {
  assert.equal(chooseStableLane(2, [0, 1, 2, 3]), 2);
  assert.equal(chooseStableLane(2, [0, 1, 3]), 0);
  assert.equal(chooseStableLane(null, [3, 1, 2]), 1);
});

test("measurement identity changes only with scene identity or content revision", () => {
  const first = geometryMeasurementKey("occurrence:a", 7);
  assert.equal(first, geometryMeasurementKey("occurrence:a", 7));
  assert.notEqual(first, geometryMeasurementKey("occurrence:a", 8));
  assert.notEqual(first, geometryMeasurementKey("occurrence:b", 7));
});

test("committed layout planning is deterministic and capped at three lanes by default", () => {
  const input = {
    viewport: { start: 0, end: 1_000 },
    occurrences: [
      { id: "a", start: 100, end: null },
      { id: "b", start: 130, end: null },
      { id: "c", start: 800, end: 900 },
    ],
    previous: {
      lanes: { a: 0, b: 1, c: 0 },
      clusters: [],
    },
    measurements: {
      a: { inlineSize: 120, blockSize: 52 },
      b: { inlineSize: 120, blockSize: 76 },
      c: { inlineSize: 160, blockSize: 52 },
    },
  };

  const first = planCommittedTemporalLayout(input);
  const second = planCommittedTemporalLayout(structuredClone(input));
  assert.deepEqual(second, first);
  assert.ok(Object.values(first.lanes).every((lane) => lane >= 0 && lane <= 2));
});

test("three nearby occurrences use lanes before a fourth forces clustering", () => {
  const common = {
    viewport: { start: 0, end: 1_000 },
    pixelLength: 1_000,
    measurements: {
      a: { inlineSize: 120, blockSize: 52 },
      b: { inlineSize: 120, blockSize: 52 },
      c: { inlineSize: 120, blockSize: 52 },
      d: { inlineSize: 120, blockSize: 52 },
    },
  };
  const three = planCommittedTemporalLayout({
    ...common,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 130 },
      { id: "c", start: 160 },
    ],
  });
  assert.equal(three.clusters.length, 0);
  assert.equal(new Set(Object.values(three.lanes)).size, 3);

  const four = planCommittedTemporalLayout({
    ...common,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 130 },
      { id: "c", start: 160 },
      { id: "d", start: 190 },
    ],
  });
  assert.equal(four.clusters.length, 1);
  assert.deepEqual(four.clusters[0].itemIds, ["a", "b", "c", "d"]);
});

test("previous cluster membership survives inside exit hysteresis and splits beyond it", () => {
  const base = {
    viewport: { start: 0, end: 1_000 },
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 200 },
    ],
    previous: {
      lanes: { a: 0, b: 1 },
      clusters: [{ id: "cluster:a|b", itemIds: ["a", "b"] }],
    },
    clusterThresholds: { enterPx: 80, exitPx: 120 },
  };

  const retained = planCommittedTemporalLayout({ ...base, pixelLength: 1_000 });
  assert.equal(retained.clusters.length, 1);

  const split = planCommittedTemporalLayout({
    ...base,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 300 },
    ],
    pixelLength: 1_000,
  });
  assert.equal(split.clusters.length, 0);
});

test("measured two-line height is preserved in placement geometry", () => {
  const plan = planCommittedTemporalLayout({
    viewport: { start: 0, end: 100 },
    occurrences: [{ id: "headline", start: 50 }],
    measurements: {
      headline: { inlineSize: 180, blockSize: 76 },
    },
  });
  assert.equal(plan.placements[0].blockSize, 76);
});
