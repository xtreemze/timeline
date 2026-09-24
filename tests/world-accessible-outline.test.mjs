import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorldAccessibleOutline,
  WORLD_OUTLINE_GROUP_LIMIT,
} from "../site/world/world-accessible-mirror.ts";

function snapshot(overrides = {}) {
  return {
    places: [
      { placeId: "stockholm", selected: false, label: "Stockholm" },
      { placeId: "oslo", selected: false },
    ],
    relationships: [
      {
        relationshipId: "meeting",
        selected: false,
        label: "met",
        sourceEntityId: "alice",
        targetEntityId: "bob",
      },
    ],
    entities: [
      { entityId: "alice", worldInstanceId: "alice::meeting", selected: false, label: "Alice" },
      { entityId: "alice", worldInstanceId: "alice::trip", selected: false, label: "Alice" },
      { entityId: "bob", worldInstanceId: "bob::meeting", selected: false, label: "Bob" },
    ],
    selection: null,
    ...overrides,
  };
}

test("the outline groups places, directed relationships and canonical entities", () => {
  const outline = buildWorldAccessibleOutline(snapshot());

  assert.deepEqual(
    outline.groups.map((group) => [group.kind, group.total]),
    [
      ["place", 2],
      ["relationship", 1],
      ["entity", 2],
    ],
  );
  const [places, relationships, entities] = outline.groups;
  assert.deepEqual(
    places.items.map((item) => item.text),
    ["Stockholm", "oslo"],
  );
  assert.equal(relationships.items[0].text, "met: Alice → Bob");
  assert.deepEqual(relationships.items[0].selection, { kind: "relationship", id: "meeting" });
  // One canonical entity, however many world instances it has.
  assert.deepEqual(
    entities.items.map((item) => item.text),
    ["Alice (2 occurrences)", "Bob"],
  );
  assert.deepEqual(entities.items[0].selection, { kind: "entity", id: "alice" });
});

test("items carry stable canonical keys and the current selection", () => {
  const outline = buildWorldAccessibleOutline(
    snapshot({ selection: { kind: "entity", id: "bob" } }),
  );
  const entities = outline.groups[2];
  assert.deepEqual(
    entities.items.map((item) => [item.key, item.selected]),
    [
      ["entity:alice", false],
      ["entity:bob", true],
    ],
  );
});

test("large groups are capped but always keep the selected object and report the remainder", () => {
  const many = Array.from({ length: WORLD_OUTLINE_GROUP_LIMIT + 50 }, (_, index) => ({
    placeId: `place-${String(index).padStart(4, "0")}`,
    selected: false,
    label: `Place ${index}`,
  }));
  const selectedId = many.at(-1).placeId;
  const outline = buildWorldAccessibleOutline(
    snapshot({ places: many, selection: { kind: "place", id: selectedId } }),
  );
  const places = outline.groups[0];

  assert.equal(places.total, WORLD_OUTLINE_GROUP_LIMIT + 50);
  assert.equal(places.items.length, WORLD_OUTLINE_GROUP_LIMIT);
  assert.equal(places.omitted, 50);
  assert.ok(places.items.some((item) => item.selection.id === selectedId && item.selected));
});
