import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldSimulationCoordinator,
  WORLD_SIMULATION_PRIORITY,
} from "../src/layout/world-force-simulation.ts";

function harness() {
  const calls = [];
  const backend = {
    setScene(scene) {
      calls.push(["scene", scene.nodes.length, scene.edges.length, scene.anchors.length]);
    },
    setPin(pin) {
      calls.push(["pin", pin?.instanceId ?? null]);
    },
    apply(request) {
      calls.push(["apply", request.reason, request.energyTarget, request.reheat]);
    },
    stop() {
      calls.push(["stop"]);
    },
    getDiagnostics() {
      return {
        running: false,
        settled: true,
        energy: 0,
        iteration: 0,
      };
    },
    destroy() {
      calls.push(["destroy"]);
    },
  };
  return {
    backend,
    calls,
    coordinator: createWorldSimulationCoordinator(backend),
  };
}

test("world force priorities keep drag above topology and spatial-anchor updates", () => {
  assert.ok(WORLD_SIMULATION_PRIORITY.drag > WORLD_SIMULATION_PRIORITY.topology);
  assert.ok(
    WORLD_SIMULATION_PRIORITY.topology > WORLD_SIMULATION_PRIORITY["post-drop"],
  );
  assert.ok(
    WORLD_SIMULATION_PRIORITY["post-drop"] >
      WORLD_SIMULATION_PRIORITY["spatial-anchor-update"],
  );
  assert.ok(
    WORLD_SIMULATION_PRIORITY["spatial-anchor-update"] >
      WORLD_SIMULATION_PRIORITY["projection-update"],
  );
});

test("lower-priority anchor and projection work cannot cool an active topology solve", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", energyTarget: 0.12, reheat: true });
  coordinator.request({
    reason: "spatial-anchor-update",
    energyTarget: 0.04,
    reheat: false,
  });
  coordinator.request({
    reason: "projection-update",
    energyTarget: 0,
    reheat: false,
  });

  assert.deepEqual(calls, [["apply", "topology", 0.12, true]]);
  assert.equal(coordinator.getState().reason, "topology");
});

test("node drag temporarily owns simulation energy and returns to topology", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", energyTarget: 0.12, reheat: true });
  coordinator.request({ reason: "drag", energyTarget: 0.2, reheat: true });
  coordinator.request({
    reason: "post-drop",
    energyTarget: 0.035,
    reheat: true,
  });

  assert.deepEqual(calls, [
    ["apply", "topology", 0.12, true],
    ["apply", "drag", 0.2, true],
  ]);

  coordinator.release("drag");
  assert.deepEqual(calls.at(-1), ["apply", "topology", 0.12, true]);

  coordinator.release("topology");
  assert.deepEqual(calls.at(-1), ["apply", "post-drop", 0.035, true]);
});

test("globe or timeline interaction suspension stops simulation until all owners release", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", energyTarget: 0.12, reheat: true });
  coordinator.suspend("globe-camera");
  coordinator.suspend("timeline-drag");
  coordinator.resume("globe-camera");

  assert.deepEqual(calls, [
    ["apply", "topology", 0.12, true],
    ["stop"],
  ]);
  assert.equal(coordinator.getState().running, false);
  assert.deepEqual(coordinator.getState().suspendedReasons, ["timeline-drag"]);

  coordinator.resume("timeline-drag");
  assert.deepEqual(calls.at(-1), ["apply", "topology", 0.12, true]);
  assert.equal(coordinator.getState().running, true);
});

test("releasing the last active request applies an explicit idle request", () => {
  const { calls, coordinator } = harness();

  coordinator.request({
    reason: "projection-update",
    energyTarget: 0.02,
    reheat: false,
  });
  coordinator.release("projection-update");

  assert.deepEqual(calls, [
    ["apply", "projection-update", 0.02, false],
    ["apply", "idle", 0, false],
  ]);
  assert.equal(coordinator.getState().reason, null);
  assert.equal(coordinator.getState().running, false);
});

test("world simulation backend contract keeps scene, pins, and diagnostics separate from canonical state", () => {
  const { backend, calls } = harness();

  backend.setScene({
    nodes: [
      {
        id: "[\"alice\",\"meeting\"]",
        canonicalId: "alice",
        mass: 2,
        collisionRadiusMeters: 100,
      },
    ],
    edges: [],
    anchors: [
      {
        instanceId: "[\"alice\",\"meeting\"]",
        placeId: "stockholm",
        longitude: 18.0686,
        latitude: 59.3293,
        sourceAltitudeMeters: 0,
        influence: 1,
        precisionRadiusMeters: 10,
      },
    ],
  });
  backend.setPin({
    instanceId: "[\"alice\",\"meeting\"]",
    eastMeters: 20,
    northMeters: 10,
    visualAltitudeMeters: 1000,
  });

  assert.deepEqual(calls, [
    ["scene", 1, 0, 1],
    ["pin", "[\"alice\",\"meeting\"]"],
  ]);
  assert.deepEqual(backend.getDiagnostics(), {
    running: false,
    settled: true,
    energy: 0,
    iteration: 0,
  });
});
