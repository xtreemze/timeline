import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile keyboard resizes content and keeps a visual-viewport footer fallback", async () => {
  const [markup, styles, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    markup,
    /<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">/,
  );
  assert.match(styles, /#workspace\s*\{[\s\S]*inset:\s*0[\s\S]*height:\s*100dvh/);
  assert.match(styles, /#app-shell\s*\{[\s\S]*inset:\s*0[\s\S]*height:\s*100dvh/);
  assert.doesNotMatch(styles, /--app-visual-viewport-(?:height|offset-top)/);
  assert.match(app, /--app-visual-viewport-bottom/);
  assert.match(app, /window\.innerHeight\s*-\s*\(\(visualViewport\?\.offsetTop/);
  assert.match(
    styles,
    /data-orientation="landscape"\]\) \.app-tool-dock,[\s\S]*data-orientation="portrait"\]\) \.app-tool-dock[\s\S]*inset-block-end:\s*var\(--app-visual-viewport-bottom, 0px\)/,
  );
  assert.match(app, /--composer-visual-viewport-height/);
  assert.match(styles, /:root\s*\{[\s\S]*background:\s*var\(--paper-2,\s*#f4f1eb\)/);
});
