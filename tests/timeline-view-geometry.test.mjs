import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/time-scale-shim.ts");
await import("../site/timeline-clustering-shim.ts");
await import("../site/timeline-motion-shim.ts");
await import("../site/event-presentation-shim.ts");
await import("../site/timeline-view-shim.ts");

const geometry = globalThis.TimelineView.geometry;

test("connector segment reaches the axis exactly from either side", () => {
  assert.deepEqual(geometry.connectorSegment(100, 40), { offset: 0, length: 60 });
  assert.deepEqual(geometry.connectorSegment(40, 100), { offset: -60, length: 60 });
  assert.deepEqual(geometry.connectorSegment(75, 75), { offset: 0, length: 0 });
});

test("connector routing keeps the canonical axis anchor while offsetting orthogonal terminals inward", () => {
  assert.equal(geometry.connectorRouteOffset("straight", 160, 320, 0), 0);
  assert.equal(geometry.connectorRouteOffset("orthogonal", 160, 320, 0), 22);
  assert.equal(geometry.connectorRouteOffset("orthogonal", 160, 320, 1), -22);

  const nearStart = geometry.connectorRouteOffset("orthogonal", 4, 320, 1);
  const nearEnd = geometry.connectorRouteOffset("orthogonal", 316, 320, 0);
  assert.ok(nearStart > 0);
  assert.ok(nearEnd < 0);
  assert.ok(4 + nearStart >= 32);
  assert.ok(316 + nearEnd <= 288);
});

test("wheel zoom is deliberately capped and symmetric enough for fine control", () => {
  const zoomOut = geometry.wheelZoomFactor(1000);
  const zoomIn = geometry.wheelZoomFactor(-1000);
  assert.ok(zoomOut > 1 && zoomOut < 1.05);
  assert.ok(zoomIn < 1 && zoomIn > 0.95);
  assert.ok(Math.abs(zoomOut * zoomIn - 1) < 0.001);
});

test("selected events use a compact six-column focus popover over the persistent timeline", async () => {
  const [html, js, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="timeline-focus-view"/);
  assert.doesNotMatch(html, /id="timeline-detail"/);
  assert.match(js, /focusItem\(id, options = \{\}\)/);
  assert.match(js, /timelinefocuschange/);
  assert.match(js, /createFocusHero/);
  assert.match(css, /\.timeline-focus-view\s*\{[\s\S]*grid-template-columns:\s*repeat\(6,/);
  assert.doesNotMatch(css, /\.timeline-focus-view\s*\{[\s\S]*grid-template-columns:\s*repeat\(12,/);
  assert.match(css, /timeline-focus-view\[popover\]/);
  assert.match(css, /inline-size:\s*min\(640px/);
  assert.match(css, /\.timeline-view\.is-event-focused/);
  assert.match(css, /grid-row:\s*3/);
  assert.doesNotMatch(css, /position-anchor:\s*--timeline-detail-anchor/);
});

test("close zoom keeps every timeline item whose temporal extent intersects the viewport", () => {
  const viewport = { start: 400, end: 700 };

  assert.equal(geometry.itemOverlapsViewport({ start: 500, end: null }, viewport), true);
  assert.equal(geometry.itemOverlapsViewport({ start: 200, end: null }, viewport), false);
  assert.equal(geometry.itemOverlapsViewport({ start: 100, end: 450 }, viewport), true);
  assert.equal(geometry.itemOverlapsViewport({ start: 650, end: 900 }, viewport), true);
  assert.equal(geometry.itemOverlapsViewport({ start: 0, end: 1000 }, viewport), true);
  assert.equal(geometry.itemOverlapsViewport({ start: 0, end: 399 }, viewport), false);
});

test("long visible ranges trace from the midpoint of their visible portion", () => {
  assert.equal(
    geometry.visibleIntervalAnchor({ start: 0, end: 1000 }, { start: 400, end: 700 }),
    550,
  );
  assert.equal(
    geometry.visibleIntervalAnchor({ start: 500, end: 900 }, { start: 400, end: 700 }),
    600,
  );
  assert.equal(
    geometry.visibleIntervalAnchor({ start: 500, end: null }, { start: 400, end: 700 }),
    500,
  );
});

test("Browse and Edit are vertical sidebars without horizontal scrolling", async () => {
  const [css, architecture] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIMELINE-V3-ARCHITECTURE.md", import.meta.url), "utf8"),
  ]);

  assert.match(
    css,
    /#app-shell\[data-editor-open="true"\]\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--utility-sidebar-width\)[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /#app-shell\[data-editor-open="true"\]\s*>\s*\.app-editor-sheet\s*\{[\s\S]*grid-column:\s*2[\s\S]*height:\s*100%[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/,
  );
  assert.match(
    css,
    /#app-shell\[data-browser-open="true"\]\s*>\s*\.timeline-panel\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--utility-sidebar-width\)[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /#app-shell\[data-browser-open="true"\]\s*>\s*\.timeline-panel\s*>\s*\.app-browser-sheet\s*\{[\s\S]*grid-column:\s*2[\s\S]*height:\s*100%[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/,
  );
  assert.doesNotMatch(css, /grid-template-rows:\s*clamp\(180px,\s*42dvh,\s*420px\)/);
  assert.match(
    css,
    /\.app-browser-sheet \.timeline-item\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(css, /\.app-browser-sheet \.timeline-marker\s*\{\s*display:\s*none/);
  assert.match(
    css,
    /@container utility-sidebar \(max-width:\s*360px\)[\s\S]*\.app-editor-sheet \.temporal-fields[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /#app-shell:is\([\s\S]*data-editor-open="true"[\s\S]*data-browser-open="true"[\s\S]*#presentation-stage:not\(:fullscreen\) > \.graph-lens:not\(\[hidden\]\)[\s\S]*position:\s*absolute/,
  );
  assert.match(architecture, /vertical right-side workspace columns at every viewport size/);
  assert.match(architecture, /Horizontal overflow is a layout defect/);
});
