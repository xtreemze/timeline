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

Static scenes hold the demonstrated state open and capture a PNG screenshot. Motion scenes target 60 fps. The capture path receives Chromium-presented JPEG frames and their browser timestamps directly, requires at least 59 actual frames per second before any encoder runs, samples only those received frames to the 60 fps publication cadence, and encodes VP8 WebM. The renderer then independently checks the timestamp evidence and decoded raw WebM before producing 60 fps animated WebP and MP4 reels.

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
│   │   ├── 01-timeline-navigation.webm.frames.json
│   │   ├── 01-timeline-navigation.png
│   │   ├── 02-focused-context.png
│   │   └── ...
│   └── mobile/
│       ├── manifest.json
│       ├── 01-timeline-navigation.webm
│       ├── 01-timeline-navigation.webm.frames.json
│       ├── 01-timeline-navigation.png
│       ├── 02-focused-context.png
│       └── ...
└── playwright/
```

Each form factor publishes two 60 fps animated WebP motion assets and three PNG stills. Raw WebM exists only for motion scenes; every motion WebM has a `.frames.json` timing sidecar containing the original Chromium presentation timestamps, and every scene keeps a raw PNG capture. The root manifest records each published asset's byte size plus source dimensions, encoded frame rate, measured pre-encode capture rate, and frame counts.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, stable output stem, and whether the scene is `motion` or `static`. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Motion capture explicitly requests the form-factor viewport size from Chromium so the screencast is not silently reduced to Playwright's default 800-pixel bound. The dedicated showcase browser disables background timer throttling, renderer backgrounding, occluded-window backgrounding, the browser frame-rate limit, and GPU vsync. Because Playwright 1.63's built-in screencast file recorder hard-codes 25 fps, Lūm does not use that file-recorder path for certification. It consumes `onFrame` callbacks directly, records the browser presentation timestamp for every received frame, and rejects any motion scene below 59 measured frames per second before encoding. VP8 is used for the raw WebM to reduce real-time encoding pressure.

Playwright native screencast overlays provide restrained Lūm branding and feature chapters for motion capture without modifying production UI only for recording. Static screenshots remain product-state captures rather than chapter cards.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- verifies the original Chromium presentation timestamps and requires at least 59 measured source frames per second;
- decodes raw WebM frame timestamps with FFprobe and rejects encoder frame duplication or loss by comparing decoded frame count with the selected captured-frame count;
- probes every visual source with FFprobe;
- preserves each published asset independently at its own source dimensions;
- copies static PNG captures directly into the published showcase;
- renders motion scenes as 60 fps animated WebP;
- keeps the mobile showcase portrait;
- composes separate 60 fps H.264 desktop and mobile reels;
- uses the explicit 60 fps capture contract for reel composition instead of trusting reported stream metadata;
- emits README-ready markup from the same manifest metadata;
- measures individual and aggregate showcase payloads.

There is no GIF palette stage, no reduced presentation frame rate, and no fixed GIF width. A nominal 60 fps output is not sufficient by itself: CI must first prove that Chromium actually supplied at least 59 frames per second, and the raw WebM must decode to exactly the number of selected source frames.

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
