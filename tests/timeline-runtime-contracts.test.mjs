import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Lit timeline boundary exposes every focus command used by app orchestration", async () => {
  const [app, view, component] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/luum-timeline.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /timelineView\?\.focusAdjacent\(/);
  assert.match(app, /timelineView\?\.stepFocusMedia\(/);
  assert.match(view, /focusAdjacent\(delta: number/);
  assert.match(view, /stepFocusMedia\(delta: number\)/);
  assert.match(component, /focusAdjacent\(/);
  assert.match(component, /stepFocusMedia\(/);
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
  const [view, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(view, /timeline-event-art-image/);
  assert.match(view, /timeline-event-icon-badge/);
  assert.match(view, /primaryTag[\s\S]*iconName/);
  assert.match(view, /visual\.dataset\.signature/);
  assert.match(view, /visual\.replaceChildren\(\)/);
  assert.match(view, /node\.dataset\.connectorWeight/);
  assert.match(
    view,
    /connectorWeight === "fine" \? 1 : item\.connectorWeight === "strong" \? 4 : 2/,
  );
  assert.match(css, /\.timeline-event-art-image/);
  assert.match(css, /\.timeline-event-icon-badge/);
});


test("timeline is a Lit lifecycle boundary without Lit-owned retained-scene rendering", async () => {
  const [app, view, component, html, css] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/luum-timeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /ReactiveElement/);
  assert.match(component, /createRenderRoot\(\)[\s\S]*return this/);
  assert.match(component, /TimelineView\.create\(this\)/);
  assert.match(component, /ResizeObserver[\s\S]*refreshLayout/);
  assert.match(component, /disconnectedCallback\(\)[\s\S]*controller\?\.destroy\(\)/);
  assert.match(view, /lifecycleAbortController = new AbortController\(\)/);
  assert.match(view, /destroy\(\): void[\s\S]*lifecycleAbortController\.abort\(\)/);
  assert.doesNotMatch(component, /\bhtml\s*`/);
  assert.doesNotMatch(component, /document\.createElement/);
  assert.match(view, /new WeakMap<HTMLElement, TimelineViewController>/);
  assert.match(view, /const existing = timelineControllers\.get\(root\)/);
  assert.match(app, /import \{ LuumTimelineElement \} from "\.\/components\/luum-timeline\.ts"/);
  assert.match(app, /const timelineView = els\.timelineViewRoot/);
  assert.match(html, /<luum-timeline id="timeline-view"/);
  assert.match(html, /<\/luum-timeline>/);
  assert.match(css, /\.timeline-view\s*\{[\s\S]*display:\s*block/);
});
