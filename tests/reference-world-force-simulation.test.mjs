import assert from "node:assert/strict";
import test from "node:test";

import { ReferenceWorldForceSimulation } from "../src/layout/reference-world-force-simulation.ts";

function node(id, overrides = {}) {
  return {
    id,
    canonicalId: id.includes("alice") ? "alice" : "bob",
    mass: 1,
    collisionRadiusMeters: 100,
    initialEastMeters: 0,
    initialNorthMeters: 0,
    targetVisualAltitudeMeters: 1000,
    ...overrides,
  };
}

function anchor(instanceId, placeId, overrides = {}) {
  return {
    instanceId,
    placeId,
    longitude: placeId === "stockholm" ? 18.0686 : 12.5683,
    latitude: placeId === "stockholm" ? 59.3293 : 55.6761,
    sourceAltitudeMeters: 0,
    influence: 1,
    precisionRadiusMeters: 0,
    ...overrides,
  };
}

function topologyRequest() {
  return { reason: "topology", energyTarget: 0.12, reheat: true };
}

test("reference solver starts from explicit local offsets and visual altitude", () => {
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene({
    nodes: [
      node('["alice","meeting"]', {
        initialEastMeters: 40,
        initialNorthMeters: -20,
        targetVisualAltitudeMeters: 1200,
      }),
    ],
    edges: [],
    anchors: [anchor('["alice","meeting"]', "stockholm")],
  });

  assert.deepEqual(simulation.getSnapshot(), [
    {
      instanceId: '["alice","meeting"]',
      eastMeters: 40,
      northMeters: -20,
      visualAltitudeMeters: 1200,
    },
  ]);
});

test("reference solver is deterministic when no explicit offset exists", () => {
  const scene = {
    nodes: [node('["alice","meeting"]'), node('["bob","meeting"]')],
    edges: [],
    anchors: [anchor('["alice","meeting"]', "stockholm"), anchor('["bob","meeting"]', "stockholm")],
  };

  const first = new ReferenceWorldForceSimulation();
  const second = new ReferenceWorldForceSimulation();
  first.setScene(scene);
  second.setScene(scene);

  assert.deepEqual(first.getSnapshot(), second.getSnapshot());

  first.apply(topologyRequest());
  second.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) {
    first.step(1000 / 60);
    second.step(1000 / 60);
  }

  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.deepEqual(first.getDiagnostics(), second.getDiagnostics());
});

test("same-place topology participates in local layout", () => {
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene({
    nodes: [
      node('["alice","meeting"]', { initialEastMeters: -400 }),
      node('["bob","meeting"]', { initialEastMeters: 400 }),
    ],
    edges: [
      {
        id: "meeting",
        sourceId: '["alice","meeting"]',
        targetId: '["bob","meeting"]',
        strength: 0.2,
        restLengthMeters: 300,
      },
    ],
    anchors: [
      anchor('["alice","meeting"]', "stockholm", { influence: 0 }),
      anchor('["bob","meeting"]', "stockholm", { influence: 0 }),
    ],
  });

  const before = simulation.getSnapshot();
  simulation.apply(topologyRequest());
  for (let index = 0; index < 40; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  const beforeDistance = Math.abs(before[1].eastMeters - before[0].eastMeters);
  const afterDistance = Math.abs(after[1].eastMeters - after[0].eastMeters);
  assert.ok(afterDistance < beforeDistance);
});

test("default repulsion spreads a dense same-anchor group beyond label-scale crowding", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const ids = [
    '["alice","dense-a"]',
    '["bob","dense-b"]',
    '["carol","dense-c"]',
    '["dave","dense-d"]',
  ];
  simulation.setScene({
    nodes: ids.map((id) => node(id, { collisionRadiusMeters: 120 })),
    edges: [],
    anchors: ids.map((id) => anchor(id, "stockholm", { influence: 0 })),
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);

  const positions = simulation.getSnapshot();
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < positions.length; left += 1) {
    for (let right = left + 1; right < positions.length; right += 1) {
      const a = positions[left];
      const b = positions[right];
      minimum = Math.min(
        minimum,
        Math.hypot(a.eastMeters - b.eastMeters, a.northMeters - b.northMeters),
      );
    }
  }
  assert.ok(minimum >= 200, `minimum same-anchor spacing was ${minimum}`);
});

test("D3 cluster lifecycle gathers and scatters with relationship links detached", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const alice = '["alice","cluster"]';
  const bob = '["bob","cluster"]';
  simulation.setScene({
    nodes: [
      node(alice, { initialEastMeters: -900, collisionRadiusMeters: 180 }),
      node(bob, { initialEastMeters: 900, collisionRadiusMeters: 180 }),
    ],
    edges: [
      {
        id: "cluster-link",
        sourceId: alice,
        targetId: bob,
        strength: 0.08,
        restLengthMeters: 1800,
      },
    ],
    anchors: [
      anchor(alice, "stockholm", { influence: 1 }),
      anchor(bob, "stockholm", { influence: 1 }),
    ],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 40; index += 1) simulation.step(1000 / 60);

  const distance = (snapshot) => {
    const left = snapshot.find((entry) => entry.instanceId === alice);
    const right = snapshot.find((entry) => entry.instanceId === bob);
    return Math.hypot(
      right.eastMeters - left.eastMeters,
      right.northMeters - left.northMeters,
    );
  };

  const expandedBefore = distance(simulation.getSnapshot());
  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const collapsed = distance(simulation.getSnapshot());
  assert.ok(collapsed < expandedBefore, "D3 gathers the detached place group");

  simulation.setClusteredPlaceIds([]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const expandedAfter = distance(simulation.getSnapshot());
  assert.ok(
    expandedAfter > collapsed,
    "D3 rejection scatters members before ordinary relationship links resume",
  );
});

test("D3 cluster ownership leaves unrelated geographic groups under the ordinary 3D solver", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const alice = '["alice","cluster-a"]';
  const bob = '["bob","cluster-b"]';
  const remote = '["remote","other"]';
  simulation.setScene({
    nodes: [
      node(alice, { initialEastMeters: -500 }),
      node(bob, { initialEastMeters: 500 }),
      node(remote, { initialEastMeters: 700 }),
    ],
    edges: [],
    anchors: [
      anchor(alice, "stockholm", { influence: 1 }),
      anchor(bob, "stockholm", { influence: 1 }),
      anchor(remote, "copenhagen", { influence: 0 }),
    ],
  });

  const before = simulation.getSnapshot().find((entry) => entry.instanceId === remote);
  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot().find((entry) => entry.instanceId === remote);

  assert.deepEqual(
    after,
    before,
    "D3-owned clustering must not replace ordinary force ownership for unrelated places",
  );
});

test("cross-place relationships never collapse geographic anchors into one local force group", () => {
  const commonNodes = [
    node('["alice","travel"]', { initialEastMeters: 100 }),
    node('["bob","travel"]', { initialEastMeters: -100 }),
  ];
  const commonAnchors = [
    anchor('["alice","travel"]', "stockholm", { influence: 0 }),
    anchor('["bob","travel"]', "copenhagen", { influence: 0 }),
  ];

  const withEdge = new ReferenceWorldForceSimulation();
  withEdge.setScene({
    nodes: commonNodes,
    anchors: commonAnchors,
    edges: [
      {
        id: "travel",
        sourceId: '["alice","travel"]',
        targetId: '["bob","travel"]',
        strength: 1,
        restLengthMeters: 1,
      },
    ],
  });

  const withoutEdge = new ReferenceWorldForceSimulation();
  withoutEdge.setScene({
    nodes: commonNodes,
    anchors: commonAnchors,
    edges: [],
  });

  withEdge.apply(topologyRequest());
  withoutEdge.apply(topologyRequest());
  for (let index = 0; index < 30; index += 1) {
    withEdge.step(1000 / 60);
    withoutEdge.step(1000 / 60);
  }

  assert.deepEqual(withEdge.getSnapshot(), withoutEdge.getSnapshot());
});

test("nearby floating nodes from different place anchors repel in shared world space", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0.5,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const alice = '["alice","west"]';
  const bob = '["bob","east"]';
  simulation.setScene({
    nodes: [
      node(alice, { initialEastMeters: 1, collisionRadiusMeters: 120 }),
      node(bob, { initialEastMeters: -1, collisionRadiusMeters: 120 }),
    ],
    edges: [],
    anchors: [
      anchor(alice, "west", {
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
      anchor(bob, "east", {
        longitude: 18.069,
        latitude: 59.3293,
        influence: 0,
      }),
    ],
  });

  const before = simulation.getSnapshot();
  simulation.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  assert.ok(after[0].eastMeters < before[0].eastMeters);
  assert.ok(after[1].eastMeters > before[1].eastMeters);
});

test("cross-anchor collision uses true 3D altitude separation", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0.5,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const low = '["alice","low"]';
  const high = '["bob","high"]';
  simulation.setScene({
    nodes: [
      node(low, {
        collisionRadiusMeters: 220,
        targetVisualAltitudeMeters: 900,
      }),
      node(high, {
        collisionRadiusMeters: 220,
        targetVisualAltitudeMeters: 1100,
      }),
    ],
    edges: [],
    anchors: [
      anchor(low, "low-place", {
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
      anchor(high, "high-place", {
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
    ],
  });

  const before = simulation.getSnapshot();
  simulation.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  const beforeLow = before.find((entry) => entry.instanceId === low);
  const beforeHigh = before.find((entry) => entry.instanceId === high);
  const afterLow = after.find((entry) => entry.instanceId === low);
  const afterHigh = after.find((entry) => entry.instanceId === high);

  assert.ok(afterLow.visualAltitudeMeters < beforeLow.visualAltitudeMeters);
  assert.ok(afterHigh.visualAltitudeMeters > beforeHigh.visualAltitudeMeters);
  assert.ok(
    afterHigh.visualAltitudeMeters - afterLow.visualAltitudeMeters >
      beforeHigh.visualAltitudeMeters - beforeLow.visualAltitudeMeters,
    "cross-place nodes separate along altitude when that is their collision axis",
  );
});

test("broad phase finds floating nodes that meet far from their different anchors", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0.5,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const west = '["alice","far-west-anchor"]';
  const east = '["bob","far-east-anchor"]';

  simulation.setScene({
    nodes: [
      node(west, {
        initialEastMeters: 110_000,
        collisionRadiusMeters: 3_000,
      }),
      node(east, {
        initialEastMeters: -110_000,
        collisionRadiusMeters: 3_000,
      }),
    ],
    edges: [],
    anchors: [
      anchor(west, "far-west-anchor", {
        longitude: 0,
        latitude: 0,
        influence: 0,
      }),
      anchor(east, "far-east-anchor", {
        longitude: 2,
        latitude: 0,
        influence: 0,
      }),
    ],
  });

  const before = simulation.getSnapshot();
  simulation.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  assert.notDeepEqual(
    after,
    before,
    "floating nodes must interact even when their anchors are more than one broad-phase bucket apart",
  );
});

test("post-drop settling stays responsive after an extreme drag displacement", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0,
    anchorStrength: 0.02,
    altitudeStrength: 0,
    damping: 0.84,
    settleEnergy: 0,
  });
  const dragged = '["alice","extreme-drag"]';
  const remoteIds = ['["bob","remote-west"]', '["carol","remote-east"]', '["dave","remote-south"]'];

  simulation.setScene({
    nodes: [node(dragged), ...remoteIds.map((id) => node(id))],
    edges: [],
    anchors: [
      anchor(dragged, "stockholm", { influence: 1 }),
      anchor(remoteIds[0], "remote-west", {
        longitude: -122.4194,
        latitude: 37.7749,
        influence: 0,
      }),
      anchor(remoteIds[1], "remote-east", {
        longitude: 139.6917,
        latitude: 35.6895,
        influence: 0,
      }),
      anchor(remoteIds[2], "remote-south", {
        longitude: 151.2093,
        latitude: -33.8688,
        influence: 0,
      }),
    ],
  });

  simulation.apply({ reason: "drag", energyTarget: 0.2, reheat: true });
  simulation.setPin({
    instanceId: dragged,
    eastMeters: 10_000_000,
    northMeters: 0,
    visualAltitudeMeters: 1000,
  });
  simulation.step(1000 / 60);
  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", energyTarget: 0.035, reheat: true });

  const before = simulation.getSnapshot().find((entry) => entry.instanceId === dragged);
  const startedAt = performance.now();
  simulation.step(1000 / 60);
  const elapsedMs = performance.now() - startedAt;
  const after = simulation.getSnapshot().find((entry) => entry.instanceId === dragged);

  assert.ok(before);
  assert.ok(after);
  assert.ok(elapsedMs < 100, `extreme post-drop force step took ${elapsedMs.toFixed(1)} ms`);
  assert.ok(Number.isFinite(after.eastMeters));
  assert.ok(Number.isFinite(after.northMeters));
  assert.ok(Number.isFinite(after.visualAltitudeMeters));
  assert.ok(
    Math.abs(after.eastMeters) < Math.abs(before.eastMeters),
    "released node should resume smooth correction toward its place domain",
  );
});

test("cross-anchor rejection maintains breathing room beyond hard collision radii", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 48_000,
    collisionStrength: 0.28,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.84,
    settleEnergy: 0,
  });
  const left = '["alice","readable-left"]';
  const right = '["bob","readable-right"]';
  simulation.setScene({
    nodes: [
      node(left, { initialEastMeters: 0, collisionRadiusMeters: 180 }),
      node(right, { initialEastMeters: 0, collisionRadiusMeters: 180 }),
    ],
    edges: [],
    anchors: [
      anchor(left, "readable-left", {
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
      anchor(right, "readable-right", {
        // Distinct provenance, same geographic origin: this isolates the
        // cross-anchor force rule from ordinary anchor-to-anchor distance.
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
    ],
  });

  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  const [a, b] = simulation.getSnapshot();
  const localDistance = Math.hypot(
    b.eastMeters - a.eastMeters,
    b.northMeters - a.northMeters,
    b.visualAltitudeMeters - a.visualAltitudeMeters,
  );

  assert.ok(
    localDistance > 360,
    `expected readable gap beyond hard 360m collision diameter, got ${localDistance}`,
  );
});

test("cross-anchor proximity remains continuous across the dateline", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0.5,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const west = '["alice","dateline-west"]';
  const east = '["bob","dateline-east"]';
  simulation.setScene({
    nodes: [
      node(west, { initialEastMeters: 1, collisionRadiusMeters: 180 }),
      node(east, { initialEastMeters: -1, collisionRadiusMeters: 180 }),
    ],
    edges: [],
    anchors: [
      anchor(west, "dateline-west", {
        longitude: 179.999,
        latitude: 0,
        influence: 0,
      }),
      anchor(east, "dateline-east", {
        longitude: -179.999,
        latitude: 0,
        influence: 0,
      }),
    ],
  });

  const before = simulation.getSnapshot();
  simulation.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  assert.notDeepEqual(after, before);
});

test("drag wakes nearby foreign-anchor topology but leaves distant groups frozen", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0.5,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const alice = '["alice","west"]';
  const bob = '["bob","east"]';
  const remote = '["remote","other"]';
  simulation.setScene({
    nodes: [
      node(alice, { initialEastMeters: 1, collisionRadiusMeters: 120 }),
      node(bob, { initialEastMeters: -1, collisionRadiusMeters: 120 }),
      node(remote, { initialEastMeters: 50, collisionRadiusMeters: 120 }),
    ],
    edges: [],
    anchors: [
      anchor(alice, "west", {
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 0,
      }),
      anchor(bob, "east", {
        longitude: 18.069,
        latitude: 59.3293,
        influence: 0,
      }),
      anchor(remote, "copenhagen", { influence: 0 }),
    ],
  });

  simulation.apply({ reason: "drag", energyTarget: 0.2, reheat: true });
  simulation.setPin({
    instanceId: alice,
    eastMeters: 20,
    northMeters: 0,
    visualAltitudeMeters: 1000,
  });

  const before = simulation.getSnapshot();
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot();
  const beforeBob = before.find((entry) => entry.instanceId === bob);
  const afterBob = after.find((entry) => entry.instanceId === bob);
  const beforeRemote = before.find((entry) => entry.instanceId === remote);
  const afterRemote = after.find((entry) => entry.instanceId === remote);

  assert.notDeepEqual(afterBob, beforeBob, "nearby foreign-anchor node participates in drag force");
  assert.deepEqual(afterRemote, beforeRemote, "distant anchor group stays frozen");
});

test("place-domain constraint returns distant nodes to an annulus without centering them", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0,
    anchorStrength: 0.05,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  simulation.setScene({
    nodes: [node('["alice","meeting"]', { initialEastMeters: 1000 })],
    edges: [],
    anchors: [
      anchor('["alice","meeting"]', "stockholm", {
        influence: 1,
        precisionRadiusMeters: 100,
      }),
    ],
  });

  const before = simulation.getSnapshot()[0].eastMeters;
  simulation.apply(topologyRequest());
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const after = simulation.getSnapshot()[0].eastMeters;

  assert.ok(Math.abs(after) < Math.abs(before));
  assert.ok(
    Math.abs(after) > 200,
    "the entity remains outside the place marker clearance instead of converging on the anchor",
  );
});

test("place-domain constraint pushes a released node away from the exact place centre", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0,
    anchorStrength: 0.05,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const instanceId = '["alice","centre-release"]';
  simulation.setScene({
    nodes: [node(instanceId, { collisionRadiusMeters: 100 })],
    edges: [],
    anchors: [anchor(instanceId, "stockholm", { influence: 1 })],
  });
  simulation.setPin({
    instanceId,
    eastMeters: 0,
    northMeters: 0,
    visualAltitudeMeters: 1000,
  });
  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", energyTarget: 0.035, reheat: true });

  for (let index = 0; index < 40; index += 1) simulation.step(1000 / 60);
  const settled = simulation.getSnapshot()[0];
  const radius = Math.hypot(settled.eastMeters, settled.northMeters);

  assert.ok(radius >= 200, `expected place clearance, got ${radius}`);
  assert.ok(radius < 600, `expected a local annular layout, got ${radius}`);
});

test("pinning hard-locks local layout position and altitude", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const instanceId = '["alice","meeting"]';
  simulation.setScene({
    nodes: [node(instanceId)],
    edges: [],
    anchors: [anchor(instanceId, "stockholm")],
  });
  simulation.setPin({
    instanceId,
    eastMeters: 250,
    northMeters: -125,
    visualAltitudeMeters: 1750,
  });
  assert.deepEqual(simulation.getSnapshot(), [
    {
      instanceId,
      eastMeters: 250,
      northMeters: -125,
      visualAltitudeMeters: 1750,
    },
  ]);
  simulation.apply({ reason: "drag", energyTarget: 0.2, reheat: true });

  for (let index = 0; index < 10; index += 1) simulation.step(1000 / 60);

  assert.deepEqual(simulation.getSnapshot(), [
    {
      instanceId,
      eastMeters: 250,
      northMeters: -125,
      visualAltitudeMeters: 1750,
    },
  ]);

  simulation.setPin(null);
  simulation.step(1000 / 60);
  assert.notDeepEqual(simulation.getSnapshot()[0], {
    instanceId,
    eastMeters: 250,
    northMeters: -125,
    visualAltitudeMeters: 1750,
  });
});

test("drag force is localized to the pinned node's geographic group", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const alice = '["alice","meeting"]';
  const bob = '["bob","meeting"]';
  const remote = '["remote","other"]';
  simulation.setScene({
    nodes: [
      node(alice, { initialEastMeters: -500 }),
      node(bob, { initialEastMeters: 500 }),
      node(remote, { initialEastMeters: 700 }),
    ],
    edges: [
      {
        id: "meeting",
        sourceId: alice,
        targetId: bob,
        strength: 0.2,
        restLengthMeters: 300,
      },
    ],
    anchors: [
      anchor(alice, "stockholm", { influence: 0 }),
      anchor(bob, "stockholm", { influence: 0 }),
      anchor(remote, "copenhagen", { influence: 0 }),
    ],
  });
  simulation.apply({ reason: "drag", energyTarget: 0.2, reheat: true });
  simulation.setPin({
    instanceId: alice,
    eastMeters: -250,
    northMeters: 0,
    visualAltitudeMeters: 1000,
  });

  const remoteBefore = simulation.getSnapshot().find((entry) => entry.instanceId === remote);
  const bobBefore = simulation.getSnapshot().find((entry) => entry.instanceId === bob);
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const remoteAfter = simulation.getSnapshot().find((entry) => entry.instanceId === remote);
  const bobAfter = simulation.getSnapshot().find((entry) => entry.instanceId === bob);

  assert.deepEqual(remoteAfter, remoteBefore, "unrelated place groups stay frozen during drag");
  assert.notDeepEqual(bobAfter, bobBefore, "same-anchor floating topology still relaxes");
});

test("place-domain constraint is suspended for the active drag group until release", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0,
    anchorStrength: 0.05,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const alice = '["alice","meeting"]';
  const bob = '["bob","meeting"]';
  simulation.setScene({
    nodes: [node(alice, { initialEastMeters: 1000 }), node(bob, { initialEastMeters: 800 })],
    edges: [],
    anchors: [
      anchor(alice, "stockholm", { influence: 1, precisionRadiusMeters: 0 }),
      anchor(bob, "stockholm", { influence: 1, precisionRadiusMeters: 0 }),
    ],
  });
  simulation.apply({ reason: "drag", energyTarget: 0.2, reheat: true });
  simulation.setPin({
    instanceId: alice,
    eastMeters: 1200,
    northMeters: 0,
    visualAltitudeMeters: 1000,
  });

  const bobBefore = simulation.getSnapshot().find((entry) => entry.instanceId === bob);
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const bobDuring = simulation.getSnapshot().find((entry) => entry.instanceId === bob);
  assert.deepEqual(
    bobDuring,
    bobBefore,
    "the shared place domain does not reposition floating neighbours during drag",
  );

  simulation.setPin(null);
  simulation.apply({ reason: "settle", energyTarget: 0.08, reheat: true });
  for (let index = 0; index < 20; index += 1) simulation.step(1000 / 60);
  const bobAfter = simulation.getSnapshot().find((entry) => entry.instanceId === bob);
  assert.ok(
    Math.abs(bobAfter.eastMeters) < Math.abs(bobDuring.eastMeters),
    "the place-domain constraint resumes after release",
  );
});

test("hot scene replacement preserves unchanged local state within the same geographic group", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const instanceId = '["alice","meeting"]';
  const firstScene = {
    nodes: [node(instanceId, { initialEastMeters: 600 })],
    edges: [],
    anchors: [anchor(instanceId, "stockholm")],
  };

  simulation.setScene(firstScene);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 10; index += 1) simulation.step(1000 / 60);
  const before = simulation.getSnapshot()[0];

  simulation.setScene({
    nodes: [node(instanceId, { initialEastMeters: 0 })],
    edges: [],
    anchors: [anchor(instanceId, "stockholm")],
  });

  assert.deepEqual(simulation.getSnapshot()[0], before);
});

test("moving an instance to another place resets local state instead of carrying a stale offset", () => {
  const simulation = new ReferenceWorldForceSimulation();
  const instanceId = '["alice","meeting"]';

  simulation.setScene({
    nodes: [node(instanceId, { initialEastMeters: 500 })],
    edges: [],
    anchors: [anchor(instanceId, "stockholm")],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 5; index += 1) simulation.step(1000 / 60);

  simulation.setScene({
    nodes: [node(instanceId, { initialEastMeters: 25, initialNorthMeters: 35 })],
    edges: [],
    anchors: [anchor(instanceId, "copenhagen")],
  });

  assert.deepEqual(simulation.getSnapshot()[0], {
    instanceId,
    eastMeters: 25,
    northMeters: 35,
    visualAltitudeMeters: 1000,
  });
});

test("stepping reports finite diagnostics and stop freezes the solver", () => {
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene({
    nodes: [node('["alice","meeting"]')],
    edges: [],
    anchors: [anchor('["alice","meeting"]', "stockholm")],
  });
  simulation.apply(topologyRequest());
  simulation.step(1000 / 60);

  const diagnostics = simulation.getDiagnostics();
  assert.equal(diagnostics.running, true);
  assert.equal(diagnostics.iteration, 1);
  assert.equal(Number.isFinite(diagnostics.energy), true);

  const before = simulation.getSnapshot();
  simulation.stop();
  simulation.step(1000 / 60);
  assert.deepEqual(simulation.getSnapshot(), before);
});

test("unknown pins, invalid deltas, and use-after-destroy fail explicitly", () => {
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene({ nodes: [], edges: [], anchors: [] });

  assert.throws(
    () =>
      simulation.setPin({
        instanceId: "missing",
        eastMeters: 0,
        northMeters: 0,
        visualAltitudeMeters: 0,
      }),
    /unknown world instance/,
  );
  assert.throws(() => simulation.step(-1), /delta/);

  simulation.destroy();
  simulation.destroy();
  assert.throws(() => simulation.step(16), /destroyed/);
});

test("updated DAG targets preserve position and converge through force only", () => {
  const simulation = new ReferenceWorldForceSimulation({
    repulsionStrength: 0,
    collisionStrength: 0,
    anchorStrength: 0,
    altitudeStrength: 0,
    damping: 0.9,
    settleEnergy: 0,
  });
  const instanceId = '["alice","dag-target"]';

  simulation.setScene({
    nodes: [
      node(instanceId, {
        initialEastMeters: 100,
        layoutTargetEastMeters: 800,
        layoutTargetNorthMeters: 0,
        layoutTargetStrength: 0.01,
      }),
    ],
    edges: [],
    anchors: [],
  });

  assert.equal(simulation.getSnapshot()[0].eastMeters, 100);

  simulation.setScene({
    nodes: [
      node(instanceId, {
        initialEastMeters: 100,
        layoutTargetEastMeters: 1_600,
        layoutTargetNorthMeters: 0,
        layoutTargetStrength: 0.01,
      }),
    ],
    edges: [],
    anchors: [],
  });

  assert.equal(
    simulation.getSnapshot()[0].eastMeters,
    100,
    "changing the organizational target must not jump the rendered node",
  );

  simulation.apply(topologyRequest());
  simulation.step(1000 / 60);

  assert.ok(
    simulation.getSnapshot()[0].eastMeters > 100,
    "the force solver should move toward the new DAG target after a tick",
  );
});
