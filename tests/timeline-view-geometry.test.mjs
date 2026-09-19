import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/time-scale.js");
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

test("detail interaction uses Chrome-native popover and CSS anchor positioning", async () => {
  const [html, js, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /popover="auto"/);
  assert.match(js, /popovertargetaction", "show"/);
  assert.match(js, /popovertargetaction", "hide"/);
  assert.match(css, /anchor-name:\s*--timeline-detail-anchor/);
  assert.match(css, /position-anchor:\s*--timeline-detail-anchor/);
  assert.match(css, /position-area:/);
  assert.match(css, /position-try-fallbacks:/);
  assert.match(css, /:popover-open/);
  assert.match(css, /@starting-style/);
  assert.doesNotMatch(js, /choosePopoverPlacement/);
});
