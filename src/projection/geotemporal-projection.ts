import type {
  CanonicalGeotemporalState,
  CanonicalPointGeometry,
  CanonicalSpatialGeometry,
  GeotemporalLedger,
} from "../domain/geotemporal.ts";
import type { CanonicalTemporalExtent } from "../domain/relationship.ts";

export interface DirectGeotemporalProjection {
  readonly derivation: "direct";
  readonly stateId: string;
  readonly entityId: string;
  readonly geometry: CanonicalSpatialGeometry;
  readonly basis: "observed" | "asserted";
  readonly confidence: number | null;
  readonly uncertaintyMeters: number | null;
  readonly movementContinuity: "unknown" | "discrete" | "continuous" | null;
}

export interface InterpolatedGeotemporalProjection {
  readonly derivation: "interpolated";
  readonly entityId: string;
  readonly geometry: CanonicalPointGeometry;
  readonly at: number;
  readonly sourceStateIds: readonly [string, string];
}

function utcDate(
  year: number,
  monthIndex = 0,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function parseCanonicalTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source) return null;

  const year = /^([+-]?\d{1,6})$/.exec(source);
  if (year) return utcDate(Number(year[1]), 0, 1);

  const month = /^([+-]?\d{1,6})-(\d{2})$/.exec(source);
  if (month) return utcDate(Number(month[1]), Number(month[2]) - 1, 1);

  const day = /^([+-]?\d{1,6})-(\d{2})-(\d{2})$/.exec(source);
  if (day) return utcDate(Number(day[1]), Number(day[2]) - 1, Number(day[3]));

  const timestamp = Date.parse(source);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function endpointTime(
  endpoint: Readonly<Record<string, unknown>> | null | undefined,
): number | null {
  if (!endpoint) return null;

  const direct = parseCanonicalTime(endpoint["value"]);
  if (direct !== null) return direct;

  const earliest = parseCanonicalTime(endpoint["earliest"]);
  const latest = parseCanonicalTime(endpoint["latest"]);
  if (earliest !== null && latest !== null) {
    return earliest + (latest - earliest) / 2;
  }
  return earliest ?? latest;
}

function temporalBounds(extent: CanonicalTemporalExtent): readonly [number, number] | null {
  const start = extent.openStart ? Number.NEGATIVE_INFINITY : endpointTime(extent.start);
  if (start === null) return null;

  if (extent.type === "instant") return [start, start];

  const end = extent.openEnd ? Number.POSITIVE_INFINITY : endpointTime(extent.end);
  if (end === null || end < start) return null;
  return [start, end];
}

function activeAt(state: CanonicalGeotemporalState, at: number): boolean {
  const bounds = temporalBounds(state.validTime);
  if (!bounds) return false;
  return at >= bounds[0] && at <= bounds[1];
}

export function projectGeotemporalStatesAt(
  ledger: GeotemporalLedger,
  at: number,
): readonly DirectGeotemporalProjection[] {
  if (!Number.isFinite(at)) throw new Error("Geotemporal projection time must be finite.");

  return Object.freeze(
    ledger.states
      .filter((state) => activeAt(state, at))
      .map((state) =>
        Object.freeze({
          derivation: "direct" as const,
          stateId: state.id,
          entityId: String(state.entityId),
          geometry: state.geometry,
          basis: state.basis,
          confidence: state.confidence,
          uncertaintyMeters: state.uncertaintyMeters ?? null,
          movementContinuity: state.movementContinuity ?? null,
        }),
      )
      .sort(
        (left, right) =>
          left.entityId.localeCompare(right.entityId) || left.stateId.localeCompare(right.stateId),
      ),
  );
}

function instantTime(state: CanonicalGeotemporalState): number | null {
  if (state.validTime.type !== "instant" || state.validTime.openStart) return null;
  return endpointTime(state.validTime.start);
}

export function interpolatePointStates(
  earlier: CanonicalGeotemporalState,
  later: CanonicalGeotemporalState,
  at: number,
): InterpolatedGeotemporalProjection | null {
  if (!Number.isFinite(at)) return null;
  if (earlier.entityId !== later.entityId) return null;
  if (earlier.geometry.type !== "Point" || later.geometry.type !== "Point") return null;

  const earlierTime = instantTime(earlier);
  const laterTime = instantTime(later);
  if (
    earlierTime === null ||
    laterTime === null ||
    laterTime <= earlierTime ||
    at < earlierTime ||
    at > laterTime
  ) {
    return null;
  }

  const ratio = (at - earlierTime) / (laterTime - earlierTime);
  const earlierCoordinates = earlier.geometry.coordinates;
  const laterCoordinates = later.geometry.coordinates;
  const longitude = earlierCoordinates[0] + (laterCoordinates[0] - earlierCoordinates[0]) * ratio;
  const latitude = earlierCoordinates[1] + (laterCoordinates[1] - earlierCoordinates[1]) * ratio;

  return Object.freeze({
    derivation: "interpolated" as const,
    entityId: String(earlier.entityId),
    geometry: Object.freeze({
      type: "Point" as const,
      coordinates: Object.freeze([longitude, latitude]) as readonly [number, number],
    }),
    at,
    sourceStateIds: Object.freeze([earlier.id, later.id]) as readonly [string, string],
  });
}
