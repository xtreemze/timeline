/**
 * Test-only re-export barrel (issue #445 Priority 8). Playwright specs
 * import browser-side modules by URL path against the Vite dev server,
 * which serves `site/` as its root — reaching into `../src/...` directly
 * from a spec's `page.evaluate` dynamic import is fragile across dev-server
 * fs-allow configuration, so this mirrors the same pattern
 * `world-fixture-generator.mjs` already uses: a small module inside `site/`
 * that does the `../src/...` relative import itself and re-exports what the
 * specs need. Not part of the production build input (see `vite.config.ts`
 * `rollupOptions.input`).
 */
export { directedEdgeArrowhead } from "../src/layout/world-semantic-presentation.ts";
export {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
} from "../src/projection/world-projection.ts";
