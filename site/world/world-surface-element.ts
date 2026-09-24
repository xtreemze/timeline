import { LitElement, noChange } from "lit";

export interface OwnedWorldApplicationView {
  destroy(): void;
}

/**
 * Stable Lit ownership boundary for the GPU world/graph surface.
 *
 * deck.gl/luma.gl remain fully imperative underneath this element. Lit owns
 * lifecycle and composition only; it never renders canonical graph nodes.
 */
export class LuumWorldSurfaceElement extends LitElement {
  #view: OwnedWorldApplicationView | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  get ownedView(): OwnedWorldApplicationView | null {
    return this.#view;
  }

  attachView(view: OwnedWorldApplicationView): void {
    if (this.#view && this.#view !== view) this.#view.destroy();
    this.#view = view;
  }

  releaseView(view: OwnedWorldApplicationView): void {
    if (this.#view === view) this.#view = null;
  }

  override disconnectedCallback(): void {
    const view = this.#view;
    this.#view = null;
    view?.destroy();
    super.disconnectedCallback();
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-world-surface")
) {
  customElements.define("luum-world-surface", LuumWorldSurfaceElement);
}
