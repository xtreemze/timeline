import { performance } from "node:perf_hooks";

import { D3WorldForceSimulation } from "../src/layout/d3-world-force-simulation.ts";

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const requestedSizes = process.argv.slice(2).map(positiveInteger).filter(Boolean);
const sizes = requestedSizes.length ? requestedSizes : [1_000, 10_000, 50_000];

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

function measure(fn, iterations) {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const median =
    sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)]
      : ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2;
  return {
    iterations,
    medianMs: Number(median.toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    minMs: Number((sorted[0] ?? 0).toFixed(3)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
  };
}

function sceneFixture(nodeCount, groupSize = 32) {
  const nodes = [];
  const edges = [];
  const anchors = [];
  const groupCount = Math.ceil(nodeCount / groupSize);

  for (let index = 0; index < nodeCount; index += 1) {
    const groupIndex = Math.floor(index / groupSize);
    const localIndex = index % groupSize;
    const id = `["entity-${index}",null]`;
    const placeId = `place-${groupIndex}`;
    const longitude = -170 + ((groupIndex * 47) % 340);
    const latitude = -70 + ((groupIndex * 17) % 140);
    const eastMeters = (localIndex % 8) * 900 - 3_150;
    const northMeters = Math.floor(localIndex / 8) * 900 - 1_350;

    nodes.push({
      id,
      canonicalId: `entity-${index}`,
      mass: 1,
      collisionRadiusPx: 22,
      collisionRadiusMeters: 360,
      connectivityDegree: localIndex > 0 && localIndex < groupSize - 1 ? 2 : 1,
      connectivityClearanceMeters: localIndex % 8 === 0 ? 180 : 0,
      initialEastMeters: eastMeters,
      initialNorthMeters: northMeters,
      targetVisualAltitudeMeters: 900,
    });

    anchors.push({
      instanceId: id,
      placeId,
      longitude,
      latitude,
      sourceAltitudeMeters: 0,
      influence: 1,
      precisionRadiusMeters: 120,
    });

    if (localIndex > 0) {
      edges.push({
        id: `relationship-${index}`,
        sourceId: `["entity-${index - 1}",null]`,
        targetId: id,
        strength: 0.6,
        restLengthMeters: 1_100,
      });
    }
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    anchors: Object.freeze(anchors),
    groupCount,
  });
}

function createSimulation(scene) {
  const simulation = new D3WorldForceSimulation();
  simulation.setScene(scene);
  return simulation;
}

const results = [];

for (const nodeCount of sizes) {
  const scene = sceneFixture(nodeCount);
  const setupIterations = nodeCount >= 50_000 ? 1 : nodeCount >= 10_000 ? 2 : 4;
  const stepIterations = nodeCount >= 50_000 ? 2 : nodeCount >= 10_000 ? 4 : 8;

  const setup = measure(() => {
    const simulation = createSimulation(scene);
    if (simulation.getSnapshot().length !== nodeCount) {
      throw new Error(`Unexpected production D3 snapshot size for ${nodeCount} nodes.`);
    }
    simulation.destroy();
  }, setupIterations);

  const topology = createSimulation(scene);
  topology.getChangedSnapshot();
  topology.apply({ reason: "topology", excitation: 0.14, reheat: true });
  const topologyStep = measure(() => topology.step(1000 / 60), stepIterations);
  topology.step(1000 / 60);
  const changedSnapshot = measure(() => topology.getChangedSnapshot(), 1);

  const sustainedStart = performance.now();
  for (let index = 0; index < 60; index += 1) topology.step(1000 / 60);
  const sustainedSixtyHzMs = performance.now() - sustainedStart;
  const topologyDiagnostics = topology.getDiagnostics();
  topology.destroy();

  const drag = createSimulation(scene);
  drag.getChangedSnapshot();
  const dragged = scene.nodes[0];
  if (!dragged) throw new Error("Production D3 benchmark requires at least one node.");
  drag.setPin({
    instanceId: dragged.id,
    eastMeters: dragged.initialEastMeters + 20_000,
    northMeters: dragged.initialNorthMeters,
    visualAltitudeMeters: dragged.targetVisualAltitudeMeters,
  });
  drag.apply({ reason: "drag", excitation: 0.2, reheat: true });
  const dragStep = measure(() => drag.step(1000 / 60), stepIterations);
  let dragChangedNodes = 0;
  const dragChangedSnapshot = measure(() => {
    dragChangedNodes = drag.getChangedSnapshot().length;
  }, 1);
  drag.destroy();

  results.push({
    worldInstances: nodeCount,
    groups: scene.groupCount,
    relationships: scene.edges.length,
    setup,
    topologyStep,
    sustainedSixtyHzMs: Number(sustainedSixtyHzMs.toFixed(3)),
    changedSnapshot,
    topologyDiagnostics,
    dragStep,
    dragChangedSnapshot,
    dragChangedNodes,
  });
}

// biome-ignore lint/suspicious/noConsole: benchmark emits machine-readable performance evidence.
console.log(
  JSON.stringify(
    {
      benchmark: "lum-world-force-d3-production",
      runtime: process.version,
      platform: process.platform,
      architecture: process.arch,
      fixture:
        "deterministic production D3 groups of <=32 nodes with local links and geographically separated anchors",
      results,
    },
    null,
    2,
  ),
);
