declare const timelineIdBrand: unique symbol;

export type TimelineId<Kind extends string> = string & {
  readonly [timelineIdBrand]: Kind;
};

export type EntityId = TimelineId<"entity">;
export type RelationshipId = TimelineId<"relationship">;
export type PlaceId = TimelineId<"place">;
export type EvidenceId = TimelineId<"evidence">;
export type StoryId = TimelineId<"story">;
export type SourceId = TimelineId<"source">;
export type SourceArtifactId = TimelineId<"source-artifact">;
export type SourceFragmentId = TimelineId<"source-fragment">;
export type CandidateClaimId = TimelineId<"candidate-claim">;

function canonicalId<Kind extends string>(value: string, label: string): TimelineId<Kind> {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be a non-empty canonical identifier.`);
  return normalized as TimelineId<Kind>;
}

export const entityId = (value: string): EntityId => canonicalId<"entity">(value, "Entity ID");
export const relationshipId = (value: string): RelationshipId =>
  canonicalId<"relationship">(value, "Relationship ID");
export const placeId = (value: string): PlaceId => canonicalId<"place">(value, "Place ID");
export const evidenceId = (value: string): EvidenceId => canonicalId<"evidence">(value, "Evidence ID");
export const storyId = (value: string): StoryId => canonicalId<"story">(value, "Story ID");
export const sourceId = (value: string): SourceId => canonicalId<"source">(value, "Source ID");
export const sourceArtifactId = (value: string): SourceArtifactId =>
  canonicalId<"source-artifact">(value, "Source artifact ID");
export const sourceFragmentId = (value: string): SourceFragmentId =>
  canonicalId<"source-fragment">(value, "Source fragment ID");
export const candidateClaimId = (value: string): CandidateClaimId =>
  canonicalId<"candidate-claim">(value, "Candidate claim ID");
