import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { TimelineDateRangePicker: picker } = await import("../site/date-range-picker.ts");

globalThis.document = { baseURI: "https://example.test/" };
await import("../site/event-presentation-shim.ts");

const presentation = globalThis.TimelinePresentation;
await import("../site/presentation-layout-shim.ts");
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
    { src: "https://example.test/d.jpg", alt: "D" },
  ]);
  assert.equal(media.length, 3);
  assert.equal(presentation.normalizeMedia([{ src: "javascript:alert(1)" }]).length, 0);
});

test("tags normalize icon and hue while retaining semantic labels", () => {
  const tags = presentation.normalizeTags([
    { label: "Decision", icon: "decision", hue: 385 },
    { label: "Fallback", icon: "unknown", hue: -30 },
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

test("the custom calendar keeps keyboard navigation while Lit owns declarative cell rendering", async () => {
  const [source, html] = await Promise.all([
    readFile(new URL("../site/date-range-picker.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /PageUp/);
  assert.match(source, /PageDown/);
  assert.match(source, /from "lit"/);
  assert.match(source, /lit\/directives\/repeat\.js/);
  assert.match(source, /renderLit\(/);
  assert.doesNotMatch(source, /document\.createElement\("button"\)/);
  assert.match(html, /id="item-calendar-year"/);
});

test("focused events expose three distinct grid composition variants and evidence sections", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
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

test("item editor exposes reusable PDF/image evidence with extraction controls", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="item-evidence-details"/);
  assert.match(html, /value="article"/);
  assert.match(html, /value="pdf"/);
  assert.match(html, /value="image"/);
  assert.match(html, /value="note"/);
  assert.match(html, /accept="application\/pdf,.pdf,image\/png,image\/jpeg,image\/webp,image\/gif"/);
  assert.match(html, /class="button secondary evidence-extract-text"/);
  assert.match(html, /class="evidence-extraction-preview field-wide"/);
  assert.match(html, /evidence-extraction\.bundle\.js/);
  assert.match(html, /id="item-layout-variant"/);
});

test("extracted evidence text feeds inference with page/image source references", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(app, /evidence-pdf-text/);
  assert.match(app, /evidence-ocr/);
  assert.match(app, /evidence:\$\{id\}:\$\{locator\}/);
  assert.match(app, /ensureEvidenceExtractionForInference/);
});

test("full chronology renders collapsible category groups while story order remains separate", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /document\.createElement\("details"\)/);
  assert.match(source, /timeline-category-group/);
  assert.match(source, /story-order/);
  assert.match(css, /\.timeline-category-group/);
  assert.match(css, /\.timeline-category-summary/);
});

test("focused event composition does not instantiate duplicate graph or map surfaces", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(source, /orbGraphFactory|TimelineOrbGraph|timeline-focus-graph-canvas/);
  assert.doesNotMatch(source, /timeline-focus-place-map/);
  assert.doesNotMatch(css, /\.timeline-focus-graph(?:\s|,|\{)/);
  assert.doesNotMatch(css, /timeline-focus-place-map/);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /font-size:\s*clamp\(3\.2rem,\s*11\.5cqi,\s*9rem\)/);
  assert.doesNotMatch(
    source,
    /timeline-focus-temporal|timeline-focus-definition-list|"Chronology"/,
  );
  assert.match(css, /overflow-wrap:\s*break-word/);
  assert.doesNotMatch(css, /text-box:\s*trim-both cap alphabetic/);
});

test("focused layouts reclaim the former duplicate graph columns for event context", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /timeline-focus-relations[\s\S]*grid-column:\s*5\s*\/\s*-1/);
  assert.doesNotMatch(css, /\.timeline-focus-graph(?:\s|,|\{)/);
  assert.match(css, /data-layout="hero-split"/);
  assert.match(css, /data-layout="evidence-dossier"/);
  assert.match(css, /data-layout="editorial-mosaic"/);
});

test("presentation stage keeps timeline and graph together and supports fullscreen", async () => {
  const [html, app, css, timelineSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
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
    /presentation-stage:fullscreen\[data-timeline-orientation="horizontal"\][\s\S]*grid-template-rows/,
  );
  assert.match(
    css,
    /presentation-stage:fullscreen\[data-timeline-orientation="vertical"\][\s\S]*grid-template-columns/,
  );
  assert.match(css, /data-stage-shape="tall"\]\[data-timeline-orientation="horizontal"\]/);
  assert.match(css, /data-stage-shape="tall"\]\[data-timeline-orientation="vertical"\]/);
  assert.match(css, /presentation-stage:fullscreen \.temporal-graph-canvas[\s\S]*min-height:\s*0/);
  assert.match(css, /presentation-stage:fullscreen \.timeline-focus-view[\s\S]*overflow:\s*auto/);
});

test("Escape exits fullscreen before focused-event back navigation", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /presentationIsFullscreen\(\)[\s\S]*meta\.event\?\.key === "Escape"[\s\S]*return false/,
  );
});

test("fullscreen stage classification matches target phone and tablet viewports", () => {
  const portraitViewports = [
    [360, 800],
    [390, 844],
    [430, 932],
  ];
  const landscapeViewports = [
    [667, 375],
    [844, 390],
    [932, 430],
  ];

  for (const [width, height] of portraitViewports) {
    assert.equal(presentationLayout.physicalOrientation(width, height), "portrait");
    assert.equal(
      presentationLayout.classifyStageShape(width, height, { fullscreen: true }),
      "tall",
    );
  }

  for (const [width, height] of landscapeViewports) {
    assert.equal(presentationLayout.physicalOrientation(width, height), "landscape");
    assert.equal(
      presentationLayout.classifyStageShape(width, height, { fullscreen: true }),
      "wide",
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

test("presentation map renders semantic GeoJSON features instead of an empty point preview", async () => {
  const [mapSource, app, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(mapSource, /FeatureCollection/);
  assert.match(mapSource, /mapFeatures/);
  assert.match(mapSource, /L\.geoJSON/);
  assert.match(mapSource, /L\.divIcon/);
  assert.match(mapSource, /semanticMarkerIcon/);
  assert.match(mapSource, /fitBounds/);
  assert.match(mapSource, /L\.circle/);
  assert.match(app, /placeForItem\(item\.id\)/);
  assert.match(app, /iconName:\s*place\.icon/);
  assert.match(app, /markerShape:\s*place\.markerShape/);
  assert.match(app, /hasRenderableGeometry/);
  assert.match(styles, /\.timeline-map-marker-shell/);
});

test("graph exploration is chrome-free and selection-only", async () => {
  const [html, styles, graphView] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8"),
  ]);
  const graphMarkup = html.slice(
    html.indexOf('id="graph-lens"'),
    html.indexOf('id="presentation-map-panel"'),
  );
  assert.doesNotMatch(
    graphMarkup,
    /<summary|temporal-graph-toolbar|data-graph-detail|graph-reset-view/,
  );
  assert.match(styles, /The persistent relation graph is a stage canvas/);
  assert.match(
    styles,
    /\.graph-lens > summary,[\s\S]*\.temporal-graph-toolbar,[\s\S]*\.temporal-graph-detail[\s\S]*display:\s*none/,
  );
  assert.match(graphView, /graphselectionchange/);
  assert.doesNotMatch(graphView, /renderDetail|temporal-graph-detail-list/);
});

test("fullscreen restores the focused event popover after the browser changes top-layer state", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);
  assert.match(view, /ensureFocusPopover\(\)/);
  assert.match(app, /active && timelineView\?\.hasFocusedItem\?\.\(\)[\s\S]*ensureFocusPopover/);
});

test("utility surfaces remain coordinated while the relation graph stays persistent", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(app, /closeLargeUtilitySurfaces\(except = ""\)[\s\S]*closeViewControls\(\)/);
  assert.match(
    app,
    /setBrowserSurfaceOpen[\s\S]*closeLargeUtilitySurfaces\("browser"\)[\s\S]*closeFocusedEventForUtility/,
  );
  assert.match(
    app,
    /viewControlsToggle\?\.addEventListener\("click",[\s\S]*closeLargeUtilitySurfaces\("view"\)[\s\S]*closeFocusedEventForUtility/,
  );
  assert.match(app, /timelinefocuschange[\s\S]*closeLargeUtilitySurfaces\("focus"\)/);
  assert.match(app, /els\.graphLens\.hidden = false/);
  assert.doesNotMatch(app, /setGraphSurfaceOpen|ui\.graphOpen/);
});

test("focused hero keeps image captions and provenance out of the visual overlay", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /timeline-focus-media-caption|isIllustrationDisclaimer|mediaCaption\.startsWith/,
  );
});

test("fullscreen preserves the common footer app bar inside the fullscreen subtree", async () => {
  const [app, styles, timelineCss] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /appToolDock:\s*requiredElement<HTMLElement>\("\.app-tool-dock"\)/);
  assert.match(app, /timeline-tool-dock-home/);
  assert.match(app, /mountFullscreenToolDock/);
  assert.match(app, /restoreToolDock/);
  assert.match(app, /if \(active\)[\s\S]*mountFullscreenToolDock\(\)/);
  assert.doesNotMatch(app, /positionWorkspaceToolDock|workspaceToolDockResizeObserver/);
  assert.match(
    styles,
    /#presentation-stage:fullscreen \.app-tool-dock[\s\S]*inset-block-end:[\s\S]*inset-inline-start:\s*50%[\s\S]*flex-direction:\s*row/,
  );
  assert.doesNotMatch(timelineCss, /data-project-anchored|workspace-tool-dock/);
});

test("relations halo remains inside the unified popover chrome", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(
    css,
    /data-active-tab="overview"\],[\s\S]*data-active-tab="evidence"\][\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    css,
    /data-active-tab="overview"[\s\S]*timeline-focus-relations::before[\s\S]*inset:\s*0/,
  );
  assert.match(css, /data-timeline-orientation="vertical"[\s\S]*ellipse 70% 86% at 42% 50%/);
  assert.match(css, /data-timeline-orientation="horizontal"[\s\S]*ellipse 78% 68% at 50% 42%/);
  assert.match(css, /\.timeline-focus-relations::before\s*\{[\s\S]*?inset:\s*0/);
});

test("desktop popover chrome clips every content band", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(
    css,
    /data-orientation="landscape"[\s\S]*timeline-focus-view:popover-open[\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    css,
    /data-orientation="portrait"[\s\S]*timeline-focus-view:popover-open[\s\S]*overflow:\s*hidden/,
  );
  assert.match(css, /data-active-tab="overview"[\s\S]*overflow:\s*hidden/);
});

test("workspace sidebar and side sheets are named View Transition participants", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(
    styles,
    /\.app-tool-dock\s*\{[\s\S]*view-transition-name:\s*timeline-workspace-sidebar/,
  );
  assert.match(
    styles,
    /\.app-editor-sheet\s*\{[\s\S]*view-transition-name:\s*timeline-editor-sidebar/,
  );
  assert.match(
    styles,
    /\.app-browser-sheet\s*\{[\s\S]*view-transition-name:\s*timeline-browser-sidebar/,
  );
  assert.match(styles, /::view-transition-group\(timeline-workspace-sidebar\)/);
  assert.match(app, /function runApplicationViewTransition\(update\)/);
  assert.match(app, /document\.startViewTransition\(update\)/);
  assert.match(
    app,
    /function syncPresentationFullscreenState\(\)[\s\S]*runApplicationViewTransition\(\(\) => \{[\s\S]*mountFullscreenToolDock\(\)/,
  );
});

test("story previous and next navigation use the same directional focus travel", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    app,
    /focusCurrentStoryItem\(\s*openFocus = false,\s*options:\s*\{ direction\?: number \} = \{\},?\s*\)/,
  );
  assert.match(
    app,
    /timelineView\?\.focusItem\(currentId, \{[\s\S]*direction: Number\(options\.direction \?\? 1\) < 0 \? -1 : 1/,
  );
  assert.match(
    app,
    /focusCurrentStoryItem\(Boolean\(options\.focusEvent\), \{[\s\S]*direction: delta < 0 \? -1 : 1/,
  );
});

test("focused popover content remains bounded while Relations halo can stay visually unclipped", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(
    css,
    /timeline-focus-view\[popover\]:popover-open[\s\S]*max-inline-size:\s*calc\(100dvw - 1\.5rem\)[\s\S]*max-block-size:\s*calc\(100dvh - 1\.5rem\)/,
  );
  assert.match(css, /\.timeline-focus-summary[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.timeline-focus-evidence[\s\S]*overflow:\s*auto/);
  assert.match(
    css,
    /timeline-focus-relations-backdrop \.temporal-graph-canvas[\s\S]*overflow:\s*visible/,
  );
});

test("focused map mount stays idempotent while the graph remains in its persistent surface", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.doesNotMatch(app, /presentationGraphCanvas|mountGraphBackdrop|focusGraphSlot/);
  assert.match(app, /const moved = els\.presentationMap\.parentNode !== slot/);
  assert.match(app, /if \(moved\) slot\.replaceChildren\(els\.presentationMap\)/);
  assert.match(app, /presentationMapKey/);
  assert.match(app, /if \(presentationMap && presentationMapKey === mapKey\)/);
  assert.match(app, /requestAnimationFrame\(\(\) => presentationMap\?\.refresh\?\.\(\)\)/);
  assert.match(app, /if \(els\.graphLens\) els\.graphLens\.hidden = false/);
  assert.doesNotMatch(app, /function renderPresentationMap\(\) \{\s*destroyPresentationMap\(\)/);
});

test("focused popover chrome derives from the focused timeline event color", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    source,
    /this\.focusView\.style\.setProperty\("--event-color", item\.color \|\| "var\(--accent\)"\)/,
  );
  assert.match(css, /--focus-chrome-color:\s*var\(--event-color, var\(--accent\)\)/);
  assert.match(
    css,
    /border-color:\s*color-mix\(in srgb, var\(--focus-chrome-color\) 72%, var\(--line-strong\)\)/,
  );
  assert.match(css, /inset 0 3px 0 var\(--focus-chrome-color\)/);
  assert.match(
    css,
    /\.timeline-focus-tab\.is-active[\s\S]*background:\s*var\(--focus-chrome-color\)[\s\S]*color:\s*var\(--focus-chrome-contrast\)/,
  );
  assert.match(
    css,
    /\.timeline-focus-close\.button\.primary[\s\S]*background:\s*var\(--focus-chrome-color\)/,
  );
  assert.match(
    css,
    /\.timeline-focus-section[\s\S]*border-top-color:\s*color-mix\(in srgb, var\(--focus-chrome-color\)/,
  );
});

test("coarse-pointer phone controls preserve a 44 CSS px interaction target", async () => {
  const [styles, timelineCss] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    styles,
    /@media \(pointer: coarse\)[\s\S]*\.story-nav-button[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    styles,
    /@media \(pointer: coarse\)[\s\S]*\.range-calendar-nav[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    styles,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool\s*\{[\s\S]*min-height:\s*50px/,
  );
  assert.doesNotMatch(styles, /pointer: coarse[\s\S]{0,1200}\.project-menu-toggle\s*\{/);

  assert.match(
    timelineCss,
    /@media \(pointer: coarse\)[\s\S]*\.story-nav-button,[\s\S]*\.view-icon-button[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px/,
  );
  assert.doesNotMatch(timelineCss, /timeline-project-menu-toggle/);
  assert.match(
    timelineCss,
    /@media \(pointer: coarse\)[\s\S]*\.timeline-focus-tab,[\s\S]*\.timeline-focus-close[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    timelineCss,
    /@media \(pointer: coarse\) and \(max-width: 699px\)[\s\S]*data-orientation="portrait"[\s\S]*max-width:\s*52px/,
  );
});
