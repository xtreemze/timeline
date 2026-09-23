# E2E highlight reel

Lūm's CI can produce a short, branded visual receipt from the real browser application.

## Pipeline

1. Playwright launches real Chromium against the normal Vite development server.
2. `tests/highlight/highlight-reel.spec.ts` records exactly five intentional, loop-safe walkthrough segments with Playwright's native screencast API: timeline navigation, focused context, evidence, relation-graph interaction, and mobile composition.
3. Each segment includes a Lūm brand bug, a chapter card, and Playwright action annotations. A matching still screenshot is saved at the end of each segment.
4. `scripts/render-e2e-highlight.mjs` uses FFmpeg to normalize the source media, insert the stills as editorial freeze frames, and cross-fade the sequence into one H.264 MP4.
5. The same renderer trims the chapter card from each source clip and creates five palette-optimized, infinitely looping GIFs at README-friendly dimensions.
6. It also writes `README-showcase.md`, a ready-to-paste Markdown/HTML showcase using stable Pages URLs.
7. CI uploads the complete `artifacts/e2e-media/` directory so the raw WebM clips, screenshots, GIFs, manifest, Markdown snippet, Playwright output, and final MP4 remain inspectable.
8. On `main`, the Pages workflow copies the GIFs into `dist/showcase/`, making their README URLs stable.

The showcase flow is intentionally separate from the exhaustive browser-certification matrix. It gives reviewers concise visual evidence without recording every test and multiplying artifact storage.

## Local usage

Install Chromium and FFmpeg, then run:

```sh
pnpm test:e2e:highlight
pnpm render:e2e:highlight
```

The final reel is written to:

```text
artifacts/e2e-media/lum-e2e-highlight.mp4
```

Raw evidence remains under `artifacts/e2e-media/raw/`.

## Why this stack

Playwright already supplies precise screencast start/stop control, chapter cards, action callouts, and screenshots, so capture stays inside the same E2E toolchain that certifies the product. FFmpeg handles only deterministic media normalization and editing. This avoids adding a second browser renderer or a native OpenGL-dependent editing framework to the application dependency graph.


## README GIF outputs

The renderer produces:

```text
artifacts/e2e-media/gifs/01-timeline-navigation.gif
artifacts/e2e-media/gifs/02-focused-context.gif
artifacts/e2e-media/gifs/03-evidence.gif
artifacts/e2e-media/gifs/04-relation-graph.gif
artifacts/e2e-media/gifs/05-mobile.gif
```

GIFs use an infinite loop, 10 fps, a constrained palette, and Lanczos scaling. Each recorded interaction deliberately returns to its starting UI state before capture ends so the restart is visually natural rather than an arbitrary jump.

The deployed URLs are `https://xtreemze.github.io/timeline/showcase/<filename>.gif`.
