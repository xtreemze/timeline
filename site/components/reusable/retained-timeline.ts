import { ImperativeSurfaceElement } from "./imperative-surface.ts";

/**
 * Reusable Lit lifecycle boundary for a retained/imperative timeline renderer.
 *
 * The component deliberately does not reconcile scene children. A project
 * supplies the controller factory while Lit owns connection lifecycle and a
 * stable custom-element boundary. This keeps high-frequency geometry and
 * pointer physics outside reactive rendering.
 */
export abstract class RetainedTimelineElement<TController extends object> extends ImperativeSurfaceElement<TController> {
  private connectionGeneration = 0;

  protected abstract createTimelineController(): TController;

  ensureTimelineController(): TController {
    const current = this.surfaceController;
    if (current) return current;
    const controller = this.createTimelineController();
    this.adoptSurfaceController(controller);
    return controller;
  }

  get controller(): TController | null {
    return this.surfaceController;
  }

  releaseTimelineController(): void {
    this.releaseSurfaceController();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const generation = ++this.connectionGeneration;
    queueMicrotask(() => {
      if (this.isConnected && generation === this.connectionGeneration) {
        this.ensureTimelineController();
      }
    });
  }

  override disconnectedCallback(): void {
    this.connectionGeneration += 1;
    this.releaseTimelineController();
    super.disconnectedCallback();
  }
}
