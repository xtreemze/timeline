import { TimelineGraph } from "./timeline-graph.ts";

// Temporary compatibility methods while the graph projection/renderer split is migrated.
// Keep the shim typed and intentionally renderer-neutral; callers can continue to use
// the stable TimelineGraph surface without importing Orb-specific runtime contracts.
const GraphWithFallbacks = {
  ...TimelineGraph,
  neighborhoodGraph: (..._args: unknown[]) => {
    console.warn("Graph renderer adapter not loaded - neighborhoodGraph returning empty graph");
    return { nodes: [], edges: [] };
  },
  temporalRelationProjection: (..._args: unknown[]) => {
    console.warn(
      "Graph renderer adapter not loaded - temporalRelationProjection returning empty array",
    );
    return [];
  },
};

globalThis.TimelineGraph = GraphWithFallbacks;
export {};
