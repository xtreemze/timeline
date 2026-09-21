import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { projectTimelineOccurrences } from "../src/projection/timeline-projection.ts";

const project = {
  entities: [
    { id: "entity-a", name: "Alice" },
    { id: "entity-b", name: "Bob" },
    { id: "entity-c", name: "Acme" },
  ],
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
        start: { value: "2026-09-21T12:00:00Z" },
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
        start: { value: "2026-09-01" },
        end: { value: "2026-09-30" },
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

test("timed canonical relationships project to deterministic chronology occurrences", () => {
  const occurrences = projectTimelineOccurrences(project);
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.occurrenceId),
    ["rel-range", "rel-late"],
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.relationshipId),
    ["rel-range", "rel-late"],
  );
  assert.equal(occurrences[0].title, "Alice worked Acme");
  assert.equal(occurrences[1].title, "Alice reported Bob");
});

test("interval relationships preserve both boundaries while timeless relationships stay off chronology", () => {
  const occurrences = projectTimelineOccurrences(project);
  const range = occurrences.find((occurrence) => occurrence.relationshipId === "rel-range");
  assert.ok(range);
  assert.equal(range.start, Date.parse("2026-09-01T00:00:00Z"));
  assert.equal(range.end, Date.parse("2026-09-30T00:00:00Z"));
  assert.equal(
    occurrences.some((occurrence) => occurrence.relationshipId === "rel-timeless"),
    false,
  );
});

test("projection is renderer-neutral and stable for cloned input", () => {
  const first = projectTimelineOccurrences(project);
  const second = projectTimelineOccurrences(structuredClone(project));
  assert.deepEqual(second, first);
  assert.doesNotMatch(JSON.stringify(first), /sigma|graphology|leaflet|orb|lit/i);
});

test("application adds only unrepresented relationship occurrences during legacy migration", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(app, /projectTimelineOccurrences/);
  assert.match(app, /representedRelationshipIds/);
  assert.match(app, /derivedTimelineOccurrences/);
  assert.match(app, /representedRelationshipIds\.has\(occurrence\.relationshipId\)/);
  assert.match(app, /editable:\s*false/);
  assert.match(app, /graph\.neighborhoodGraph\([\s\S]*occurrence\.relationshipId/);
});

test("focused canonical relationship identity resolves directly to its graph edge neighborhood", async () => {
  const [graph, view] = await Promise.all([
    readFile(new URL("../site/timeline-graph.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);
  assert.match(graph, /String\(edge\.id\) === root/);
  assert.match(view, /if \(item\.editable !== false\) actions\.append\(edit\)/);
});
