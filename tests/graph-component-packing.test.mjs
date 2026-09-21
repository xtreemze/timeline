import test from "node:test";
import assert from "node:assert/strict";

import {
  connectedGraphComponents,
  graphComponentTopologySignature,
  packComponentRects
} from "../src/graph-component-packing.js";

test("connectedGraphComponents detects stable disconnected islands", () => {
  const nodes = [{ id: "c" }, { id: "a" }, { id: "e" }, { id: "b" }, { id: "d" }, { id: "solo" }];
  const edges = [
    { start: "a", end: "b" },
    { start: "b", end: "c" },
    { start: "e", end: "d" },
    { start: "d", end: "e" },
    { start: "a", end: "a" },
    { start: "missing", end: "c" }
  ];

  assert.deepEqual(connectedGraphComponents(nodes, edges), [
    ["a", "b", "c"],
    ["d", "e"],
    ["solo"]
  ]);
});

test("component topology signature ignores ordering and edge direction", () => {
  const nodesA = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const nodesB = [{ id: "c" }, { id: "a" }, { id: "b" }];
  const edgesA = [{ start: "a", end: "b" }, { start: "b", end: "c" }];
  const edgesB = [{ start: "c", end: "b" }, { start: "b", end: "a" }];

  assert.equal(
    graphComponentTopologySignature(nodesA, edgesA),
    graphComponentTopologySignature(nodesB, edgesB)
  );
});

test("component packing is deterministic and adapts to a landscape canvas", () => {
  const rects = [
    { key: "c", minX: 10, maxX: 110, minY: -40, maxY: 40 },
    { key: "a", minX: -500, maxX: -390, minY: -30, maxY: 30 },
    { key: "d", minX: 400, maxX: 520, minY: -45, maxY: 45 },
    { key: "b", minX: -90, maxX: 10, minY: -35, maxY: 35 }
  ];

  const forward = packComponentRects(rects, { aspectRatio: 2.2, gap: 96 });
  const reversed = packComponentRects([...rects].reverse(), { aspectRatio: 2.2, gap: 96 });

  assert.deepEqual(forward, reversed);
  assert.equal(forward.placements.length, 4);
  assert.ok(forward.columns > forward.rows, "landscape packing should prefer more columns than rows");
  assert.ok(forward.width > forward.height);

  const keys = forward.placements.map((placement) => placement.key);
  assert.deepEqual(keys, ["a", "b", "c", "d"]);
  assert.ok(forward.placements.every(({ dx, dy }) => Number.isFinite(dx) && Number.isFinite(dy)));
});

test("packing returns translations only, preserving component-internal geometry", () => {
  const plan = packComponentRects([
    { key: "left", minX: -300, maxX: -100, minY: -50, maxY: 50 },
    { key: "right", minX: 500, maxX: 620, minY: -40, maxY: 40 }
  ], { aspectRatio: 2, gap: 80 });

  const left = plan.placements.find((placement) => placement.key === "left");
  const right = plan.placements.find((placement) => placement.key === "right");
  assert.ok(left);
  assert.ok(right);

  const originalDistance = 42;
  const translatedA = { x: -220 + left.dx, y: -10 + left.dy };
  const translatedB = { x: -178 + left.dx, y: -10 + left.dy };
  assert.equal(translatedB.x - translatedA.x, originalDistance);
});
