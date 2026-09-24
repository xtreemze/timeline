import assert from "node:assert/strict";
import test from "node:test";
import { TimelineTemporal } from "../site/temporal-standards.ts";
import { TimelineGraph } from "../site/timeline-graph.ts";
import { WorldProjectionView } from "../site/world/world-projection-view.ts";
import { activeOccurrenceIds } from "../src/projection/spatiotemporal-projection.ts";

function worldHarness() {
  let projection = null;
  const runtime = {
    setProjection(value) {
      projection = value;
    },
    setTemporalWindow() {},
    focusEntity() {},
    focusOccurrence() {},
    focusPlace() {},
    refresh() {},
    getRenderProjection() {
      return projection;
    },
    destroy() {},
  };
  return { view: new WorldProjectionView(runtime), getProjection: () => projection };
}

const DAY = 86_400_000;
const at = (iso) => Date.parse(iso);

// Every temporal shape the canonical model and importers can produce for a
// relationship. Timeline bands and the world must derive the same extent.
const relationships = [
  { id: "instant", time: { type: "instant", start: { value: "2026-01-10T00:00:00Z" } } },
  {
    id: "interval",
    time: {
      type: "interval",
      start: { value: "2026-01-05T00:00:00Z" },
      end: { value: "2026-01-20T00:00:00Z" },
    },
  },
  {
    id: "instant-with-end",
    time: {
      type: "instant",
      start: { value: "2026-02-01T00:00:00Z" },
      end: { value: "2026-02-15T00:00:00Z" },
    },
  },
  {
    id: "untyped-with-start",
    time: { start: { value: "2026-03-01T00:00:00Z" } },
  },
  {
    id: "unparseable-end",
    time: {
      type: "interval",
      start: { value: "2026-04-01T00:00:00Z" },
      end: { value: "not a date" },
    },
  },
  { id: "timeless", time: null },
].map((relationship, index) => ({
  subjectId: `s${index}`,
  objectId: `o${index}`,
  predicate: "related",
  ...relationship,
}));

const model = {
  entities: relationships.flatMap((relationship) => [
    { id: relationship.subjectId },
    { id: relationship.objectId },
  ]),
  relationships,
};

const windows = [
  { start: at("2026-01-09T00:00:00Z"), end: at("2026-01-11T00:00:00Z") },
  { start: at("2026-01-15T00:00:00Z"), end: at("2026-01-16T00:00:00Z") },
  { start: at("2026-02-10T00:00:00Z"), end: at("2026-02-11T00:00:00Z") },
  { start: at("2026-02-28T00:00:00Z"), end: at("2026-03-02T00:00:00Z") },
  { start: at("2026-03-31T00:00:00Z"), end: at("2026-04-02T00:00:00Z") },
  { start: at("2025-01-01T00:00:00Z"), end: at("2027-01-01T00:00:00Z") },
  { start: at("2026-06-01T00:00:00Z"), end: at("2026-06-01T00:00:00Z") + DAY },
];

function timelineActive(window) {
  const bands = TimelineGraph.temporalRelationProjection(relationships, TimelineTemporal);
  return [...activeOccurrenceIds(bands, window)].sort();
}

function worldActive(window) {
  const { view, getProjection } = worldHarness();
  view.setModel(model);
  view.setWindow(window);
  const timed = new Set(
    TimelineGraph.temporalRelationProjection(relationships, TimelineTemporal).map(
      (band) => band.id,
    ),
  );
  // Compare only timed relationships: timeless ones are world-only context
  // when no shared set is published and never appear as timeline bands.
  return getProjection()
    .edges.map((edge) => String(edge.id))
    .filter((id) => timed.has(id))
    .sort();
}

for (const window of windows) {
  test(`timeline and standalone world activate the same timed relationships for ${new Date(window.start).toISOString()}`, () => {
    assert.deepEqual(worldActive(window), timelineActive(window));
  });
}

test("timeline and world agree on which relationships are timed at all", () => {
  const bands = TimelineGraph.temporalRelationProjection(relationships, TimelineTemporal)
    .map((band) => band.id)
    .sort();
  const { view, getProjection } = worldHarness();
  view.setModel(model);
  view.setWindow({ start: at("1900-01-01T00:00:00Z"), end: at("1900-01-02T00:00:00Z") });
  // Outside every timed extent, only relationships the world treats as
  // timeless can remain active; none of the timeline's timed bands may.
  const stillActive = getProjection().edges.map((edge) => String(edge.id));
  for (const id of bands) assert.ok(!stillActive.includes(id), `${id} is timed on the timeline`);
  assert.deepEqual(
    stillActive.sort(),
    relationships
      .map((relationship) => relationship.id)
      .filter((id) => !bands.includes(id))
      .sort(),
  );
});

test("relationshipOccurrenceExtent is the single normalized extent rule", async () => {
  const { relationshipOccurrenceExtent } = await import(
    "../src/projection/spatiotemporal-projection.ts"
  );
  const key = (endpoint) => Number(endpoint?.value ?? Number.NaN);

  assert.equal(relationshipOccurrenceExtent(null, key), null);
  assert.equal(relationshipOccurrenceExtent({ type: "instant" }, key), null);
  assert.equal(relationshipOccurrenceExtent({ start: { value: "x" } }, key), null);
  assert.deepEqual(
    relationshipOccurrenceExtent({ type: "instant", start: { value: 5 }, end: { value: 9 } }, key),
    { start: 5, end: 5 },
  );
  assert.deepEqual(
    relationshipOccurrenceExtent({ type: "interval", start: { value: 5 }, end: { value: 9 } }, key),
    { start: 5, end: 9 },
  );
  assert.deepEqual(
    relationshipOccurrenceExtent({ type: "interval", start: { value: 9 }, end: { value: 5 } }, key),
    { start: 5, end: 9 },
  );
  assert.deepEqual(
    relationshipOccurrenceExtent(
      { type: "interval", start: { value: 5 }, end: { value: "?" } },
      key,
    ),
    { start: 5, end: 5 },
  );
  assert.deepEqual(relationshipOccurrenceExtent({ start: { value: 7 } }, key), {
    start: 7,
    end: 7,
  });
});
