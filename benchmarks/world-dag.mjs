import { performance } from "node:perf_hooks";

import { createWorldDagLayout } from "../src/layout/world-dag-layout.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

const PLACE = Object.freeze({
  placeId: "benchmark-place",
  longitude: 18,
  latitude: 59,
  influence: 1,
});

function node(name) {
  return createProjectedWorldInstance({
    id: worldInstanceId(name, `occ-${name}`),
    canonicalId: name,
    occurrenceId: `occ-${name}`,
    geographicAnchors: [PLACE],
    temporalWeight: 1,
    visualWeight: 0.5,
    retained: false,
  });
}

function relationship(id, source, target) {
  return createProjectedWorldEdge({
    id,
    sourceInstanceId: source.id,
    targetInstanceId: target.id,
    temporalWeight: 1,
    visible: true,
    retained: false,
  });
}

function crossingCount(edges, positions) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const intersects = (a, b, c, d) =>
    orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;

  let crossings = 0;
  for (let left = 0; left < edges.length; left += 1) {
    for (let right = left + 1; right < edges.length; right += 1) {
      const a = edges[left];
      const b = edges[right];
      if (
        a.sourceInstanceId === b.sourceInstanceId ||
        a.sourceInstanceId === b.targetInstanceId ||
        a.targetInstanceId === b.sourceInstanceId ||
        a.targetInstanceId === b.targetInstanceId
      ) {
        continue;
      }
      const a0 = positions.get(a.sourceInstanceId);
      const a1 = positions.get(a.targetInstanceId);
      const b0 = positions.get(b.sourceInstanceId);
      const b1 = positions.get(b.targetInstanceId);
      if (a0 && a1 && b0 && b1 && intersects(a0, a1, b0, b1)) crossings += 1;
    }
  }
  return crossings;
}

function circularPositions(nodes, radius = 4_000) {
  return new Map(
    nodes.map((item, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      return [item.id, [Math.cos(angle) * radius, Math.sin(angle) * radius]];
    }),
  );
}

function fixture(kind, count) {
  const nodes = Array.from({ length: count }, (_, index) => node(`${kind}-${index}`));
  const edges = [];

  if (kind === "chain") {
    for (let index = 1; index < nodes.length; index += 1) {
      edges.push(relationship(`chain-${index - 1}-${index}`, nodes[index - 1], nodes[index]));
    }
  } else if (kind === "branch") {
    for (let index = 1; index < nodes.length; index += 1) {
      edges.push(relationship(`branch-${index}`, nodes[Math.floor((index - 1) / 2)], nodes[index]));
    }
  } else if (kind === "dense") {
    for (let source = 0; source < nodes.length; source += 1) {
      for (let target = source + 1; target < nodes.length; target += 1) {
        edges.push(relationship(`dense-${source}-${target}`, nodes[source], nodes[target]));
      }
    }
  } else {
    throw new Error(`Unknown fixture kind: ${kind}`);
  }

  return { nodes, projection: createWorldProjection({ instances: nodes, edges }) };
}

const cases = [
  ["chain", 12],
  ["branch", 31],
  ["dense", 24],
  ["dense", 32],
];

const results = cases.map(([kind, count]) => {
  const { nodes, projection } = fixture(kind, count);
  const nodeSizes = new Map(
    nodes.map((item) => [item.id, { widthMeters: 720, heightMeters: 720 }]),
  );
  const start = performance.now();
  const layout = createWorldDagLayout(projection, { nodeSizes });
  const elapsedMs = performance.now() - start;
  const dagPositions = new Map(
    layout.targets.map((target) => [target.instanceId, [target.eastMeters, target.northMeters]]),
  );

  return {
    fixture: kind,
    nodes: count,
    edges: projection.edges.length,
    coldLayoutMs: Number(elapsedMs.toFixed(3)),
    algorithmCounts: layout.metrics.algorithmCounts,
    forceOnly: layout.targets.length === 0,
    dagCrossings:
      layout.targets.length === nodes.length ? crossingCount(projection.edges, dagPositions) : null,
    circularCrossings: crossingCount(projection.edges, circularPositions(nodes)),
    minSeparationMeters: layout.metrics.minSeparationMeters,
  };
});

// biome-ignore lint/suspicious/noConsole: benchmark emits a machine-readable report
console.log(
  JSON.stringify(
    {
      benchmark: "lum-world-dag-layout",
      runtime: process.version,
      platform: process.platform,
      architecture: process.arch,
      results,
    },
    null,
    2,
  ),
);
