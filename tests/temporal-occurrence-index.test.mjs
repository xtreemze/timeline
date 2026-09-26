import assert from "node:assert/strict";
import test from "node:test";

import {
  entityId,
  occurrenceId,
  relationshipId,
} from "../src/domain/ids.ts";
import { projectCanonicalOccurrences } from "../src/projection/canonical-occurrence-projection.ts";
import { createTemporalOccurrenceIndex } from "../src/projection/temporal-occurrence-index.ts";

test("TemporalOccurrenceIndex returns deterministic inclusive window queries", () => {
  const index = createTemporalOccurrenceIndex([
    { id: "later", start: 30, end: 40 },
    { id: "range", start: 0, end: 100 },
    { id: "instant-b", start: 20 },
    { id: "instant-a", start: 20 },
  ]);

  assert.equal(index.size, 4);
  assert.deepEqual(
    index.query({ time: { start: 20, end: 30 } }).map((occurrence) => occurrence.id),
    ["range", "instant-a", "instant-b", "later"],
  );
});

test("TemporalOccurrenceIndex replacement is immutable and preserves the prior index", () => {
  const original = createTemporalOccurrenceIndex([{ id: "a", start: 0 }]);
  const replaced = original.replace([{ id: "b", start: 10, end: 20 }]);

  assert.deepEqual(
    original.query({ time: { start: 0, end: 0 } }).map((occurrence) => occurrence.id),
    ["a"],
  );
  assert.deepEqual(
    replaced.query({ time: { start: 10, end: 20 } }).map((occurrence) => occurrence.id),
    ["b"],
  );
});


test("grouped relationships produce one canonical temporal occurrence identity", () => {
  const relationship = {
    id: relationshipId("signed"),
    subjectId: entityId("alice"),
    objectId: entityId("agreement"),
    predicate: "signed",
    itemIds: [],
    sourceIds: [],
    confidence: 1,
    time: { type: "instant", start: { value: "100" } },
    attributes: {},
  };
  const projected = projectCanonicalOccurrences(
    {
      schemaVersion: 3,
      entities: [],
      relationships: [relationship],
      occurrences: [
        {
          id: occurrenceId("signing-ceremony"),
          occurrenceType: "meeting",
          time: { type: "instant", start: { value: "100" } },
          participantContexts: [],
          relationshipIds: [relationship.id],
          sourceIds: [],
          confidence: 1,
          attributes: {},
        },
      ],
    },
    (endpoint) => Number(endpoint?.value),
  );
  const index = createTemporalOccurrenceIndex(projected);

  assert.deepEqual(projected.map((occurrence) => String(occurrence.id)), [
    "signing-ceremony",
  ]);
  assert.deepEqual(
    index.query({ time: { start: 100, end: 100 } }).map((occurrence) =>
      String(occurrence.id),
    ),
    ["signing-ceremony"],
  );
});
