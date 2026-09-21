# Playwright E2E Tests

Real-browser certification layer for Timeline UI, layout, and interaction.

## What We Test

These tests verify browser-specific behavior that Node unit tests cannot:

### Layout & Rendering
- **Portrait/landscape viewport orientation** — CSS anchor positioning, timeline axis, graph/map positioning
- **Year overflow visibility** — Issue #194: year counter visibility at month-scale zoom
- **Viewport constraints** — Phone (375px), tablet (768px), desktop widths
- **Safe area insets** — Mobile notches, fullscreen compositing

### Interaction
- **Pointer events** — Pan, pinch, long-press, double-tap on timeline/graph/map
- **Touch routing** — Issue #125: gesture ownership across graph/map/timeline surfaces
- **Keyboard navigation** — Arrow keys, +/- zoom, Home center
- **Popover/modal behavior** — Native HTML Popover state management

### Visual Regression
- Baseline screenshots captured for recurring composition issues
- Playwright compares future runs; reports visual diffs

## Running Tests

### Locally (headful)
```bash
pnpm exec playwright test --ui
```

### Headless (CI mode)
```bash
pnpm exec playwright test
```

### Specific browser
```bash
pnpm exec playwright test --project chromium
```

## Writing Tests

See `layout.spec.ts` and `interaction.spec.ts` for patterns.

Key resources:
- [Playwright docs](https://playwright.dev)
- [Mobile device emulation](https://playwright.dev/docs/emulation#devices)
- [Visual comparisons](https://playwright.dev/docs/test-snapshots)
