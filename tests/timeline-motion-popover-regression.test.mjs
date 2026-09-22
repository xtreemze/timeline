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
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.cancelInertia\(\)/,
  );
  assert.match(
    source,
    /if \(!this\.items\.length\) \{[\s\S]{0,900}this\.expandedClusterItemIds\.clear\(\)/,
  );
});

test("focused detail and graph partition presentation space without overlay geometry", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    html,
    /id="timeline-view"[\s\S]*id="timeline-focus-view"[\s\S]*id="graph-lens"/,
  );
  assert.doesNotMatch(html, /id="timeline-focus-view"[^>]*popover=/);
  assert.match(
    css,
    /data-viewport-orientation="landscape"[\s\S]*> \.timeline-focus-panel[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*1;/,
  );
  assert.match(
    css,
    /data-viewport-orientation="landscape"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*1;/,
  );
  assert.match(
    css,
    /data-viewport-orientation="portrait"[\s\S]*> \.timeline-focus-panel[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*1;/,
  );
  assert.match(
    css,
    /data-viewport-orientation="portrait"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*2;/,
  );
  assert.match(
    css,
    /#presentation-stage\[data-event-focused="true"\]\s*>\s*\.presentation-map-panel\s*\{[\s\S]*display:\s*none/,
  );
  assert.match(
    css,
    /\.timeline-focus-place-backdrop\s+\.presentation-map[\s\S]{0,450}pointer-events:\s*auto/,
  );
});
