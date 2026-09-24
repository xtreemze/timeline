import assert from "node:assert/strict";
import test from "node:test";

import { D3WorldForceSimulation } from "../src/layout/d3-world-force-simulation.ts";

function node(id, east, collisionRadiusMeters = 300) {
  return {
    id,
    canonicalId: id,
    mass: 1,
    collisionRadiusPx: 22,
    collisionRadiusMeters,
    initialEastMeters: east,
    initialNorthMeters: east === 0 ? 1 : 0,
    targetVisualAltitudeMeters: 1_000,
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
  return { reason: "topology", energyTarget: 0.14, reheat: true };
}

function distance(snapshot, leftId, rightId) {
  const left = snapshot.find((entry) => entry.instanceId === leftId);
  const right = snapshot.find((entry) => entry.instanceId === rightId);
  return Math.hypot(
    left.eastMeters - right.eastMeters,
    left.northMeters - right.northMeters,
  );
}

test("D3 collision and rejection reserve the full force-node footprint", () => {
  const simulation = new D3WorldForceSimulation();
  const left = "left";
  const right = "right";
  simulation.setScene({
    nodes: [node(left, -20), node(right, 20)],
    edges: [],
    anchors: [
      anchor(left, "stockholm", 0),
      anchor(right, "stockholm", 0),
    ],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);

  assert.ok(
    distance(simulation.getSnapshot(), left, right) >= 600,
    "centres remain at least the sum of their visible collision radii apart",
  );
});

test("cluster mode detaches links and D3 gathers members; expansion scatters them again", () => {
  const simulation = new D3WorldForceSimulation();
  const left = "left";
  const right = "right";
  simulation.setScene({
    nodes: [node(left, -900, 180), node(right, 900, 180)],
    edges: [
      {
        id: "connected",
        sourceId: left,
        targetId: right,
        strength: 0.08,
        restLengthMeters: 1_800,
      },
    ],
    anchors: [anchor(left, "stockholm"), anchor(right, "stockholm")],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 40; index += 1) simulation.step(1000 / 60);
  const expandedBefore = distance(simulation.getSnapshot(), left, right);

  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  const collapsed = distance(simulation.getSnapshot(), left, right);
  assert.ok(collapsed < expandedBefore, "detached members gather toward their place origin");

  simulation.setClusteredPlaceIds([]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  const expandedAfter = distance(simulation.getSnapshot(), left, right);
  assert.ok(expandedAfter > collapsed, "restored D3 topology repels/spreads members from the cluster");
});

test("clustering one place does not move an unrelated geographic force group", () => {
  const simulation = new D3WorldForceSimulation();
  const left = "left";
  const right = "right";
  const remote = "remote";
  simulation.setScene({
    nodes: [node(left, -500, 120), node(right, 500, 120), node(remote, 700, 120)],
    edges: [],
    anchors: [
      anchor(left, "stockholm"),
      anchor(right, "stockholm"),
      anchor(remote, "copenhagen", 0),
    ],
  });

  const remoteBefore = simulation.getSnapshot().find((entry) => entry.instanceId === remote);
  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 80; index += 1) simulation.step(1000 / 60);
  const remoteAfter = simulation.getSnapshot().find((entry) => entry.instanceId === remote);

  assert.deepEqual(remoteAfter, remoteBefore);
});
