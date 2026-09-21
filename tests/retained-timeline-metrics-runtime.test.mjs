import assert from "node:assert/strict";
import test from "node:test";

import {
  createRetainedTimelineMetrics,
  percentileNearestRank,
} from "../src/performance/retained-timeline-metrics.ts";

test("metrics keep continuous interaction and commit cost separate", () => {
  const recorder = createRetainedTimelineMetrics();

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

test("p95 calculation is deterministic and nearest-rank", () => {
  const values = Array.from({ length: 20 }, (_, index) => index + 1);
  assert.equal(percentileNearestRank(values, 0.95), 19);
  assert.equal(percentileNearestRank([...values].reverse(), 0.95), 19);
});

test("wholesale chronology replacement is a machine-readable invariant violation", () => {
  const recorder = createRetainedTimelineMetrics();

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

test("ordinary interaction with no retained-node destruction is invariant-clean", () => {
  const recorder = createRetainedTimelineMetrics();

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

test("planner, query, dirty geometry and long tasks remain phase-attributed", () => {
  const recorder = createRetainedTimelineMetrics();
  recorder.recordFrame({
    phase: "commit",
    durationMs: 20,
    createdNodes: 3,
    destroyedNodes: 2,
    retainedNodes: 100,
    plannerDurationMs: 4,
    queryDurationMs: 2,
    dirtyMeasurements: 7,
    longTasks: 1,
  });

  const summary = recorder.summary();
  assert.equal(summary.commit.plannerDurationMs, 4);
  assert.equal(summary.commit.queryDurationMs, 2);
  assert.equal(summary.commit.dirtyMeasurements, 7);
  assert.equal(summary.commit.longTasks, 1);
  assert.equal(summary.interaction.plannerDurationMs, 0);
});
