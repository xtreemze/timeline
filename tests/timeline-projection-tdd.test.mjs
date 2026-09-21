import assert from "node:assert/strict";
import test from "node:test";

async function projectionModule() {
  return import("../src/projection/timeline-projection.ts");
}

const project = {
  schemaVersion: 3,
  entities: [],
  relationships: [
    {
      id: "rel-late",
      subjectId: "entity-a",
      objectId: "entity-b",
      predicate: "reported",
      itemIds: [],
      sourceIds: [],
      confidence: 0.9,
      time: {
        type: "instant",
        start: {
          value: "2026-09-21T12:00:00Z",
          precision: "second",
          certainty: "exact",
        },
        end: null,
      },
      attributes: {},
    },
    {
      id: "rel-range",
      subjectId: "entity-a",
      objectId: "entity-c",
      predicate: "worked",
      itemIds: [],
      sourceIds: [],
      confidence: 0.8,
      time: {
        type: "interval",
        start: {
          value: "2026-09-01",
          precision: "day",
          certainty: "exact",
        },
        end: {
          value: "2026-09-30",
          precision: "day",
          certainty: "exact",
        },
      },
      attributes: {},
    },
    {
      id: "rel-timeless",
      subjectId: "entity-b",
      objectId: "entity-c",
      predicate: "owns",
      itemIds: [],
      sourceIds: [],
      confidence: 0.7,
      time: null,
      attributes: {},
    },
  ],
};

test("#270 timed canonical relationships project to chronology occurrences", async () => {
  const projection = await projectionModule();
  assert.equal(typeof projection.projectTimelineOccurrences, "function");

  const occurrences = projection.projectTimelineOccurrences(project);
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.occurrenceId),
    ["rel-range", "rel-late"],
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.relationshipId),
    ["rel-range", "rel-late"],
  );
});

test("#270 canonical relationship identity remains the retained scene identity", async () => {
  const projection = await projectionModule();
  const occurrences = projection.projectTimelineOccurrences(project);

  for (const occurrence of occurrences) {
    assert.equal(occurrence.occurrenceId, occurrence.relationshipId);
  }
});

test("#270 interval relationships preserve both temporal boundaries", async () => {
  const projection = await projectionModule();
  const occurrences = projection.projectTimelineOccurrences(project);
  const range = occurrences.find(
    (occurrence) => occurrence.relationshipId === "rel-range",
  );

  assert.ok(range);
  assert.equal(range.start, Date.parse("2026-09-01T00:00:00Z"));
  assert.equal(range.end, Date.parse("2026-09-30T00:00:00Z"));
});

test("#270 timeless relationships are not fabricated into temporal occurrences", async () => {
  const projection = await projectionModule();
  const occurrences = projection.projectTimelineOccurrences(project);

  assert.equal(
    occurrences.some(
      (occurrence) => occurrence.relationshipId === "rel-timeless",
    ),
    false,
  );
});

test("#270 timeline projection is deterministic and renderer-neutral", async () => {
  const projection = await projectionModule();
  const first = projection.projectTimelineOccurrences(project);
  const second = projection.projectTimelineOccurrences(structuredClone(project));

  assert.deepEqual(second, first);
  assert.doesNotMatch(JSON.stringify(first), /sigma|graphology|leaflet|orb|lit/i);
});
