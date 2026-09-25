# CI-native visual showcase

Lūm generates durable product-demonstration media from the real application in real Chromium. The showcase is a presentation and review layer over the existing E2E system, not a demo fork and not a source of product state.

## What the pipeline produces

The dedicated `E2E media showcase` workflow captures five desktop scenes and five mobile scenes that express the same five feature intents with form-factor-appropriate interactions:

1. Navigate the continuum.
2. Read an occurrence in context.
3. Inspect evidence.
4. Explore relationships.
5. Browse narrative threads.

Desktop uses the 1440×900 product layout. Mobile uses the explicit touch-capable 390×844 portrait project and the real responsive UI rather than a scaled desktop recording.

The showcase distinguishes motion from static presentation. Timeline navigation and relation-graph navigation are motion scenes. Focused context, evidence, and story browsing are static scenes.

Static scenes hold the demonstrated state open and capture a PNG screenshot. Motion scenes collect Chromium's browser-presented JPEG frames together with their presentation timestamps at the full 1440×900 or 390×844 viewport. The capture step refuses to encode if those timestamps measure below 59 actual frames per second. Only after that source-cadence check are the frames encoded as a variable-timestamp VP8 WebM intermediary; the renderer independently decodes and re-measures that WebM before producing 60 fps presentation media.

## Output contract

```text
artifacts/e2e-media/
├── manifest.json
├── README-showcase.md
├── reels/
│   ├── lum-desktop-highlight.mp4
│   └── lum-mobile-highlight.mp4
├── showcase/
│   ├── desktop/
│   │   ├── 01-timeline-navigation.webp
│   │   ├── 02-focused-context.png
│   │   ├── 03-evidence.png
│   │   ├── 04-relation-graph.webp
│   │   └── 05-story-browser.png
│   └── mobile/
│       ├── 01-timeline-navigation.webp
│       ├── 02-focused-context.png
│       ├── 03-evidence.png
│       ├── 04-relation-graph.webp
│       └── 05-story-browser.png
├── raw/
│   ├── desktop/
│   │   ├── manifest.json
│   │   ├── 01-timeline-navigation.webm
│   │   ├── 01-timeline-navigation.png
│   │   ├── 02-focused-context.png
│   │   └── ...
│   └── mobile/
│       ├── manifest.json
│       ├── 01-timeline-navigation.webm
│       ├── 01-timeline-navigation.png
│       ├── 02-focused-context.png
│       └── ...
└── playwright/
```

Each form factor publishes two 60 fps animated WebP motion assets and three PNG stills. Raw VP8 WebM exists only for motion scenes; every scene keeps a raw PNG capture. The root manifest records each published asset's byte size, the source dimensions, the 60 fps target, and the measured browser-presented source cadence for motion scenes.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, stable output stem, and whether the scene is `motion` or `static`. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Motion capture explicitly passes the certified viewport size to the screencast frame stream so Chromium supplies full 1440×900 desktop frames and full 390×844 mobile frames rather than Playwright's smaller default screencast bounds. Static capture uses a CSS-pixel Playwright screenshot of the same real reached state. Dedicated showcase Chromium runs disable background, renderer, occlusion, frame-rate, and GPU-vsync throttling so CI does not silently reduce source cadence.

Playwright native screencast overlays provide restrained Lūm branding and action annotations without modifying production UI only for recording. Chapter cards run before the measured motion window so a static title hold cannot make an otherwise healthy high-cadence capture fail. Static screenshots remain product-state captures rather than chapter cards.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- probes every visual source with FFprobe;
- decodes raw WebM frame timestamps and requires at least 59 actual decoded frames per second before any 60 fps normalization;
- verifies that raw motion and static screenshots match the certified desktop/mobile viewport dimensions;
- copies static PNG captures directly into the published showcase;
- renders motion scenes as 60 fps animated WebP at the source viewport dimensions;
- keeps the mobile showcase portrait;
- composes separate 60 fps H.264 desktop and mobile reels;
- re-probes the published animations and reels to verify their decoded frame cadence;
- emits README-ready markup from the same manifest metadata;
- measures individual and aggregate showcase payloads.

There is no GIF palette stage, no reduced GIF frame rate, and no fixed GIF width. The raw VP8 intermediary preserves browser presentation timing for certification; presentation derivatives are normalized to 60 fps only after the raw source passes the minimum-cadence gate.

## CI and publication

`.github/workflows/e2e-media.yml` owns capture, rendering, verification, size reporting, and artifact upload. It runs for relevant pull requests and `main` changes, supports `workflow_dispatch`, has its own concurrency group, and can be rerun independently of the broader browser matrix.

The Pages deployment does not re-record showcase footage. After a successful media run on `main`, `.github/workflows/pages.yml` downloads the certified `lum-e2e-showcase` artifact, runs the normal build/certification process, then publishes the mixed media under:

```text
dist/showcase/desktop/*.webp
dist/showcase/desktop/*.png
dist/showcase/mobile/*.webp
dist/showcase/mobile/*.png
```

Stable README URLs therefore use the actual asset extension:

```text
https://xtreemze.github.io/timeline/showcase/desktop/01-timeline-navigation.webp
https://xtreemze.github.io/timeline/showcase/desktop/02-focused-context.png
```

Generated media binaries are not committed to source control.

## Local use

Install Chromium and FFmpeg, then run:

```sh
pnpm test:e2e:showcase
pnpm render:e2e:showcase
```

The renderer expects both Playwright projects to have completed successfully.

## Presentation use

The two MP4 reels remain convenient presentation assets when conventional video playback is preferred. For README, documentation, and web embedding, use PNG for static product states and animated WebP only where motion carries information. Product showcase media demonstrates application behavior; it is not evidence, provenance, or case material inside a Lūm project.
