import { performance } from "node:perf_hooks";

import { ReferenceWorldForceSimulation } from "../src/layout/reference-world-force-simulation.ts";
import { createWorldDagLayout } from "../src/layout/world-dag-layout.ts";
import {
  applyWorldForceLayoutUpdate,
  updateWorldForceLayoutInstance,
} from "../src/layout/world-force-layout.ts";
import { createWorldForceScene } from "../src/layout/world-force-scene.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const denseMode = process.argv.includes("--dense");
const requestedSizes = process.argv.slice(2).map(positiveInteger).filter(Boolean);
const sizes = requestedSizes.length
  ? requestedSizes
  : denseMode
    ? [1_000, 5_000]
    : [1_000, 10_000, 50_000];

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

function measure(fn, iterations) {
  fn();
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

function settleTicks(scene, maxTicks = 480) {
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene(scene);
  simulation.apply({ reason: "topology", excitation: 0.12, reheat: true });

  let ticks = 0;
  while (ticks < maxTicks && !simulation.getDiagnostics().settled) {
    simulation.step(1000 / 60);
    ticks += 1;
  }
  const settled = simulation.getDiagnostics().settled;
  simulation.destroy();
  return { ticks, settled, maxTicks };
}

function fixture(nodeCount, groupSize = 32) {
  const instances = [];
  const edges = [];
  const placeCount = Math.ceil(nodeCount / groupSize);

  for (let index = 0; index < nodeCount; index += 1) {
    const occurrenceId = `occurrence-${index}`;
    const entityId = `entity-${index}`;
    const groupIndex = Math.floor(index / groupSize);
    const row = Math.floor(groupIndex / 24);
    const column = groupIndex % 24;
    const longitude = -170 + column * 14.5;
    const latitude = Math.max(-75, Math.min(75, -65 + row * 9.5));
    const id = worldInstanceId(entityId, occurrenceId);

    instances.push(
      createProjectedWorldInstance({
        id,
        canonicalId: entityId,
        occurrenceId,
        geographicAnchors: [
          {
            placeId: `place-${groupIndex}`,
            longitude,
            latitude,
            influence: 0.8 + (index % 5) * 0.04,
            precisionRadiusMeters: 100 + (index % 4) * 50,
          },
        ],
        temporalWeight: 0.5 + (index % 5) * 0.1,
        visualWeight: (index % 10) / 10,
        retained: index % 11 === 0,
        visualAltitude: 600 + (index % 7) * 120,
      }),
    );

    if (index % groupSize !== 0) {
      edges.push(
        createProjectedWorldEdge({
          id: `local-edge-${index}`,
          sourceInstanceId: worldInstanceId(`entity-${index - 1}`, `occurrence-${index - 1}`),
          targetInstanceId: id,
          temporalWeight: 0.8,
          visible: true,
          retained: false,
        }),
      );
    }

    if (groupIndex > 0 && index % groupSize === 0) {
      const previousGroupIndex = groupIndex - 1;
      const previousIndex = previousGroupIndex * groupSize;
      edges.push(
        createProjectedWorldEdge({
          id: `cross-place-edge-${groupIndex}`,
          sourceInstanceId: worldInstanceId(
            `entity-${previousIndex}`,
            `occurrence-${previousIndex}`,
          ),
          targetInstanceId: id,
          temporalWeight: 0.7,
          visible: true,
          retained: false,
        }),
      );
    }
  }

  return {
    placeCount,
    projection: createWorldProjection({ instances, edges }),
  };
}

const results = [];

for (const nodeCount of sizes) {
  const groupSize = denseMode ? nodeCount : 32;
  const { projection, placeCount } = fixture(nodeCount, groupSize);
  const iterations = denseMode
    ? nodeCount >= 5_000
      ? 1
      : 2
    : nodeCount >= 50_000
      ? 1
      : nodeCount >= 10_000
        ? 2
        : 4;

  let forceScene;
  const sceneBuild = measure(() => {
    forceScene = createWorldForceScene(projection);
    if (forceScene.nodes.length !== nodeCount || forceScene.anchors.length !== nodeCount) {
      throw new Error(`Unexpected force scene size for ${nodeCount} world instances.`);
    }
  }, iterations);

  forceScene = createWorldForceScene(projection);
  const dagQuality = createWorldDagLayout(projection, {
    nodeSizes: new Map(
      forceScene.nodes.map((node) => [
        node.id,
        {
          widthMeters: node.collisionRadiusMeters * 2,
          heightMeters: node.collisionRadiusMeters * 2,
        },
      ]),
    ),
  }).metrics;

  const solverSetup = measure(() => {
    const simulation = new ReferenceWorldForceSimulation();
    simulation.setScene(forceScene);
    if (simulation.getSnapshot().length !== nodeCount) {
      throw new Error(`Unexpected solver snapshot size for ${nodeCount} world instances.`);
    }
    simulation.destroy();
  }, iterations);

  const stepIterations = denseMode
    ? nodeCount >= 5_000
      ? 1
      : 2
    : nodeCount >= 50_000
      ? 2
      : nodeCount >= 10_000
        ? 3
        : 6;
  const firstInstance = projection.instances[0];
  if (!firstInstance) throw new Error("World force benchmark requires at least one instance.");
  const sparseSample = {
    instanceId: firstInstance.id,
    eastMeters: 1_234,
    northMeters: -567,
    visualAltitudeMeters: (firstInstance.visualAltitude ?? 0) + 25,
  };
  const sparseInstanceUpdate = measure(() => {
    const updated = updateWorldForceLayoutInstance(firstInstance, sparseSample);
    if (updated === firstInstance) {
      throw new Error("Sparse instance update should produce a changed force layout instance.");
    }
  }, stepIterations);
  const sparseLayoutApply = measure(() => {
    const update = applyWorldForceLayoutUpdate(projection, [sparseSample]);
    if (update.updatedInstances.length !== 1) {
      throw new Error("Sparse force-layout update should report exactly one changed instance.");
    }
  }, stepIterations);

  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene(forceScene);
  simulation.apply({ reason: "topology", excitation: 0.12, reheat: true });

  const solveStep = measure(() => {
    simulation.step(1000 / 60);
  }, stepIterations);
  const diagnostics = simulation.getDiagnostics();
  simulation.destroy();

  const settling = nodeCount <= 1_000 ? settleTicks(forceScene) : null;

  const dragSimulation = new ReferenceWorldForceSimulation();
  dragSimulation.setScene(forceScene);
  // Clear the scene-load publication so this measurement reflects only the
  // interaction frame's changed positions.
  dragSimulation.getChangedSnapshot();
  const dragged = forceScene.nodes[0];
  if (!dragged) throw new Error("World force benchmark requires at least one node.");
  dragSimulation.setPin({
    instanceId: dragged.id,
    eastMeters: 10_000_000,
    northMeters: 0,
    visualAltitudeMeters: dragged.targetVisualAltitudeMeters,
  });
  dragSimulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  const dragStep = measure(() => {
    dragSimulation.step(1000 / 60);
  }, stepIterations);
  const dragChangedNodes = dragSimulation.getChangedSnapshot().length;
  dragSimulation.destroy();

  results.push({
    worldInstances: nodeCount,
    places: placeCount,
    relationships: projection.edges.length,
    groupSize,
    sceneBuild,
    solverSetup,
    solveStep,
    dragStep,
    dragChangedNodes,
    sparseInstanceUpdate,
    sparseLayoutApply,
    dagQuality,
    settling,
    diagnostics,
  });
}

// biome-ignore lint/suspicious/noConsole: benchmark emits its machine-readable report to stdout
console.log(
  JSON.stringify(
    {
      benchmark: "lum-world-force-reference",
      runtime: process.version,
      platform: process.platform,
      architecture: process.arch,
      fixture: denseMode
        ? "pathological single-place dense groups for same-anchor pair-force scaling"
        : "deterministic geographic groups of <=32 nodes with local topology, cross-place relationships, and DAG quality metrics",
      results,
    },
    null,
    2,
  ),
);
