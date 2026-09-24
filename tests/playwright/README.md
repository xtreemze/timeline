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

### Touch input

Use `tests/support/touch-gestures.ts` for touch, never `locator.dispatchEvent`
or hand-built `PointerEvent`s. Those skip hit testing, `touch-action` and
Chromium's touch adjustment, and every event costs a round trip, so timing
recognisers (double-tap, fling) fail when the renderer is busy.
`@testing-library/user-event` has the same limits: its events are untrusted
and it never produces `TouchEvent`s.

- `tap`, `doubleTap`, `longPress`, `swipe`, `pinch`: a single CDP call each.
  Chromium plays the gesture back itself as trusted touch input.
- `touchscreen(page)`: step-by-step multi-finger contacts. Use it for gestures
  that need an assertion partway through, such as long-press then drag. Wait
  on page state between steps, not on fixed timeouts.

Real input lands on whatever is under the finger. Start a gesture on open
background, with no control within a fingertip's radius, unless the test is
about that control.

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
