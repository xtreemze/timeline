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
  assert.match(index, /data-world-controls-slot role="group" aria-label="World view controls"/);
  assert.match(
    index,
    /id="timeline-focus-context-controls" hidden[\s\S]*id="timeline-related-zoom"[^>]*data-semantic-icon="zoom-in"[^>]*aria-label="Zoom to related nodes"[^>]*title="Zoom to related nodes"/,
  );
  assert.match(
    index,
    /id="timeline-related-fit"[^>]*data-semantic-icon="fit"[^>]*aria-label="Fit related nodes in world view"[^>]*title="Fit related nodes in world view"/,
  );

  const footerStart = index.indexOf('<nav class="app-tool-dock app-footer-bar"');
  const footerEnd = index.indexOf("</nav>", footerStart);
  const footerMarkup = index.slice(footerStart, footerEnd);
  assert.equal((footerMarkup.match(/id="editor-toggle"/g) ?? []).length, 1);
  assert.equal((footerMarkup.match(/id="occurrence-composer-toggle"/g) ?? []).length, 0);
  assert.equal((footerMarkup.match(/id="timeline-focus-prev"/g) ?? []).length, 0);
  assert.equal((footerMarkup.match(/id="timeline-focus-next"/g) ?? []).length, 0);
  assert.equal((footerMarkup.match(/id="timeline-related-zoom"/g) ?? []).length, 0);
  assert.equal((footerMarkup.match(/id="timeline-related-fit"/g) ?? []).length, 0);
  assert.match(
    footerMarkup,
    /<luum-occurrence-composer id="occurrence-composer"><\/luum-occurrence-composer>/,
  );
  assert.doesNotMatch(index, /id="occurrence-composer-toggle"/);

  assert.match(world, /element\.className = "toolbar-control world-camera-control"/);
  assert.match(world, /element\.dataset\.viewControl = ""/);
  assert.match(world, /createIcon\(icon, \{ size: 20 \}\)/);
  assert.match(world, /button\("Show whole world", "world"/);
  assert.doesNotMatch(world, /button\("Show whole world", "home"/);
  assert.match(world, /className = "toolbar-compound-control world-zoom-control"/);
  assert.match(world, /className = "world-zoom-slider"/);
  assert.match(world, /slider\.min = String\(WORLD_CAMERA_MIN_ZOOM\)/);
  assert.match(world, /slider\.max = String\(WORLD_CAMERA_MAX_ZOOM\)/);
  assert.match(world, /slider\.step = "0\.1"/);
  assert.match(world, /button\("Zoom out", "zoom-out"/);
  assert.match(world, /button\("Zoom in", "zoom-in"/);
  assert.match(world, /#syncZoomControls\(\)/);
  assert.match(world, /#publishCameraContext\(\)[\s\S]*#syncZoomControls\(\)/);
  assert.match(factory, /element\.className = "toolbar-control world-layout-control"/);
  assert.match(factory, /element\.dataset\.viewControl = ""/);
  assert.match(factory, /createIcon\(icon, \{ size: 20 \}\)/);
  assert.match(factory, /"Arrange relationships",[\s\S]*"relation",[\s\S]*actions\.reorganizeDag/);
  assert.match(factory, /"Settle relationships",[\s\S]*"force",[\s\S]*actions\.relaxForce/);
  assert.doesNotMatch(factory, /"Reorganize relationship layout",[\s\S]*"dag"/);
});

test("all footer buttons and controls share the canonical toolbar surface", async () => {
  const [index, css] = await Promise.all([readFile(indexUrl, "utf8"), readFile(shellUrl, "utf8")]);

  assert.match(css, /--toolbar-control-size:\s*44px/);
  assert.match(
    css,
    /\.app-footer-bar :is\(\.toolbar-control, \.toolbar-compound-control\)\s*\{[\s\S]*block-size:\s*var\(--toolbar-control-size\)[\s\S]*border:\s*1px solid color-mix/,
  );
  assert.match(
    css,
    /:is\(\.toolbar-control, \.toolbar-compound-control\):is\(:focus-visible, :focus-within\)/,
  );
  assert.match(css, /\.toolbar-control:is\(\[aria-expanded="true"\], \[aria-pressed="true"\]\)/);
  const activeControlRule =
    css.match(
      /\.app-footer-bar \.toolbar-control:is\(\[aria-expanded="true"\], \[aria-pressed="true"\]\)\s*\{([\s\S]*?)\}/,
    )?.[1] ?? "";
  assert.doesNotMatch(
    activeControlRule,
    /var\(--focus\)/,
    "pressed/expanded is application state, not keyboard focus",
  );
  assert.match(activeControlRule, /var\(--ink\)/);
  assert.match(css, /\.app-footer-bar \.toolbar-control:disabled[\s\S]*opacity:\s*0\.42/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-wide/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-value/);
  assert.match(index, /id="project-menu-toggle"[^>]*data-semantic-icon="folder"/);
  assert.doesNotMatch(index, /id="project-menu-toggle"[\s\S]{0,420}<img\s+src="\.\/icon\.svg"/);
  assert.match(
    index,
    /class="toolbar-compound-control toolbar-control-wide toolbar-range-control"/,
  );
  assert.match(
    index,
    /class="toolbar-compound-control toolbar-control-value toolbar-number-control"/,
  );

  for (const id of [
    "project-menu-toggle",
    "editor-toggle",
    "timeline-browser-toggle",
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
  assert.match(css, /\.app-footer-view \.world-camera-controls[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(
    css,
    /\.app-footer-view \.world-zoom-control[\s\S]*grid-template-columns:[\s\S]*var\(--toolbar-control-size\)[\s\S]*var\(--toolbar-control-size\)/,
  );
  assert.match(
    css,
    /\.app-footer-view \.world-zoom-slider[\s\S]*block-size:\s*var\(--toolbar-control-size\)/,
  );
  assert.doesNotMatch(css, /\.app-view-controls\[popover\]/);
  assert.doesNotMatch(css, /#timeline-view-controls-toggle/);
  assert.doesNotMatch(css, /\.app-footer-(?:actions|timeline|view)[\s\S]{0,120}order:\s*[123]/);
  assert.match(
    css,
    /scroll-padding-inline:[\s\S]*safe-area-inset-left[\s\S]*safe-area-inset-right/,
  );
});

test("toolbar actions use one direct semantic icon with explicit tooltips", async () => {
  const [index, presentation, css, world, factory, timeline] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(new URL("../site/event-presentation.ts", import.meta.url), "utf8"),
    readFile(shellUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  for (const [id, icon, label] of [
    ["project-menu-toggle", "folder", "Project actions"],
    ["editor-toggle", "edit", "Edit timeline"],
    ["timeline-browser-toggle", "search", "Browse timeline"],
    ["timeline-orientation-toggle", "portrait", "Switch to portrait timeline"],
    ["timeline-auto-toggle", "play", "Play slideshow"],
  ]) {
    assert.match(
      index,
      new RegExp(
        `id="${id}"[^>]*data-semantic-icon="${icon}"[^>]*aria-label="${label}"[^>]*title="${label}"`,
      ),
    );
  }

  assert.match(presentation, /folder:\s*\[/);
  assert.doesNotMatch(index, /data-semantic-icon-secondary/);
  assert.doesNotMatch(presentation, /createCompoundIcon/);
  assert.doesNotMatch(css, /compound-semantic-icon/);
  assert.doesNotMatch(world, /createCompoundIcon/);
  assert.doesNotMatch(factory, /createCompoundIcon/);
  assert.doesNotMatch(timeline, /createCompoundIcon|semanticIconSecondary/);
  assert.match(world, /element\.setAttribute\("aria-label", label\)[\s\S]*element\.title = label/);
  assert.match(
    factory,
    /element\.setAttribute\("aria-label", label\)[\s\S]*element\.title = title/,
  );
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
  assert.match(
    app,
    /function revealFocusedToolbarNavigation\([\s\S]*max-width: 699px[\s\S]*appToolDock\.scrollLeft/,
  );
  assert.match(app, /relatedZoom\.addEventListener\("click"[\s\S]*zoomContext/);
  assert.match(app, /relatedFit\.addEventListener\("click"[\s\S]*fitContext/);
  assert.match(
    app,
    /presentationFullscreenToggle\.addEventListener\("click"[\s\S]*togglePresentationFullscreen/,
  );
  assert.match(
    app,
    /function presentationFullscreenAvailable\([\s\S]*document\.fullscreenEnabled[\s\S]*requestFullscreen/,
  );
  assert.match(app, /Full-screen presentation unavailable/);
  assert.match(app, /projectMenu\?\.addEventListener\("toggle"[\s\S]*Close project actions/);
  assert.match(app, /autoToggle\.addEventListener\("click"[\s\S]*toggle-auto/);
  assert.match(timeline, /orientationToggle\?\.addEventListener\("click"[\s\S]*setOrientation/);
  assert.match(world, /world-camera-control[\s\S]*addEventListener\("click"[\s\S]*action\(\)/);
  assert.match(factory, /world-layout-control[\s\S]*addEventListener\("click"[\s\S]*action\(\)/);
  assert.match(investigation, /toggle\.addEventListener\("click"[\s\S]*onRequestOpen\(!open\)/);
  assert.match(investigation, /Close investigation methodology/);
});
