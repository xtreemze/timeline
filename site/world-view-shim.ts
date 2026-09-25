/**
 * Production world-view registration shim.
 *
 * The lightweight factory is published synchronously so app startup selects
 * WorldView, while deck.gl/luma.gl and the real WorldSurface are imported only
 * when a world view is instantiated. Without WebGL 2 nothing is registered and
 * the application shows an explicit "globe unavailable" status instead.
 */
import { createDeferredSpatialViewFactory } from "./deferred-spatial-view.ts";

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

if (supportsWebGL2()) {
  const lazyWorldView = createDeferredSpatialViewFactory(
    async () => {
      const [{ loadRealDeckWorldBindings }, { registerTimelineWorldView }] = await Promise.all([
        import("./world/deck-world-bindings.ts"),
        import("./world/world-view-registration.ts"),
      ]);
      return registerTimelineWorldView(await loadRealDeckWorldBindings());
    },
    {
      onError(error) {
        console.error("Failed to initialize the deck.gl world view.", error);
      },
    },
  );

  Reflect.set(globalThis, "TimelineWorldView", lazyWorldView);
}
