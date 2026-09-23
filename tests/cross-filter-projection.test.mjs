import assert from "node:assert/strict";
import test from "node:test";

import { ANALYTICAL_LENS_SCHEMA_VERSION } from "../src/application/analytical-lens.ts";
import {
  buildCategoryCounts,
  buildNumericHistogram,
  buildTemporalHistogram,
  chooseTemporalBinWidth,
  createCrossFilterProjection,
  withAnalyticalCategoryFilter,
  withAnalyticalTimeWindow,
} from "../src/application/cross-filter-projection.ts";

const day = (value) => Date.parse(value + "T00:00:00Z");

function lens(filters = {}) {
  return {
    schemaVersion: ANALYTICAL_LENS_SCHEMA_VERSION,
    id: "lens-cross-filter",
    name: "Cross filter",
    filters,
  };
}

const dataset = {
  entities: [{ id: "alice" }, { id: "bob" }, { id: "carol" }],
  relationships: [
    { id: "r1", subjectId: "alice", objectId: "bob", predicate: "called", placeId: "stockholm" },
    { id: "r2", subjectId: "bob", objectId: "carol", predicate: "called", placeId: "malmo" },
    { id: "r3", subjectId: "alice", objectId: "carol", predicate: "paid", placeId: "stockholm" },
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
      entityIds: ["alice", "carol"],
      start: day("2026-09-22"),
      end: day("2026-09-23"),
    },
  ],
};

test("numeric histogram is deterministic and includes upper bound in final bin", () => {
  const bins = buildNumericHistogram([0, 1, 2, 3, 4], { bins: 2, min: 0, max: 4 });
  assert.deepEqual(bins, [
    { start: 0, end: 2, count: 2 },
    { start: 2, end: 4, count: 3 },
  ]);
});

test("categorical counts sort by frequency then value", () => {
  assert.deepEqual(
    buildCategoryCounts(["b", "a", "b", "c", "a", "b", null, ""]),
    [
      { value: "b", count: 3 },
      { value: "a", count: 2 },
      { value: "c", count: 1 },
    ],
  );
});

test("adaptive temporal width ranges from millisecond scale upward", () => {
  assert.equal(chooseTemporalBinWidth(0, 10, 20), 1);
  assert.ok(chooseTemporalBinWidth(0, 365 * 24 * 60 * 60 * 1000, 12) >= 30 * 24 * 60 * 60 * 1000);
});

test("temporal density counts ranged occurrences in every intersected bin", () => {
  const width = 24 * 60 * 60 * 1000;
  const bins = buildTemporalHistogram(
    [
      { start: day("2026-09-20") },
      { start: day("2026-09-21"), end: day("2026-09-22") },
    ],
    { binWidthMs: width },
  );

  assert.deepEqual(
    bins.map((bin) => bin.count),
    [1, 1, 1],
  );
});

test("cross-filter projection derives chart data from the same analytical evaluation", () => {
  const projection = createCrossFilterProjection(
    lens({
      placeIds: ["stockholm"],
    }),
    dataset,
    { binWidthMs: 24 * 60 * 60 * 1000 },
  );

  assert.deepEqual(projection.evaluation.relationshipIds, ["r1", "r3"]);
  assert.deepEqual(projection.evaluation.occurrenceIds, ["o1", "o3"]);
  assert.deepEqual(projection.relationshipPredicates, [
    { value: "called", count: 1 },
    { value: "paid", count: 1 },
  ]);
  assert.deepEqual(projection.places, [{ value: "stockholm", count: 2 }]);
  assert.deepEqual(projection.categories, [
    { value: "communication", count: 1 },
    { value: "transaction", count: 1 },
  ]);
});

test("brush and categorical filter helpers return new lens state without mutating source", () => {
  const original = lens({ placeIds: ["stockholm"] });
  const brushed = withAnalyticalTimeWindow(
    original,
    day("2026-09-20"),
    day("2026-09-21"),
    "exclude",
  );
  const changed = withAnalyticalCategoryFilter(brushed, "placeIds", ["malmo", "malmo"]);

  assert.deepEqual(original.filters, { placeIds: ["stockholm"] });
  assert.deepEqual(brushed.filters.timeWindow, {
    start: day("2026-09-20"),
    end: day("2026-09-21"),
    untimed: "exclude",
  });
  assert.deepEqual(changed.filters.placeIds, ["malmo"]);

  const cleared = withAnalyticalCategoryFilter(changed, "placeIds", []);
  assert.equal("placeIds" in cleared.filters, false);
});
