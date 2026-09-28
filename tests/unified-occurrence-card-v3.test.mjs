import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("investigative syntax survives the current composer implementation", async () => {
  const model = await import("../site/occurrence-composer-model.ts");
  const parsed = model.parseOccurrenceSentence('man? calls @alice at "Central Station"?');

  assert.equal(parsed.subject?.name, "man");
  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.object?.name, "@alice");
  assert.equal(parsed.investigation.qualifiers.length, 2);
  assert.equal(parsed.investigation.qualifiers[0]?.section, "subject");
  assert.equal(parsed.investigation.qualifiers[1]?.section, "place");
});

test("composer retains explicit non-Enter commit and exact section targeting", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /editSection\(/);
  assert.match(source, /composerEditableSections/);
  assert.match(source, /class="commit"/);
  assert.match(source, /@click=\$\{\(\) => this\.commit\(\)\}/);
  assert.match(source, /draft\.investigation\.qualifiers/);
  assert.match(source, /:host\(\[data-host="card"\]\) \.completion-panel/);
});

test("promoted occurrence card and footer share one physical composer", async () => {
  const [index, app, view] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  assert.equal((index.match(/<luum-occurrence-composer\b/g) ?? []).length, 1);
  assert.match(app, /occurrence-composer-home/);
  assert.match(app, /mountOccurrenceComposerInCard/);
  assert.match(app, /restoreOccurrenceComposerHome/);
  assert.match(app, /remountOccurrenceComposerCardHost/);
  assert.match(
    app,
    /timelinefocusrender"[\s\S]*remountOccurrenceComposerCardHost/,
  );
  assert.match(app, /timelineoccurrencecomposerrequest/);
  assert.match(view, /data-occurrence-composer-host/);
  assert.match(view, /data-composer-section-kind/);
});

test("investigative mode is a projection inside the same composer session", async () => {
  const [composer, panel] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-investigation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /luum-occurrence-investigation/);
  assert.match(panel, /interpretInvestigativeQualifier/);
  assert.match(panel, /projectInvestigativeCandidateMatrix/);
  assert.match(panel, /consistent/);
  assert.match(panel, /contradicts/);
  assert.match(panel, /unknown/);
  assert.doesNotMatch(panel, /(winner|probability|score)/i);
});

test("semantic identity stays outside meaningful-only Context and Evidence panels", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /timeline-focus-identity/);
  assert.match(source, /const hasEvidence = allEvidenceRecords\.length > 0/);
  assert.match(source, /if \(hasEvidence\) tabs\.append\(evidenceTab\)/);
  assert.match(source, /focusEvidenceLimit = 6/);
  assert.match(source, /timeline-focus-context-facts/);
  assert.match(source, /timeline-focus-reasoning/);
});
