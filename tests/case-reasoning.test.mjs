import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/case-reasoning.js");

const reasoning = globalThis.TimelineCaseReasoning;

test("normalizes staged analytical records without inferring truth", () => {
  const normalized = reasoning.normalizeReasoning({
    observations: [{ id: "obs-1", text: "A timestamp was observed.", evidenceIds: ["ev-1"] }],
    assertions: [{ id: "fact-1", text: "The message existed by 09:20.", citationIds: ["cite-1"], status: "disputed" }],
    hypotheses: [{ id: "hyp-1", text: "The message was created locally.", observationIds: ["obs-1"] }],
    propositions: [
      { id: "p-1", text: "P1", alternativeGroupId: "pair-1" },
      { id: "p-2", text: "P2", alternativeGroupId: "pair-1" }
    ],
    analyses: [{ id: "a-1", text: "Evaluation", mode: "evaluative", propositionIds: ["p-1", "p-2"], assertionIds: ["fact-1"] }],
    claims: [{ id: "c-1", text: "Claim", assertionIds: ["fact-1"], analysisIds: ["a-1"] }],
    theses: [{ id: "t-1", text: "Thesis", claimIds: ["c-1"] }]
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
    theses: [{ id: "t-1", claimIds: ["c-1"] }]
  };
  const trace = reasoning.traceDependencies("t-1", model, { externalIds: ["ev-1"] });
  assert.deepEqual(trace.records.map((record) => record.id), ["t-1", "c-1", "a-1", "fact-1", "obs-1"]);
  assert.deepEqual(trace.externalIds, ["ev-1"]);
  assert.deepEqual(trace.missingIds, []);
});

test("keeps support and contradiction explicit rather than aggregating a score", () => {
  const model = {
    assertions: [{ id: "fact-1" }],
    edges: [
      { id: "e-1", fromId: "cite-support", toId: "fact-1", predicate: "supports" },
      { id: "e-2", fromId: "cite-against", toId: "fact-1", predicate: "contradicts" }
    ]
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
    theses: [{ id: "t-1" }]
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
      { id: "b", inputIds: ["a"] }
    ]
  });
  assert.ok(cycleFindings.some((finding) => finding.code === "provenance-cycle"));

  const opposingFindings = reasoning.validateReasoning({
    claims: [
      { id: "claim-a", assertionIds: ["fact-a"] },
      { id: "claim-b", assertionIds: ["fact-b"] }
    ],
    assertions: [{ id: "fact-a" }, { id: "fact-b" }],
    edges: [
      { id: "oppose-a", fromId: "claim-a", toId: "claim-b", predicate: "opposes" },
      { id: "oppose-b", fromId: "claim-b", toId: "claim-a", predicate: "opposes" }
    ]
  });
  assert.equal(opposingFindings.some((finding) => finding.code === "provenance-cycle"), false);
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
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /case-reasoning\.js[\s\S]*interchange-adapter\.js[\s\S]*app\.js/);
  assert.match(app, /const caseReasoning = globalThis\.TimelineCaseReasoning/);
  assert.match(app, /const reasoning = caseReasoning\.normalizeReasoning\(input\.reasoning\)/);
  assert.match(app, /custodyActions,\s*reasoning/);
  assert.match(app, /reasoning: caseReasoning\.normalizeReasoning\(\{\}\)/);
});
