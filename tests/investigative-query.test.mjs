import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssumptionDraft,
  buildDisconfirmationEnquiryDraft,
  buildIdentityHypothesisDrafts,
  buildInformationReviewDraft,
  buildObservationDraft,
  buildAssertionDraft,
  buildLineOfEnquiryDraft,
  buildQuestionDraft,
  interpretInvestigativeQualifier,
  projectInvestigativeCandidateMatrix,
} from "../src/application/investigative-query.ts";
import {
  normalizeReasoning,
  validateReasoning,
} from "../site/case-reasoning.ts";

const entities = [
  {
    id: "alice",
    name: "Alice",
    type: "person",
    alternateNames: ["A. Example"],
    attributes: { sex: "female", jacket: "red" },
  },
  {
    id: "bob",
    name: "Bob",
    type: "person",
    alternateNames: ["Robert"],
    attributes: { sex: "male", jacket: "blue" },
    sourceIds: ["source-bob-profile"],
  },
  {
    id: "charlie",
    name: "Charlie",
    type: "person",
    alternateNames: [],
    attributes: { sex: "male" },
  },
];

test("ambiguous man clue exposes multiple interpretations instead of silently choosing a property", () => {
  const interpretations = interpretInvestigativeQualifier(
    {
      id: "q-man",
      section: "subject",
      text: "man",
    },
    { entities },
  );

  assert.ok(
    interpretations.some(
      (interpretation) =>
        interpretation.kind === "entity-property" &&
        interpretation.property === "sex" &&
        interpretation.value === "male",
    ),
  );
  assert.ok(
    interpretations.some(
      (interpretation) =>
        interpretation.kind === "entity-type" && interpretation.value === "person",
    ),
  );
  assert.ok(interpretations.some((interpretation) => interpretation.kind === "literal"));
  assert.equal(
    interpretations.some((interpretation) => interpretation.kind === "automatic-resolution"),
    false,
  );
});

test("canonical ids, names and aliases produce identity interpretations without mutating candidates", () => {
  const byId = interpretInvestigativeQualifier(
    { id: "q-id", section: "subject", text: "@alice" },
    { entities },
  );
  assert.deepEqual(
    byId.filter((interpretation) => interpretation.kind === "entity").map((entry) => entry.entityId),
    ["alice"],
  );

  const byAlias = interpretInvestigativeQualifier(
    { id: "q-alias", section: "subject", text: "Robert" },
    { entities },
  );
  assert.deepEqual(
    byAlias
      .filter((interpretation) => interpretation.kind === "entity")
      .map((entry) => entry.entityId),
    ["bob"],
  );

  assert.deepEqual(entities[1].attributes, { sex: "male", jacket: "blue" });
});

test("candidate matrix uses categorical clue cells and keeps missing information unknown", () => {
  const matrix = projectInvestigativeCandidateMatrix({
    entities,
    qualifiers: [
      {
        id: "q-sex",
        interpretation: {
          id: "property:sex:male",
          kind: "entity-property",
          label: "sex = male",
          property: "sex",
          value: "male",
        },
      },
      {
        id: "q-jacket",
        interpretation: {
          id: "property:jacket:red",
          kind: "entity-property",
          label: "jacket = red",
          property: "jacket",
          value: "red",
        },
      },
    ],
  });

  const bob = matrix.candidates.find((candidate) => candidate.candidateEntityId === "bob");
  const charlie = matrix.candidates.find(
    (candidate) => candidate.candidateEntityId === "charlie",
  );

  assert.equal(
    bob.cells.find((cell) => cell.qualifierId === "q-sex")?.assessment,
    "consistent",
  );
  assert.equal(
    bob.cells.find((cell) => cell.qualifierId === "q-jacket")?.assessment,
    "contradicts",
  );
  assert.deepEqual(
    bob.cells.find((cell) => cell.qualifierId === "q-jacket")?.recordIds,
    ["source-bob-profile"],
  );
  assert.equal(
    charlie.cells.find((cell) => cell.qualifierId === "q-jacket")?.assessment,
    "unknown",
  );

  assert.equal("score" in bob, false);
  assert.equal("winner" in matrix, false);
  assert.equal("probability" in matrix, false);
});

test("explicit reasoning assessment can surface contradiction without becoming a candidate score", () => {
  const matrix = projectInvestigativeCandidateMatrix({
    entities,
    qualifiers: [
      {
        id: "q-route",
        interpretation: {
          id: "literal:route",
          kind: "literal",
          label: "near west route",
          text: "near west route",
        },
      },
    ],
    evidenceAssessments: [
      {
        candidateEntityId: "bob",
        qualifierId: "q-route",
        assessment: "contradicts",
        reason: "Assertion fact-bob-alibi documents Bob elsewhere.",
        recordIds: ["fact-bob-alibi"],
      },
    ],
  });

  const bob = matrix.candidates.find((candidate) => candidate.candidateEntityId === "bob");
  assert.deepEqual(bob.cells[0], {
    qualifierId: "q-route",
    assessment: "contradicts",
    reason: "Assertion fact-bob-alibi documents Bob elsewhere.",
    recordIds: ["fact-bob-alibi"],
  });
});

test("identity exploration always retains a none-known open-world candidate", () => {
  const matrix = projectInvestigativeCandidateMatrix({
    entities,
    qualifiers: [
      {
        id: "q-sex",
        interpretation: {
          id: "property:sex:male",
          kind: "entity-property",
          label: "sex = male",
          property: "sex",
          value: "male",
        },
      },
    ],
    limit: 2,
  });

  assert.equal(matrix.totalKnownCandidates, 3);
  assert.equal(matrix.candidates.filter((candidate) => candidate.candidateScope === "entity").length, 2);
  const noneKnown = matrix.candidates.at(-1);
  assert.equal(noneKnown.candidateScope, "none-known");
  assert.equal(noneKnown.candidateEntityId, null);
  assert.ok(noneKnown.cells.every((cell) => cell.assessment === "unknown"));
});

test("candidate projection order is deterministic and filtering is usability-only", () => {
  const reversed = [...entities].reverse();
  const full = projectInvestigativeCandidateMatrix({
    entities: reversed,
    qualifiers: [],
  });
  assert.deepEqual(
    full.candidates
      .filter((candidate) => candidate.candidateScope === "entity")
      .map((candidate) => candidate.label),
    ["Alice", "Bob", "Charlie"],
  );

  const filtered = projectInvestigativeCandidateMatrix({
    entities: reversed,
    qualifiers: [],
    filterText: "rob",
  });
  assert.deepEqual(
    filtered.candidates
      .filter((candidate) => candidate.candidateScope === "entity")
      .map((candidate) => candidate.label),
    ["Bob"],
  );
  assert.equal("score" in filtered, false);
});

test("question and identity-hypothesis builders produce existing case-reasoning record shapes", () => {
  const question = buildQuestionDraft({
    id: "q-who",
    text: "Who was the unidentified person?",
  });
  const hypotheses = buildIdentityHypothesisDrafts({
    unknownEntityId: "unknown-person-a",
    candidates: [
      { entityId: "alice", label: "Alice" },
      { entityId: "bob", label: "Bob" },
    ],
    alternativeGroupId: "unknown-person-a-identity",
  });

  const model = normalizeReasoning({
    questions: [question],
    hypotheses,
  });

  assert.equal(model.questions[0].status, "open");
  assert.deepEqual(
    model.hypotheses.map((hypothesis) => hypothesis.candidateScope || hypothesis.candidateEntityId),
    ["alice", "bob", "none-known"],
  );
  assert.equal(
    validateReasoning(model, {
      entityIds: ["unknown-person-a", "alice", "bob"],
    }).some((finding) => finding.severity === "error"),
    false,
  );
});

test("source-backed clue promotion builders preserve provenance and validate without asserting canonical identity", () => {
  const observation = buildObservationDraft({
    id: "obs-clue-man",
    text: "Source-backed occurrence records subject clue “man”.",
    sourceIds: ["ev-witness"],
    evidenceIds: ["ev-witness"],
    relationshipIds: ["rel-1"],
    itemIds: ["item-1"],
    entityIds: ["unknown-person-a"],
  });
  const assertion = buildAssertionDraft({
    id: "fact-source-description",
    text: "The selected source describes the subject as “man”.",
    sourceIds: ["ev-witness"],
    inputIds: [observation.id],
    itemIds: ["item-1"],
  });
  const model = normalizeReasoning({ observations: [observation], assertions: [assertion] });
  const errors = validateReasoning(model, {
    entityIds: ["unknown-person-a"],
    externalIds: ["ev-witness", "rel-1", "item-1"],
  }).filter((finding) => finding.severity === "error");
  assert.deepEqual(errors, []);
  assert.deepEqual(model.observations[0].evidenceIds, ["ev-witness"]);
  assert.deepEqual(model.observations[0].relationshipIds, ["rel-1"]);
  assert.deepEqual(model.assertions[0].inputIds, ["obs-clue-man"]);
  assert.equal("candidateEntityId" in model.assertions[0], false);
});

test("methodology builders create explicit assumption, enquiry, falsification and information-review drafts", () => {
  const assumption = buildAssumptionDraft({
    id: "assume-owner",
    text: "The device was carried by its registered owner.",
    hypothesisIds: ["hyp-alice"],
    basisIds: ["fact-registration"],
  });
  const enquiry = buildLineOfEnquiryDraft({
    id: "loe-camera",
    text: "Review camera six.",
    questionIds: ["q-who"],
    hypothesisIds: ["hyp-alice", "hyp-none"],
    testType: "discriminate",
  });
  const falsify = buildDisconfirmationEnquiryDraft({
    id: "loe-alibi",
    text: "Seek records that could place Alice elsewhere.",
    hypothesisIds: ["hyp-alice"],
  });
  const quality = buildInformationReviewDraft({
    id: "quality-witness",
    text: "Review witness limitations.",
    targetIds: ["ev-witness"],
    finding: "unknown",
  });

  assert.equal(assumption.status, "open");
  assert.equal(enquiry.testType, "discriminate");
  assert.equal(falsify.testType, "falsify");
  assert.equal(quality.finding, "unknown");

  const model = normalizeReasoning({
    assertions: [{ id: "fact-registration", text: "Registration observed." }],
    questions: [{ id: "q-who", text: "Who?", status: "open" }],
    hypotheses: [
      {
        id: "hyp-alice",
        text: "Unknown was Alice.",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateEntityId: "alice",
        alternativeGroupId: "unknown-person-a-identity",
      },
      {
        id: "hyp-none",
        text: "Unknown was none known.",
        hypothesisKind: "identity",
        unknownEntityId: "unknown-person-a",
        candidateScope: "none-known",
        alternativeGroupId: "unknown-person-a-identity",
      },
    ],
    assumptions: [assumption],
    linesOfEnquiry: [enquiry, falsify],
    informationReviews: [quality],
  });

  const errors = validateReasoning(model, {
    entityIds: ["unknown-person-a", "alice"],
    externalIds: ["ev-witness"],
  }).filter((finding) => finding.severity === "error");
  assert.deepEqual(errors, []);
});
