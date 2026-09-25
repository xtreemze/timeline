import type { ValidationResult } from "./entity.ts";
import type {
  CategoryId,
  EvidenceId,
  OccurrenceId,
  PlaceId,
  SourceId,
  StoryId,
} from "./ids.ts";
import type { CanonicalTemporalExtent } from "./relationship.ts";

export interface CanonicalCategory {
  readonly id: CategoryId;
  readonly name: string;
  readonly color: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

export interface CanonicalOccurrence {
  readonly id: OccurrenceId;
  readonly time: CanonicalTemporalExtent;
  readonly title: string;
  readonly description: string;
  readonly categoryId: CategoryId | null;
  readonly placeIds: readonly PlaceId[];
  readonly evidenceIds: readonly EvidenceId[];
  readonly sourceIds: readonly SourceId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface CanonicalStory {
  readonly id: StoryId;
  readonly title: string;
  readonly description: string;
  readonly occurrenceIds: readonly OccurrenceId[];
  readonly placeIds: readonly PlaceId[];
  readonly extensions: Readonly<Record<string, unknown>>;
}

export interface CanonicalChronology {
  readonly categories: readonly CanonicalCategory[];
  readonly occurrences: readonly CanonicalOccurrence[];
  readonly stories: readonly CanonicalStory[];
}

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function uniqueReferences(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function validateCategory(
  category: Pick<CanonicalCategory, "name" | "color">,
): ValidationResult {
  if (!category.name.trim()) {
    return { valid: false, message: "A category name is required." };
  }
  if (!COLOR_PATTERN.test(category.color)) {
    return { valid: false, message: "Category color must be a six-digit hexadecimal color." };
  }
  return { valid: true, message: "" };
}

export function validateOccurrence(
  occurrence: Pick<
    CanonicalOccurrence,
    "title" | "time" | "placeIds" | "evidenceIds" | "sourceIds"
  >,
): ValidationResult {
  if (!occurrence.title.trim()) {
    return { valid: false, message: "An occurrence title is required." };
  }
  if (occurrence.time.type !== "instant" && occurrence.time.type !== "interval") {
    return { valid: false, message: "Occurrence time must be an instant or interval." };
  }
  if (!uniqueReferences(occurrence.placeIds)) {
    return { valid: false, message: "Occurrence place references must be unique." };
  }
  if (!uniqueReferences(occurrence.evidenceIds)) {
    return { valid: false, message: "Occurrence evidence references must be unique." };
  }
  if (!uniqueReferences(occurrence.sourceIds)) {
    return { valid: false, message: "Occurrence source references must be unique." };
  }
  return { valid: true, message: "" };
}

export function validateStory(
  story: Pick<CanonicalStory, "title" | "occurrenceIds" | "placeIds">,
): ValidationResult {
  if (!story.title.trim()) {
    return { valid: false, message: "A story title is required." };
  }
  if (!uniqueReferences(story.occurrenceIds)) {
    return { valid: false, message: "Story occurrence membership must not contain duplicates." };
  }
  if (!uniqueReferences(story.placeIds)) {
    return { valid: false, message: "Story place references must not contain duplicates." };
  }
  return { valid: true, message: "" };
}

export function validateChronology(chronology: CanonicalChronology): readonly string[] {
  const findings: string[] = [];
  const categoryIds = new Set<CategoryId>();
  const occurrenceIds = new Set<OccurrenceId>();
  const storyIds = new Set<StoryId>();

  for (const category of chronology.categories) {
    const validation = validateCategory(category);
    if (!validation.valid) findings.push(validation.message);
    if (categoryIds.has(category.id)) {
      findings.push(`Duplicate category ID "${String(category.id)}".`);
    }
    categoryIds.add(category.id);
  }

  for (const occurrence of chronology.occurrences) {
    const validation = validateOccurrence(occurrence);
    if (!validation.valid) findings.push(validation.message);
    if (occurrenceIds.has(occurrence.id)) {
      findings.push(`Duplicate occurrence ID "${String(occurrence.id)}".`);
    }
    occurrenceIds.add(occurrence.id);
    if (occurrence.categoryId !== null && !categoryIds.has(occurrence.categoryId)) {
      findings.push(
        `Occurrence "${String(occurrence.id)}" references unknown category "${String(occurrence.categoryId)}".`,
      );
    }
  }

  for (const story of chronology.stories) {
    const validation = validateStory(story);
    if (!validation.valid) findings.push(validation.message);
    if (storyIds.has(story.id)) {
      findings.push(`Duplicate story ID "${String(story.id)}".`);
    }
    storyIds.add(story.id);
    for (const id of story.occurrenceIds) {
      if (!occurrenceIds.has(id)) {
        findings.push(
          `Story "${String(story.id)}" references unknown occurrence "${String(id)}".`,
        );
      }
    }
  }

  return Object.freeze(findings);
}
