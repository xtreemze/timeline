import { ReactiveElement } from "lit";
import { TimelineView } from "../timeline-view.ts";

type TimelineController = NonNullable<ReturnType<typeof TimelineView.create>>;

/**
 * Lit ownership boundary for the timeline.
 *
 * Lit owns lifecycle, resize observation and the public component API.
 * The retained TimelineViewController remains imperative and owns all
 * high-frequency scene geometry and interaction rendering.
 */
export class LuumTimelineElement extends ReactiveElement {
  controller: TimelineController | null = null;
  #resizeObserver: ResizeObserver | null = null;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    // The existing timeline composition remains light DOM. Lit must never
    // reconcile the retained scene subtree during pan, pinch, wheel or inertia.
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.controller = TimelineView.create(this);

    if (typeof ResizeObserver === "function") {
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = new ResizeObserver(() => this.controller?.refreshLayout());
      this.#resizeObserver.observe(this);
      const surface = this.querySelector<HTMLElement>("#timeline-surface, .timeline-surface");
      if (surface) this.#resizeObserver.observe(surface);
    }
  }

  override disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    super.disconnectedCallback();
  }

  #requireController(): TimelineController {
    const controller = this.controller ?? TimelineView.create(this);
    if (!controller) throw new Error("Lūm timeline controller is unavailable.");
    this.controller = controller;
    return controller;
  }

  setItems(...args: Parameters<TimelineController["setItems"]>): ReturnType<TimelineController["setItems"]> {
    return this.#requireController().setItems(...args);
  }

  getViewport(): ReturnType<TimelineController["getViewport"]> {
    return this.#requireController().getViewport();
  }

  refreshLayout(): ReturnType<TimelineController["refreshLayout"]> {
    return this.#requireController().refreshLayout();
  }

  fitVisible(): ReturnType<TimelineController["fitVisible"]> {
    return this.#requireController().fitVisible();
  }

  focusItem(...args: Parameters<TimelineController["focusItem"]>): ReturnType<TimelineController["focusItem"]> {
    return this.#requireController().focusItem(...args);
  }

  focusAdjacent(...args: Parameters<TimelineController["focusAdjacent"]>): ReturnType<TimelineController["focusAdjacent"]> {
    return this.#requireController().focusAdjacent(...args);
  }

  stepFocusMedia(...args: Parameters<TimelineController["stepFocusMedia"]>): ReturnType<TimelineController["stepFocusMedia"]> {
    return this.#requireController().stepFocusMedia(...args);
  }

  closeFocus(): ReturnType<TimelineController["closeFocus"]> {
    return this.#requireController().closeFocus();
  }

  ensureFocusPopover(): ReturnType<TimelineController["ensureFocusPopover"]> {
    return this.#requireController().ensureFocusPopover();
  }

  focusedItemId(): ReturnType<TimelineController["focusedItemId"]> {
    return this.#requireController().focusedItemId();
  }

  hasFocusedItem(): ReturnType<TimelineController["hasFocusedItem"]> {
    return this.#requireController().hasFocusedItem();
  }

  getOrientation(): ReturnType<TimelineController["getOrientation"]> {
    return this.#requireController().getOrientation();
  }

  setOrientation(...args: Parameters<TimelineController["setOrientation"]>): ReturnType<TimelineController["setOrientation"]> {
    return this.#requireController().setOrientation(...args);
  }
}

if (!customElements.get("luum-timeline")) {
  customElements.define("luum-timeline", LuumTimelineElement);
}
