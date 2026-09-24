import type { EntityId, PlaceId, RelationshipId } from "../domain/ids.ts";

export type WorldInstanceId = string & { readonly __worldInstanceId: unique symbol };

export interface SpatialAnchor {
  readonly placeId: PlaceId;
  readonly label?: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly sourceAltitude?: number;
  readonly certainty?: number;
  readonly precisionRadiusMeters?: number;
  readonly influence: number;
  /** The place's own presentation style (e.g. map marker), passed through. */
  readonly style?: WorldPresentationStyle;
}

/** Opaque, frozen presentation style carried from the model to renderers. */
export type WorldPresentationStyle = Readonly<Record<string, unknown>>;

function presentationStyle(value: unknown): WorldPresentationStyle | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return Object.freeze({ ...(value as Record<string, unknown>) });
}

export interface WorldLocalOffset {
  readonly eastMeters: number;
  readonly northMeters: number;
}

export interface ProjectedWorldInstance {
  readonly id: WorldInstanceId;
  readonly canonicalId: EntityId;
  readonly label?: string;
  readonly kind?: string;
  readonly occurrenceId?: RelationshipId;
  readonly geographicAnchors: readonly SpatialAnchor[];
  readonly temporalWeight: number;
  readonly visualWeight: number;
  readonly retained: boolean;
  readonly visualAltitude?: number;
  readonly localOffset?: WorldLocalOffset;
  /** The entity's own presentation style (`attributes.style`). */
  readonly style?: WorldPresentationStyle;
}

export interface ProjectedWorldEdge {
  readonly id: RelationshipId;
  readonly label?: string;
  readonly sourceInstanceId: WorldInstanceId;
  readonly targetInstanceId: WorldInstanceId;
  readonly temporalWeight: number;
  readonly visible: boolean;
  readonly retained: boolean;
  /** The relationship's own presentation style (`attributes.style`). */
  readonly style?: WorldPresentationStyle;
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

function optionalText(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().slice(0, max);
  return normalized || undefined;
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
  const label = optionalText(anchor.label, 180);

  const style = presentationStyle(anchor.style);
  return Object.freeze({
    placeId: nonEmpty(anchor.placeId, "Place ID") as PlaceId,
    ...(label === undefined ? {} : { label }),
    ...(style === undefined ? {} : { style }),
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
  const label = optionalText(instance.label, 180);
  const kind = optionalText(instance.kind, 80);
  const instanceStyle = presentationStyle(instance.style);

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
    ...(label === undefined ? {} : { label }),
    ...(instanceStyle === undefined ? {} : { style: instanceStyle }),
    ...(kind === undefined ? {} : { kind }),
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
  const label = optionalText(edge.label, 120);
  const style = presentationStyle(edge.style);
  return Object.freeze({
    id: nonEmpty(edge.id, "Relationship ID") as RelationshipId,
    ...(label === undefined ? {} : { label }),
    ...(style === undefined ? {} : { style }),
    sourceInstanceId: nonEmpty(
      edge.sourceInstanceId,
      "Source world instance ID",
    ) as WorldInstanceId,
    targetInstanceId: nonEmpty(
      edge.targetInstanceId,
      "Target world instance ID",
    ) as WorldInstanceId,
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
