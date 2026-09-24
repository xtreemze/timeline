export interface DeferredSpatialView {
  setModel(model: unknown): void;
  setWindow(viewport: unknown): void;
  setFocus(id: string | number | null): void;
  setPresentationMode?(active: boolean): void;
  hasContext?(): boolean;
  refreshLayout?(): void;
  destroy?(): void;
}

export interface DeferredSpatialViewFactory {
  create(root: HTMLElement | null): DeferredSpatialView | null;
}

export interface DeferredSpatialViewFactoryOptions {
  readonly fallback?: () =>
    | DeferredSpatialViewFactory
    | null
    | Promise<DeferredSpatialViewFactory | null>;
  readonly onError?: (error: unknown) => void;
}

type DeferredSpatialViewFactoryLoader = () =>
  | DeferredSpatialViewFactory
  | Promise<DeferredSpatialViewFactory>;

export function createDeferredSpatialViewFactory(
  loader: DeferredSpatialViewFactoryLoader,
  options: DeferredSpatialViewFactoryOptions = {},
): DeferredSpatialViewFactory {
  let factoryPromise: Promise<DeferredSpatialViewFactory> | null = null;

  function loadFactory(): Promise<DeferredSpatialViewFactory> {
    factoryPromise ??= Promise.resolve()
      .then(loader)
      .catch(async (error) => {
        options.onError?.(error);
        const fallback = await options.fallback?.();
        if (fallback) return fallback;
        throw error;
      });
    return factoryPromise;
  }

  return Object.freeze({
    create(root: HTMLElement | null): DeferredSpatialView | null {
      if (!root) return null;

      let delegate: DeferredSpatialView | null = null;
      let destroyed = false;
      let hasModel = false;
      let model: unknown;
      let hasWindow = false;
      let viewport: unknown;
      let hasFocus = false;
      let focus: string | number | null = null;
      let hasPresentationMode = false;
      let presentationMode = false;
      let refreshPending = false;

      function attach(next: DeferredSpatialView | null): void {
        if (!next) return;
        if (destroyed) {
          next.destroy?.();
          return;
        }

        delegate = next;
        if (hasModel) delegate.setModel(model);
        if (hasWindow) delegate.setWindow(viewport);
        if (hasFocus) delegate.setFocus(focus);
        if (hasPresentationMode) delegate.setPresentationMode?.(presentationMode);
        if (refreshPending) delegate.refreshLayout?.();
      }

      void loadFactory()
        .then((factory) => attach(factory.create(root)))
        .catch(() => {
          // onError above owns reporting; an unavailable optional renderer
          // must not create an unhandled rejection during application startup.
        });

      return Object.freeze({
        setModel(next: unknown): void {
          hasModel = true;
          model = next;
          delegate?.setModel(next);
        },
        setWindow(next: unknown): void {
          hasWindow = true;
          viewport = next;
          delegate?.setWindow(next);
        },
        setFocus(next: string | number | null): void {
          hasFocus = true;
          focus = next;
          delegate?.setFocus(next);
        },
        setPresentationMode(active: boolean): void {
          hasPresentationMode = true;
          presentationMode = active;
          delegate?.setPresentationMode?.(active);
        },
        hasContext(): boolean {
          return delegate?.hasContext?.() ?? false;
        },
        refreshLayout(): void {
          refreshPending = true;
          delegate?.refreshLayout?.();
        },
        destroy(): void {
          if (destroyed) return;
          destroyed = true;
          delegate?.destroy?.();
          delegate = null;
        },
      });
    },
  });
}
