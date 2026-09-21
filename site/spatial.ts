/**
 * Timeline spatial/location module
 * Utilities for normalizing and validating geographic coordinates, places, and geometries
 * Supports GeoJSON Point, LineString, MultiLineString, Polygon, and MultiPolygon geometries
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

const PLACE_GEOMETRY_TYPES = new Set([
  "Point",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
] as const);
const PLACE_MARKER_SHAPES = new Set(["pin", "circle", "square", "diamond"] as const);
const PLACE_PATH_LINE_CAPS = new Set(["butt", "round", "square"] as const);
const PLACE_PATH_LINE_JOINS = new Set(["miter", "round", "bevel"] as const);
const PLACE_AREA_FILL_RULES = new Set(["nonzero", "evenodd"] as const);
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
  type: "Point" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
}

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
  if (!raw || typeof raw !== "object") return {};
  const source = raw as any;
  const markerSource = source.marker && typeof source.marker === "object" ? source.marker : {};
  const pathSource = source.path && typeof source.path === "object" ? source.path : {};
  const areaSource = source.area && typeof source.area === "object" ? source.area : {};
  const style: PlaceStyle = {};

  const marker = {
    color: optionalStyleColor(markerSource.color),
    fillColor: optionalStyleColor(markerSource.fillColor),
    opacity: optionalStyleNumber(markerSource.opacity, 0, 1),
    size: optionalStyleNumber(markerSource.size, 16, 40),
    weight: optionalStyleNumber(markerSource.weight, 0, 8),
  };
  if (Object.values(marker).some((value) => value !== undefined)) {
    style.marker = Object.fromEntries(
      Object.entries(marker).filter(([, value]) => value !== undefined),
    ) as PlaceStyle["marker"];
  }

  const lineCapCandidate = text(pathSource.lineCap, 16);
  const lineJoinCandidate = text(pathSource.lineJoin, 16);
  const path = {
    stroke: optionalStyleBoolean(pathSource.stroke),
    color: optionalStyleColor(pathSource.color),
    weight: optionalStyleNumber(pathSource.weight, 0, 24),
    opacity: optionalStyleNumber(pathSource.opacity, 0, 1),
    dashArray: optionalDashValue(pathSource.dashArray),
    dashOffset: optionalDashValue(pathSource.dashOffset),
    lineCap: PLACE_PATH_LINE_CAPS.has(lineCapCandidate as any) ? lineCapCandidate : undefined,
    lineJoin: PLACE_PATH_LINE_JOINS.has(lineJoinCandidate as any) ? lineJoinCandidate : undefined,
  };
  if (Object.values(path).some((value) => value !== undefined)) {
    style.path = Object.fromEntries(
      Object.entries(path).filter(([, value]) => value !== undefined),
    ) as PlaceStyle["path"];
  }

  const fillRuleCandidate = text(areaSource.fillRule, 16);
  const area = {
    fill: optionalStyleBoolean(areaSource.fill),
    fillColor: optionalStyleColor(areaSource.fillColor),
    fillOpacity: optionalStyleNumber(areaSource.fillOpacity, 0, 1),
    fillRule: PLACE_AREA_FILL_RULES.has(fillRuleCandidate as any)
      ? fillRuleCandidate
      : undefined,
  };
  if (Object.values(area).some((value) => value !== undefined)) {
    style.area = Object.fromEntries(
      Object.entries(area).filter(([, value]) => value !== undefined),
    ) as PlaceStyle["area"];
  }

  return style;
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
    throw new Error("Place path/area geometry requires GeoJSON coordinates.");
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

  const style = normalizePlaceStyle(rawObj.style || rawObj.mapStyle || rawObj.attributes?.style);

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
    style,
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
  delete result.attributes.style;
  delete result.attributes.mapStyle;
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

// Export public API as frozen object for backward compatibility
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
