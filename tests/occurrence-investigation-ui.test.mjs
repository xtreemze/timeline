import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("composer investigation mode reuses qualifier parser and investigative projection", async () => {
  const [composer, panel] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-investigation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /luum-occurrence-investigation/);
  assert.match(panel, /interpretInvestigativeQualifier/);
  assert.match(panel, /projectInvestigativeCandidateMatrix/);
  assert.match(panel, /investigation-panel/);
  assert.match(panel, /investigation-qualifier/);
  assert.match(panel, /investigation-interpretation/);
  assert.match(panel, /investigation-candidate/);
  assert.match(panel, /consistent/);
  assert.match(panel, /contradicts/);
  assert.match(panel, /unknown/);
  assert.doesNotMatch(panel, /investigation[^\n]{0,80}(score|winner|probability)/i);
});

test("investigative qualifier chips select their exact source spans", async () => {
  const [composer, panel] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-investigation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /selectInvestigativeQualifier/);
  assert.match(composer, /setSelectionRange\(start, end\)/);
  assert.match(panel, /data-investigative-qualifier-id/);
  assert.match(panel, /investigativequalifierselect/);
});

test("methodology actions leave persistence to the application reasoning path", async () => {
  const [panel, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-investigation.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(panel, /occurrenceinvestigationaction/);
  assert.match(panel, /buildQuestionDraft/);
  assert.match(panel, /buildIdentityHypothesisDrafts/);
  assert.match(panel, /buildLineOfEnquiryDraft/);
  assert.match(panel, /buildDisconfirmationEnquiryDraft/);
  assert.match(panel, /buildInformationReviewDraft/);
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
