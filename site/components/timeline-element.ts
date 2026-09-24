import { LitElement, noChange } from "lit";
import { TimelineViewController } from "../timeline-view.ts";

/**
 * Stable Lit ownership boundary for the retained timeline.
 *
 * The controller remains imperative and owns interaction/rendering. Lit owns
 * lifecycle only and never reconciles the retained occurrence scene.
 */
export class LuumTimelineElement extends LitElement {
  private timelineController: TimelineViewController | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  ensureTimelineController(): TimelineViewController {
    if (!this.timelineController) {
      this.timelineController = new TimelineViewController(this);
    }
    return this.timelineController;
  }

  get controller(): TimelineViewController | null {
    return this.timelineController;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (this.isConnected) this.ensureTimelineController();
    });
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-timeline")
) {
  customElements.define("luum-timeline", LuumTimelineElement);
}
