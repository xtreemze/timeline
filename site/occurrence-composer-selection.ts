import type { ApplicationSelectionChange } from "../src/application/selection.ts";

/** A user-selected occurrence is the composer card's active context. */
export function shouldOpenComposerForSelection(change: ApplicationSelectionChange): boolean {
  return change.selection?.kind === "relationship" && change.source !== "app";
}

interface RelationshipSelectionRecord {
  readonly itemIds?: readonly unknown[];
  readonly time?: unknown;
}

interface TimelineSelectionItemRecord {
  readonly id?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly time?: unknown;
}

function selectionText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function temporalEndpoint(record: unknown, endpoint: "start" | "end"): string {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return "";
  const source = record as Record<string, unknown>;
  const time = source.time;
  const timed =
    typeof time === "object" && time !== null && !Array.isArray(time)
      ? (time as Record<string, unknown>)[endpoint]
      : undefined;
  const raw = timed ?? source[endpoint];
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return selectionText((raw as Record<string, unknown>).value);
  }
  return selectionText(raw);
}

/**
 * Resolve a World relationship to the chronology item that actually presents
 * that occurrence. Relationship itemIds can include broad narrative context,
 * so an exact canonical temporal extent outranks those contextual links.
 */
export function timelineItemIdForRelationshipSelection(
  relationship: RelationshipSelectionRecord,
  items: readonly TimelineSelectionItemRecord[],
  requestedItemId?: string | null,
): string | null {
  const itemsById = new Map(
    items.map((item) => [selectionText(item.id), item] as const).filter(([id]) => Boolean(id)),
  );
  const linkedItemIds = [
    ...new Set(
      (Array.isArray(relationship.itemIds) ? relationship.itemIds : [])
        .map(selectionText)
        .filter((id) => Boolean(id) && itemsById.has(id)),
    ),
  ];
  if (!linkedItemIds.length) return null;

  const relationshipStart = temporalEndpoint(relationship, "start");
  const relationshipEnd = temporalEndpoint(relationship, "end");
  if (relationshipStart) {
    const exactTemporalMatches = linkedItemIds.filter((id) => {
      const item = itemsById.get(id);
      return (
        temporalEndpoint(item, "start") === relationshipStart &&
        temporalEndpoint(item, "end") === relationshipEnd
      );
    });
    if (exactTemporalMatches.length === 1) return exactTemporalMatches[0];
  }

  const requested = selectionText(requestedItemId);
  if (requested && linkedItemIds.includes(requested)) return requested;
  return linkedItemIds.length === 1 ? linkedItemIds[0] : null;
}
