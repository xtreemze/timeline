import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained event card owns its expanded detail host", async () => {
  const card = await readFile(
    new URL("../site/components/timeline-event-card.ts", import.meta.url),
    "utf8",
  );

  assert.match(card, /class LuumEventCardElement extends LitElement/);
  assert.match(card, /get detailHost\(\): HTMLElement \| null/);
  assert.match(card, /setExpanded\(expanded: boolean\)/);
  assert.match(card, /timeline-event-detail/);
  assert.match(card, /data-occurrence-detail/);
  assert.match(card, /aria-controls=\$\{detailId\}/);
  assert.doesNotMatch(card, /aria-controls="timeline-focus-view"/);
});

test("timeline promotes the retained card instead of rendering a sibling focus surface", async () => {
  const view = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(view, /createOccurrenceInteractionSession/);
  assert.match(view, /resolveOccurrencePresentation/);
  assert.match(view, /syncFocusedPresentation\(\)/);
  assert.match(view, /record\.node\.setExpanded\(expanded\)/);
  assert.match(view, /record\.node\.detailHost/);
  assert.match(view, /renderFocus\(item, detailHost\)/);
  assert.match(view, /focusView\.hidden = true/);

  const focusItemStart = view.indexOf("  focusItem(id: string");
  const focusItemEnd = view.indexOf("\n  focus(itemId:", focusItemStart);
  const focusItemBody = view.slice(focusItemStart, focusItemEnd);
  assert.doesNotMatch(focusItemBody, /focusView\.hidden = false/);
  assert.doesNotMatch(focusItemBody, /dataset\.presentationSurface = "sidebar"/);
});

test("focused card promotion is derived from committed logical viewport with hysteresis", async () => {
  const view = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(view, /logicalOccurrenceIds\(/);
  assert.match(view, /demotionOccurrenceIds\(/);
  assert.match(view, /resolveOccurrencePresentation\(this\.interactionSession/);
  assert.match(view, /explicitDetailOpen: this\.explicitDetailOpen/);
  assert.match(view, /this\.retention\.active/);
});

test("card focus does not engage the old workspace-resizing focus layout", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /presentationSurface === "card"/);
  assert.match(app, /classList\.toggle\("is-event-card-focused"/);
  assert.match(
    app,
    /classList\.toggle\("is-event-focused", focused && !cardFocused\)/,
  );
  assert.match(app, /recenterGraph: !cardFocused/);
});

test("expanded detail is absolutely positioned from the retained anchor without changing card transform", async () => {
  const [view, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(view, /syncExpandedDetailGeometry\(record/);
  assert.match(view, /detailHost\.style\.left/);
  assert.match(view, /detailHost\.style\.top/);
  assert.match(css, /\.timeline-event-detail\s*\{/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /pointer-events:\s*auto/);

  const positionStart = view.indexOf("  positionRecord(record: SceneRecord");
  const positionEnd = view.indexOf("\n  animateEntry(", positionStart);
  const positionBody = view.slice(positionStart, positionEnd);
  assert.doesNotMatch(positionBody, /timeline-event-detail/);
});
