import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project menu exposes an explicit empty-project start path", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(html, /id="new-empty-project"/);
  assert.match(html, />New empty project</);
  assert.match(html, /Start with an empty world and timeline stage/);
  assert.match(app, /newEmptyProject:\s*requiredElement/);
  assert.match(app, /els\.newEmptyProject\.addEventListener/);
  assert.match(app, /resetToEmptyProject\("Empty project ready\."\)/);
});

test("empty-project onboarding uses the live timeline and world instead of a wizard", async () => {
  const [app, indicator] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/authoring-context-indicator.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /projectIsAuthoringEmpty/);
  assert.match(app, /timeline:authoring-guide-dismissed:v1/);
  assert.match(app, /authoringGuideWasVisible && !empty/);
  assert.match(indicator, /Choose a time on the timeline/);
  assert.match(indicator, /right-click or long-press empty/);
  assert.doesNotMatch(indicator, /wizard/i);
});

test("authoring context indicator is driven only by committed time plus canonical context", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(
    app,
    /authoring\.setTimelineViewport\(viewport, committed\);[\s\S]*if \(committed\) syncAuthoringContextIndicator\(\)/,
  );
  assert.match(app, /authoring\.selection\?\.kind === "place"/);
  assert.match(app, /authoring\.spatialContext\.placeId/);
  assert.match(app, /story:\s*getStory\(ui\.activeStoryId\)\?\.title/);
});

test("context indicator stays viewport-bounded and touch-safe", async () => {
  const source = await readFile(
    new URL("../site/components/authoring-context-indicator.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /position:\s*fixed/);
  assert.match(source, /max-block-size:\s*min\(14rem, calc\(100dvh - 7rem\)\)/);
  assert.match(source, /pointer-events:\s*none/);
  assert.match(source, /min-block-size:\s*44px/);
  assert.match(source, /@media \(pointer: coarse\)/);
  assert.match(source, /min-block-size:\s*48px/);
});
