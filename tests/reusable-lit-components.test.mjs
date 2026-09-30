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
  assert.match(source, /scrollIntoView\(\{ block: "center", inline: "nearest" \}\)/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === " "/);
  assert.match(source, /onWheel/);
  assert.doesNotMatch(source, /src\/application|occurrence-composer-model|timeline-view|world-graph/);
});

test("reusable retained timeline owns Lit lifecycle without owning scene rendering", async () => {
  const source = await readFile(
    new URL("../site/components/reusable/retained-timeline.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /abstract class RetainedTimelineElement/);
  assert.match(source, /extends LitElement/);
  assert.match(source, /createRenderRoot\(\): HTMLElement[\s\S]*return this/);
  assert.match(source, /render\(\)[\s\S]*return noChange/);
  assert.match(source, /protected abstract createTimelineController/);
  assert.match(source, /ensureTimelineController/);
  assert.doesNotMatch(source, /timeline-view\.ts|TimelineViewController|Luum/);
});

test("component lab exercises reusable composer and retained timeline", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../site/component-lab.html", import.meta.url), "utf8"),
    readFile(new URL("../site/component-lab.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<component-lab-composer/);
  assert.match(html, /<component-lab-timeline/);
  assert.match(script, /extends ReusableComposerElement/);
  assert.match(script, /extends RetainedTimelineElement/);
  assert.match(script, /selectOnSpace = true/);
  assert.match(script, /wheelSelection = true/);
});
