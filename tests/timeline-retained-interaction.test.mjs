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

test("interaction positioning performs no per-card layout read and freezes label topology", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  const positionStart = source.indexOf("  positionRecord(");
  const positionEnd = source.indexOf("  animateEntry(", positionStart);
  const positionBody = source.slice(positionStart, positionEnd);
  assert.doesNotMatch(positionBody, /getBoundingClientRect/);
  assert.match(positionBody, /crossLength/);
  assert.match(positionBody, /labelBeforeForPosition/);
  assert.match(positionBody, /record\.labelBefore = labelBefore/);

  const helperStart = source.indexOf("function labelBeforeForPosition(");
  const helperEnd = source.indexOf("function itemOverlapsViewport(", helperStart);
  const helperBody = source.slice(helperStart, helperEnd);
  assert.match(helperBody, /previous !== null && interacting/);
  assert.match(helperBody, /LABEL_BEFORE_ENTER_RATIO/);
  assert.match(helperBody, /LABEL_BEFORE_EXIT_RATIO/);

  const clusterStart = source.indexOf("  positionCommittedClusters(");
  const clusterEnd = source.indexOf("  activateCommittedCluster(", clusterStart);
  const clusterBody = source.slice(clusterStart, clusterEnd);
  assert.match(clusterBody, /labelBeforeForPosition/);
  assert.match(clusterBody, /record\.labelBefore = labelBefore/);
});

test("continuous input publishes viewport state only from the rendered animation frame", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /scheduleInteractionRender\(\): void/);
  assert.match(source, /this\.pendingViewportEmit = true;[\s\S]{0,100}this\.scheduleRender\(\)/);
  assert.match(
    source,
    /this\.render\(\);[\s\S]{0,220}this\.pendingViewportEmit = false;[\s\S]{0,100}this\.emitViewport\(false\)/,
  );

  const pointerMoveStart = source.indexOf('this.surface.addEventListener("pointermove"');
  const pointerMoveEnd = source.indexOf("const finishPointer", pointerMoveStart);
  const pointerMoveBody = source.slice(pointerMoveStart, pointerMoveEnd);
  assert.doesNotMatch(pointerMoveBody, /this\.emitViewport\(false\)/);
  assert.match(pointerMoveBody, /scheduleInteractionRender\(\)/);

  const wheelStart = source.indexOf('this.surface.addEventListener(\n      "wheel"');
  const wheelEnd = source.indexOf("const releasePointerCapture", wheelStart);
  const wheelBody = source.slice(wheelStart, wheelEnd);
  assert.doesNotMatch(wheelBody, /this\.emitViewport\(false\)/);
  assert.match(wheelBody, /scheduleInteractionRender\(\)/);
});

test("interaction surface geometry is cached for the epoch and invalidated at commit", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /interactionSurfaceRect: DOMRect \| null = null/);
  assert.match(
    source,
    /interactionRect\(\): DOMRect \{[\s\S]{0,240}if \(!this\.interactionSurfaceRect\)[\s\S]{0,180}this\.interactionSurfaceRect = this\.surface\.getBoundingClientRect\(\)/,
  );
  assert.match(
    source,
    /beginInteraction\(\): void \{[\s\S]{0,220}this\.interactionSurfaceRect = this\.surface\.getBoundingClientRect\(\)/,
  );
  assert.match(
    source,
    /commitInteraction\(\): void \{[\s\S]{0,260}this\.interactionSurfaceRect = null/,
  );
  assert.match(
    source,
    /refreshLayout\(\): void \{[\s\S]{0,120}this\.interactionSurfaceRect = null/,
  );
});
