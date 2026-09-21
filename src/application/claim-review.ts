import type { CandidateClaimId, EntityId } from "../domain/ids.ts";
import type {
  CandidateClaim,
  ClaimLedger,
  ClaimReviewEvent,
} from "../domain/claim.ts";
import { validateCandidateClaim } from "../domain/claim.ts";
import type {
  CanonicalProject,
  RecordRelationshipResult,
} from "../domain/project.ts";
import { recordRelationship } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";

export interface ClaimReviewState {
  readonly project: CanonicalProject;
  readonly ledger: ClaimLedger;
}

export type ReviewCandidateClaimInput =
  | {
      readonly claimId: CandidateClaimId;
      readonly decision: "rejected" | "unresolved";
      readonly reviewedAt: string;
      readonly reviewerId?: EntityId;
      readonly rationale?: string;
    }
  | {
      readonly claimId: CandidateClaimId;
      readonly decision: "accepted";
      readonly reviewedAt: string;
      readonly reviewerId?: EntityId;
      readonly rationale?: string;
      readonly relationship: CanonicalRelationship;
    };

export interface ReviewCandidateClaimResult {
  readonly state: ClaimReviewState;
  readonly claim: CandidateClaim;
  readonly canonicalResult: RecordRelationshipResult | null;
}

function reviewEvent(input: ReviewCandidateClaimInput): ClaimReviewEvent {
  return {
    decision: input.decision,
    reviewedAt: input.reviewedAt,
    ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
    ...(input.rationale ? { rationale: input.rationale } : {}),
  };
}

export function reviewCandidateClaim(
  state: ClaimReviewState,
  input: ReviewCandidateClaimInput,
): ReviewCandidateClaimResult {
  const claim = state.ledger.claims.find((candidate) => candidate.id === input.claimId);
  if (!claim) throw new Error(`Candidate claim ${String(input.claimId)} does not exist.`);

  const findings = validateCandidateClaim(claim, state.ledger);
  if (findings.length) throw new Error(findings.join(" "));

  let project = state.project;
  let canonicalResult: RecordRelationshipResult | null = null;

  if (input.decision === "accepted") {
    if (claim.subject.kind !== "resolved" || claim.object.kind !== "resolved") {
      throw new Error("Accepted claims require resolved subject and object entities.");
    }

    if (
      input.relationship.subjectId !== claim.subject.entityId ||
      input.relationship.objectId !== claim.object.entityId ||
      input.relationship.predicate.trim().toLocaleLowerCase() !==
        claim.predicate.trim().toLocaleLowerCase()
    ) {
      throw new Error("Accepted relationship does not match the reviewed claim.");
    }

    for (const sourceId of claim.sourceIds) {
      if (!input.relationship.sourceIds.includes(sourceId)) {
        throw new Error(
          `Accepted relationship must preserve claim source ${String(sourceId)}.`,
        );
      }
    }

    canonicalResult = recordRelationship(state.project, input.relationship);
    project = canonicalResult.project;
  }

  const updatedClaim: CandidateClaim = {
    ...claim,
    status: input.decision,
    reviewHistory: [...claim.reviewHistory, reviewEvent(input)],
  };

  const ledger: ClaimLedger = {
    ...state.ledger,
    claims: state.ledger.claims.map((candidate) =>
      candidate.id === claim.id ? updatedClaim : candidate,
    ),
  };

  return {
    state: { project, ledger },
    claim: updatedClaim,
    canonicalResult,
  };
}
