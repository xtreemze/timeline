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

test("timeline axis placement resolves CSS percentages and pixels without JavaScript overriding layout", () => {
  assert.ok(Math.abs(geometry.axisCrossFromCss("46%", 253.2, 0.5) - 116.472) < 0.001);
  assert.equal(geometry.axisCrossFromCss("68%", 300, 0.58), 204);
  assert.equal(geometry.axisCrossFromCss("92px", 240, 0.5), 92);
  assert.equal(geometry.axisCrossFromCss("500px", 240, 0.5), 240);
  assert.equal(geometry.axisCrossFromCss("invalid", 240, 0.5), 120);
});

test("timeline cards resolve calc/var edge rails from rendered axis geometry", () => {
  const surface = { left: 40, top: 100, width: 1200, height: 240 };
  assert.equal(
    geometry.axisCrossFromRects(
      surface,
      { left: 40, top: 248 },
      "horizontal",
    ),
    148,
  );
  assert.equal(
    geometry.axisCrossFromRects(
      { left: 40, top: 100, width: 280, height: 800 },
      { left: 248, top: 100 },
      "vertical",
    ),
    208,
  );
  assert.equal(
    geometry.axisCrossFromRects(surface, { left: 40, top: 20 }, "horizontal"),
    null,
  );
});

test("wide portrait and landscape rails share one physical edge gutter", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(min-width: 700px\)[\s\S]*--timeline-edge-gutter:\s*clamp\(64px,\s*8\.64dvh,\s*92\.16px\)/,
  );
  assert.equal(
    (css.match(/--timeline-axis-cross:\s*calc\(100% - var\(--timeline-edge-gutter\)\)/g) ?? [])
      .length,
    2,
  );
  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*#timeline-view\[data-orientation="portrait"\][\s\S]*--timeline-axis-cross:\s*58%[\s\S]*#timeline-view\[data-orientation="landscape"\][\s\S]*--timeline-axis-cross:\s*58%/,
  );
});

test("compact horizontal mobile rails cap visible lanes before cards consume the world surface", () => {
  assert.equal(geometry.committedLaneLimit("horizontal", 184, 360), 2);
  assert.equal(geometry.committedLaneLimit("horizontal", 253, 390), 2);
  assert.equal(geometry.committedLaneLimit("horizontal", 299.9, 699), 2);
  assert.equal(geometry.committedLaneLimit("horizontal", 300, 390), 3);
  assert.equal(geometry.committedLaneLimit("horizontal", 253, 700), 3);
  assert.equal(geometry.committedLaneLimit("horizontal", 253, 1024), 3);
  assert.equal(geometry.committedLaneLimit("vertical", 168, 390), 3);
});

test("buffered fallback lanes obey the compact lane budget", () => {
  for (const id of ["a", "b", "c", "snow-mirror", "buffered-occurrence"]) {
    const compactLane = geometry.fallbackLaneIndex(id, 2);
    assert.ok(compactLane >= 0 && compactLane <= 1, `${id} escaped the two-lane compact budget`);

    const regularLane = geometry.fallbackLaneIndex(id, 3);
    assert.ok(regularLane >= 0 && regularLane <= 2);
  }

  assert.equal(geometry.fallbackLaneIndex("anything", 1), 0);
  assert.equal(geometry.fallbackLaneIndex("anything", 0), 0);
});

test("event navigation falls back to the timeline midpoint when nothing is focused", () => {
  const items = [
    { id: "early", start: 100 },
    { id: "center", start: 500 },
    { id: "late", start: 900 },
  ];
  const viewport = { start: 300, end: 700 };
  const center = geometry.timelineViewportCenter(viewport);

  assert.equal(center, 500);
  assert.equal(geometry.adjacentTimelineItem(items, -1, center)?.id, "early");
  assert.equal(geometry.adjacentTimelineItem(items, 1, center)?.id, "late");
  assert.equal(geometry.adjacentTimelineItem(items, -1, 700)?.id, "center");
  assert.equal(geometry.adjacentTimelineItem(items, 1, 700)?.id, "late");
});

test("focused event navigation keeps chronological adjacency instead of re-evaluating the midpoint", () => {
  const items = [
    { id: "a", start: 100 },
    { id: "b", start: 500 },
    { id: "c", start: 900 },
  ];

  assert.equal(geometry.adjacentTimelineItem(items, -1, 850, "b")?.id, "a");
  assert.equal(geometry.adjacentTimelineItem(items, 1, 150, "b")?.id, "c");
  assert.equal(geometry.adjacentTimelineItem(items, -1, 500, "a"), null);
  assert.equal(geometry.adjacentTimelineItem(items, 1, 500, "c"), null);
});

test("selected events use a shell-owned detail surface without changing footer controls", async () => {
  const [html, js, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="timeline-focus-view"/);
  assert.match(html, /data-world-controls-slot/);
  assert.match(
    html,
    /id="timeline-view-toolbar" class="view-control-group timeline-local-toolbar"/,
  );
  assert.match(
    html,
    /id="timeline-view-controls" class="app-footer-zone app-footer-view" role="group"/,
  );
  assert.match(html, /id="timeline-focus-context-controls" hidden[\s\S]*id="timeline-focus-prev"/);
  assert.match(html, /id="timeline-focus-next"/);
  assert.match(html, /id="timeline-related-zoom"/);
  assert.match(html, /id="timeline-related-fit"/);
  const footerStart = html.indexOf('<nav class="app-tool-dock app-footer-bar"');
  const footerEnd = html.indexOf("</nav>", footerStart);
  const footerMarkup = html.slice(footerStart, footerEnd);
  assert.doesNotMatch(footerMarkup, /timeline-focus-prev|timeline-related-zoom/);
  assert.doesNotMatch(html, /id="timeline-focus-edit"/);
  assert.equal((html.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /id="timeline-detail"/);
  assert.match(js, /focusItem\(id, options = \{\}\)/);
  assert.match(js, /timelinefocuschange/);
  assert.match(js, /createFocusHero/);
  assert.match(js, /syncFocusAttachment\(\)/);
  assert.doesNotMatch(js, /createFocusEditButton|timelinefocusedit|timeline-focus-edit/);
  assert.doesNotMatch(js, /timeline-focus-place-panel/);
  assert.match(js, /focusNavigationState\(\)/);
  assert.match(js, /timeline-focus-header/);
  assert.match(js, /data\.focusContextActions/);
  assert.doesNotMatch(js, /timeline-focus-nav-prev|timeline-focus-nav-next|Edit event/);
  assert.match(css, /Persistent command plane/);
  assert.match(css, /Event selection never changes this composition/);
  assert.match(
    css,
    /\.app-footer-view \.world-camera-controls[\s\S]*flex-direction:\s*row[\s\S]*flex-wrap:\s*nowrap/,
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
  assert.match(css, /timeline-focus-anchor-local-x/);
  assert.match(css, /timeline-focus-inline-start/);
  assert.match(css, /inline-size:\s*min\(32rem,/);
  assert.match(css, /max-block-size:\s*min\(28rem,/);
  assert.match(js, /dataset\.anchorSide/);
  assert.match(css, /> \.timeline-focus-summary[\s\S]*grid-column:\s*1 \/ -1/);
});

test("timeline rails reserve one occurrence-card lane while later lanes may overflow inward", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(min-width: 700px\)[\s\S]*--relations-inline-rail:\s*clamp\(208px,\s*21dvw,\s*248px\)[\s\S]*--relations-block-rail:\s*clamp\(156px,\s*18dvh,\s*184px\)/,
  );
  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*--mobile-relations-inline-rail:\s*clamp\(132px,\s*36dvw,\s*164px\)[\s\S]*--mobile-relations-block-rail:\s*clamp\(132px,\s*18dvh,\s*160px\)/,
  );
  assert.match(
    css,
    /#presentation-stage:has\(> #timeline-view\[data-orientation="landscape"\]\)[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*bottom:\s*calc\(var\(--mobile-bottom-chrome\) \+ var\(--mobile-relations-block-rail\)\)/,
  );
  assert.match(
    css,
    /#timeline-view\[data-orientation="landscape"\][\s\S]*> \.timeline-surface[\s\S]*bottom:\s*var\(--mobile-bottom-chrome\)[\s\S]*height:\s*var\(--mobile-relations-block-rail\)/,
  );
  assert.match(
    css,
    /\.timeline-stage\s*\{[\s\S]*z-index:\s*1060[\s\S]*overflow:\s*visible[\s\S]*pointer-events:\s*none/,
  );
  assert.match(css, /\.timeline-event-terminal\s*\{[\s\S]*pointer-events:\s*auto/);
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
