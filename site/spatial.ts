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

const PLACE_GEOMETRY_TYPES = new Set<string>([
  "Point",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);
const PLACE_MARKER_SHAPES = new Set<string>(["pin", "circle", "square", "diamond"]);
const PLACE_PATH_LINE_CAPS = new Set<string>(["butt", "round", "square"]);
const PLACE_PATH_LINE_JOINS = new Set<string>(["miter", "round", "bevel"]);
const PLACE_AREA_FILL_RULES = new Set<string>(["nonzero", "evenodd"]);
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
  "route",
  "nature",
  "market",
  "workshop",
]);

function clone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

type NonPointPlaceGeometryType =
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon";

type PlaceGeometry =
  | {
      type: "Point";
      coordinates: [number, number];
    }
  | {
      type: NonPointPlaceGeometryType;
      coordinates: unknown[];
    };

interface PlaceStyle {
  marker?: {
    color?: string;
    fillColor?: string;
    opacity?: number;
    size?: number;
    weight?: number;
  };
  path?: {
    stroke?: boolean;
    color?: string;
    weight?: number;
    opacity?: number;
    dashArray?: string;
    dashOffset?: string;
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
  };
  area?: {
    fill?: boolean;
    fillColor?: string;
    fillOpacity?: number;
    fillRule?: "nonzero" | "evenodd";
  };
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
  style: PlaceStyle;
  attributes: Record<string, unknown>;
}

function optionalStyleNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}

function optionalStyleBoolean(value: unknown): boolean | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === true || value === "true" || value === "on") return true;
  if (value === false || value === "false" || value === "off") return false;
  return undefined;
}

function optionalStyleColor(value: unknown): string | undefined {
  const candidate = text(value, 16);
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : undefined;
}

function optionalDashValue(value: unknown): string | undefined {
  const candidate = text(value, 80);
  return candidate && /^[0-9.,\s-]+$/.test(candidate) ? candidate : undefined;
}

function normalizePlaceStyle(raw: unknown): PlaceStyle {
  const source = isRecord(raw) ? raw : {};
  const markerSource = isRecord(source.marker) ? source.marker : {};
  const pathSource = isRecord(source.path) ? source.path : {};
  const areaSource = isRecord(source.area) ? source.area : {};
  const style: PlaceStyle = {};

  const marker: PlaceStyle["marker"] = {
    color: optionalStyleColor(markerSource.color),
    fillColor: optionalStyleColor(markerSource.fillColor),
    opacity: optionalStyleNumber(markerSource.opacity, 0, 1),
    size: optionalStyleNumber(markerSource.size, 16, 40),
    weight: optionalStyleNumber(markerSource.weight, 0, 8),
  };
  for (const key of Object.keys(marker) as Array<keyof typeof marker>) {
    if (marker[key] === undefined) delete marker[key];
  }
  if (Object.keys(marker).length > 0) style.marker = marker;

  const lineCap = text(pathSource.lineCap, 16);
  const lineJoin = text(pathSource.lineJoin, 16);
  const path: PlaceStyle["path"] = {
    stroke: optionalStyleBoolean(pathSource.stroke),
    color: optionalStyleColor(pathSource.color),
    weight: optionalStyleNumber(pathSource.weight, 0, 24),
    opacity: optionalStyleNumber(pathSource.opacity, 0, 1),
    dashArray: optionalDashValue(pathSource.dashArray),
    dashOffset: optionalDashValue(pathSource.dashOffset),
    lineCap: PLACE_PATH_LINE_CAPS.has(lineCap)
      ? (lineCap as NonNullable<PlaceStyle["path"]>["lineCap"])
      : undefined,
    lineJoin: PLACE_PATH_LINE_JOINS.has(lineJoin)
      ? (lineJoin as NonNullable<PlaceStyle["path"]>["lineJoin"])
      : undefined,
  };
  for (const key of Object.keys(path) as Array<keyof typeof path>) {
    if (path[key] === undefined) delete path[key];
  }
  if (Object.keys(path).length > 0) style.path = path;

  const fillRule = text(areaSource.fillRule, 16);
  const area: PlaceStyle["area"] = {
    fill: optionalStyleBoolean(areaSource.fill),
    fillColor: optionalStyleColor(areaSource.fillColor),
    fillOpacity: optionalStyleNumber(areaSource.fillOpacity, 0, 1),
    fillRule: PLACE_AREA_FILL_RULES.has(fillRule)
      ? (fillRule as NonNullable<PlaceStyle["area"]>["fillRule"])
      : undefined,
  };
  for (const key of Object.keys(area) as Array<keyof typeof area>) {
    if (area[key] === undefined) delete area[key];
  }
  if (Object.keys(area).length > 0) style.area = area;

  return style;
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
  if (!Array.isArray(raw.coordinates) || raw.coordinates.length === 0) {
    throw new Error("Place path/area geometry requires GeoJSON coordinates.");
  }
  const cloned = clone(raw);
  if (!isRecord(cloned) || !Array.isArray(cloned.coordinates)) {
    throw new Error("Place path/area geometry requires cloneable GeoJSON coordinates.");
  }
  return {
    ...cloned,
    type: raw.type as NonPointPlaceGeometryType,
    coordinates: cloned.coordinates,
  };
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
  const style = normalizePlaceStyle(raw.style || raw.mapStyle || attributes.style);

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
    style,
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
  delete result.attributes.style;
  delete result.attributes.mapStyle;
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
  markerColor?: unknown;
  markerFillColor?: unknown;
  markerOpacity?: unknown;
  markerSize?: unknown;
  markerWeight?: unknown;
  pathStroke?: unknown;
  pathColor?: unknown;
  pathWeight?: unknown;
  pathOpacity?: unknown;
  pathDashArray?: unknown;
  pathDashOffset?: unknown;
  pathLineCap?: unknown;
  pathLineJoin?: unknown;
  areaFill?: unknown;
  areaFillColor?: unknown;
  areaFillOpacity?: unknown;
  areaFillRule?: unknown;
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
    if ((lng === null) !== (lat === null)) {
      throw new Error("Place coordinates require both latitude and longitude.");
    }
    if (lng !== null && lat !== null) geometry = { type: "Point", coordinates: [lng, lat] };
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
    style: {
      marker: {
        color: options.markerColor,
        fillColor: options.markerFillColor,
        opacity: options.markerOpacity,
        size: options.markerSize,
        weight: options.markerWeight,
      },
      path: {
        stroke: options.pathStroke,
        color: options.pathColor,
        weight: options.pathWeight,
        opacity: options.pathOpacity,
        dashArray: options.pathDashArray,
        dashOffset: options.pathDashOffset,
        lineCap: options.pathLineCap,
        lineJoin: options.pathLineJoin,
      },
      area: {
        fill: options.areaFill,
        fillColor: options.areaFillColor,
        fillOpacity: options.areaFillOpacity,
        fillRule: options.areaFillRule,
      },
    },
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
  markerColor: string;
  markerFillColor: string;
  markerOpacity: string | number;
  markerSize: string | number;
  markerWeight: string | number;
  pathStroke: string;
  pathColor: string;
  pathWeight: string | number;
  pathOpacity: string | number;
  pathDashArray: string;
  pathDashOffset: string;
  pathLineCap: string;
  pathLineJoin: string;
  areaFill: string;
  areaFillColor: string;
  areaFillOpacity: string | number;
  areaFillRule: string;
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
    markerColor: normalized?.style?.marker?.color || "",
    markerFillColor: normalized?.style?.marker?.fillColor || "",
    markerOpacity: normalized?.style?.marker?.opacity ?? "",
    markerSize: normalized?.style?.marker?.size ?? "",
    markerWeight: normalized?.style?.marker?.weight ?? "",
    pathStroke:
      normalized?.style?.path?.stroke === undefined ? "" : String(normalized.style.path.stroke),
    pathColor: normalized?.style?.path?.color || "",
    pathWeight: normalized?.style?.path?.weight ?? "",
    pathOpacity: normalized?.style?.path?.opacity ?? "",
    pathDashArray: normalized?.style?.path?.dashArray || "",
    pathDashOffset: normalized?.style?.path?.dashOffset || "",
    pathLineCap: normalized?.style?.path?.lineCap || "",
    pathLineJoin: normalized?.style?.path?.lineJoin || "",
    areaFill:
      normalized?.style?.area?.fill === undefined ? "" : String(normalized.style.area.fill),
    areaFillColor: normalized?.style?.area?.fillColor || "",
    areaFillOpacity: normalized?.style?.area?.fillOpacity ?? "",
    areaFillRule: normalized?.style?.area?.fillRule || "",
    areaGeometry:
      normalized?.geometry &&
      "type" in normalized.geometry &&
      normalized.geometry.type !== "Point"
        ? JSON.stringify(normalized.geometry, null, 2)
        : "",
  };
}

const TimelineSpatialObj = {
  PLACE_ICON_NAMES: Object.freeze([...PLACE_ICON_NAMES]),
  PLACE_MARKER_SHAPES: Object.freeze([...PLACE_MARKER_SHAPES]),
  PLACE_PATH_LINE_CAPS: Object.freeze([...PLACE_PATH_LINE_CAPS]),
  PLACE_PATH_LINE_JOINS: Object.freeze([...PLACE_PATH_LINE_JOINS]),
  PLACE_AREA_FILL_RULES: Object.freeze([...PLACE_AREA_FILL_RULES]),
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
