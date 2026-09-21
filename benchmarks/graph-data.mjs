import { performance } from "node:perf_hooks";

await import("../site/temporal-standards-shim.ts");
await import("../site/timeline-graph-shim.ts");

const graph = globalThis.TimelineGraph;
if (!graph) throw new Error("TimelineGraph failed to initialize.");

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const requestedSizes = process.argv.slice(2).map(positiveInteger).filter(Boolean);
const sizes = requestedSizes.length ? requestedSizes : [1000, 5000, 10000];

function createFixture(nodeCount, edgeFactor = 2) {
  const entities = Array.from({ length: nodeCount }, (_, index) => ({
    id: `entity-${index}`,
    type: index % 11 === 0 ? "organization" : index % 7 === 0 ? "device" : "person",
    name: `Entity ${index}`,
    properties: { fixture: true, index },
  }));

  const edgeCount = nodeCount * edgeFactor;
  const relationships = Array.from({ length: edgeCount }, (_, index) => {
    const startIndex = index % nodeCount;
    const stride = 1 + ((index * 17) % Math.max(1, nodeCount - 1));
    const endIndex = (startIndex + stride) % nodeCount;
    return {
      id: `relationship-${index}`,
      subjectId: `entity-${startIndex}`,
      objectId: `entity-${endIndex}`,
      predicate: ["called", "authorized", "supplied", "transferredTo", "reportedTo"][index % 5],
      time: null,
      properties: { fixture: true, index },
    };
  });

  return { entities, relationships, items: [], stories: [] };
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function measure(fn, iterations) {
  fn();
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    fn();
    samples.push(performance.now() - startedAt);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    iterations,
    medianMs: Number(median.toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    minMs: Number(sorted[0].toFixed(3)),
    maxMs: Number(sorted.at(-1).toFixed(3)),
  };
}

const cases = [];
for (const nodeCount of sizes) {
  const fixture = createFixture(nodeCount);
  const edgeCount = fixture.relationships.length;
  const iterations = nodeCount >= 10000 ? 3 : 5;

  const fullProjection = measure(() => {
    const result = graph.graphForWindow(fixture, null);
    if (result.nodes.length !== nodeCount || result.edges.length !== edgeCount) {
      throw new Error(`Unexpected full graph size for ${nodeCount} nodes.`);
    }
  }, iterations);

  const focusedNeighborhood = measure(() => {
    const result = graph.neighborhoodGraph(fixture, "entity-0", null, { depth: 2, limit: 36 });
    if (!result.nodes.some((node) => node.id === "entity-0") || result.nodes.length > 36) {
      throw new Error(`Unexpected neighborhood projection for ${nodeCount} nodes.`);
    }
  }, iterations);

  cases.push({
    nodes: nodeCount,
    edges: edgeCount,
    fullProjection,
    focusedNeighborhood,
  });
}

// eslint-disable-next-line no-console -- benchmark emits its machine-readable JSON report to stdout
console.log(
  JSON.stringify(
    {
      benchmark: "timeline-graph-data-projection",
      runtime: process.version,
      platform: process.platform,
      architecture: process.arch,
      cases,
    },
    null,
    2,
  ),
);
