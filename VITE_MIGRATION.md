# Vite Migration Guide

This document outlines the staged migration from esbuild + manual bundling to Vite with ESM modules.

## Current State

- **Dev**: esbuild in CI only, no dev server
- **Build**: esbuild IIFE bundle for graph (`site/orb-graph.bundle.js`)
- **Modules**: IIFE closures assigning to `globalThis.Timeline*`
- **No HMR**: Changes require full rebuild and page reload

## Target State

- **Dev**: Vite dev server with HMR on localhost:5173
- **Build**: Vite handles site HTML, esbuild still used for graph bundle initially
- **Modules**: ESM imports/exports, no globalThis pollution
- **HMR**: Edit → save → hot reload (no full page reload)

## Migration Phases

### Phase 4a: Infrastructure (Completed)
- [x] Vite installed and configured
- [x] `pnpm dev` → Vite dev server
- [x] `pnpm build` → Vite + esbuild
- [x] `pnpm preview` → Build output preview

### Phase 4b: Proof of Concept (Next)
Convert one high-value, low-risk module to ESM:

**Candidate: `site/temporal-standards.ts`**

Why this module?
- Pure utility functions (no DOM)
- No dependencies on other Timeline modules
- Used by many downstream modules (high value to unlock)
- No external side effects
- Closest to TypeScript-ready (already type-checkable via JSDoc)

**Conversion process:**

1. Rename `site/temporal-standards.js` → `site/temporal-standards.ts`
2. Remove IIFE wrapper:
   ```typescript
   // Before: (() => { ... globalThis.TimelineTemporal = {...}; })();
   // After: export const TimelineTemporal = {...} as const;
   ```
3. Update imports in dependent modules:
   ```javascript
   // Before: const temporal = globalThis.TimelineTemporal;
   // After: import { TimelineTemporal } from './temporal-standards.ts';
   ```
4. Verify no TypeScript errors: `pnpm types`
5. Test in Vite dev server: `pnpm dev`

### Phase 4c: Batch Conversions (Subsequent)
Once temporal-standards works, convert related modules in order:
1. `site/spatial.ts` (depends on temporal-standards)
2. `site/interchange-adapter.ts` (depends on both above)
3. `src/time-scale.ts` (high-value, used by timeline view)

Each conversion:
- Rename to `.ts`
- Remove IIFE, add `export`
- Update importing files
- Verify types
- Test dev server

### Phase 4d: App Entry Point (Final)
Last step: `site/app.ts`
- Import all modules via ESM
- Remove globalThis checks
- Clean initialization order
- Final Vite build optimization

## Module Conversion Template

```typescript
// Before (IIFE)
(() => {
  function helper(x) { return x * 2; }
  globalThis.MyModule = Object.freeze({ helper });
})();

// After (ESM)
export const MyModule = Object.freeze({
  helper: (x: number) => x * 2,
}) as const;
```

## Vite Configuration Notes

**Current config** (vite.config.ts):
- Root: `site/`
- Build output: `dist/`
- Target: Chrome 155 (matches esbuild)
- Modules: .js + .ts support

**Env handling:**
Vite exposes `import.meta.env.*` at build time. Use it for:
- `import.meta.env.DEV` → check if dev mode
- `import.meta.env.PROD` → check if production

**CSS handling:**
Vite extracts CSS automatically. Currently all CSS is in `site/styles.css` and linked in HTML—no changes needed yet.

## What Stays the Same

- `esbuild` still bundles graph (`src/orb-graph-entry.js` → `site/orb-graph.bundle.js`)
- HTML template (`site/index.html`) unchanged
- Node tests (`tests/*.mjs`) unchanged
- Biome + TypeScript checking unchanged

## Building Without Vite

If you need to build without Vite during migration:
```bash
pnpm build:graph
# Manually serve site/ or copy to dist/
```

## Rollback Plan

If Vite causes issues:
1. `git revert` commits 4b, 4c, 4d
2. Run: `pnpm build:graph` (esbuild still available)
3. Restore IIFE patterns from git history

## Timeline

- **Phase 4a**: ✅ Complete (foundation setup)
- **Phase 4b**: ~2-3 hours (first ESM module)
- **Phase 4c**: ~3-5 hours (batches of 2-3 modules)
- **Phase 4d**: ~1-2 hours (app entry point)
- **Total Phase 4**: ~6-10 hours

## Related Issues

- #194: Year overflow → solved by Playwright + Vite HMR (fast iteration)
- #125: Touch routing → solved by Playwright tests + ESM clarity
- Type safety → improved by .ts adoption
- DX: HMR + proper error messages in dev server
