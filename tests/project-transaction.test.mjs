import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyProjectTransaction,
  PROJECT_TRANSACTION_COLLECTIONS,
  PROJECT_TRANSACTION_TOP_LEVEL_FIELDS,
} from "../src/application/project-transaction.ts";

function projectFixture() {
  return {
    version: 2,
    title: "Fixture",
    categories: [
      { id: "incident", name: "Incident", color: "#667085" },
      { id: "other", name: "Other", color: "#475467" },
    ],
    items: [
      {
        id: "event-a",
        kind: "event",
        categoryId: "incident",
        evidenceIds: ["source-a"],
        relationChanges: [{ relationshipId: "rel-a", operation: "activate" }],
      },
    ],
    stories: [{ id: "story-a", title: "Story", itemIds: ["event-a"] }],
    entities: [
      { id: "alice", name: "Alice", type: "person" },
      { id: "bob", name: "Bob", type: "person" },
    ],
    places: [{ id: "place-a", name: "Place" }],
    relationships: [
      {
        id: "rel-a",
        subjectId: "alice",
        objectId: "bob",
        predicate: "calls",
        placeId: "place-a",
        itemIds: ["event-a"],
      },
    ],
    evidence: [{ id: "source-a", type: "document", title: "Source" }],
    custodyActions: [{ id: "custody-a", evidenceId: "source-a" }],
    reasoning: {},
    extensions: {},
  };
}

test("application project transaction is immutable and supports set/upsert/patch", () => {
  const base = projectFixture();
  const snapshot = structuredClone(base);
  const result = applyProjectTransaction(base, [
    { op: "set", field: "title", value: "Updated" },
    {
      op: "upsert",
      collection: "entities",
      id: "charlie",
      value: { name: "Charlie", type: "person", attributes: { source: "agent" } },
    },
    {
      op: "patch",
      collection: "stories",
      id: "story-a",
      value: { description: "Patched", extensions: { reviewed: true } },
    },
  ]);

  assert.deepEqual(base, snapshot, "transaction must not mutate the input project");
  assert.equal(result.title, "Updated");
  assert.equal(result.entities.find((entry) => entry.id === "charlie")?.name, "Charlie");
  assert.equal(result.entities.find((entry) => entry.id === "charlie")?.id, "charlie");
  assert.equal(result.stories[0].description, "Patched");
  assert.deepEqual(result.stories[0].extensions, { reviewed: true });
});

test("application project transaction preserves referential cleanup semantics", () => {
  const base = projectFixture();

  const withoutItem = applyProjectTransaction(base, [
    { op: "delete", collection: "items", id: "event-a" },
  ]);
  assert.deepEqual(withoutItem.stories[0].itemIds, []);
  assert.deepEqual(withoutItem.relationships[0].itemIds, []);

  const withoutEntity = applyProjectTransaction(base, [
    { op: "delete", collection: "entities", id: "bob" },
  ]);
  assert.equal(withoutEntity.relationships.length, 0);

  const withoutPlace = applyProjectTransaction(base, [
    { op: "delete", collection: "places", id: "place-a" },
  ]);
  assert.equal(withoutPlace.relationships[0].placeId, "");

  const withoutRelationship = applyProjectTransaction(base, [
    { op: "delete", collection: "relationships", id: "rel-a" },
  ]);
  assert.deepEqual(withoutRelationship.items[0].relationChanges, []);

  const withoutEvidence = applyProjectTransaction(base, [
    { op: "delete", collection: "evidence", id: "source-a" },
  ]);
  assert.deepEqual(withoutEvidence.items[0].evidenceIds, []);
  assert.deepEqual(withoutEvidence.custodyActions, []);

  const withoutCategory = applyProjectTransaction(base, [
    { op: "delete", collection: "categories", id: "incident" },
  ]);
  assert.equal(withoutCategory.items[0].categoryId, "other");
});

test("application project transaction rejects invalid or unsafe operation shapes", () => {
  const base = projectFixture();
  assert.throws(() => applyProjectTransaction(null, []), /project must be an object/i);
  assert.throws(() => applyProjectTransaction(base, []), /non-empty operations array/i);
  assert.throws(
    () => applyProjectTransaction(base, Array.from({ length: 501 }, () => ({ op: "set", field: "title", value: "x" }))),
    /limited to 500 operations/i,
  );
  assert.throws(
    () => applyProjectTransaction(base, [{ op: "set", field: "version", value: 3 }]),
    /unsupported top-level field/i,
  );
  assert.throws(
    () => applyProjectTransaction(base, [{ op: "upsert", collection: "unknown", id: "x", value: {} }]),
    /unsupported collection/i,
  );
  assert.throws(
    () => applyProjectTransaction(base, [{ op: "upsert", collection: "entities", value: { name: "No ID" } }]),
    /stable id/i,
  );
});

test("transaction vocabulary remains explicit and renderer-independent", () => {
  assert.deepEqual(PROJECT_TRANSACTION_COLLECTIONS, [
    "categories",
    "items",
    "stories",
    "entities",
    "places",
    "relationships",
    "evidence",
    "custodyActions",
  ]);
  assert.deepEqual(PROJECT_TRANSACTION_TOP_LEVEL_FIELDS, ["title", "extensions", "reasoning"]);
});

test("WebMCP delegates canonical mutation to the application transaction command", async () => {
  const source = await readFile(new URL("../site/webmcp.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /import\s*\{[^}]*applyProjectTransaction[^}]*\}\s*from\s*["']\.\.\/src\/application\/project-transaction\.ts["']/s,
  );
  assert.doesNotMatch(source, /function\s+cleanupDelete\s*\(/);
  assert.doesNotMatch(source, /function\s+applyOperation\s*\(/);
  assert.doesNotMatch(source, /records\.push\(/);
  assert.doesNotMatch(source, /currentRecords\.splice\(/);
});
