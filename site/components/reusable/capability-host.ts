export type ProjectCapabilityCleanup = () => void | Promise<void>;

export interface ProjectCapabilityContext {
  readonly host: ProjectCapabilityHostElement;
  readonly signal: AbortSignal;
}

export interface ProjectCapabilityAdapter {
  mount(
    context: ProjectCapabilityContext,
  ):
    | void
    | ProjectCapabilityCleanup
    | Promise<void | ProjectCapabilityCleanup>;
}

export interface ProjectCapabilityErrorDetail {
  readonly error: unknown;
}

/**
 * Framework-neutral lifecycle host for product-owned capabilities.
 *
 * The host owns only mount/abort/cleanup sequencing. Playback, slideshow,
 * conference, chat, transport, room, device, and other product state stays in
 * the adapter's owning engine. Async mounts are generation-guarded so a stale
 * completion cannot regain lifecycle authority after replacement/disconnect.
 */
export class ProjectCapabilityHostElement extends HTMLElement {
  private currentAdapter: ProjectCapabilityAdapter | null = null;
  private generation = 0;
  private controller: AbortController | null = null;
  private cleanup: ProjectCapabilityCleanup | null = null;

  get adapter(): ProjectCapabilityAdapter | null {
    return this.currentAdapter;
  }

  set adapter(next: ProjectCapabilityAdapter | null) {
    if (next === this.currentAdapter) return;
    this.currentAdapter = next;
    this.scheduleRemount();
  }

  connectedCallback(): void {
    this.scheduleRemount();
  }

  disconnectedCallback(): void {
    this.scheduleTeardown();
  }

  private reportError(error: unknown): void {
    this.dispatchEvent(
      new CustomEvent<ProjectCapabilityErrorDetail>("project-capability-error", {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ error }),
      }),
    );
  }

  private scheduleRemount(): void {
    void this.remount().catch((error: unknown) => this.reportError(error));
  }

  private scheduleTeardown(): void {
    void this.teardown().catch((error: unknown) => this.reportError(error));
  }

  private async releaseCurrent(): Promise<void> {
    this.controller?.abort();
    this.controller = null;

    const cleanup = this.cleanup;
    this.cleanup = null;
    if (cleanup) await cleanup();
  }

  private async teardown(): Promise<void> {
    this.generation += 1;
    await this.releaseCurrent();
  }

  private async remount(): Promise<void> {
    const generation = ++this.generation;
    await this.releaseCurrent();

    const adapter = this.currentAdapter;
    if (!this.isConnected || !adapter || generation !== this.generation) return;

    const controller = new AbortController();
    this.controller = controller;

    const result = await adapter.mount({
      host: this,
      signal: controller.signal,
    });
    const cleanup = typeof result === "function" ? result : null;

    if (
      generation !== this.generation ||
      controller.signal.aborted ||
      !this.isConnected ||
      adapter !== this.currentAdapter
    ) {
      if (cleanup) await cleanup();
      return;
    }

    this.cleanup = cleanup;
  }
}
