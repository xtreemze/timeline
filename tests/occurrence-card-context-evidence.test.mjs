import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("promoted card keeps semantic identity outside Context/Evidence panels", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /timeline-focus-identity/);
  const identity =
    source.match(/const identity = document\.createElement\("section"\)[\s\S]*?const composerHost/)?.[0] ??
    "";
  assert.match(identity, /timeline-focus-composition/);
  assert.match(source, /replaceChildren\(header, hero, identity, composerHost, summary/);
});

test("Evidence tab is meaningful-only and falls back deterministically to Context", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /const hasEvidence = evidenceRecords\.length > 0/);
  assert.match(source, /if \(hasEvidence\) tabs\.append\(evidenceTab\)/);
  assert.match(source, /if \(!hasEvidence && this\.focusTab === "evidence"\) this\.focusTab = "overview"/);
  assert.doesNotMatch(source, /No supporting evidence attached\./);
});

test("large evidence collections use bounded progressive disclosure", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /focusEvidenceLimit = 6/);
  assert.match(source, /slice\(0, this\.focusEvidenceLimit\)/);
  assert.match(source, /timeline-focus-evidence-more/);
  assert.match(source, /this\.focusEvidenceLimit = Math\.min/);
  assert.match(source, /Show .* more evidence/);
});

test("Context receives story and methodology links from canonical application projections", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /reasoningContextForOccurrence/);
  assert.match(app, /caseReasoning\.recordsOf/);
  assert.match(app, /storyNames:/);
  assert.match(app, /reasoningContext:/);

  assert.match(view, /storyNames\?: string\[\]/);
  assert.match(view, /reasoningContext\?:/);
  assert.match(view, /timeline-focus-context-facts/);
  assert.match(view, /timeline-focus-reasoning/);
  assert.match(view, /timelinefocusreasoningopen/);
});

test("empty Context omits absent narrative and location chrome", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.doesNotMatch(
    source,
    /No narrative description has been recorded for this event\./,
  );
  assert.match(source, /if \(item\.description\?\.trim\(\)\)/);
  assert.match(source, /if \(contextFacts\.length\)/);
});
