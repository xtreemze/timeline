import type { EntityId, PlaceId, RelationshipId, StoryId } from "../domain/ids.ts";

export interface SpatiotemporalTimeViewport {
  readonly start: number;
  readonly end: number;
  readonly cursor?: number;
}

export interface GeographicBounds {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
}

export interface SpatiotemporalSpaceViewport {
  readonly focusPlaceId?: PlaceId;
  readonly geographicBounds?: GeographicBounds;
}

export interface SpatiotemporalFocus {
  readonly entityId?: EntityId;
  readonly occurrenceId?: RelationshipId;
}

export interface SpatiotemporalViewport {
  readonly time: SpatiotemporalTimeViewport;
  readonly space?: SpatiotemporalSpaceViewport;
  readonly focus?: SpatiotemporalFocus;
  readonly storyId?: StoryId;
  readonly semanticZoom?: number;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function optionalFinite(value: number | undefined, label: string): number | undefined {
  return value === undefined ? undefined : finite(value, label);
}

function geographicBounds(bounds: GeographicBounds | undefined): GeographicBounds | undefined {
  if (!bounds) return undefined;
  const south = finite(bounds.south, "Geographic south");
  const north = finite(bounds.north, "Geographic north");
  const west = finite(bounds.west, "Geographic west");
  const east = finite(bounds.east, "Geographic east");
  if (south < -90 || north > 90 || south > north) {
    throw new Error("Geographic latitude bounds are invalid.");
  }
  if (west < -180 || west > 180 || east < -180 || east > 180) {
    throw new Error("Geographic longitude bounds are invalid.");
  }
  return Object.freeze({ south, west, north, east });
}

export function createSpatiotemporalViewport(
  viewport: SpatiotemporalViewport,
): SpatiotemporalViewport {
  const start = finite(viewport.time.start, "Temporal viewport start");
  const end = finite(viewport.time.end, "Temporal viewport end");
  if (end < start) throw new Error("Temporal viewport end must be greater than or equal to start.");

  const cursor = optionalFinite(viewport.time.cursor, "Temporal viewport cursor");
  const semanticZoom = optionalFinite(viewport.semanticZoom, "Semantic zoom");
  if (semanticZoom !== undefined && semanticZoom < 0) {
    throw new Error("Semantic zoom must be non-negative.");
  }

  const time = Object.freeze({
    start,
    end,
    ...(cursor === undefined ? {} : { cursor }),
  });

  const space = viewport.space
    ? Object.freeze({
        ...(viewport.space.focusPlaceId === undefined
          ? {}
          : { focusPlaceId: viewport.space.focusPlaceId }),
        ...(viewport.space.geographicBounds === undefined
          ? {}
          : { geographicBounds: geographicBounds(viewport.space.geographicBounds) }),
      })
    : undefined;

  const focus = viewport.focus
    ? Object.freeze({
        ...(viewport.focus.entityId === undefined ? {} : { entityId: viewport.focus.entityId }),
        ...(viewport.focus.occurrenceId === undefined
          ? {}
          : { occurrenceId: viewport.focus.occurrenceId }),
      })
    : undefined;

  return Object.freeze({
    time,
    ...(space === undefined ? {} : { space }),
    ...(focus === undefined ? {} : { focus }),
    ...(viewport.storyId === undefined ? {} : { storyId: viewport.storyId }),
    ...(semanticZoom === undefined ? {} : { semanticZoom }),
  });
}

export function spatiotemporalViewportKey(viewport: SpatiotemporalViewport): string {
  const normalized = createSpatiotemporalViewport(viewport);
  const bounds = normalized.space?.geographicBounds;
  return JSON.stringify({
    time: normalized.time,
    space: normalized.space
      ? {
          focusPlaceId: normalized.space.focusPlaceId ?? null,
          geographicBounds: bounds
            ? [bounds.south, bounds.west, bounds.north, bounds.east]
            : null,
        }
      : null,
    focus: normalized.focus
      ? {
          entityId: normalized.focus.entityId ?? null,
          occurrenceId: normalized.focus.occurrenceId ?? null,
        }
      : null,
    storyId: normalized.storyId ?? null,
    semanticZoom: normalized.semanticZoom ?? null,
  });
}
