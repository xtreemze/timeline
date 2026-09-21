import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("timeline pinch keeps the gesture midpoint anchored in time", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.match(source, /touchPointers = new Map<number, TouchPointerState>\(\)/);
  assert.match(source, /const beginPinch = \(\): boolean =>/);
  assert.match(source, /anchorTime: this\.viewport\.start \+ span \* geometry\.ratio/);
  assert.match(source, /this\.pinch\.distance \/ geometry\.distance/);
  assert.match(source, /this\.pinch\.anchorTime - nextSpan \* geometry\.ratio/);
  assert.match(source, /this\.emitViewport\(false\)/);
});

test("double tap zooms around the tapped temporal coordinate", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.match(source, /DOUBLE_TAP_ZOOM_FACTOR\s*=\s*0\.5/);
  assert.match(source, /TOUCH_DOUBLE_TAP_MS\s*=\s*320/);
  assert.match(source, /TOUCH_DOUBLE_TAP_DISTANCE_PX\s*=\s*28/);
  assert.match(source, /const registerTouchTap/);
  assert.match(source, /nextSpan = Math\.max\(MIN_SPAN_MS, span \* DOUBLE_TAP_ZOOM_FACTOR\)/);
  assert.match(source, /start: anchor - nextSpan \* ratio/);
});

test("pinch can hand off continuously to one-finger pan", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.match(source, /const remaining = Array\.from\(this\.touchPointers\.values\(\)\)\[0\]/);
  assert.match(source, /beginSurfaceDrag\(remaining\.pointerId, remaining\)/);
  assert.match(source, /releasePointerCapture\(event\.pointerId\)/);
});

test("interrupted touch gestures clear capture state and commit the retained epoch", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.match(source, /const abortSurfaceGesture = \(\): void =>/);
  assert.match(source, /this\.touchPointers\.clear\(\)/);
  assert.match(source, /this\.pinch = null/);
  assert.match(source, /window\.addEventListener\("blur", abortSurfaceGesture\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /window\.addEventListener\("orientationchange", abortSurfaceGesture\)/);
  assert.match(source, /visualViewport\?\.addEventListener\("resize"/);
  assert.match(source, /this\.commitInteraction\(\)/);
});
