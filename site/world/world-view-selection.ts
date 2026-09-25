export interface CompatibleSpatialView {
  setModel(model: unknown): void;
  setWindow(viewport: unknown): void;
  previewWindow?(viewport: unknown): void;
  setFocus(id: string | number | null): void;
  setPresentationMode?(active: boolean): void;
  hasContext?(): boolean;
  refreshLayout?(): void;
  destroy?(): void;
}

export interface CompatibleSpatialViewFactory {
  create(root: HTMLElement | null): CompatibleSpatialView | null;
}

function compatibleFactory(value: unknown): CompatibleSpatialViewFactory | null {
  if (!value || typeof value !== "object") return null;
  const create = Reflect.get(value, "create");
  return typeof create === "function" ? (value as CompatibleSpatialViewFactory) : null;
}

export const WORLD_VIEW_UNAVAILABLE_MESSAGE =
  "The relationship globe needs WebGL 2, which this browser does not provide. The timeline and editors still work.";

/**
 * Stand-in used when no WorldView can be registered (no WebGL 2). It keeps
 * the application contract and tells the reader why the globe is missing,
 * instead of failing startup.
 */
export const unavailableSpatialViewFactory: CompatibleSpatialViewFactory = Object.freeze({
  create(root: HTMLElement | null): CompatibleSpatialView | null {
    if (!root) return null;
    const status = root.ownerDocument.createElement("p");
    status.className = "world-view-unavailable";
    status.setAttribute("role", "status");
    status.textContent = WORLD_VIEW_UNAVAILABLE_MESSAGE;
    root.dataset.worldView = "unavailable";
    root.append(status);
    return Object.freeze({
      setModel() {},
      setWindow() {},
      setFocus() {},
      hasContext: () => false,
      destroy() {
        status.remove();
        delete root.dataset.worldView;
      },
    });
  },
});

export function selectPrimarySpatialViewFactory(
  worldFactory: unknown,
): CompatibleSpatialViewFactory {
  return compatibleFactory(worldFactory) ?? unavailableSpatialViewFactory;
}
