/**
 * Timeline spatial/location module
 * Utilities for normalizing and validating geographic coordinates, places, and geometries
 * Supports GeoJSON Point, Polygon, and MultiPolygon geometries
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max: number = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function coordinate(value: unknown, min: number, max: number): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

interface Location {
  name: string;
  geographicIdentifier: string;
  address: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  crs: string;
  source: "manual" | "device" | "imported";
  accuracyMeters?: number | null;
}

export function normalize(raw: unknown): Location | null {
  if (!isRecord(raw)) return null;

  const geometry = isRecord(raw.geometry) ? raw.geometry : null;
  const coords =
    geometry?.type === "Point" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : null;

  const longitude = coordinate(raw.longitude ?? coords?.[0], -180, 180);
  const latitude = coordinate(raw.latitude ?? coords?.[1], -90, 90);
  const name = text(raw.name, 160);
  const geographicIdentifier = text(raw.geographicIdentifier, 300);
  const address = text(raw.address, 500);
  const source: Location["source"] =
    raw.source === "device" || raw.source === "imported" || raw.source === "manual"
      ? raw.source
      : "manual";
  const hasAccuracy =
    raw.accuracyMeters !== "" &&
    raw.accuracyMeters !== null &&
    raw.accuracyMeters !== undefined;
  const accuracyMeters =
    hasAccuracy &&
    Number.isFinite(Number(raw.accuracyMeters)) &&
    Number(raw.accuracyMeters) >= 0
      ? Number(raw.accuracyMeters)
      : null;

  if (!name && !geographicIdentifier && !address && latitude === null && longitude === null)
    return null;
  if ((latitude === null) !== (longitude === null)) {
    throw new Error("Location coordinates require both latitude and longitude.");
  }

  const normalizedGeometry =
    latitude === null || longitude === null
      ? null
      : {
          type: "Point" as const,
          coordinates: [longitude, latitude] as [number, number],
        };

  const result: Location = {
    name,
    geographicIdentifier,
    address,
    geometry: normalizedGeometry,
    crs: "OGC:CRS84",
    source,
  };
  if (accuracyMeters !== null) result.accuracyMeters = accuracyMeters;
  return result;
}

export function fromForm(options: {
  name?: unknown;
  geographicIdentifier?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  source?: unknown;
  accuracyMeters?: unknown;
}): Location | null {
  return normalize({
    name: options.name,
    geographicIdentifier: options.geographicIdentifier,
    address: options.address,
    latitude: options.latitude,
    longitude: options.longitude,
    source: options.source,
    accuracyMeters: options.accuracyMeters,
  });
}

export function formParts(location: unknown): {
  name: string;
  geographicIdentifier: string;
  address: string;
  longitude: string | number;
  latitude: string | number;
  source: string;
  accuracyMeters: string | number;
} {
  const normalized = normalize(location);
  return {
    name: normalized?.name || "",
    geographicIdentifier: normalized?.geographicIdentifier || "",
    address: normalized?.address || "",
    longitude: normalized?.geometry?.coordinates?.[0] ?? "",
    latitude: normalized?.geometry?.coordinates?.[1] ?? "",
    source: normalized?.source || "manual",
    accuracyMeters: normalized?.accuracyMeters ?? "",
  };
}

const PLACE_GEOMETRY_TYPES = new Set<string>(["Point", "Polygon", "MultiPolygon"]);
const PLACE_MARKER_SHAPES = new Set<string>(["pin", "circle", "square", "diamond"]);
const PLACE_ICON_NAMES = new Set<string>([
  "milestone",
  "decision",
  "evidence",
  "person",
  "place",
  "media",
  "relation",
  "note",
  "home",
  "danger",
  "magic",
  "search",
  "crown",
  "object",
]);

function clone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

type PlaceGeometry =
  | {
      type: "Point";
      coordinates: [number, number];
    }
  | {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown[];
    };

interface Place {
  id: string;
  name: string;
  geographicIdentifier: string;
  address: string;
  geometry: PlaceGeometry | null;
  crs: string;
  radiusMeters: number | null;
  icon: string;
  markerShape: string;
  attributes: Record<string, unknown>;
}

function normalizePlaceGeometry(raw: unknown): PlaceGeometry | null {
  if (!isRecord(raw) || typeof raw.type !== "string" || !PLACE_GEOMETRY_TYPES.has(raw.type)) {
    return null;
  }

  if (raw.type === "Point") {
    const coordinates = Array.isArray(raw.coordinates) ? raw.coordinates : [];
    const longitude = coordinate(coordinates[0], -180, 180);
    const latitude = coordinate(coordinates[1], -90, 90);
    if (longitude === null || latitude === null) {
      throw new Error("Place point geometry requires valid longitude and latitude.");
    }
    return { type: "Point", coordinates: [longitude, latitude] };
  }

  if (
    (raw.type !== "Polygon" && raw.type !== "MultiPolygon") ||
    !Array.isArray(raw.coordinates) ||
    raw.coordinates.length === 0
  ) {
    throw new Error("Place area geometry requires GeoJSON coordinates.");
  }

  const cloned = clone(raw);
  if (!isRecord(cloned) || !Array.isArray(cloned.coordinates)) {
    throw new Error("Place area geometry requires cloneable GeoJSON coordinates.");
  }
  return { ...cloned, type: raw.type, coordinates: cloned.coordinates };
}

export function normalizePlace(raw: unknown, index: number = 0): Place | null {
  if (!isRecord(raw)) return null;

  const attributes = isRecord(raw.attributes) ? raw.attributes : {};
  const marker = isRecord(raw.marker) ? raw.marker : {};
  const id = text(raw.id, 120) || `place-${index + 1}`;
  const name = text(raw.name, 180);
  if (!name) return null;

  const sourceGeometry = raw.geometry || attributes.geometry || null;
  const geometry = normalizePlaceGeometry(sourceGeometry);
  const rawRadius =
    raw.radiusMeters ?? raw.radius ?? attributes.radiusMeters ?? attributes.accuracyMeters;
  const radiusMeters =
    rawRadius !== "" &&
    rawRadius !== null &&
    rawRadius !== undefined &&
    Number.isFinite(Number(rawRadius)) &&
    Number(rawRadius) >= 0
      ? Number(rawRadius)
      : null;
  if (radiusMeters !== null && geometry?.type !== "Point") {
    throw new Error("Place radius can only be used with Point geometry.");
  }

  const iconCandidate = text(raw.icon || marker.icon || attributes.icon, 48);
  const icon = PLACE_ICON_NAMES.has(iconCandidate) ? iconCandidate : "place";
  const markerShapeCandidate = text(
    raw.markerShape || marker.shape || attributes.markerShape,
    24,
  );
  const markerShape = PLACE_MARKER_SHAPES.has(markerShapeCandidate)
    ? markerShapeCandidate
    : "pin";

  const clonedAttributes = clone(attributes);
  const normalizedAttributes = isRecord(clonedAttributes) ? clonedAttributes : {};
  const result: Place = {
    id,
    name,
    geographicIdentifier: text(raw.geographicIdentifier || attributes.geographicIdentifier, 300),
    address: text(raw.address || attributes.address, 500),
    geometry,
    crs: text(raw.crs || attributes.crs, 40) || "OGC:CRS84",
    radiusMeters,
    icon,
    markerShape,
    attributes: normalizedAttributes,
  };
  delete result.attributes.geometry;
  delete result.attributes.geographicIdentifier;
  delete result.attributes.address;
  delete result.attributes.crs;
  delete result.attributes.radiusMeters;
  delete result.attributes.accuracyMeters;
  delete result.attributes.icon;
  delete result.attributes.markerShape;
  return result;
}

export function placeIdentity(place: unknown): string {
  if (!isRecord(place)) return "";
  return `${String(place.name || "")
    .trim()
    .toLocaleLowerCase()}|${JSON.stringify(place.geometry || null)}|${place.radiusMeters ?? ""}`;
}

export function normalizePlaces(value: unknown): Place[] {
  if (!Array.isArray(value)) return [];
  const places: Place[] = [];
  const seenIds = new Set<string>();
  const seenIdentities = new Set<string>();
  value.forEach((raw, index) => {
    const place = normalizePlace(raw, index);
    if (!place?.geometry || seenIds.has(place.id)) return;
    const identity = placeIdentity(place);
    if (identity && seenIdentities.has(identity)) return;
    seenIds.add(place.id);
    if (identity) seenIdentities.add(identity);
    places.push(place);
  });
  return places;
}

export function placeFromForm(options: {
  id?: unknown;
  name?: unknown;
  geographicIdentifier?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radiusMeters?: unknown;
  icon?: unknown;
  markerShape?: unknown;
  areaGeometry?: unknown;
}): Place | null {
  let geometry: PlaceGeometry | null = null;
  if (options.areaGeometry) {
    const parsed =
      typeof options.areaGeometry === "string"
        ? JSON.parse(options.areaGeometry)
        : options.areaGeometry;
    geometry = normalizePlaceGeometry(parsed);
  } else {
    const lng = coordinate(options.longitude, -180, 180);
    const lat = coordinate(options.latitude, -90, 90);
    if ((lng === null) !== (lat === null))
      throw new Error("Place coordinates require both latitude and longitude.");
    if (lng !== null) geometry = { type: "Point", coordinates: [lng, lat] };
  }
  return normalizePlace({
    id: options.id,
    name: options.name,
    geographicIdentifier: options.geographicIdentifier,
    address: options.address,
    geometry,
    radiusMeters: options.radiusMeters,
    icon: options.icon,
    markerShape: options.markerShape,
  });
}

export function placeFormParts(place: unknown): {
  id: string;
  name: string;
  geographicIdentifier: string;
  address: string;
  longitude: string | number;
  latitude: string | number;
  radiusMeters: string | number;
  icon: string;
  markerShape: string;
  areaGeometry: string;
} {
  const normalized = normalizePlace(place);
  return {
    id: normalized?.id || "",
    name: normalized?.name || "",
    geographicIdentifier: normalized?.geographicIdentifier || "",
    address: normalized?.address || "",
    longitude: normalized?.geometry?.type === "Point" ? normalized.geometry.coordinates[0] : "",
    latitude: normalized?.geometry?.type === "Point" ? normalized.geometry.coordinates[1] : "",
    radiusMeters: normalized?.radiusMeters ?? "",
    icon: normalized?.icon || "place",
    markerShape: normalized?.markerShape || "pin",
    areaGeometry:
      normalized?.geometry &&
      "type" in normalized.geometry &&
      normalized.geometry.type !== "Point"
        ? JSON.stringify(normalized.geometry, null, 2)
        : "",
  };
}

// Export public API as frozen object for backward compatibility
const TimelineSpatialObj = {
  PLACE_ICON_NAMES: Object.freeze([...PLACE_ICON_NAMES]),
  PLACE_MARKER_SHAPES: Object.freeze([...PLACE_MARKER_SHAPES]),
  formParts,
  fromForm,
  normalize,
  normalizePlace,
  normalizePlaces,
  placeIdentity,
  placeFormParts,
  placeFromForm,
} as const;

export const TimelineSpatial = Object.freeze(TimelineSpatialObj);
