import { ImperativeSurfaceElement } from "./reusable/imperative-surface.ts";

export interface WorldSurfaceOwnedView {
  destroy: () => void;
}

/**
 * Lit lifecycle boundary for the GPU world/graph surface.
 *
 * The element owns view lifetime only. deck.gl/luma.gl remain responsible for
 * topology, labels, picking and interaction frames; Lit never renders graph nodes.
 */
export class LuumWorldSurfaceElement extends ImperativeSurfaceElement<WorldSurfaceOwnedView> {
  adoptView(view: WorldSurfaceOwnedView): void {
    this.adoptSurfaceController(view);
  }

  get ownedView(): WorldSurfaceOwnedView | null {
    return this.surfaceController;
  }

  override disconnectedCallback(): void {
    this.releaseSurfaceController();
    super.disconnectedCallback();
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luum-world-surface")) {
  customElements.define("luum-world-surface", LuumWorldSurfaceElement);
}
