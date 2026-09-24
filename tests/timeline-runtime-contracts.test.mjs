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
  assert.doesNotMatch(
    view,
    /stepFocusMedia\(delta: number\)[\s\S]{0,600}this\.render\(\)/,
  );
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
  assert.match(view, /connectorWeight === "fine" \? 1 : item\.connectorWeight === "strong" \? 4 : 2/);
  assert.match(css, /\.timeline-event-art-image/);
  assert.match(css, /\.timeline-event-icon-badge/);
});


test("timeline uses a bounded Lit custom-element owner without reactive scene rendering", async () => {
  const [html, view, component] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/luum-timeline.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<luum-timeline id="timeline-view"/);
  assert.match(html, /<\/luum-timeline>/);
  assert.doesNotMatch(view, /from "lit"/);
  assert.match(view, /export class TimelineViewController/);
  assert.match(view, /isTimelineControllerHost/);
  assert.match(view, /root\.ensureController\(\)/);

  assert.match(component, /import \{ LitElement, noChange \} from "lit"/);
  assert.match(component, /class LuumTimelineElement extends LitElement/);
  assert.match(component, /createRenderRoot\(\): HTMLElement[\s\S]*return this/);
  assert.match(component, /render\(\)[\s\S]*return noChange/);
  assert.match(component, /ensureController\(\): TimelineViewController/);
  assert.match(component, /customElements\.define\("luum-timeline", LuumTimelineElement\)/);
  assert.doesNotMatch(component, /document\.createElement\(/);
});
