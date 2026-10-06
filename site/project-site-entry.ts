import { LuumEmbedGraphElement } from "./components/reusable/embed-graph.ts";
import { LuumEmbedTimelineElement } from "./components/reusable/embed-timeline.ts";
import { ReusableMediaViewerElement } from "./components/reusable/media-viewer.ts";

export const PROJECT_SITE_KIT_VERSION = "0.4.0" as const;

export class ProjectTimelineElement extends LuumEmbedTimelineElement {}
export class ProjectGraphElement extends LuumEmbedGraphElement {}
export class ProjectMediaViewerElement extends ReusableMediaViewerElement {}

if (typeof customElements !== "undefined" && !customElements.get("xt-project-timeline")) {
  customElements.define("xt-project-timeline", ProjectTimelineElement);
}

if (typeof customElements !== "undefined" && !customElements.get("xt-project-graph")) {
  customElements.define("xt-project-graph", ProjectGraphElement);
}

if (typeof customElements !== "undefined" && !customElements.get("xt-project-media-viewer")) {
  customElements.define("xt-project-media-viewer", ProjectMediaViewerElement);
}

type ProjectViewTransition = Readonly<{
  updateCallbackDone: Promise<void>;
}>;

type ProjectTransitionDocument = Document & {
  readonly activeViewTransition?: unknown;
  startViewTransition?: (
    update: () => void | Promise<void>,
  ) => ProjectViewTransition;
};

/**
 * Run a presentation-only DOM update with the native View Transitions API when
 * it can improve continuity. The host's state update remains authoritative;
 * animation is skipped for reduced motion, unsupported browsers, or when a
 * transition is already active.
 */
export async function runProjectViewTransition(
  update: () => void | Promise<void>,
): Promise<void> {
  if (typeof document === "undefined") {
    await update();
    return;
  }

  const reducedMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transitionDocument = document as ProjectTransitionDocument;

  if (
    reducedMotion ||
    typeof transitionDocument.startViewTransition !== "function" ||
    transitionDocument.activeViewTransition
  ) {
    await update();
    return;
  }

  const transition = transitionDocument.startViewTransition(update);
  await transition.updateCallbackDone;
}

export type { EmbedGraphEdge, EmbedGraphNode } from "./components/reusable/embed-graph.ts";
export type { EmbedTimelineItem } from "./components/reusable/embed-timeline.ts";
export type { MediaViewerZoomDetail } from "./components/reusable/media-viewer.ts";
