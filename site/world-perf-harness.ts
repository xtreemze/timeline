/**
 * Test-only harness entrypoint (issue #445 Priority 7 performance
 * certification). Mounts a real `DeckWorldSurface` backed by the real
 * `realDeckWorldBindings` (real deck.gl / real WebGL context, same runtime
 * `site/world-view-shim.ts` registers for production) and exposes it on
 * `window.__worldPerfHarness` so a Playwright test can drive it directly:
 * `setProjection`, `setCamera`, `pick`, `getAccessibleSnapshot`. This page
 * is not part of the production build input (see `vite.config.ts`
 * `rollupOptions.input`) — it exists purely so the Playwright certification
 * spec can exercise the real renderer without the full app shell.
 */
import { DeckWorldSurface } from "./world/deck-world-surface.ts";
import { realDeckWorldBindings } from "./world/deck-world-bindings.ts";
import { createDeckWorldRuntime } from "./world/deck-world-runtime.ts";
import { createWorldCameraState } from "../src/layout/world-surface.ts";

declare global {
  interface Window {
    __worldPerfHarness?: {
      surface: DeckWorldSurface;
      ready: boolean;
    };
  }
}

const container = document.getElementById("world-container");
if (!container) throw new Error("world-perf-harness: missing #world-container");

const runtime = createDeckWorldRuntime(realDeckWorldBindings);
const surface = new DeckWorldSurface(
  container,
  runtime,
  createWorldCameraState({ longitude: 0, latitude: 20, zoom: 1, bearing: 0, pitch: 20 }),
);

window.__worldPerfHarness = { surface, ready: true };
