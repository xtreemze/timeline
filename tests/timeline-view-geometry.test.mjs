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

test("trackpad pinch keeps wheel units but amplifies Ctrl-modified deltas like d3-zoom", () => {
  assert.equal(geometry.normalizeWheelDelta({ deltaY: 2, deltaMode: 0, ctrlKey: false }, 800), 2);
  assert.equal(geometry.normalizeWheelDelta({ deltaY: 2, deltaMode: 0, ctrlKey: true }, 800), 20);
  assert.equal(geometry.normalizeWheelDelta({ deltaY: 1, deltaMode: 1, ctrlKey: true }, 800), 160);
  assert.equal(geometry.normalizeWheelDelta({ deltaY: 1, deltaMode: 2, ctrlKey: false }, 800), 800);
});

test("selected events use a shell-owned six-column detail surface with footer-owned controls", async () => {
  const [html, js, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="timeline-focus-view"/);
  assert.match(html, /data-world-controls-slot/);
  assert.match(html, /class="app-footer-zone app-footer-timeline timeline-local-toolbar"/);
  assert.match(html, /id="timeline-view-controls-toggle"/);
  assert.match(html, /id="timeline-focus-prev"/);
  assert.match(html, /id="timeline-focus-next"/);
  assert.match(html, /id="timeline-focus-edit"/);
  assert.doesNotMatch(html, /id="timeline-detail"/);
  assert.match(js, /focusItem\(id, options = \{\}\)/);
  assert.match(js, /timelinefocuschange/);
  assert.match(js, /createFocusHero/);
  assert.match(js, /focusNavigationState\(\)/);
  assert.doesNotMatch(js, /timeline-focus-nav-prev|timeline-focus-nav-next|Edit event/);
  assert.match(css, /Persistent footer control plane/);
  assert.match(
    css,
    /\.app-footer-world \.world-camera-controls[\s\S]*position:\s*static[\s\S]*flex-direction:\s*row/,
  );
  assert.match(
    css,
    /#app-shell\.is-event-focused #presentation-stage > \.timeline-view[\s\S]*inset:\s*0[\s\S]*inline-size:\s*100%[\s\S]*block-size:\s*100%/,
  );
  assert.match(
    css,
    /\.timeline-focus-sidebar:not\(\[hidden\]\)\s*\{[\s\S]*grid-template-columns:\s*repeat\(6,/,
  );
  assert.doesNotMatch(
    css,
    /\.timeline-focus-sidebar:not\(\[hidden\]\)\s*\{[\s\S]*grid-template-columns:\s*repeat\(12,/,
  );
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

test("Browse overlays without workspace reflow and Edit becomes a bounded desktop panel", async () => {
  const [css, html, architecture] = await Promise.all([
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIMELINE-V3-ARCHITECTURE.md", import.meta.url), "utf8"),
  ]);

  assert.match(css, /Spatial shell utility surfaces/);
  assert.match(
    css,
    /#app-shell\[data-browser-open="true"\]\s*>\s*\.app-browser-sheet[\s\S]*position:\s*fixed[\s\S]*z-index:\s*1450[\s\S]*inset:\s*0[\s\S]*pointer-events:\s*auto/,
  );
  assert.match(
    css,
    /\.app-browser-sheet\s*>\s*\.app-browser-panel[\s\S]*inline-size:\s*min\(420px,\s*100%\)[\s\S]*overflow-y:\s*auto/,
  );
  assert.match(
    css,
    /#app-shell\[data-browser-open="true"\]\s*>\s*\.timeline-panel,[\s\S]*display:\s*block/,
  );
  assert.match(
    css,
    /@media \(min-width:\s*760px\)[\s\S]*#app-shell\[data-editor-open="true"\][\s\S]*display:\s*block[\s\S]*\.app-editor-sheet[\s\S]*inline-size:\s*clamp\(360px,\s*34%,\s*460px\)/,
  );
  assert.match(
    html,
    /id="timeline-browser-sheet"[\s\S]*class="app-browser-panel"[\s\S]*<section class="timeline-panel"/,
  );
  assert.match(architecture, /Browse is always an overlay utility surface/);
  assert.match(architecture, /Edit is fullscreen on compact\/mobile viewports/);
  assert.match(architecture, /Horizontal overflow is a layout defect/);
});
