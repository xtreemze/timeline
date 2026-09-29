import assert from "node:assert/strict";
import test from "node:test";
import * as selection from "../site/occurrence-composer-selection.ts";

test("user-selected occurrences open the composer while unrelated selection does not", () => {
  assert.equal(typeof selection.shouldOpenComposerForSelection, "function");
  const relationship = { kind: "relationship", id: "occ-1" };
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "timeline" }), true);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "world" }), true);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "app" }), false);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: { kind: "entity", id: "a" }, source: "world" }), false);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: null, source: "timeline" }), false);
});

test("world relationship activation resolves the matching chronology item before ambiguous context links", () => {
  assert.equal(typeof selection.timelineItemIdForRelationshipSelection, "function");
  const relationship = {
    id: "rel-builds",
    itemIds: ["build", "childhood", "leave-home"],
    time: {
      start: { value: "1000-04-05T08:00Z" },
      end: { value: "1000-04-17T18:00Z" },
    },
  };
  const items = [
    {
      id: "childhood",
      time: {
        start: { value: "0990-01-01T00:00Z" },
        end: null,
      },
    },
    {
      id: "build",
      time: {
        start: { value: "1000-04-05T08:00Z" },
        end: { value: "1000-04-17T18:00Z" },
      },
    },
    {
      id: "leave-home",
      time: {
        start: { value: "1000-04-01T08:00Z" },
        end: null,
      },
    },
  ];

  assert.equal(
    selection.timelineItemIdForRelationshipSelection(relationship, items, "childhood"),
    "build",
  );
  assert.equal(
    selection.timelineItemIdForRelationshipSelection(
      { id: "rel-ambiguous", itemIds: ["childhood", "leave-home"] },
      items,
      "leave-home",
    ),
    "leave-home",
  );
});
