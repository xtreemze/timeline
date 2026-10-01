import type { CanonicalOccurrenceId, PlaceId, SourceId, StoryId } from "./ids.ts";
import type { CanonicalSpatialGeometry } from "./geotemporal.ts";

export interface CanonicalPlace {
  readonly id: PlaceId;
  readonly name: string;
  readonly geometry: CanonicalSpatialGeometry;
  readonly geographicIdentifier?: string;
  readonly address?: string;
  readonly sourceIds: readonly SourceId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface CanonicalSource {
  readonly id: SourceId;
  readonly kind: string;
  readonly title: string;
  readonly sourceName?: string;
  readonly note?: string;
  readonly publishedAt?: string;
  readonly url?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface CanonicalCategory {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface CanonicalStory {
  readonly id: StoryId;
  readonly title: string;
  readonly description?: string;
  readonly occurrenceIds: readonly CanonicalOccurrenceId[];
  readonly placeIds: readonly PlaceId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function validatePlace(place: CanonicalPlace): readonly string[] {
  const findings: string[] = [];
  if (!nonEmpty(String(place.id))) findings.push("Place ID is required.");
  if (!nonEmpty(place.name)) findings.push("Place name is required.");
  if (new Set(place.sourceIds).size !== place.sourceIds.length) {
    findings.push("Place source references must be unique.");
  }
  return Object.freeze(findings);
}

export function validateSource(source: CanonicalSource): readonly string[] {
  const findings: string[] = [];
  if (!nonEmpty(String(source.id))) findings.push("Source ID is required.");
  if (!nonEmpty(source.kind)) findings.push("Source kind is required.");
  if (!nonEmpty(source.title)) findings.push("Source title is required.");
  return Object.freeze(findings);
}

export function validateCategory(category: CanonicalCategory): readonly string[] {
  const findings: string[] = [];
  if (!nonEmpty(category.id)) findings.push("Category ID is required.");
  if (!nonEmpty(category.name)) findings.push("Category name is required.");
  if (category.color !== undefined && !/^#[0-9a-f]{6}$/i.test(category.color)) {
    findings.push("Category color must be a six-digit hexadecimal color.");
  }
  return Object.freeze(findings);
}

export function validateStory(
  story: CanonicalStory,
  occurrenceIds: ReadonlySet<string>,
  placeIds: ReadonlySet<string>,
): readonly string[] {
  const findings: string[] = [];
  if (!nonEmpty(String(story.id))) findings.push("Story ID is required.");
  if (!nonEmpty(story.title)) findings.push("Story title is required.");
  if (new Set(story.occurrenceIds).size !== story.occurrenceIds.length) {
    findings.push("Story occurrence references must be unique.");
  }
  if (new Set(story.placeIds).size !== story.placeIds.length) {
    findings.push("Story place references must be unique.");
  }
  for (const id of story.occurrenceIds) {
    if (!occurrenceIds.has(String(id))) {
      findings.push(`Story occurrence ${String(id)} does not resolve.`);
    }
  }
  for (const id of story.placeIds) {
    if (!placeIds.has(String(id))) {
      findings.push(`Story place ${String(id)} does not resolve.`);
    }
  }
  return Object.freeze(findings);
}
