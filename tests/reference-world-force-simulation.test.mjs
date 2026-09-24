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
    nodes: [
      node('["alice","meeting"]'),
      node('["bob","meeting"]'),
    ],
    edges: [],
    anchors: [
      anchor('["alice","meeting"]', "stockholm"),
      anchor('["bob","meeting"]', "stockholm"),
    ],
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

test("geographic anchor force pulls local displacement toward its precision radius", () => {
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
