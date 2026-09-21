export type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type EntityId = Brand<string, "EntityId">;
export type RelationshipId = Brand<string, "RelationshipId">;
export type PlaceId = Brand<string, "PlaceId">;
export type OccurrenceId = Brand<string, "OccurrenceId">;
export type StoryId = Brand<string, "StoryId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type ClaimId = Brand<string, "ClaimId">;

export type CanonicalId =
  | EntityId
  | RelationshipId
  | PlaceId
  | OccurrenceId
  | StoryId
  | EvidenceId
  | ClaimId;

export const MAX_CANONICAL_ID_LENGTH = 160;

function normalizedId(value: unknown, kind: string): string {
  if (typeof value !== "string") throw new TypeError(`${kind} ID must be a string.`);
  const id = value.trim();
  if (!id) throw new TypeError(`${kind} ID must not be empty.`);
  if (id.length > MAX_CANONICAL_ID_LENGTH) {
    throw new TypeError(`${kind} ID exceeds ${MAX_CANONICAL_ID_LENGTH} characters.`);
  }
  return id;
}

export function entityId(value: unknown): EntityId {
  return normalizedId(value, "Entity") as EntityId;
}
export function relationshipId(value: unknown): RelationshipId {
  return normalizedId(value, "Relationship") as RelationshipId;
}
export function placeId(value: unknown): PlaceId {
  return normalizedId(value, "Place") as PlaceId;
}
export function occurrenceId(value: unknown): OccurrenceId {
  return normalizedId(value, "Occurrence") as OccurrenceId;
}
export function storyId(value: unknown): StoryId {
  return normalizedId(value, "Story") as StoryId;
}
export function evidenceId(value: unknown): EvidenceId {
  return normalizedId(value, "Evidence") as EvidenceId;
}
export function claimId(value: unknown): ClaimId {
  return normalizedId(value, "Claim") as ClaimId;
}
