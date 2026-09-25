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

Static scenes hold the demonstrated state open and capture a PNG screenshot. Motion scenes subscribe directly to Chromium compositor frames through the DevTools `Page.startScreencast` stream at the full 1440×900 or 390×844 viewport. Each delivered frame carries Chromium's own frame-swap timestamp. CI requires those timestamps to cover at least 95% of the intended recording window and sustain at least 59 actual frames per second before encoding begins. Only then is the captured frame sequence encoded one-source-frame-for-one-output-frame as VP8 WebM at 60 fps; the renderer verifies that the WebM frame count exactly matches Chromium's captured frame count before producing presentation derivatives.

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

Each form factor publishes two 60 fps animated WebP motion assets and three PNG stills. Source-frame VP8 WebM exists only for motion scenes; every scene keeps a raw PNG capture. The root manifest records each published asset's byte size, the source dimensions, the 60 fps target, Chromium compositor timestamps, recording-window coverage, and measured source cadence for motion scenes.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, stable output stem, and whether the scene is `motion` or `static`. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Motion capture uses the installed current Chrome channel (Chrome 154 or newer) because Chromium 154 added `maxFramesInFlight` to `Page.startScreencast`. Lūm drives that DevTools command directly with JPEG frame delivery, `everyNthFrame: 1`, `maxFramesInFlight: 12`, and immediate frame acknowledgements. This removes real-time video encoding from the capture window and avoids both Playwright 1.63's fixed-rate recorder and Chromium's slower native video recorder. A capture-only one-pixel `requestAnimationFrame` heartbeat keeps compositor damage flowing and independently certifies the browser frame clock. Dedicated showcase Chrome runs disable background timer throttling, renderer backgrounding, occluded-window throttling, frame-rate limiting, and GPU vsync. Static capture uses a CSS-pixel Playwright screenshot of the same real reached state.

A capture-only DOM overlay provides restrained Lūm branding without taking ownership of the DevTools screencast stream. Static screenshots remain product-state captures.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- probes every visual source with FFprobe;
- validates Chromium compositor timestamps, at least 95% recording-window coverage, and a minimum 59 fps source cadence before encoding begins;
- verifies that raw motion and static screenshots match the certified desktop/mobile viewport dimensions;
- copies static PNG captures directly into the published showcase;
- renders motion scenes as 60 fps animated WebP at the source viewport dimensions;
- keeps the mobile showcase portrait;
- composes separate 60 fps H.264 desktop and mobile reels;
- re-probes the published animations and reels to verify their decoded frame cadence;
- emits README-ready markup from the same manifest metadata;
- measures individual and aggregate showcase payloads.

There is no GIF palette stage, no reduced WebP frame rate, and no fixed animation width. Chromium frame-swap timestamps prove what the browser delivered before encoding. The raw VP8 WebM is then decoded with FFprobe and must contain exactly the same number of frames as the captured compositor sequence, so a slower source cannot pass merely because FFmpeg reports or pads 60 fps. Presentation derivatives are emitted only after those gates pass.

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
pnpm verify:e2e:showcase
```

The renderer expects both Playwright projects to have completed successfully.

## Presentation use

The two MP4 reels remain convenient presentation assets when conventional video playback is preferred. For README, documentation, and web embedding, use PNG for static product states and animated WebP only where motion carries information. Product showcase media demonstrates application behavior; it is not evidence, provenance, or case material inside a Lūm project.
