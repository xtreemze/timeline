/**
 * Deterministic synthetic WorldProjection fixture generator for the issue
 * #445 Priority 7 performance certification harness. Reuses the same
 * validating constructors production code uses (createWorldProjection /
 * createProjectedWorldInstance / createProjectedWorldEdge) so the generated
 * fixtures are guaranteed to be structurally identical to real projections,
 * not a hand-rolled shortcut.
 *
 * Seeded PRNG (mulberry32) keeps fixture generation deterministic across
 * runs so certification numbers are comparable run-to-run.
 */
import {
  createWorldProjection,
  createProjectedWorldInstance,
  createProjectedWorldEdge,
} from "../src/projection/world-projection.ts";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic WorldProjection with `entityCount` entities
 * distributed across `placeCount` places, plus a comparable number of
 * relationship edges linking sequential entities so the fixture exercises
 * both the scatterplot and path-layer rendering paths.
 */
export function generateWorldProjectionFixture({
  entityCount,
  placeCount = Math.max(8, Math.floor(entityCount / 25)),
  seed = 445,
}) {
  const rand = mulberry32(seed);
  const places = Array.from({ length: placeCount }, (_, i) => ({
    placeId: `place-${i}`,
    longitude: rand() * 340 - 170,
    latitude: rand() * 150 - 75,
  }));

  const instances = [];
  for (let i = 0; i < entityCount; i++) {
    const place = places[i % places.length];
    instances.push(
      createProjectedWorldInstance({
        canonicalId: `entity-${i}`,
        geographicAnchors: [
          {
            placeId: place.placeId,
            longitude: place.longitude + (rand() - 0.5) * 2,
            latitude: place.latitude + (rand() - 0.5) * 2,
            influence: 1,
          },
        ],
        temporalWeight: rand(),
        visualWeight: rand(),
        retained: rand() > 0.5,
      }),
    );
  }

  const edges = [];
  const edgeCount = Math.floor(entityCount * 0.6);
  for (let i = 0; i < edgeCount; i++) {
    const source = instances[i % instances.length];
    const target = instances[(i * 7 + 3) % instances.length];
    if (source.id === target.id) continue;
    edges.push(
      createProjectedWorldEdge({
        id: `rel-${i}`,
        sourceInstanceId: source.id,
        targetInstanceId: target.id,
        temporalWeight: rand(),
        visible: true,
        retained: rand() > 0.5,
      }),
    );
  }

  return createWorldProjection({ instances, edges });
}

/** A small-delta variant of a base fixture: toggles selection-relevant
 * weights on a handful of instances so a `setProjection` call against it
 * measures the Priority 3 incremental-memoization path rather than a full
 * fixture swap. */
export function generateSmallDeltaFixture(base, changedCount = 25) {
  const changed = new Set(
    base.instances.slice(0, changedCount).map((instance) => instance.id),
  );
  const instances = base.instances.map((instance) =>
    changed.has(instance.id)
      ? createProjectedWorldInstance({
          ...instance,
          visualWeight: Math.min(1, instance.visualWeight + 0.01),
        })
      : instance,
  );
  return createWorldProjection({ instances, edges: base.edges });
}
