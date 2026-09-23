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

test("selected events use a layout-owned focus sidebar beside the persistent graph", async () => {
  const [html, js, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);
  assert.match(
    html,
    /id="timeline-focus-view"[^>]*timeline-focus-sidebar[^>]*data-presentation-surface="sidebar"/,
  );
  assert.doesNotMatch(html, /id="timeline-detail"/);
  assert.doesNotMatch(html, /id="timeline-focus-view"[^>]*popover/);
  assert.match(js, /focusItem\(id:/);
  assert.match(js, /timelinefocuschange/);
  assert.match(js, /createFocusHero/);
  assert.match(js, /dataset\.presentationSurface = "sidebar"/);
  assert.match(
    css,
    /#app-shell\.is-event-focused #presentation-stage > \.timeline-focus-sidebar:not\(\[hidden\]\)/,
  );
  assert.match(
    css,
    /data-timeline-orientation="horizontal"[\s\S]*grid-template-columns:\s*minmax\(0, 2fr\) minmax\(0, 3fr\)/,
  );
  assert.match(
    css,
    /data-timeline-orientation="vertical"[\s\S]*grid-template-columns:\s*minmax\(0, 5fr\) minmax\(0, 1fr\)/,
  );
  assert.doesNotMatch(css, /timeline-focus-view:popover-open/);
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

test("Browse and Edit stay viewport-contained on narrow screens and become sidebars progressively", async () => {
  const [css, architecture] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIMELINE-V3-ARCHITECTURE.md", import.meta.url), "utf8"),
  ]);

  assert.match(css, /Browse and Edit are viewport-contained utility surfaces by default/);
  assert.match(
    css,
    /#app-shell\[data-editor-open="true"\]\s*>\s*\.app-editor-sheet,[\s\S]*position:\s*fixed[\s\S]*inset-block-start:[\s\S]*inset-block-end:[\s\S]*inset-inline-start:[\s\S]*inset-inline-end:/,
  );
  assert.match(
    css,
    /#app-shell\[data-browser-open="true"\]\s*>\s*\.timeline-panel\s*>\s*\.app-browser-sheet[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/,
  );
  assert.match(
    css,
    /@media \(min-width:\s*760px\)[\s\S]*#app-shell\[data-editor-open="true"\][\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--utility-sidebar-width\)/,
  );
  assert.match(
    css,
    /@media \(min-width:\s*760px\)[\s\S]*#app-shell\[data-browser-open="true"\]\s*>\s*\.timeline-panel[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--utility-sidebar-width\)/,
  );
  assert.match(
    css,
    /@container utility-sidebar \(max-width:\s*360px\)[\s\S]*\.app-editor-sheet \.temporal-fields[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(architecture, /viewport-contained utility surfaces/);
  assert.match(architecture, /vertical right-side workspace columns/);
  assert.match(architecture, /Horizontal overflow is a layout defect/);
});
