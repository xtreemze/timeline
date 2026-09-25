import assert from "node:assert/strict";
import test from "node:test";

import { createInteractionCoordinator } from "../src/interaction/interaction-coordinator.ts";
import { createSurfaceInteractionController } from "../src/interaction/surface-controller.ts";
import {
  surfaceActivationFromKeyboard,
  surfaceCursor,
  surfaceKeyboardMayNavigate,
  surfaceKeyboardTargetOwnsNavigation,
  surfaceNavigationFromKeyboard,
  surfacePointerMayStartDirectManipulation,
  surfacePointerType,
} from "../src/interaction/surface-input-policy.ts";

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

test("all surfaces share primary pointer acquisition semantics", () => {
  assert.equal(surfacePointerMayStartDirectManipulation({ pointerType: "mouse", button: 0 }), true);
  assert.equal(
    surfacePointerMayStartDirectManipulation({
      srcEvent: { pointerType: "mouse", button: -1, buttons: 1 },
    }),
    true,
    "mjolnir panstart may originate from pointermove with button -1",
  );
  assert.equal(surfacePointerMayStartDirectManipulation({ pointerType: "touch" }), true);
  assert.equal(surfacePointerMayStartDirectManipulation({ pointerType: "pen", button: 0 }), true);
  assert.equal(
    surfacePointerMayStartDirectManipulation({ pointerType: "mouse", button: 2 }),
    false,
  );
  assert.equal(
    surfacePointerMayStartDirectManipulation({ pointerType: "mouse", button: 0, ctrlKey: true }),
    false,
  );
  assert.equal(surfacePointerType({ srcEvent: { pointerType: "pen" } }), "pen");
});

test("surface keyboard activation gives Enter and Space equivalent semantics", () => {
  assert.equal(surfaceActivationFromKeyboard({ key: "Enter" }), "activate");
  assert.equal(surfaceActivationFromKeyboard({ key: " " }), "activate");
  assert.equal(surfaceActivationFromKeyboard({ key: "Escape" }), "cancel");
  assert.equal(surfaceActivationFromKeyboard({ key: "Enter", repeat: true }), null);
});

test("surface cursors use one direct-manipulation vocabulary", () => {
  assert.equal(surfaceCursor("background"), "grab");
  assert.equal(surfaceCursor("draggable"), "grab");
  assert.equal(surfaceCursor("action"), "pointer");
  assert.equal(surfaceCursor("cluster"), "zoom-in");
  assert.equal(surfaceCursor("draggable", { dragging: true }), "grabbing");
});

test("owned pan can promote to pinch and return to pan without a second epoch", () => {
  const coordinator = createInteractionCoordinator();
  const timeline = createSurfaceInteractionController("timeline", coordinator);

  assert.equal(timeline.beginPointer(1, "pan"), true);
  assert.equal(coordinator.snapshot().phase, "owned");
  assert.equal(timeline.beginPointer(2, "pinch"), true);
  assert.deepEqual(coordinator.snapshot().pointerIds, [1, 2]);
  assert.equal(coordinator.snapshot().gesture, "pinch");

  assert.equal(timeline.releasePointer(2), true);
  assert.equal(timeline.claimGesture("pan"), true);
  assert.deepEqual(coordinator.snapshot().pointerIds, [1]);
  assert.equal(coordinator.snapshot().gesture, "pan");

  assert.equal(timeline.releasePointer(1, { commit: true }), true);
  assert.equal(coordinator.snapshot().phase, "committed");
});

test("node drag remains exclusive when a second pointer arrives", () => {
  const coordinator = createInteractionCoordinator();
  const world = createSurfaceInteractionController("world", coordinator);

  assert.equal(world.beginPointer(4, "node-drag"), true);
  assert.equal(world.beginPointer(5, "pinch"), false);
  assert.equal(coordinator.snapshot().gesture, "node-drag");
  assert.deepEqual(coordinator.snapshot().pointerIds, [4]);

  assert.equal(world.releasePointer(5), false);
  assert.equal(world.releasePointer(4, { commit: true }), true);
});

test("unclaimed tap intent can promote to pan after movement tolerance", () => {
  const coordinator = createInteractionCoordinator();
  const timeline = createSurfaceInteractionController("timeline", coordinator);

  assert.equal(timeline.beginPointer(8, "tap", { claim: false }), true);
  assert.equal(coordinator.snapshot().phase, "classification");
  assert.equal(coordinator.snapshot().gesture, "tap");

  assert.equal(timeline.claimGesture("pan"), true);
  assert.equal(coordinator.snapshot().phase, "owned");
  assert.equal(coordinator.snapshot().gesture, "pan");
});

test("discrete camera input shares ownership with pointer gestures", () => {
  const coordinator = createInteractionCoordinator();
  const timeline = createSurfaceInteractionController("timeline", coordinator);
  const world = createSurfaceInteractionController("world", coordinator);

  assert.equal(timeline.beginDiscrete("wheel"), true);
  assert.equal(timeline.beginDiscrete("wheel"), true, "wheel bursts reuse one epoch");
  assert.equal(world.beginDiscrete("keyboard"), false, "another surface cannot steal the epoch");
  assert.equal(timeline.finishDiscrete(), true);
  assert.equal(coordinator.snapshot().phase, "committed");

  assert.equal(world.beginDiscrete("keyboard"), true);
  assert.equal(world.finishDiscrete(), true);
});

test("shared keyboard navigation ignores controls and platform shortcuts", () => {
  assert.equal(
    surfaceKeyboardMayNavigate({ key: "ArrowLeft", target: { tagName: "input" } }),
    false,
  );
  assert.equal(
    surfaceKeyboardMayNavigate({
      key: "ArrowLeft",
      target: { tagName: "DIV", isContentEditable: true },
    }),
    false,
  );
  assert.equal(surfaceKeyboardMayNavigate({ key: "ArrowLeft", metaKey: true }), false);
  assert.equal(surfaceKeyboardMayNavigate({ key: "ArrowLeft", ctrlKey: true }), false);
  assert.equal(surfaceKeyboardMayNavigate({ key: "ArrowLeft", target: { tagName: "DIV" } }), true);
});

test("application navigation yields to a focused camera surface", () => {
  const cameraSurface = {};
  const target = {
    closest(selector) {
      return selector === '[data-surface-keyboard-navigation="camera"]' ? cameraSurface : null;
    },
  };
  assert.equal(surfaceKeyboardTargetOwnsNavigation({ key: "ArrowRight", target }), true);
  assert.equal(
    surfaceKeyboardTargetOwnsNavigation({
      key: "ArrowRight",
      target: { closest: () => null },
    }),
    false,
  );
});

test("retained surfaces use the same renderer-style keyboard camera vocabulary", () => {
  assert.equal(surfaceNavigationFromKeyboard({ key: "ArrowLeft" }, "horizontal"), "pan-negative");
  assert.equal(surfaceNavigationFromKeyboard({ key: "ArrowRight" }, "horizontal"), "pan-positive");
  assert.equal(surfaceNavigationFromKeyboard({ key: "ArrowUp" }, "horizontal"), null);
  assert.equal(surfaceNavigationFromKeyboard({ key: "ArrowUp" }, "vertical"), "pan-negative");
  assert.equal(surfaceNavigationFromKeyboard({ key: "ArrowDown" }, "vertical"), "pan-positive");
  assert.equal(surfaceNavigationFromKeyboard({ key: "+" }, "horizontal"), "zoom-in");
  assert.equal(surfaceNavigationFromKeyboard({ key: "=" }, "horizontal"), "zoom-in");
  assert.equal(surfaceNavigationFromKeyboard({ key: "-" }, "horizontal"), "zoom-out");
  assert.equal(surfaceNavigationFromKeyboard({ key: "Home" }, "horizontal"), "fit-visible");
  assert.equal(
    surfaceNavigationFromKeyboard({ key: "Home", shiftKey: true }, "horizontal"),
    "fit-all",
  );
  assert.equal(
    surfaceNavigationFromKeyboard(
      { key: "ArrowRight", target: { tagName: "BUTTON" } },
      "horizontal",
    ),
    null,
  );
});
