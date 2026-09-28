export type ComposerTemporalPrecision = "year" | "month" | "day" | "hour" | "minute" | "second";

export interface ComposerTimelineContext {
  readonly centerMs: number;
  readonly spanMs: number;
  readonly precision: ComposerTemporalPrecision;
  readonly value: string;
  readonly label: string;
}

export interface ComposerWorldCamera {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
}

export interface ComposerWorldCameraInput {
  readonly longitude?: unknown;
  readonly latitude?: unknown;
  readonly zoom?: unknown;
}

export interface ComposerWorldContext extends ComposerWorldCamera {
  readonly accuracyMeters: number;
  readonly label: string;
}

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;
const EARTH_CIRCUMFERENCE_METERS = 40_075_016.68557849;
const WEB_MERCATOR_TILE_SIZE = 256;
const AUTHORING_RADIUS_PX = 32;

function finite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pad(value: number, width: number = 2): string {
  return String(Math.trunc(Math.abs(value))).padStart(width, "0");
}

function isoYear(year: number): string {
  if (year >= 0 && year <= 9999) return pad(year, 4);
  const absolute = String(Math.abs(year)).padStart(6, "0");
  return `${year < 0 ? "-" : "+"}${absolute}`;
}

export function temporalPrecisionForViewportSpan(spanMs: number): ComposerTemporalPrecision {
  const span = Math.max(0, Number(spanMs) || 0);
  if (span >= 5 * YEAR_MS) return "year";
  if (span >= 180 * DAY_MS) return "month";
  if (span >= 14 * DAY_MS) return "day";
  if (span >= 12 * 60 * 60 * 1000) return "hour";
  if (span >= 30 * 60 * 1000) return "minute";
  return "second";
}

export function formatTimelineCenter(
  centerMs: number,
  precision: ComposerTemporalPrecision,
): string | null {
  if (!Number.isFinite(centerMs)) return null;
  const date = new Date(centerMs);
  if (!Number.isFinite(date.getTime())) return null;

  const year = isoYear(date.getUTCFullYear());
  if (precision === "year") return year;

  const month = `${year}-${pad(date.getUTCMonth() + 1)}`;
  if (precision === "month") return month;

  const day = `${month}-${pad(date.getUTCDate())}`;
  if (precision === "day") return day;

  const hour = `${day}T${pad(date.getUTCHours())}Z`;
  if (precision === "hour") return hour;

  const minute = `${day}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
  if (precision === "minute") return minute;

  return `${day}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}Z`;
}

export function timelineContextFromViewport(
  startValue: unknown,
  endValue: unknown,
): ComposerTimelineContext | null {
  const start = finite(startValue);
  const end = finite(endValue);
  if (start === null || end === null || end < start) return null;

  const spanMs = end - start;
  const centerMs = start + spanMs / 2;
  const precision = temporalPrecisionForViewportSpan(spanMs);
  const value = formatTimelineCenter(centerMs, precision);
  if (!value) return null;

  return Object.freeze({
    centerMs,
    spanMs,
    precision,
    value,
    label: value,
  });
}

function roundedAccuracyMeters(value: number): number {
  const safe = Math.max(0.1, value);
  const exponent = Math.floor(Math.log10(safe));
  const magnitude = 10 ** exponent;
  const normalized = safe / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function spatialAccuracyForWorldZoom(
  zoomValue: unknown,
  latitudeValue: unknown,
): number | null {
  const zoom = finite(zoomValue);
  const latitude = finite(latitudeValue);
  if (zoom === null || latitude === null || zoom < 0) return null;

  const clampedLatitude = Math.max(-85, Math.min(85, latitude));
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_METERS * Math.cos((clampedLatitude * Math.PI) / 180)) /
    (WEB_MERCATOR_TILE_SIZE * 2 ** Math.min(zoom, 30));
  return roundedAccuracyMeters(metersPerPixel * AUTHORING_RADIUS_PX);
}

function coordinateDecimals(accuracyMeters: number): number {
  const degrees = Math.max(accuracyMeters / 111_320, 1e-6);
  return Math.max(0, Math.min(5, Math.ceil(-Math.log10(degrees))));
}

function accuracyLabel(accuracyMeters: number): string {
  if (accuracyMeters >= 1000) {
    const kilometers = accuracyMeters / 1000;
    return `±${kilometers >= 10 ? Math.round(kilometers) : Number(kilometers.toFixed(1))} km`;
  }
  return `±${accuracyMeters >= 10 ? Math.round(accuracyMeters) : Number(accuracyMeters.toFixed(1))} m`;
}

export function worldContextFromCamera(
  camera: ComposerWorldCameraInput | null | undefined,
): ComposerWorldContext | null {
  const longitude = finite(camera?.longitude);
  const latitude = finite(camera?.latitude);
  const zoom = finite(camera?.zoom);
  if (
    longitude === null ||
    latitude === null ||
    zoom === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    zoom < 0
  ) {
    return null;
  }

  const accuracyMeters = spatialAccuracyForWorldZoom(zoom, latitude);
  if (accuracyMeters === null) return null;
  const decimals = coordinateDecimals(accuracyMeters);
  return Object.freeze({
    longitude,
    latitude,
    zoom,
    accuracyMeters,
    label: `${latitude.toFixed(decimals)}, ${longitude.toFixed(decimals)} ${accuracyLabel(
      accuracyMeters,
    )}`,
  });
}
