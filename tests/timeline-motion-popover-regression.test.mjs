import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained timeline preserves weighted drag response and decaying release inertia", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /TimelineMotion as motion/);
  assert.match(source, /samples:\s*Array<\{ coordinate: number; time: number \}>/);
  assert.match(
    source,
    /motion\.appendPointerSamples\(this\.pointerDrag\.samples, event, this\.orientation\)/,
  );
  assert.match(source, /motion\.responseForElapsed\(now - drag\.lastTime\)/);
  assert.match(source, /motion\.estimatePointerVelocity\(drag\.samples\)/);
  assert.match(
    source,
    /Math\.abs\(releaseVelocity\) >= motion\.STOP_VELOCITY_PX_PER_MS[\s\S]*this\.startInertia\(releaseVelocity, length\)/,
  );
  assert.match(source, /startInertia\(initialVelocityPxPerMs: number, pixelLength: number\)/);
  assert.match(source, /motion\.decayVelocity\(velocity, elapsed\)/);
  assert.match(source, /this\.emitViewport\(false\)/);
  assert.match(source, /this\.inertiaAnimationFrame = requestAnimationFrame\(step\)/);
  assert.match(
    source,
    /event\.type === "pointercancel" \? 0 : motion\.estimatePointerVelocity\(drag\.samples\)/,
  );
});

test("focused popover emits the surviving rich presentation contract", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /timeline-focus-layout/);
  assert.match(source, /timeline-focus-tabs/);
  assert.match(source, /timeline-focus-hero/);
  assert.match(source, /timeline-focus-summary/);
  assert.doesNotMatch(source, /timeline-focus-place-panel/);
  assert.match(source, /timeline-focus-evidence/);
  assert.doesNotMatch(source, /timeline-focus-edit|createFocusEditButton|timelinefocusedit/);
  assert.match(source, /timeline-focus-media-control/);
  assert.match(source, /timeline-focus-close/);
  assert.match(source, /data-active-tab|dataset\.activeTab/);
  assert.match(source, /timelinefocusrender/);
});

test("empty timeline resets retained camera authority before later content loads", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /setItems\(items:[\s\S]*if \(!this\.items\.length\) \{[\s\S]{0,900}this\.viewportInitialized = false/,
  );
  assert.match(source, /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.cancelInertia\(\)/);
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.expandedClusterItemIds\.clear\(\)/,
  );
});

test("focused detail attaches to the retained card while location stays in the world view", async () => {
  const [timeline, shell] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);

  assert.match(timeline, /syncFocusAttachment\(\)/);
  assert.match(timeline, /data-focus-anchor/);
  assert.doesNotMatch(timeline, /timeline-focus-place-panel/);
  assert.match(shell, /timeline-focus-anchor-local-x/);
  assert.match(shell, /data-anchor-orientation="landscape"/);
  assert.match(shell, /data-anchor-orientation="portrait"/);
  assert.match(shell, /> \.timeline-focus-summary[\s\S]{0,160}grid-column:\s*1 \/ -1/);
});
