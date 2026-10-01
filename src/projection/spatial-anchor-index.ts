import type { CanonicalSpatialGeometry, GeoPosition } from "../domain/geotemporal.ts";
import type { CanonicalOccurrenceId, EntityId, OccurrenceId, PlaceId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalOccurrence } from "../domain/occurrence.ts";
import { occurrenceParticipantEntityIds } from "../domain/occurrence.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import { createSpatialAnchor, type SpatialAnchor } from "./world-projection.ts";

export interface SpatialPlaceRecord {
  readonly id: PlaceId;
  readonly label?: string;
  readonly geometry: CanonicalSpatialGeometry;
  readonly certainty?: number;
  readonly precisionRadiusMeters?: number;
  readonly sourceAltitude?: number;
  readonly style?: Readonly<Record<string, unknown>>;
}

export interface EntitySpatialAnchor {
  readonly entityId: EntityId;
  readonly occurrenceId: CanonicalOccurrenceId;
  readonly role: "subject" | "object" | "participant";
  readonly anchor: SpatialAnchor;
}

export interface WorldLayoutConstraint {
  readonly canonicalId: EntityId;
  readonly occurrenceId: CanonicalOccurrenceId;
  readonly spatialAnchors: readonly SpatialAnchor[];
}

function positionsFromGeometry(geometry: CanonicalSpatialGeometry): readonly GeoPosition[] {
  if (geometry.type === "Point") {
    return Object.freeze([geometry.coordinates]);
  }
  if (geometry.type === "LineString") {
    return Object.freeze([...geometry.coordinates]);
  }
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
  if (value >= -180 && value <= 180) {
    return Object.is(value, -0) ? 0 : value;
  }
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
  if (positions.length === 0) {
    throw new Error("Spatial geometry must contain at least one position.");
  }

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
    if (!first) {
      throw new Error("Spatial geometry must contain at least one position.");
    }
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
    ...(place.label ? { label: place.label } : {}),
    longitude,
    latitude,
    influence: 1,
    ...(place.certainty === undefined ? {} : { certainty: place.certainty }),
    ...(place.precisionRadiusMeters === undefined
      ? {}
      : { precisionRadiusMeters: place.precisionRadiusMeters }),
    ...(place.sourceAltitude === undefined ? {} : { sourceAltitude: place.sourceAltitude }),
    ...(place.style === undefined ? {} : { style: place.style }),
  });
}

function freezeEntityAnchor(anchor: EntitySpatialAnchor): EntitySpatialAnchor {
  return Object.freeze(anchor);
}

export class SpatialAnchorIndex {
  readonly #places = new Map<PlaceId, SpatialPlaceRecord>();
  readonly #relationships = new Map<RelationshipId, CanonicalRelationship>();
  readonly #occurrences = new Map<OccurrenceId, CanonicalOccurrence>();
  readonly #occurrenceAnchors = new Map<CanonicalOccurrenceId, SpatialAnchor>();
  readonly #occurrenceEntityIds = new Map<CanonicalOccurrenceId, readonly EntityId[]>();
  readonly #entityAnchors = new Map<EntityId, readonly EntitySpatialAnchor[]>();

  constructor(
    places: readonly SpatialPlaceRecord[],
    relationships: readonly CanonicalRelationship[],
    occurrences: readonly CanonicalOccurrence[] = [],
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
      this.#occurrenceEntityIds.set(
        relationship.id,
        Object.freeze([relationship.subjectId, relationship.objectId]),
      );

      if (!relationship.placeId) {
        continue;
      }
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

    for (const occurrence of occurrences) {
      if (this.#occurrences.has(occurrence.id)) {
        throw new Error(`Duplicate occurrence ID: ${String(occurrence.id)}`);
      }
      if (this.#relationships.has(occurrence.id as unknown as RelationshipId)) {
        throw new Error(`Occurrence ID collides with relationship ID: ${String(occurrence.id)}`);
      }
      this.#occurrences.set(occurrence.id, occurrence);

      const entityIds = occurrenceParticipantEntityIds(occurrence, relationships);
      this.#occurrenceEntityIds.set(occurrence.id, entityIds);

      const childPlaceIds = [
        ...new Set(
          occurrence.relationshipIds
            .map((id) => this.#relationships.get(id)?.placeId)
            .filter((id): id is PlaceId => id !== undefined),
        ),
      ];
      const effectivePlaceId =
        occurrence.placeId ??
        (childPlaceIds.length === 1 ? childPlaceIds[0] : undefined);
      if (!effectivePlaceId) continue;

      const place = this.#places.get(effectivePlaceId);
      if (!place) {
        throw new Error(
          `Occurrence ${String(occurrence.id)} references unknown place ${String(effectivePlaceId)}.`,
        );
      }

      const anchor = anchorFromPlace(place);
      this.#occurrenceAnchors.set(occurrence.id, anchor);
      for (const entity of entityIds) {
        const participantAnchor = freezeEntityAnchor({
          entityId: entity,
          occurrenceId: occurrence.id,
          role: "participant",
          anchor,
        });
        mutableEntityAnchors.set(entity, [
          ...(mutableEntityAnchors.get(entity) ?? []),
          participantAnchor,
        ]);
      }
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

  anchorForOccurrence(id: CanonicalOccurrenceId): SpatialAnchor | undefined {
    return this.#occurrenceAnchors.get(id);
  }

  anchorsForEntity(id: EntityId): readonly EntitySpatialAnchor[] {
    return this.#entityAnchors.get(id) ?? Object.freeze([]);
  }

  constraintsForOccurrences(
    occurrenceIds: readonly CanonicalOccurrenceId[],
  ): readonly WorldLayoutConstraint[] {
    const constraints: WorldLayoutConstraint[] = [];

    for (const occurrenceId of [...new Set(occurrenceIds)].sort((left, right) =>
      String(left).localeCompare(String(right)),
    )) {
      const entityIds = this.#occurrenceEntityIds.get(occurrenceId);
      if (!entityIds) {
        throw new Error(`Unknown occurrence ID: ${String(occurrenceId)}`);
      }

      const anchor = this.#occurrenceAnchors.get(occurrenceId);
      if (!anchor) continue;

      for (const canonicalId of entityIds) {
        constraints.push(
          Object.freeze({
            canonicalId,
            occurrenceId,
            spatialAnchors: Object.freeze([anchor]),
          }),
        );
      }
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
