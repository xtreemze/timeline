export type ApplicationSelectionKind = "node" | "edge" | "place";
export type ApplicationSelectionSource = "graph" | "world" | "timeline" | "app";

export interface ApplicationSelection {
  readonly kind: ApplicationSelectionKind;
  readonly id: string;
}

export interface ApplicationSelectionChange {
  readonly selection: ApplicationSelection | null;
  readonly source: ApplicationSelectionSource;
}

export type ApplicationSelectionListener = (change: ApplicationSelectionChange) => void;

function sameSelection(
  left: ApplicationSelection | null,
  right: ApplicationSelection | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.kind === right.kind && left.id === right.id;
}

function normalizeSelection(
  selection: ApplicationSelection | null | undefined,
): ApplicationSelection | null {
  if (!selection?.id) return null;
  return Object.freeze({ kind: selection.kind, id: String(selection.id) });
}

/**
 * Renderer-neutral canonical application selection.
 *
 * Renderers may publish into this controller, but only the controller fans the
 * resulting state back out. Programmatic renderer updates must therefore stay
 * silent, which prevents graph/world/timeline feedback loops.
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
