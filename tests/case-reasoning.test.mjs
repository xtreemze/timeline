import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/case-reasoning-shim.ts");

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
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);
  const interchangeIndex = html.indexOf("./interchange-adapter-shim.ts");
  const reasoningIndex = html.indexOf("./case-reasoning-shim.ts");
  const appIndex = html.indexOf("./app.ts");
  assert.ok(interchangeIndex >= 0, "interchange adapter shim must be loaded");
  assert.ok(reasoningIndex > interchangeIndex, "case reasoning must load after interchange");
  assert.ok(appIndex > reasoningIndex, "app must load after case reasoning");
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


test("competing identity hypotheses preserve candidates, contradictions, and open-world alternatives", () => {
  const model = {
    assertions: [
      { id: "fact-route-alice", text: "Alice was observed near the relevant route." },
      { id: "fact-alibi-bob", text: "Bob was documented elsewhere during the window." },
      { id: "fact-carol-unknown", text: "Carol's location during the window is not established." },
    ],
    hypotheses: [
      {
        id: "hyp-alice",
        hypothesisKind: "identity",
        text: "The unidentified person was Alice.",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "alice",
        alternativeGroupId: "unknown-person-a-identity",
        assertionIds: ["fact-route-alice"],
      },
      {
        id: "hyp-bob",
        hypothesisKind: "identity",
        text: "The unidentified person was Bob.",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "bob",
        alternativeGroupId: "unknown-person-a-identity",
        assertionIds: ["fact-alibi-bob"],
      },
      {
        id: "hyp-carol",
        hypothesisKind: "identity",
        text: "The unidentified person was Carol.",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "carol",
        alternativeGroupId: "unknown-person-a-identity",
        assertionIds: ["fact-carol-unknown"],
      },
      {
        id: "hyp-none-known",
        hypothesisKind: "identity",
        text: "The unidentified person was none of the currently known candidates.",
        unknownEntityId: "unknown-person-a",
        candidateScope: "none-known",
        alternativeGroupId: "unknown-person-a-identity",
      },
    ],
    edges: [
      {
        id: "route-supports-alice",
        fromId: "fact-route-alice",
        toId: "hyp-alice",
        predicate: "supports",
      },
      {
        id: "alibi-contradicts-bob",
        fromId: "fact-alibi-bob",
        toId: "hyp-bob",
        predicate: "contradicts",
      },
      {
        id: "carol-context",
        fromId: "fact-carol-unknown",
        toId: "hyp-carol",
        predicate: "contextualizes",
      },
    ],
  };

  const findings = reasoning.validateReasoning(model, {
    entityIds: ["unknown-person-a", "alice", "bob", "carol"],
  });
  assert.equal(findings.some((finding) => finding.severity === "error"), false);
  assert.equal(
    findings.some((finding) => finding.code === "identity-open-world-alternative-missing"),
    false,
  );

  const matrix = reasoning.competingHypothesisMatrix(
    model,
    "unknown-person-a-identity",
  );
  assert.deepEqual(
    matrix.hypotheses.map((hypothesis) => hypothesis.id),
    ["hyp-alice", "hyp-bob", "hyp-carol", "hyp-none-known"],
  );
  const alibi = matrix.evidenceRows.find((row) => row.evidenceId === "fact-alibi-bob");
  assert.equal(
    alibi.cells.find((cell) => cell.hypothesisId === "hyp-bob").assessment,
    "contradicts",
  );
  const route = matrix.evidenceRows.find((row) => row.evidenceId === "fact-route-alice");
  assert.equal(
    route.cells.find((cell) => cell.hypothesisId === "hyp-alice").assessment,
    "supports",
  );
  assert.equal("score" in matrix, false);
  assert.equal("winner" in matrix, false);
});

test("identity analysis warns when it forces a closed candidate set", () => {
  const findings = reasoning.validateReasoning(
    {
      hypotheses: [
        {
          id: "hyp-a",
          hypothesisKind: "identity",
          unknownEntityId: "unknown-person-a",
          candidateEntityId: "alice",
          alternativeGroupId: "identity-group",
        },
        {
          id: "hyp-b",
          hypothesisKind: "identity",
          unknownEntityId: "unknown-person-a",
          candidateEntityId: "bob",
          alternativeGroupId: "identity-group",
        },
      ],
    },
    { entityIds: ["unknown-person-a", "alice", "bob"] },
  );
  assert.ok(
    findings.some(
      (finding) => finding.code === "identity-open-world-alternative-missing",
    ),
  );
});


test("exposes established structured analytic methods without treating them as truth engines", () => {
  const methods = new Map(reasoning.ANALYTIC_METHODS.map((method) => [method.id, method]));
  assert.equal(methods.get("ach").name, "Analysis of Competing Hypotheses");
  assert.equal(methods.get("key-assumptions-check").family, "diagnostic");
  assert.equal(methods.get("reasonable-lines-of-enquiry").family, "investigative");
  assert.equal(methods.get("alternative-propositions").source, "ISO 21043-4:2025");
  assert.equal(reasoning.analyticMethod("devils-advocacy").family, "contrarian");
  assert.equal(reasoning.analyticMethod("custom-method"), null);
});

test("normalizes assumptions, questions, enquiries, indicators, and information reviews", () => {
  const normalized = reasoning.normalizeReasoning({
    assumptions: [
      {
        id: "assume-device-owner",
        text: "The phone was carried by its registered owner.",
        status: "challenged",
        basisIds: ["obs-registration"],
        hypothesisIds: ["hyp-alice"],
        rationale: "Device possession may differ from account ownership.",
      },
    ],
    questions: [
      {
        id: "q-carol-location",
        text: "Where was Carol during the incident window?",
        hypothesisIds: ["hyp-carol"],
        status: "open",
      },
    ],
    linesOfEnquiry: [
      {
        id: "loe-camera-six",
        text: "Review Camera 6 for west-exit movement.",
        questionIds: ["q-carol-location"],
        hypothesisIds: ["hyp-carol", "hyp-none-known"],
        testType: "discriminate",
        status: "active",
        expectedDiscriminator: "A time-matched exit observation that distinguishes the alternatives.",
      },
    ],
    indicators: [
      {
        id: "indicator-west-exit",
        text: "A matching person exits through the west door.",
        hypothesisIds: ["hyp-carol"],
        state: "unknown",
      },
    ],
    informationReviews: [
      {
        id: "quality-witness-one",
        text: "Witness account has not been independently corroborated.",
        targetIds: ["ev-witness-one"],
        finding: "uncorroborated",
        limitations: "Lighting was poor.",
      },
    ],
  });

  assert.equal(normalized.assumptions[0].status, "challenged");
  assert.equal(normalized.questions[0].status, "open");
  assert.equal(normalized.linesOfEnquiry[0].testType, "discriminate");
  assert.equal(normalized.indicators[0].state, "unknown");
  assert.equal(normalized.informationReviews[0].finding, "uncorroborated");
  assert.equal("score" in normalized.informationReviews[0], false);
});

test("tradecraft validation requires rationale for consciously unpursued enquiries", () => {
  const findings = reasoning.validateReasoning({
    linesOfEnquiry: [
      {
        id: "loe-deferred",
        text: "Obtain an additional camera source.",
        status: "not-pursued",
        testType: "discover",
      },
    ],
  });

  assert.ok(findings.some((finding) => finding.code === "enquiry-rationale-required"));
});

test("methodology review exposes gaps and disconfirming coverage without selecting a winner", () => {
  const model = {
    assumptions: [
      {
        id: "assume-device-owner",
        text: "The phone was carried by its registered owner.",
        status: "challenged",
        inputIds: ["fact-phone-registration"],
        hypothesisIds: ["hyp-alice"],
        rationale: "Possession is not established by registration alone.",
      },
    ],
    questions: [
      {
        id: "q-carol-location",
        text: "Where was Carol?",
        status: "open",
        hypothesisIds: ["hyp-carol"],
      },
    ],
    assertions: [
      { id: "fact-phone-registration", text: "The phone account was registered to Alice." },
      { id: "fact-bob-alibi", text: "Bob was documented elsewhere." },
    ],
    hypotheses: [
      {
        id: "hyp-alice",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "alice",
        alternativeGroupId: "identity-a",
        assertionIds: ["fact-phone-registration"],
      },
      {
        id: "hyp-bob",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "bob",
        alternativeGroupId: "identity-a",
        assertionIds: ["fact-bob-alibi"],
      },
      {
        id: "hyp-carol",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "carol",
        alternativeGroupId: "identity-a",
      },
      {
        id: "hyp-none-known",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateScope: "none-known",
        alternativeGroupId: "identity-a",
      },
    ],
    linesOfEnquiry: [
      {
        id: "loe-alibi-test",
        text: "Test Bob's alibi against independent time/location evidence.",
        status: "active",
        testType: "falsify",
        hypothesisIds: ["hyp-bob"],
        targetIds: ["fact-bob-alibi"],
      },
      {
        id: "loe-camera-six",
        text: "Review Camera 6 to discriminate Alice, Carol, and an unknown alternative.",
        status: "proposed",
        testType: "discriminate",
        hypothesisIds: ["hyp-alice", "hyp-carol", "hyp-none-known"],
      },
    ],
    indicators: [
      {
        id: "indicator-camera",
        text: "A matching person appears on Camera 6.",
        state: "unknown",
        hypothesisIds: ["hyp-carol"],
      },
    ],
    informationReviews: [
      {
        id: "quality-registration",
        text: "Registration establishes account ownership, not possession.",
        finding: "limited",
        targetIds: ["fact-phone-registration"],
        limitations: "No evidence yet establishes who carried the device.",
      },
    ],
  };

  const review = reasoning.methodologyReview(model, {
    entityIds: ["unknown-person-a", "alice", "bob", "carol"],
  });

  assert.deepEqual(review.openQuestionIds, ["q-carol-location"]);
  assert.deepEqual(review.assumptionIdsNeedingReview, ["assume-device-owner"]);
  assert.deepEqual(review.activeEnquiryIds, ["loe-alibi-test", "loe-camera-six"]);
  assert.deepEqual(review.unknownIndicatorIds, ["indicator-camera"]);
  assert.deepEqual(review.unresolvedInformationReviewIds, ["quality-registration"]);
  assert.deepEqual(review.alternativeGroupsWithoutDisconfirmingTest, []);
  assert.deepEqual(review.disconfirmingCoverage[0].missingHypothesisIds, []);
  assert.equal("winner" in review, false);
  assert.equal("score" in review, false);
});

test("methodology review identifies alternative groups with no discriminating or falsifying enquiry", () => {
  const review = reasoning.methodologyReview(
    {
      assertions: [{ id: "fact-1" }],
      hypotheses: [
        {
          id: "h1",
          text: "Alternative one",
          alternativeGroupId: "group-1",
          assertionIds: ["fact-1"],
        },
        {
          id: "h2",
          text: "Alternative two",
          alternativeGroupId: "group-1",
          assertionIds: ["fact-1"],
        },
      ],
      linesOfEnquiry: [
        {
          id: "loe-corroborate",
          text: "Seek another copy of the same record.",
          status: "active",
          testType: "corroborate",
          hypothesisIds: ["h1"],
        },
      ],
    },
  );
  assert.deepEqual(review.alternativeGroupsWithoutDisconfirmingTest, ["group-1"]);
});


test("trajectory-derived observations preserve world, timeline, source, and trajectory context references", () => {
  const normalized = reasoning.normalizeReasoning({
    observations: [
      {
        id: "obs-track",
        text: "A recorded journey passed through the incident area.",
        evidenceIds: ["ev-track"],
        itemIds: ["item-journey"],
        relationshipIds: ["rel-journey"],
        placeIds: ["place-incident"],
        entityIds: ["alice"],
        trajectoryIds: ["track-high-res"],
        temporalScope: {
          start: "2026-09-26T21:10:00+03:00",
          end: "2026-09-26T21:20:00+03:00",
        },
      },
    ],
  });

  assert.deepEqual(normalized.observations[0].evidenceIds, ["ev-track"]);
  assert.deepEqual(normalized.observations[0].itemIds, ["item-journey"]);
  assert.deepEqual(normalized.observations[0].relationshipIds, ["rel-journey"]);
  assert.deepEqual(normalized.observations[0].placeIds, ["place-incident"]);
  assert.deepEqual(normalized.observations[0].entityIds, ["alice"]);
  assert.deepEqual(normalized.observations[0].trajectoryIds, ["track-high-res"]);

  const findings = reasoning.validateReasoning(normalized, {
    entityIds: ["alice"],
    externalIds: ["ev-track", "item-journey", "rel-journey", "place-incident"],
  });
  assert.equal(
    findings.some((finding) => finding.severity === "error"),
    false,
  );
});
