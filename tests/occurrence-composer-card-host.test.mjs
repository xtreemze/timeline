import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("composer exposes one hostable session surface instead of a second card editor", async () => {
  const composer = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(composer, /export interface OccurrenceComposerSessionSnapshot/);
  assert.match(composer, /sessionSnapshot\(\): OccurrenceComposerSessionSnapshot/);
  assert.match(composer, /activateSection\(section: ComposerEditableSection\)/);
  assert.match(composer, /focusInput\(options/);
  assert.match(composer, /occurrencecomposersessionchange/);
  assert.doesNotMatch(composer, /customElements\.define\("luum-occurrence-card-composer"/);
});

test("retained occurrence detail keeps a stable composer slot outside replaceable focus content", async () => {
  const view = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(view, /timeline-event-detail-content/);
  assert.match(view, /timeline-event-composer-slot/);
  assert.match(view, /data-occurrence-composer-slot/);
  assert.match(view, /composerHostForFocusedOccurrence\(\)/);
  assert.match(view, /syncComposerSession\(/);
  assert.match(view, /activateComposerHost/);
  assert.doesNotMatch(
    view,
    /focusHost\.replaceChildren\(header, hero, summary, evidence, composerSlot\)/,
  );
});

test("application moves the one physical composer between footer and selected retained card", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /occurrenceComposerHome/);
  assert.match(app, /occurrenceComposerHostProxy/);
  assert.match(app, /mountOccurrenceComposerHost\(/);
  assert.match(app, /restoreOccurrenceComposerHome\(/);
  assert.match(app, /composerHostForFocusedOccurrence/);
  assert.match(app, /occurrencecomposersessionchange/);
  assert.match(app, /syncComposerSession/);
  assert.doesNotMatch(app, /cloneNode\([^)]*occurrenceComposer/);
});
