import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO,
  WORLD_CLUSTER_EXPANDED_RADIUS_RATIO,
  worldClusterTarget,
} from "../src/layout/world-cluster-transition.ts";
import {
  WORLD_PLACE_CLUSTER_RADIUS_PX,
  WORLD_READABLE_LOCAL_RADIUS_PX,
} from "../src/layout/world-semantic-presentation.ts";

test("cluster LOD uses hysteresis rather than interpolation", () => {
  assert.equal(worldClusterTarget(60, 100, false), true);
  assert.equal(worldClusterTarget(80, 100, false), false);
  assert.equal(worldClusterTarget(120, 100, true), true);
  assert.equal(worldClusterTarget(140, 100, true), false);
  assert.ok(WORLD_CLUSTER_COLLAPSED_RADIUS_RATIO < 1);
  assert.ok(WORLD_CLUSTER_EXPANDED_RADIUS_RATIO > 1);
});

test("place clusters stay collapsed until force layout has clear readable room", () => {
  assert.equal(
    worldClusterTarget(
      WORLD_READABLE_LOCAL_RADIUS_PX,
      WORLD_PLACE_CLUSTER_RADIUS_PX,
      true,
    ),
    true,
  );
});

test("invalid or unresolved local radius stays safely clustered", () => {
  assert.equal(worldClusterTarget(0, 100, false), true);
  assert.equal(worldClusterTarget(Number.NaN, 100, false), true);
});
