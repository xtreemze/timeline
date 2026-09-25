import assert from "node:assert/strict";
import test from "node:test";

import { reconcileWorldLayout } from "../src/projection/world-layout-continuity.ts";
import { createWorldProjection, worldInstanceId } from "../src/projection/world-projection.ts";

function instance(canonicalId, occurrenceId) {
  return {
    id: worldInstanceId(canonicalId, occurrenceId),
    canonicalId,
    occurrenceId,
    geographicAnchors: [],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
  };
}

test("surviving world instances preserve positions and pins", () => {
  const alice = instance("alice", "meeting");
  const bob = instance("bob", "meeting");
  const next = createWorldProjection({ instances: [alice, bob], edges: [] });

  const result = reconcileWorldLayout(
    {
      positions: new Map([[alice.id, { x: 10, y: 20, z: 30 }]]),
      pinned: new Set([alice.id]),
    },
    next,
  );

  assert.deepEqual(result.positions.get(alice.id), { x: 10, y: 20, z: 30 });
  assert.equal(result.pinned.has(alice.id), true);
  assert.deepEqual(result.entering, [bob.id]);
  assert.deepEqual(result.exiting, []);
});

test("removed instances are reported and stale pins are discarded", () => {
  const aliceId = worldInstanceId("alice", "old");
  const bob = instance("bob", "new");
  const next = createWorldProjection({ instances: [bob], edges: [] });

  const result = reconcileWorldLayout(
    {
      positions: new Map([[aliceId, { x: 1, y: 2 }]]),
      pinned: new Set([aliceId]),
    },
    next,
  );

  assert.deepEqual(result.exiting, [aliceId]);
  assert.equal(result.pinned.has(aliceId), false);
  assert.deepEqual(result.entering, [bob.id]);
});

test("canonical entity identity preserves layout across occurrence and location changes", () => {
  const oldId = worldInstanceId("alice", "stockholm");
  const nextAlice = instance("alice", "copenhagen");
  const next = createWorldProjection({ instances: [nextAlice], edges: [] });

  const result = reconcileWorldLayout(
    {
      positions: new Map([[oldId, { x: 100, y: 200 }]]),
      pinned: new Set([oldId]),
    },
    next,
  );

  assert.deepEqual(result.positions.get(nextAlice.id), { x: 100, y: 200 });
  assert.equal(result.pinned.has(nextAlice.id), true);
  assert.deepEqual(result.entering, []);
  assert.deepEqual(result.exiting, []);
});

test("invalid retained coordinates are rejected before reaching renderer state", () => {
  const alice = instance("alice", "meeting");
  const next = createWorldProjection({ instances: [alice], edges: [] });

  assert.throws(
    () =>
      reconcileWorldLayout(
        {
          positions: new Map([[alice.id, { x: Number.NaN, y: 0 }]]),
          pinned: new Set(),
        },
        next,
      ),
    /finite/,
  );
});
