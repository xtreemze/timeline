import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.document = { baseURI: "https://example.test/" };
await import("../site/date-range-picker.js");
await import("../site/event-presentation.js");

const picker = globalThis.TimelineDateRangePicker;
const presentation = globalThis.TimelinePresentation;
await import("../site/presentation-layout.js");
const presentationLayout = globalThis.TimelinePresentationLayout;

test("range display condenses dates in the same month and keeps the year visible", () => {
  assert.match(picker.formatDisplay("2026-09-11", "2026-09-14", "range"), /11.*14.*2026/);
});

test("single-event display includes year", () => {
  assert.match(picker.formatDisplay("2026-09-19", "", "event"), /2026/);
});

test("media is capped at three images and unsafe protocols are removed", () => {
  const media = presentation.normalizeMedia([
    { src: "https://example.test/a.jpg", alt: "A" },
    { src: "https://example.test/b.jpg", alt: "B" },
    { src: "https://example.test/c.jpg", alt: "C" },
    { src: "https://example.test/d.jpg", alt: "D" }
  ]);
  assert.equal(media.length, 3);
  assert.equal(presentation.normalizeMedia([{ src: "javascript:alert(1)" }]).length, 0);
});

test("tags normalize icon and hue while retaining semantic labels", () => {
  const tags = presentation.normalizeTags([
    { label: "Decision", icon: "decision", hue: 385 },
    { label: "Fallback", icon: "unknown", hue: -30 }
  ]);
  assert.deepEqual(tags[0], { label: "Decision", icon: "decision", hue: 25 });
  assert.equal(tags[1].icon, "note");
  assert.equal(tags[1].hue, 330);
});

test("form and focus markup use one range input and no small popover detail", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="item-date-range"/);
  assert.match(html, /id="item-calendar-popover"[^>]*popover="auto"/);
  assert.match(html, /id="timeline-focus-view"/);
  assert.doesNotMatch(html, /id="timeline-detail"/);
});

test("tag theming exposes hue only and lets the browser choose a contrast foreground", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="item-tag-1-hue" type="range" min="0" max="359"/);
  assert.match(css, /--tag-color:\s*oklch\(78% \.115 var\(--tag-hue/);
  assert.match(css, /contrast-color\(var\(--tag-color\)\)/);
  assert.match(css, /\.event-tag[\s\S]*font-weight:/);
});

test("the custom calendar exposes keyboard-navigation code and a direct year control", async () => {
  const [source, html] = await Promise.all([
    readFile(new URL("../site/date-range-picker.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8")
  ]);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /PageUp/);
  assert.match(source, /PageDown/);
  assert.match(html, /id="item-calendar-year"/);
});

test("focused events expose three distinct grid composition variants and evidence sections", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /layoutVariant/);
  assert.match(source, /timeline-focus-evidence/);
  assert.match(source, /Previous event/);
  assert.match(source, /Next event/);
  assert.match(css, /data-layout="hero-split"/);
  assert.match(css, /data-layout="evidence-dossier"/);
  assert.match(css, /data-layout="editorial-mosaic"/);
  assert.match(css, /timeline-focus-evidence-grid/);
});

test("item editor exposes reusable evidence records including PDF uploads", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="item-evidence-details"/);
  assert.match(html, /value="article"/);
  assert.match(html, /value="pdf"/);
  assert.match(html, /value="note"/);
  assert.match(html, /accept="application\/pdf,.pdf"/);
  assert.match(html, /id="item-layout-variant"/);
});

test("full chronology renders collapsible category groups while story order remains separate", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /document\.createElement\("details"\)/);
  assert.match(source, /timeline-category-group/);
  assert.match(source, /story-order/);
  assert.match(css, /\.timeline-category-group/);
  assert.match(css, /\.timeline-category-summary/);
});

test("focused event composition does not instantiate duplicate graph or map surfaces", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(source, /orbGraphFactory|TimelineOrbGraph|timeline-focus-graph-canvas|focusGraph/);
  assert.doesNotMatch(source, /timeline-focus-place-map|focusMap/);
  assert.doesNotMatch(css, /timeline-focus-graph/);
  assert.doesNotMatch(css, /timeline-focus-place-map/);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /font-size:\s*clamp\(2\.55rem,\s*9cqi,\s*7\.25rem\)/);
  assert.match(css, /overflow-wrap:\s*break-word/);
  assert.doesNotMatch(css, /text-box:\s*trim-both cap alphabetic/);
});

test("focused layouts reclaim the former duplicate graph columns for event context", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /timeline-focus-relations[\s\S]*grid-column:\s*5\s*\/\s*-1/);
  assert.doesNotMatch(css, /timeline-focus-graph/);
  assert.match(css, /data-layout="hero-split"/);
  assert.match(css, /data-layout="evidence-dossier"/);
  assert.match(css, /data-layout="editorial-mosaic"/);
});

test("presentation stage keeps timeline and graph together and supports fullscreen", async () => {
  const [html, app, css, timelineSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(html, /id="presentation-stage"[\s\S]*id="timeline-view"[\s\S]*id="graph-lens"/);
  assert.match(html, /id="presentation-fullscreen-toggle"/);
  assert.match(app, /requestFullscreen/);
  assert.match(app, /fullscreenchange/);
  assert.match(app, /ResizeObserver/);
  assert.match(app, /data(?:set)?\.timelineOrientation|dataset\.timelineOrientation/);
  assert.match(timelineSource, /timelineorientationchange/);
  assert.match(timelineSource, /getOrientation\(\)/);
  assert.match(css, /\.presentation-stage:fullscreen/);
  assert.match(css, /data-timeline-orientation="horizontal"/);
  assert.match(css, /data-timeline-orientation="vertical"/);
  assert.doesNotMatch(css, /\.app-shell\.is-event-focused \.graph-lens\s*\{\s*display:\s*none/);
});

test("fullscreen composition preserves both axes across wide and tall displays", async () => {
  const css = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");
  assert.match(
    css,
    /presentation-stage:fullscreen\[data-timeline-orientation="horizontal"\][\s\S]*grid-template-rows/
  );
  assert.match(
    css,
    /presentation-stage:fullscreen\[data-timeline-orientation="vertical"\][\s\S]*grid-template-columns/
  );
  assert.match(
    css,
    /data-stage-shape="tall"\]\[data-timeline-orientation="horizontal"\]/
  );
  assert.match(
    css,
    /data-stage-shape="tall"\]\[data-timeline-orientation="vertical"\]/
  );
  assert.match(css, /presentation-stage:fullscreen \.temporal-graph-canvas[\s\S]*min-height:\s*0/);
  assert.match(css, /presentation-stage:fullscreen \.timeline-focus-view[\s\S]*overflow:\s*auto/);
});

test("Escape exits fullscreen before focused-event back navigation", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /presentationIsFullscreen\(\)[\s\S]*meta\.event\?\.key === "Escape"[\s\S]*return false/);
});

test("fullscreen presentation centers chronology until focus and caps contextual surfaces at two-by-two cells", async () => {
  const [styles, timelineCss, app, timelineSource] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(styles, /block-size:\s*100dvh/);
  assert.match(styles, /safe-area-inset-top/);
  assert.match(timelineCss, /Final fullscreen composition guard/);
  assert.match(timelineCss, /grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(timelineCss, /grid-template-rows:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(timelineCss, /data-event-focused="false"[\s\S]*timeline-view[\s\S]*grid-column:\s*1\s*\/\s*-1[\s\S]*grid-row:\s*1\s*\/\s*-1/);
  assert.match(timelineCss, /data-viewport-orientation="landscape"[\s\S]*timeline-view[\s\S]*grid-column:\s*1\s*\/\s*-1[\s\S]*grid-row:\s*3\s*\/\s*-1/);
  assert.match(timelineCss, /data-viewport-orientation="landscape"[\s\S]*graph-lens:not\(\[hidden\]\)[\s\S]*grid-column:\s*1\s*\/\s*span 2[\s\S]*grid-row:\s*1\s*\/\s*span 2/);
  assert.match(timelineCss, /data-viewport-orientation="landscape"[\s\S]*presentation-map-panel:not\(\[hidden\]\)[\s\S]*grid-column:\s*3\s*\/\s*span 2[\s\S]*grid-row:\s*1\s*\/\s*span 2/);
  assert.match(timelineCss, /data-viewport-orientation="portrait"[\s\S]*timeline-view[\s\S]*grid-column:\s*3\s*\/\s*-1[\s\S]*grid-row:\s*1\s*\/\s*-1/);
  assert.match(app, /dataset\.viewportOrientation/);
  assert.match(app, /dataset\.eventFocused/);
  assert.match(timelineSource, /document\.startViewTransition\(applyFocus\)/);
  assert.match(timelineSource, /document\.startViewTransition\(clearFocus\)/);
  assert.match(timelineCss, /view-transition-name:\s*timeline-primary-surface/);
});

test("fullscreen stage classification matches target phone and tablet viewports", () => {
  const portraitViewports = [
    [360, 800],
    [390, 844],
    [430, 932]
  ];
  const landscapeViewports = [
    [667, 375],
    [844, 390],
    [932, 430]
  ];

  for (const [width, height] of portraitViewports) {
    assert.equal(presentationLayout.physicalOrientation(width, height), "portrait");
    assert.equal(
      presentationLayout.classifyStageShape(width, height, { fullscreen: true }),
      "tall"
    );
  }

  for (const [width, height] of landscapeViewports) {
    assert.equal(presentationLayout.physicalOrientation(width, height), "landscape");
    assert.equal(
      presentationLayout.classifyStageShape(width, height, { fullscreen: true }),
      "wide"
    );
  }
});

test("presentation stage shape is independent from selected timeline axis orientation", () => {
  const portraitShape = presentationLayout.classifyStageShape(390, 844, { fullscreen: true });
  const landscapeShape = presentationLayout.classifyStageShape(844, 390, { fullscreen: true });

  assert.equal(portraitShape, "tall");
  assert.equal(landscapeShape, "wide");
  assert.notEqual(portraitShape, "portrait");
  assert.notEqual(landscapeShape, "landscape");
});

test("presentation owns exactly one contextual graph and one contextual map surface", async () => {
  const [html, css, app, view, graphView] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8")
  ]);

  assert.equal((html.match(/class="temporal-graph-canvas"/g) || []).length, 1);
  assert.equal((html.match(/id="presentation-map"/g) || []).length, 1);
  assert.doesNotMatch(view, /timeline-focus-graph-canvas|timeline-focus-place-map/);
  assert.match(app, /syncContextualPresentationPanels/);
  assert.match(app, /data(?:set)?\.hasContextGraph|dataset\.hasContextGraph/);
  assert.match(app, /data(?:set)?\.hasContextMap|dataset\.hasContextMap/);
  assert.match(graphView, /graphcontextchange/);
  assert.match(graphView, /hasContext\(\)/);
  assert.match(css, /data-has-context-graph="true"/);
  assert.match(css, /data-has-context-map="true"/);
});

test("timeline range bars are identifiable and labels share event color semantics", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /createElement\("button", "timeline-range-segment"\)/);
  assert.match(source, /range\.dataset\.tooltip/);
  assert.match(source, /this\.visiblePositionFor\(item/);
  assert.match(css, /\.timeline-range-segment::after/);
  assert.match(css, /\.timeline-event-copy strong[\s\S]*color:\s*var\(--event-color\)/);
  assert.match(css, /\.timeline-event-dot[\s\S]*width:\s*1\.4rem/);
});


test("body owns the canonical 12-column grid and fullscreen context stays subordinate", async () => {
  const [styles, timelineCss, html] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8")
  ]);

  assert.match(styles, /body\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /main\s*\{[\s\S]*grid-template-columns:\s*subgrid/);
  assert.match(styles, /\.app-shell\s*\{[\s\S]*grid-template-columns:\s*subgrid/);
  assert.match(styles, /\.timeline-panel\s*\{[\s\S]*grid-template-columns:\s*subgrid/);
  assert.match(styles, /\.presentation-stage\s*\{[\s\S]*grid-template-columns:\s*subgrid/);
  assert.match(timelineCss, /graph-lens:not\(\[hidden\]\)[\s\S]*grid-column:\s*1\s*\/\s*span 2[\s\S]*grid-row:\s*1\s*\/\s*span 2/);
  assert.match(timelineCss, /presentation-map-panel:not\(\[hidden\]\)[\s\S]*grid-column:\s*3\s*\/\s*span 2[\s\S]*grid-row:\s*1\s*\/\s*span 2/);
  assert.match(timelineCss, /data-viewport-orientation="portrait"[\s\S]*presentation-map-panel:not\(\[hidden\]\)[\s\S]*grid-column:\s*1\s*\/\s*span 2[\s\S]*grid-row:\s*3\s*\/\s*span 2/);
  assert.match(html, /id="presentation-stage"[\s\S]*id="timeline-view"[\s\S]*id="graph-lens"[\s\S]*id="presentation-map-panel"/);
});

test("presentation map renders semantic GeoJSON features instead of an empty point preview", async () => {
  const [mapSource, app, styles] = await Promise.all([
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(mapSource, /FeatureCollection/);
  assert.match(mapSource, /mapFeatures/);
  assert.match(mapSource, /L\.geoJSON/);
  assert.match(mapSource, /L\.divIcon/);
  assert.match(mapSource, /semanticMarkerIcon/);
  assert.match(mapSource, /fitBounds/);
  assert.match(mapSource, /L\.circle/);
  assert.match(app, /iconName/);
  assert.match(app, /hasRenderableGeometry/);
  assert.match(styles, /\.timeline-map-marker-shell/);
});

test("fullscreen presentation removes graph authoring chrome and raw properties", async () => {
  const styles = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /#presentation-stage:fullscreen \.graph-lens > summary,[\s\S]*\.temporal-graph-toolbar,[\s\S]*\.temporal-graph-detail[\s\S]*display:\s*none/
  );
});
