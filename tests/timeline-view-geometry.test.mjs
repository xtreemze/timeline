import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/time-scale.js");
await import("../site/timeline-clustering.js");
await import("../site/timeline-motion.js");
await import("../site/event-presentation.js");
await import("../site/timeline-view.js");

const geometry = globalThis.TimelineView.geometry;

test("connector segment reaches the axis exactly from either side", () => {
  assert.deepEqual(geometry.connectorSegment(100, 40), { offset: 0, length: 60 });
  assert.deepEqual(geometry.connectorSegment(40, 100), { offset: -60, length: 60 });
  assert.deepEqual(geometry.connectorSegment(75, 75), { offset: 0, length: 0 });
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
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="timeline-focus-view"/);
  assert.doesNotMatch(html, /id="timeline-detail"/);
  assert.match(js, /focusItem\(id\)/);
  assert.match(js, /timelinefocuschange/);
  assert.match(js, /createFocusHero/);
  assert.match(css, /\.timeline-focus-view\s*\{[\s\S]*grid-template-columns:\s*repeat\(6,/);
  assert.doesNotMatch(css, /\.timeline-focus-view\s*\{[\s\S]*grid-template-columns:\s*repeat\(12,/);
  assert.match(css, /timeline-focus-view\[popover\]/);
  assert.match(css, /inline-size:\s*min\(680px/);
  assert.match(css, /\.timeline-view\.is-event-focused/);
  assert.match(css, /grid-row:\s*3/);
  assert.doesNotMatch(css, /position-anchor:\s*--timeline-detail-anchor/);
});

test("long visible ranges trace from the midpoint of their visible portion", () => {
  assert.equal(
    geometry.visibleIntervalAnchor(
      { start: 0, end: 1000 },
      { start: 400, end: 700 }
    ),
    550
  );
  assert.equal(
    geometry.visibleIntervalAnchor(
      { start: 500, end: 900 },
      { start: 400, end: 700 }
    ),
    600
  );
  assert.equal(
    geometry.visibleIntervalAnchor(
      { start: 500, end: null },
      { start: 400, end: 700 }
    ),
    500
  );
});
