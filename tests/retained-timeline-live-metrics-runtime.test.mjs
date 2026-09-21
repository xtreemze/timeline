import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained renderer records interaction and commit frames without changing layout semantics", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /createRetainedTimelineMetrics\(\)/);
  assert.match(source, /const phase = this\.retention\.active \? "interaction" : "commit"/);
  assert.match(source, /this\.metrics\.recordFrame\(\{/);
  assert.match(source, /retainedNodes: this\.retainedSceneNodeCount\(\)/);
  assert.match(source, /bufferExpanded:/);
  assert.match(source, /plannerDurationMs: this\.framePlannerDurationMs/);
  assert.match(source, /queryDurationMs: this\.frameQueryDurationMs/);
  assert.match(source, /dirtyMeasurements: this\.frameDirtyMeasurements/);
});

test("planner and query timing remain separately attributed", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /const plannerStartedAt = performance\.now\(\)/);
  assert.match(
    source,
    /this\.framePlannerDurationMs \+= performance\.now\(\) - plannerStartedAt/,
  );
  assert.match(source, /const queryStartedAt = performance\.now\(\)/);
  assert.match(
    source,
    /this\.frameQueryDurationMs \+= performance\.now\(\) - queryStartedAt/,
  );
});

test("scene object creation and commit-time destruction are observable", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /noteSceneCreated\(count = 1\)/);
  assert.match(source, /noteSceneDestroyed\(count = 1\)/);
  assert.match(source, /this\.noteSceneCreated\(\)/);
  assert.match(source, /this\.noteSceneDestroyed\(\)/);
  assert.match(source, /getPerformanceSummary\(\)/);
  assert.match(source, /timelineperformancemetrics/);
});

test("frame counters reset after recording so reconciliation work carries into the next commit sample", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const recordIndex = source.indexOf("this.metrics.recordFrame({");
  const resetIndex = source.indexOf("this.framePlannerDurationMs = 0;", recordIndex);
  const renderIndex = source.indexOf("render(): void");

  assert.ok(recordIndex > renderIndex);
  assert.ok(resetIndex > recordIndex);
  assert.doesNotMatch(
    source.slice(renderIndex, recordIndex),
    /this\.framePlannerDurationMs = 0;/,
  );
});
