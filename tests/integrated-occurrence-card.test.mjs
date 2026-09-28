import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("expanded occurrence offers a sentence and routes editing through the shared composer", async () => {
  const [view, app, css] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);
  assert.match(view, /timeline-occurrence-sentence/);
  assert.match(view, /timelineoccurrenceeditrequest/);
  assert.match(view, /kind: 'context'|kind: "context"/);
  assert.match(app, /addEventListener\("timelineoccurrenceeditrequest"/);
  assert.match(app, /setOccurrenceComposerOpen\(true\)/);
  assert.match(css, /\.timeline-event-detail \.timeline-occurrence-sentence/);
  assert.match(css, /\.timeline-event-detail \.timeline-focus-hero/);
});
