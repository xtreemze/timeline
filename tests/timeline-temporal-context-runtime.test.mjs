import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("semantic zoom again maps whole context through local context to isolation", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /semanticZoomTargets\(\)/);
  assert.match(source, /interpolateSemanticViewport/);
  assert.match(source, /normalized <= 50/);
  assert.match(source, /targets\.all, targets\.context/);
  assert.match(source, /targets\.context, targets\.isolated/);
  assert.match(source, /semanticZoomValueForSpan/);
  assert.match(source, /aria-valuetext/);
  assert.match(source, /zoomSlider\?\.addEventListener\("input"/);
  assert.match(source, /zoomSlider\?\.addEventListener\("change"/);
});

test("temporal ticks are retained by stable calendar identity instead of rebuilt wholesale", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /tickScene = new Map<string, HTMLDivElement>\(\)/);
  assert.match(source, /accentScene = new Map<string, HTMLDivElement>\(\)/);
  assert.match(source, /tickSceneKey\(\{ unit: tick\.spec\.unit, value: tick\.value \}\)/);
  assert.match(source, /this\.tickScene\.get\(key\)/);
  assert.match(source, /this\.accentScene\.get\(key\)/);
  assert.match(source, /if \(!this\.retention\.active\)[\s\S]*this\.tickScene/);
  assert.doesNotMatch(source, /renderTemporalContext[\s\S]{0,4000}replaceChildren/);
});

test("active interaction retains the committed hierarchy while pre-materializing the incoming hierarchy", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /committedTickSpecKey/);
  assert.match(source, /committedTickSpec: SemanticTickSpec \| null/);
  assert.match(source, /incomingHierarchy =/);
  assert.match(source, /this\.retention\.active/);
  assert.match(source, /selectedKey !== committedKey/);
  assert.match(source, /materializeTickHierarchy/);
  assert.match(source, /generateTicksForSpec/);
  assert.match(source, /dataset\.incomingTickHierarchy/);
  assert.match(source, /positionTemporalNode/);
});

test("ambient calendar context uses the surviving collision-aware clustering planner", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /TimelineClustering as clustering/);
  assert.match(source, /clustering\.planTemporalAccents/);
  assert.match(source, /clustering\.compactTickLabel/);
  assert.match(source, /timeline-month-accent timeline-year-accent/);
  assert.match(source, /timeline-axis-month-label/);
  assert.match(source, /scale\.generateTicks/);
});
