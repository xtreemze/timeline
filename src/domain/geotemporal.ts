import type { CanonicalEntity } from "./entity.ts";
import type { EntityId, SourceId } from "./ids.ts";
import type { CanonicalTemporalExtent } from "./relationship.ts";

export type GeoPosition = readonly [number, number, ...number[]];

export interface CanonicalPointGeometry {
  readonly type: "Point";
  readonly coordinates: GeoPosition;
}

export interface CanonicalLineStringGeometry {
  readonly type: "LineString";
  readonly coordinates: readonly GeoPosition[];
}

export interface CanonicalMultiLineStringGeometry {
  readonly type: "MultiLineString";
  readonly coordinates: readonly (readonly GeoPosition[])[];
}

export interface CanonicalPolygonGeometry {
  readonly type: "Polygon";
  readonly coordinates: readonly (readonly GeoPosition[])[];
}

export interface CanonicalMultiPolygonGeometry {
  readonly type: "MultiPolygon";
  readonly coordinates: readonly (readonly (readonly GeoPosition[])[])[];
}

export type CanonicalSpatialGeometry =
  | CanonicalPointGeometry
  | CanonicalLineStringGeometry
  | CanonicalMultiLineStringGeometry
  | CanonicalPolygonGeometry
  | CanonicalMultiPolygonGeometry;

export interface CanonicalGeotemporalState {
  readonly id: string;
  readonly entityId: EntityId;
  readonly geometry: CanonicalSpatialGeometry;
  readonly validTime: CanonicalTemporalExtent;
  readonly basis: "observed" | "asserted";
  readonly sourceIds: readonly SourceId[];
  readonly confidence: number | null;
  readonly uncertaintyMeters?: number | null;
  readonly movementContinuity?: "unknown" | "discrete" | "continuous";
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface GeotemporalLedger {
  readonly states: readonly CanonicalGeotemporalState[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPosition(value: unknown): value is GeoPosition {
  if (!Array.isArray(value) || value.length < 2) return false;
  if (!value.every(isFiniteNumber)) return false;
  const [longitude, latitude] = value;
  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) return false;
  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
}

function positions(value: unknown, minimum: number): value is readonly GeoPosition[] {
  return Array.isArray(value) && value.length >= minimum && value.every(isPosition);
}

function polygonRings(value: unknown): value is readonly (readonly GeoPosition[])[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((ring) => {
      if (!positions(ring, 4)) return false;
      const first = ring.at(0);
      const last = ring.at(-1);
      if (!first || !last) return false;
      return first[0] === last[0] && first[1] === last[1];
    })
  );
}

export function validateSpatialGeometry(geometry: unknown): readonly string[] {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
    return Object.freeze(["Spatial geometry must be a GeoJSON geometry object."]);
  }

  const record = geometry as Readonly<Record<string, unknown>>;
  const type = record["type"];
  const coordinates = record["coordinates"];

  if (type === "Point") {
    return Object.freeze(
      isPosition(coordinates)
        ? []
        : ["Point coordinates must contain valid longitude and latitude."],
    );
  }

  if (type === "LineString") {
    return Object.freeze(
      positions(coordinates, 2)
        ? []
        : ["LineString coordinates require at least two valid positions."],
    );
  }

  if (type === "MultiLineString") {
    const valid =
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.every((line) => positions(line, 2));
    return Object.freeze(
      valid ? [] : ["MultiLineString coordinates require non-empty valid line strings."],
    );
  }

  if (type === "Polygon") {
    return Object.freeze(
      polygonRings(coordinates)
        ? []
        : ["Polygon coordinates require closed rings with at least four positions."],
    );
  }

  if (type === "MultiPolygon") {
    const valid =
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.every((polygon) => polygonRings(polygon));
    return Object.freeze(
      valid ? [] : ["MultiPolygon coordinates require non-empty valid polygons."],
    );
  }

  return Object.freeze([
    "Spatial geometry type must be Point, LineString, MultiLineString, Polygon, or MultiPolygon.",
  ]);
}

function endpointValue(endpoint: Readonly<Record<string, unknown>> | null | undefined): string {
  if (!endpoint) return "";
  const value = endpoint["value"];
  return typeof value === "string" ? value.trim() : "";
}

function temporalOrderingFindings(time: CanonicalTemporalExtent): readonly string[] {
  if (time.type !== "interval" || time.openStart || time.openEnd) return Object.freeze([]);
  const startValue = endpointValue(time.start);
  const endValue = endpointValue(time.end);
  if (!startValue || !endValue) return Object.freeze([]);

  const start = Date.parse(startValue);
  const end = Date.parse(endValue);
  if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
    return Object.freeze(["Geotemporal interval end cannot precede its start."]);
  }
  return Object.freeze([]);
}

export function validateGeotemporalState(
  state: CanonicalGeotemporalState,
  entities: readonly CanonicalEntity[],
): readonly string[] {
  const findings: string[] = [];

  if (!state.id.trim()) findings.push("Geotemporal state ID is required.");
  if (!entities.some((entity) => entity.id === state.entityId)) {
    findings.push("Geotemporal state must reference an existing canonical entity.");
  }

  findings.push(...validateSpatialGeometry(state.geometry));
  findings.push(...temporalOrderingFindings(state.validTime));

  if (!["observed", "asserted"].includes(state.basis)) {
    findings.push("Geotemporal state basis must be observed or asserted.");
  }

  if (
    state.confidence !== null &&
    (!Number.isFinite(state.confidence) || state.confidence < 0 || state.confidence > 1)
  ) {
    findings.push("Geotemporal confidence must be null or between 0 and 1.");
  }

  if (
    state.uncertaintyMeters !== undefined &&
    state.uncertaintyMeters !== null &&
    (!Number.isFinite(state.uncertaintyMeters) || state.uncertaintyMeters < 0)
  ) {
    findings.push("Geotemporal uncertainty must be a non-negative distance.");
  }

  if (
    state.movementContinuity &&
    state.geometry.type !== "LineString" &&
    state.geometry.type !== "MultiLineString"
  ) {
    findings.push("Movement continuity applies only to path geometries.");
  }

  if (new Set(state.sourceIds).size !== state.sourceIds.length) {
    findings.push("Geotemporal source references must be unique.");
  }

  return Object.freeze(findings);
}

export function recordGeotemporalState(
  ledger: GeotemporalLedger,
  state: CanonicalGeotemporalState,
  entities: readonly CanonicalEntity[],
): GeotemporalLedger {
  const findings = validateGeotemporalState(state, entities);
  if (findings.length) throw new Error(findings.join(" "));
  if (ledger.states.some((existing) => existing.id === state.id)) {
    throw new Error("Geotemporal state ID already exists.");
  }

  return Object.freeze({
    states: Object.freeze([...ledger.states, state]),
  });
}
