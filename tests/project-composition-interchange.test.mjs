import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";

function baseProject() {
  return JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "composition-case",
      savedAt: "2026-09-28T08:55:00.000Z",
    }),
  );
}

test("Lūm interchange round-trips canonical places, sources, categories, and stories", () => {
  const doc = baseProject();
  doc.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];
  doc.project.places = [
    {
      id: "forest",
      name: "Forest",
      geometry: { type: "Point", coordinates: [18.1, 59.3] },
      sourceIds: ["source-story"],
      attributes: {},
    },
  ];
  doc.project.sources = [
    {
      id: "source-story",
      kind: "document",
      title: "Story source",
      note: "Narrative fixture source.",
      attributes: {},
    },
  ];
  doc.project.categories = [{ id: "movement", name: "Movement", color: "#0e7090", attributes: {} }];
  doc.project.occurrences = [
    {
      id: "occurrence-1",
      title: "Alice enters the forest",
      time: null,
      placeId: "forest",
      participantContexts: [{ entityId: "alice" }],
      relationshipIds: [],
      sourceIds: ["source-story"],
      confidence: 1,
      attributes: { categoryId: "movement" },
    },
  ];
  doc.project.stories = [
    {
      id: "story-a",
      title: "Story A",
      description: "Composition fixture",
      occurrenceIds: ["occurrence-1"],
      placeIds: ["forest"],
      attributes: {},
    },
  ];

  const formatted = formatProjectInterchange(JSON.stringify(doc));
  const validation = validateProjectInterchange(formatted);
  assert.equal(validation.valid, true);
  if (!validation.valid) return;

  assert.equal(validation.snapshot.project.places?.[0]?.name, "Forest");
  assert.equal(validation.snapshot.project.sources?.[0]?.title, "Story source");
  assert.equal(validation.snapshot.project.categories?.[0]?.id, "movement");
  assert.deepEqual(validation.snapshot.project.stories?.[0]?.occurrenceIds, ["occurrence-1"]);
});

test("stories may reference relationship-derived canonical occurrences", () => {
  const doc = baseProject();
  doc.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
    {
      id: "bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];
  doc.project.relationships = [
    {
      id: "meeting",
      subjectId: "alice",
      objectId: "bob",
      predicate: "met",
      itemIds: [],
      sourceIds: [],
      confidence: 1,
      time: { type: "instant", start: { value: "2026-09-28T10:00:00Z" } },
      attributes: {},
    },
  ];
  doc.project.stories = [
    {
      id: "story-a",
      title: "Story A",
      occurrenceIds: ["meeting"],
      placeIds: [],
      attributes: {},
    },
  ];

  const validation = validateProjectInterchange(formatProjectInterchange(JSON.stringify(doc)));
  assert.equal(validation.valid, true);
  if (!validation.valid) return;
  assert.deepEqual(validation.snapshot.project.stories?.[0]?.occurrenceIds, ["meeting"]);
});

test("strict composition validation rejects dangling story and place references", () => {
  const doc = baseProject();
  doc.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];
  doc.project.places = [];
  doc.project.occurrences = [
    {
      id: "occurrence-1",
      time: null,
      placeId: "missing-place",
      participantContexts: [{ entityId: "alice" }],
      relationshipIds: [],
      sourceIds: [],
      confidence: null,
      attributes: {},
    },
  ];
  doc.project.stories = [
    {
      id: "story-a",
      title: "Story A",
      occurrenceIds: ["missing-occurrence"],
      placeIds: ["missing-place"],
      attributes: {},
    },
  ];

  const validation = validateProjectInterchange(formatProjectInterchange(JSON.stringify(doc)));
  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.ok(validation.diagnostics.some((d) => /missing-place|does not resolve/i.test(d.message)));
});

test("strict Lūm shape rejects unknown fields inside canonical composition records", () => {
  const doc = baseProject();
  doc.project.places = [
    {
      id: "forest",
      name: "Forest",
      geometry: { type: "Point", coordinates: [18.1, 59.3] },
      sourceIds: [],
      attributes: {},
      cameraZoom: 12,
    },
  ];
  const validation = validateProjectInterchange(JSON.stringify(doc));
  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.ok(
    validation.diagnostics.some(
      (d) => d.code === "unknown-field" && d.path === "/project/places/0/cameraZoom",
    ),
  );
});
