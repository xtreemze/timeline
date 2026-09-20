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

  assert.doesNotMatch(source, /orbGraphFactory|TimelineOrbGraph|timeline-focus-graph-canvas/);
  assert.doesNotMatch(source, /timeline-focus-place-map/);
  assert.doesNotMatch(css, /\.timeline-focus-graph(?:\s|,|\{)/);
  assert.doesNotMatch(css, /timeline-focus-place-map/);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /font-size:\s*clamp\(3\.2rem,\s*11\.5cqi,\s*9rem\)/);
  assert.doesNotMatch(source, /timeline-focus-temporal|timeline-focus-definition-list|\"Chronology\"/);
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

test("fullscreen keeps the timeline full-stage and moves focused detail into a responsive top layer", async () => {
  const [html, timelineCss, app, timelineSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(html, /id="timeline-focus-view"[^>]*popover="manual"/);
  assert.match(timelineCss, /Overlay-first presentation contract/);
  assert.match(timelineCss, /#presentation-stage:fullscreen > \.timeline-view[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important[\s\S]*grid-row:\s*1\s*\/\s*-1\s*!important/);
  assert.match(timelineCss, /#presentation-stage:fullscreen > \.graph-lens,[\s\S]*\.presentation-map-panel[\s\S]*display:\s*none\s*!important/);
  assert.match(timelineCss, /timeline-focus-view\[popover\]/);
  assert.match(timelineCss, /data-orientation="landscape"[\s\S]*timeline-focus-view:popover-open/);
  assert.match(timelineCss, /data-orientation="portrait"[\s\S]*timeline-focus-view:popover-open/);
  assert.match(timelineCss, /@media \(max-width: 500px\)/);
  assert.match(timelineSource, /showPopover\(\)/);
  assert.match(timelineSource, /hidePopover\(\)/);
  assert.match(timelineSource, /focusInset/);
  assert.match(timelineSource, /height - focusInset/);
  assert.match(timelineSource, /width - focusInset/);
  assert.match(timelineSource, /document\.startViewTransition\(applyFocus\)/);
  assert.match(timelineSource, /document\.startViewTransition\(clearFocus\)/);
  assert.match(app, /dataset\.viewportOrientation/);
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

test("focused Place and Relations reuse the single map and graph surfaces as interactive backdrops", async () => {
  const [html, timelineCss, app, view, mapSource, graphView] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8")
  ]);

  assert.equal((html.match(/class="temporal-graph-canvas"/g) || []).length, 1);
  assert.equal((html.match(/id="presentation-map"/g) || []).length, 1);
  assert.match(view, /dataset\.focusMapSlot/);
  assert.doesNotMatch(view, /dataset\.focusGraphSlot/);
  assert.match(view, /timeline-focus-section-content/);
  assert.doesNotMatch(app, /mountGraphBackdrop|presentationGraphAnchor/);
  assert.match(app, /mountMapBackdrop/);
  assert.match(app, /presentationMapAnchor/);
  assert.match(app, /interactive:\s*true/);
  assert.match(mapSource, /this\.interactive = options\.interactive === true/);
  assert.match(mapSource, /dragging:\s*this\.interactive/);
  assert.match(mapSource, /touchZoom:\s*this\.interactive/);
  assert.match(timelineCss, /timeline-focus-view\[popover\][\s\S]*pointer-events:\s*auto/);
  assert.match(
    timelineCss,
    /timeline-focus-view\[popover\]\s*>\s*:is\(\.timeline-focus-place,\s*\.timeline-focus-relations\)[\s\S]*pointer-events:\s*auto/
  );
  assert.match(timelineCss, /timeline-focus-place-backdrop \.presentation-map[\s\S]*touch-action:\s*none/);
  assert.match(timelineCss, /timeline-focus-section-backdrop[\s\S]*z-index:\s*1[\s\S]*pointer-events:\s*auto/);
  assert.match(timelineCss, /timeline-focus-relations-backdrop[\s\S]*opacity:\s*\.64/);
  assert.match(
    timelineCss,
    /timeline-focus-place-backdrop \.presentation-map,[\s\S]*timeline-focus-relations-backdrop \.temporal-graph-canvas[\s\S]*pointer-events:\s*auto/
  );
  assert.match(graphView, /neighborhoodGraph\(this\.model, this\.focusedId/);
});

test("focused event detail uses a shared View Transition with its timeline terminal", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(source, /FOCUS_VIEW_TRANSITION_NAME = "timeline-event-detail-shared"/);
  assert.match(source, /focusTransitionOrigin\(id\)/);
  assert.match(source, /transitionOrigin\.style\.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME/);
  assert.match(source, /this\.focusView\.style\.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME/);
  assert.match(source, /transition\.ready\.then\(renderAfterCapture, renderAfterCapture\)/);
  assert.match(source, /clearFocus\(\{ deferRender: true, deferSurfaceFocus: true \}\)/);
  assert.match(css, /::view-transition-group\(timeline-event-detail-shared\)/);
  assert.doesNotMatch(css, /view-transition-name:\s*timeline-detail-overlay/);
});

test("adjacent focused-event navigation finishes viewport motion before swapping shared detail", async () => {
  const [app, source] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(app, /focusCurrentStoryItem\(Boolean\(options\.focusEvent\),\s*\{[\s\S]*direction:\s*delta < 0 \? -1 : 1/);
  assert.match(source, /FOCUS_SWAP_TRANSITION_NAME = "timeline-event-detail-swap"/);
  assert.match(source, /focusNavigationToken/);
  assert.match(source, /zoomAnimationResolve/);
  assert.match(source, /animateViewportTo\(target\)[\s\S]*return new Promise/);
  assert.match(source, /resolveViewportAnimation\(true\)/);
  assert.match(source, /cancelViewportAnimation\(\)[\s\S]*resolveViewportAnimation\(false\)/);
  assert.match(source, /transitionFocusTo\(item, direction = 1\)[\s\S]*await this\.animateViewportTo\(plan\.viewport\)[\s\S]*token !== this\.focusNavigationToken/);
  assert.match(source, /this\.selectedId && this\.selectedId !== id && !this\.prefersReducedMotion\(\)/);
  assert.match(source, /dataset\.timelineFocusDirection = adjacentDirection < 0 \? "backward" : "forward"/);
  assert.match(source, /transition\.finished\.then\(cleanupAdjacentTransition, cleanupAdjacentTransition\)/);
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
  assert.match(css, /\.timeline-event-dot[\s\S]*width:\s*2\.75rem/);
});


test("application shell keeps the timeline viewport-owned while utility surfaces overlay it", async () => {
  const [styles, timelineCss, html, app] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(html, /class="hero"|class="site-header"|<footer>/);
  assert.doesNotMatch(html, /class="project-bar app-command-bar"/);
  assert.match(html, /id="timeline-view"[\s\S]*class="timeline-project-heading"/);
  assert.match(html, /id="project-menu-toggle"[^>]*popovertarget="project-menu"[\s\S]*<img src="\.\/icon\.svg"/);
  assert.match(html, /class="app-tool-dock"/);
  assert.match(html, /id="editor-toggle"[^>]*data-semantic-icon="note"/);
  assert.doesNotMatch(html, /data-open-panel="items"|data-open-panel="stories"/);
  assert.match(html, /id="timeline-browser-toggle"[^>]*data-semantic-icon="search"/);
  assert.doesNotMatch(html, /id="graph-lens-toggle"/);
  assert.match(html, /id="graph-lens"[^>]*aria-label="Persistent temporal relation graph"/);
  assert.match(html, /id="timeline-view-controls-toggle"[^>]*data-semantic-icon="magic"/);
  assert.match(html, /id="project-menu"[^>]*popover="auto"/);
  assert.match(html, /id="import-json-trigger"[^>]*role="menuitem"/);
  assert.match(html, /id="import-interchange-trigger"[^>]*role="menuitem"/);
  assert.match(html, /class="project-menu-group"/);
  assert.doesNotMatch(html, /class="button secondary file-button" role="menuitem"/);
  assert.match(html, /class="timeline-project-heading"[\s\S]*id="story-focus"[^>]*story-focus-header/);
  assert.match(html, /id="story-prev"[^>]*data-semantic-icon="chevron-left"[^>]*aria-label="Previous story event"/);
  assert.match(html, /id="story-next"[^>]*data-semantic-icon="chevron-right"[^>]*aria-label="Next story event"/);
  assert.match(html, /id="story-exit"[^>]*data-semantic-icon="close"[^>]*aria-label="Exit story"/);
  assert.doesNotMatch(html, /Detailed chronology/);
  assert.match(html, /id="control-panel"[^>]*hidden/);
  assert.match(html, /id="timeline-browser-sheet"[^>]*hidden/);
  assert.match(html, /id="timeline-view-toolbar"[^>]*popover="manual"[^>]*role="toolbar"/);
  assert.match(styles, /#workspace\s*\{[\s\S]*position:\s*fixed[\s\S]*height:\s*100dvh/);
  assert.match(styles, /#app-shell\s*\{[\s\S]*position:\s*fixed[\s\S]*overflow:\s*hidden/);
  assert.match(styles, /#app-shell #presentation-stage[\s\S]*display:\s*block/);
  assert.doesNotMatch(styles, /repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /\.app-editor-sheet,[\s\S]*\.app-browser-sheet[\s\S]*position:\s*fixed/);
  assert.match(styles, /\.app-editor-sheet \.field-grid[\s\S]*repeat\(var\(--sheet-columns\),\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*\.app-editor-sheet,[\s\S]*width:\s*min\(390px/);
  assert.match(timelineCss, /Persistent application canvas/);
  assert.match(timelineCss, /#app-shell #timeline-view[\s\S]*position:\s*absolute[\s\S]*inset:\s*0/);
  assert.doesNotMatch(timelineCss, /repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(timelineCss, /timeline-focus-view[\s\S]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(timelineCss, /Compact application presentation contract/);
  assert.match(timelineCss, /\.timeline-project-heading\s*\{[\s\S]*position:\s*absolute/);
  assert.match(timelineCss, /\.timeline-project-heading[\s\S]*max-width:\s*min\(52rem/);
  assert.match(timelineCss, /\.timeline-view\[data-orientation="portrait"\] \.story-focus-header[\s\S]*flex-direction:\s*column/);
  assert.doesNotMatch(styles, /\.app-shell\.is-event-focused[\s\S]{0,220}\.story-focus/);
  assert.match(timelineCss, /\.is-portrait \.timeline-month-accent\.avoids-project-heading[\s\S]*right:\s*calc\(7px \+ var\(--timeline-project-heading-clearance, 52px\)\)/);
  assert.match(timelineCss, /\.is-landscape \.timeline-month-accent\.avoids-project-heading[\s\S]*bottom:\s*8px/);
  assert.doesNotMatch(timelineCss, /\.is-landscape \.timeline-month-accent\.avoids-project-heading[\s\S]{0,120}bottom:\s*calc\(/);
  assert.match(timelineCss, /\.timeline-view\[data-orientation="portrait"\] \.timeline-project-title input[\s\S]*writing-mode:\s*vertical-rl/);
  assert.match(timelineCss, /\.timeline-view\[data-orientation="landscape"\] \.timeline-project-heading[\s\S]*bottom:\s*max\(\.5rem, env\(safe-area-inset-bottom\)\)/);
  assert.match(timelineCss, /data-timeline-orientation="horizontal"[\s\S]*\.timeline-project-heading[\s\S]*bottom:\s*max\(\.45rem, env\(safe-area-inset-bottom\)\)/);
  assert.match(timelineCss, /data-graph-open="true"[\s\S]*data-orientation="landscape"[\s\S]*\.timeline-project-heading[\s\S]*bottom:\s*calc\(var\(--relations-bottom-safe\) \+ \.35rem\)/);
  assert.match(timelineCss, /data-graph-open="true"[\s\S]*data-orientation="landscape"[\s\S]*\.timeline-project-heading[\s\S]*bottom:\s*calc\(var\(--mobile-bottom-chrome\) \+ \.25rem\)/);
  assert.match(app, /function positionProjectMenu\(\)[\s\S]*projectMenuToggle\.getBoundingClientRect\(\)/);
  assert.match(app, /function projectMenuViewport\(\)[\s\S]*window\.visualViewport/);
  assert.match(app, /const availableWidth = Math\.max\(1, maxRight - minLeft\)[\s\S]*const availableHeight = Math\.max\(1, maxBottom - minTop\)/);
  assert.match(app, /const menuWidth = Math\.min\(340, availableWidth\)/);
  assert.match(app, /const menuHeight = Math\.min\([\s\S]*availableHeight/);
  assert.match(app, /requestAnimationFrame\(positionProjectMenu\)/);
  assert.match(app, /visualViewport\?\.addEventListener\("resize", repositionOpenProjectMenu\)/);
  assert.match(app, /visualViewport\?\.addEventListener\("scroll", repositionOpenProjectMenu\)/);
  assert.match(timelineCss, /#presentation-stage[\s\S]*display:\s*block\s*!important/);
  assert.match(timelineCss, /timeline-focus-view\[popover\][\s\S]*position:/);
  assert.match(timelineCss, /inline-size:\s*min\(640px,\s*calc\(100dvw - 6\.5rem\)\)/);
  assert.match(timelineCss, /max-block-size:\s*66dvh/);
  assert.match(styles, /\.project-menu\[popover\][\s\S]*max-width:\s*var\(--project-menu-max-width[\s\S]*max-height:\s*min\([\s\S]*--project-menu-max-height[\s\S]*overflow:\s*auto/);
  assert.match(html, /id="timeline-focus-view"[^>]*popover="manual"/);
  assert.match(app, /function decorateSemanticControls/);
  assert.match(app, /importJsonTrigger\?\.addEventListener\("click",[\s\S]*importJson\?\.click\(\)/);
  assert.match(app, /importInterchangeTrigger\?\.addEventListener\("click",[\s\S]*importInterchange\?\.click\(\)/);
  assert.match(app, /function closeProjectMenu/);
  assert.match(app, /editorToggle\?\.addEventListener\("click",[\s\S]*setEditorSurfaceOpen\(!ui\.editorOpen\)/);
  assert.match(app, /function setEditorSurfaceOpen/);
  assert.match(app, /function setBrowserSurfaceOpen/);
  assert.doesNotMatch(app, /function setGraphSurfaceOpen/);
  assert.match(app, /function setViewControlsOpen/);
  assert.match(app, /function syncViewControlsSurface\(\)[\s\S]*showPopover\(\)[\s\S]*hidePopover\(\)/);
  assert.match(app, /const shouldOpen = Boolean\(ui\.viewControlsOpen\)/);
  assert.doesNotMatch(app, /viewControlsOpen \|\| presentationIsFullscreen\(\)/);
  assert.match(app, /viewControlsToggle\?\.addEventListener\("click", \(\) => setViewControlsOpen\(!ui\.viewControlsOpen\)\)/);
  assert.doesNotMatch(app, /viewControls\.hidden\s*=/);
  assert.doesNotMatch(timelineCss, /timeline-view-toolbar:not\(\[hidden\]\)/);
  assert.match(timelineCss, /timeline-view-toolbar\[popover\]:popover-open/);
  assert.match(styles, /\.timeline-view-toolbar\[popover\][\s\S]*max-inline-size:[\s\S]*max-block-size:[\s\S]*overflow-x:\s*auto/);
  assert.match(styles, /\.app-view-controls\[popover\]:popover-open[\s\S]*display:\s*flex/);
  assert.match(app, /setActivePanel\("items", \{ open: false \}\)/);
});

test("focused timeline geometry keeps terminals on the interior side of the shifted axis", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /axisPadding\(length\)[\s\S]*clamp\(length \* 0\.075, 48, 80\)/);
  assert.match(source, /const focused = Boolean\(this\.selectedId\)/);
  assert.match(source, /const side = focused \? -1/);
  assert.match(source, /const lane = focused \? -1/);
  assert.match(source, /const inwardLimit = Math\.max\(64, axisCross - 64\)/);
  assert.match(source, /const inwardLimit = Math\.max\(64, axisCross - 72\)/);
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
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8")
  ]);
  const graphMarkup = html.slice(html.indexOf('id="graph-lens"'), html.indexOf('id="presentation-map-panel"'));
  assert.doesNotMatch(graphMarkup, /<summary|temporal-graph-toolbar|data-graph-detail|graph-reset-view/);
  assert.match(styles, /The persistent relation graph is a stage canvas/);
  assert.match(styles, /\.graph-lens > summary,[\s\S]*\.temporal-graph-toolbar,[\s\S]*\.temporal-graph-detail[\s\S]*display:\s*none/);
  assert.match(graphView, /graphselectionchange/);
  assert.doesNotMatch(graphView, /renderDetail|temporal-graph-detail-list/);
});

test("timeline background click exits focused event without stealing event-terminal clicks", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(
    source,
    /surface\.addEventListener\("click",[\s\S]*this\.selectedId[\s\S]*event\.target\.closest\("button, a, input, select, textarea"\)[\s\S]*this\.closeFocus\(\)/
  );
});

test("desktop event detail is compact and placed opposite the active timeline edge", async () => {
  const [css, source] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);
  assert.match(css, /@media \(min-width: 900px\) and \(min-height: 700px\)/);
  assert.match(
    css,
    /data-orientation="landscape"[\s\S]*timeline-focus-view:popover-open[\s\S]*left:\s*50%[\s\S]*overflow:\s*visible[\s\S]*translateX\(-50%\)/
  );
  assert.match(
    css,
    /data-orientation="portrait"[\s\S]*timeline-focus-view:popover-open[\s\S]*top:\s*50%[\s\S]*overflow:\s*visible[\s\S]*translateY\(-50%\)/
  );
  assert.match(source, /const visibleEvidence = item\.evidence\.slice\(0, 6\)/);
});

test("viewing and editing are explicit mutually exclusive application modes", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="app-shell"[^>]*data-mode="view"/);
  assert.match(html, /id="editor-toggle"[^>]*aria-pressed="false"/);
  assert.match(app, /mode:\s*"view"/);
  assert.match(app, /ui\.mode = editing \? "edit" : "view"/);
  assert.match(app, /timelinefocusedit[\s\S]*setEditorSurfaceOpen\(true\)[\s\S]*beginItemEdit/);
  assert.doesNotMatch(app, /graphentityfocus|graphedgefocus|graphnodefocus|graphstoryfocus/);
  assert.match(app, /graphNodeList\.addEventListener\("click"[\s\S]*beginGraphNodeEdit/);
  assert.match(app, /graphEdgeList\.addEventListener\("click"[\s\S]*beginGraphEdgeEdit/);
  assert.match(styles, /data-mode="edit"[\s\S]*app-tool:not\(#editor-toggle\)[\s\S]*display:\s*none/);
  assert.match(app, /title\.readOnly = !editing/);
  assert.match(app, /\[els\.loadSample, els\.importJsonTrigger, els\.importInterchangeTrigger, els\.clear\][\s\S]*disabled = !editing/);
  assert.doesNotMatch(app, /actionButton\("Edit", "edit-item"/);
  assert.doesNotMatch(app, /actionButton\("Delete", "delete-item"/);
  assert.match(html, /id="delete-item-edit"[^>]*hidden/);
  assert.match(app, /deleteItemEdit\.addEventListener\("click",[\s\S]*ui\.mode !== "edit"[\s\S]*removeItem/);
  assert.match(app, /els\.title\.addEventListener\("input",[\s\S]*ui\.mode !== "edit"[\s\S]*return/);
  assert.match(app, /els\.clear\.addEventListener\("click",[\s\S]*ui\.mode !== "edit"[\s\S]*return/);
});


test("fullscreen restores the focused event popover after the browser changes top-layer state", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /ensureFocusPopover\(\)/);
  assert.match(app, /active && timelineView\?\.hasFocusedItem\?\.\(\)[\s\S]*ensureFocusPopover/);
});

test("utility surfaces remain coordinated while the relation graph stays persistent", async () => {
  const app = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(app, /closeLargeUtilitySurfaces\(except = ""\)[\s\S]*viewControlsOpen/);
  assert.match(app, /setBrowserSurfaceOpen[\s\S]*closeLargeUtilitySurfaces\("browser"\)[\s\S]*closeFocusedEventForUtility/);
  assert.match(app, /setViewControlsOpen[\s\S]*closeLargeUtilitySurfaces\("view"\)[\s\S]*closeFocusedEventForUtility/);
  assert.match(app, /timelinefocuschange[\s\S]*closeLargeUtilitySurfaces\("focus"\)/);
  assert.match(app, /els\.graphLens\.hidden = false/);
  assert.doesNotMatch(app, /setGraphSurfaceOpen|ui\.graphOpen/);
});


test("focused overview omits redundant Context, Place, Relations headings and the Relations panel", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  const renderStart = source.indexOf("renderFocus(item)");
  const renderEnd = source.indexOf("\n    closeFocus() {", renderStart);
  const renderFocus = source.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderFocus, /timeline-focus-section-heading", "Context"/);
  assert.doesNotMatch(renderFocus, /timeline-focus-section-heading", "Place"/);
  assert.doesNotMatch(renderFocus, /timeline-focus-section-heading", "Relations"/);
  assert.doesNotMatch(renderFocus, /timeline-focus-relations/);
  assert.match(renderFocus, /this\.focusView\.append\(tabs, hero, summary, place, evidence\)/);
});

test("focused hero suppresses repeated Wikimedia illustration disclaimers while preserving media metadata", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /mediaCaption\.startsWith\("Public-domain story illustration via Wikimedia Commons;"\)/);
  assert.match(source, /if \(mediaCaption && !isIllustrationDisclaimer\)/);
});

test("focused Context belongs to Overview and interaction chrome cannot overlap either tab", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  const renderStart = source.indexOf("renderFocus(item)");
  const renderEnd = source.indexOf("\n    closeFocus() {", renderStart);
  const renderFocus = source.slice(renderStart, renderEnd);

  assert.match(renderFocus, /summary\.id = "timeline-focus-context-panel"/);
  assert.match(renderFocus, /summary\.setAttribute\("aria-label", "Context"\)/);
  assert.match(renderFocus, /place\.setAttribute\("aria-label", "Place"\)/);
  assert.match(renderFocus, /timeline-focus-context-panel timeline-focus-place-panel/);
  assert.match(renderFocus, /summary\.hidden = evidenceActive/);
  assert.match(renderFocus, /place\.hidden = evidenceActive/);
  assert.match(renderFocus, /evidence\.hidden = !evidenceActive/);

  assert.match(css, /Focused popover tab contract/);
  assert.match(css, /timeline-focus-tabs[\s\S]*position:\s*relative/);
  assert.match(css, /data-active-tab="evidence"[\s\S]*timeline-focus-summary,[\s\S]*timeline-focus-place[\s\S]*display:\s*none !important/);
  assert.match(css, /timeline-focus-summary[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column[\s\S]*overflow:\s*hidden/);
  assert.match(css, /timeline-focus-description[\s\S]*overflow:\s*auto/);
});

test("focused popover keeps one hero composition while Overview and Evidence own distinct content", async () => {
  const [css, source] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);
  assert.match(source, /summary\.hidden = evidenceActive/);
  assert.match(source, /place\.hidden = evidenceActive/);
  assert.match(source, /evidence\.hidden = !evidenceActive/);
  assert.match(css, /Focused popover tab contract/);
  assert.match(css, /--focus-hero-block-size:\s*clamp\(320px, 44dvh, 400px\)/);
  assert.match(css, /timeline-focus-hero[\s\S]*min-height:\s*var\(--focus-hero-block-size\) !important[\s\S]*height:\s*var\(--focus-hero-block-size\) !important[\s\S]*max-height:\s*var\(--focus-hero-block-size\) !important/);
  assert.match(css, /data-active-tab="overview"[\s\S]*timeline-focus-summary[\s\S]*grid-row:\s*2 !important/);
  assert.match(css, /data-active-tab="overview"[\s\S]*timeline-focus-place[\s\S]*grid-row:\s*3 !important/);
  assert.match(css, /data-active-tab="evidence"[\s\S]*timeline-focus-evidence[\s\S]*grid-row:\s*2 \/ span 2 !important/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*--focus-hero-block-size:\s*clamp\(190px, 30dvh, 250px\)/);
});

test("fullscreen preserves the left workspace tool dock inside the fullscreen subtree", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(app, /appToolDock:\s*document\.querySelector\("\.app-tool-dock"\)/);
  assert.match(app, /timeline-tool-dock-home/);
  assert.match(app, /function workspaceToolViewport\(\)[\s\S]*visualViewport/);
  assert.match(app, /function positionWorkspaceToolDock\(\)[\s\S]*projectMenuToggle\.getBoundingClientRect\(\)[\s\S]*dataset\.timelineOrientation = orientation/);
  assert.match(app, /orientation === "portrait"[\s\S]*triggerRect\.left - dockWidth - gap[\s\S]*triggerRect\.top \+ \(triggerRect\.height - dockHeight\) \/ 2/);
  assert.match(app, /preferredTop = triggerRect\.bottom \+ gap[\s\S]*triggerRect\.left \+ \(triggerRect\.width - dockWidth\) \/ 2/);
  assert.match(styles, /app-tool-dock\[data-project-anchored="true"\]\[data-timeline-orientation="landscape"\][\s\S]*flex-direction:\s*column/);
  assert.match(styles, /app-tool-dock\[data-project-anchored="true"\]\[data-timeline-orientation="portrait"\][\s\S]*flex-direction:\s*row/);
  assert.match(styles, /Project-aligned Browse\/Edit controls[\s\S]*z-index:\s*1420[\s\S]*pointer-events:\s*auto[\s\S]*app-tool[\s\S]*pointer-events:\s*auto/);
  assert.match(app, /mountFullscreenToolDock/);
  assert.match(app, /restoreToolDock/);
  assert.match(app, /if \(active\)[\s\S]*mountFullscreenToolDock\(\)/);
  assert.match(styles, /#presentation-stage:fullscreen \.app-tool-dock[\s\S]*pointer-events:\s*auto !important[\s\S]*left:/);
});

test("fullscreen graph composition follows physical orientation and preserves direct manipulation", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /data-viewport-orientation="landscape"[\s\S]*timeline-focus-relations[\s\S]*grid-row:\s*1 !important/);
  assert.match(css, /data-viewport-orientation="portrait"[\s\S]*timeline-focus-relations[\s\S]*grid-column:\s*1\s*\/\s*span 3/);
  assert.match(css, /timeline-focus-relations::before[\s\S]*radial-gradient/);
  assert.match(css, /timeline-focus-relations-backdrop \.temporal-graph-canvas,[\s\S]*pointer-events:\s*auto !important/);
  assert.match(css, /timeline-focus-relations-backdrop \.temporal-graph-canvas[\s\S]*cursor:\s*grab/);
});


test("fresh startup loads the storybook sample while persisted timelines retain precedence", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  const loadState = source.slice(
    source.indexOf("function loadState()"),
    source.indexOf("function persist()", source.indexOf("function loadState()"))
  );

  assert.match(loadState, /localStorage\.getItem\(STORAGE_KEY\)[\s\S]*return normalizeTimeline\(JSON\.parse\(current\)\)/);
  assert.match(loadState, /localStorage\.getItem\(LEGACY_STORAGE_KEY\)[\s\S]*return migrated/);
  assert.match(loadState, /return normalizeTimeline\(clone\(SAMPLE\), \{ strictGraph: true \}\)/);
  assert.ok(
    loadState.indexOf("return normalizeTimeline(clone(SAMPLE), { strictGraph: true })") >
      loadState.indexOf("localStorage.getItem(LEGACY_STORAGE_KEY)"),
    "sample fallback must run only after current and legacy storage checks"
  );
});


test("fullscreen presentation derives timeline axis from physical viewport without persisting it", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /setOrientation\(orientation, options = \{\}\)/);
  assert.match(view, /const persist = options\.persist !== false/);
  assert.match(view, /if \(persist\)[\s\S]*savePreferences/);
  assert.match(app, /viewportOrientation === "portrait" \? "vertical" : "horizontal"/);
  assert.match(app, /setOrientation\?\.\(fullscreenOrientation, \{ persist: false, focus: false \}\)/);
  assert.match(app, /timelineOrientationBeforeFullscreen/);
  assert.match(app, /setOrientation\?\.\(timelineOrientationBeforeFullscreen, \{ persist: false, focus: false \}\)/);
});

test("focused chronology hugs the right or bottom edge in presentation", async () => {
  const view = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(view, /clamp\(height \* 0\.08, 48, 88\)/);
  assert.match(view, /clamp\(width \* 0\.07, 44, 76\)/);
  assert.match(view, /this\.orientation === "horizontal" \? height - focusInset : width - focusInset/);
});

test("relations halo remains inside the unified popover chrome", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /data-active-tab="overview"\],[\s\S]*data-active-tab="evidence"\][\s\S]*overflow:\s*hidden/);
  assert.match(css, /data-active-tab="overview"[\s\S]*timeline-focus-relations::before[\s\S]*inset:\s*0/);
  assert.match(css, /data-timeline-orientation="vertical"[\s\S]*ellipse 70% 86% at 42% 50%/);
  assert.match(css, /data-timeline-orientation="horizontal"[\s\S]*ellipse 78% 68% at 50% 42%/);
  assert.match(css, /\.timeline-focus-relations::before\s*\{[\s\S]*?inset:\s*0/);
});

test("contextual relations docks only the timeline surface by timeline orientation", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(
    css,
    /data-event-focused="true"\]\[data-has-context-graph="true"\][\s\S]*> \.timeline-view \{[\s\S]*inset:\s*0[\s\S]*width:\s*100%[\s\S]*height:\s*100%/
  );
  assert.match(
    css,
    /data-timeline-orientation="horizontal"\]:has\(\.timeline-focus-view:popover-open\)[\s\S]*> \.timeline-view > \.timeline-surface[\s\S]*inset:\s*auto 0 0 0[\s\S]*height:\s*var\(--timeline-context-edge-span\)[\s\S]*overflow:\s*visible/
  );
  assert.match(
    css,
    /data-timeline-orientation="vertical"\]:has\(\.timeline-focus-view:popover-open\)[\s\S]*> \.timeline-view > \.timeline-surface[\s\S]*inset:\s*0 0 0 auto[\s\S]*width:\s*var\(--timeline-context-edge-span\)[\s\S]*overflow:\s*visible/
  );
  assert.match(css, /data-timeline-orientation="horizontal"[\s\S]*--timeline-context-edge-span:\s*clamp\(112px, 24dvh, 260px\)/);
  assert.match(css, /data-timeline-orientation="vertical"[\s\S]*--timeline-context-edge-span:\s*clamp\(132px, 29dvw, 320px\)/);
});

test("docked timeline terminals can overhang the narrow rail without leaving the viewport", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /#app-shell #timeline-view[\s\S]*position:\s*absolute[\s\S]*inset:\s*0[\s\S]*overflow:\s*hidden/);
  assert.match(css, /data-timeline-orientation="vertical"\]:has\(\.timeline-focus-view:popover-open\)[\s\S]*timeline-surface[\s\S]*overflow:\s*visible/);
  assert.match(css, /data-timeline-orientation="horizontal"\]:has\(\.timeline-focus-view:popover-open\)[\s\S]*timeline-surface[\s\S]*overflow:\s*visible/);
});

test("focused popover runtime owns its final width and height budget", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /const preferredWidth = mobileFocusLayout[\s\S]*compactAvailableWidth[\s\S]*: compact[\s\S]*rawAvailableWidth[\s\S]*this\.orientation === "vertical"[\s\S]*\? \(desktop \? 620 : 520\)[\s\S]*: \(desktop \? 760 : 640\)/);
  assert.match(source, /const minimumDesktopWidth = this\.orientation === "vertical" \? 480 : 560/);
  assert.match(source, /rawAvailableWidth < minimumDesktopWidth[\s\S]*unreservedWidth >= minimumDesktopWidth/);
  assert.match(source, /this\.focusView\.style\.inlineSize = Math\.round\(targetWidth\) \+ "px"/);
  assert.match(source, /this\.focusView\.style\.maxInlineSize = Math\.round\(targetWidth\) \+ "px"/);
  assert.match(source, /this\.focusView\.style\.maxBlockSize = Math\.round\(targetMaxHeight\) \+ "px"/);
  assert.doesNotMatch(
    css,
    /data-timeline-orientation="horizontal"\]:has\(\.timeline-focus-view\[data-active-tab="overview"\]\)[\s\S]{0,500}inline-size:/
  );
  assert.doesNotMatch(
    css,
    /data-timeline-orientation="vertical"\]:has\(\.timeline-focus-view\[data-active-tab="overview"\]\)[\s\S]{0,650}inline-size:/
  );
});

test("popover inset measurement ignores an undocked full-viewport timeline surface", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /const timelineRect = this\.surface\.getBoundingClientRect\(\)/);
  assert.match(source, /const dockedRight =[\s\S]*timelineRect\.width < viewportWidth \* 0\.6[\s\S]*timelineRect\.right >= viewportWidth - FOCUS_POPOVER_MARGIN \* 2/);
  assert.match(source, /const dockedBottom =[\s\S]*timelineRect\.height < viewportHeight \* 0\.6[\s\S]*timelineRect\.bottom >= viewportHeight - FOCUS_POPOVER_MARGIN \* 2/);
  assert.doesNotMatch(source, /const timelineRect = this\.root\.getBoundingClientRect\(\)/);
});

test("desktop popover chrome clips every content band", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /data-orientation="landscape"[\s\S]*timeline-focus-view:popover-open[\s\S]*overflow:\s*hidden/);
  assert.match(css, /data-orientation="portrait"[\s\S]*timeline-focus-view:popover-open[\s\S]*overflow:\s*hidden/);
  assert.match(css, /data-active-tab="overview"[\s\S]*overflow:\s*hidden/);
});


test("desktop focus card preserves a stable hero while Overview gets Context and Place", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /Focused popover tab contract[\s\S]*--focus-hero-block-size:\s*clamp\(320px, 44dvh, 400px\)/);
  assert.match(css, /grid-template-rows:\s*auto minmax\(0, 1fr\) 104px !important/);
  assert.match(css, /timeline-focus-summary[\s\S]*grid-row:\s*2 !important/);
  assert.match(css, /timeline-focus-place[\s\S]*grid-row:\s*3 !important[\s\S]*min-height:\s*104px[\s\S]*max-height:\s*104px/);
  assert.match(css, /timeline-focus-title[\s\S]*font-size:\s*clamp\(2\.2rem, 7cqi, 4\.6rem\)[\s\S]*line-height:\s*\.94/);
  assert.match(css, /data-orientation="landscape"[\s\S]*inline-size:\s*min\(640px, calc\(100dvw - 6\.5rem\)\)/);
  assert.match(css, /data-orientation="portrait"[\s\S]*inline-size:\s*min\(520px, calc\(100dvw - 7\.2rem\)\)/);
});


test("adjacent event navigation preserves temporal context before swapping focused detail", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /FOCUS_SWAP_TRANSITION_NAME = "timeline-event-detail-swap"/);
  assert.match(source, /async transitionFocusTo\(item, direction = 1\)/);
  assert.match(source, /const moved = plan\.viewport \? await this\.animateViewportTo\(plan\.viewport\) : true/);
  assert.match(source, /if \(!moved \|\| token !== this\.focusNavigationToken\) return false/);
  assert.match(source, /this\.select\(item\.id, \{[\s\S]*preserveViewport: true[\s\S]*adjacentDirection:/);
  assert.match(source, /focusAdjacent\(delta, options = \{\}\)[\s\S]*return this\.focusItem\(this\.items\[nextIndex\]\.id/);
  assert.match(source, /if \(this\.focusId && !this\.selectedId\) this\.ensureItemVisible\(this\.focusId\)/);
});

test("timeline viewport travel is awaitable and cancellable instead of snapping", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /this\.zoomAnimationResolve = null/);
  assert.match(source, /animateViewportTo\(target\)[\s\S]*return new Promise\(\(resolve\) =>/);
  assert.match(source, /this\.resolveViewportAnimation\(true\)/);
  assert.match(source, /cancelViewportAnimation\(\)[\s\S]*this\.resolveViewportAnimation\(false\)/);
  assert.match(source, /queueZoom\(factor, anchorRatio\)[\s\S]*this\.focusNavigationToken \+= 1[\s\S]*this\.resolveViewportAnimation\(false\)/);
});

test("opening and adjacent focused events use distinct shared View Transition identities", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /transitionOrigin\.style\.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME/);
  assert.match(source, /this\.focusView\.style\.viewTransitionName = FOCUS_VIEW_TRANSITION_NAME/);
  assert.match(source, /this\.focusView\.style\.viewTransitionName = FOCUS_SWAP_TRANSITION_NAME/);
  assert.match(source, /dataset\.timelineFocusDirection = adjacentDirection < 0 \? "backward" : "forward"/);
  assert.match(css, /::view-transition-group\(timeline-event-detail-shared\)/);
  assert.match(css, /::view-transition-group\(timeline-event-detail-swap\)/);
  assert.match(css, /data-timeline-focus-direction="forward"[\s\S]*view-transition-old\(timeline-event-detail-swap\)/);
  assert.match(css, /data-timeline-focus-direction="backward"[\s\S]*view-transition-new\(timeline-event-detail-swap\)/);
});

test("workspace sidebar and side sheets are named View Transition participants", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(styles, /\.app-tool-dock\s*\{[\s\S]*view-transition-name:\s*timeline-workspace-sidebar/);
  assert.match(styles, /\.app-editor-sheet\s*\{[\s\S]*view-transition-name:\s*timeline-editor-sidebar/);
  assert.match(styles, /\.app-browser-sheet\s*\{[\s\S]*view-transition-name:\s*timeline-browser-sidebar/);
  assert.match(styles, /::view-transition-group\(timeline-workspace-sidebar\)/);
  assert.match(app, /function runApplicationViewTransition\(update\)/);
  assert.match(app, /document\.startViewTransition\(update\)/);
  assert.match(app, /function syncPresentationFullscreenState\(\)[\s\S]*runApplicationViewTransition\(\(\) => \{[\s\S]*mountFullscreenToolDock\(\)/);
});

test("story previous and next navigation use the same directional focus travel", async () => {
  const app = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(app, /focusCurrentStoryItem\(openFocus = false, options = \{\}\)/);
  assert.match(app, /timelineView\?\.focusItem\(currentId, \{[\s\S]*direction: Number\(options\.direction\) < 0 \? -1 : 1/);
  assert.match(app, /focusCurrentStoryItem\(Boolean\(options\.focusEvent\), \{[\s\S]*direction: delta < 0 \? -1 : 1/);
});


test("Evidence tab keeps Hero but contains no Context or Place", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /summary\.hidden = evidenceActive/);
  assert.match(source, /place\.hidden = evidenceActive/);
  assert.match(source, /evidence\.hidden = !evidenceActive/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{[\s\S]*this\.positionFocusPopover\(\)/);
  assert.match(css, /data-active-tab="evidence"[\s\S]*timeline-focus-summary,[\s\S]*timeline-focus-place[\s\S]*display:\s*none !important/);
  assert.match(css, /data-active-tab="evidence"[\s\S]*timeline-focus-evidence[\s\S]*grid-row:\s*2 \/ span 2 !important/);
  assert.match(css, /timeline-focus-hero[\s\S]*height:\s*var\(--focus-hero-block-size\) !important/);
});

test("focused popover stays opposite chronology and reserves persistent application chrome", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /FOCUS_POPOVER_MARGIN = 12/);
  assert.match(source, /focusChromeInsets\(\)/);
  assert.match(source, /reserveTopChrome\(document\.querySelector\("\.app-command-bar"\)\)/);
  assert.match(source, /reserveBottomChrome\(document\.querySelector\("\.timeline-view-toolbar:popover-open"\)\)/);
  assert.match(source, /reserveBottomChrome\(document\.querySelector\("\.app-view-tool"\)\)/);
  assert.match(source, /document\.querySelector\("\.app-tool-dock"\)/);
  assert.match(source, /contextualTimelineDocked[\s\S]*viewportWidth - timelineRect\.left/);
  assert.match(source, /contextualTimelineDocked[\s\S]*viewportHeight - timelineRect\.top/);
  assert.match(source, /positionFocusPopover\(originRect = null\)/);
  assert.match(source, /void originRect/);
  assert.match(source, /this\.orientation === "vertical"[\s\S]*left = bounds\.left[\s\S]*top = mobileFocusLayout[\s\S]*bounds\.top[\s\S]*bounds\.top \+ Math\.max\(0, \(availableHeight - height\) \/ 2\)/);
  assert.match(source, /else \{[\s\S]*left = mobileFocusLayout[\s\S]*bounds\.left[\s\S]*bounds\.left \+ Math\.max\(0, \(availableWidth - width\) \/ 2\)[\s\S]*top = bounds\.top/);
  assert.doesNotMatch(source, /const targetRect = originRect/);
  assert.match(source, /transitionOriginRect = transitionOrigin\?\.getBoundingClientRect/);
  assert.match(source, /this\.positionFocusPopover\(options\.originRect/);
  assert.match(css, /data-orientation="landscape"[\s\S]*inset:[\s\S]*50%[\s\S]*translateX\(-50%\)/);
  assert.match(css, /data-orientation="portrait"[\s\S]*inset:\s*50%[\s\S]*safe-area-inset-left[\s\S]*translateY\(-50%\)/);
});

test("custom event-detail morph isolates application chrome from root cross-fade", async () => {
  const [timelineCss, styles] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(timelineCss, /::view-transition-old\(root\)[\s\S]*animation:\s*none !important[\s\S]*opacity:\s*0/);
  assert.match(timelineCss, /::view-transition-new\(root\)[\s\S]*animation:\s*none !important[\s\S]*opacity:\s*1/);
  assert.match(timelineCss, /@keyframes timeline-event-detail-emerge/);
  assert.match(timelineCss, /clip-path:\s*inset\(38% 42% round 999px\)/);
  assert.match(timelineCss, /::view-transition-old\(timeline-event-detail-shared\)[\s\S]*timeline-event-origin-out/);
  assert.match(timelineCss, /::view-transition-new\(timeline-event-detail-shared\)[\s\S]*timeline-event-detail-emerge/);
  assert.match(styles, /\.app-command-bar[\s\S]*view-transition-name:\s*timeline-command-bar/);
  assert.match(styles, /\.app-view-controls[\s\S]*view-transition-name:\s*timeline-view-controls/);
  assert.match(styles, /timeline-panel > \.story-focus[\s\S]*view-transition-name:\s*timeline-story-controls/);
  assert.match(styles, /::view-transition-group\(timeline-command-bar\)[\s\S]*animation:\s*none !important/);
});

test("focused popover content remains bounded while Relations halo can stay visually unclipped", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /timeline-focus-view\[popover\]:popover-open[\s\S]*max-inline-size:\s*calc\(100dvw - 1\.5rem\)[\s\S]*max-block-size:\s*calc\(100dvh - 1\.5rem\)/);
  assert.match(css, /\.timeline-focus-summary[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.timeline-focus-evidence[\s\S]*overflow:\s*auto/);
  assert.match(css, /timeline-focus-relations-backdrop \.temporal-graph-canvas[\s\S]*overflow:\s*visible/);
});


test("focused popover re-clamps after late content resize", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /this\.focusResizeFrame = 0/);
  assert.match(source, /new ResizeObserver\(\(entries\) => \{/);
  assert.match(source, /entries\.some\(\(entry\) => entry\.target === this\.focusView\)/);
  assert.match(source, /this\.resizeObserver\.observe\(this\.focusView\)/);
  assert.match(source, /this\.focusView\.matches\(":popover-open"\)[\s\S]*requestAnimationFrame\(\(\) => \{[\s\S]*this\.positionFocusPopover\(\)/);
  assert.match(source, /cancelAnimationFrame\(this\.focusResizeFrame\)[\s\S]*this\.focusResizeFrame = 0/);
});

test("tab transitions swap Context and Place against Evidence while Hero persists", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);
  assert.match(source, /FOCUS_TAB_CONTEXT_TRANSITION_NAME = "timeline-focus-tab-context"/);
  assert.match(source, /FOCUS_TAB_PLACE_TRANSITION_NAME = "timeline-focus-tab-place"/);
  assert.match(source, /FOCUS_TAB_EVIDENCE_TRANSITION_NAME = "timeline-focus-tab-evidence"/);
  assert.match(source, /summary\.style\.viewTransitionName = FOCUS_TAB_CONTEXT_TRANSITION_NAME/);
  assert.match(source, /place\.style\.viewTransitionName = FOCUS_TAB_PLACE_TRANSITION_NAME/);
  assert.match(source, /evidence\.style\.viewTransitionName = FOCUS_TAB_EVIDENCE_TRANSITION_NAME/);
  assert.doesNotMatch(source, /hero\.style\.viewTransitionName/);
  assert.match(source, /document\.startViewTransition\(applyTabState\)/);
  assert.match(css, /::view-transition-group\(timeline-focus-tab-context\)/);
  assert.match(css, /::view-transition-group\(timeline-focus-tab-place\)/);
  assert.match(css, /::view-transition-new\(timeline-focus-tab-evidence\)/);
});

test("focus chrome remains outside tab animation and semantic panels stay bounded", async () => {
  const [timelineCss, styles] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(timelineCss, /::view-transition-old\(root\)[\s\S]*animation:\s*none !important/);
  assert.match(timelineCss, /\.timeline-view-toolbar[\s\S]*view-transition-name:\s*timeline-view-toolbar/);
  assert.match(styles, /\.app-command-bar[\s\S]*view-transition-name:\s*timeline-command-bar/);
  assert.match(styles, /\.app-tool-dock[\s\S]*view-transition-name:\s*timeline-workspace-sidebar/);
  assert.match(timelineCss, /timeline-focus-view\[popover\] > :is\([\s\S]*timeline-focus-evidence[\s\S]*max-inline-size:\s*100%/);
  assert.match(timelineCss, /\.timeline-focus-place,[\s\S]*\.timeline-focus-relations[\s\S]*max-block-size:\s*100%/);
});


test("focused map mount stays idempotent while the graph remains in its persistent surface", async () => {
  const app = await readFile(new URL("../site/app.js", import.meta.url), "utf8");

  assert.doesNotMatch(app, /presentationGraphCanvas|mountGraphBackdrop|focusGraphSlot/);
  assert.match(app, /const moved = els\.presentationMap\.parentNode !== slot/);
  assert.match(app, /if \(moved\) slot\.replaceChildren\(els\.presentationMap\)/);
  assert.match(app, /presentationMapKey/);
  assert.match(app, /if \(presentationMap && presentationMapKey === mapKey\)/);
  assert.match(app, /requestAnimationFrame\(\(\) => presentationMap\?\.refresh\?\.\(\)\)/);
  assert.match(app, /if \(els\.graphLens\) els\.graphLens\.hidden = false/);
  assert.doesNotMatch(
    app,
    /function renderPresentationMap\(\) \{\s*destroyPresentationMap\(\)/
  );
});

test("focused popover keeps deterministic tab bands and View Transition snapshots cannot capture pointer input", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(css, /timeline-focus-view\[popover\]:popover-open[\s\S]*box-sizing:\s*border-box[\s\S]*align-content:\s*start[\s\S]*block-size:\s*auto[\s\S]*grid-auto-rows:\s*auto/);
  assert.match(css, /Focused popover tab contract[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) 104px !important/);
  assert.match(css, /timeline-focus-tabs[\s\S]*position:\s*relative[\s\S]*grid-row:\s*1 !important/);
  assert.match(css, /data-active-tab="overview"[\s\S]*timeline-focus-summary[\s\S]*grid-row:\s*2 !important/);
  assert.match(css, /data-active-tab="evidence"[\s\S]*timeline-focus-evidence[\s\S]*grid-row:\s*2 \/ span 2 !important/);
  assert.match(css, /::view-transition\s*\{[\s\S]*pointer-events:\s*none/);
});


test("focused popover chrome derives from the focused timeline event color", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(
    source,
    /this\.focusView\.style\.setProperty\("--event-color", item\.color \|\| "var\(--accent\)"\)/
  );
  assert.match(css, /--focus-chrome-color:\s*var\(--event-color, var\(--accent\)\)/);
  assert.match(css, /border-color:\s*color-mix\(in srgb, var\(--focus-chrome-color\) 72%, var\(--line-strong\)\)/);
  assert.match(css, /inset 0 3px 0 var\(--focus-chrome-color\)/);
  assert.match(css, /\.timeline-focus-tab\.is-active[\s\S]*background:\s*var\(--focus-chrome-color\)[\s\S]*color:\s*var\(--focus-chrome-contrast\)/);
  assert.match(css, /\.timeline-focus-close\.button\.primary[\s\S]*background:\s*var\(--focus-chrome-color\)/);
  assert.match(css, /\.timeline-focus-section[\s\S]*border-top-color:\s*color-mix\(in srgb, var\(--focus-chrome-color\)/);
});


test("phone focus popovers collapse to one intrinsic-safe column after the application layout contract", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 500px\)[\s\S]*\.timeline-focus-view\[popover\][\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.timeline-focus-view\[popover\] > \*[\s\S]*min-inline-size:\s*0[\s\S]*max-inline-size:\s*100%/);
  assert.match(css, /@media \(min-width: 501px\)[\s\S]*grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\) !important/);
});


test("mobile focused-event composition stays opposite chronology and keeps compact chrome", async () => {
  const [html, css, source, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(html, /id="project-menu-toggle"[^>]*aria-label="Project actions"/);
  assert.match(styles, /Phone command bar refinement/);
  assert.match(styles, /@media \(max-width: 460px\)[\s\S]*\.project-menu-toggle[\s\S]*width:\s*42px/);

  assert.match(css, /Mobile focused-event composition/);
  assert.match(css, /--mobile-focus-rail:\s*clamp\(84px, 24dvw, 108px\)/);
  assert.match(
    css,
    /data-orientation="landscape"\] > \.timeline-focus-view:popover-open[\s\S]*bottom:\s*calc\(var\(--mobile-focus-bottom\) \+ var\(--mobile-focus-rail\)/
  );
  assert.match(
    css,
    /data-orientation="portrait"\] > \.timeline-focus-view:popover-open[\s\S]*right:\s*calc\(var\(--mobile-focus-rail\)/
  );
  assert.match(css, /\.timeline-focus-hero,[\s\S]*min-height:\s*clamp\(170px, 26dvh, 230px\)/);
  assert.match(css, /timeline-focus-summary \.timeline-focus-actions[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /:is\(\.timeline-focus-place, \.timeline-focus-relations\) \.timeline-focus-section-content[\s\S]*width:\s*min\(60%, 17rem\)/);

  assert.match(source, /createElement\("button", "button primary", "Close"\)/);
  assert.match(source, /close\.setAttribute\("aria-label", "Return to timeline"\)/);
  assert.match(source, /mobileFocusLayout = bounds\.viewportWidth <= 699[\s\S]*mobileFocusRail = mobileFocusLayout[\s\S]*clamp\(bounds\.viewportWidth \* 0\.24, 84, 108\)/);
  assert.match(source, /compactAvailableWidth = mobileFocusLayout && this\.orientation === "vertical"[\s\S]*rawAvailableWidth - mobileFocusRail - mobileFocusGap/);
  assert.match(source, /compactAvailableHeight = mobileFocusLayout && this\.orientation === "horizontal"[\s\S]*availableHeight - mobileFocusRail - mobileFocusGap/);
  assert.match(source, /left = mobileFocusLayout[\s\S]*bounds\.left[\s\S]*top = bounds\.top/);
});


test("coarse-pointer phone controls preserve a 44 CSS px interaction target", async () => {
  const [styles, timelineCss] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(styles, /@media \(pointer: coarse\)[\s\S]*\.story-nav-button[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(styles, /@media \(pointer: coarse\)[\s\S]*\.range-calendar-nav[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(styles, /@media \(pointer: coarse\) and \(max-width: 460px\)[\s\S]*\.project-menu-toggle[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px/);

  assert.match(timelineCss, /@media \(pointer: coarse\)[\s\S]*\.timeline-project-menu-toggle,[\s\S]*\.story-nav-button[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(timelineCss, /@media \(pointer: coarse\)[\s\S]*\.timeline-focus-tab,[\s\S]*\.timeline-focus-close[\s\S]*min-height:\s*44px/);
  assert.match(timelineCss, /@media \(pointer: coarse\) and \(max-width: 699px\)[\s\S]*data-orientation="portrait"[\s\S]*max-width:\s*52px/);
});
