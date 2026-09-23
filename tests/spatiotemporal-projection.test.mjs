import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpatiotemporalViewport,
  spatiotemporalViewportKey,
} from "../src/application/spatiotemporal-viewport.ts";
import {
  occurrenceIntersectsViewport,
  occurrenceViewportWeight,
  projectActiveOccurrences,
} from "../src/projection/spatiotemporal-projection.ts";

test("spatiotemporal viewport validates temporal and geographic bounds", () => {
  assert.throws(
    () => createSpatiotemporalViewport({ time: { start: 20, end: 10 } }),
    /end must be greater than or equal to start/,
  );
  assert.throws(
    () =>
      createSpatiotemporalViewport({
        time: { start: 0, end: 10 },
        space: {
          geographicBounds: { south: -91, west: -10, north: 10, east: 10 },
        },
      }),
    /latitude bounds/,
  );
});

test("viewport identity is deterministic for equivalent explicit state", () => {
  const viewport = {
    time: { start: 10, end: 20, cursor: 15 },
    space: {
      focusPlaceId: "stockholm",
      geographicBounds: { south: 50, west: 10, north: 70, east: 30 },
    },
    focus: { entityId: "alice", occurrenceId: "worked-with" },
    storyId: "story-1",
    semanticZoom: 2,
  };

  assert.equal(
    spatiotemporalViewportKey(viewport),
    spatiotemporalViewportKey(structuredClone(viewport)),
  );
});

test("occurrence activation uses inclusive interval intersection", () => {
  const viewport = { time: { start: 100, end: 200 } };

  assert.equal(
    occurrenceIntersectsViewport({ id: "covers", start: 0, end: 300 }, viewport),
    true,
  );
  assert.equal(
    occurrenceIntersectsViewport({ id: "left-boundary", start: 0, end: 100 }, viewport),
    true,
  );
  assert.equal(
    occurrenceIntersectsViewport({ id: "right-boundary", start: 200, end: 300 }, viewport),
    true,
  );
  assert.equal(
    occurrenceIntersectsViewport({ id: "instant", start: 150, end: null }, viewport),
    true,
  );
  assert.equal(
    occurrenceIntersectsViewport({ id: "before", start: 0, end: 99 }, viewport),
    false,
  );
});

test("active occurrence projection is stable independent of source order", () => {
  const viewport = { time: { start: 10, end: 30 } };
  const occurrences = [
    { id: "b", start: 20, end: null },
    { id: "range", start: 0, end: 100 },
    { id: "a", start: 20, end: null },
    { id: "outside", start: 31, end: 40 },
  ];

  assert.deepEqual(
    projectActiveOccurrences(occurrences, viewport).map((occurrence) => occurrence.id),
    ["range", "a", "b"],
  );
  assert.deepEqual(
    projectActiveOccurrences([...occurrences].reverse(), viewport).map(
      (occurrence) => occurrence.id,
    ),
    ["range", "a", "b"],
  );
});

test("viewport weight is derived without changing logical activation", () => {
  const viewport = { time: { start: 0, end: 100 } };
  assert.equal(occurrenceViewportWeight({ id: "full", start: 0, end: 100 }, viewport), 1);
  assert.equal(occurrenceViewportWeight({ id: "half", start: 50, end: 100 }, viewport), 0.5);
  assert.equal(occurrenceViewportWeight({ id: "outside", start: 101, end: 120 }, viewport), 0);
  assert.equal(occurrenceViewportWeight({ id: "instant", start: 50 }, viewport), 0.01);
});
