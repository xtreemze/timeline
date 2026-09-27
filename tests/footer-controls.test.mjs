import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../site/index.html", import.meta.url);
const appUrl = new URL("../site/app.ts", import.meta.url);
const shellUrl = new URL("../site/spatial-shell.css", import.meta.url);
const worldUrl = new URL("../site/world/deck-world-surface.ts", import.meta.url);
const factoryUrl = new URL("../site/world/world-view-factory.ts", import.meta.url);

test("footer owns one persistent View group and one Edit action", async () => {
  const [index, app, world, factory] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
  ]);

  assert.match(
    index,
    /app-footer-timeline timeline-local-toolbar" role="group" aria-label="Timeline and view controls"/,
  );
  assert.match(
    index,
    /id="timeline-view-toolbar" class="app-footer-zone app-footer-timeline timeline-local-toolbar" role="group"/,
  );
  assert.match(
    index,
    /app-footer-world" data-world-controls-slot role="group" aria-label="World view controls"/,
  );
  assert.match(
    index,
    /id="timeline-related-zoom"[^>]*data-semantic-icon="zoom-in"[^>]*aria-controls="temporal-graph-view"/,
  );
  assert.match(
    index,
    /id="timeline-related-fit"[^>]*data-semantic-icon="fit"[^>]*aria-controls="temporal-graph-view"/,
  );
  assert.doesNotMatch(index, /app-view-controls|app-footer-view-controls|view-display-controls/);
  assert.doesNotMatch(index, /id="timeline-view-toolbar"[^>]*popover=/);
  assert.doesNotMatch(index, /timeline-view-controls-toggle/);
  assert.doesNotMatch(index, /timeline-focus-edit/);
  assert.doesNotMatch(index, /id="timeline-focus-prev"[^>]*\shidden(?:\s|>)/);
  assert.doesNotMatch(index, /id="timeline-focus-next"[^>]*\shidden(?:\s|>)/);
  assert.match(app, /els\.focusPrev\.hidden = false/);
  assert.match(app, /els\.focusNext\.hidden = false/);
  assert.match(app, /els\.focusPrev\.disabled = false/);
  assert.match(app, /els\.focusNext\.disabled = false/);
  assert.match(app, /focusAdjacent\(-1, \{ reference: "viewport" \}\)/);
  assert.match(app, /focusAdjacent\(1, \{ reference: "viewport" \}\)/);
  assert.equal((index.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.doesNotMatch(index, /id="editor-toggle"[^>]*aria-pressed=/);
  assert.doesNotMatch(app, /timelinefocusedit|createFocusEditButton/);
  assert.doesNotMatch(app, /editorToggle\.setAttribute\("aria-pressed"/);
  assert.match(app, /const focusedId = timelineView\?\.focusedItemId\?\.\(\) \|\| null/);
  assert.match(world, /element\.className = "toolbar-control world-camera-control"/);
  assert.match(factory, /element\.className = "toolbar-control world-layout-control"/);
});

test("every footer button shares the canonical 44px toolbar-control contract", async () => {
  const [index, css] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(shellUrl, "utf8"),
  ]);

  assert.match(css, /--toolbar-control-size:\s*44px/);
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control\s*\{[\s\S]*inline-size:\s*var\(--toolbar-control-size\)[\s\S]*block-size:\s*var\(--toolbar-control-size\)/,
  );
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control:focus-visible,[\s\S]*outline:\s*2px solid var\(--focus\)[\s\S]*outline-offset:\s*-3px/,
  );
  assert.doesNotMatch(css, /\.app-footer-view-controls\.timeline-view-toolbar/);
  assert.doesNotMatch(css, /\.timeline-local-button/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-wide/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-value/);
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control:is\(:focus-visible, :focus-within\)/,
  );

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

  assert.match(
    index,
    /class="toolbar-control toolbar-control-wide toolbar-range-control"[\s\S]*id="timeline-zoom-level" data-view-control/,
  );
  assert.match(
    index,
    /class="toolbar-control toolbar-control-value toolbar-number-control"[\s\S]*id="timeline-auto-seconds" data-view-control/,
  );

  const toolbarStart = index.indexOf('id="timeline-view-toolbar"');
  const toolbarEnd = index.indexOf("</nav>", toolbarStart);
  const toolbarMarkup = index.slice(toolbarStart, toolbarEnd);
  assert.ok(toolbarStart >= 0 && toolbarEnd > toolbarStart);
  assert.equal(
    (toolbarMarkup.match(/data-view-control/g) ?? []).length,
    (index.match(/data-view-control/g) ?? []).length,
    "every View control must live directly in the persistent toolbar",
  );
  assert.doesNotMatch(index, /timeline-focus-view[\s\S]{0,4000}data-view-control/);
  assert.equal((index.match(/id="editor-toggle"/g) ?? []).length, 1);
});


test("narrow footer has one scroll owner and uniform in-flow controls", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto/,
  );
  assert.match(
    css,
    /#app-shell \.app-footer-bar \.app-footer-zone\s*\{[\s\S]*overflow:\s*visible/,
  );
  assert.match(
    css,
    /\.app-footer-bar[\s\S]*\.toolbar-control[\s\S]*position:\s*static[\s\S]*block-size:\s*var\(--toolbar-control-size\)/,
  );
  assert.match(
    css,
    /\.toolbar-control:not\(\.toolbar-control-wide\):not\(\.toolbar-control-value\)[\s\S]*inline-size:\s*var\(--toolbar-control-size\)/,
  );
  assert.match(
    css,
    /\.app-footer-world \.world-camera-controls\s*\{[\s\S]*position:\s*static[\s\S]*inset:\s*auto[\s\S]*flex-direction:\s*row[\s\S]*background:\s*transparent[\s\S]*box-shadow:\s*none/,
  );
});
