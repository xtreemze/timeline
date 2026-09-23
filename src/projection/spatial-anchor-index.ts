import type { CanonicalSpatialGeometry, GeoPosition } from "../domain/geotemporal.ts";
import type { EntityId, PlaceId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import { createSpatialAnchor, type SpatialAnchor } from "./world-projection.ts";

export interface SpatialPlaceRecord {
  readonly id: PlaceId;
  readonly geometry: CanonicalSpatialGeometry;
  readonly certainty?: number;
  readonly precisionRadiusMeters?: number;
  readonly sourceAltitude?: number;
}

export interface EntitySpatialAnchor {
  readonly entityId: EntityId;
  readonly occurrenceId: RelationshipId;
  readonly role: "subject" | "object";
  readonly anchor: SpatialAnchor;
}

export interface WorldLayoutConstraint {
  readonly canonicalId: EntityId;
  readonly occurrenceId: RelationshipId;
  readonly spatialAnchors: readonly SpatialAnchor[];
}

function positionsFromGeometry(geometry: CanonicalSpatialGeometry): readonly GeoPosition[] {
  if (geometry.type === "Point") return Object.freeze([geometry.coordinates]);
  if (geometry.type === "LineString") return Object.freeze([...geometry.coordinates]);
  if (geometry.type === "MultiLineString") {
    return Object.freeze(geometry.coordinates.flatMap((line) => [...line]));
  }
  if (geometry.type === "Polygon") {
    return Object.freeze(geometry.coordinates.flatMap((ring) => [...ring]));
  }
  return Object.freeze(
    geometry.coordinates.flatMap((polygon) => polygon.flatMap((ring) => [...ring])),
  );
}

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function normalizeLongitude(value: number): number {
  if (value >= -180 && value <= 180) return Object.is(value, -0) ? 0 : value;
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function representativeGeographicPosition(
  geometry: CanonicalSpatialGeometry,
): readonly [number, number] {
  if (geometry.type === "Point") {
    return Object.freeze([geometry.coordinates[0], geometry.coordinates[1]]);
  }

  const positions = positionsFromGeometry(geometry);
  if (!positions.length) throw new Error("Spatial geometry must contain at least one position.");

  let x = 0;
  let y = 0;
  let z = 0;

  for (const position of positions) {
    const longitude = radians(position[0]);
    const latitude = radians(position[1]);
    const cosLatitude = Math.cos(latitude);
    x += cosLatitude * Math.cos(longitude);
    y += cosLatitude * Math.sin(longitude);
    z += Math.sin(latitude);
  }

  const magnitude = Math.hypot(x, y, z);
  if (magnitude < 1e-12) {
    const first = positions[0];
    if (!first) throw new Error("Spatial geometry must contain at least one position.");
    const [longitude, latitude] = first;
    return Object.freeze([normalizeLongitude(longitude), latitude]);
  }

  const longitude = normalizeLongitude(degrees(Math.atan2(y, x)));
  const latitude = degrees(Math.atan2(z, Math.hypot(x, y)));
  return Object.freeze([longitude, latitude]);
}

function anchorFromPlace(place: SpatialPlaceRecord): SpatialAnchor {
  const [longitude, latitude] = representativeGeographicPosition(place.geometry);
  return createSpatialAnchor({
    placeId: place.id,
    longitude,
    latitude,
    influence: 1,
    ...(place.certainty === undefined ? {} : { certainty: place.certainty }),
    ...(place.precisionRadiusMeters === undefined
      ? {}
      : { precisionRadiusMeters: place.precisionRadiusMeters }),
    ...(place.sourceAltitude === undefined ? {} : { sourceAltitude: place.sourceAltitude }),
  });
}

function freezeEntityAnchor(anchor: EntitySpatialAnchor): EntitySpatialAnchor {
  return Object.freeze(anchor);
}

export class SpatialAnchorIndex {
  readonly #places = new Map<PlaceId, SpatialPlaceRecord>();
  readonly #relationships = new Map<RelationshipId, CanonicalRelationship>();
  readonly #occurrenceAnchors = new Map<RelationshipId, SpatialAnchor>();
  readonly #entityAnchors = new Map<EntityId, readonly EntitySpatialAnchor[]>();

  constructor(
    places: readonly SpatialPlaceRecord[],
    relationships: readonly CanonicalRelationship[],
  ) {
    for (const place of places) {
      if (this.#places.has(place.id)) {
        throw new Error(`Duplicate place ID: ${String(place.id)}`);
      }
      this.#places.set(place.id, place);
    }

    const mutableEntityAnchors = new Map<EntityId, EntitySpatialAnchor[]>();

    for (const relationship of relationships) {
      if (this.#relationships.has(relationship.id)) {
        throw new Error(`Duplicate relationship ID: ${String(relationship.id)}`);
      }
      this.#relationships.set(relationship.id, relationship);

      if (!relationship.placeId) continue;
      const place = this.#places.get(relationship.placeId);
      if (!place) {
        throw new Error(
          `Relationship ${String(relationship.id)} references unknown place ${String(relationship.placeId)}.`,
        );
      }

      const anchor = anchorFromPlace(place);
      this.#occurrenceAnchors.set(relationship.id, anchor);

      const subjectAnchor = freezeEntityAnchor({
        entityId: relationship.subjectId,
        occurrenceId: relationship.id,
        role: "subject",
        anchor,
      });
      const objectAnchor = freezeEntityAnchor({
        entityId: relationship.objectId,
        occurrenceId: relationship.id,
        role: "object",
        anchor,
      });

      mutableEntityAnchors.set(relationship.subjectId, [
        ...(mutableEntityAnchors.get(relationship.subjectId) ?? []),
        subjectAnchor,
      ]);
      mutableEntityAnchors.set(relationship.objectId, [
        ...(mutableEntityAnchors.get(relationship.objectId) ?? []),
        objectAnchor,
      ]);
    }

    for (const [entityId, anchors] of mutableEntityAnchors) {
      this.#entityAnchors.set(
        entityId,
        Object.freeze(
          [...anchors].sort(
            (left, right) =>
              String(left.occurrenceId).localeCompare(String(right.occurrenceId)) ||
              left.role.localeCompare(right.role),
          ),
        ),
      );
    }
  }

  place(id: PlaceId): SpatialPlaceRecord | undefined {
    return this.#places.get(id);
  }

  anchorForOccurrence(id: RelationshipId): SpatialAnchor | undefined {
    return this.#occurrenceAnchors.get(id);
  }

  anchorsForEntity(id: EntityId): readonly EntitySpatialAnchor[] {
    return this.#entityAnchors.get(id) ?? Object.freeze([]);
  }

  constraintsForOccurrences(
    occurrenceIds: readonly RelationshipId[],
  ): readonly WorldLayoutConstraint[] {
    const constraints: WorldLayoutConstraint[] = [];

    for (const occurrenceId of [...new Set(occurrenceIds)].sort((left, right) =>
      String(left).localeCompare(String(right)),
    )) {
      const relationship = this.#relationships.get(occurrenceId);
      if (!relationship) {
        throw new Error(`Unknown occurrence ID: ${String(occurrenceId)}`);
      }

      const anchor = this.#occurrenceAnchors.get(occurrenceId);
      if (!anchor) continue;

      constraints.push(
        Object.freeze({
          canonicalId: relationship.subjectId,
          occurrenceId,
          spatialAnchors: Object.freeze([anchor]),
        }),
        Object.freeze({
          canonicalId: relationship.objectId,
          occurrenceId,
          spatialAnchors: Object.freeze([anchor]),
        }),
      );
    }

    return Object.freeze(
      constraints.sort(
        (left, right) =>
          String(left.occurrenceId).localeCompare(String(right.occurrenceId)) ||
          String(left.canonicalId).localeCompare(String(right.canonicalId)),
      ),
    );
  }
}
