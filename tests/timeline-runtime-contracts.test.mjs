import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("timeline controller implements every focus command used by app orchestration", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /timelineView\?\.focusAdjacent\(/);
  assert.match(app, /timelineView\?\.stepFocusMedia\(/);
  assert.match(view, /focusAdjacent\(delta: number/);
  assert.match(view, /stepFocusMedia\(delta: number\)/);
});

test("focused ranges recover duration and retained media controls", async () => {
  const [view, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(view, /formatElapsedDuration/);
  assert.match(view, /Duration \$\{duration\}/);
  assert.match(view, /timeline-focus-hero-image/);
  assert.match(view, /timeline-focus-slideshow-controls/);
  assert.match(view, /timeline-focus-slide-dot/);
  assert.match(view, /aria-current/);
  assert.match(css, /\.timeline-focus-hero-image/);
  assert.match(css, /\.timeline-focus-slide-dot/);
});

test("media stepping updates only focused presentation state", async () => {
  const view = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    view,
    /stepFocusMedia\(delta: number\)[\s\S]*this\.focusMediaIndex[\s\S]*this\.renderFocus\(item\)/,
  );
  assert.doesNotMatch(view, /stepFocusMedia\(delta: number\)[\s\S]{0,600}this\.render\(\)/);
});

test("retained event terminals preserve semantic media, tag icons, and connector weight", async () => {
  const [view, card, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/timeline-event-card.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(card, /timeline-event-art-image/);
  assert.match(card, /timeline-event-icon-badge/);
  assert.match(card, /primaryTag[\s\S]*iconName/);
  assert.match(card, /class LuumEventCardElement extends LitElement/);
  assert.match(card, /setSemanticItem\(item: TimelineEventCardItem\)/);
  assert.match(card, /data-timeline-icon/);
  assert.match(card, /this\.dataset\.connectorWeight/);
  assert.match(
    view,
    /connectorWeight === "fine" \? 1 : item\.connectorWeight === "strong" \? 4 : 2/,
  );
  assert.match(css, /\.timeline-event-art-image/);
  assert.match(css, /\.timeline-event-icon-badge/);
});

test("timeline uses a Lit custom-element ownership boundary without reactive scene rendering", async () => {
  const [html, view] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/components/timeline-element.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<luum-timeline id="timeline-view"/);
  assert.match(html, /<\/luum-timeline>/);
  assert.match(view, /import \{ LitElement, noChange \} from "lit"/);
  assert.match(view, /class LuumTimelineElement extends LitElement/);
  assert.match(view, /createRenderRoot\(\): HTMLElement[\s\S]*return this/);
  assert.match(view, /render\(\)[\s\S]*return noChange/);
  assert.match(view, /ensureTimelineController\(\): TimelineViewController/);
  assert.match(view, /customElements\.define\("luum-timeline", LuumTimelineElement\)/);
});

test("retained event cards use Lit for semantic content but not interaction geometry", async () => {
  const [view, card] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/timeline-event-card.ts", import.meta.url), "utf8"),
  ]);

  assert.match(card, /customElements\.define\("luum-event-card", LuumEventCardElement\)/);
  assert.match(view, /new LuumEventCardElement\(\)/);
  assert.match(view, /contentRevision: ""/);
  assert.match(view, /this\.updateRecordContent\(record\)/);
  assert.match(
    view,
    /if \(record\.contentRevision !== revision\)[\s\S]*node\.setSemanticItem\(item\)/,
  );
  const positionStart = view.indexOf("  positionRecord(record: SceneRecord");
  const positionEnd = view.indexOf("\n  animateEntry(", positionStart);
  const positionBody = view.slice(positionStart, positionEnd);
  assert.match(positionBody, /node\.style\.transform/);
  assert.doesNotMatch(positionBody, /requestUpdate|setSemanticItem/);
});

test("world graph mounts behind a Lit lifecycle boundary", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/components/world-surface-element.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<luum-world-surface id="temporal-graph-view"/);
  assert.match(html, /<\/luum-world-surface>/);
  assert.match(source, /class LuumWorldSurfaceElement extends LitElement/);
  assert.match(source, /render\(\)[\s\S]*return noChange/);
  assert.match(source, /adoptView\(/);
  assert.match(source, /disconnectedCallback\(\)[\s\S]*destroy\(\)/);
});

test("Lit event card has no ambient Timeline globals", async () => {
  const card = await readFile(
    new URL("../site/components/timeline-event-card.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(card, /globalThis\.Timeline/);
  assert.match(card, /import \{ createIcon \} from "\.\.\/event-presentation\.ts"/);
});
