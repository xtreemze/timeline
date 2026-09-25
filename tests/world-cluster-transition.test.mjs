import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_CLUSTER_EDGE_RELEASE_MS,
  WORLD_CLUSTER_SETTLE_MS,
  worldClusterMutesMembers,
  worldClusterShowsActiveEdges,
  worldClusterShowsMembers,
  worldClusterShowsReleasingEdges,
  worldClusterWantsCollapsed,
} from "../src/layout/world-cluster-transition.ts";

const THRESHOLD = 4.5;

test("cluster zoom policy is hysteretic and never emits geometry progress", () => {
  assert.equal(worldClusterWantsCollapsed(4.4, THRESHOLD, "expanded"), false);
  assert.equal(worldClusterWantsCollapsed(4.2, THRESHOLD, "expanded"), true);
  assert.equal(worldClusterWantsCollapsed(4.6, THRESHOLD, "collapsed"), true);
  assert.equal(worldClusterWantsCollapsed(4.8, THRESHOLD, "collapsed"), false);
});

test("Orb-style staging retires edges before member cleanup", () => {
  assert.equal(WORLD_CLUSTER_EDGE_RELEASE_MS, 420);
  assert.equal(WORLD_CLUSTER_SETTLE_MS, 1_500);
  assert.ok(WORLD_CLUSTER_EDGE_RELEASE_MS < WORLD_CLUSTER_SETTLE_MS);

  assert.equal(worldClusterShowsMembers("releasing"), true);
  assert.equal(worldClusterMutesMembers("releasing"), true);
  assert.equal(worldClusterShowsReleasingEdges("releasing"), true);
  assert.equal(worldClusterShowsActiveEdges("releasing"), false);

  assert.equal(worldClusterShowsMembers("collapsing"), true);
  assert.equal(worldClusterMutesMembers("collapsing"), true);
  assert.equal(worldClusterShowsReleasingEdges("collapsing"), false);
  assert.equal(worldClusterShowsActiveEdges("collapsing"), false);

  assert.equal(worldClusterShowsMembers("collapsed"), false);
  assert.equal(worldClusterShowsActiveEdges("collapsed"), false);

  assert.equal(worldClusterShowsMembers("expanding"), true);
  assert.equal(worldClusterMutesMembers("expanding"), true);
  assert.equal(worldClusterShowsActiveEdges("expanding"), false);

  assert.equal(worldClusterShowsMembers("expanded"), true);
  assert.equal(worldClusterMutesMembers("expanded"), false);
  assert.equal(worldClusterShowsActiveEdges("expanded"), true);
});
