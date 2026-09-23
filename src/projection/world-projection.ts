import type { EntityId, PlaceId, RelationshipId } from "../domain/ids.ts";

export type WorldInstanceId = string & { readonly __worldInstanceId: unique symbol };

export interface SpatialAnchor {
  readonly placeId: PlaceId;
  readonly longitude: number;
  readonly latitude: number;
  readonly sourceAltitude?: number;
  readonly certainty?: number;
  readonly precisionRadiusMeters?: number;
  readonly influence: number;
}

export interface WorldLocalOffset {
  readonly eastMeters: number;
  readonly northMeters: number;
}

export interface ProjectedWorldInstance {
  readonly id: WorldInstanceId;
  readonly canonicalId: EntityId;
  readonly occurrenceId?: RelationshipId;
  readonly geographicAnchors: readonly SpatialAnchor[];
  readonly temporalWeight: number;
  readonly visualWeight: number;
  readonly retained: boolean;
  readonly visualAltitude?: number;
  readonly localOffset?: WorldLocalOffset;
}

export interface ProjectedWorldEdge {
  readonly id: RelationshipId;
  readonly sourceInstanceId: WorldInstanceId;
  readonly targetInstanceId: WorldInstanceId;
  readonly temporalWeight: number;
  readonly visible: boolean;
  readonly retained: boolean;
}

export interface WorldProjection {
  readonly instances: readonly ProjectedWorldInstance[];
  readonly edges: readonly ProjectedWorldEdge[];
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function unitInterval(value: number, label: string): number {
  const normalized = finite(value, label);
  if (normalized < 0 || normalized > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
  return normalized;
}

function nonNegative(value: number, label: string): number {
  const normalized = finite(value, label);
  if (normalized < 0) throw new Error(`${label} must be non-negative.`);
  return normalized;
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be non-empty.`);
  return normalized;
}

export function worldInstanceId(
  canonicalId: EntityId,
  occurrenceId?: RelationshipId,
): WorldInstanceId {
  return JSON.stringify([
    nonEmpty(canonicalId, "Canonical entity ID"),
    occurrenceId === undefined ? null : nonEmpty(occurrenceId, "Occurrence ID"),
  ]) as WorldInstanceId;
}

export function createSpatialAnchor(anchor: SpatialAnchor): SpatialAnchor {
  const longitude = finite(anchor.longitude, "Longitude");
  const latitude = finite(anchor.latitude, "Latitude");
  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  const sourceAltitude =
    anchor.sourceAltitude === undefined
      ? undefined
      : finite(anchor.sourceAltitude, "Source altitude");
  const certainty =
    anchor.certainty === undefined ? undefined : unitInterval(anchor.certainty, "Certainty");
  const precisionRadiusMeters =
    anchor.precisionRadiusMeters === undefined
      ? undefined
      : nonNegative(anchor.precisionRadiusMeters, "Precision radius");

  return Object.freeze({
    placeId: nonEmpty(anchor.placeId, "Place ID") as PlaceId,
    longitude,
    latitude,
    influence: unitInterval(anchor.influence, "Anchor influence"),
    ...(sourceAltitude === undefined ? {} : { sourceAltitude }),
    ...(certainty === undefined ? {} : { certainty }),
    ...(precisionRadiusMeters === undefined ? {} : { precisionRadiusMeters }),
  });
}

export function createProjectedWorldInstance(
  instance: Omit<ProjectedWorldInstance, "id"> & { readonly id?: WorldInstanceId },
): ProjectedWorldInstance {
  const canonicalId = nonEmpty(instance.canonicalId, "Canonical entity ID") as EntityId;
  const occurrenceId =
    instance.occurrenceId === undefined
      ? undefined
      : (nonEmpty(instance.occurrenceId, "Occurrence ID") as RelationshipId);
  const id = instance.id ?? worldInstanceId(canonicalId, occurrenceId);

  const localOffset = instance.localOffset
    ? Object.freeze({
        eastMeters: finite(instance.localOffset.eastMeters, "Local east offset"),
        northMeters: finite(instance.localOffset.northMeters, "Local north offset"),
      })
    : undefined;

  const visualAltitude =
    instance.visualAltitude === undefined
      ? undefined
      : nonNegative(instance.visualAltitude, "Visual altitude");

  return Object.freeze({
    id: nonEmpty(id, "World instance ID") as WorldInstanceId,
    canonicalId,
    ...(occurrenceId === undefined ? {} : { occurrenceId }),
    geographicAnchors: Object.freeze(instance.geographicAnchors.map(createSpatialAnchor)),
    temporalWeight: unitInterval(instance.temporalWeight, "Temporal weight"),
    visualWeight: unitInterval(instance.visualWeight, "Visual weight"),
    retained: Boolean(instance.retained),
    ...(visualAltitude === undefined ? {} : { visualAltitude }),
    ...(localOffset === undefined ? {} : { localOffset }),
  });
}

export function createProjectedWorldEdge(edge: ProjectedWorldEdge): ProjectedWorldEdge {
  return Object.freeze({
    id: nonEmpty(edge.id, "Relationship ID") as RelationshipId,
    sourceInstanceId: nonEmpty(edge.sourceInstanceId, "Source world instance ID") as WorldInstanceId,
    targetInstanceId: nonEmpty(edge.targetInstanceId, "Target world instance ID") as WorldInstanceId,
    temporalWeight: unitInterval(edge.temporalWeight, "Edge temporal weight"),
    visible: Boolean(edge.visible),
    retained: Boolean(edge.retained),
  });
}

export function createWorldProjection(projection: WorldProjection): WorldProjection {
  const instances = projection.instances
    .map(createProjectedWorldInstance)
    .sort((left, right) => left.id.localeCompare(right.id));

  const instanceIds = new Set<WorldInstanceId>();
  for (const instance of instances) {
    if (instanceIds.has(instance.id)) {
      throw new Error(`Duplicate world instance ID: ${instance.id}`);
    }
    instanceIds.add(instance.id);
  }

  const edges = projection.edges
    .map(createProjectedWorldEdge)
    .sort(
      (left, right) =>
        left.id.localeCompare(right.id) ||
        left.sourceInstanceId.localeCompare(right.sourceInstanceId) ||
        left.targetInstanceId.localeCompare(right.targetInstanceId),
    );

  for (const edge of edges) {
    if (!instanceIds.has(edge.sourceInstanceId)) {
      throw new Error(`World edge ${edge.id} references missing source instance.`);
    }
    if (!instanceIds.has(edge.targetInstanceId)) {
      throw new Error(`World edge ${edge.id} references missing target instance.`);
    }
  }

  return Object.freeze({
    instances: Object.freeze(instances),
    edges: Object.freeze(edges),
  });
}
