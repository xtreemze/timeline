/**
 * Timeline spatial/location module
 * Utilities for normalizing and validating geographic coordinates, places, and geometries
 * Supports GeoJSON Point, Polygon, and MultiPolygon geometries
 */

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
  if (!raw || typeof raw !== "object") return null;

  const rawObj = raw as any;
  const geometry =
    rawObj.geometry && typeof rawObj.geometry === "object" ? rawObj.geometry : null;
  const coords =
    geometry?.type === "Point" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : null;

  const longitude = coordinate(rawObj.longitude ?? coords?.[0], -180, 180);
  const latitude = coordinate(rawObj.latitude ?? coords?.[1], -90, 90);
  const name = text(rawObj.name, 160);
  const geographicIdentifier = text(rawObj.geographicIdentifier, 300);
  const address = text(rawObj.address, 500);
  const source = ["manual", "device", "imported"].includes(rawObj.source)
    ? rawObj.source
    : "manual";
  const hasAccuracy =
    rawObj.accuracyMeters !== "" &&
    rawObj.accuracyMeters !== null &&
    rawObj.accuracyMeters !== undefined;
  const accuracyMeters =
    hasAccuracy &&
    Number.isFinite(Number(rawObj.accuracyMeters)) &&
    Number(rawObj.accuracyMeters) >= 0
      ? Number(rawObj.accuracyMeters)
      : null;

  if (!name && !geographicIdentifier && !address && latitude === null && longitude === null)
    return null;
  if ((latitude === null) !== (longitude === null)) {
    throw new Error("Location coordinates require both latitude and longitude.");
  }

  const result: Location = {
    name,
    geographicIdentifier,
    address,
    geometry:
      latitude === null
        ? null
        : {
            type: "Point",
            coordinates: [longitude as number, latitude as number],
          },
    crs: "OGC:CRS84",
    source: source as "manual" | "device" | "imported",
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

const PLACE_GEOMETRY_TYPES = new Set(["Point", "Polygon", "MultiPolygon"] as const);
const PLACE_MARKER_SHAPES = new Set(["pin", "circle", "square", "diamond"] as const);
const PLACE_ICON_NAMES = new Set([
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
] as const);

function clone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

interface PlaceGeometry {
  type: "Point" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
}

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
  if (!raw || typeof raw !== "object" || !PLACE_GEOMETRY_TYPES.has((raw as any).type))
    return null;
  if ((raw as any).type === "Point") {
    const coordinates = Array.isArray((raw as any).coordinates) ? (raw as any).coordinates : [];
    const longitude = coordinate(coordinates[0], -180, 180);
    const latitude = coordinate(coordinates[1], -90, 90);
    if (longitude === null || latitude === null) {
      throw new Error("Place point geometry requires valid longitude and latitude.");
    }
    return { type: "Point", coordinates: [longitude, latitude] };
  }
  if (!Array.isArray((raw as any).coordinates) || !(raw as any).coordinates.length) {
    throw new Error("Place area geometry requires GeoJSON coordinates.");
  }
  return clone(raw) as PlaceGeometry;
}

export function normalizePlace(raw: unknown, index: number = 0): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const rawObj = raw as any;
  const id = text(rawObj.id, 120) || `place-${index + 1}`;
  const name = text(rawObj.name, 180);
  if (!name) return null;

  const sourceGeometry = rawObj.geometry || rawObj.attributes?.geometry || null;
  const geometry = normalizePlaceGeometry(sourceGeometry);
  const rawRadius =
    rawObj.radiusMeters ?? rawObj.radius ?? rawObj.attributes?.radiusMeters ?? rawObj.attributes?.accuracyMeters;
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

  const iconCandidate = text(rawObj.icon || rawObj.marker?.icon || rawObj.attributes?.icon, 48);
  const icon = PLACE_ICON_NAMES.has(iconCandidate as any) ? iconCandidate : "place";
  const markerShapeCandidate = text(
    rawObj.markerShape || rawObj.marker?.shape || rawObj.attributes?.markerShape,
    24
  );
  const markerShape = PLACE_MARKER_SHAPES.has(markerShapeCandidate as any)
    ? markerShapeCandidate
    : "pin";

  const result: Place = {
    id,
    name,
    geographicIdentifier: text(rawObj.geographicIdentifier || rawObj.attributes?.geographicIdentifier, 300),
    address: text(rawObj.address || rawObj.attributes?.address, 500),
    geometry,
    crs: text(rawObj.crs || rawObj.attributes?.crs, 40) || "OGC:CRS84",
    radiusMeters,
    icon,
    markerShape,
    attributes:
      rawObj.attributes && typeof rawObj.attributes === "object" ? (clone(rawObj.attributes) as Record<string, unknown>) : {},
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
  if (!place) return "";
  const placeObj = place as any;
  return `${String(placeObj.name || "")
    .trim()
    .toLocaleLowerCase()}|${JSON.stringify(placeObj.geometry || null)}|${placeObj.radiusMeters ?? ""}`;
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
    longitude:
      normalized?.geometry && "type" in normalized.geometry && normalized.geometry.type === "Point"
        ? (normalized.geometry.coordinates as [number, number])[0]
        : "",
    latitude:
      normalized?.geometry && "type" in normalized.geometry && normalized.geometry.type === "Point"
        ? (normalized.geometry.coordinates as [number, number])[1]
        : "",
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
