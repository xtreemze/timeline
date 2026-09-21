import assert from "node:assert/strict";
import test from "node:test";

async function metricsModule() {
  return import("../src/performance/retained-timeline-metrics.ts");
}

test("#271 metrics keep continuous interaction and commit cost separate", async () => {
  const metrics = await metricsModule();
  const recorder = metrics.createRetainedTimelineMetrics();

  recorder.recordFrame({
    phase: "interaction",
    durationMs: 8,
    createdNodes: 0,
    destroyedNodes: 0,
    retainedNodes: 300,
  });
  recorder.recordFrame({
    phase: "interaction",
    durationMs: 12,
    createdNodes: 4,
    destroyedNodes: 0,
    retainedNodes: 304,
    bufferExpanded: true,
  });
  recorder.recordFrame({
    phase: "commit",
    durationMs: 36,
    createdNodes: 2,
    destroyedNodes: 120,
    retainedNodes: 186,
  });

  const summary = recorder.summary();
  assert.equal(summary.interaction.frameCount, 2);
  assert.equal(summary.commit.frameCount, 1);
  assert.equal(summary.interaction.destroyedNodes, 0);
  assert.equal(summary.commit.destroyedNodes, 120);
  assert.equal(summary.bufferExpansions, 1);
  assert.equal(summary.retainedPeak, 304);
});

test("#271 p95 calculation is deterministic and nearest-rank", async () => {
  const metrics = await metricsModule();
  assert.equal(typeof metrics.percentileNearestRank, "function");

  const values = Array.from({ length: 20 }, (_, index) => index + 1);
  assert.equal(metrics.percentileNearestRank(values, 0.95), 19);
  assert.equal(metrics.percentileNearestRank([...values].reverse(), 0.95), 19);
});

test("#271 wholesale chronology replacement is a machine-readable invariant violation", async () => {
  const metrics = await metricsModule();
  const recorder = metrics.createRetainedTimelineMetrics();

  recorder.recordFrame({
    phase: "interaction",
    durationMs: 9,
    createdNodes: 240,
    destroyedNodes: 240,
    retainedNodes: 240,
  });

  const summary = recorder.summary();
  assert.ok(
    summary.violations.some(
      (violation) => violation.code === "wholesale-interaction-replacement",
    ),
  );
});

test("#271 ordinary interaction with no retained-node destruction is invariant-clean", async () => {
  const metrics = await metricsModule();
  const recorder = metrics.createRetainedTimelineMetrics();

  for (const durationMs of [7, 8, 10, 9, 11]) {
    recorder.recordFrame({
      phase: "interaction",
      durationMs,
      createdNodes: 0,
      destroyedNodes: 0,
      retainedNodes: 200,
    });
  }

  assert.deepEqual(recorder.summary().violations, []);
});
