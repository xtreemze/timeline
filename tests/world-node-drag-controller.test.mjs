import assert from "node:assert/strict";
import test from "node:test";

import { createInteractionCoordinator } from "../src/interaction/interaction-coordinator.ts";
import { createWorldNodeDragController } from "../src/interaction/world-node-drag-controller.ts";
import { createWorldSimulationCoordinator } from "../src/layout/world-force-simulation.ts";

function harness() {
  const calls = [];
  const backend = {
    setScene() {},
    setPin(pin) {
      calls.push([
        "pin",
        pin?.instanceId ?? null,
        pin?.eastMeters ?? null,
        pin?.northMeters ?? null,
        pin?.visualAltitudeMeters ?? null,
      ]);
    },
    apply(request) {
      calls.push(["apply", request.reason, request.energyTarget, request.reheat]);
    },
    stop() {
      calls.push(["stop"]);
    },
    getDiagnostics() {
      return { running: false, settled: false, energy: null, iteration: null };
    },
    destroy() {},
  };
  const interaction = createInteractionCoordinator();
  const simulation = createWorldSimulationCoordinator(backend);
  const controller = createWorldNodeDragController(interaction, simulation, backend);

  return { calls, backend, controller, interaction, simulation };
}

const target = {
  instanceId: '["alice","meeting"]',
  position: {
    eastMeters: 40,
    northMeters: -20,
    visualAltitudeMeters: 1200,
  },
};

test("world node drag claims interaction ownership and pins the selected world instance", () => {
  const { calls, controller, interaction, simulation } = harness();

  assert.equal(controller.begin(7, target), true);
  assert.deepEqual(controller.state(), {
    active: true,
    instanceId: '["alice","meeting"]',
    pointerId: 7,
    settling: false,
  });
  assert.equal(interaction.snapshot().owner, "world");
  assert.equal(interaction.snapshot().gesture, "node-drag");
  assert.equal(interaction.snapshot().phase, "owned");
  assert.equal(simulation.getState().reason, "drag");

  assert.deepEqual(calls, [
    ["pin", '["alice","meeting"]', 40, -20, 1200],
    ["apply", "drag", 0.2, true],
  ]);
});

test("owned world drag cannot be stolen by timeline or migration graph/map owners", () => {
  const { controller, interaction } = harness();
  controller.begin(7, target);

  assert.equal(interaction.begin("timeline", 8), false);
  assert.equal(interaction.begin("graph", 9), false);
  assert.equal(interaction.begin("map", 10), false);
  assert.equal(interaction.snapshot().owner, "world");
});

test("drag updates accept only the owning pointer and update a transient force pin", () => {
  const { calls, controller } = harness();
  controller.begin(7, target);

  assert.equal(
    controller.update(8, {
      eastMeters: 200,
      northMeters: 300,
      visualAltitudeMeters: 1600,
    }),
    false,
  );

  assert.equal(
    controller.update(7, {
      eastMeters: 200,
      northMeters: 300,
      visualAltitudeMeters: 1600,
    }),
    true,
  );

  assert.deepEqual(calls.at(-1), [
    "pin",
    '["alice","meeting"]',
    200,
    300,
    1600,
  ]);
});

test("ordinary release clears the pin and enters explicit post-drop settling", () => {
  const { calls, controller, interaction, simulation } = harness();
  controller.begin(7, target);

  assert.equal(controller.release(7), true);
  assert.equal(interaction.snapshot().phase, "settling");
  assert.equal(interaction.snapshot().owner, "world");
  assert.equal(simulation.getState().reason, "post-drop");
  assert.deepEqual(controller.state(), {
    active: false,
    instanceId: null,
    pointerId: null,
    settling: true,
  });

  assert.deepEqual(calls.slice(-3), [
    ["pin", null, null, null, null],
    ["apply", "post-drop", 0.035, true],
    ["apply", "post-drop", 0.035, true],
  ]);
});

test("settling commit releases post-drop force work and commits world interaction", () => {
  const { calls, controller, interaction, simulation } = harness();
  controller.begin(7, target);
  controller.release(7);

  assert.equal(controller.commit(), true);
  assert.equal(controller.state().settling, false);
  assert.equal(interaction.snapshot().phase, "committed");
  assert.equal(interaction.snapshot().owner, null);
  assert.equal(interaction.snapshot().reason, "release");
  assert.equal(simulation.getState().reason, null);
  assert.deepEqual(calls.at(-1), ["apply", "idle", 0, false]);
});

test("pointer cancellation releases the pin and drag ownership without stale post-drop work", () => {
  const { calls, controller, interaction, simulation } = harness();
  controller.begin(7, target);

  const state = controller.cancel("pointercancel");

  assert.deepEqual(state, {
    active: false,
    instanceId: null,
    pointerId: null,
    settling: false,
  });
  assert.equal(interaction.snapshot().phase, "committed");
  assert.equal(interaction.snapshot().reason, "pointercancel");
  assert.equal(simulation.getState().reason, null);
  assert.deepEqual(calls.slice(-2), [
    ["pin", null, null, null, null],
    ["apply", "idle", 0, false],
  ]);
});

test("invalid drag geometry fails before acquiring interaction ownership", () => {
  const { controller, interaction } = harness();

  assert.throws(
    () =>
      controller.begin(7, {
        ...target,
        position: {
          eastMeters: Number.NaN,
          northMeters: 0,
          visualAltitudeMeters: 1000,
        },
      }),
    /east offset/,
  );

  assert.equal(interaction.snapshot().phase, "idle");
  assert.equal(interaction.snapshot().owner, null);
});

test("negative visual altitude is rejected as presentation state", () => {
  const { controller, interaction } = harness();

  assert.throws(
    () =>
      controller.begin(7, {
        ...target,
        position: {
          eastMeters: 0,
          northMeters: 0,
          visualAltitudeMeters: -1,
        },
      }),
    /visual altitude/,
  );

  assert.equal(interaction.snapshot().phase, "idle");
});

test("a new world drag cannot start until the previous release is committed", () => {
  const { controller } = harness();

  assert.equal(controller.begin(7, target), true);
  assert.equal(controller.release(7), true);
  assert.equal(controller.begin(8, target), false);
  assert.equal(controller.commit(), true);
  assert.equal(controller.begin(8, target), true);
});
