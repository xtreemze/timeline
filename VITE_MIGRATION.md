# Vite build architecture

Lūm uses Vite 8 as its single application build pipeline.

## Current state

- Development: `pnpm dev` runs the Vite development server with native ESM.
- Production: `pnpm build` runs one Vite build into `dist/`.
- Bundling: Vite 8/Rolldown owns the application module graph and production chunks.
- Modules: application runtime dependencies are ESM imports; no separately prebuilt classic-script bundles are required.
- Workers/assets: Vite resolves worker and asset URLs from the module graph, including the PDF.js worker.
- Target: Chrome 155.
- Deployment: `base: "./"` keeps the build portable under the GitHub Pages `/timeline/` subpath.

## Runtime dependencies

Memgraph Orb, Leaflet, PDF.js, deck.gl and luma.gl participate in the same Vite module graph. Heavy modules may be split by Vite/Rolldown as ordinary ESM chunks rather than maintained as independent build products.

The legacy `site/orb-graph.bundle.js`, `site/leaflet.bundle.js`, `site/evidence-extraction.bundle.js`, and copied `site/pdf.worker.mjs` artifacts are retired. `site/leaflet.css` is now a Vite-owned source stylesheet that imports Leaflet's package CSS; it is no longer a generated build artifact.

## Build contract

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

CI validates `dist/index.html`, generated Vite assets, type checks, architecture tests, Node tests and browser certification. Source modules under `site/` and `src/` remain authoritative; generated build artifacts are never source inputs.

## Migration direction

Some temporary `*-shim.ts` modules still expose already-ESM implementations on `globalThis` for compatibility with code that has not yet been converted to direct imports. These are compatibility boundaries, not separate bundles. New code should import modules directly, and existing shims should be removed as their consumers migrate.
