import assert from "node:assert/strict";
import test from "node:test";

async function layoutModule() {
  return import("../src/layout/temporal-layout.ts");
}

test("#268 cluster hysteresis has separate enter and exit thresholds", async () => {
  const layout = await layoutModule();
  assert.equal(typeof layout.clusterMembershipWithHysteresis, "function");

  const thresholds = { enterPx: 80, exitPx: 120 };
  assert.equal(layout.clusterMembershipWithHysteresis(false, 90, thresholds), false);
  assert.equal(layout.clusterMembershipWithHysteresis(false, 79, thresholds), true);
  assert.equal(layout.clusterMembershipWithHysteresis(true, 100, thresholds), true);
  assert.equal(layout.clusterMembershipWithHysteresis(true, 121, thresholds), false);
});

test("#268 rapid reversal inside the hysteresis band cannot flap cluster membership", async () => {
  const layout = await layoutModule();
  const thresholds = { enterPx: 80, exitPx: 120 };

  let clustered = layout.clusterMembershipWithHysteresis(false, 79, thresholds);
  for (const distance of [84, 92, 105, 88, 117, 96]) {
    clustered = layout.clusterMembershipWithHysteresis(clustered, distance, thresholds);
    assert.equal(clustered, true);
  }
});

test("#268 a retained lane is reused while it remains a legal placement", async () => {
  const layout = await layoutModule();
  assert.equal(typeof layout.chooseStableLane, "function");

  assert.equal(layout.chooseStableLane(2, [0, 1, 2, 3]), 2);
  assert.equal(layout.chooseStableLane(2, [0, 1, 3]), 0);
  assert.equal(layout.chooseStableLane(null, [3, 1, 2]), 1);
});

test("#268 geometry measurement identity changes only with scene identity or content revision", async () => {
  const layout = await layoutModule();
  assert.equal(typeof layout.geometryMeasurementKey, "function");

  const first = layout.geometryMeasurementKey("occurrence:a", 7);
  assert.equal(first, layout.geometryMeasurementKey("occurrence:a", 7));
  assert.notEqual(first, layout.geometryMeasurementKey("occurrence:a", 8));
  assert.notEqual(first, layout.geometryMeasurementKey("occurrence:b", 7));
});

test("#268 committed layout planning is deterministic for fixed inputs", async () => {
  const layout = await layoutModule();
  assert.equal(typeof layout.planCommittedTemporalLayout, "function");

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

  const first = layout.planCommittedTemporalLayout(input);
  const second = layout.planCommittedTemporalLayout(structuredClone(input));

  assert.deepEqual(second, first);
});
