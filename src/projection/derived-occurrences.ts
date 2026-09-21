/**
 * Derived Occurrences: Project relationships into timeline occurrences.
 * This bridges the gap between the canonical relationship model (where relationships are primary)
 * and the timeline rendering model (which expects occurrence-like items).
 *
 * In the new architecture, relationships ARE occurrences when they have temporal extent.
 * This projection makes that explicit while preserving backward compatibility.
 */

import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type { CanonicalEntity } from "../domain/entity.ts";
import type { TimelineOccurrenceProjection } from "./timeline-projection.ts";

export interface DerivedOccurrence {
  readonly id: string; // Relationship ID
  readonly relationshipId: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly subjectName: string;
  readonly objectName: string;
  readonly predicate: string;
  readonly role: string;
  readonly placeId: string;
  readonly itemIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly confidence: number | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly title: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

function entityName(entity: CanonicalEntity | undefined, id: string): string {
  if (entity?.name) return entity.name;
  return id;
}

function formatTemporalEndpoint(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().slice(0, 120);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.value === "string") {
      return obj.value.trim().slice(0, 120);
    }
    if (typeof obj.sourceText === "string") {
      return obj.sourceText.trim().slice(0, 120);
    }
  }
  return "";
}

function parseTemporalValue(value: unknown): number | null {
  const source = formatTemporalEndpoint(value);
  if (!source) return null;

  // ISO year format: YYYY or ±YYYY
  const yearMatch = /^([+-]?\d{1,6})$/.exec(source);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return new Date(year, 0, 1).getTime();
  }

  // ISO year-month format: YYYY-MM
  const monthMatch = /^([+-]?\d{1,6})-(\d{2})$/.exec(source);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]) - 1;
    return new Date(year, month, 1).getTime();
  }

  // ISO date format: YYYY-MM-DD
  const dateMatch = /^([+-]?\d{1,6})-(\d{2})-(\d{2})$/.exec(source);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const day = Number(dateMatch[3]);
    return new Date(year, month, day).getTime();
  }

  // Try full timestamp parse
  const timestamp = Date.parse(source);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function derivedOccurrenceFromRelationship(
  relationship: CanonicalRelationship,
  project: CanonicalProject,
): DerivedOccurrence | null {
  // A relationship is an occurrence only if it has temporal information
  if (!relationship.time) return null;

  const subject = project.entities.find((e) => e.id === relationship.subjectId);
  const object = project.entities.find((e) => e.id === relationship.objectId);

  const start = parseTemporalValue(relationship.time?.start);
  const end = parseTemporalValue(relationship.time?.end);

  // At least start time is required for a temporal relationship
  if (start === null) return null;

  const startLabel = formatTemporalEndpoint(relationship.time?.start);
  const endLabel = formatTemporalEndpoint(relationship.time?.end);

  // Build a readable title from subject + predicate + object
  const subjectName = entityName(subject, relationship.subjectId);
  const objectName = entityName(object, relationship.objectId);
  const title = `${subjectName} ${relationship.predicate} ${objectName}`;

  return {
    id: relationship.id,
    relationshipId: relationship.id,
    subjectId: relationship.subjectId,
    objectId: relationship.objectId,
    subjectName,
    objectName,
    predicate: relationship.predicate,
    role: relationship.role || "",
    placeId: relationship.placeId || "",
    itemIds: relationship.itemIds,
    sourceIds: relationship.sourceIds,
    confidence: relationship.confidence,
    start,
    end: end || null,
    startLabel,
    endLabel,
    title,
    attributes: relationship.attributes,
  };
}

/**
 * Project all temporal relationships into derived occurrences.
 * Only relationships with temporal extent become occurrences.
 */
export function projectDerivedOccurrences(project: CanonicalProject): readonly DerivedOccurrence[] {
  const occurrences: DerivedOccurrence[] = [];

  for (const relationship of project.relationships) {
    const occurrence = derivedOccurrenceFromRelationship(relationship, project);
    if (occurrence) {
      occurrences.push(occurrence);
    }
  }

  return occurrences;
}

/**
 * Convert a derived occurrence to timeline projection format.
 * This enables the timeline renderer to work with derived occurrences.
 */
export function toTimelineOccurrenceProjection(
  occurrence: DerivedOccurrence,
): TimelineOccurrenceProjection {
  return {
    occurrenceId: occurrence.id,
    relationshipId: occurrence.relationshipId,
    subjectId: occurrence.subjectId,
    objectId: occurrence.objectId,
    subjectName: occurrence.subjectName,
    objectName: occurrence.objectName,
    predicate: occurrence.predicate,
    role: occurrence.role,
    placeId: occurrence.placeId,
    itemIds: occurrence.itemIds,
    sourceIds: occurrence.sourceIds,
    confidence: occurrence.confidence,
    start: occurrence.start || 0,
    end: occurrence.end,
    startLabel: occurrence.startLabel,
    endLabel: occurrence.endLabel,
    title: occurrence.title,
    attributes: occurrence.attributes,
  };
}
