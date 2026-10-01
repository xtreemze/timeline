import { LitElement, noChange } from "lit";

export interface RetainedTimelineController {
  destroy?(): void;
}

/**
 * Reusable Lit lifecycle boundary for a retained/imperative timeline renderer.
 *
 * The component deliberately does not reconcile scene children. A project
 * supplies the controller factory while Lit owns connection lifecycle and a
 * stable custom-element boundary. This keeps high-frequency geometry and
 * pointer physics outside reactive rendering.
 */
export abstract class RetainedTimelineElement<TController extends object> extends LitElement {
  private controllerInstance: TController | null = null;
  private connectionGeneration = 0;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override render() {
    return noChange;
  }

  protected abstract createTimelineController(): TController;

  ensureTimelineController(): TController {
    if (!this.controllerInstance) {
      this.controllerInstance = this.createTimelineController();
    }
    return this.controllerInstance;
  }

  get controller(): TController | null {
    return this.controllerInstance;
  }

  releaseTimelineController(): void {
    const controller = this.controllerInstance as RetainedTimelineController | null;
    controller?.destroy?.();
    this.controllerInstance = null;
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
