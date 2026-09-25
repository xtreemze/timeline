import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_TEMPORAL_EDGE_REVEAL_MS,
  WORLD_TEMPORAL_NODE_REVEAL_MS,
  WORLD_TEMPORAL_REVEAL_MS,
  worldTemporalRevealProgress,
} from "../src/layout/world-temporal-reveal.ts";

test("temporal reveal completes relationship context before node bodies", () => {
  assert.equal(WORLD_TEMPORAL_EDGE_REVEAL_MS, 420);
  assert.equal(WORLD_TEMPORAL_NODE_REVEAL_MS, 420);
  assert.equal(WORLD_TEMPORAL_REVEAL_MS, 840);

  assert.deepEqual(worldTemporalRevealProgress(0), {
    edge: 0,
    node: 0,
    complete: false,
  });

  const edgeMidpoint = worldTemporalRevealProgress(WORLD_TEMPORAL_EDGE_REVEAL_MS / 2);
  assert.ok(edgeMidpoint.edge > 0 && edgeMidpoint.edge < 1);
  assert.equal(edgeMidpoint.node, 0, "nodes remain latent during the edge reveal");

  const edgeComplete = worldTemporalRevealProgress(WORLD_TEMPORAL_EDGE_REVEAL_MS);
  assert.equal(edgeComplete.edge, 1);
  assert.equal(edgeComplete.node, 0, "node reveal starts only after edges finish");

  const nodeMidpoint = worldTemporalRevealProgress(
    WORLD_TEMPORAL_EDGE_REVEAL_MS + WORLD_TEMPORAL_NODE_REVEAL_MS / 2,
  );
  assert.equal(nodeMidpoint.edge, 1);
  assert.ok(nodeMidpoint.node > 0 && nodeMidpoint.node < 1);

  assert.deepEqual(worldTemporalRevealProgress(WORLD_TEMPORAL_REVEAL_MS), {
    edge: 1,
    node: 1,
    complete: true,
  });
});

test("temporal reveal clamps before and after its staged interval", () => {
  assert.deepEqual(worldTemporalRevealProgress(-1000), {
    edge: 0,
    node: 0,
    complete: false,
  });
  assert.deepEqual(worldTemporalRevealProgress(WORLD_TEMPORAL_REVEAL_MS + 5000), {
    edge: 1,
    node: 1,
    complete: true,
  });
});
