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

Static scenes hold the demonstrated state open and capture a PNG from the exact-size X11 framebuffer. Motion scenes run headed Chromium in an Xvfb display whose surface exactly matches the certified 1440×900 desktop or 390×844 mobile viewport. Chromium current-tab capture is constrained to 60 fps and VP8. A cloned capture track is read through `MediaStreamTrackProcessor`, and CI requires those source-frame timestamps to measure at least 59 actual frames per second over at least 95% of the recording window. A separate `requestAnimationFrame` clock must also sustain at least 59 fps, so a nominally 60 fps file cannot hide a slower browser render loop. The retained VP8 WebM is decoded independently with FFprobe and must clear the same cadence and coverage requirements.

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

Each form factor publishes two 60 fps animated WebP motion assets and three PNG stills. Raw VP8 WebM exists only for motion scenes; every scene keeps a raw PNG capture. The root manifest records each published asset's byte size, source dimensions, 60 fps target, decoded raw-frame timestamps, recording-window coverage, measured capture cadence, and browser frame-clock cadence for motion scenes.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, stable output stem, and whether the scene is `motion` or `static`. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Motion capture uses headed Chromium in kiosk mode on dedicated exact-size Xvfb displays. Showcase-only browser launches disable background timer throttling, renderer backgrounding, and occluded-window throttling while retaining normal display pacing. `--auto-accept-this-tab-capture` makes CI current-tab capture deterministic. The captured video track requests 60 fps at the certified viewport dimensions and uses VP8 MediaRecorder rather than VP9 to reduce real-time encoding pressure. `MediaStreamTrackProcessor` reads a clone of the same track to collect source-frame timestamps independently of the encoded WebM. A one-second browser-frame preflight must sustain at least 59 fps before recording begins, and the full recording window is measured again afterward. Static capture takes a one-frame PNG snapshot directly from the same exact-size X11 framebuffer, avoiding a separate browser screenshot path.

A capture-only DOM overlay provides restrained Lūm branding without taking ownership of the framebuffer recorder. Static screenshots remain product-state captures.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- probes every visual source with FFprobe;
- validates `MediaStreamTrackProcessor` source-frame timestamps, at least 95% recording-window coverage, a minimum 59 fps current-tab capture cadence, and a separate minimum 59 fps browser frame clock before derivative rendering begins;
- verifies that raw motion and static screenshots match the certified desktop/mobile viewport dimensions;
- copies static PNG captures directly into the published showcase;
- renders motion scenes as 60 fps animated WebP at the source viewport dimensions;
- keeps the mobile showcase portrait;
- composes separate 60 fps H.264 desktop and mobile reels;
- re-probes the published animations and reels to verify their decoded frame cadence;
- emits README-ready markup from the same manifest metadata;
- measures individual and aggregate showcase payloads.

There is no GIF palette stage, no reduced WebP frame rate, and no fixed animation width. The capture stage does not use FFmpeg CFR normalization. Chromium supplies a VP8 current-tab WebM plus independent source-track timestamps; CI requires both the source-track evidence and the decoded raw WebM to sustain at least 59 fps with the required recording-window coverage. The independently measured browser frame clock must also sustain at least 59 fps. Presentation derivatives are emitted only after those gates pass, then decoded again to verify their cadence.

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
