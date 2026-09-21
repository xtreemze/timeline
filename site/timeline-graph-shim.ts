import { TimelineGraph } from './timeline-graph.ts';

// Add fallback methods for missing OrbFactory graph visualization methods
const GraphWithFallbacks = {
  ...TimelineGraph,
  neighborhoodGraph: (graphInput: any, focusId: string, viewport: any, options: any) => {
    // Fallback: return empty graph when Orb graph not available
    console.warn("OrbFactory not loaded - neighborhoodGraph returning empty graph");
    return { nodes: [], edges: [] };
  },
  temporalRelationProjection: (relationships: any[], temporal: any) => {
    // Fallback: return empty relationships when Orb graph not available
    console.warn("OrbFactory not loaded - temporalRelationProjection returning empty array");
    return [];
  },
};

globalThis.TimelineGraph = GraphWithFallbacks;
export {};
