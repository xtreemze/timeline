import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWorldProjectionDelta,
  diffWorldProjection,
  isEmptyWorldProjectionDelta,
} from "../src/projection/world-projection-delta.ts";
import {
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function instance(canonicalId, occurrenceId, overrides = {}) {
  return {
    id: worldInstanceId(canonicalId, occurrenceId),
    canonicalId,
    occurrenceId,
    geographicAnchors: [],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
    ...overrides,
  };
}

function edge(id, source, target, overrides = {}) {
  return {
    id,
    sourceInstanceId: source,
    targetInstanceId: target,
    temporalWeight: 1,
    visible: true,
    retained: false,
    ...overrides,
  };
}

test("identical projections produce an empty delta", () => {
  const alice = instance("alice", "meeting");
  const bob = instance("bob", "meeting");
  const projection = createWorldProjection({
    instances: [alice, bob],
    edges: [edge("meeting", alice.id, bob.id)],
  });

  const delta = diffWorldProjection(projection, projection);
  assert.equal(isEmptyWorldProjectionDelta(delta), true);
});

test("delta distinguishes additions, updates, and removals by stable world identity", () => {
  const alice = instance("alice", "meeting");
  const bob = instance("bob", "meeting");
  const charlie = instance("charlie", "meeting");
  const previous = createWorldProjection({
    instances: [alice, bob],
    edges: [edge("meeting", alice.id, bob.id)],
  });
  const next = createWorldProjection({
    instances: [
      instance("alice", "meeting", { visualWeight: 0.5 }),
      charlie,
    ],
    edges: [
      edge("meeting", alice.id, charlie.id, { temporalWeight: 0.75 }),
    ],
  });

  const delta = diffWorldProjection(previous, next);

  assert.deepEqual(delta.addedInstances.map((value) => value.canonicalId), ["charlie"]);
  assert.deepEqual(delta.updatedInstances.map((value) => value.canonicalId), ["alice"]);
  assert.deepEqual(delta.removedInstanceIds, [bob.id]);
  assert.equal(delta.addedEdges.length, 0);
  assert.deepEqual(delta.updatedEdges.map((value) => value.id), ["meeting"]);
  assert.deepEqual(delta.removedEdgeIds, []);
});

test("removing an occurrence emits removals without renderer-specific state", () => {
  const alice = instance("alice", "meeting");
  const bob = instance("bob", "meeting");
  const previous = createWorldProjection({
    instances: [alice, bob],
    edges: [edge("meeting", alice.id, bob.id)],
  });
  const next = createWorldProjection({ instances: [], edges: [] });

  const delta = diffWorldProjection(previous, next);

  assert.deepEqual(delta.removedInstanceIds, [alice.id, bob.id].sort());
  assert.deepEqual(delta.removedEdgeIds, ["meeting"]);
  assert.equal("position" in delta, false);
  assert.equal("camera" in delta, false);
});

test("applying a deterministic delta reconstructs the next WorldProjection", () => {
  const alice = instance("alice", "meeting");
  const bob = instance("bob", "meeting");
  const charlie = instance("charlie", "meeting");
  const previous = createWorldProjection({
    instances: [alice, bob],
    edges: [edge("meeting", alice.id, bob.id)],
  });
  const next = createWorldProjection({
    instances: [instance("alice", "meeting", { visualWeight: 0.5 }), charlie],
    edges: [edge("meeting", alice.id, charlie.id, { temporalWeight: 0.75 })],
  });

  const delta = diffWorldProjection(previous, next);
  assert.deepEqual(applyWorldProjectionDelta(previous, delta), next);
});
