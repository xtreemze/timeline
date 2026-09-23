import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained occurrences synchronize hover focus and selection without rerendering", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /bindRecordInteractionTarget\(record, terminal\)/);
  assert.match(source, /if \(range\) this\.bindRecordInteractionTarget\(record, range\)/);
  assert.match(source, /setRecordInteractionState\(record, "hovered", true\)/);
  assert.match(source, /setRecordInteractionState\(record, "focused", true\)/);
  assert.match(source, /clearHoverStates\(\);[\s\S]*createRenderWindow/);
  assert.match(source, /range\?\.classList\.toggle\("is-selected", selected\)/);
  assert.doesNotMatch(source, /pointerenter[\s\S]{0,240}render\(\)/);

  assert.match(
    css,
    /\.timeline-event:is\(\.is-hovered, \.is-focused, \.is-selected\) \.timeline-event-terminal/,
  );
  assert.match(css, /\.timeline-range-segment:is\(\.is-hovered, \.is-focused, \.is-selected\)/);
  assert.match(css, /data-scene-state="interacting"[\s\S]*\.timeline-event\.is-hovered/);
});

test("connector and point emphasis follows the retained occurrence state", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.timeline-event:is\(\.is-hovered, \.is-focused, \.is-selected\) \.timeline-event-dot[\s\S]*transform:\s*scale\(1\.08\)/,
  );
  assert.match(
    css,
    /\.timeline-event:is\(\.is-hovered, \.is-focused, \.is-selected\) \.timeline-event-connector/,
  );
  assert.doesNotMatch(css, /transition:\s*all/);
});
