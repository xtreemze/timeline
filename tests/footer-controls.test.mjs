import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../site/index.html", import.meta.url);
const appUrl = new URL("../site/app.ts", import.meta.url);
const shellUrl = new URL("../site/spatial-shell.css", import.meta.url);
const worldUrl = new URL("../site/world/deck-world-surface.ts", import.meta.url);

test("footer controls use disclosure/group semantics without redundant toggle state", async () => {
  const [index, app, world] = await Promise.all([
    readFile(indexUrl, "utf8"),
    readFile(appUrl, "utf8"),
    readFile(worldUrl, "utf8"),
  ]);

  assert.match(
    index,
    /app-footer-timeline timeline-local-toolbar" role="group" aria-label="Timeline controls"/,
  );
  assert.match(
    index,
    /id="timeline-view-controls-toggle"[\s\S]*aria-expanded="false"[\s\S]*aria-label="View controls"/,
  );
  assert.doesNotMatch(index, /id="editor-toggle"[^>]*aria-pressed=/);
  assert.doesNotMatch(app, /editorToggle\.setAttribute\("aria-pressed"/);
  assert.match(world, /bar\.setAttribute\("role", "group"\)/);
  assert.match(world, /bar\.setAttribute\("aria-label", "Globe camera controls"\)/);
});

test("footer controls share a 44px target and explicit focus treatment", async () => {
  const css = await readFile(shellUrl, "utf8");

  assert.match(css, /--app-footer-control-size:\s*44px/);
  assert.match(
    css,
    /\.app-footer-world \.world-layout-control\s*\{[\s\S]*inline-size:\s*var\(--app-footer-control-size\)/,
  );
  assert.match(
    css,
    /app-footer-timeline\.timeline-local-toolbar\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/,
  );
  assert.match(css, /app-footer-context-actions\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(
    css,
    /\.app-footer-actions > \.app-tool:focus-visible,[\s\S]*outline:\s*2px solid var\(--focus\)[\s\S]*outline-offset:\s*-3px/,
  );
});
