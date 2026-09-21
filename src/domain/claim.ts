import type {
  CandidateClaimId,
  EntityId,
  PlaceId,
  SourceArtifactId,
  SourceFragmentId,
  SourceId,
} from "./ids.ts";
import type { CanonicalTemporalExtent } from "./relationship.ts";

export type ExtractionMethod = "native-text" | "ocr" | "language-model" | "import";

export interface SourceArtifact {
  readonly id: SourceArtifactId;
  readonly sourceId: SourceId;
  readonly mediaType: string;
  readonly title: string;
  readonly integrityDigest?: string;
}

export interface SourceLocator {
  readonly kind: "page" | "line" | "paragraph" | "time" | "record" | "image" | "unknown";
  readonly value: string;
}

export interface ExtractedFragment {
  readonly id: SourceFragmentId;
  readonly artifactId: SourceArtifactId;
  readonly sourceId: SourceId;
  readonly locator: SourceLocator;
  readonly text: string;
  readonly extraction: Readonly<{
    method: ExtractionMethod;
    provider?: string;
    model?: string;
    version?: string;
  }>;
  readonly confidence: number | null;
}

export type CandidateReference =
  | { readonly kind: "resolved"; readonly entityId: EntityId }
  | { readonly kind: "unresolved"; readonly label: string };

export type CandidateClaimStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "unresolved";

export interface ClaimReviewEvent {
  readonly decision: "accepted" | "rejected" | "unresolved";
  readonly reviewedAt: string;
  readonly reviewerId?: EntityId;
  readonly rationale?: string;
}

export interface CandidateClaim {
  readonly id: CandidateClaimId;
  readonly subject: CandidateReference;
  readonly predicate: string;
  readonly object: CandidateReference;
  readonly time: CanonicalTemporalExtent | null;
  readonly placeId?: PlaceId;
  readonly sourceIds: readonly SourceId[];
  readonly fragmentIds: readonly SourceFragmentId[];
  readonly confidence: number | null;
  readonly rationale: string;
  readonly contradictionIds: readonly CandidateClaimId[];
  readonly status: CandidateClaimStatus;
  readonly reviewHistory: readonly ClaimReviewEvent[];
}

export interface ClaimLedger {
  readonly artifacts: readonly SourceArtifact[];
  readonly fragments: readonly ExtractedFragment[];
  readonly claims: readonly CandidateClaim[];
}

export function validateFragment(fragment: ExtractedFragment): string[] {
  const findings: string[] = [];
  if (!fragment.text.trim()) findings.push("Extracted fragment text must not be empty.");
  if (!fragment.locator.value.trim()) findings.push("Extracted fragment requires a source locator.");
  if (fragment.confidence !== null && (fragment.confidence < 0 || fragment.confidence > 1)) {
    findings.push("Extracted fragment confidence must be between 0 and 1.");
  }
  return findings;
}

export function validateCandidateClaim(
  claim: CandidateClaim,
  ledger: ClaimLedger,
): string[] {
  const findings: string[] = [];
  if (!claim.predicate.trim()) findings.push("Candidate claim requires an action predicate.");
  if (!claim.fragmentIds.length) findings.push("Candidate claim requires at least one source fragment.");
  if (!claim.sourceIds.length) findings.push("Candidate claim requires at least one source.");
  if (claim.confidence !== null && (claim.confidence < 0 || claim.confidence > 1)) {
    findings.push("Candidate claim confidence must be between 0 and 1.");
  }

  const fragmentById = new Map(ledger.fragments.map((fragment) => [fragment.id, fragment]));
  for (const fragmentId of claim.fragmentIds) {
    const fragment = fragmentById.get(fragmentId);
    if (!fragment) {
      findings.push(`Candidate claim fragment ${String(fragmentId)} does not resolve.`);
      continue;
    }
    if (!claim.sourceIds.includes(fragment.sourceId)) {
      findings.push(
        `Candidate claim source list does not include fragment source ${String(fragment.sourceId)}.`,
      );
    }
  }

  const claimIds = new Set(ledger.claims.map((candidate) => candidate.id));
  for (const contradictionId of claim.contradictionIds) {
    if (contradictionId === claim.id) {
      findings.push("Candidate claim cannot contradict itself.");
    } else if (!claimIds.has(contradictionId)) {
      findings.push(`Contradictory claim ${String(contradictionId)} does not resolve.`);
    }
  }

  return findings;
}
