import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../site/index.html", import.meta.url);
const appUrl = new URL("../site/app.ts", import.meta.url);
const shellUrl = new URL("../site/spatial-shell.css", import.meta.url);
const worldUrl = new URL("../site/world/deck-world-surface.ts", import.meta.url);
const factoryUrl = new URL("../site/world/world-view-factory.ts", import.meta.url);

test("footer keeps primary workspace commands direct and moves dense View controls into one utility surface", async () => {
  const [index, app, world, factory] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
  ]);

  assert.match(
    index,
    /id="timeline-view-controls-toggle"[^>]*popovertarget="timeline-view-controls"[^>]*aria-label="View options"/,
  );
  assert.match(
    index,
    /id="timeline-view-controls" class="app-view-controls" popover="auto"/,
  );
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
    /id="timeline-related-zoom"[^>]*data-semantic-icon="zoom-in"[^>]*aria-controls="temporal-graph-view"/,
  );
  assert.match(
    index,
    /id="timeline-related-fit"[^>]*data-semantic-icon="fit"[^>]*aria-controls="temporal-graph-view"/,
  );
  assert.doesNotMatch(index, /app-footer-world" data-world-controls-slot/);
  assert.doesNotMatch(index, /id="timeline-view-toolbar" class="app-footer-zone/);
  assert.doesNotMatch(index, /timeline-focus-edit/);
  assert.match(app, /els\.focusPrev\.hidden = !focused/);
  assert.match(app, /els\.focusNext\.hidden = !focused/);
  assert.match(app, /focusAdjacent\(-1, \{ reference: "viewport" \}\)/);
  assert.match(app, /focusAdjacent\(1, \{ reference: "viewport" \}\)/);
  assert.equal((index.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.match(world, /element\.className = "toolbar-control world-camera-control"/);
  assert.match(factory, /element\.className = "toolbar-control world-layout-control"/);
});

test("the dock preserves 44px direct commands while View owns secondary controls", async () => {
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
    /\.app-footer-bar \.toolbar-control:is\(:focus-visible, :focus-within\)/,
  );

  for (const id of [
    "project-menu-toggle",
    "editor-toggle",
    "timeline-browser-toggle",
    "occurrence-composer-toggle",
    "timeline-view-controls-toggle",
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

  const footerStart = index.indexOf('<nav class="app-tool-dock app-footer-bar"');
  const viewStart = index.indexOf('id="timeline-view-controls"');
  assert.ok(footerStart >= 0 && viewStart > footerStart);
  const directDockMarkup = index.slice(footerStart, viewStart);
  assert.doesNotMatch(directDockMarkup, /id="timeline-orientation-toggle"/);
  assert.doesNotMatch(directDockMarkup, /id="timeline-zoom-level"/);
  assert.doesNotMatch(directDockMarkup, /data-world-controls-slot/);

  const viewEnd = index.indexOf("</nav>", viewStart);
  const viewMarkup = index.slice(viewStart, viewEnd);
  assert.equal(
    (viewMarkup.match(/data-view-control/g) ?? []).length,
    (index.match(/data-view-control/g) ?? []).length,
    "secondary View controls belong to the View utility surface",
  );
  assert.match(css, /\.app-view-controls\[popover\]/);
  assert.equal((index.match(/id="editor-toggle"/g) ?? []).length, 1);
});

test("narrow dock is fixed-width content rather than a horizontally scrolling command shelf", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*overflow-x:\s*clip/,
  );
  assert.doesNotMatch(
    css,
    /@media \(max-width: 699px\)[\s\S]{0,2200}\.app-tool-dock\.app-footer-bar[\s\S]{0,500}overflow-x:\s*auto/,
  );
  assert.match(
    css,
    /\.app-footer-actions\s*\{[\s\S]*justify-content:\s*center/,
  );
  assert.match(
    css,
    /\.app-footer-timeline\.timeline-local-toolbar\s*\{[\s\S]*overflow:\s*visible/,
  );
  assert.match(
    css,
    /\.app-view-controls \.world-camera-controls[\s\S]*flex-direction:\s*row/,
  );
});
