import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("composer investigation mode reuses qualifier parser and investigative projection", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /interpretInvestigativeQualifier/);
  assert.match(source, /projectInvestigativeCandidateMatrix/);
  assert.match(source, /investigation-panel/);
  assert.match(source, /investigation-qualifier/);
  assert.match(source, /investigation-interpretation/);
  assert.match(source, /investigation-candidate/);
  assert.match(source, /consistent/);
  assert.match(source, /contradicts/);
  assert.match(source, /unknown/);
  assert.doesNotMatch(source, /investigation[^\n]{0,80}(score|winner|probability)/i);
});

test("investigative qualifier chips select their exact source spans", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /selectInvestigativeQualifier/);
  assert.match(source, /setSelectionRange\(qualifier\.start, qualifier\.end\)/);
  assert.match(source, /data-investigative-qualifier-id/);
});

test("methodology actions leave persistence to the application reasoning path", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /occurrenceinvestigationaction/);
  assert.match(composer, /buildQuestionDraft/);
  assert.match(composer, /buildIdentityHypothesisDrafts/);
  assert.match(composer, /buildLineOfEnquiryDraft/);
  assert.match(composer, /buildDisconfirmationEnquiryDraft/);
  assert.match(composer, /buildInformationReviewDraft/);
  assert.match(app, /occurrenceinvestigationaction/);
  assert.match(app, /applyInvestigationReasoning/);
  assert.match(app, /caseReasoning\.validateReasoning/);
});

test("composer project data carries canonical attributes only for investigative projection", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /attributes\?: Readonly<Record<string, unknown>>/);
  assert.match(app, /attributes: entity\.attributes/);
});
