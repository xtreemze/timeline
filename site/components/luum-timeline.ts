import { LitElement, noChange } from "lit";

import { TimelineViewController } from "../timeline-view.ts";

/**
 * Stable Lit ownership boundary for the retained timeline scene.
 *
 * Lit owns lifecycle only. The TimelineViewController owns all high-frequency
 * retained DOM, geometry, pan/zoom/drag physics, clustering, and selection.
 */
export class LuumTimelineElement extends LitElement {
  private timelineController: TimelineViewController | null = null;

  override createRenderRoot(): HTMLElement {
    // Existing application markup and CSS remain authoritative during migration.
    return this;
  }

  override render() {
    // Never ask Lit to reconcile the retained occurrence scene.
    return noChange;
  }

  ensureController(): TimelineViewController {
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
    // Parser-created custom elements may connect before their light-DOM
    // children have all been parsed. The compatibility factory can still
    // initialize synchronously first; ensureController is idempotent.
    queueMicrotask(() => {
      if (this.isConnected) this.ensureController();
    });
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-timeline")) {
  customElements.define("luum-timeline", LuumTimelineElement);
}
