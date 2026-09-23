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

test("focused sidebar emits the surviving rich presentation contract", async () => {
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
  assert.match(source, /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.cancelInertia\(\)/);
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.expandedClusterItemIds\.clear\(\)/,
  );
});

test("focused sidebar and persistent graph share layout-owned presentation space", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /#app-shell\.is-event-focused #presentation-stage\s*\{[\s\S]{0,240}display:\s*grid/,
  );
  assert.match(
    css,
    /#app-shell\.is-event-focused #presentation-stage > \.timeline-focus-sidebar:not\(\[hidden\]\)[\s\S]{0,700}position:\s*relative[\s\S]{0,700}overflow:\s*auto/,
  );
  assert.match(
    css,
    /data-timeline-orientation="horizontal"[\s\S]{0,260}grid-template-columns:\s*minmax\(0, 2fr\) minmax\(0, 3fr\)/,
  );
  assert.match(
    css,
    /data-timeline-orientation="vertical"[\s\S]{0,260}grid-template-columns:\s*minmax\(0, 5fr\) minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /\.timeline-focus-place-backdrop\s+\.presentation-map[\s\S]{0,450}pointer-events:\s*auto/,
  );
  assert.doesNotMatch(css, /\.timeline-focus-view:popover-open/);
});
