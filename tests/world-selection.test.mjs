import assert from "node:assert/strict";
import test from "node:test";

import {
  addSelectionItem,
  clearCanonicalSelection,
  createCanonicalSelectionSet,
  createWorldSearchIndex,
  removeSelectionItem,
  selectionContains,
  selectionItemFromWorldHit,
  summarizeSelection,
  toggleSelectionItem,
} from "../src/application/world-selection.ts";

test("canonical selection sets normalize IDs and remain immutable", () => {
  const selection = createCanonicalSelectionSet({
    entityIds: ["bob", "alice", "alice"],
    occurrenceIds: ["r2", "r1"],
    placeIds: ["stockholm"],
  });

  assert.deepEqual(selection, {
    entityIds: ["alice", "bob"],
    occurrenceIds: ["r1", "r2"],
    placeIds: ["stockholm"],
    evidenceIds: [],
  });

  const added = addSelectionItem(selection, { kind: "evidence", id: "ev-1" });
  assert.equal(selection.evidenceIds.length, 0);
  assert.deepEqual(added.evidenceIds, ["ev-1"]);
});

test("selection add/remove/toggle preserve canonical type buckets", () => {
  const empty = clearCanonicalSelection();
  const withAlice = addSelectionItem(empty, { kind: "entity", id: "alice" });
  const withOccurrence = addSelectionItem(withAlice, { kind: "occurrence", id: "r1" });

  assert.equal(selectionContains(withOccurrence, { kind: "entity", id: "alice" }), true);
  assert.equal(selectionContains(withOccurrence, { kind: "occurrence", id: "r1" }), true);

  const toggled = toggleSelectionItem(withOccurrence, { kind: "entity", id: "alice" });
  assert.deepEqual(toggled.entityIds, []);
  assert.deepEqual(toggled.occurrenceIds, ["r1"]);

  const removed = removeSelectionItem(toggled, { kind: "occurrence", id: "r1" });
  assert.deepEqual(removed, empty);
});

test("world hits map immediately to canonical selection items", () => {
  assert.deepEqual(
    selectionItemFromWorldHit({
      kind: "entity",
      entityId: "alice",
      worldInstanceId: "[\"alice\",\"meeting\"]",
    }),
    { kind: "entity", id: "alice" },
  );
  assert.deepEqual(
    selectionItemFromWorldHit({ kind: "relationship", relationshipId: "meeting" }),
    { kind: "occurrence", id: "meeting" },
  );
  assert.deepEqual(
    selectionItemFromWorldHit({ kind: "place", placeId: "stockholm" }),
    { kind: "place", id: "stockholm" },
  );
  assert.equal(selectionItemFromWorldHit({ kind: "background" }), null);
});

test("selection summaries are suitable for accessible status text", () => {
  const summary = summarizeSelection(
    createCanonicalSelectionSet({
      entityIds: ["alice", "bob"],
      occurrenceIds: ["r1"],
      placeIds: ["stockholm"],
      evidenceIds: ["ev-1", "ev-2"],
    }),
  );
  assert.deepEqual(summary, {
    total: 6,
    entities: 2,
    occurrences: 1,
    places: 1,
    evidence: 2,
  });
});

test("world search is deterministic, accent-insensitive, and relevance ordered", () => {
  const index = createWorldSearchIndex([
    { kind: "entity", id: "e1", label: "Álice Andersson", aliases: ["A. Andersson"] },
    { kind: "place", id: "p1", label: "Alice Springs" },
    { kind: "occurrence", id: "r1", label: "Meeting with Alice" },
    { kind: "evidence", id: "ev1", label: "Call log", keywords: ["alice phone"] },
  ]);

  assert.equal(index.size, 4);
  assert.deepEqual(
    index.query("alice").map((result) => [result.kind, result.id, result.score]),
    [
      ["place", "p1", 1],
      ["entity", "e1", 1],
      ["occurrence", "r1", 2],
      ["evidence", "ev1", 4],
    ],
  );
});

test("world search supports kind filters and bounded result counts", () => {
  const index = createWorldSearchIndex([
    { kind: "entity", id: "e1", label: "Alpha One" },
    { kind: "entity", id: "e2", label: "Alpha Two" },
    { kind: "place", id: "p1", label: "Alpha Place" },
  ]);

  assert.deepEqual(
    index.query("alpha", { kinds: ["entity"], limit: 1 }).map((result) => result.id),
    ["e1"],
  );
  assert.deepEqual(index.query("   "), []);
});
