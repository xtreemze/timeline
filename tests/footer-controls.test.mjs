import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../site/index.html", import.meta.url);
const shellUrl = new URL("../site/spatial-shell.css", import.meta.url);
const worldUrl = new URL("../site/world/deck-world-surface.ts", import.meta.url);
const factoryUrl = new URL("../site/world/world-view-factory.ts", import.meta.url);

test("footer exposes view controls directly and keeps one primary Edit entry", async () => {
  const [index, world, factory] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
  ]);

  assert.match(
    index,
    /id="timeline-view-controls" class="app-footer-zone app-footer-view" role="group" aria-label="View controls"/,
  );
  assert.doesNotMatch(index, /id="timeline-view-controls-toggle"/);
  assert.doesNotMatch(index, /id="timeline-view-controls"[^>]*popover/);
  assert.match(
    index,
    /id="timeline-view-toolbar" class="view-control-group timeline-local-toolbar" role="group" aria-label="Timeline view controls"/,
  );
  assert.match(
    index,
    /data-world-controls-slot role="group" aria-label="World view controls"/,
  );
  assert.match(
    index,
    /id="timeline-related-zoom"[^>]*data-view-control[^>]*data-semantic-icon="relation"[^>]*data-semantic-icon-secondary="zoom-in"/,
  );
  assert.match(
    index,
    /id="timeline-related-fit"[^>]*data-view-control[^>]*data-semantic-icon="relation"[^>]*data-semantic-icon-secondary="fit"/,
  );

  const footerStart = index.indexOf('<nav class="app-tool-dock app-footer-bar"');
  const footerEnd = index.indexOf("</nav>", footerStart);
  const footerMarkup = index.slice(footerStart, footerEnd);
  assert.equal((footerMarkup.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.equal((footerMarkup.match(/id="occurrence-composer-toggle"/g) ?? []).length, 0);
  assert.match(index, /id="occurrence-composer-toggle"[^>]*aria-controls="occurrence-composer"/);

  assert.match(world, /element\.className = "toolbar-control world-camera-control"/);
  assert.match(world, /element\.dataset\.viewControl = ""/);
  assert.match(world, /createCompoundIcon\("world", icon, \{ size: 20 \}\)/);
  assert.match(world, /button\("Show whole globe", "world"/);
  assert.match(factory, /element\.className = "toolbar-control world-layout-control"/);
  assert.match(factory, /element\.dataset\.viewControl = ""/);
  assert.match(factory, /createCompoundIcon\("world", icon, \{ size: 20 \}\)/);
  assert.match(factory, /"dag",[\s\S]*actions\.reorganizeDag/);
  assert.match(factory, /"force",[\s\S]*actions\.relaxForce/);
});

test("all footer buttons and compound controls share the canonical toolbar surface", async () => {
  const [index, css] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(shellUrl, "utf8"),
  ]);

  assert.match(css, /--toolbar-control-size:\s*44px/);
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control\s*\{[\s\S]*inline-size:\s*var\(--toolbar-control-size\)[\s\S]*block-size:\s*var\(--toolbar-control-size\)[\s\S]*border:\s*1px solid color-mix/,
  );
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control:is\(:focus-visible, :focus-within\)/,
  );
  assert.match(css, /\.app-footer-bar \.toolbar-control-wide/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-value/);

  for (const id of [
    "project-menu-toggle",
    "editor-toggle",
    "timeline-browser-toggle",
    "timeline-focus-prev",
    "timeline-focus-next",
    "timeline-related-zoom",
    "timeline-related-fit",
    "timeline-orientation-toggle",
    "presentation-fullscreen-toggle",
    "timeline-auto-toggle",
  ]) {
    assert.match(index, new RegExp(`id="${id}" class="[^"]*toolbar-control`));
  }

  assert.equal((index.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.doesNotMatch(index, /id="timeline-view-controls-toggle"/);
});

test("narrow toolbar scrolls horizontally instead of hiding direct controls", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*overflow-x:\s*auto/,
  );
  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*justify-content:\s*flex-start/,
  );
  assert.match(
    css,
    /\.app-footer-view \.world-camera-controls[\s\S]*flex-wrap:\s*nowrap/,
  );
  assert.doesNotMatch(css, /\.app-view-controls\[popover\]/);
  assert.doesNotMatch(css, /#timeline-view-controls-toggle/);
  assert.match(css, /@media \(max-width: 699px\)[\s\S]*\.app-footer-actions[\s\S]*order:\s*1/);
  assert.match(css, /@media \(max-width: 699px\)[\s\S]*\.app-footer-timeline[\s\S]*order:\s*2/);
  assert.match(css, /@media \(max-width: 699px\)[\s\S]*\.app-footer-view[\s\S]*order:\s*3/);
  assert.match(css, /scroll-padding-inline:[\s\S]*safe-area-inset-left[\s\S]*safe-area-inset-right/);
});


test("toolbar compound icon contract preserves scoped meaning and proportional outlines", async () => {
  const [index, presentation, css] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(new URL("../site/event-presentation.ts", import.meta.url), "utf8"),
    readFile(shellUrl, "utf8"),
  ]);

  assert.match(index, /id="editor-toggle"[^>]*data-semantic-icon="timeline"[^>]*data-semantic-icon-secondary="edit"/);
  assert.match(index, /id="timeline-browser-toggle"[^>]*data-semantic-icon="timeline"[^>]*data-semantic-icon-secondary="search"/);
  assert.match(index, /id="timeline-orientation-toggle"[^>]*data-semantic-icon="timeline"[^>]*data-semantic-icon-secondary="portrait"/);
  assert.match(index, /id="timeline-auto-toggle"[^>]*data-semantic-icon="timeline"[^>]*data-semantic-icon-secondary="play"/);
  assert.match(presentation, /export function createCompoundIcon/);
  assert.match(presentation, /const primarySize = Math\.max\(12, Math\.round\(size \* 0\.86\)\)/);
  assert.match(presentation, /secondary\.setAttribute\("stroke-width",[\s\S]*primarySize[\s\S]*secondarySize/);
  assert.match(css, /\.compound-semantic-icon-secondary[\s\S]*--compound-icon-secondary-size/);
});


test("every persistent toolbar button family has an executable interaction path", async () => {
  const [index, app, timeline, world, factory, investigation] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
    readFile(new URL("../site/ui/investigation-workspace.ts", import.meta.url), "utf8"),
  ]);

  assert.match(index, /id="project-menu-toggle"[^>]*popovertarget="project-menu"/);
  assert.match(app, /editorToggle\?\.addEventListener\("click"[\s\S]*setEditorSurfaceOpen/);
  assert.match(app, /browserToggle\?\.addEventListener\("click"[\s\S]*setBrowserSurfaceOpen/);
  assert.match(app, /focusPrev\.addEventListener\("click"[\s\S]*focusAdjacent\(-1/);
  assert.match(app, /focusNext\.addEventListener\("click"[\s\S]*focusAdjacent\(1/);
  assert.match(app, /relatedZoom\.addEventListener\("click"[\s\S]*zoomContext/);
  assert.match(app, /relatedFit\.addEventListener\("click"[\s\S]*fitContext/);
  assert.match(app, /presentationFullscreenToggle\.addEventListener\("click"[\s\S]*togglePresentationFullscreen/);
  assert.match(app, /function presentationFullscreenAvailable\([\s\S]*document\.fullscreenEnabled[\s\S]*requestFullscreen/);
  assert.match(app, /Full-screen presentation unavailable/);
  assert.match(app, /projectMenu\?\.addEventListener\("toggle"[\s\S]*Close project actions/);
  assert.match(app, /autoToggle\.addEventListener\("click"[\s\S]*toggle-auto/);
  assert.match(timeline, /orientationToggle\?\.addEventListener\("click"[\s\S]*setOrientation/);
  assert.match(world, /world-camera-control[\s\S]*addEventListener\("click"[\s\S]*action\(\)/);
  assert.match(factory, /world-layout-control[\s\S]*addEventListener\("click"[\s\S]*action\(\)/);
  assert.match(investigation, /toggle\.addEventListener\("click"[\s\S]*onRequestOpen\(!open\)/);
  assert.match(investigation, /Close investigation methodology/);
});
