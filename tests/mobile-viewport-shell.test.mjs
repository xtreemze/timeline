import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile keyboard pan cannot expose a page-background band below the fixed workspace", async () => {
  const [styles, app] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    styles,
    /#workspace[\s\S]*height:\s*calc\([\s\S]*--app-visual-viewport-height[\s\S]*\+[\s\S]*--app-visual-viewport-offset-top[\s\S]*\)/,
  );
  assert.match(
    styles,
    /#app-shell[\s\S]*height:\s*calc\([\s\S]*--app-visual-viewport-height[\s\S]*\+[\s\S]*--app-visual-viewport-offset-top[\s\S]*\)/,
  );
  assert.match(styles, /:root\s*\{[\s\S]*background:\s*var\(--paper-2,\s*#f4f1eb\)/);
  assert.match(app, /visualViewport\?\.offsetTop/);
  assert.match(app, /--app-visual-viewport-offset-top/);
});
