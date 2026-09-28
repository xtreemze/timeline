import type { ApplicationSelection } from "./selection.ts";

interface TimelineSelectionRelation {
  readonly id?: unknown;
  readonly subjectId?: unknown;
  readonly objectId?: unknown;
}

interface TimelineSelectionLocation {
  readonly id?: unknown;
}

export interface TimelineSelectionItem {
  readonly id: string;
  readonly location?: unknown;
  readonly relations?: unknown;
}

export interface TimelineSelectionProjection {
  readonly itemIds: readonly string[];
  readonly relationshipId: string | null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function relations(item: TimelineSelectionItem): readonly TimelineSelectionRelation[] {
  return Array.isArray(item.relations)
    ? item.relations.filter(
        (value): value is TimelineSelectionRelation =>
          typeof value === "object" && value !== null && !Array.isArray(value),
      )
    : [];
}

function locationId(item: TimelineSelectionItem): string {
  const location = item.location;
  return typeof location === "object" && location !== null && !Array.isArray(location)
    ? text((location as TimelineSelectionLocation).id)
    : "";
}

/**
 * Project canonical application selection onto existing chronology presentation.
 *
 * This is intentionally one-way and read-only. It never chooses canonical
 * selection from timeline state and never opens focus/detail UI.
 */
export function projectTimelineSelection(
  selection: ApplicationSelection | null,
  items: readonly TimelineSelectionItem[],
): TimelineSelectionProjection {
  if (!selection) {
    return Object.freeze({ itemIds: Object.freeze([]), relationshipId: null });
  }

  const selected = new Set<string>();
  if (selection.kind === "relationship") {
    for (const item of items) {
      if (item.id === selection.id) {
        selected.add(item.id);
        continue;
      }
      if (relations(item).some((relation) => text(relation.id) === selection.id)) {
        selected.add(item.id);
      }
    }
    return Object.freeze({
      itemIds: Object.freeze([...selected].sort()),
      relationshipId: selection.id,
    });
  }

  if (selection.kind === "entity") {
    for (const item of items) {
      if (
        relations(item).some(
          (relation) =>
            text(relation.subjectId) === selection.id || text(relation.objectId) === selection.id,
        )
      ) {
        selected.add(item.id);
      }
    }
  } else {
    for (const item of items) {
      if (locationId(item) === selection.id) selected.add(item.id);
    }
  }

  return Object.freeze({
    itemIds: Object.freeze([...selected].sort()),
    relationshipId: null,
  });
}
