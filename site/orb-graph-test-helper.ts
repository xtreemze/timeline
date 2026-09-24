import { TimelineOrbGraph } from "../src/orb-graph-entry.js";

export function createTouchGraphController(container: HTMLElement) {
  return TimelineOrbGraph.create(container);
}
