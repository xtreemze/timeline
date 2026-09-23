/**
 * Production world-view registration shim.
 *
 * Registers the ambient WorldView factory global with the real deck.gl-backed
 * world view factory so app startup selects the globe-first WorldSurface
 * over the legacy Orb graph renderer (see world-view-selection.ts). Orb
 * remains the fallback: if WebGL2 is unavailable, or if this module fails
 * to construct the real runtime, the WorldView global is left unset and
 * `selectPrimarySpatialViewFactory` falls back to the legacy graph factory.
 */
import { realDeckWorldBindings } from "./world/deck-world-bindings.ts";
import { registerTimelineWorldView } from "./world/world-view-registration.ts";

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

if (supportsWebGL2()) {
  try {
    registerTimelineWorldView(realDeckWorldBindings);
  } catch (error) {
    // Leave TimelineWorldView unset so app startup falls back to Orb.
    console.error("Failed to register the deck.gl world view; falling back to Orb.", error);
  }
}
