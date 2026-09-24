# Vite build architecture

Lūm's browser build is fully owned by Vite 8 and native ES modules.

## Current state

- **Development:** `vite` provides the development server and HMR.
- **Production:** `vite build` is the only browser build command.
- **Bundling:** Vite 8 uses Rolldown for the production module graph.
- **Modules:** application and renderer integration use native ESM imports/exports.
- **Graph:** `@memgraph/orb` is imported through `src/orb-graph-entry.js`; no prebuilt graph script is generated.
- **Maps:** `site/location-map.ts` dynamically imports Leaflet and imports its CSS through the module graph.
- **Evidence:** `src/evidence-extraction-entry.js` is loaded on demand; Vite emits the PDF.js worker asset from the `?url` import.
- **Static output:** generated browser assets live only in `dist/`.
- **Tooling:** there is no direct esbuild dependency, manual browser bundle command, or IIFE build step.

## Build commands

```bash
pnpm dev
pnpm build
pnpm preview
```

The build target remains Chrome 155. GitHub Pages uses relative asset URLs through `base: "./"`.

## Vite configuration

`vite.config.ts` owns the application HTML entry and uses Vite 8's `build.rolldownOptions` API. Runtime dependencies are not copied into `site/` and are not served through custom middleware.

This keeps development and production on the same module graph: imports define initialization order, dynamic imports define lazy boundaries, and Vite owns chunking and worker/assets emission.

## Compatibility globals

A limited number of temporary `globalThis.Timeline*` compatibility facades remain while the broader ESM migration finishes. They are ordinary ESM side effects, not classic scripts or IIFE bundles. New architecture code must use imports/contracts rather than adding ambient dependencies.

## Quality policy

Repository tests enforce that:

- `pnpm build` remains `vite build`;
- direct esbuild and `--format=iife` build commands do not return;
- old `*.bundle.js` runtime tags do not return to `site/index.html`;
- Vite uses `rolldownOptions`, not the deprecated `rollupOptions` compatibility alias;
- Leaflet and PDF.js remain part of the Vite module/asset graph.
