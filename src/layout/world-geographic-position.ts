import type {
  ProjectedWorldInstance,
  SpatialAnchor,
} from "../projection/world-projection.ts";

export type WorldRenderPosition = readonly [longitude: number, latitude: number, altitude: number];

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
