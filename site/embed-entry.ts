import { LuumEmbedGraphElement } from "./components/reusable/embed-graph.ts";
import { LuumEmbedTimelineElement } from "./components/reusable/embed-timeline.ts";
import { ReusableMediaViewerElement } from "./components/reusable/media-viewer.ts";

if (typeof customElements !== "undefined" && !customElements.get("luum-embed-timeline")) {
  customElements.define("luum-embed-timeline", LuumEmbedTimelineElement);
}

if (typeof customElements !== "undefined" && !customElements.get("luum-embed-graph")) {
  customElements.define("luum-embed-graph", LuumEmbedGraphElement);
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-embed-media-viewer")
) {
  customElements.define("luum-embed-media-viewer", ReusableMediaViewerElement);
}

export {
  LuumEmbedGraphElement,
  LuumEmbedTimelineElement,
  ReusableMediaViewerElement,
};
export type { EmbedGraphEdge, EmbedGraphNode } from "./components/reusable/embed-graph.ts";
export type { EmbedTimelineItem } from "./components/reusable/embed-timeline.ts";
