import { LitElement, noChange } from "lit";

import { TimelineViewController } from "../timeline-view.ts";

/**
 * Lit lifecycle owner for the retained timeline.
 *
 * The controller remains responsible for retained-scene geometry and interaction
 * frames. Lit intentionally leaves the application-provided light DOM untouched.
 */
export class LuumTimelineElement extends LitElement {
  #controller: TimelineViewController | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  ensureTimelineController(): TimelineViewController {
    if (!this.#controller) this.#controller = new TimelineViewController(this);
    return this.#controller;
  }

  get controller(): TimelineViewController | null {
    return this.#controller;
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
