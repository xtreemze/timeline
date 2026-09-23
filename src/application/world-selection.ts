import type {
  EntityId,
  EvidenceId,
  PlaceId,
  RelationshipId,
} from "../domain/ids.ts";

export type CanonicalWorldHit =
  | {
      readonly kind: "entity";
      readonly entityId: EntityId;
      readonly worldInstanceId?: string;
      readonly depth?: number;
    }
  | {
      readonly kind: "relationship";
      readonly relationshipId: RelationshipId;
      readonly depth?: number;
    }
  | {
      readonly kind: "place";
      readonly placeId: PlaceId;
      readonly depth?: number;
    }
  | {
      readonly kind: "background";
      readonly depth?: number;
    };

export type CanonicalSelectionItem =
  | { readonly kind: "entity"; readonly id: EntityId }
  | { readonly kind: "occurrence"; readonly id: RelationshipId }
  | { readonly kind: "place"; readonly id: PlaceId }
  | { readonly kind: "evidence"; readonly id: EvidenceId };

export interface CanonicalSelectionSet {
  readonly entityIds: readonly EntityId[];
  readonly occurrenceIds: readonly RelationshipId[];
  readonly placeIds: readonly PlaceId[];
  readonly evidenceIds: readonly EvidenceId[];
}

export interface SelectionSummary {
  readonly total: number;
  readonly entities: number;
  readonly occurrences: number;
  readonly places: number;
  readonly evidence: number;
}

export type WorldSearchKind = CanonicalSelectionItem["kind"];

export interface WorldSearchRecord {
  readonly kind: WorldSearchKind;
  readonly id: string;
  readonly label: string;
  readonly aliases?: readonly string[];
  readonly detail?: string;
  readonly keywords?: readonly string[];
}

export interface WorldSearchResult extends WorldSearchRecord {
  readonly score: number;
}

export interface WorldSearchOptions {
  readonly limit?: number;
  readonly kinds?: readonly WorldSearchKind[];
}

export interface WorldSearchIndex {
  readonly size: number;
  query(text: string, options?: WorldSearchOptions): readonly WorldSearchResult[];
}

const EMPTY_SELECTION = Object.freeze({
  entityIds: Object.freeze([]),
  occurrenceIds: Object.freeze([]),
  placeIds: Object.freeze([]),
  evidenceIds: Object.freeze([]),
}) as CanonicalSelectionSet;

function normalizedId(value: string): string {
  const id = value.trim();
  if (!id) throw new Error("Selection ID must be non-empty.");
  return id;
}

function sortedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values.map((value) => normalizedId(value) as T))].sort((left, right) =>
      String(left).localeCompare(String(right)),
    ),
  );
}

export function createCanonicalSelectionSet(
  input: Partial<CanonicalSelectionSet> = {},
): CanonicalSelectionSet {
  return Object.freeze({
    entityIds: sortedUnique(input.entityIds ?? []),
    occurrenceIds: sortedUnique(input.occurrenceIds ?? []),
    placeIds: sortedUnique(input.placeIds ?? []),
    evidenceIds: sortedUnique(input.evidenceIds ?? []),
  });
}

function keyFor(kind: CanonicalSelectionItem["kind"]): keyof CanonicalSelectionSet {
  if (kind === "entity") return "entityIds";
  if (kind === "occurrence") return "occurrenceIds";
  if (kind === "place") return "placeIds";
  return "evidenceIds";
}

export function selectionContains(
  selection: CanonicalSelectionSet,
  item: CanonicalSelectionItem,
): boolean {
  return selection[keyFor(item.kind)].includes(item.id as never);
}

export function addSelectionItem(
  selection: CanonicalSelectionSet,
  item: CanonicalSelectionItem,
): CanonicalSelectionSet {
  const key = keyFor(item.kind);
  return createCanonicalSelectionSet({
    ...selection,
    [key]: [...selection[key], item.id],
  } as Partial<CanonicalSelectionSet>);
}

export function removeSelectionItem(
  selection: CanonicalSelectionSet,
  item: CanonicalSelectionItem,
): CanonicalSelectionSet {
  const key = keyFor(item.kind);
  return createCanonicalSelectionSet({
    ...selection,
    [key]: selection[key].filter((id) => id !== item.id),
  } as Partial<CanonicalSelectionSet>);
}

export function toggleSelectionItem(
  selection: CanonicalSelectionSet,
  item: CanonicalSelectionItem,
): CanonicalSelectionSet {
  return selectionContains(selection, item)
    ? removeSelectionItem(selection, item)
    : addSelectionItem(selection, item);
}

export function clearCanonicalSelection(): CanonicalSelectionSet {
  return EMPTY_SELECTION;
}

export function summarizeSelection(selection: CanonicalSelectionSet): SelectionSummary {
  const summary = Object.freeze({
    entities: selection.entityIds.length,
    occurrences: selection.occurrenceIds.length,
    places: selection.placeIds.length,
    evidence: selection.evidenceIds.length,
    total:
      selection.entityIds.length +
      selection.occurrenceIds.length +
      selection.placeIds.length +
      selection.evidenceIds.length,
  });
  return summary;
}

export function selectionItemFromWorldHit(
  hit: CanonicalWorldHit | null,
): CanonicalSelectionItem | null {
  if (!hit || hit.kind === "background") return null;
  if (hit.kind === "entity") {
    return Object.freeze({ kind: "entity", id: hit.entityId });
  }
  if (hit.kind === "relationship") {
    return Object.freeze({ kind: "occurrence", id: hit.relationshipId });
  }
  return Object.freeze({ kind: "place", id: hit.placeId });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalStringList(values: readonly string[] | undefined): readonly string[] | undefined {
  if (!values?.length) return undefined;
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right),
    ),
  );
}

function canonicalRecord(record: WorldSearchRecord): WorldSearchRecord {
  const id = normalizedId(record.id);
  const label = record.label.trim();
  if (!label) throw new Error("Search record label must be non-empty.");

  const aliases = canonicalStringList(record.aliases);
  const keywords = canonicalStringList(record.keywords);
  const detail = record.detail?.trim();

  return Object.freeze({
    kind: record.kind,
    id,
    label,
    ...(aliases ? { aliases } : {}),
    ...(detail ? { detail } : {}),
    ...(keywords ? { keywords } : {}),
  });
}

function scoreRecord(record: WorldSearchRecord, query: string): number | null {
  const label = normalizeSearchText(record.label);
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;

  const tokens = label.split(" ");
  if (tokens.some((token) => token.startsWith(query))) return 2;
  if (label.includes(query)) return 3;

  const extra = normalizeSearchText(
    [...(record.aliases ?? []), record.detail ?? "", ...(record.keywords ?? [])].join(" "),
  );
  if (extra.includes(query)) return 4;
  return null;
}

export function createWorldSearchIndex(records: readonly WorldSearchRecord[]): WorldSearchIndex {
  const canonical = Object.freeze(
    records
      .map(canonicalRecord)
      .sort(
        (left, right) =>
          left.kind.localeCompare(right.kind) ||
          left.label.localeCompare(right.label) ||
          left.id.localeCompare(right.id),
      ),
  );

  return Object.freeze({
    size: canonical.length,
    query(text: string, options: WorldSearchOptions = {}): readonly WorldSearchResult[] {
      const query = normalizeSearchText(text);
      if (!query) return Object.freeze([]);

      const allowedKinds = options.kinds?.length ? new Set(options.kinds) : null;
      const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 20)));

      return Object.freeze(
        canonical
          .filter((record) => !allowedKinds || allowedKinds.has(record.kind))
          .map((record) => ({ record, score: scoreRecord(record, query) }))
          .filter(
            (entry): entry is { readonly record: WorldSearchRecord; readonly score: number } =>
              entry.score !== null,
          )
          .sort(
            (left, right) =>
              left.score - right.score ||
              left.record.label.localeCompare(right.record.label) ||
              left.record.id.localeCompare(right.record.id),
          )
          .slice(0, limit)
          .map(({ record, score }) => Object.freeze({ ...record, score })),
      );
    },
  });
}
