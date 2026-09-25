import type { WorldRenderPosition } from "../../src/layout/world-geographic-position.ts";
import { type WorldNodeShape, worldColorBytes } from "../../src/layout/world-graph-style.ts";

/**
 * Renderer-neutral geometry for the place map: a location's GeoJSON
 * (points, lines, areas) plus its authored marker/path/area style, resolved
 * into plain datums the deck place map draws. Pure; no DOM or renderer.
 */

export type PlaceMapRgba = readonly [number, number, number, number];

export interface PlaceMapStyle {
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
    lineCap?: string;
    lineJoin?: string;
  };
  area?: {
    fill?: boolean;
    fillColor?: string;
    fillOpacity?: number;
    fillRule?: string;
  };
}

export interface PlaceMapLocation {
  geometry?: { type: string; coordinates: unknown };
  mapFeatures?: unknown[];
  radiusMeters?: number;
  accuracyMeters?: number;
  accuracy?: number;
  name?: string;
  icon?: string;
  markerShape?: string;
  style?: PlaceMapStyle;
  geographicIdentifier?: string;
  address?: string;
}

export interface PlaceMapPoint {
  readonly longitude: number;
  readonly latitude: number;
}

export interface PlaceMapMarker {
  readonly position: WorldRenderPosition;
  readonly label: string;
  readonly icon: string;
  readonly shape: WorldNodeShape;
  /** Marker body colour. */
  readonly fill: string;
  readonly borderWidth: number;
  /** Marker diameter in screen pixels. */
  readonly size: number;
  readonly opacity: number;
  readonly primary: boolean;
}

export interface PlaceMapPath {
  readonly path: readonly WorldRenderPosition[];
  readonly color: PlaceMapRgba;
  readonly width: number;
  /** Authored dash and gap lengths in screen pixels, or null for solid. */
  readonly dash: readonly [number, number] | null;
}

export interface PlaceMapArea {
  readonly polygon: readonly (readonly WorldRenderPosition[])[];
  readonly fill: PlaceMapRgba;
}

export interface PlaceMapGeometry {
  readonly markers: readonly PlaceMapMarker[];
  readonly paths: readonly PlaceMapPath[];
  readonly areas: readonly PlaceMapArea[];
  /** Every drawn coordinate, for camera fitting. */
  readonly positions: readonly WorldRenderPosition[];
}

export interface PlaceMapGeometryDefaults {
  readonly color: string;
  readonly iconName: string;
  readonly markerShape: string;
  readonly label: string;
  readonly style?: PlaceMapStyle;
}

export const PLACE_MAP_DEFAULT_COLOR = "#315fbd";

const GEOJSON_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
  "Feature",
  "FeatureCollection",
]);

const MARKER_SHAPES: readonly WorldNodeShape[] = ["circle", "square", "diamond", "hexagon", "pin"];
const ACCURACY_RING_SEGMENTS = 64;
const EARTH_RADIUS_METERS = 6_371_008.8;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isGeoJsonObject(value: unknown): boolean {
  const object = record(value);
  return Boolean(object && typeof object["type"] === "string" && GEOJSON_TYPES.has(object["type"]));
}

export function geoJsonObjects(location?: PlaceMapLocation | null): unknown[] {
  const objects: unknown[] = [];
  const geometry = location?.geometry;
  if (isGeoJsonObject(geometry)) objects.push(geometry);
  const extras = Array.isArray(location?.mapFeatures) ? location.mapFeatures : [];
  for (const feature of extras) {
    if (isGeoJsonObject(feature)) objects.push(feature);
  }
  return objects;
}

export function hasRenderableGeometry(location?: PlaceMapLocation | null): boolean {
  return geoJsonObjects(location).length > 0;
}

function validPoint(value: unknown): WorldRenderPosition | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return Object.freeze([longitude, latitude, 0]) as WorldRenderPosition;
}

export function pointCoordinates(location?: PlaceMapLocation | null): PlaceMapPoint | null {
  const geometry = location?.geometry;
  if (geometry?.type !== "Point") return null;
  const point = validPoint(geometry.coordinates);
  return point ? Object.freeze({ longitude: point[0], latitude: point[1] }) : null;
}

/** Camera zoom that frames a point location at its stated accuracy. */
export function presentationZoom(location?: PlaceMapLocation | null): number {
  const accuracy = Number(location?.radiusMeters ?? location?.accuracyMeters ?? location?.accuracy);
  if (Number.isFinite(accuracy)) {
    if (accuracy <= 50) return 16;
    if (accuracy <= 250) return 15;
    if (accuracy <= 1000) return 13;
    if (accuracy <= 5000) return 11;
  }
  return 13;
}

export function mergeMapStyle(
  base: PlaceMapStyle = {},
  override: PlaceMapStyle = {},
): PlaceMapStyle {
  return {
    marker: { ...(base.marker || {}), ...(override.marker || {}) },
    path: { ...(base.path || {}), ...(override.path || {}) },
    area: { ...(base.area || {}), ...(override.area || {}) },
  };
}

function styleNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max ? numeric : fallback;
}

/**
 * CSS colour to RGBA bytes: hex and `rgb()/rgba()` are understood; anything
 * else (named colours, variables) falls back rather than rendering black.
 */
export function placeMapColorBytes(value: unknown, fallback: string, alpha = 1): PlaceMapRgba {
  const text = String(value ?? "").trim();
  const opacity = Math.max(0, Math.min(1, alpha));
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) {
    return worldColorBytes(text, Math.round(opacity * 255));
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(
    text,
  );
  if (rgb) {
    const channel = (raw: string | undefined) =>
      Math.max(0, Math.min(255, Math.round(Number(raw ?? 0))));
    const rawAlpha = rgb[4];
    const ownAlpha =
      rawAlpha === undefined
        ? 1
        : rawAlpha.endsWith("%")
          ? Number(rawAlpha.slice(0, -1)) / 100
          : Number(rawAlpha);
    const combined = Math.max(0, Math.min(1, Number.isFinite(ownAlpha) ? ownAlpha : 1)) * opacity;
    return Object.freeze([
      channel(rgb[1]),
      channel(rgb[2]),
      channel(rgb[3]),
      Math.round(combined * 255),
    ]) as PlaceMapRgba;
  }
  return worldColorBytes(fallback, Math.round(opacity * 255));
}

function colorText(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) ? text : fallback;
}

function markerShape(value: unknown): WorldNodeShape {
  return MARKER_SHAPES.find((shape) => shape === value) ?? "pin";
}

interface PathAppearance {
  readonly stroke: boolean;
  readonly color: PlaceMapRgba;
  readonly width: number;
  readonly dash: readonly [number, number] | null;
  readonly fill: boolean;
  readonly fillColor: PlaceMapRgba;
}

interface PathDefaults {
  readonly weight?: number;
  readonly opacity?: number;
  readonly fillOpacity?: number;
}

/** SVG-style `dashArray` ("6 4", "6,4", "6") to a [dash, gap] pixel pair. */
export function parseDashArray(value: unknown): readonly [number, number] | null {
  const parts = String(value ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const dash = parts[0] ?? 0;
  const gap = parts[1] ?? dash;
  return dash > 0 && gap > 0 ? Object.freeze([dash, gap]) : null;
}

function pathAppearance(
  style: PlaceMapStyle,
  fallbackColor: string,
  defaults: PathDefaults = {},
): PathAppearance {
  const path = style.path || {};
  const area = style.area || {};
  return {
    stroke: typeof path.stroke === "boolean" ? path.stroke : true,
    color: placeMapColorBytes(
      path.color,
      fallbackColor,
      styleNumber(path.opacity, defaults.opacity ?? 0.9, 0, 1),
    ),
    width: styleNumber(path.weight, defaults.weight ?? 3, 0, 24),
    dash: parseDashArray(path.dashArray),
    fill: typeof area.fill === "boolean" ? area.fill : true,
    fillColor: placeMapColorBytes(
      area.fillColor || path.color,
      fallbackColor,
      styleNumber(area.fillOpacity, defaults.fillOpacity ?? 0.12, 0, 1),
    ),
  };
}

function lineOf(value: unknown): WorldRenderPosition[] {
  if (!Array.isArray(value)) return [];
  const line: WorldRenderPosition[] = [];
  for (const point of value) {
    const valid = validPoint(point);
    if (valid) line.push(valid);
  }
  return line;
}

/** Geodesic circle (as a closed ring) of `radiusMeters` around `center`. */
export function accuracyRing(
  center: PlaceMapPoint,
  radiusMeters: number,
  segments = ACCURACY_RING_SEGMENTS,
): readonly WorldRenderPosition[] {
  const angular = radiusMeters / EARTH_RADIUS_METERS;
  const latitude = (center.latitude * Math.PI) / 180;
  const longitude = (center.longitude * Math.PI) / 180;
  const ring: WorldRenderPosition[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const bearing = (index / segments) * Math.PI * 2;
    const pointLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angular) +
        Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing),
    );
    const pointLongitude =
      longitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude),
        Math.cos(angular) - Math.sin(latitude) * Math.sin(pointLatitude),
      );
    const degreesLongitude = ((((pointLongitude * 180) / Math.PI + 540) % 360) + 360) % 360;
    ring.push(
      Object.freeze([
        degreesLongitude - 180,
        (pointLatitude * 180) / Math.PI,
        0,
      ]) as WorldRenderPosition,
    );
  }
  return Object.freeze(ring);
}

/**
 * Resolves a location's GeoJSON and authored styles into drawable place-map
 * datums. The location's own Point is the primary, labelled marker; extra
 * map features keep their per-feature `properties.style/color/icon/name`.
 */
export function placeMapGeometry(
  location: PlaceMapLocation | null | undefined,
  defaults: PlaceMapGeometryDefaults,
): PlaceMapGeometry {
  const markers: PlaceMapMarker[] = [];
  const paths: PlaceMapPath[] = [];
  const areas: PlaceMapArea[] = [];
  const positions: WorldRenderPosition[] = [];
  const baseStyle = mergeMapStyle(location?.style, defaults.style);
  const primaryIsPoint = location?.geometry?.type === "Point";

  const visit = (object: unknown, properties: Record<string, unknown>, primary: boolean): void => {
    const node = record(object);
    if (!node) return;
    const type = node["type"];
    if (type === "FeatureCollection") {
      for (const feature of Array.isArray(node["features"]) ? node["features"] : []) {
        visit(feature, {}, false);
      }
      return;
    }
    if (type === "Feature") {
      visit(node["geometry"], record(node["properties"]) ?? {}, primary);
      return;
    }
    if (type === "GeometryCollection") {
      for (const geometry of Array.isArray(node["geometries"]) ? node["geometries"] : []) {
        visit(geometry, properties, false);
      }
      return;
    }

    const style = mergeMapStyle(baseStyle, (record(properties["style"]) ?? {}) as PlaceMapStyle);
    const color = colorText(properties["color"], defaults.color);
    const coordinates = node["coordinates"];

    const addMarker = (point: unknown, isPrimary: boolean) => {
      const position = validPoint(point);
      if (!position) return;
      const marker = style.marker || {};
      positions.push(position);
      markers.push(
        Object.freeze({
          position,
          label: isPrimary
            ? defaults.label
            : String(properties["name"] || properties["label"] || ""),
          icon: String(properties["icon"] || defaults.iconName || "place"),
          shape: markerShape(properties["markerShape"] || defaults.markerShape),
          fill: colorText(marker.fillColor || marker.color, color),
          borderWidth: styleNumber(marker.weight, 2, 0, 8),
          size: styleNumber(marker.size, 44, 16, 64),
          opacity: styleNumber(marker.opacity, 1, 0, 1),
          primary: isPrimary,
        }),
      );
    };
    const addLine = (value: unknown) => {
      const appearance = pathAppearance(style, color);
      const line = lineOf(value);
      if (line.length < 2) return;
      positions.push(...line);
      if (appearance.stroke && appearance.width > 0) {
        paths.push(
          Object.freeze({
            path: Object.freeze(line),
            color: appearance.color,
            width: appearance.width,
            dash: appearance.dash,
          }),
        );
      }
    };
    const addPolygon = (value: unknown) => {
      if (!Array.isArray(value)) return;
      const appearance = pathAppearance(style, color);
      const rings = value.map(lineOf).filter((ring) => ring.length >= 3);
      if (rings.length === 0) return;
      for (const ring of rings) positions.push(...ring);
      if (appearance.fill) {
        areas.push(
          Object.freeze({
            polygon: Object.freeze(rings.map((ring) => Object.freeze(ring))),
            fill: appearance.fillColor,
          }),
        );
      }
      if (appearance.stroke && appearance.width > 0) {
        for (const ring of rings) {
          paths.push(
            Object.freeze({
              path: Object.freeze(ring),
              color: appearance.color,
              width: appearance.width,
              dash: appearance.dash,
            }),
          );
        }
      }
    };

    switch (type) {
      case "Point":
        addMarker(coordinates, primary);
        break;
      case "MultiPoint":
        for (const point of Array.isArray(coordinates) ? coordinates : []) addMarker(point, false);
        break;
      case "LineString":
        addLine(coordinates);
        break;
      case "MultiLineString":
        for (const line of Array.isArray(coordinates) ? coordinates : []) addLine(line);
        break;
      case "Polygon":
        addPolygon(coordinates);
        break;
      case "MultiPolygon":
        for (const polygon of Array.isArray(coordinates) ? coordinates : []) addPolygon(polygon);
        break;
      default:
        break;
    }
  };

  for (const [index, object] of geoJsonObjects(location).entries()) {
    visit(object, {}, index === 0 && primaryIsPoint);
  }

  const point = pointCoordinates(location);
  const radius = Number(location?.radiusMeters ?? location?.accuracyMeters ?? location?.accuracy);
  if (point && Number.isFinite(radius) && radius > 0) {
    const ring = accuracyRing(point, radius);
    const appearance = pathAppearance(baseStyle, defaults.color, {
      weight: 1.5,
      opacity: 0.55,
      fillOpacity: 0.06,
    });
    areas.push(Object.freeze({ polygon: Object.freeze([ring]), fill: appearance.fillColor }));
    paths.push(
      Object.freeze({ path: ring, color: appearance.color, width: appearance.width, dash: null }),
    );
    positions.push(...ring);
  }

  return Object.freeze({
    markers: Object.freeze(markers),
    paths: Object.freeze(paths),
    areas: Object.freeze(areas),
    positions: Object.freeze(positions),
  });
}
