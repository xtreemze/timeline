import assert from "node:assert/strict";
import test from "node:test";

import { WorldViewRuntimeController } from "../site/world/world-view-controller.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function projection() {
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

function harness({ settled = false, readback = false } = {}) {
  const calls = [];
  const diagnostics = { running: false, settled, energy: 0, iteration: 0 };
  let pin = null;

  const surface = {
    setProjection(value) { calls.push(["surface:projection", value]); },
    setTemporalWindow(value) { calls.push(["surface:window", value]); },
    setSelection(value) { calls.push(["surface:selection", value]); },
    getCamera() { return { longitude: 0, latitude: 0, zoom: 1, bearing: 0, pitch: 0 }; },
    setCamera() {},
    focusEntity() {},
    focusOccurrence() {},
    focusPlace() {},
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

  const backend = {
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

  const options = { surface, forceBackend: backend };
  if (readback) {
    options.layoutReadback = {
      read() {
        const id = worldInstanceId("alice", "meeting");
        return [{
          instanceId: id,
          eastMeters: 100,
          northMeters: 50,
          visualAltitudeMeters: 1500,
        }];
      },
    };
  }

  return {
    calls,
    backend,
    surface,
    controller: new WorldViewRuntimeController(options),
    diagnostics,
    getPin: () => pin,
  };
}

test("projection updates feed force scene and WorldSurface from one revision", () => {
  const { calls, controller } = harness();
  const input = projection();

  controller.setProjection(input);

  assert.equal(controller.state().projectionRevision, 1);
  assert.equal(controller.state().hasProjection, true);
  assert.equal(calls[0][0], "force:scene");
  assert.equal(calls[1][0], "force:apply");
  assert.deepEqual(calls[2], ["surface:projection", input]);
});

test("runtime delegates temporal window and canonical selection to WorldSurface", () => {
  const { calls, controller } = harness();

  controller.setTemporalWindow({ start: 10, end: 20 });
  controller.setSelection({ kind: "entity", id: "alice" });

  assert.deepEqual(calls, [
    ["surface:window", { start: 10, end: 20 }],
    ["surface:selection", { kind: "entity", id: "alice" }],
  ]);
});

test("optional reference readback applies derived layout without changing source projection", () => {
  const { calls, controller } = harness({ readback: true });
  const input = projection();
  const before = JSON.stringify(input);

  controller.setProjection(input);
  controller.step(16);

  const output = controller.getRenderProjection();
  const alice = output.instances.find((instance) => instance.canonicalId === "alice");

  assert.deepEqual(alice.localOffset, { eastMeters: 100, northMeters: 50 });
  assert.equal(alice.visualAltitude, 1500);
  assert.equal(JSON.stringify(input), before);
  assert.equal(calls.at(-1)[0], "surface:projection");
});

test("world drag lifecycle is coordinated with force pin and post-drop settling", () => {
  const { controller, getPin, diagnostics } = harness();
  const input = projection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");

  controller.setProjection(input);

  assert.equal(
    controller.beginNodeDrag(7, alice.id, {
      eastMeters: 10,
      northMeters: 20,
      visualAltitudeMeters: 1200,
    }),
    true,
  );
  assert.equal(getPin().instanceId, alice.id);

  assert.equal(
    controller.updateNodeDrag(7, {
      eastMeters: 40,
      northMeters: 50,
      visualAltitudeMeters: 1300,
    }),
    true,
  );
  assert.equal(getPin().eastMeters, 40);

  assert.equal(controller.releaseNodeDrag(7), true);
  assert.equal(getPin(), null);
  assert.equal(controller.state().settlingDrag, true);

  diagnostics.settled = true;
  controller.step(16);

  assert.equal(controller.state().settlingDrag, false);
  assert.equal(controller.getInteractionCoordinator().snapshot().phase, "committed");
});

test("GPU-style backends are not required to expose CPU layout readback", () => {
  const { calls, controller } = harness();
  controller.setProjection(projection());
  const projectionCallsBefore = calls.filter(([name]) => name === "surface:projection").length;

  controller.step(16);

  const projectionCallsAfter = calls.filter(([name]) => name === "surface:projection").length;
  assert.equal(projectionCallsAfter, projectionCallsBefore);
});

test("destroy is idempotent and shuts down force and surface execution", () => {
  const { calls, controller } = harness();
  controller.destroy();
  controller.destroy();

  assert.equal(calls.filter(([name]) => name === "force:destroy").length, 1);
  assert.equal(calls.filter(([name]) => name === "surface:destroy").length, 1);
  assert.throws(() => controller.refresh(), /destroyed/);
});


test("identical projection updates are ignored without reheating or re-rendering", () => {
  const { calls, controller } = harness();
  const input = projection();

  controller.setProjection(input);
  const revision = controller.state().projectionRevision;
  const callCount = calls.length;

  controller.setProjection(input);

  assert.equal(controller.state().projectionRevision, revision);
  assert.equal(calls.length, callCount);
});

test("projection updates retain layout samples only for surviving world instances", () => {
  const { calls, controller } = harness({ readback: true });
  const initial = projection();
  controller.setProjection(initial);

  const alice = initial.instances.find((instance) => instance.canonicalId === "alice");
  const charlieId = worldInstanceId("charlie", "follow-up");
  const next = createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        ...alice,
        visualWeight: 0.75,
      }),
      createProjectedWorldInstance({
        id: charlieId,
        canonicalId: "charlie",
        occurrenceId: "follow-up",
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [],
  });

  controller.setProjection(next);

  const render = controller.getRenderProjection();
  const retainedAlice = render.instances.find((instance) => instance.id === alice.id);
  const charlie = render.instances.find((instance) => instance.id === charlieId);

  assert.deepEqual(retainedAlice.localOffset, { eastMeters: 100, northMeters: 50 });
  assert.equal(retainedAlice.visualAltitude, 1500);
  assert.equal(charlie.localOffset, undefined);

  const latestScene = [...calls].reverse().find(([name]) => name === "force:scene")[1];
  const sceneAlice = latestScene.instances.find((instance) => instance.id === alice.id);
  assert.deepEqual(sceneAlice.localOffset, { eastMeters: 100, northMeters: 50 });
});
