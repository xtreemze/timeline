import type {
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldProjection,
} from "../projection/world-projection.ts";

export interface WorldForceLayoutSample {
  readonly instanceId: WorldInstanceId;
  readonly eastMeters: number;
  readonly northMeters: number;
  readonly visualAltitudeMeters: number;
}

export interface WorldForceLayoutUpdate {
  readonly projection: WorldProjection;
  readonly updatedInstances: readonly ProjectedWorldInstance[];
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

export function applyWorldForceLayoutUpdate(
  projection: WorldProjection,
  samples: readonly WorldForceLayoutSample[],
): WorldForceLayoutUpdate {
  const byId = new Map<WorldInstanceId, WorldForceLayoutSample>();

  for (const sample of samples) {
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

  if (byId.size === 0) {
    return Object.freeze({
      projection,
      updatedInstances: Object.freeze([]),
    });
  }

  const matchedIds = new Set<WorldInstanceId>();
  const updatedInstances: ProjectedWorldInstance[] = [];
  const instances = projection.instances.map((instance) => {
    const sample = byId.get(instance.id);
    if (!sample) return instance;
    matchedIds.add(instance.id);

    if (
      instance.localOffset?.eastMeters === sample.eastMeters &&
      instance.localOffset?.northMeters === sample.northMeters &&
      instance.visualAltitude === sample.visualAltitudeMeters
    ) {
      return instance;
    }

    // This is a renderer-derived position update over an already validated,
    // immutable projection. Preserve static topology/presentation objects
    // instead of revalidating/cloning anchors and edges on every force frame.
    const updated = Object.freeze({
      ...instance,
      localOffset: Object.freeze({
        eastMeters: sample.eastMeters,
        northMeters: sample.northMeters,
      }),
      visualAltitude: sample.visualAltitudeMeters,
    }) as ProjectedWorldInstance;
    updatedInstances.push(updated);
    return updated;
  });

  if (matchedIds.size !== byId.size) {
    for (const instanceId of byId.keys()) {
      if (!matchedIds.has(instanceId)) {
        throw new Error(
          `World force layout sample references unknown instance ${String(instanceId)}.`,
        );
      }
    }
  }

  if (updatedInstances.length === 0) {
    return Object.freeze({
      projection,
      updatedInstances: Object.freeze([]),
    });
  }

  return Object.freeze({
    projection: Object.freeze({
      instances: Object.freeze(instances),
      edges: projection.edges,
    }),
    updatedInstances: Object.freeze(updatedInstances),
  });
}

export function applyWorldForceLayout(
  projection: WorldProjection,
  samples: readonly WorldForceLayoutSample[],
): WorldProjection {
  return applyWorldForceLayoutUpdate(projection, samples).projection;
}
