import assert from "node:assert/strict";
import test from "node:test";

import { createInteractionCoordinator } from "../src/interaction/interaction-coordinator.ts";

test("one surface owns an active interaction epoch", () => {
  const coordinator = createInteractionCoordinator();
  assert.equal(coordinator.begin("timeline", 1), true);
  assert.equal(coordinator.begin("map", 2), false);
  assert.equal(coordinator.snapshot().owner, "timeline");
  assert.deepEqual(coordinator.snapshot().pointerIds, [1]);
});

test("same owner can add a second pointer and classify pinch", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("timeline", 1);
  assert.equal(coordinator.begin("timeline", 2), true);
  assert.equal(coordinator.classify("timeline", "pinch"), true);
  assert.equal(coordinator.claim("timeline"), true);
  assert.equal(coordinator.snapshot().gesture, "pinch");
  assert.equal(coordinator.snapshot().phase, "owned");
});

test("pinch cannot be classified from a single pointer", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("map", 7);
  assert.equal(coordinator.classify("map", "pinch"), false);
  assert.equal(coordinator.snapshot().phase, "acquisition");
});

test("owned node drag cannot be stolen by graph pan or another surface", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("graph", 11);
  coordinator.classify("graph", "node-drag");
  coordinator.claim("graph");

  assert.equal(coordinator.classify("graph", "pan"), false);
  assert.equal(coordinator.begin("timeline", 12), false);
  assert.equal(coordinator.snapshot().gesture, "node-drag");
  assert.equal(coordinator.snapshot().owner, "graph");
});

test("pointer cancellation reaches a committed state deterministically", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("map", 21);
  coordinator.classify("map", "pan");
  coordinator.claim("map");

  const snapshot = coordinator.cancel("map", "pointercancel");
  assert.equal(snapshot.phase, "committed");
  assert.equal(snapshot.reason, "pointercancel");
  assert.equal(snapshot.owner, null);
  assert.deepEqual(snapshot.pointerIds, []);
});

test("lost capture commits and permits the next surface to acquire ownership", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("timeline", 30);
  coordinator.classify("timeline", "pan");
  coordinator.claim("timeline");
  coordinator.cancel("timeline", "lostpointercapture");

  assert.equal(coordinator.begin("graph", 31), true);
  assert.equal(coordinator.snapshot().owner, "graph");
  assert.equal(coordinator.snapshot().phase, "acquisition");
});

test("ordinary release progresses through settling and committed phases", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("timeline", 40);
  coordinator.classify("timeline", "pan");
  coordinator.claim("timeline");

  assert.equal(coordinator.release("timeline", 40), true);
  assert.equal(coordinator.snapshot().phase, "settling");
  assert.equal(coordinator.commit("timeline"), true);

  const committed = coordinator.snapshot();
  assert.equal(committed.phase, "committed");
  assert.equal(committed.owner, null);
  assert.equal(committed.reason, "release");
});

test("stale releases and commits from non-owners cannot mutate state", () => {
  const coordinator = createInteractionCoordinator();
  coordinator.begin("graph", 50);
  coordinator.classify("graph", "pan");
  coordinator.claim("graph");
  const before = coordinator.snapshot();

  assert.equal(coordinator.release("map", 50), false);
  assert.equal(coordinator.commit("map"), false);
  assert.deepEqual(coordinator.snapshot(), before);
});
