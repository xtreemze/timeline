import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("expanded occurrence card exposes addressable semantic sentence sections", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /composerEditableSections/);
  assert.match(source, /timeline-focus-composition/);
  assert.match(source, /data-composer-section-kind/);
  assert.match(source, /timelineoccurrencecomposerrequest/);
  assert.match(source, /data-occurrence-composer-host/);
});

test("one physical composer can move between footer and retained card without duplicating the combobox", async () => {
  const [index, app, composer] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
  ]);

  assert.equal((index.match(/<luum-occurrence-composer\b/g) ?? []).length, 1);
  assert.match(app, /occurrence-composer-home/);
  assert.match(app, /mountOccurrenceComposerInCard/);
  assert.match(app, /restoreOccurrenceComposerHome/);
  assert.match(app, /timelineoccurrencecomposerrequest/);
  assert.match(composer, /editSection\(/);
});

test("card section editing routes through the existing application composer selection and commit path", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const handler =
    app.match(/timelineoccurrencecomposerrequest"[\s\S]*?\n\}\);/)?.[0] ?? "";

  assert.match(handler, /syncOccurrenceComposerSelection/);
  assert.match(handler, /setOccurrenceComposerOpen\(true\)/);
  assert.match(handler, /mountOccurrenceComposerInCard/);
  assert.match(handler, /editSection/);
  assert.doesNotMatch(handler, /new LuumOccurrenceComposerElement|createElement\(["']luum-occurrence-composer/);
});
