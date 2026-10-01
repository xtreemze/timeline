import { LitElement, noChange } from "lit";

export interface ImperativeSurfaceController {
  destroy?(): void;
}

/**
 * Reusable Lit boundary for an imperative or retained rendering surface.
 *
 * Lit owns the custom-element lifecycle and stable host only. The adopted
 * controller owns scene children, high-frequency rendering and input physics.
 */
export abstract class ImperativeSurfaceElement<TController extends object> extends LitElement {
  private surfaceControllerInstance: TController | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  protected adoptSurfaceController(controller: TController | null): void {
    if (this.surfaceControllerInstance === controller) return;
    this.releaseSurfaceController();
    this.surfaceControllerInstance = controller;
  }

  protected get surfaceController(): TController | null {
    return this.surfaceControllerInstance;
  }

  protected releaseSurfaceController(): void {
    const controller = this.surfaceControllerInstance as ImperativeSurfaceController | null;
    controller?.destroy?.();
    this.surfaceControllerInstance = null;
  }
}
