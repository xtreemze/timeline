import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained timeline preserves weighted drag response and decaying release inertia", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /TimelineMotion as motion/);
  assert.match(source, /samples:\s*Array<\{ coordinate: number; time: number \}>/);
  assert.match(source, /motion\.appendPointerSamples\(this\.pointerDrag\.samples, event, this\.orientation\)/);
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
  assert.match(source, /timeline-focus-place/);
  assert.match(source, /timeline-focus-evidence/);
  assert.match(source, /placeBackdrop\.dataset\.focusMapSlot = ""/);
  assert.match(source, /timeline-focus-section-content/);
  assert.match(source, /timeline-focus-close/);
  assert.match(source, /data-active-tab|dataset\.activeTab/);
  assert.match(source, /timelinefocusrender/);
});
