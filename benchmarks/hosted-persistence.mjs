import { performance } from "node:perf_hooks";

import { createSemanticGraphIndex } from "../src/application/semantic-graph-index.ts";

const parsedSize = Number.parseInt(process.argv.find((value) => /^\d+$/.test(value)) ?? "", 10);
const nodeCount = Number.isInteger(parsedSize) && parsedSize > 1 ? parsedSize : 1000;
const edgeFactor = 2;
const emitFixture = process.argv.includes("--emit-fixture");

const predicates = ["called", "warned", "authorized", "supplied", "transferred"];
const places = Array.from({ length: 12 }, (_, index) => `place-${index}`);

function instant(index) {
  const day = 1 + (index % 27);
  return {
    type: "instant",
    start: {
      iso: `2026-09-${String(day).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00Z`,
      precision: "hour",
    },
  };
}

function createFixture(size) {
  const entities = Array.from({ length: size }, (_, index) => ({
    id: `entity-${index}`,
    type: index % 11 === 0 ? "organization" : index % 7 === 0 ? "device" : "person",
    name: `Entity ${index}`,
    alternateNames: [],
    sourceIds: [],
    attributes: { fixture: true, index },
  }));

  const relationships = Array.from({ length: size * edgeFactor }, (_, index) => {
    const subjectIndex = index % size;
    const stride = 1 + ((index * 17) % (size - 1));
    const objectIndex = (subjectIndex + stride) % size;
    return {
      id: `relationship-${index}`,
      subjectId: `entity-${subjectIndex}`,
      objectId: `entity-${objectIndex}`,
      predicate: predicates[index % predicates.length],
      placeId: places[index % places.length],
      itemIds: [],
      sourceIds: [],
      confidence: index % 9 === 0 ? null : 0.5 + (index % 5) / 10,
      time: instant(index),
      attributes: { fixture: true, index },
    };
  });

  return {
    schemaVersion: 3,
    entities,
    relationships,
  };
}

function sample(label, fn, iterations = 5) {
  fn();
  const values = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    fn();
    values.push(performance.now() - started);
  }
  values.sort((left, right) => left - right);
  const p50 = values[Math.floor(values.length * 0.5)] ?? 0;
  const p95 = values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)] ?? 0;
  return {
    id: label,
    iterations,
    p50Ms: Number(p50.toFixed(3)),
    p95Ms: Number(p95.toFixed(3)),
  };
}

const fixture = createFixture(nodeCount);
const serializedFixture = JSON.stringify(fixture);
const build = sample("client-hydrate-semantic-index", () => {
  const index = createSemanticGraphIndex(fixture);
  if (!index.entity("entity-0")) throw new Error("Semantic index did not hydrate entity-0.");
});

const index = createSemanticGraphIndex(fixture);
const neighborhoods = [1, 2, 3, 4, 5].map((depth) =>
  sample(`client-neighborhood-${depth}-hop`, () => {
    const result = index.neighborhood("entity-0", { depth, limit: 512 });
    if (!result.entityIds.includes("entity-0")) {
      throw new Error(`Neighborhood depth ${depth} lost the root entity.`);
    }
  }),
);

const temporalPlace = sample("client-relationship-filter-time-place", () => {
  const matches = fixture.relationships.filter((relationship) => {
    const iso = relationship.time?.start?.iso ?? "";
    return relationship.placeId === "place-0" && iso >= "2026-09-15T00:00:00Z";
  });
  if (matches.length === 0) {
    throw new Error("Temporal/place filter baseline returned no relationships.");
  }
});

const components = sample("client-connected-components", () => {
  const result = index.connectedComponents();
  const covered = result.reduce((total, component) => total + component.length, 0);
  if (covered !== fixture.entities.length) {
    throw new Error("Connected-components baseline did not cover the corpus.");
  }
});

const workloadManifest = [
  "repository-save-cas",
  "repository-load-current",
  "repository-recover-checkpoint",
  "client-hydrate-semantic-index",
  "graph-neighborhood-1-hop",
  "graph-neighborhood-2-hop",
  "graph-neighborhood-3-hop",
  "graph-neighborhood-4-hop",
  "graph-neighborhood-5-hop",
  "relationship-filter-time-place",
  "graph-connected-components",
  "replace-update-latency",
  "storage-footprint",
];

const report = {
  benchmark: "lum-hosted-persistence-corpus",
  runtime: process.version,
  corpus: {
    generator: "deterministic-v1",
    schemaVersion: fixture.schemaVersion,
    entities: fixture.entities.length,
    relationships: fixture.relationships.length,
    distinctPlaces: places.length,
    temporalCoverage: "2026-09 synthetic hourly instants",
    serializedJsonBytes: Buffer.byteLength(serializedFixture, "utf8"),
  },
  workloadManifest,
  localBaseline: [build, ...neighborhoods, temporalPlace, components],
  ...(emitFixture ? { fixture } : {}),
};

// biome-ignore lint/suspicious/noConsole: benchmark emits machine-readable JSON for CI/live-provider runners
console.log(JSON.stringify(report, null, 2));
