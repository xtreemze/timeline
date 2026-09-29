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
    { kind: "image", src: "", alt: "Missing" },
    { kind: "context", label: "Context", body: "A concise contextual frame." },
    { kind: "context", label: "", body: "" },
  ]);

  assert.deepEqual(frames, [
    { kind: "image", src: "one.jpg", alt: "One", caption: "" },
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
  assert.match(source, /IMAGE_ZOOM_STEPS/);
  assert.match(source, /timeline-occurrence-deck-zoom-controls/);
  assert.match(source, /aria-label="Zoom image out"/);
  assert.match(source, /aria-label="Zoom image in"/);
  assert.match(source, /--occurrence-image-zoom/);
  assert.match(source, /this\.imageZoomIndex = 0/);
  assert.doesNotMatch(source, /setInterval|setTimeout\([^)]*next|autoplay/i);
});

test("timeline focus delegates media presentation to the occurrence deck", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /LuumOccurrenceDeckElement/);
  assert.match(source, /setDeck\(/);
  assert.match(source, /occurrencedeckchange/);
  assert.doesNotMatch(source, /media\.forEach\(\(_, index\) =>/);
  assert.doesNotMatch(source, /this\.renderFocus\(item, focusHost\).*focusMediaIndex/s);
});
