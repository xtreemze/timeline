import type { WorldRenderPosition } from "./world-geographic-position.ts";
import { createWorldCameraState, type WorldCameraState } from "./world-surface.ts";

/**
 * Renderer-neutral initial camera fit for the WorldSurface: centres on the
 * projected content and picks a zoom at which its angular extent fills a
 * comfortable share of the viewport. Pure; camera state stays derived.
 */

/** deck.gl-compatible world tile size used by the zoom scale. */
const TILE_SIZE_PX = 512;
/** Share of the smaller viewport dimension the content should occupy. */
const FILL_RATIO = 0.7;
const MIN_FIT_ZOOM = 0.6;
const MAX_FIT_ZOOM = 6;
/** Extent assumed for a single point so it is not fitted to street level. */
const MIN_SPAN_DEGREES = 2;

export interface WorldViewportSize {
  readonly width: number;
  readonly height: number;
}

function smallestLongitudeArc(longitudes: readonly number[]): {
  readonly center: number;
  readonly span: number;
} {
  const sorted = [...longitudes].sort((left, right) => left - right);
  let largestGap = -1;
  let gapEnd = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index] as number;
    const next =
      index + 1 < sorted.length ? (sorted[index + 1] as number) : (sorted[0] as number) + 360;
    const gap = next - current;
    if (gap > largestGap) {
      largestGap = gap;
      gapEnd = index + 1 < sorted.length ? index + 1 : 0;
    }
  }
  const span = sorted.length > 1 ? 360 - largestGap : 0;
  const start = sorted[gapEnd] as number;
  const center = ((((start + span / 2 + 180) % 360) + 360) % 360) - 180;
  return { center, span };
}

export function fitWorldCamera(
  positions: readonly WorldRenderPosition[],
  viewport: WorldViewportSize,
  current: WorldCameraState,
): WorldCameraState | null {
  const finite = positions.filter(
    (position) => Number.isFinite(position[0]) && Number.isFinite(position[1]),
  );
  if (finite.length === 0) return null;

  const { center: longitude, span: longitudeSpan } = smallestLongitudeArc(
    finite.map((position) => position[0]),
  );
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const position of finite) {
    south = Math.min(south, position[1]);
    north = Math.max(north, position[1]);
  }
  const latitude = (south + north) / 2;
  const latitudeScale = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  // deck.gl's GlobeView matches Web Mercator scale at the camera latitude:
  // a degree of longitude spans the zoom's base pixels, a degree of
  // latitude that divided by cos(latitude). Fit each axis to its own side.
  const pixelsPerDegreeAtZoom0 = TILE_SIZE_PX / 360;
  const zoomFor = (degrees: number, pixels: number) =>
    Math.log2((Math.max(1, pixels) * FILL_RATIO) / (pixelsPerDegreeAtZoom0 * degrees));
  const zoom = Math.min(
    zoomFor(Math.max(MIN_SPAN_DEGREES, longitudeSpan), viewport.width),
    zoomFor(Math.max(MIN_SPAN_DEGREES, north - south) / latitudeScale, viewport.height),
  );

  return createWorldCameraState({
    longitude,
    latitude,
    zoom: Math.min(MAX_FIT_ZOOM, Math.max(MIN_FIT_ZOOM, zoom)),
    bearing: current.bearing,
    pitch: current.pitch,
  });
}
