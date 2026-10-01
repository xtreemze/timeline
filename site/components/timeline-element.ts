import { TimelineViewController } from "../timeline-view.ts";
import { RetainedTimelineElement } from "./reusable/retained-timeline.ts";

/**
 * Lūm adapter for the reusable retained-timeline Lit lifecycle boundary.
 *
 * TimelineViewController remains responsible for interaction, retained scene
 * identity, geometry and rendering. The generic base owns only host lifecycle.
 */
export class LuumTimelineElement extends RetainedTimelineElement<TimelineViewController> {
  protected override createTimelineController(): TimelineViewController {
    return new TimelineViewController(this);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-timeline")) {
  customElements.define("luum-timeline", LuumTimelineElement);
}
