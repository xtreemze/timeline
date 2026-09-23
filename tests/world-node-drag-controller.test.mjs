import assert from "node:assert/strict";
import test from "node:test";

import { createInteractionCoordinator } from "../src/interaction/interaction-coordinator.ts";
import { createWorldNodeDragController } from "../src/interaction/world-node-drag-controller.ts";
import { createWorldSimulationCoordinator } from "../src/layout/world-force-simulation.ts";
import { WorldViewRuntimeController } from "../site/world/world-view-controller.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

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

  assert.deepEqual(calls.slice(-2), [
    ["pin", null, null, null, null],
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


function runtimeProjection() {
  const alice = worldInstanceId("alice", "meeting");
  const bob = worldInstanceId("bob", "meeting");
  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: alice,
        canonicalId: "alice",
        occurrenceId: "meeting",
        geographicAnchors: [{
          placeId: "stockholm",
          longitude: 18.0686,
          latitude: 59.3293,
          influence: 1,
        }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
        visualAltitude: 1000,
      }),
      createProjectedWorldInstance({
        id: bob,
        canonicalId: "bob",
        occurrenceId: "meeting",
        geographicAnchors: [{
          placeId: "stockholm",
          longitude: 18.0686,
          latitude: 59.3293,
          influence: 1,
        }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
        visualAltitude: 1000,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "meeting",
        sourceInstanceId: alice,
        targetInstanceId: bob,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

function runtimeHarness({ settled = false, readback = false } = {}) {
  const calls = [];
  const diagnostics = { running: false, settled, energy: 0, iteration: 0 };
  let pin = null;
  const surface = {
    setProjection(value) { calls.push(["surface:projection", value]); },
    setTemporalWindow(value) { calls.push(["surface:window", value]); },
    setSelection(value) { calls.push(["surface:selection", value]); },
    getCamera() { return { longitude: 0, latitude: 0, zoom: 1, bearing: 0, pitch: 0 }; },
    setCamera() {},
    focusEntity(id) { calls.push(["surface:focus-entity", id]); },
    focusOccurrence(id) { calls.push(["surface:focus-occurrence", id]); },
    focusPlace(id) { calls.push(["surface:focus-place", id]); },
    pick() { return null; },
    getCapabilities() {
      return {
        globe: true,
        depthPicking: true,
        directNodeDrag: true,
        gpuFiltering: false,
        localPrecisionMode: false,
      };
    },
    refresh() { calls.push(["surface:refresh"]); },
    destroy() { calls.push(["surface:destroy"]); },
  };
  const forceBackend = {
    setScene(scene) { calls.push(["force:scene", scene]); },
    setPin(value) { pin = value; calls.push(["force:pin", value]); },
    apply(request) {
      diagnostics.running = request.reason !== "idle";
      if (request.reason === "idle") diagnostics.settled = true;
      calls.push(["force:apply", request]);
    },
    stop() { diagnostics.running = false; calls.push(["force:stop"]); },
    step(deltaMs) { diagnostics.iteration += 1; calls.push(["force:step", deltaMs]); },
    getDiagnostics() { return { ...diagnostics }; },
    destroy() { calls.push(["force:destroy"]); },
  };
  const options = { surface, forceBackend };
  if (readback) {
    options.layoutReadback = {
      read() {
        return [{
          instanceId: worldInstanceId("alice", "meeting"),
          eastMeters: 100,
          northMeters: 50,
          visualAltitudeMeters: 1500,
        }];
      },
    };
  }
  return {
    calls,
    controller: new WorldViewRuntimeController(options),
    diagnostics,
    getPin: () => pin,
  };
}

test("world runtime sends one projection revision to force and world surface", () => {
  const { calls, controller } = runtimeHarness();
  const input = runtimeProjection();
  controller.setProjection(input);

  assert.equal(controller.state().projectionRevision, 1);
  assert.equal(controller.state().hasProjection, true);
  assert.equal(calls[0][0], "force:scene");
  assert.equal(calls[1][0], "force:apply");
  assert.deepEqual(calls[2], ["surface:projection", input]);
});

test("world runtime keeps CPU layout readback optional for GPU backends", () => {
  const { calls, controller } = runtimeHarness();
  controller.setProjection(runtimeProjection());
  const before = calls.filter(([name]) => name === "surface:projection").length;
  controller.step(16);
  const after = calls.filter(([name]) => name === "surface:projection").length;
  assert.equal(after, before);
});

test("reference readback updates only derived world layout", () => {
  const { controller } = runtimeHarness({ readback: true });
  const input = runtimeProjection();
  const before = JSON.stringify(input);
  controller.setProjection(input);
  controller.step(16);

  const alice = controller
    .getRenderProjection()
    .instances.find((instance) => instance.canonicalId === "alice");
  assert.deepEqual(alice.localOffset, { eastMeters: 100, northMeters: 50 });
  assert.equal(alice.visualAltitude, 1500);
  assert.equal(JSON.stringify(input), before);
});

test("world runtime delegates canonical focus and drag settling", () => {
  const { calls, controller, diagnostics, getPin } = runtimeHarness();
  const input = runtimeProjection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");
  controller.setProjection(input);

  controller.focusEntity("alice");
  controller.focusOccurrence("meeting");
  controller.focusPlace("stockholm");
  assert.deepEqual(
    calls.filter(([name]) => name.startsWith("surface:focus")),
    [
      ["surface:focus-entity", "alice"],
      ["surface:focus-occurrence", "meeting"],
      ["surface:focus-place", "stockholm"],
    ],
  );

  assert.equal(
    controller.beginNodeDrag(7, alice.id, {
      eastMeters: 10,
      northMeters: 20,
      visualAltitudeMeters: 1200,
    }),
    true,
  );
  assert.equal(getPin().instanceId, alice.id);
  assert.equal(controller.releaseNodeDrag(7), true);
  diagnostics.settled = true;
  controller.step(16);
  assert.equal(controller.state().settlingDrag, false);
});

test("world runtime teardown destroys force and surface exactly once", () => {
  const { calls, controller } = runtimeHarness();
  controller.destroy();
  controller.destroy();
  assert.equal(calls.filter(([name]) => name === "force:destroy").length, 1);
  assert.equal(calls.filter(([name]) => name === "surface:destroy").length, 1);
});
