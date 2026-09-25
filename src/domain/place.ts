import type { CanonicalSpatialGeometry } from "./geotemporal.ts";
import type { PlaceId, SourceId } from "./ids.ts";
import { validateSpatialGeometry } from "./geotemporal.ts";
import type { ValidationResult } from "./entity.ts";

export interface CanonicalPlace {
  readonly id: PlaceId;
  readonly name: string;
  readonly geographicIdentifier: string;
  readonly address: string;
  readonly geometry: CanonicalSpatialGeometry | null;
  readonly crs: string;
  readonly radiusMeters: number | null;
  readonly sourceIds: readonly SourceId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export function validatePlace(
  place: Pick<
    CanonicalPlace,
    "name" | "geometry" | "crs" | "radiusMeters" | "sourceIds"
  >,
): ValidationResult {
  if (!place.name.trim()) {
    return { valid: false, message: "A place name is required." };
  }
  if (!place.crs.trim()) {
    return { valid: false, message: "A place coordinate reference system is required." };
  }
  if (place.geometry) {
    const findings = validateSpatialGeometry(place.geometry);
    if (findings.length > 0) {
      return { valid: false, message: findings[0] ?? "Place geometry is invalid." };
    }
  }
  if (
    place.radiusMeters !== null &&
    (!Number.isFinite(place.radiusMeters) || place.radiusMeters < 0)
  ) {
    return { valid: false, message: "Place radius must be null or a non-negative distance." };
  }
  if (place.radiusMeters !== null && place.geometry?.type !== "Point") {
    return { valid: false, message: "Place radius applies only to Point geometry." };
  }
  if (new Set(place.sourceIds).size !== place.sourceIds.length) {
    return { valid: false, message: "Place source references must be unique." };
  }
  return { valid: true, message: "" };
}
