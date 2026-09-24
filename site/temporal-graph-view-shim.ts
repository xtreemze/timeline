/**
 * Compatibility registration for the legacy Orb graph renderer.
 *
 * Keep the factory available synchronously for fallback selection, but defer
 * importing Orb and the legacy graph implementation until the fallback is
 * actually instantiated.
 */
import { createDeferredSpatialViewFactory } from "./deferred-spatial-view.ts";

export async function loadTimelineOrbGraph() {
  const { TimelineOrbGraph } = await import("../src/orb-graph-entry.js");
  return TimelineOrbGraph;
}

const lazyTemporalGraphView = createDeferredSpatialViewFactory(
  async () => {
    const { TemporalGraphView } = await import("./temporal-graph-view.ts");
    return TemporalGraphView;
  },
  {
    onError(error) {
      console.error("Failed to initialize the legacy Orb graph renderer.", error);
    },
  },
);

globalThis.TemporalGraphView = lazyTemporalGraphView;
