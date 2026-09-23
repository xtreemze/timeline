import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICAL_LENS_SCHEMA_VERSION,
  deleteAnalyticalLens,
  duplicateAnalyticalLens,
  evaluateAnalyticalLens,
  parseAnalyticalLens,
  replaceAnalyticalLens,
  saveAnalyticalLens,
  serializeAnalyticalLens,
  validateAnalyticalLens,
} from "../src/application/analytical-lens.ts";

const day = (value) => Date.parse(value + "T00:00:00Z");
const instant = (value) => ({
  type: "instant",
  start: { value },
});

const dataset = {
  entities: [{ id: "alice" }, { id: "bob" }, { id: "carol" }, { id: "dave" }],
  relationships: [
    {
      id: "r1",
      subjectId: "alice",
      objectId: "bob",
      predicate: "warned",
      placeId: "stockholm",
      time: instant("2026-09-20"),
    },
    {
      id: "r2",
      subjectId: "bob",
      objectId: "carol",
      predicate: "called",
      placeId: "malmo",
      time: instant("2026-09-21"),
    },
    {
      id: "r3",
      subjectId: "carol",
      objectId: "dave",
      predicate: "paid",
      placeId: "stockholm",
      time: instant("2026-09-22"),
    },
    {
      id: "r4",
      subjectId: "alice",
      objectId: "dave",
      predicate: "emailed",
      time: null,
    },
  ],
  occurrences: [
    {
      id: "o1",
      relationshipId: "r1",
      categoryId: "communication",
      placeId: "stockholm",
      entityIds: ["alice", "bob"],
      start: day("2026-09-20"),
    },
    {
      id: "o2",
      relationshipId: "r2",
      categoryId: "communication",
      placeId: "malmo",
      entityIds: ["bob", "carol"],
      start: day("2026-09-21"),
    },
    {
      id: "o3",
      relationshipId: "r3",
      categoryId: "transaction",
      placeId: "stockholm",
      entityIds: ["carol", "dave"],
      start: day("2026-09-22"),
    },
  ],
};

function lens(filters = {}) {
  return {
    schemaVersion: ANALYTICAL_LENS_SCHEMA_VERSION,
    id: "lens-a",
    name: "Test lens",
    filters,
  };
}

test("analytical lens validation rejects invalid windows and neighborhood depth", () => {
  assert.deepEqual(
    validateAnalyticalLens(
      lens({
        timeWindow: {
          start: day("2026-09-22"),
          end: day("2026-09-20"),
          untimed: "exclude",
        },
      }),
    ),
    ["Analytical lens temporal range must contain finite ordered bounds."],
  );

  assert.match(
    validateAnalyticalLens(
      lens({
        neighborhood: { seedEntityIds: ["alice"], depth: 9 },
      }),
    ).join(" "),
    /depth/i,
  );
});

test("analytical lens parser normalizes bounded persisted state and round-trips", () => {
  const parsed = parseAnalyticalLens({
    schemaVersion: 1,
    id: " lens-a ",
    name: " Two-hop communications ",
    description: "  Saved analytical state. ",
    filters: {
      relationshipPredicates: ["Called", "warned", "called"],
      neighborhood: {
        seedEntityIds: ["alice", "alice"],
        depth: 2,
      },
    },
  });

  assert.deepEqual(parsed.errors, []);
  assert.ok(parsed.lens);
  assert.deepEqual(parsed.lens.filters.relationshipPredicates, ["called", "warned"]);
  assert.deepEqual(parsed.lens.filters.neighborhood.seedEntityIds, ["alice"]);

  const roundTrip = parseAnalyticalLens(JSON.parse(serializeAnalyticalLens(parsed.lens)));
  assert.deepEqual(roundTrip, parsed);
});

test("two-hop analytical lens deterministically limits graph topology", () => {
  const result = evaluateAnalyticalLens(
    lens({
      relationshipPredicates: ["warned", "called"],
      neighborhood: {
        seedEntityIds: ["alice"],
        depth: 2,
      },
    }),
    dataset,
  );

  assert.deepEqual(result.entityIds, ["alice", "bob", "carol"]);
  assert.deepEqual(result.relationshipIds, ["r1", "r2"]);
  assert.deepEqual(result.occurrenceIds, ["o1", "o2"]);
  assert.deepEqual(result.hidden, {
    entities: 1,
    relationships: 2,
    occurrences: 1,
  });
});

test("one place and temporal window produce consistent graph/map/timeline IDs", () => {
  const result = evaluateAnalyticalLens(
    lens({
      placeIds: ["stockholm"],
      timeWindow: {
        start: day("2026-09-19"),
        end: day("2026-09-21"),
        untimed: "exclude",
      },
    }),
    dataset,
  );

  assert.deepEqual(result.entityIds, ["alice", "bob"]);
  assert.deepEqual(result.relationshipIds, ["r1"]);
  assert.deepEqual(result.occurrenceIds, ["o1"]);
});

test("evaluating a lens cannot mutate project-shaped source data", () => {
  const before = JSON.stringify(dataset);
  const result = evaluateAnalyticalLens(
    lens({
      entityIds: ["alice"],
      entityMatch: "either-endpoint",
    }),
    dataset,
  );

  assert.deepEqual(result.relationshipIds, ["r1", "r4"]);
  assert.equal(JSON.stringify(dataset), before);
});

test("untimed relationship visibility is explicit rather than accidental", () => {
  const includeUntimed = evaluateAnalyticalLens(
    lens({
      timeWindow: {
        start: day("2026-09-20"),
        end: day("2026-09-20"),
        untimed: "include",
      },
    }),
    dataset,
  );
  const excludeUntimed = evaluateAnalyticalLens(
    lens({
      timeWindow: {
        start: day("2026-09-20"),
        end: day("2026-09-20"),
        untimed: "exclude",
      },
    }),
    dataset,
  );

  assert.deepEqual(includeUntimed.relationshipIds, ["r1", "r4"]);
  assert.deepEqual(excludeUntimed.relationshipIds, ["r1"]);
});

test("analytical lens catalog commands are immutable and reject duplicate IDs", () => {
  const original = { lenses: [] };
  const saved = saveAnalyticalLens(
    original,
    lens({
      entityIds: ["alice"],
      entityMatch: "either-endpoint",
    }),
  );

  assert.equal(original.lenses.length, 0);
  assert.equal(saved.lenses.length, 1);
  assert.equal(saved.lenses[0].filters.entityMatch, "either-endpoint");
  assert.throws(() => saveAnalyticalLens(saved, lens()), /already exists/i);
});

test("analytical lens edit, duplicate, and delete use explicit deterministic identity", () => {
  const saved = saveAnalyticalLens({ lenses: [] }, lens({ placeIds: ["stockholm"] }));
  const edited = replaceAnalyticalLens(saved, {
    ...saved.lenses[0],
    name: "Stockholm focus",
    filters: { placeIds: ["stockholm"], relationshipPredicates: ["warned"] },
  });
  assert.equal(saved.lenses[0].name, "Test lens");
  assert.equal(edited.lenses[0].name, "Stockholm focus");

  const duplicated = duplicateAnalyticalLens(edited, "lens-a", "lens-b", "Stockholm copy");
  assert.deepEqual(
    duplicated.lenses.map((entry) => entry.id),
    ["lens-a", "lens-b"],
  );
  assert.equal(duplicated.lenses[1].name, "Stockholm copy");

  const removed = deleteAnalyticalLens(duplicated, "lens-a");
  assert.deepEqual(
    removed.lenses.map((entry) => entry.id),
    ["lens-b"],
  );
  assert.equal(duplicated.lenses.length, 2);
  assert.throws(() => deleteAnalyticalLens(removed, "missing"), /does not exist/i);
});

test("persisted entity endpoint policy round-trips explicitly", () => {
  const original = lens({
    entityIds: ["alice"],
    entityMatch: "either-endpoint",
  });
  const parsed = parseAnalyticalLens(JSON.parse(serializeAnalyticalLens(original)));

  assert.ok(parsed.lens);
  assert.equal(parsed.lens.filters.entityMatch, "either-endpoint");
});
