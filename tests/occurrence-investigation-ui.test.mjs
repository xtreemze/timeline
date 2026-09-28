import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared composer renders investigative qualifiers through the existing completion surface", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /parsed\.investigation\.qualifiers/);
  assert.match(source, /data-investigation-mode/);
  assert.match(source, /investigation-qualifier/);
  assert.match(source, /investigation-interpretation/);
  assert.match(source, /investigation-candidate/);
  assert.match(source, /investigation-method-action/);
  assert.match(source, /interpretInvestigativeQualifier/);
  assert.match(source, /projectInvestigativeCandidateMatrix/);
  assert.match(source, /occurrenceinvestigationaction/);
  assert.doesNotMatch(source, /investigationScore|candidateScore|winner|probabilityOfIdentity/);
});

test("composer session snapshot carries unresolved qualifiers across footer/card hosts", async () => {
  const [composer, timeline] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /investigation:\s*OccurrenceComposerSessionInvestigationSnapshot/);
  assert.match(composer, /activeQualifierId/);
  assert.match(composer, /activeInterpretationId/);
  assert.match(timeline, /setInvestigationQualifiers/);
  assert.match(timeline, /snapshot\.investigation\.qualifiers/);
});

test("investigative method actions are proposals and canonical occurrence commit stays fail closed", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    composer,
    /Resolve or persist the investigative clue before committing a canonical occurrence/,
  );
  assert.match(composer, /new CustomEvent.*occurrenceinvestigationaction/s);
  assert.match(app, /occurrenceinvestigationaction/);
  assert.match(app, /buildQuestionDraft|buildLineOfEnquiryDraft|buildInformationReviewDraft/);
  assert.doesNotMatch(composer, /state\.reasoning|state\.entities|state\.relationships/);
});
