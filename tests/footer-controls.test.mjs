import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../site/index.html", import.meta.url);
const shellUrl = new URL("../site/spatial-shell.css", import.meta.url);
const worldUrl = new URL("../site/world/deck-world-surface.ts", import.meta.url);
const factoryUrl = new URL("../site/world/world-view-factory.ts", import.meta.url);
const layoutInspectorUrl = new URL("../site/world/world-layout-inspector.ts", import.meta.url);
const composerUrl = new URL("../site/components/occurrence-composer.ts", import.meta.url);

test("footer exposes view controls directly and keeps one primary Edit entry", async () => {
  const [index, world, factory, layoutInspector] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
    readFile(layoutInspectorUrl, "utf8"),
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
  assert.match(
    world,
    /className = "toolbar-compound-control toolbar-zoom-control world-zoom-control"/,
  );
  assert.match(world, /className = "toolbar-zoom-slider world-zoom-slider"/);
  assert.match(
    world,
    /classList\.add\("toolbar-zoom-endpoint-button", "world-zoom-endpoint-button"\)/,
  );
  assert.match(world, /slider\.min = String\(WORLD_CAMERA_MIN_ZOOM\)/);
  assert.match(world, /slider\.max = String\(WORLD_CAMERA_MAX_ZOOM\)/);
  assert.match(world, /slider\.step = "0\.1"/);
  assert.match(world, /button\("Zoom out", "zoom-out"/);
  assert.match(world, /button\("Zoom in", "zoom-in"/);
  assert.match(
    index,
    /id="timeline-zoom-out"[^>]*class="toolbar-control toolbar-zoom-endpoint-button timeline-zoom-endpoint-button"[^>]*data-semantic-icon="zoom-out"[^>]*aria-label="Zoom timeline out"[^>]*title="Zoom timeline out"/,
  );
  assert.match(
    index,
    /id="timeline-zoom-level"[^>]*class="toolbar-zoom-slider timeline-zoom-slider"[^>]*aria-label="Timeline zoom level"/,
  );
  assert.match(
    index,
    /id="timeline-zoom-in"[^>]*class="toolbar-control toolbar-zoom-endpoint-button timeline-zoom-endpoint-button"[^>]*data-semantic-icon="zoom-in"[^>]*aria-label="Zoom timeline in"[^>]*title="Zoom timeline in"/,
  );
  assert.doesNotMatch(index, /<span class="timeline-zoom-endpoint"/);
  assert.match(world, /#syncZoomControls\(\)/);
  assert.match(world, /#publishCameraContext\(\)[\s\S]*#syncZoomControls\(\)/);
  assert.match(layoutInspector, /element\.className = "toolbar-control world-layout-control"/);
  assert.match(layoutInspector, /element\.dataset\.viewControl = ""/);
  assert.match(layoutInspector, /createIcon\(options\.icon, \{ size: 20 \}\)/);
  assert.match(
    layoutInspector,
    /label: "Arrange relationships"[\s\S]*icon: "dag"[\s\S]*primaryAction: \(\) => actions\.reorganizeDag\(\{\}\)/,
  );
  assert.match(
    layoutInspector,
    /label: "Settle relationships"[\s\S]*icon: "refresh"[\s\S]*primaryAction: actions\.relaxForce/,
  );
  assert.match(factory, /createWorldLayoutControls\(root\.ownerDocument/);
  assert.doesNotMatch(factory, /function createWorldLayoutControls\(/);
});

test("graph layout buttons expose advanced options with input-modality parity and place scope", async () => {
  const [inspector, css] = await Promise.all([
    readFile(layoutInspectorUrl, "utf8"),
    readFile(shellUrl, "utf8"),
  ]);

  assert.match(inspector, /const LONG_PRESS_MS = 500/);
  assert.match(
    inspector,
    /addEventListener\("pointerdown"[\s\S]*setTimeout\(open, LONG_PRESS_MS\)/,
  );
  assert.match(inspector, /addEventListener\("contextmenu"[\s\S]*open\(\)/);
  assert.match(
    inspector,
    /event\.key === "ArrowDown"[\s\S]*event\.key === "F10" && event\.shiftKey/,
  );
  assert.match(inspector, /aria-haspopup", "dialog"/);
  assert.match(
    inspector,
    /getSelectedPlaceId\(\)[\s\S]*state\.scope\.value = placeId === null \? "global" : "place"/,
  );

  assert.match(inspector, /"sugiyama", "Sugiyama · layered"/);
  assert.match(inspector, /"zherebko", "Zherebko · linear"/);
  assert.match(inspector, /"grid", "Grid · topological"/);
  assert.match(inspector, /"longest-opt-greedy", "Longest path \+ optimal decross"/);
  assert.match(inspector, /"longest-two-layer-greedy", "Longest path \+ two-layer"/);
  assert.match(inspector, /"simplex-two-layer-greedy", "Simplex \+ two-layer"/);
  assert.match(inspector, /"greedy", "Greedy"/);
  assert.match(inspector, /"simplex", "Simplex"/);
  assert.match(inspector, /"quad", "Quadratic"/);
  assert.match(inspector, /"center", "Centered"/);
  assert.match(inspector, /"routed", "D3 routed"/);
  assert.match(inspector, /"curved", "Curved"/);
  assert.match(inspector, /"straight", "Straight"/);
  assert.match(inspector, /"orthogonal", "Orthogonal"/);
  assert.match(inspector, /"top-to-bottom", "Top → bottom"/);
  assert.match(inspector, /"left-to-right", "Left → right"/);
  assert.match(
    inspector,
    /algorithm\.select\.value === "sugiyama"[\s\S]*strategy\.select\.disabled = !sugiyama[\s\S]*coordinate\.select\.disabled = !sugiyama/,
  );

  for (const label of [
    "Center force",
    "Center strength",
    "Center east",
    "Center north",
    "Collide force",
    "Collision strength",
    "Collision passes",
    "Connectivity clearance",
    "Link force",
    "Link strength",
    "Link distance ×",
    "Link passes",
    "Repulsion",
    "Place attraction",
    "DAG guidance",
  ]) {
    assert.match(inspector, new RegExp(label));
  }
  assert.match(inspector, /"Collision radius", "Rendered node \+ border · fixed"/);
  assert.match(inspector, /collision radius stays exact/);
  assert.match(inspector, /linkDistanceScale: Number\(linkDistance\.input\.value\)/);
  assert.match(inspector, /linkIterations: Number\(linkIterations\.input\.value\)/);
  assert.match(inspector, /centerStrength: Number\(centerStrength\.input\.value\)/);
  assert.match(
    inspector,
    /addEventListener\("pointermove"[\s\S]*Math\.hypot[\s\S]*> 8[\s\S]*clearTimer\(\)/,
  );
  assert.match(css, /\.world-layout-inspector\s*\{[\s\S]*position:\s*fixed[\s\S]*z-index:\s*2200/);
});
test("footer zoom controls neutralize legacy timeline grid geometry", async () => {
  const [shellCss, timelineCss] = await Promise.all([
    readFile(shellUrl, "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    shellCss,
    /\.app-footer-view \.toolbar-zoom-control\s*\{[\s\S]*grid-template-rows:\s*var\(--toolbar-control-size\)[\s\S]*gap:\s*0/,
  );
  assert.doesNotMatch(timelineCss, /(^|\n)\.timeline-zoom-control\s*\{/);
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="landscape"\] \.timeline-zoom-control\s*\{/,
  );
});

test("all footer buttons and controls share the canonical toolbar surface", async () => {
  const [index, css] = await Promise.all([readFile(indexUrl, "utf8"), readFile(shellUrl, "utf8")]);
  assert.match(css, /--toolbar-control-size:\s*44px/);
  assert.match(css, /--toolbar-icon-size:\s*20px/);
  assert.match(css, /--toolbar-slider-track-size:\s*4px/);
  assert.match(css, /--toolbar-slider-thumb-size:\s*18px/);
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
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control\s*\{[\s\S]*grid-template:\s*1fr \/ 1fr[\s\S]*gap:\s*0/,
  );
  assert.match(
    css,
    /\.app-footer-bar \.toolbar-control > \.semantic-icon\s*\{[\s\S]*inline-size:\s*var\(--toolbar-icon-size\)[\s\S]*block-size:\s*var\(--toolbar-icon-size\)/,
  );
  assert.doesNotMatch(css, /\.app-footer-bar \.toolbar-control-wide/);
  assert.doesNotMatch(css, /\.app-footer-bar \.toolbar-range-control/);
  assert.match(css, /\.app-footer-bar \.toolbar-control-value/);
  assert.match(index, /id="project-menu-toggle"[^>]*data-semantic-icon="folder"/);
  assert.doesNotMatch(index, /id="project-menu-toggle"[\s\S]{0,420}<img\s+src="\.\/icon\.svg"/);
  assert.match(
    index,
    /class="toolbar-compound-control toolbar-zoom-control timeline-zoom-control"/,
  );
  assert.doesNotMatch(index, /toolbar-control-wide|toolbar-range-control/);
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

test("narrow toolbar keeps the composer and controls in one horizontal command strip", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(
    css,
    /@media \(max-width: 699px\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto[\s\S]*touch-action:\s*pan-x/,
  );
  assert.match(
    css,
    /#occurrence-composer:not\(\[active\]\)[\s\S]*order:\s*2[\s\S]*flex:\s*0 0 260px/,
  );
  assert.match(
    css,
    /#occurrence-composer\[active\][\s\S]*order:\s*2[\s\S]*flex:\s*0 0 auto[\s\S]*inline-size:\s*max-content[\s\S]*min-inline-size:\s*100dvi/,
  );
  assert.match(
    css,
    /#app-shell:has\(#occurrence-composer\[active\]\)[\s\S]*\.app-footer-view[\s\S]*order:\s*3[\s\S]*flex:\s*0 0 auto[\s\S]*overflow:\s*visible/,
  );
  assert.match(
    css,
    /#app-shell:has\(#occurrence-composer\[active\]\)[\s\S]*\.app-tool-dock\.app-footer-bar[\s\S]*z-index:\s*2300[\s\S]*isolation:\s*isolate[\s\S]*inset-inline:\s*0[\s\S]*transform:\s*none[\s\S]*backdrop-filter:\s*none/,
  );

  assert.match(css, /\.app-footer-view \.world-camera-controls[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(
    css,
    /\.app-footer-view > \.view-control-group\s*\{[\s\S]*flex:\s*0 0 auto[\s\S]*min-inline-size:\s*max-content/,
  );
  assert.match(
    css,
    /\.app-footer-view \.toolbar-zoom-control[\s\S]*var\(--toolbar-zoom-track-width\)[\s\S]*max-inline-size:/,
  );
  assert.match(
    css,
    /\.app-footer-view \.toolbar-zoom-slider\s*\{[\s\S]*appearance:\s*none[\s\S]*block-size:\s*var\(--toolbar-control-size\)/,
  );
  assert.match(
    css,
    /\.toolbar-zoom-slider::-webkit-slider-runnable-track[\s\S]*var\(--toolbar-slider-track-size\)/,
  );
  assert.match(
    css,
    /\.toolbar-zoom-slider::-webkit-slider-thumb[\s\S]*var\(--toolbar-slider-thumb-size\)/,
  );
  assert.match(css, /\.app-footer-view \.toolbar-zoom-endpoint-button/);
  assert.doesNotMatch(css, /\.app-view-controls\[popover\]/);
  assert.doesNotMatch(css, /#timeline-view-controls-toggle/);
});

test("toolbar actions use one direct semantic icon with explicit tooltips", async () => {
  const [index, presentation, css, world, factory, layoutInspector, timeline] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(new URL("../site/event-presentation.ts", import.meta.url), "utf8"),
    readFile(shellUrl, "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(factoryUrl, "utf8"),
    readFile(layoutInspectorUrl, "utf8"),
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
  assert.match(presentation, /refresh:\s*\[/);
  assert.doesNotMatch(index, /data-semantic-icon-secondary/);
  assert.doesNotMatch(presentation, /createCompoundIcon/);
  assert.doesNotMatch(css, /compound-semantic-icon/);
  assert.doesNotMatch(world, /createCompoundIcon/);
  assert.doesNotMatch(factory, /createCompoundIcon/);
  assert.doesNotMatch(layoutInspector, /createCompoundIcon/);
  assert.doesNotMatch(timeline, /createCompoundIcon|semanticIconSecondary/);
  assert.match(world, /element\.setAttribute\("aria-label", label\)[\s\S]*element\.title = label/);
  assert.match(
    layoutInspector,
    /element\.setAttribute\("aria-label", options\.label\)[\s\S]*long press for options/,
  );
});

test("semantic icon buttons keep visible glyphs, accessible names, and tooltips", async () => {
  const [index, composer] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(composerUrl, "utf8"),
  ]);

  const semanticButtons = [...index.matchAll(/<button\\b[^>]*data-semantic-icon="[^"]+"[^>]*>/g)];
  assert.ok(semanticButtons.length > 0);
  for (const match of semanticButtons) {
    const tag = match[0];
    const id = tag.match(/id="([^"]+)"/)?.[1] ?? "semantic icon button";
    assert.match(tag, /aria-label="[^"]+"/, `${id}: accessible name`);
    assert.match(tag, /title="[^"]+"/, `${id}: tooltip`);
  }

  for (const [id, icon, label] of [
    ["item-calendar-prev", "chevron-left", "Previous month"],
    ["item-calendar-next", "chevron-right", "Next month"],
    ["graph-edge-calendar-prev", "chevron-left", "Previous month"],
    ["graph-edge-calendar-next", "chevron-right", "Next month"],
  ]) {
    assert.match(
      index,
      new RegExp(
        `id="${id}"[^>]*data-semantic-icon="${icon}"[^>]*aria-label="${label}"[^>]*title="${label}"`,
      ),
    );
  }

  assert.match(
    composer,
    /class="semantic-icon"[\\s\\S]*stroke="currentColor"[\\s\\S]*iconPathData\\("close"\\)/,
  );
  assert.match(
    composer,
    /aria-label="Approve occurrence" title="Approve occurrence"[\\s\\S]*class="semantic-icon"[\\s\\S]*iconPathData\\("check"\\)/,
  );
});

test("every persistent toolbar button family has an executable interaction path", async () => {
  const [index, app, timeline, world, layoutInspector, investigation] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(worldUrl, "utf8"),
    readFile(layoutInspectorUrl, "utf8"),
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
  assert.match(
    layoutInspector,
    /world-layout-control[\s\S]*addEventListener\("click"[\s\S]*options\.primaryAction\(\)/,
  );
  assert.match(investigation, /toggle\.addEventListener\("click"[\s\S]*onRequestOpen\(!open\)/);
  assert.match(investigation, /Close investigation methodology/);
});

test("overflowing view controls fade at whichever scroll edge hides more controls", async () => {
  const shell = await readFile(shellUrl, "utf8");

  assert.match(shell, /@property --dock-fade-start\s*\{[^}]*syntax:\s*"<length>"/);
  assert.match(shell, /@property --dock-fade-end\s*\{[^}]*syntax:\s*"<length>"/);

  const rule = shell.match(/\.app-footer-view\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(rule, /mask-image:[^;]*var\(--dock-fade-start\)[^;]*var\(--dock-fade-end\)/);
  assert.match(rule, /animation-timeline:\s*scroll\(self inline\)/);

  // Scroll-driven keyframes widen each fade only while content is hidden beyond that edge,
  // so a non-overflowing strip stays unmasked.
  const keyframes = shell.match(/@keyframes dock-edge-fade\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(keyframes, /0%\s*\{[^}]*--dock-fade-start:\s*0px[^}]*--dock-fade-end:\s*[1-9]/);
  assert.match(keyframes, /100%\s*\{[^}]*--dock-fade-start:\s*[1-9][^}]*--dock-fade-end:\s*0px/);

  assert.match(shell, /\.app-footer-view:dir\(rtl\)\s*\{[^}]*mask-image:/);
});
