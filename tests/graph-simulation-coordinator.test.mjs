import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphSimulationCoordinator,
  GRAPH_SIMULATION_PRIORITY,
} from "../src/layout/graph-simulation-coordinator.ts";

function harness() {
  const calls = [];
  const coordinator = createGraphSimulationCoordinator({
    apply(request) {
      calls.push(["apply", request.reason, request.alphaTarget, request.reheat]);
    },
    stop() {
      calls.push(["stop"]);
    },
  });
  return { calls, coordinator };
}

test("RED #374 topology solve cannot be cooled by lower-priority geometry or popover work", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", alphaTarget: 0.12, reheat: true });
  coordinator.request({ reason: "popover-exclusion", alphaTarget: 0, reheat: false });
  coordinator.request({ reason: "geometry-refresh", alphaTarget: 0, reheat: false });

  assert.deepEqual(calls, [["apply", "topology", 0.12, true]]);
  assert.equal(coordinator.getState().reason, "topology");
  assert.equal(coordinator.getState().running, true);
});

test("RED #374 competing-surface suspension stages topology and resumes the highest-priority solve once", () => {
  const { calls, coordinator } = harness();

  coordinator.suspend("competing-surface");
  coordinator.request({ reason: "geometry-refresh", alphaTarget: 0, reheat: false });
  coordinator.request({ reason: "topology", alphaTarget: 0.12, reheat: true });
  coordinator.resume("competing-surface");

  assert.deepEqual(calls, [["stop"], ["apply", "topology", 0.12, true]]);
  assert.deepEqual(coordinator.getState().suspendedReasons, []);
  assert.equal(coordinator.getState().reason, "topology");
});

test("RED #374 node drag has priority over topology and post-drop settling", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", alphaTarget: 0.12, reheat: true });
  coordinator.request({ reason: "drag", alphaTarget: 0.2, reheat: true });
  coordinator.request({ reason: "post-drop", alphaTarget: 0.035, reheat: true });

  assert.deepEqual(calls, [
    ["apply", "topology", 0.12, true],
    ["apply", "drag", 0.2, true],
  ]);

  coordinator.release("drag");
  assert.deepEqual(calls.at(-1), ["apply", "topology", 0.12, true]);

  coordinator.release("topology");
  assert.deepEqual(calls.at(-1), ["apply", "post-drop", 0.035, true]);
});

test("RED #374 multiple suspension owners require every owner to release before simulation resumes", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", alphaTarget: 0.12, reheat: true });
  coordinator.suspend("competing-surface");
  coordinator.suspend("hidden");
  coordinator.resume("competing-surface");

  assert.deepEqual(calls, [["apply", "topology", 0.12, true], ["stop"]]);
  assert.equal(coordinator.getState().running, false);
  assert.deepEqual(coordinator.getState().suspendedReasons, ["hidden"]);

  coordinator.resume("hidden");
  assert.deepEqual(calls.at(-1), ["apply", "topology", 0.12, true]);
  assert.equal(coordinator.getState().running, true);
});

test("RED #374 stale low-priority settle work cannot overwrite an active topology solve", () => {
  const { calls, coordinator } = harness();

  coordinator.request({ reason: "topology", alphaTarget: 0.12, reheat: true });
  coordinator.request({ reason: "post-drop", alphaTarget: 0.025, reheat: false });
  coordinator.request({ reason: "geometry-refresh", alphaTarget: 0, reheat: false });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["apply", "topology", 0.12, true]);
});

test("RED #374 force priorities encode the documented lifecycle order", () => {
  assert.ok(GRAPH_SIMULATION_PRIORITY.drag > GRAPH_SIMULATION_PRIORITY.topology);
  assert.ok(GRAPH_SIMULATION_PRIORITY.topology > GRAPH_SIMULATION_PRIORITY["post-drop"]);
  assert.ok(
    GRAPH_SIMULATION_PRIORITY["post-drop"] > GRAPH_SIMULATION_PRIORITY["popover-exclusion"],
  );
  assert.ok(
    GRAPH_SIMULATION_PRIORITY["popover-exclusion"] > GRAPH_SIMULATION_PRIORITY["geometry-refresh"],
  );
});
