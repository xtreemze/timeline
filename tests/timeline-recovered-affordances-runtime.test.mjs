import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viewSource = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

test("category focus has a concrete fitVisible controller implementation", () => {
  assert.match(appSource, /timelineView\?\.fitVisible\?\.\(\)/);
  assert.match(viewSource, /fitVisible\(\): void\s*\{/);
  assert.match(
    viewSource,
    /fitVisible\(\): void\s*\{[\s\S]*this\.itemCoordinates\(\)[\s\S]*scale\.fit/,
  );
  assert.doesNotMatch(
    viewSource,
    /fitVisible\(\): void\s*\{[\s\S]{0,900}this\.allCoordinates/,
  );
});

test("Home frames visible chronology while Shift+Home frames whole context", () => {
  assert.match(
    viewSource,
    /if \(event\.key === "Home"\)[\s\S]{0,300}event\.shiftKey\s*\?\s*this\.fitAll\(\)\s*:\s*this\.fitVisible\(\)/,
  );
});

test("cluster membership changes retain mature throttled haptic feedback", () => {
  assert.match(viewSource, /clusterSignature:\s*string \| null = null/);
  assert.match(viewSource, /lastClusterHapticAt = 0/);
  assert.match(viewSource, /updateClusterHaptics\(/);
  assert.match(
    viewSource,
    /updateClusterHaptics\([\s\S]*now - this\.lastClusterHapticAt < 140[\s\S]*motion\.pulseHaptic\("cluster"\)/,
  );
  assert.match(
    viewSource,
    /reconcileCommittedLayout\([\s\S]*this\.updateClusterHaptics\(clusters\)/,
  );
});

test("initial cluster materialization does not buzz and identical membership is silent", () => {
  assert.match(
    viewSource,
    /if \(this\.clusterSignature === null\)\s*\{[\s\S]{0,180}this\.clusterSignature = signature;[\s\S]{0,80}return;/,
  );
  assert.match(viewSource, /if \(signature === this\.clusterSignature\) return;/);
});

test("timeline orientation preference survives reload while temporary orientation can opt out", () => {
  assert.match(viewSource, /const VIEW_STORAGE_KEY = "timeline:view:v1"/);
  assert.match(viewSource, /function loadViewPreferences\(/);
  assert.match(viewSource, /function saveViewPreferences\(/);
  assert.match(viewSource, /orientation: Orientation = loadViewPreferences\(\)\.orientation/);
  assert.match(
    viewSource,
    /setOrientation\([\s\S]*options:\s*\{ persist\?: boolean; focus\?: boolean \}[\s\S]*options\.persist !== false[\s\S]*saveViewPreferences/,
  );
  assert.match(appSource, /persist:\s*false/);
});
