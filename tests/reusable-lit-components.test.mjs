import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reusable composer stays domain-neutral and exposes interaction contracts", async () => {
  const source = await readFile(
    new URL("../site/components/reusable/composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /class ReusableComposerElement extends LitElement/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /composer-selection-change/);
  assert.match(source, /composer-commit/);
  assert.match(source, /scrollIntoView\(\{\s*block:\s*"center",\s*inline:\s*"nearest"\s*\}\)/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === " "/);
  assert.match(source, /onWheel/);
  assert.match(source, /event\.isComposing/);
  assert.match(source, /composerInstanceSequence/);
  assert.match(source, /aria-multiselectable/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /event\.key === "End"/);
  assert.doesNotMatch(source, /src\/application|occurrence-composer-model|timeline-view|world-graph/);
});

test("reusable retained timeline owns lifecycle through the generic imperative surface host", async () => {
  const [surface, timeline] = await Promise.all([
    readFile(new URL("../site/components/reusable/imperative-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/reusable/retained-timeline.ts", import.meta.url), "utf8"),
  ]);

  assert.match(surface, /extends LitElement/);
  assert.match(surface, /createRenderRoot\(\): HTMLElement[\s\S]*return this/);
  assert.match(surface, /render\(\)[\s\S]*return noChange/);
  assert.match(timeline, /abstract class RetainedTimelineElement/);
  assert.match(timeline, /extends ImperativeSurfaceElement/);
  assert.match(timeline, /protected abstract createTimelineController/);
  assert.match(timeline, /ensureTimelineController/);
  assert.match(timeline, /disconnectedCallback/);
  assert.match(timeline, /releaseTimelineController/);
  assert.match(timeline, /connectionGeneration/);
  assert.doesNotMatch(timeline, /timeline-view\.ts|TimelineViewController|Luum/);
});

test("component lab exercises reusable composer and retained timeline", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../site/component-lab.html", import.meta.url), "utf8"),
    readFile(new URL("../site/component-lab.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<component-lab-composer/);
  assert.match(html, /<component-lab-timeline/);
  assert.match(html, /<component-lab-hue/);
  assert.match(html, /<component-lab-media-viewer/);
  assert.match(script, /extends ReusableComposerElement/);
  assert.match(script, /extends RetainedTimelineElement/);
  assert.match(script, /selectOnSpace = true/);
  assert.match(script, /wheelSelection = true/);
});

test("imperative surface host stays renderer-neutral and is reused by timeline", async () => {
  const [surface, timeline] = await Promise.all([
    readFile(new URL("../site/components/reusable/imperative-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/reusable/retained-timeline.ts", import.meta.url), "utf8"),
  ]);
  assert.match(surface, /class ImperativeSurfaceElement/);
  assert.match(surface, /adoptSurfaceController/);
  assert.match(surface, /releaseSurfaceController/);
  assert.doesNotMatch(surface, /TimelineViewController|deck\.gl|Luum/);
  assert.match(timeline, /extends ImperativeSurfaceElement/);
});

test("semantic hue control owns hue only and emits portable events", async () => {
  const source = await readFile(new URL("../site/components/reusable/semantic-hue.ts", import.meta.url), "utf8");
  assert.match(source, /class SemanticHueElement extends LitElement/);
  assert.match(source, /semantic-hue-input/);
  assert.match(source, /semantic-hue-change/);
  assert.match(source, /type="range"/);
  assert.match(source, /type="number"/);
  assert.doesNotMatch(source, /semanticColorCss|canonicalSemanticHueColor|src\/presentation/);
});

test("media viewer owns image navigation without occurrence or timeline dependencies", async () => {
  const source = await readFile(new URL("../site/components/reusable/media-viewer.ts", import.meta.url), "utf8");
  assert.match(source, /class ReusableMediaViewerElement extends LitElement/);
  assert.match(source, /@pointerdown/);
  assert.match(source, /@wheel/);
  assert.match(source, /@dblclick/);
  assert.match(source, /media-viewer-zoom/);
  assert.match(source, /\[0\.5, 0\.75, 1, 1\.25, 1\.5, 2, 3\]/);
  assert.doesNotMatch(source, /from "\.\.\/|occurrence-media|timeline-view|world-graph|src\/application/);
});
