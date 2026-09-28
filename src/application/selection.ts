export type ApplicationSelectionKind = "entity" | "relationship" | "place";
export type ApplicationSelectionSource = "world" | "timeline" | "app";

export interface ApplicationSelection {
  readonly kind: ApplicationSelectionKind;
  readonly id: string;
  readonly itemId?: string;
}

export interface ApplicationSelectionChange {
  readonly selection: ApplicationSelection | null;
  readonly source: ApplicationSelectionSource;
}

export interface TimelineSelectionRelationship {
  readonly id?: unknown;
  readonly itemIds?: readonly unknown[];
}

export type ApplicationSelectionListener = (change: ApplicationSelectionChange) => void;

function normalizedId(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function normalizeSelection(
  selection: ApplicationSelection | null | undefined,
): ApplicationSelection | null {
  if (!selection) return null;
  const id = normalizedId(selection.id);
  if (!id) return null;
  const itemId = selection.kind === "relationship" ? normalizedId(selection.itemId) : "";
  return Object.freeze({
    kind: selection.kind,
    id,
    ...(itemId ? { itemId } : {}),
  });
}

function sameSelection(
  left: ApplicationSelection | null,
  right: ApplicationSelection | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.kind === right.kind && left.id === right.id && (left.itemId ?? "") === (right.itemId ?? "")
  );
}

/**
 * Resolve timeline focus to canonical relationship identity without guessing.
 *
 * A projected relationship occurrence uses the relationship id directly.
 * Ordinary chronology items map only when exactly one relationship owns them.
 */
export function selectionForTimelineFocus(
  focusId: unknown,
  relationships: readonly TimelineSelectionRelationship[],
): ApplicationSelection | null {
  const id = normalizedId(focusId);
  if (!id) return null;

  const exact = relationships.find((relationship) => normalizedId(relationship.id) === id);
  if (exact) {
    return Object.freeze({ kind: "relationship", id });
  }

  const owners = relationships
    .filter((relationship) =>
      Array.isArray(relationship.itemIds)
        ? relationship.itemIds.some((itemId) => normalizedId(itemId) === id)
        : false,
    )
    .map((relationship) => normalizedId(relationship.id))
    .filter(Boolean);

  const uniqueOwners = [...new Set(owners)];
  return uniqueOwners.length === 1
    ? Object.freeze({ kind: "relationship", id: uniqueOwners[0]!, itemId: id })
    : null;
}

/**
 * Renderer-neutral canonical application selection.
 *
 * Renderers publish user-originated changes into this controller. The
 * controller fans state back out programmatically, and renderer sinks stay
 * silent, preventing world/timeline feedback loops.
 */
export class ApplicationSelectionController {
  #selection: ApplicationSelection | null = null;
  readonly #listeners = new Set<ApplicationSelectionListener>();

  get current(): ApplicationSelection | null {
    return this.#selection;
  }

  select(
    selection: ApplicationSelection | null | undefined,
    source: ApplicationSelectionSource = "app",
  ): boolean {
    const next = normalizeSelection(selection);
    if (sameSelection(next, this.#selection)) return false;
    this.#selection = next;
    const change = Object.freeze({ selection: next, source });
    for (const listener of this.#listeners) listener(change);
    return true;
  }

  clear(source: ApplicationSelectionSource = "app"): boolean {
    return this.select(null, source);
  }

  subscribe(listener: ApplicationSelectionListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  retain(valid: Readonly<Record<ApplicationSelectionKind, ReadonlySet<string>>>): boolean {
    const selection = this.#selection;
    if (!selection || valid[selection.kind].has(selection.id)) return false;
    return this.clear("app");
  }
}

export function createApplicationSelectionController(): ApplicationSelectionController {
  return new ApplicationSelectionController();
}
