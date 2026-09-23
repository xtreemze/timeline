import type { WorldInstanceId, WorldProjection } from "../projection/world-projection.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
} from "../projection/world-projection.ts";

export interface WorldForceLayoutSample {
  readonly instanceId: WorldInstanceId;
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function nonNegative(value: number, label: string): number {
  const result = finite(value, label);
  if (result < 0) throw new Error(`${label} must be non-negative.`);
  return result;
}

export function applyWorldForceLayout(
  projection: WorldProjection,
  samples: readonly WorldForceLayoutSample[],
): WorldProjection {
  const knownIds = new Set(projection.instances.map((instance) => instance.id));
  const byId = new Map<WorldInstanceId, WorldForceLayoutSample>();

  for (const sample of samples) {
    if (!knownIds.has(sample.instanceId)) {
      throw new Error(
        `World force layout sample references unknown instance ${String(sample.instanceId)}.`,
      );
    }
    if (byId.has(sample.instanceId)) {
      throw new Error(`Duplicate world force layout sample for ${String(sample.instanceId)}.`);
    }

    byId.set(
      sample.instanceId,
      Object.freeze({
        instanceId: sample.instanceId,
        eastMeters: finite(sample.eastMeters, "World force east offset"),
        northMeters: finite(sample.northMeters, "World force north offset"),
        visualAltitudeMeters: nonNegative(
          sample.visualAltitudeMeters,
          "World force visual altitude",
        ),
      }),
    );
  }

  return createWorldProjection({
    instances: projection.instances.map((instance) => {
      const sample = byId.get(instance.id);
      if (!sample) return instance;

      return createProjectedWorldInstance({
        ...instance,
        localOffset: {
          eastMeters: sample.eastMeters,
          northMeters: sample.northMeters,
        },
        visualAltitude: sample.visualAltitudeMeters,
      });
    }),
    edges: projection.edges,
  });
}
