import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/case-reasoning.js");

const reasoning = globalThis.TimelineCaseReasoning;

test("normalizes staged analytical records without inferring truth", () => {
  const normalized = reasoning.normalizeReasoning({
    observations: [{ id: "obs-1", text: "A timestamp was observed.", evidenceIds: ["ev-1"] }],
    assertions: [
      {
        id: "fact-1",
        text: "The message existed by 09:20.",
        citationIds: ["cite-1"],
        status: "disputed",
      },
    ],
    hypotheses: [
      { id: "hyp-1", text: "The message was created locally.", observationIds: ["obs-1"] },
    ],
    propositions: [
      { id: "p-1", text: "P1", alternativeGroupId: "pair-1" },
      { id: "p-2", text: "P2", alternativeGroupId: "pair-1" },
    ],
    analyses: [
      {
        id: "a-1",
        text: "Evaluation",
        mode: "evaluative",
        propositionIds: ["p-1", "p-2"],
        assertionIds: ["fact-1"],
      },
    ],
    claims: [{ id: "c-1", text: "Claim", assertionIds: ["fact-1"], analysisIds: ["a-1"] }],
    theses: [{ id: "t-1", text: "Thesis", claimIds: ["c-1"] }],
  });

  assert.equal(normalized.assertions[0].status, "disputed");
  assert.deepEqual(normalized.analyses[0].propositionIds, ["p-1", "p-2"]);
  assert.equal("truthScore" in normalized.assertions[0], false);
});

test("traces a thesis back through claims, analysis and external evidence", () => {
  const model = {
    observations: [{ id: "obs-1", evidenceIds: ["ev-1"] }],
    assertions: [{ id: "fact-1", inputIds: ["obs-1"] }],
    analyses: [{ id: "a-1", assertionIds: ["fact-1"] }],
    claims: [{ id: "c-1", analysisIds: ["a-1"] }],
    theses: [{ id: "t-1", claimIds: ["c-1"] }],
  };
  const trace = reasoning.traceDependencies("t-1", model, { externalIds: ["ev-1"] });
  assert.deepEqual(
    trace.records.map((record) => record.id),
    ["t-1", "c-1", "a-1", "fact-1", "obs-1"],
  );
  assert.deepEqual(trace.externalIds, ["ev-1"]);
  assert.deepEqual(trace.missingIds, []);
});

test("keeps support and contradiction explicit rather than aggregating a score", () => {
  const model = {
    assertions: [{ id: "fact-1" }],
    edges: [
      { id: "e-1", fromId: "cite-support", toId: "fact-1", predicate: "supports" },
      { id: "e-2", fromId: "cite-against", toId: "fact-1", predicate: "contradicts" },
    ],
  };
  const summary = reasoning.summarizeSupport("fact-1", model);
  assert.equal(summary.supports.length, 1);
  assert.equal(summary.contradicts.length, 1);
  assert.equal("score" in summary, false);
});

test("flags broken references, unsupported stages and evaluative analysis without alternatives", () => {
  const findings = reasoning.validateReasoning({
    hypotheses: [{ id: "hyp-1", text: "Unsupported" }],
    analyses: [{ id: "a-1", mode: "evaluative", propositionIds: ["p-missing"] }],
    claims: [{ id: "c-1" }],
    theses: [{ id: "t-1" }],
  });

  const codes = findings.map((finding) => finding.code);
  assert.ok(codes.includes("unsupported-hypothesis"));
  assert.ok(codes.includes("evaluative-alternatives-required"));
  assert.ok(codes.includes("unsupported-claim"));
  assert.ok(codes.includes("unsupported-thesis"));
  assert.ok(codes.includes("broken-reference"));
});

test("detects analytical dependency cycles while allowing opposing claims", () => {
  const cycleFindings = reasoning.validateReasoning({
    assertions: [
      { id: "a", inputIds: ["b"] },
      { id: "b", inputIds: ["a"] },
    ],
  });
  assert.ok(cycleFindings.some((finding) => finding.code === "provenance-cycle"));

  const opposingFindings = reasoning.validateReasoning({
    claims: [
      { id: "claim-a", assertionIds: ["fact-a"] },
      { id: "claim-b", assertionIds: ["fact-b"] },
    ],
    assertions: [{ id: "fact-a" }, { id: "fact-b" }],
    edges: [
      { id: "oppose-a", fromId: "claim-a", toId: "claim-b", predicate: "opposes" },
      { id: "oppose-b", fromId: "claim-b", toId: "claim-a", predicate: "opposes" },
    ],
  });
  assert.equal(
    opposingFindings.some((finding) => finding.code === "provenance-cycle"),
    false,
  );
});

test("ordered report records respect dependencies and preserve superseded hypotheses", () => {
  const model = {
    observations: [{ id: "obs-1", text: "Observed artifact." }],
    hypotheses: [
      {
        id: "hyp-a-new",
        text: "Revised hypothesis.",
        observationIds: ["obs-1"],
        supersedesIds: ["hyp-z-old"],
      },
      { id: "hyp-z-old", text: "Earlier hypothesis.", assessment: "rejected" },
    ],
    claims: [{ id: "claim-1", text: "Claim", inputIds: ["hyp-a-new"] }],
    theses: [{ id: "thesis-1", text: "Thesis", claimIds: ["claim-1"] }],
  };

  const normalized = reasoning.normalizeReasoning(model);
  const oldHypothesis = normalized.hypotheses.find((record) => record.id === "hyp-z-old");
  const newHypothesis = normalized.hypotheses.find((record) => record.id === "hyp-a-new");
  assert.equal(oldHypothesis.assessment, "rejected");
  assert.deepEqual(newHypothesis.supersedesIds, ["hyp-z-old"]);

  const ordered = reasoning.orderedRecords(model).map((record) => record.id);
  assert.ok(ordered.indexOf("obs-1") < ordered.indexOf("hyp-a-new"));
  assert.ok(ordered.indexOf("hyp-z-old") < ordered.indexOf("hyp-a-new"));
  assert.ok(ordered.indexOf("hyp-a-new") < ordered.indexOf("claim-1"));
  assert.ok(ordered.indexOf("claim-1") < ordered.indexOf("thesis-1"));
});

test("ordered report records remain deterministic when provenance contains a cycle", () => {
  const model = {
    assertions: [
      { id: "b", inputIds: ["a"] },
      { id: "a", inputIds: ["b"] },
    ],
  };
  assert.deepEqual(
    reasoning.orderedRecords(model).map((record) => record.id),
    ["a", "b"],
  );
});

test("exposes the September 2026 standards baseline with explicit editions", () => {
  const byId = new Map(reasoning.STANDARDS_BASELINE.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("iso-21043-4").edition, "2025");
  assert.equal(byId.get("iso-21043-2").edition, "2018");
  assert.equal(byId.get("iso-iec-27042").edition, "2015");
});

test("browser runtime loads and persists canonical case reasoning", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /case-reasoning\.js[\s\S]*interchange-adapter\.js[\s\S]*app\.js/);
  assert.match(app, /const caseReasoning = globalThis\.TimelineCaseReasoning/);
  assert.match(app, /const reasoning = caseReasoning\.normalizeReasoning\(input\.reasoning\)/);
  assert.match(app, /custodyActions,\s*reasoning/);
  assert.match(app, /reasoning: caseReasoning\.normalizeReasoning\(\{\}\)/);
});

test("normalizes pinpoint citations and traces analytical claims to source evidence", () => {
  const model = reasoning.normalizeReasoning({
    citations: [
      {
        id: "cite-1",
        assertionId: "fact-1",
        evidenceId: "evidence-1",
        relation: "supports",
        locator: { type: "page", page: 12, pageEnd: 13 },
        excerpt: "Relevant source passage.",
        linkageConfidence: "high",
      },
      {
        id: "cite-2",
        assertionId: "fact-1",
        evidenceId: "evidence-2",
        relation: "contradicts",
        locator: { type: "time", startMs: 4200, endMs: 6700 },
      },
    ],
    assertions: [
      {
        id: "fact-1",
        text: "The event occurred.",
        citationIds: ["cite-1", "cite-2"],
        status: "disputed",
      },
    ],
    claims: [{ id: "claim-1", assertionIds: ["fact-1"] }],
    theses: [{ id: "thesis-1", claimIds: ["claim-1"] }],
  });

  assert.equal(model.citations[0].locator.type, "page");
  assert.equal(model.citations[0].locator.pageEnd, 13);
  assert.equal(model.citations[1].locator.startMs, 4200);

  const grouped = reasoning.collectAssertionCitations("fact-1", model);
  assert.deepEqual(
    grouped.supports.map((citation) => citation.id),
    ["cite-1"],
  );
  assert.deepEqual(
    grouped.contradicts.map((citation) => citation.id),
    ["cite-2"],
  );

  const trace = reasoning.traceDependencies("thesis-1", model, {
    externalIds: ["evidence-1", "evidence-2"],
  });
  assert.deepEqual(
    trace.records.map((record) => record.id),
    ["thesis-1", "claim-1", "fact-1", "cite-1", "cite-2"],
  );
  assert.deepEqual(trace.externalIds, ["evidence-1", "evidence-2"]);
  assert.deepEqual(trace.missingIds, []);
  assert.deepEqual(
    reasoning.validateReasoning(model, { externalIds: ["evidence-1", "evidence-2"] }),
    [],
  );
});

test("reports broken or imprecise citation links without inferring truth", () => {
  const model = reasoning.normalizeReasoning({
    citations: [
      {
        id: "cite-bad",
        assertionId: "other",
        evidenceId: "",
        relation: "supports",
        locator: { type: "page", page: 0 },
      },
    ],
    assertions: [{ id: "fact-1", citationIds: ["cite-bad"] }],
  });
  const findings = reasoning.validateReasoning(model);
  assert.ok(findings.some((finding) => finding.code === "citation-assertion-broken"));
  assert.ok(findings.some((finding) => finding.code === "citation-evidence-missing"));
  assert.ok(findings.some((finding) => finding.code === "citation-locator-missing"));
  assert.ok(findings.some((finding) => finding.code === "citation-assertion-mismatch"));
  assert.equal("truthScore" in model.assertions[0], false);
});
