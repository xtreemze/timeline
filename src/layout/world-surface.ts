import type { EntityId, PlaceId, RelationshipId } from "../domain/ids.ts";
import type { WorldInstanceId, WorldProjection } from "../projection/world-projection.ts";

export interface WorldTemporalWindow {
  readonly start: number;
  readonly end: number;
}

export interface WorldCameraState {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
  readonly bearing: number;
  readonly pitch: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export type WorldSelection =
  | { readonly kind: "entity"; readonly id: EntityId }
  | { readonly kind: "relationship"; readonly id: RelationshipId }
  | { readonly kind: "place"; readonly id: PlaceId };

export type WorldHit =
  | {
      readonly kind: "entity";
      readonly entityId: EntityId;
      readonly worldInstanceId: WorldInstanceId;
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

export interface WorldSurfaceCapabilities {
  readonly globe: boolean;
  readonly depthPicking: boolean;
  readonly directNodeDrag: boolean;
  readonly gpuFiltering: boolean;
  readonly localPrecisionMode: boolean;
}

export interface WorldSurface {
  setProjection(projection: WorldProjection): void;
  setTemporalWindow(window: WorldTemporalWindow): void;
  setSelection(selection: WorldSelection | null): void;

  getCamera(): WorldCameraState;
  setCamera(camera: WorldCameraState): void;

  focusEntity(id: EntityId): void;
  focusOccurrence(id: RelationshipId): void;
  focusPlace(id: PlaceId): void;

  pick(point: ScreenPoint): WorldHit | null;
  getCapabilities(): WorldSurfaceCapabilities;

  refresh(): void;
  destroy(): void;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function normalizedBearing(value: number): number {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function createWorldTemporalWindow(window: WorldTemporalWindow): WorldTemporalWindow {
  const start = finite(window.start, "World temporal window start");
  const end = finite(window.end, "World temporal window end");
  if (end < start) {
    throw new Error("World temporal window end must be greater than or equal to start.");
  }
  return Object.freeze({ start, end });
}

export function createWorldCameraState(camera: WorldCameraState): WorldCameraState {
  const longitude = finite(camera.longitude, "World camera longitude");
  const latitude = finite(camera.latitude, "World camera latitude");
  const zoom = finite(camera.zoom, "World camera zoom");
  const pitch = finite(camera.pitch, "World camera pitch");

  if (longitude < -180 || longitude > 180) {
    throw new Error("World camera longitude must be between -180 and 180.");
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error("World camera latitude must be between -90 and 90.");
  }
  if (zoom < 0) {
    throw new Error("World camera zoom must be non-negative.");
  }
  if (pitch < 0 || pitch >= 90) {
    throw new Error("World camera pitch must be between 0 and 90 degrees.");
  }

  return Object.freeze({
    longitude,
    latitude,
    zoom,
    bearing: normalizedBearing(finite(camera.bearing, "World camera bearing")),
    pitch,
  });
}

export function worldSelectionFromHit(hit: WorldHit | null): WorldSelection | null {
  if (!hit || hit.kind === "background") return null;
  if (hit.kind === "entity") {
    return Object.freeze({ kind: "entity", id: hit.entityId });
  }
  if (hit.kind === "relationship") {
    return Object.freeze({ kind: "relationship", id: hit.relationshipId });
  }
  return Object.freeze({ kind: "place", id: hit.placeId });
}
