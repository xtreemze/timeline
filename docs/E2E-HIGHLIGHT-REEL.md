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

Static scenes hold the demonstrated state open and capture a PNG screenshot. Motion scenes must be display-paced at native 60 fps. Chromium keeps its normal frame limiter and vsync scheduling; only background/occlusion throttling is disabled. CI starts a dummy Xorg display with an explicit 1920×1080@60 modeline, and FFmpeg samples that X11 framebuffer at 60 fps into VP8. The encoder uses the X11 demuxer's timing base with `-enc_time_base demux` and `-fps_mode passthrough`; raw frame timestamps must be strictly increasing, while both the decoded raw cadence and browser `requestAnimationFrame()` clock must remain within 59–61 fps.

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

Each form factor publishes two native-cadence animated WebP motion assets and three PNG stills. Raw WebM exists only for motion scenes; every motion WebM has a `.frames.json` timing sidecar containing decoded raw-frame timestamps, browser animation timestamps, capture geometry, codec, measured raw cadence, measured browser cadence, and frame counts. Every scene also keeps a raw PNG capture.

## Capture architecture

`playwright.highlight.config.ts` is deliberately separate from the normal Playwright matrix. The normal `playwright.config.ts` excludes `tests/highlight/**`, and executable contract tests protect that discovery boundary.

The showcase config contains two structural projects:

- `Desktop Showcase`
- `Mobile Showcase`

The shared scene metadata defines feature title, explanation, expected state, alt text, stable output stem, and whether the scene is `motion` or `static`. Desktop and mobile interaction routines remain separate so touch UI is not forced to mimic desktop input mechanics.

Motion capture does not use Playwright 1.63's built-in screencast file recorder, which hard-codes its video output to 25 fps. It also does not depend on Chromium's DevTools screencast or tab-media capture transports: CI measurements showed those transports could not sustain the required cadence. The media workflow instead starts Xorg with the dummy video driver and an explicit 1920×1080@60 modeline, verifies that mode with `xrandr`, runs headed Chromium on that display, and records the viewport region directly with FFmpeg `x11grab`. Chromium background and occlusion throttling are disabled, but `--disable-frame-rate-limit` and `--disable-gpu-vsync` are intentionally forbidden because they would uncap the browser instead of certifying native 60 Hz pacing. Raw VP8 encoding preserves the demuxer time base and passthrough timestamps; duplicated or non-increasing timestamps fail certification.

Playwright native screencast overlays provide restrained Lūm branding and feature chapters for motion capture without modifying production UI only for recording. Static screenshots remain product-state captures rather than chapter cards.

## Rendering architecture

`scripts/render-e2e-highlight.mjs` uses FFmpeg rather than adding a second browser/video framework. It:

- requires the browser `requestAnimationFrame()` clock to remain within 59–61 fps while recording;
- decodes raw X11 WebM frame timestamps with FFprobe, rejects duplicated/non-increasing timestamps, and requires the source to remain within the same 59–61 fps native window before publication encoding;
- verifies the raw WebM codec is VP8 and that decoded frame counts exactly match the timing evidence;
- probes every visual source with FFprobe;
- preserves each published asset independently at its own source dimensions;
- copies static PNG captures directly into the published showcase;
- renders motion scenes as animated WebP with source timestamps preserved via `-fps_mode passthrough`;
- keeps the mobile showcase portrait;
- composes separate H.264 desktop and mobile reels without an output `-r` override;
- generates synthetic still segments at the 60 fps reel cadence, while motion segments retain their measured source cadence;
- emits README-ready markup from the same manifest metadata;
- measures individual and aggregate showcase payloads.

There is no GIF palette stage, no reduced presentation frame rate, and no fixed GIF width. A nominal 60 fps output is not sufficient by itself: CI must prove a display-paced 59–61 fps browser clock and a matching 59–61 fps raw X11 source, and downstream WebP/MP4 encoding is not allowed to manufacture cadence with `-r` or motion `fps=` filters.

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
