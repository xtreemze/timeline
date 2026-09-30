import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile keyboard occlusion moves only the focused composer footer", async () => {
  const [markup, styles, app, composer, occlusion] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/layout/mobile-viewport-occlusion.ts", import.meta.url), "utf8"),
  ]);

  assert.match(markup, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.doesNotMatch(markup, /interactive-widget=/);
  assert.match(styles, /#workspace\s*\{[\s\S]*inset:\s*0[\s\S]*height:\s*100dvh/);
  assert.match(styles, /#app-shell\s*\{[\s\S]*inset:\s*0[\s\S]*height:\s*100dvh/);
  assert.match(app, /const composerFocused = els\.occurrenceComposer\.inputHasFocus\(\)/);
  assert.match(app, /visualViewport\?\.scale/);
  assert.match(app, /mobileKeyboardOcclusionPx\(\{[\s\S]*layoutHeight[\s\S]*visualHeight:\s*height[\s\S]*scale/);
  assert.match(
    app,
    /composerKeyboardInsetPx\([\s\S]*measuredOcclusion[\s\S]*composerFocused[\s\S]*occurrenceComposerKeyboardInset/,
  );
  const viewportSync = app.slice(
    app.indexOf("function syncComposerVisualViewport"),
    app.indexOf("function composerSemanticVisual"),
  );
  assert.doesNotMatch(viewportSync, /offsetTop/);
  assert.match(occlusion, /visualHeight \* scale/);
  assert.match(occlusion, /inputFocused \|\| previous > 0/);
  assert.match(app, /--app-visual-viewport-bottom/);
  assert.match(app, /composerFocused[\s\S]*revealMobileInputLane\(\)/);
  assert.match(app, /occurrenceComposer\.addEventListener\("focusin", syncComposerVisualViewport\)/);
  assert.match(composer, /inputHasFocus\(\): boolean/);
  assert.match(composer, /revealMobileInputLane\(\): void/);
  assert.match(composer, /footer\.scrollTo\(\{[\s\S]*left:/);
  assert.doesNotMatch(composer, /\.input-shell"\)\?\.scrollIntoView/);
  assert.match(styles, /:root\s*\{[\s\S]*background:\s*var\(--paper-2,\s*#f4f1eb\)/);
});
