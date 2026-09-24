import type { WorldSelection } from "../../src/layout/world-surface.ts";

/**
 * Navigable non-WebGL representation of the WorldSurface (issue #445
 * accessibility acceptance). It is derived only from the renderer-neutral
 * accessibility snapshot, never from deck.gl/GPU state, so assistive
 * technology sees exactly the canonical objects the globe shows: places,
 * directed relationships and canonical entities (one entry per entity, not
 * per world instance). Activating an entry selects and focuses that
 * canonical object on the surface; surface selection is mirrored back.
 */

interface OutlineSnapshotEntity {
  readonly entityId: string;
  readonly worldInstanceId: string;
  readonly selected: boolean;
  readonly label?: string;
}

interface OutlineSnapshotPlace {
  readonly placeId: string;
  readonly selected: boolean;
  readonly label?: string;
}

interface OutlineSnapshotRelationship {
  readonly relationshipId: string;
  readonly selected: boolean;
  readonly label?: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
}

export interface WorldOutlineSnapshot {
  readonly entities: readonly OutlineSnapshotEntity[];
  readonly places: readonly OutlineSnapshotPlace[];
  readonly relationships: readonly OutlineSnapshotRelationship[];
  readonly selection: WorldSelection | null;
}

export interface WorldOutlineItem {
  readonly key: string;
  readonly text: string;
  readonly selection: WorldSelection;
  readonly selected: boolean;
}

export interface WorldOutlineGroup {
  readonly kind: WorldSelection["kind"];
  readonly heading: string;
  readonly total: number;
  readonly omitted: number;
  readonly items: readonly WorldOutlineItem[];
}

export interface WorldOutline {
  readonly groups: readonly WorldOutlineGroup[];
}

/**
 * Per-group cap on listed entries. Dense worlds stay navigable without
 * mounting tens of thousands of buttons; the selected object is always
 * listed and the remainder is announced.
 */
export const WORLD_OUTLINE_GROUP_LIMIT = 500;

function isSelected(selection: WorldSelection | null, candidate: WorldSelection): boolean {
  return selection?.kind === candidate.kind && selection.id === candidate.id;
}

function group(
  kind: WorldSelection["kind"],
  heading: string,
  items: readonly WorldOutlineItem[],
): WorldOutlineGroup {
  let listed = items;
  if (items.length > WORLD_OUTLINE_GROUP_LIMIT) {
    listed = items.slice(0, WORLD_OUTLINE_GROUP_LIMIT);
    const selected = items.find((item) => item.selected);
    if (selected && !listed.includes(selected)) {
      listed = [...listed.slice(0, WORLD_OUTLINE_GROUP_LIMIT - 1), selected];
    }
  }
  return Object.freeze({
    kind,
    heading,
    total: items.length,
    omitted: items.length - listed.length,
    items: Object.freeze(listed),
  });
}

function item(
  selection: WorldSelection,
  text: string,
  current: WorldSelection | null,
): WorldOutlineItem {
  return Object.freeze({
    key: `${selection.kind}:${selection.id}`,
    text,
    selection,
    selected: isSelected(current, selection),
  });
}

export function buildWorldAccessibleOutline(snapshot: WorldOutlineSnapshot): WorldOutline {
  const entityLabels = new Map<string, string>();
  const entityOccurrences = new Map<string, number>();
  for (const entity of snapshot.entities) {
    if (entity.label && !entityLabels.has(entity.entityId)) {
      entityLabels.set(entity.entityId, entity.label);
    }
    entityOccurrences.set(entity.entityId, (entityOccurrences.get(entity.entityId) ?? 0) + 1);
  }
  const entityName = (id: string) => entityLabels.get(id) ?? id;

  const places = snapshot.places.map((place) =>
    item(
      Object.freeze({ kind: "place" as const, id: place.placeId }) as WorldSelection,
      place.label ?? place.placeId,
      snapshot.selection,
    ),
  );

  const relationships = snapshot.relationships.map((relationship) =>
    item(
      Object.freeze({
        kind: "relationship" as const,
        id: relationship.relationshipId,
      }) as WorldSelection,
      `${relationship.label ?? relationship.relationshipId}: ${entityName(
        relationship.sourceEntityId,
      )} → ${entityName(relationship.targetEntityId)}`,
      snapshot.selection,
    ),
  );

  const entities = [...entityOccurrences].map(([id, occurrences]) =>
    item(
      Object.freeze({ kind: "entity" as const, id }) as WorldSelection,
      occurrences > 1 ? `${entityName(id)} (${occurrences} occurrences)` : entityName(id),
      snapshot.selection,
    ),
  );

  return Object.freeze({
    groups: Object.freeze([
      group("place", "Places", places),
      group("relationship", "Relationships", relationships),
      group("entity", "Entities", entities),
    ]),
  });
}

export interface WorldOutlineTarget {
  setSelection(selection: WorldSelection | null): void;
  focusSelection(selection: WorldSelection): void;
}

/**
 * Keyed DOM adapter: entries are reused by canonical key so keyboard focus
 * survives projection updates, and only changed text/state is written.
 */
export class WorldAccessibleMirror {
  readonly #root: HTMLElement;
  readonly #doc: Document;
  readonly #target: WorldOutlineTarget;
  readonly #sections = new Map<
    string,
    { list: HTMLElement; heading: HTMLElement; more: HTMLElement }
  >();
  readonly #entries = new Map<
    string,
    { li: HTMLElement; button: HTMLButtonElement; item: WorldOutlineItem }
  >();

  /**
   * Returns null when the container is not a real DOM host (headless tests,
   * non-DOM containers), mirroring how the live region degrades.
   */
  static create(container: HTMLElement, target: WorldOutlineTarget): WorldAccessibleMirror | null {
    const doc = container.ownerDocument;
    if (typeof doc?.createElement !== "function") return null;
    const root = doc.createElement("nav");
    if (typeof root.append !== "function" || typeof container.appendChild !== "function") {
      return null;
    }
    return new WorldAccessibleMirror(container, doc, root, target);
  }

  private constructor(
    container: HTMLElement,
    doc: Document,
    root: HTMLElement,
    target: WorldOutlineTarget,
  ) {
    this.#doc = doc;
    this.#target = target;
    this.#root = root;
    this.#root.setAttribute("aria-label", "World objects");
    this.#root.className = "sr-only world-accessible-outline";
    // Screen-reader-first, but visible while a keyboard user is inside it.
    this.#root.addEventListener("focusin", () => this.#reveal(true));
    this.#root.addEventListener("focusout", (event) => {
      if (!this.contains(event.relatedTarget)) this.#reveal(false);
    });
    container.appendChild(this.#root);
  }

  #reveal(visible: boolean): void {
    if (visible === this.#root.classList.contains("is-revealed")) return;
    this.#root.classList.toggle("sr-only", !visible);
    this.#root.classList.toggle("is-revealed", visible);
    Object.assign(
      this.#root.style,
      visible
        ? {
            position: "absolute",
            insetBlockStart: "0.5rem",
            insetInlineStart: "0.5rem",
            zIndex: "20",
            inlineSize: "min(22rem, calc(100% - 1rem))",
            maxBlockSize: "min(60vh, calc(100% - 1rem))",
            overflow: "auto",
            padding: "0.75rem",
            border: "1px solid currentcolor",
            borderRadius: "0.5rem",
            background: "Canvas",
            color: "CanvasText",
          }
        : {
            position: "",
            insetBlockStart: "",
            insetInlineStart: "",
            zIndex: "",
            inlineSize: "",
            maxBlockSize: "",
            overflow: "",
            padding: "",
            border: "",
            borderRadius: "",
            background: "",
            color: "",
          },
    );
  }

  sync(outline: WorldOutline): void {
    const seen = new Set<string>();
    for (const group of outline.groups) {
      const section = this.#section(group.kind);
      const heading = `${group.heading} (${group.total})`;
      if (section.heading.textContent !== heading) section.heading.textContent = heading;

      let previous: HTMLElement | null = null;
      for (const entry of group.items) {
        seen.add(entry.key);
        const existing = this.#entries.get(entry.key);
        const node = existing ?? this.#createEntry(entry);
        node.item = entry;
        if (node.button.textContent !== entry.text) node.button.textContent = entry.text;
        const pressed = String(entry.selected);
        if (node.button.getAttribute("aria-pressed") !== pressed) {
          node.button.setAttribute("aria-pressed", pressed);
        }
        const expectedNext: Element | null = previous
          ? previous.nextElementSibling
          : section.list.firstElementChild;
        if (expectedNext !== node.li) {
          if (previous) previous.after(node.li);
          else section.list.prepend(node.li);
        }
        previous = node.li;
      }

      const more = group.omitted > 0 ? `${group.omitted} more not listed` : "";
      if (section.more.textContent !== more) section.more.textContent = more;
      section.more.hidden = group.omitted === 0;
    }

    for (const [key, entry] of this.#entries) {
      if (seen.has(key)) continue;
      entry.li.remove();
      this.#entries.delete(key);
    }
  }

  /** True when a DOM event target lies inside this outline. */
  contains(target: unknown): boolean {
    return typeof Node !== "undefined" && target instanceof Node && this.#root.contains(target);
  }

  destroy(): void {
    this.#root.remove();
    this.#entries.clear();
    this.#sections.clear();
  }

  #section(kind: string) {
    const existing = this.#sections.get(kind);
    if (existing) return existing;
    const heading = this.#doc.createElement("h2");
    const list = this.#doc.createElement("ul");
    const more = this.#doc.createElement("p");
    more.hidden = true;
    this.#root.append(heading, list, more);
    const section = { list, heading, more };
    this.#sections.set(kind, section);
    return section;
  }

  #createEntry(entry: WorldOutlineItem) {
    const li = this.#doc.createElement("li");
    const button = this.#doc.createElement("button");
    button.type = "button";
    li.append(button);
    const node = { li, button, item: entry };
    button.addEventListener("click", () => {
      this.#target.setSelection(node.item.selection);
      this.#target.focusSelection(node.item.selection);
    });
    this.#entries.set(entry.key, node);
    return node;
  }
}
