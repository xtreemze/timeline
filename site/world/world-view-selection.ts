export interface CompatibleSpatialView {
  setModel(model: unknown): void;
  setWindow(viewport: unknown): void;
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
  return typeof create === "function"
    ? (value as CompatibleSpatialViewFactory)
    : null;
}

export function selectPrimarySpatialViewFactory(
  worldFactory: unknown,
  legacyGraphFactory: unknown,
): CompatibleSpatialViewFactory {
  const world = compatibleFactory(worldFactory);
  if (world) return world;

  const legacy = compatibleFactory(legacyGraphFactory);
  if (legacy) return legacy;

  throw new Error(
    "A WorldView or legacy TemporalGraphView factory must be available before app startup.",
  );
}
