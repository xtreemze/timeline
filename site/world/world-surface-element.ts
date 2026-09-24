import { LitElement, noChange } from "lit";

export interface WorldSurfaceOwnedView {
  destroy(): void;
}

/**
 * Lit lifecycle boundary for the GPU world/graph surface.
 *
 * The element owns view lifetime only. deck.gl/luma.gl remain responsible for
 * drawing topology and interaction frames, so Lit never renders graph nodes.
 */
export class LuumWorldSurfaceElement extends LitElement {
  #ownedView: WorldSurfaceOwnedView | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  adoptView(view: WorldSurfaceOwnedView): void {
    if (this.#ownedView === view) return;
    this.#ownedView?.destroy();
    this.#ownedView = view;
  }

  get ownedView(): WorldSurfaceOwnedView | null {
    return this.#ownedView;
  }

  override disconnectedCallback(): void {
    this.#ownedView?.destroy();
    this.#ownedView = null;
    super.disconnectedCallback();
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-world-surface")
) {
  customElements.define("luum-world-surface", LuumWorldSurfaceElement);
}
