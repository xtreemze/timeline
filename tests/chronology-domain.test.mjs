import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryId,
  evidenceId,
  occurrenceId,
  placeId,
  sourceId,
  storyId,
  validateCategory,
  validateChronology,
  validateOccurrence,
  validateStory,
} from "../src/domain/index.ts";

const incident = {
  id: categoryId("incident"),
  name: "Incident",
  color: "#b42318",
  extensions: {},
};

const warning = {
  id: occurrenceId("warning"),
  time: {
    type: "instant",
    start: { value: "2026-09-25T10:00:00Z" },
    end: null,
  },
  title: "Alice warns Bob",
  description: "A source-backed chronology occurrence.",
  categoryId: incident.id,
  placeIds: [placeId("office")],
  evidenceIds: [evidenceId("source-note")],
  sourceIds: [sourceId("source-a")],
  attributes: {},
};

const investigation = {
  id: storyId("investigation"),
  title: "Investigation",
  description: "Ordered chronology traversal.",
  occurrenceIds: [warning.id],
  placeIds: [placeId("office")],
  extensions: {},
};

test("canonical chronology records validate independently of UI presentation", () => {
  assert.equal(validateCategory(incident).valid, true);
  assert.equal(validateOccurrence(warning).valid, true);
  assert.equal(validateStory(investigation).valid, true);

  assert.deepEqual(
    validateChronology({
      categories: [incident],
      occurrences: [warning],
      stories: [investigation],
    }),
    [],
  );
});

test("canonical chronology rejects duplicate references without inventing presentation state", () => {
  assert.equal(
    validateOccurrence({
      ...warning,
      evidenceIds: [evidenceId("source-note"), evidenceId("source-note")],
    }).valid,
    false,
  );
  assert.equal(
    validateStory({
      ...investigation,
      occurrenceIds: [warning.id, warning.id],
    }).valid,
    false,
  );
});

test("chronology validation reports broken category and story occurrence references", () => {
  const findings = validateChronology({
    categories: [incident],
    occurrences: [
      {
        ...warning,
        id: occurrenceId("uncategorized"),
        categoryId: categoryId("missing-category"),
      },
    ],
    stories: [
      {
        ...investigation,
        occurrenceIds: [occurrenceId("missing-occurrence")],
      },
    ],
  });

  assert.ok(findings.some((finding) => finding.includes("unknown category")));
  assert.ok(findings.some((finding) => finding.includes("unknown occurrence")));
});

test("canonical IDs reject blank occurrence and category identifiers", () => {
  assert.throws(() => occurrenceId("   "), /Occurrence ID/);
  assert.throws(() => categoryId("   "), /Category ID/);
});
