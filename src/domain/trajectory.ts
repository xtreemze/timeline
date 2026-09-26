import type {
  EntityId,
  SourceArtifactId,
  SourceId,
  TrajectoryId,
} from "./ids.ts";
import type { CanonicalTemporalExtent } from "./relationship.ts";
import type { ExternalSemanticMapping } from "./semantics.ts";
import { validateExternalSemanticMappings } from "./semantics.ts";

export interface TrajectoryBounds {
  readonly minLongitude: number;
  readonly minLatitude: number;
  readonly maxLongitude: number;
  readonly maxLatitude: number;
  readonly minElevationMeters?: number;
  readonly maxElevationMeters?: number;
}

export interface TrajectoryChannel {
  readonly id: string;
  readonly unit?: string;
  readonly semantic?: string;
}

export interface TrajectoryLevel {
  readonly id: string;
  readonly pointCount: number;
  readonly toleranceMeters?: number;
  readonly storageRef?: string;
}

export interface TrajectoryStorageReference {
  readonly kind: "source-artifact" | "project-blob" | "indexeddb" | "external";
  readonly ref: string;
  readonly mediaType?: string;
  readonly encoding?: string;
}

export interface TrajectoryArtifact {
  readonly id: TrajectoryId;
  readonly sourceIds: readonly SourceId[];
  readonly sourceArtifactIds?: readonly SourceArtifactId[];
  readonly observedEntityIds?: readonly EntityId[];
  readonly sampleCount: number;
  readonly time: CanonicalTemporalExtent | null;
  readonly bounds: TrajectoryBounds | null;
  readonly channels: readonly TrajectoryChannel[];
  readonly levels: readonly TrajectoryLevel[];
  readonly storage: TrajectoryStorageReference;
  readonly externalMappings?: readonly ExternalSemanticMapping[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

const DENSE_SAMPLE_KEYS = new Set([
  "samples",
  "points",
  "coordinates",
  "positions",
  "vertices",
  "trackpoints",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateTrajectoryArtifact(
  trajectory: TrajectoryArtifact,
  entityIds?: ReadonlySet<string>,
): string[] {
  const findings: string[] = [];

  if (!String(trajectory.id).trim()) {
    findings.push("Trajectory ID must be a non-empty canonical identifier.");
  }
  if (!Number.isSafeInteger(trajectory.sampleCount) || trajectory.sampleCount < 0) {
    findings.push("Trajectory sampleCount must be a non-negative safe integer.");
  }
  if (!text(trajectory.storage.ref)) {
    findings.push("Trajectory storage reference must be non-empty.");
  }

  if (trajectory.bounds) {
    const b = trajectory.bounds;
    if (
      !finite(b.minLongitude) ||
      !finite(b.maxLongitude) ||
      !finite(b.minLatitude) ||
      !finite(b.maxLatitude) ||
      b.minLongitude < -180 ||
      b.maxLongitude > 180 ||
      b.minLatitude < -90 ||
      b.maxLatitude > 90 ||
      b.minLongitude > b.maxLongitude ||
      b.minLatitude > b.maxLatitude
    ) {
      findings.push("Trajectory bounds must be finite ordered WGS84 longitude/latitude ranges.");
    }
    if (
      b.minElevationMeters !== undefined &&
      b.maxElevationMeters !== undefined &&
      b.minElevationMeters > b.maxElevationMeters
    ) {
      findings.push("Trajectory elevation bounds must be ordered.");
    }
  }

  const channelIds = new Set<string>();
  for (const channel of trajectory.channels) {
    const id = text(channel.id);
    if (!id) {
      findings.push("Trajectory channels require non-empty IDs.");
      continue;
    }
    if (channelIds.has(id)) {
      findings.push(`Trajectory channel ${id} is duplicated.`);
    }
    channelIds.add(id);
  }

  const levelIds = new Set<string>();
  for (const level of trajectory.levels) {
    const id = text(level.id);
    if (!id) {
      findings.push("Trajectory levels require non-empty IDs.");
      continue;
    }
    if (levelIds.has(id)) {
      findings.push(`Trajectory level ${id} is duplicated.`);
    }
    levelIds.add(id);
    if (!Number.isSafeInteger(level.pointCount) || level.pointCount < 0) {
      findings.push(`Trajectory level ${id} pointCount must be a non-negative safe integer.`);
    }
    if (level.pointCount > trajectory.sampleCount) {
      findings.push(`Trajectory level ${id} cannot contain more points than the raw sample count.`);
    }
    if (
      level.toleranceMeters !== undefined &&
      (!finite(level.toleranceMeters) || level.toleranceMeters < 0)
    ) {
      findings.push(`Trajectory level ${id} toleranceMeters must be non-negative.`);
    }
  }

  for (const entityId of trajectory.observedEntityIds ?? []) {
    if (entityIds && !entityIds.has(String(entityId))) {
      findings.push(`Trajectory observed entity ${String(entityId)} does not resolve.`);
    }
  }

  for (const key of Object.keys(trajectory.attributes)) {
    if (DENSE_SAMPLE_KEYS.has(key.trim().toLocaleLowerCase())) {
      findings.push(
        `Trajectory attribute "${key}" must not contain dense samples; store samples in the referenced trajectory storage.`,
      );
    }
  }

  findings.push(...validateExternalSemanticMappings(trajectory.externalMappings));
  return findings;
}
