/**
 * Production world-view registration shim.
 *
 * The lightweight factory is published synchronously so app startup selects
 * WorldView, while deck.gl/luma.gl and the real WorldSurface are imported only
 * when a world view is instantiated. If that import or construction path is
 * unavailable, the deferred legacy Orb factory remains the fallback.
 */
import {
  createDeferredSpatialViewFactory,
  type DeferredSpatialViewFactory,
} from "./deferred-spatial-view.ts";

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function legacySpatialFactory(): DeferredSpatialViewFactory | null {
  const candidate = Reflect.get(globalThis, "TemporalGraphView");
  if (!candidate || typeof candidate !== "object") return null;
  return typeof Reflect.get(candidate, "create") === "function"
    ? (candidate as DeferredSpatialViewFactory)
    : null;
}

if (supportsWebGL2()) {
  const lazyWorldView = createDeferredSpatialViewFactory(
    async () => {
      const [{ realDeckWorldBindings }, { registerTimelineWorldView }] = await Promise.all([
        import("./world/deck-world-bindings.ts"),
        import("./world/world-view-registration.ts"),
      ]);
      return registerTimelineWorldView(realDeckWorldBindings);
    },
    {
      fallback: legacySpatialFactory,
      onError(error) {
        console.error("Failed to initialize the deck.gl world view; falling back to Orb.", error);
      },
    },
  );

  Reflect.set(globalThis, "TimelineWorldView", lazyWorldView);
}
