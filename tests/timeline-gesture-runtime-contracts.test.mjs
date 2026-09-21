import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained timeline recovers multi-pointer pinch and double-tap zoom", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /DOUBLE_TAP_ZOOM_FACTOR\s*=\s*0\.5/);
  assert.match(source, /touchPointers = new Map<number, TouchPointerState>\(\)/);
  assert.match(source, /const beginPinch = \(\): boolean =>/);
  assert.match(source, /this\.pinch\.distance \/ geometry\.distance/);
  assert.match(source, /anchorTime: this\.viewport\.start \+ span \* geometry\.ratio/);
  assert.match(source, /TOUCH_DOUBLE_TAP_MS/);
  assert.match(source, /Math\.hypot\(point\.x - previous\.x, point\.y - previous\.y\)/);
  assert.match(source, /this\.commitInteraction\(\);[\s\S]*return true/);
});

test("release inertia stays inside the retained interaction epoch until it settles", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /startInertia\(velocityPxPerMs: number, length: number\)/);
  assert.match(source, /motion\.estimatePointerVelocity/);
  assert.match(source, /motion\.decayVelocity\(velocity, elapsed\)/);
  assert.match(source, /this\.interactionVelocity = temporalDelta \/ elapsed/);
  assert.match(source, /this\.emitViewport\(false\)/);
  assert.match(source, /Math\.abs\(velocity\) >= motion\.STOP_VELOCITY_PX_PER_MS/);
  assert.match(source, /this\.commitInteraction\(\)/);
});

test("timeline gesture interruption clears state and commits retained scene", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /const abortSurfaceGesture = \(\): void =>/);
  assert.match(source, /this\.touchPointers\.clear\(\)/);
  assert.match(source, /this\.pinch = null/);
  assert.match(source, /this\.pointerDrag = null/);
  assert.match(source, /window\.addEventListener\("blur", abortSurfaceGesture\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /window\.addEventListener\("orientationchange", abortSurfaceGesture\)/);
  assert.match(source, /visualViewport\?\.addEventListener\("resize"/);
  assert.match(source, /releasePointerCapture\(event\.pointerId\)[\s\S]*this\.commitInteraction\(\)/);
});

test("continuous gesture handling uses shared motion physics without destructive scene rebuild", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ TimelineMotion as motion \} from "\.\/timeline-motion\.ts"/);
  assert.match(source, /motion\.responseForElapsed\(elapsed\)/);
  assert.doesNotMatch(source, /pointermove[\s\S]{0,1800}surface\.replaceChildren/);
});
