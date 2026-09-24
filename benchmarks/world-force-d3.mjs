import { performance } from "node:perf_hooks";

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";

import { ReferenceWorldForceSimulation } from "../src/layout/reference-world-force-simulation.ts";

const DEFAULT_SIZES = Object.freeze([50, 100, 250, 500]);
const FRAME_MS = 1000 / 60;
const QUALITY_TICKS = 300;
const SAMPLE_TICKS = 60;

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : null;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

function timingSummary(values) {
  return Object.freeze({
    medianMs: Number(percentile(values, 0.5).toFixed(4)),
    p95Ms: Number(percentile(values, 0.95).toFixed(4)),
    maxMs: Number(Math.max(...values, 0).toFixed(4)),
  });
}

function seededPosition(index) {
  const angle = index * 2.399963229728653;
  const radius = 8 + Math.sqrt(index + 1) * 7;
  return Object.freeze({
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  });
}

function fixture(nodeCount) {
  const nodes = [];
  const edges = [];
  const anchors = [];

  for (let index = 0; index < nodeCount; index += 1) {
    const id = `["entity-${index}","occurrence-${index}"]`;
    const initial = seededPosition(index);
    const collisionRadiusMeters = 32 + (index % 4) * 4;
    const targetRadius = Math.sqrt(index + 1) * 24;
    const targetAngle = angleForIndex(index);

    nodes.push(
      Object.freeze({
        id,
        canonicalId: `entity-${index}`,
        mass: 1,
        collisionRadiusPx: 14 + (index % 4),
        collisionRadiusMeters,
        initialEastMeters: initial.x,
        initialNorthMeters: initial.y,
        layoutTargetEastMeters: Math.cos(targetAngle) * targetRadius,
        layoutTargetNorthMeters: Math.sin(targetAngle) * targetRadius,
        layoutTargetStrength: 0.012,
        targetVisualAltitudeMeters: 600,
      }),
    );

    anchors.push(
      Object.freeze({
        instanceId: id,
        placeId: "benchmark-place",
        longitude: 18.0686,
        latitude: 59.3293,
        sourceAltitudeMeters: 0,
        influence: 1,
        precisionRadiusMeters: 2_500,
      }),
    );

    if (index > 0) {
      edges.push(
        Object.freeze({
          id: `edge-${index}`,
          sourceId: `["entity-${index - 1}","occurrence-${index - 1}"]`,
          targetId: id,
          strength: 0.08,
          restLengthMeters: 96,
        }),
      );
    }
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    anchors: Object.freeze(anchors),
  });
}

function angleForIndex(index) {
  return index * 1.618033988749895;
}

function qualityMetrics(positions, scene) {
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  let overlapPairs = 0;
  let overlapMeters = 0;

  for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
    const left = positions[leftIndex];
    const leftNode = byId.get(left.id);
    if (!left || !leftNode) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
      const right = positions[rightIndex];
      const rightNode = right ? byId.get(right.id) : null;
      if (!right || !rightNode) continue;

      const distance = Math.hypot(right.x - left.x, right.y - left.y);
      const minimum = leftNode.collisionRadiusMeters + rightNode.collisionRadiusMeters;
      if (distance < minimum) {
        overlapPairs += 1;
        overlapMeters += minimum - distance;
      }
    }
  }

  let targetErrorSquared = 0;
  let targetCount = 0;
  for (const position of positions) {
    const node = byId.get(position.id);
    if (
      !node ||
      node.layoutTargetEastMeters === undefined ||
      node.layoutTargetNorthMeters === undefined
    ) {
      continue;
    }
    targetErrorSquared +=
      (position.x - node.layoutTargetEastMeters) ** 2 +
      (position.y - node.layoutTargetNorthMeters) ** 2;
    targetCount += 1;
  }

  return Object.freeze({
    overlapPairs,
    meanOverlapMeters:
      overlapPairs === 0 ? 0 : Number((overlapMeters / overlapPairs).toFixed(3)),
    targetRmsErrorMeters:
      targetCount === 0 ? 0 : Number(Math.sqrt(targetErrorSquared / targetCount).toFixed(3)),
  });
}

function referencePositions(simulation) {
  return simulation.getSnapshot().map((position) => ({
    id: position.instanceId,
    x: position.eastMeters,
    y: position.northMeters,
  }));
}

function runReference(scene) {
  const setupStart = performance.now();
  const simulation = new ReferenceWorldForceSimulation();
  simulation.setScene(scene);
  simulation.apply({ reason: "topology", excitation: 0.12, reheat: true });
  const setupMs = performance.now() - setupStart;

  const tickSamples = [];
  for (let index = 0; index < QUALITY_TICKS; index += 1) {
    const start = performance.now();
    simulation.step(FRAME_MS);
    const elapsed = performance.now() - start;
    if (index < SAMPLE_TICKS) tickSamples.push(elapsed);
  }

  const quality = qualityMetrics(referencePositions(simulation), scene);
  const diagnostics = simulation.getDiagnostics();
  const dragged = scene.nodes[0];
  if (!dragged) throw new Error("Reference benchmark requires at least one node.");

  simulation.setPin({
    instanceId: dragged.id,
    eastMeters: 10_000,
    northMeters: 0,
    visualAltitudeMeters: dragged.targetVisualAltitudeMeters,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  const dragStart = performance.now();
  simulation.step(FRAME_MS);
  const dragTickMs = performance.now() - dragStart;
  simulation.destroy();

  return Object.freeze({
    setupMs: Number(setupMs.toFixed(4)),
    ticks: timingSummary(tickSamples),
    dragTickMs: Number(dragTickMs.toFixed(4)),
    quality,
    settledAfterBudget: diagnostics.settled,
    energyAfterBudget: diagnostics.energy,
  });
}

function d3Nodes(scene) {
  return scene.nodes.map((node) => ({
    id: node.id,
    x: node.initialEastMeters,
    y: node.initialNorthMeters,
    vx: 0,
    vy: 0,
    radius: node.collisionRadiusMeters,
    targetX: node.layoutTargetEastMeters ?? node.initialEastMeters,
    targetY: node.layoutTargetNorthMeters ?? node.initialNorthMeters,
    targetStrength: Math.max(0.002, node.layoutTargetStrength ?? 0.008),
  }));
}

function runD3(scene) {
  const setupStart = performance.now();
  const nodes = d3Nodes(scene);
  const links = scene.edges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
    distance: edge.restLengthMeters,
    strength: edge.strength,
  }));

  const simulation = forceSimulation(nodes)
    .stop()
    .alpha(1)
    .alphaMin(0.001)
    .velocityDecay(0.4)
    .force(
      "charge",
      forceManyBody()
        .strength((node) => -Math.max(36, node.radius * 1.5))
        .distanceMin(8)
        .distanceMax(1_200)
        .theta(0.9),
    )
    .force(
      "collide",
      forceCollide((node) => node.radius)
        .strength(0.72)
        .iterations(1),
    )
    .force(
      "link",
      forceLink(links)
        .id((node) => node.id)
        .distance((link) => link.distance)
        .strength((link) => link.strength),
    )
    .force(
      "x",
      forceX((node) => node.targetX).strength((node) => node.targetStrength),
    )
    .force(
      "y",
      forceY((node) => node.targetY).strength((node) => node.targetStrength),
    );

  const setupMs = performance.now() - setupStart;
  const tickSamples = [];
  for (let index = 0; index < QUALITY_TICKS; index += 1) {
    const start = performance.now();
    simulation.tick();
    const elapsed = performance.now() - start;
    if (index < SAMPLE_TICKS) tickSamples.push(elapsed);
  }

  const quality = qualityMetrics(nodes, scene);
  const alphaAfterBudget = simulation.alpha();
  const dragged = nodes[0];
  if (!dragged) throw new Error("D3 benchmark requires at least one node.");

  dragged.fx = 10_000;
  dragged.fy = 0;
  simulation.alpha(0.2);
  const dragStart = performance.now();
  simulation.tick();
  const dragTickMs = performance.now() - dragStart;
  simulation.stop();

  return Object.freeze({
    setupMs: Number(setupMs.toFixed(4)),
    ticks: timingSummary(tickSamples),
    dragTickMs: Number(dragTickMs.toFixed(4)),
    quality,
    alphaAfterBudget: Number(alphaAfterBudget.toFixed(6)),
  });
}

const requestedSizes = process.argv.slice(2).map(positiveInteger).filter(Boolean);
const sizes = requestedSizes.length ? requestedSizes : DEFAULT_SIZES;
const results = [];

for (const nodeCount of sizes) {
  const scene = fixture(nodeCount);
  results.push(
    Object.freeze({
      nodes: nodeCount,
      edges: scene.edges.length,
      reference: runReference(scene),
      d3: runD3(scene),
    }),
  );
}

// biome-ignore lint/suspicious/noConsole: benchmark intentionally emits a machine-readable report
console.log(
  JSON.stringify(
    {
      benchmark: "lum-world-force-d3-comparison",
      runtime: process.version,
      qualityTicks: QUALITY_TICKS,
      sampledTicks: SAMPLE_TICKS,
      note:
        "D3 is intentionally benchmarked as a place-local 2D candidate only; geography, altitude, place-domain constraints, and cross-place force policy remain Lūm responsibilities.",
      results,
    },
    null,
    2,
  ),
);
