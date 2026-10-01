import assert from "node:assert/strict";
import test from "node:test";

import {
  composerKeyboardInsetPx,
  mobileKeyboardOcclusionPx,
} from "../src/layout/mobile-viewport-occlusion.ts";

test("keyboard occlusion is measured independently from visual viewport pan", () => {
  assert.equal(
    mobileKeyboardOcclusionPx({
      layoutHeight: 844,
      visualHeight: 500,
      scale: 1,
    }),
    344,
  );
});

test("pinch zoom alone does not masquerade as a keyboard", () => {
  assert.equal(
    mobileKeyboardOcclusionPx({
      layoutHeight: 844,
      visualHeight: 422,
      scale: 2,
    }),
    0,
  );
});

test("keyboard occlusion survives pinch zoom normalization", () => {
  assert.equal(
    mobileKeyboardOcclusionPx({
      layoutHeight: 844,
      visualHeight: 250,
      scale: 2,
    }),
    344,
  );
});

test("normal and unavailable visual viewport geometry resolve to zero occlusion", () => {
  assert.equal(
    mobileKeyboardOcclusionPx({
      layoutHeight: 844,
      visualHeight: 844,
      scale: 1,
    }),
    0,
  );
  assert.equal(
    mobileKeyboardOcclusionPx({
      layoutHeight: 844,
      visualHeight: 844,
      scale: Number.NaN,
    }),
    0,
  );
});

test("composer owns an existing inset until the IME has actually finished closing", () => {
  const opened = composerKeyboardInsetPx(344, true, 0);
  assert.equal(opened, 344);

  const focusTransition = composerKeyboardInsetPx(344, false, opened);
  assert.equal(focusTransition, 344);

  const closed = composerKeyboardInsetPx(0, false, focusTransition);
  assert.equal(closed, 0);
});

test("unrelated viewport shrink cannot acquire composer keyboard ownership", () => {
  assert.equal(composerKeyboardInsetPx(344, false, 0), 0);
});
