import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("expanded occurrence offers a sentence and routes editing through the shared composer", async () => {
  const [view, app, css, composer, contextDeck] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/occurrence-context-deck.ts", import.meta.url), "utf8"),
  ]);
  assert.match(view, /timeline-occurrence-sentence/);
  assert.match(view, /timelineoccurrenceeditrequest/);
  assert.match(view, /occurrenceContextDeckFrames\(item\.media, item\.description\)/);
  assert.match(composer, /occurrenceContextDeckFrames/);
  assert.match(composer, /<luum-occurrence-deck class="composer-context-deck">/);
  assert.match(contextDeck, /kind: "context"/);
  assert.match(app, /selectedItem\?\.media[\s\S]*\.map\(\(entry\)/);
  assert.match(app, /addEventListener\("timelineoccurrenceeditrequest"/);
  assert.match(app, /setOccurrenceComposerOpen\(true\)/);
  assert.match(css, /\.timeline-event-detail \.timeline-occurrence-sentence/);
  assert.match(css, /\.timeline-event-detail \.timeline-focus-hero/);
});

test("card field selection opens the shared composer at the matching sentence section", async () => {
  const [view, app, composer] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
  ]);
  assert.match(view, /detail: \{ id: item\.id, field \}/);
  assert.match(app, /occurrenceComposer\.focusSection\(field\)/);
  assert.match(composer, /composerEditableSections\(this\.value\)/);
  assert.match(composer, /input\.setSelectionRange\(section\.start, section\.end\)/);
});


test("direct occurrence activation always requests the composer, including an already-focused card", async () => {
  const view = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    view,
    /const requestComposer = \(\): void =>[\s\S]*timelineoccurrenceeditrequest[\s\S]*detail: \{ id: item\.id \}/,
  );
  assert.match(
    view,
    /const selectOccurrence = \(\): void =>[\s\S]*if \(this\.focusedId !== item\.id\)[\s\S]*requestComposer\(\)/,
  );
  assert.doesNotMatch(
    view,
    /if \(this\.focusedId === item\.id\) \{\s*this\.ensureFocusPopover\(\);/,
  );
});
