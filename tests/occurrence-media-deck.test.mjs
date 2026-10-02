import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deckNavigationMode,
  normalizeOccurrenceDeckFrames,
  resolveOccurrenceDeckIndex,
  stepOccurrenceDeckIndex,
} from "../site/occurrence-media-deck-model.ts";

test("occurrence deck normalizes image and context frames without inventing empty chrome", () => {
  assert.deepEqual(normalizeOccurrenceDeckFrames([]), []);

  const frames = normalizeOccurrenceDeckFrames([
    { kind: "image", src: "one.jpg", alt: "One" },
    {
      kind: "video",
      src: "clip.webm",
      mimeType: "video/webm",
      sha256: "a".repeat(64),
      caption: "Clip",
    },
    { kind: "audio", src: "interview.ogg", mimeType: "audio/ogg", alt: "Interview" },
    { kind: "image", src: "", alt: "Missing" },
    { kind: "context", label: "Context", body: "A concise contextual frame." },
    { kind: "context", label: "", body: "" },
  ]);

  assert.deepEqual(frames, [
    { kind: "image", src: "one.jpg", alt: "One", caption: "" },
    {
      kind: "video",
      src: "clip.webm",
      mimeType: "video/webm",
      sha256: "a".repeat(64),
      alt: "",
      caption: "Clip",
    },
    { kind: "audio", src: "interview.ogg", mimeType: "audio/ogg", alt: "Interview", caption: "" },
    { kind: "context", label: "Context", body: "A concise contextual frame." },
  ]);
});

test("occurrence deck uses no controls for one frame, dots for small sets, and a counter for large sets", () => {
  assert.equal(deckNavigationMode(0), "none");
  assert.equal(deckNavigationMode(1), "none");
  assert.equal(deckNavigationMode(2), "dots");
  assert.equal(deckNavigationMode(5), "dots");
  assert.equal(deckNavigationMode(6), "counter");
  assert.equal(deckNavigationMode(20), "counter");
});

test("occurrence deck navigation wraps deterministically", () => {
  assert.equal(stepOccurrenceDeckIndex(0, -1, 3), 2);
  assert.equal(stepOccurrenceDeckIndex(2, 1, 3), 0);
  assert.equal(stepOccurrenceDeckIndex(1, 1, 3), 2);
  assert.equal(stepOccurrenceDeckIndex(8, 1, 0), 0);
});

test("same-occurrence rerenders preserve media while occurrence changes use the requested initial frame", () => {
  assert.equal(
    resolveOccurrenceDeckIndex({
      previousOccurrenceId: "occ-1",
      nextOccurrenceId: "occ-1",
      previousIndex: 2,
      requestedIndex: 0,
      frameCount: 4,
    }),
    2,
  );

  assert.equal(
    resolveOccurrenceDeckIndex({
      previousOccurrenceId: "occ-1",
      nextOccurrenceId: "occ-2",
      previousIndex: 2,
      requestedIndex: 1,
      frameCount: 4,
    }),
    1,
  );

  assert.equal(
    resolveOccurrenceDeckIndex({
      previousOccurrenceId: "occ-1",
      nextOccurrenceId: "occ-2",
      previousIndex: 2,
      requestedIndex: 99,
      frameCount: 4,
    }),
    3,
  );
});

test("occurrence deck component owns media navigation without autoplay or parent focus rerenders", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-media-deck.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /customElements\.define\("luum-occurrence-deck"/);
  assert.match(source, /occurrencedeckchange/);
  assert.match(source, /timeline-focus-media-control/);
  assert.match(source, /timeline-focus-slide-dot/);
  assert.match(source, /timeline-focus-slide-count/);
  assert.match(source, /<video[\s\S]*controls[\s\S]*playsinline/);
  assert.match(source, /<audio[\s\S]*controls/);
  assert.match(source, /preload="metadata"/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /IMAGE_ZOOM_STEPS/);
  assert.match(source, /\[0\.5, 0\.75, 1, 1\.25, 1\.5, 2, 3\]/);
  assert.match(source, /IMAGE_RESET_ZOOM = 1/);
  assert.match(source, /IMAGE_MIN_ZOOM = IMAGE_ZOOM_STEPS\[0\]/);
  assert.match(source, /timeline-occurrence-deck-zoom-controls/);
  assert.match(source, /aria-label="Zoom image out"/);
  assert.match(source, /aria-label="Zoom image in"/);
  assert.match(source, /--occurrence-image-zoom/);
  assert.match(source, /timeline-occurrence-deck-image-viewport/);
  assert.match(source, /@pointerdown=/);
  assert.match(source, /@pointermove=/);
  assert.match(source, /@pointerup=/);
  assert.match(source, /@pointercancel=/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /releasePointerCapture/);
  assert.match(source, /@wheel=/);
  assert.match(source, /@dblclick=/);
  assert.match(source, /gestureWasPinch/);
  assert.match(source, /SWIPE_THRESHOLD_PX/);
  assert.match(source, /this\.imageZoomValue = IMAGE_RESET_ZOOM/);
  assert.match(source, /this\.imageZoomValue <= IMAGE_RESET_ZOOM \+ 0\.001/);
  assert.match(source, /this\.imageZoomValue > IMAGE_RESET_ZOOM \+ 0\.001/);
  assert.doesNotMatch(source, /setInterval|setTimeout\([^)]*next|autoplay/i);
  assert.doesNotMatch(source, /\.play\(\)/);
});

test("occurrence deck surfaces use theme tokens and expose touch-safe image manipulation", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  const composer = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.timeline-occurrence-deck-image-viewport\s*\{[\s\S]*touch-action:\s*none[\s\S]*background:\s*var\(--paper/,
  );
  assert.match(
    css,
    /\.timeline-focus-hero\s*\{[\s\S]*background:\s*var\(--paper\)[\s\S]*color:\s*var\(--ink\)/,
  );
  assert.match(css, /\.timeline-occurrence-deck-video\s*\{[\s\S]*object-fit:\s*contain/);
  assert.match(css, /\.timeline-occurrence-deck-audio\s*\{[\s\S]*inline-size:/);
  assert.match(
    css,
    /\.timeline-focus-hero-fallback\s*\{[\s\S]*var\(--paper\)[\s\S]*var\(--panel\)/,
  );
  assert.match(
    composer,
    /\.composer-context-deck \.timeline-occurrence-deck-image-viewport\s*\{[\s\S]*touch-action:\s*none/,
  );
  assert.match(
    composer,
    /transform:\s*translate3d\(var\(--occurrence-image-pan-x, 0px\), var\(--occurrence-image-pan-y, 0px\), 0\)\s*scale\(var\(--occurrence-image-zoom, 1\)\)/,
  );
  assert.match(
    css,
    /#app-shell\s+luum-occurrence-deck\[data-frame-count\]:not\(\[data-frame-count="1"\]\)\s+\.timeline-occurrence-deck-zoom-controls\s*\{[\s\S]*inset-block-end:\s*3\.75rem/,
  );
  assert.match(
    css,
    /#app-shell\s+luum-occurrence-deck\s+\.timeline-focus-slideshow-controls\s*\{[\s\S]*bottom:\s*0\.45rem[\s\S]*left:\s*50%/,
  );
  assert.match(
    composer,
    /\.composer-context-deck\[data-frame-count\]:not\(\[data-frame-count="1"\]\)\s+\.timeline-occurrence-deck-zoom-controls\s*\{[\s\S]*inset-block-end:\s*3\.6rem/,
  );
});

test("timeline focus delegates media presentation to the occurrence deck", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /LuumOccurrenceDeckElement/);
  assert.match(source, /setDeck\(/);
  assert.match(source, /occurrencedeckchange/);
  assert.doesNotMatch(source, /media\.forEach\(\(_, index\) =>/);
  assert.doesNotMatch(source, /this\.renderFocus\(item, focusHost\).*focusMediaIndex/s);
});

test("multimedia evidence is fingerprinted, persisted, and projected into the slideshow", async () => {
  const [app, timeline, markup] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
  ]);

  assert.match(app, /evidenceStore\.sha256Blob\(file\)/);
  assert.match(app, /evidenceStore\.putBlob\(blobKey, file\)/);
  assert.match(app, /fileKind === "audio"/);
  assert.match(app, /fileKind === "video"/);
  assert.match(timeline, /getEvidenceBlob\(blobKey\)/);
  assert.match(timeline, /evidenceMediaKind\(record\)/);
  assert.match(timeline, /timeline-focus-evidence-file-meta/);
  assert.match(timeline, /SHA-256/);
  assert.match(markup, /<option value="audio">Audio upload<\/option>/);
  assert.match(markup, /<option value="video">Video upload<\/option>/);
  assert.match(markup, /audio\/\*/);
  assert.match(markup, /video\/\*/);
});

test("occurrence deck bounds hot-path DOM work and releases transient state", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-media-deck.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createRef, ref/);
  assert.match(source, /occurrenceDeckFramesEqual/);
  assert.match(source, /if \(!occurrenceChanged && !framesChanged && !indexChanged\) return;/);
  assert.match(source, /if \(framesChanged\) \{[\s\S]*releaseUnusedBlobUrls\(nextFrames\)/);
  assert.match(source, /imageTransformFrame = requestAnimationFrame/);
  assert.match(source, /cancelAnimationFrame\(this\.imageTransformFrame\)/);
  assert.match(
    source,
    /connectedCallback\(\): void \{[\s\S]*frame\.blob[\s\S]*this\.requestUpdate\(\)/,
  );
  assert.match(source, /this\.resetGestureState\(\);[\s\S]*this\.releaseBlobUrls\(\);/);
  assert.match(source, /gestureViewportRect = viewport\.getBoundingClientRect\(\)/);
  assert.match(source, /previous\.x = event\.clientX;[\s\S]*previous\.y = event\.clientY;/);
  assert.doesNotMatch(source, /\[\.\.\.this\.activePointers\.values\(\)\]/);

  const pointerMove =
    source.match(
      /private onImagePointerMove\([\s\S]*?\n {2}\}\n\n {2}private releasePointer/,
    )?.[0] ?? "";
  assert.ok(pointerMove);
  assert.doesNotMatch(pointerMove, /getBoundingClientRect/);
  assert.doesNotMatch(pointerMove, /requestUpdate/);
  assert.doesNotMatch(pointerMove, /syncImageTransform/);
});
