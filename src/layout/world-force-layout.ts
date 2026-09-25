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

function instanceIndex(
  instances: readonly ProjectedWorldInstance[],
  instanceId: WorldInstanceId,
): number {
  let low = 0;
  let high = instances.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const current = instances[middle];
    if (!current) break;
    const comparison = current.id.localeCompare(instanceId);
    if (comparison === 0) return middle;
    if (comparison < 0) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

export function updateWorldForceLayoutInstance(
  instance: ProjectedWorldInstance,
  sample: WorldForceLayoutSample,
): ProjectedWorldInstance {
  if (instance.id !== sample.instanceId) {
    throw new Error(
      `World force layout sample references unknown instance ${String(sample.instanceId)}.`,
    );
  }

  const eastMeters = finite(sample.eastMeters, "World force east offset");
  const northMeters = finite(sample.northMeters, "World force north offset");
  const visualAltitudeMeters = nonNegative(
    sample.visualAltitudeMeters,
    "World force visual altitude",
  );

  if (
    instance.localOffset?.eastMeters === eastMeters &&
    instance.localOffset?.northMeters === northMeters &&
    instance.visualAltitude === visualAltitudeMeters
  ) {
    return instance;
  }

  return Object.freeze({
    ...instance,
    localOffset: Object.freeze({ eastMeters, northMeters }),
    visualAltitude: visualAltitudeMeters,
  });
}

export function applyWorldForceLayoutUpdate(
  projection: WorldProjection,
  samples: readonly WorldForceLayoutSample[],
): WorldForceLayoutUpdate {
  if (samples.length === 0) {
    return Object.freeze({
      projection,
      updatedInstances: Object.freeze([]),
    });
  }

  const seen = new Set<WorldInstanceId>();
  const replacements: Array<{ index: number; value: ProjectedWorldInstance }> = [];

  for (const sample of samples) {
    if (seen.has(sample.instanceId)) {
      throw new Error(`Duplicate world force layout sample for ${String(sample.instanceId)}.`);
    }
    seen.add(sample.instanceId);

    const index = instanceIndex(projection.instances, sample.instanceId);
    if (index < 0) {
      throw new Error(
        `World force layout sample references unknown instance ${String(sample.instanceId)}.`,
      );
    }

    const instance = projection.instances[index];
    if (!instance) continue;
    const value = updateWorldForceLayoutInstance(instance, sample);
    if (value === instance) continue;

    replacements.push({ index, value });
  }

  if (replacements.length === 0) {
    return Object.freeze({
      projection,
      updatedInstances: Object.freeze([]),
    });
  }

  replacements.sort((left, right) => left.index - right.index);
  const instances = [...projection.instances];
  for (const replacement of replacements) instances[replacement.index] = replacement.value;

  return Object.freeze({
    projection: Object.freeze({
      instances: Object.freeze(instances),
      edges: projection.edges,
    }),
    updatedInstances: Object.freeze(replacements.map((replacement) => replacement.value)),
  });
}

export function applyWorldForceLayout(
  projection: WorldProjection,
  samples: readonly WorldForceLayoutSample[],
): WorldProjection {
  return applyWorldForceLayoutUpdate(projection, samples).projection;
}
