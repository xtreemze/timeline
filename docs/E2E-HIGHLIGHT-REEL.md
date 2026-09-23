# CI-native visual showcase

Lūm generates durable product-demonstration media from the real application in real Chromium. The showcase is a presentation and review layer over the existing E2E system, not a demo fork and not a source of product state.

## What the pipeline produces

The dedicated `E2E media showcase` workflow records five desktop scenes and five mobile scenes that express the same five feature intents with form-factor-appropriate interactions:

1. Navigate the continuum.
2. Read an occurrence in context.
3. Inspect evidence.
4. Explore relationships.
5. Browse narrative threads.

Desktop uses the 1440×900 product layout with pointer, wheel, hover, and keyboard interactions where appropriate. Mobile uses an explicit touch-capable 390×844 portrait project and the actual responsive UI rather than a scaled desktop recording.

Each scene asserts that the demonstrated state was reached, records a raw WebM, captures a final PNG, and intentionally returns as close as practical to its starting state so the resulting GIF loops naturally.

## Output contract

```text
artifacts/e2e-media/
├── manifest.json
├── README-showcase.md
├── reels/
│   ├── lum-desktop-highlight.mp4
│   └── lum-mobile-highlight.mp4
├── gifs/
│   ├── desktop/
│   │   ├── 01-timeline-navigation.gif
│   │   ├── 02-focused-context.gif
│   │   ├── 03-evidence.gif
│   │   ├── 04-relation-graph.gif
│   │   └── 05-story-browser.gif
│   └── mobile/
│       ├── 01-timeline-navigation.gif
│       ├── 02-focused-context.gif
│       ├── 03-evidence.gif
│       ├── 04-relation-graph.gif
│       └── 05-story-browser.gif
├── raw/
│   ├── desktop/
│   │   ├── manifest.json
│   │   ├── 01-timeline-navigation.webm
│   │   ├── 01-timeline-navigation.png
│   │   └── ...
│   └── mobile/
│       ├── manifest.json
│       ├── 01-timeline-navigation.webm
│       ├── 01-timeline-navigation.png
│       └── ...
└── playwright/
```

The root manifest merges both capture manifests and records individual GIF byte sizes, desktop and mobile totals, and the combined GIF payload.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, and stable output stem. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Playwright native screencast overlays provide restrained Lūm branding and feature chapters without modifying production UI only for recording.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- normalizes each form factor independently;
- keeps the mobile reel portrait;
- composes a separate H.264 desktop reel and mobile reel;
- renders ten palette-optimized infinite-loop GIFs;
- uses Lanczos scaling, 10 fps, and a constrained 96-color palette by default;
- emits README-ready markup from the same manifest metadata;
- measures each GIF and aggregate payloads.

The dependency policy remains intentionally small: Playwright captures the real browser, and FFmpeg performs deterministic media processing. Remotion or native OpenGL editing dependencies are not justified for this pipeline.

## CI and publication

`.github/workflows/e2e-media.yml` owns capture, rendering, verification, size reporting, and artifact upload. It runs for relevant pull requests and `main` changes, supports `workflow_dispatch`, has its own concurrency group, and can be rerun independently of the broader browser matrix.

The Pages deployment does not re-record showcase footage. After a successful media run on `main`, `.github/workflows/pages.yml` downloads the certified `lum-e2e-showcase` artifact, runs the normal build/certification process, then publishes:

```text
dist/showcase/desktop/*.gif
dist/showcase/mobile/*.gif
```

Stable README URLs therefore use:

```text
https://xtreemze.github.io/timeline/showcase/desktop/<scene>.gif
https://xtreemze.github.io/timeline/showcase/mobile/<scene>.gif
```

Generated GIF binaries are not committed to source control.

## Local use

Install Chromium and FFmpeg, then run:

```sh
pnpm test:e2e:showcase
pnpm render:e2e:showcase
```

The renderer expects both Playwright projects to have completed successfully.

## Presentation use

The two MP4 reels are the preferred presentation assets when video playback is available. The desktop and mobile GIF collections are the durable README/documentation form and can also be embedded in lightweight slide or web presentations. Product showcase media demonstrates application behavior; it is not evidence, provenance, or case material inside a Lūm project.
