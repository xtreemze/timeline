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

function anchor(instanceId, placeId, influence = 1, overrides = {}) {
  return {
    instanceId,
    placeId,
    longitude: placeId === "stockholm" ? 18.0686 : 12.5683,
    latitude: placeId === "stockholm" ? 59.3293 : 55.6761,
    sourceAltitudeMeters: 0,
    influence,
    precisionRadiusMeters: 0,
    ...overrides,
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

test("D3 drag and post-drop stay local and publish sparse changed positions", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","stockholm"]';
  const peer = '["bob","stockholm"]';
  const remoteA = '["carol","copenhagen"]';
  const remoteB = '["dave","copenhagen"]';

  simulation.setScene({
    nodes: [
      node(dragged, -600, 180),
      node(peer, 600, 180),
      node(remoteA, -500, 180),
      node(remoteB, 500, 180),
    ],
    edges: [
      {
        id: "stockholm-link",
        sourceId: dragged,
        targetId: peer,
        strength: 0.08,
        restLengthMeters: 1_200,
      },
      {
        id: "copenhagen-link",
        sourceId: remoteA,
        targetId: remoteB,
        strength: 0.08,
        restLengthMeters: 1_000,
      },
    ],
    anchors: [
      anchor(dragged, "stockholm", 1),
      anchor(peer, "stockholm", 1),
      anchor(remoteA, "copenhagen", 1),
      anchor(remoteB, "copenhagen", 1),
    ],
  });

  assert.equal(simulation.getChangedSnapshot().length, 4);
  const remoteBefore = simulation
    .getSnapshot()
    .filter((entry) => entry.instanceId === remoteA || entry.instanceId === remoteB);

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 2_000_000,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  simulation.step(1000 / 60);
  assert.deepEqual(
    simulation
      .getChangedSnapshot()
      .map((entry) => entry.instanceId)
      .sort(),
    [dragged, peer].sort(),
    "direct manipulation should publish only the affected place group",
  );

  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", excitation: 0.035, reheat: true });
  simulation.step(1000 / 60);
  assert.deepEqual(
    simulation
      .getChangedSnapshot()
      .map((entry) => entry.instanceId)
      .sort(),
    [dragged, peer].sort(),
    "post-drop settling should keep unrelated places asleep",
  );

  const remoteAfter = simulation
    .getSnapshot()
    .filter((entry) => entry.instanceId === remoteA || entry.instanceId === remoteB);
  assert.deepEqual(remoteAfter, remoteBefore);
});

test("D3 drag collides with nodes registered to a different place", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","stockholm"]';
  const foreign = '["bob","nearby-place"]';

  simulation.setScene({
    nodes: [node(dragged, -500, 240), node(foreign, 1, 240)],
    edges: [],
    anchors: [
      anchor(dragged, "stockholm", 0, { longitude: 18, latitude: 59 }),
      anchor(foreign, "nearby-place", 0, { longitude: 18.001, latitude: 59 }),
    ],
  });
  simulation.getChangedSnapshot();

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 58,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  for (let index = 0; index < 4; index += 1) simulation.step(1000 / 60);

  const snapshot = simulation.getSnapshot();
  const draggedPosition = snapshot.find((entry) => entry.instanceId === dragged);
  const foreignPosition = snapshot.find((entry) => entry.instanceId === foreign);
  assert.ok(draggedPosition && foreignPosition);
  assert.equal(draggedPosition.eastMeters, 58, "the pointer-owned node must remain pinned");
  assert.ok(
    Math.abs(foreignPosition.eastMeters - 1) > 100,
    "cross-place collision must displace the foreign node instead of allowing overlap",
  );
  assert.ok(
    simulation.getChangedSnapshot().some((entry) => entry.instanceId === foreign),
    "the collided foreign place must be published as changed",
  );
});

test("D3 long-distance release bounds the first post-drop force step", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","long-release"]';
  const peer = '["bob","long-release"]';

  simulation.setScene({
    nodes: [node(dragged, 0, 120), node(peer, 1_000, 120)],
    edges: [
      {
        id: "long-release-link",
        sourceId: dragged,
        targetId: peer,
        strength: 1,
        restLengthMeters: 1_000,
      },
    ],
    anchors: [anchor(dragged, "stockholm", 1), anchor(peer, "stockholm", 1)],
  });

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 10_000_000,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  simulation.step(1000 / 60);

  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", excitation: 0.035, reheat: true });
  const before = simulation.getSnapshot();
  simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  const beforeDragged = before.find((entry) => entry.instanceId === dragged);
  const afterDragged = after.find((entry) => entry.instanceId === dragged);
  const beforePeer = before.find((entry) => entry.instanceId === peer);
  const afterPeer = after.find((entry) => entry.instanceId === peer);

  assert.ok(beforeDragged && afterDragged && beforePeer && afterPeer);
  const draggedStep = Math.hypot(
    afterDragged.eastMeters - beforeDragged.eastMeters,
    afterDragged.northMeters - beforeDragged.northMeters,
  );
  const peerStep = Math.hypot(
    afterPeer.eastMeters - beforePeer.eastMeters,
    afterPeer.northMeters - beforePeer.northMeters,
  );

  assert.ok(Number.isFinite(draggedStep));
  assert.ok(Number.isFinite(peerStep));
  assert.ok(draggedStep < 10_000, `released node jumped ${draggedStep.toFixed(1)}m in one step`);
  assert.ok(peerStep < 10_000, `connected peer jumped ${peerStep.toFixed(1)}m in one step`);
  assert.ok(
    Math.abs(afterDragged.eastMeters) < Math.abs(beforeDragged.eastMeters),
    "released node should return toward its authored place without a distance-amplified snap",
  );
});
