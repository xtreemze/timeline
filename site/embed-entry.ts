export const LUUM_EMBED_VERSION = "0.4.0" as const;

import { LuumEmbedGraphElement } from "./components/reusable/embed-graph.ts";
import { LuumEmbedTimelineElement } from "./components/reusable/embed-timeline.ts";

if (typeof customElements !== "undefined" && !customElements.get("luum-embed-timeline")) {
  customElements.define("luum-embed-timeline", LuumEmbedTimelineElement);
}

if (typeof customElements !== "undefined" && !customElements.get("luum-embed-graph")) {
  customElements.define("luum-embed-graph", LuumEmbedGraphElement);
}

export {
  LuumEmbedGraphElement,
  LuumEmbedTimelineElement,
};
export type { EmbedGraphEdge, EmbedGraphNode } from "./components/reusable/embed-graph.ts";
export type { EmbedTimelineItem } from "./components/reusable/embed-timeline.ts";

export {
  PROJECT_SITE_KIT_VERSION,
  ProjectGraphElement,
  ProjectMediaViewerElement,
  ProjectTimelineElement,
  runProjectViewTransition,
} from "./project-site-entry.ts";
