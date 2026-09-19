import test from "node:test";
import assert from "node:assert/strict";

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

test("popover placement respects the preferred side when it fits", () => {
  const placement = geometry.choosePopoverPlacement(
    { left: 200, right: 260, top: 160, bottom: 200 },
    { left: 0, top: 0, right: 600, bottom: 420 },
    { width: 180, height: 90 },
    ["top", "right", "left", "bottom"]
  );
  assert.equal(placement.placement, "top");
  assert.ok(placement.top >= 10);
});

test("popover placement falls back away from a clipped edge", () => {
  const placement = geometry.choosePopoverPlacement(
    { left: 520, right: 580, top: 180, bottom: 220 },
    { left: 0, top: 0, right: 600, bottom: 420 },
    { width: 190, height: 100 },
    ["right", "left", "bottom", "top"]
  );
  assert.equal(placement.placement, "left");
  assert.ok(placement.left >= 10);
  assert.ok(placement.left + 190 <= 590);
});
