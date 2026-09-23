import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateClaimId,
  entityId,
  relationshipId,
  sourceArtifactId,
  sourceFragmentId,
  sourceId,
} from "../src/domain/index.ts";
import { validateCandidateClaim, validateFragment } from "../src/domain/claim.ts";
import { reviewCandidateClaim } from "../src/application/claim-review.ts";

const alice = {
  id: entityId("alice"),
  type: "person",
  name: "Alice",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};
const bob = {
  id: entityId("bob"),
  type: "person",
  name: "Bob",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};

const source = sourceId("source-a");
const artifact = {
  id: sourceArtifactId("artifact-a"),
  sourceId: source,
  mediaType: "application/pdf",
  title: "Exhibit A",
};
const fragment = {
  id: sourceFragmentId("fragment-a"),
  artifactId: artifact.id,
  sourceId: source,
  locator: { kind: "page", value: "4" },
  text: "Alice warned Bob.",
  extraction: { method: "native-text" },
  confidence: 1,
};
const claim = {
  id: candidateClaimId("claim-a"),
  subject: { kind: "resolved", entityId: alice.id },
  predicate: "warned",
  object: { kind: "resolved", entityId: bob.id },
  time: null,
  sourceIds: [source],
  fragmentIds: [fragment.id],
  confidence: 0.9,
  rationale: "Explicit sentence in exhibit.",
  contradictionIds: [],
  status: "proposed",
  reviewHistory: [],
};
const ledger = { artifacts: [artifact], fragments: [fragment], claims: [claim] };
const project = { schemaVersion: 3, entities: [alice, bob], relationships: [] };

test("source fragments require text, locator, and bounded confidence", () => {
  assert.deepEqual(validateFragment(fragment), []);
  assert.equal(validateFragment({ ...fragment, text: "" }).length, 1);
  assert.equal(validateFragment({ ...fragment, confidence: 2 }).length, 1);
});

test("candidate claims preserve resolvable fragment/source provenance", () => {
  assert.deepEqual(validateCandidateClaim(claim, ledger), []);
  assert.match(validateCandidateClaim({ ...claim, sourceIds: [] }, ledger).join(" "), /source/i);
});

test("accepted claim commits one canonical relationship atomically", () => {
  const result = reviewCandidateClaim(
    { project, ledger },
    {
      claimId: claim.id,
      decision: "accepted",
      reviewedAt: "2026-09-21T07:10:00Z",
      relationship: {
        id: relationshipId("rel-a"),
        subjectId: alice.id,
        objectId: bob.id,
        predicate: "warned",
        itemIds: [],
        sourceIds: [source],
        confidence: 0.9,
        time: null,
        attributes: {},
      },
    },
  );

  assert.equal(result.claim.status, "accepted");
  assert.equal(result.canonicalResult?.status, "created");
  assert.equal(result.state.project.relationships.length, 1);
  assert.equal(project.relationships.length, 0);
  assert.equal(result.claim.reviewHistory.length, 1);
});

test("rejected and unresolved claims remain inspectable without canonical mutation", () => {
  const result = reviewCandidateClaim(
    { project, ledger },
    {
      claimId: claim.id,
      decision: "rejected",
      reviewedAt: "2026-09-21T07:11:00Z",
      rationale: "Source text is ambiguous.",
    },
  );
  assert.equal(result.claim.status, "rejected");
  assert.equal(result.canonicalResult, null);
  assert.equal(result.state.project, project);
  assert.equal(result.state.ledger.claims.length, 1);
});

test("acceptance cannot discard claim provenance", () => {
  assert.throws(() =>
    reviewCandidateClaim(
      { project, ledger },
      {
        claimId: claim.id,
        decision: "accepted",
        reviewedAt: "2026-09-21T07:12:00Z",
        relationship: {
          id: relationshipId("rel-without-source"),
          subjectId: alice.id,
          objectId: bob.id,
          predicate: "warned",
          itemIds: [],
          sourceIds: [],
          confidence: 0.9,
          time: null,
          attributes: {},
        },
      },
    ),
  );
});

test("contradictory candidate claims coexist without automatic truth selection", () => {
  const other = {
    ...claim,
    id: candidateClaimId("claim-b"),
    predicate: "denied",
    contradictionIds: [claim.id],
  };
  const first = { ...claim, contradictionIds: [other.id] };
  const contradictoryLedger = { ...ledger, claims: [first, other] };

  assert.deepEqual(validateCandidateClaim(first, contradictoryLedger), []);
  assert.deepEqual(validateCandidateClaim(other, contradictoryLedger), []);
  assert.equal(contradictoryLedger.claims.length, 2);
});
