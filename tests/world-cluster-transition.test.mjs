import assert from "node:assert/strict";
import test from "node:test";

import {
  interpolateClusterPosition,
  worldClusterExpansionProgress,
} from "../src/layout/world-cluster-transition.ts";

test("cluster expansion is continuous across the semantic zoom band", () => {
  assert.equal(worldClusterExpansionProgress(50, 100), 0);
  assert.equal(worldClusterExpansionProgress(140, 100), 1);
  const middle = worldClusterExpansionProgress(100, 100);
  assert.ok(middle > 0 && middle < 1);

  const before = worldClusterExpansionProgress(99, 100);
  const after = worldClusterExpansionProgress(101, 100);
  assert.ok(Math.abs(after - before) < 0.1, "no threshold-sized jump is introduced");
});

test("cluster interpolation is reversible and follows the shortest longitude path", () => {
  const origin = Object.freeze([179, 10, 0]);
  const target = Object.freeze([-179, 14, 1000]);

  assert.deepEqual(interpolateClusterPosition(origin, target, 0), origin);
  assert.deepEqual(interpolateClusterPosition(origin, target, 1), target);

  const half = interpolateClusterPosition(origin, target, 0.5);
  assert.ok(Math.abs(Math.abs(half[0]) - 180) < 1e-9);
  assert.equal(half[1], 12);
  assert.equal(half[2], 500);
});
