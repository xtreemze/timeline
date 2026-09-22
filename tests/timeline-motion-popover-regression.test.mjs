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


test("empty timeline resets retained camera authority before later content loads", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /setItems\(items:[\s\S]*if \(!this\.items\.length\) \{[\s\S]{0,900}this\.viewportInitialized = false/,
  );
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.cancelInertia\(\)/,
  );
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.expandedClusterItemIds\.clear\(\)/,
  );
});

test("persistent graph owns the complementary canvas while focused place uses interactive map space", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /#presentation-stage\s*>\s*\.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]{0,500}position:\s*absolute/,
  );
  assert.match(
    css,
    /\.timeline-view\[data-orientation="landscape"\]\s*>\s*\.timeline-focus-view:popover-open\s*\{[\s\S]{0,500}inline-size:\s*min\(640px,/,
  );
  assert.match(
    css,
    /\.timeline-focus-place\s+\.timeline-focus-section-content\s*\{[\s\S]{0,300}width:\s*min\(48%,\s*18rem\)/,
  );
  assert.match(
    css,
    /\.timeline-focus-place-backdrop\s+\.presentation-map[\s\S]{0,450}pointer-events:\s*auto/,
  );
});
