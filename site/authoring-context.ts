export type AuthoringMode = "view" | "edit";
export type AuthoringSelectionKind = "node" | "edge" | "place";
export type AuthoringCreateKind = "place" | "node" | "relationship";

export interface AuthoringSelection {
  readonly kind: AuthoringSelectionKind;
  readonly id: string;
}

export interface AuthoringViewport {
  readonly start: number;
  readonly end: number;
}

export interface AuthoringSpatialPosition {
  readonly longitude: number;
  readonly latitude: number;
  readonly altitudeMeters?: number;
}

export interface AuthoringSpatialContext {
  readonly position: AuthoringSpatialPosition | null;
  readonly placeId: string | null;
}

export interface AuthoringDraftContext {
  readonly kind: AuthoringCreateKind;
  readonly time: number | null;
  readonly date: string | null;
  readonly position: AuthoringSpatialPosition | null;
  readonly placeId: string | null;
  readonly selection: AuthoringSelection | null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function canonicalViewport(
  viewport: AuthoringViewport | null | undefined,
): AuthoringViewport | null {
  if (
    !viewport ||
    !finite(viewport.start) ||
    !finite(viewport.end) ||
    viewport.end < viewport.start
  ) {
    return null;
  }
  return Object.freeze({ start: viewport.start, end: viewport.end });
}

function canonicalPosition(
  position: AuthoringSpatialPosition | null | undefined,
): AuthoringSpatialPosition | null {
  if (!position || !finite(position.longitude) || !finite(position.latitude)) return null;
  if (position.longitude < -180 || position.longitude > 180) return null;
  if (position.latitude < -90 || position.latitude > 90) return null;
  const altitudeMeters = finite(position.altitudeMeters) ? position.altitudeMeters : 0;
  return Object.freeze({
    longitude: position.longitude,
    latitude: position.latitude,
    altitudeMeters,
  });
}

function utcDate(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Small application-level authoring state boundary.
 *
 * It intentionally owns context only: current committed chronology, canonical
 * selection, and the geographic point/place captured by a creation gesture.
 * Canonical project mutation stays in the existing graph/place/item forms.
 */
export class AuthoringContextController {
  #mode: AuthoringMode = "view";
  #viewport: AuthoringViewport | null = null;
  #time: number | null = null;
  #selection: AuthoringSelection | null = null;
  #position: AuthoringSpatialPosition | null = null;
  #placeId: string | null = null;

  setMode(mode: AuthoringMode): void {
    this.#mode = mode;
    if (mode === "view") this.clearSpatialContext();
  }

  get mode(): AuthoringMode {
    return this.#mode;
  }

  setTimelineViewport(viewport: AuthoringViewport | null | undefined, committed: boolean): void {
    if (!committed) return;
    const next = canonicalViewport(viewport);
    this.#viewport = next;
    this.#time = next ? next.start + (next.end - next.start) / 2 : null;
  }

  get time(): number | null {
    return this.#time;
  }

  get date(): string | null {
    return utcDate(this.#time);
  }

  get viewport(): AuthoringViewport | null {
    return this.#viewport;
  }

  setSelection(selection: AuthoringSelection | null | undefined): void {
    if (!selection?.id) {
      this.#selection = null;
      return;
    }
    this.#selection = Object.freeze({ kind: selection.kind, id: String(selection.id) });
    if (selection.kind === "place") this.#placeId = String(selection.id);
  }

  get selection(): AuthoringSelection | null {
    return this.#selection;
  }

  setSpatialContext(context: Partial<AuthoringSpatialContext> | null | undefined): void {
    this.#position = canonicalPosition(context?.position ?? null);
    this.#placeId = context?.placeId ? String(context.placeId) : null;
  }

  clearSpatialContext(): void {
    this.#position = null;
    this.#placeId = this.#selection?.kind === "place" ? this.#selection.id : null;
  }

  get spatialContext(): AuthoringSpatialContext {
    return Object.freeze({ position: this.#position, placeId: this.#placeId });
  }

  draft(kind: AuthoringCreateKind): AuthoringDraftContext {
    return Object.freeze({
      kind,
      time: this.#time,
      date: utcDate(this.#time),
      position: this.#position,
      placeId: this.#placeId,
      selection: this.#selection,
    });
  }
}

export function createAuthoringContext(): AuthoringContextController {
  return new AuthoringContextController();
}
