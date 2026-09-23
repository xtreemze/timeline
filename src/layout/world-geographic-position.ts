import type {
  ProjectedWorldInstance,
  SpatialAnchor,
} from "../projection/world-projection.ts";

export type WorldRenderPosition = readonly [longitude: number, latitude: number, altitude: number];

export interface WorldLocalLayoutPosition {
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const POLAR_COSINE_EPSILON = 1e-9;

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function wrapLongitude(value: number): number {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function shortestLongitudeDelta(from: number, to: number): number {
  return wrapLongitude(to - from);
}

function validateRenderPosition(position: WorldRenderPosition): void {
  const [longitude, latitude, altitude] = position;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("World render longitude must be finite and between -180 and 180.");
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("World render latitude must be finite and between -90 and 90.");
  }
  if (!Number.isFinite(altitude)) {
    throw new Error("World render altitude must be finite.");
  }
}

function primaryAnchor(anchors: readonly SpatialAnchor[]): SpatialAnchor | null {
  if (!anchors.length) return null;

  return [...anchors].sort(
    (left, right) =>
      right.influence - left.influence ||
      (right.certainty ?? -1) - (left.certainty ?? -1) ||
      String(left.placeId).localeCompare(String(right.placeId)),
  )[0] ?? null;
}

export function resolveWorldRenderPosition(
  instance: ProjectedWorldInstance,
): WorldRenderPosition | null {
  const anchor = primaryAnchor(instance.geographicAnchors);
  if (!anchor) return null;

  const eastMeters = instance.localOffset?.eastMeters ?? 0;
  const northMeters = instance.localOffset?.northMeters ?? 0;

  const anchorLatitudeRadians = radians(anchor.latitude);
  const latitude = Math.max(
    -90,
    Math.min(90, anchor.latitude + degrees(northMeters / EARTH_RADIUS_METERS)),
  );

  const cosine = Math.cos(anchorLatitudeRadians);
  const longitudeDelta =
    Math.abs(cosine) <= POLAR_COSINE_EPSILON
      ? 0
      : degrees(eastMeters / (EARTH_RADIUS_METERS * cosine));

  const longitude = wrapLongitude(anchor.longitude + longitudeDelta);
  const altitude = (anchor.sourceAltitude ?? 0) + (instance.visualAltitude ?? 0);

  return Object.freeze([longitude, latitude, altitude]);
}


export function resolveWorldLocalLayoutPosition(
  instance: ProjectedWorldInstance,
  position: WorldRenderPosition,
): WorldLocalLayoutPosition | null {
  const anchor = primaryAnchor(instance.geographicAnchors);
  if (!anchor) return null;
  validateRenderPosition(position);

  const [longitude, latitude, altitude] = position;
  const anchorLatitudeRadians = radians(anchor.latitude);
  const cosine = Math.cos(anchorLatitudeRadians);
  const longitudeDelta = shortestLongitudeDelta(anchor.longitude, longitude);

  const eastMeters =
    Math.abs(cosine) <= POLAR_COSINE_EPSILON
      ? 0
      : radians(longitudeDelta) * EARTH_RADIUS_METERS * cosine;
  const northMeters =
    radians(latitude - anchor.latitude) * EARTH_RADIUS_METERS;
  const visualAltitudeMeters = Math.max(
    0,
    altitude - (anchor.sourceAltitude ?? 0),
  );

  return Object.freeze({
    eastMeters,
    northMeters,
    visualAltitudeMeters,
  });
}
