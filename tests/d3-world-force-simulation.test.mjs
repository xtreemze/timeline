import assert from "node:assert/strict";
import test from "node:test";

import { D3WorldForceSimulation } from "../src/layout/d3-world-force-simulation.ts";

function node(id, east, collisionRadiusMeters = 300, overrides = {}) {
  return {
    id,
    canonicalId: id,
    mass: 1,
    collisionRadiusPx: 22,
    collisionRadiusMeters,
    initialEastMeters: east,
    initialNorthMeters: east === 0 ? 1 : 0,
    targetVisualAltitudeMeters: 1_000,
    ...overrides,
  };
}

function anchor(instanceId, placeId, influence = 1) {
  return {
    instanceId,
    placeId,
    longitude: placeId === "stockholm" ? 18.0686 : 12.5683,
    latitude: placeId === "stockholm" ? 59.3293 : 55.6761,
    sourceAltitudeMeters: 0,
    influence,
    precisionRadiusMeters: 0,
  };
}

function topologyRequest() {
  return { reason: "topology", excitation: 0.14, reheat: true };
}

function distance(snapshot, leftId, rightId) {
  const left = snapshot.find((entry) => entry.instanceId === leftId);
  const right = snapshot.find((entry) => entry.instanceId === rightId);
  return Math.hypot(left.eastMeters - right.eastMeters, left.northMeters - right.northMeters);
}

test("D3 collision and rejection reserve the full visible force-node footprint", () => {
  const simulation = new D3WorldForceSimulation();
  const alice = '["alice",null]';
  const bob = '["bob",null]';
  simulation.setScene({
    nodes: [node(alice, -20, 360), node(bob, 20, 360)],
    edges: [],
    anchors: [anchor(alice, "stockholm", 0), anchor(bob, "stockholm", 0)],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);

  assert.ok(
    distance(simulation.getSnapshot(), alice, bob) >= 700,
    "D3 must not settle visibly overlapping nodes inside their combined collision radii",
  );
});

test("cluster lifecycle detaches links, gathers with D3, then scatters from the gathered state", () => {
  const simulation = new D3WorldForceSimulation();
  const alice = '["alice",null]';
  const bob = '["bob",null]';
  simulation.setScene({
    nodes: [node(alice, -900, 180), node(bob, 900, 180)],
    edges: [
      {
        id: "meeting",
        sourceId: alice,
        targetId: bob,
        strength: 0.08,
        restLengthMeters: 1_800,
      },
    ],
    anchors: [anchor(alice, "stockholm", 1), anchor(bob, "stockholm", 1)],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 60; index += 1) simulation.step(1000 / 60);
  const expandedBefore = distance(simulation.getSnapshot(), alice, bob);

  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const collapsed = distance(simulation.getSnapshot(), alice, bob);
  assert.ok(collapsed < expandedBefore, "D3 gathers the detached place group");

  simulation.setClusteredPlaceIds([], ["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const expandedDetached = distance(simulation.getSnapshot(), alice, bob);
  assert.ok(
    expandedDetached > collapsed,
    "D3 rejection scatters retained members while relationship links remain detached",
  );

  simulation.setClusteredPlaceIds([], []);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 60; index += 1) simulation.step(1000 / 60);
  assert.ok(
    distance(simulation.getSnapshot(), alice, bob) > collapsed,
    "restoring links happens only after the free scatter phase",
  );
});

test("D3 DAG targets remain soft guidance outside collapsed clusters", () => {
  const simulation = new D3WorldForceSimulation();
  const id = '["alice",null]';
  simulation.setScene({
    nodes: [
      node(id, 0, 100, {
        layoutTargetEastMeters: 1_000,
        layoutTargetNorthMeters: 0,
        layoutTargetStrength: 0.08,
      }),
    ],
    edges: [],
    anchors: [anchor(id, "stockholm", 0)],
  });
  const before = simulation.getSnapshot()[0].eastMeters;
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  assert.ok(simulation.getSnapshot()[0].eastMeters > before);
});
