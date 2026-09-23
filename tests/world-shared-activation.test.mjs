import assert from "node:assert/strict";
import test from "node:test";

import { WorldProjectionView } from "../site/world/world-projection-view.ts";

function harness() {
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
  return {
    view: new WorldProjectionView(runtime),
    getProjection: () => projection,
  };
}

const model = {
  entities: [{ id: "alice" }, { id: "bob" }, { id: "charlie" }],
  relationships: [
    {
      id: "meeting",
      subjectId: "alice",
      objectId: "bob",
      predicate: "met",
      time: {
        type: "instant",
        start: { value: "2026-09-23T10:00:00Z" },
      },
    },
    {
      id: "later",
      subjectId: "bob",
      objectId: "charlie",
      predicate: "called",
      time: {
        type: "instant",
        start: { value: "2026-09-24T10:00:00Z" },
      },
    },
    {
      id: "timeless",
      subjectId: "alice",
      objectId: "charlie",
      predicate: "knows",
      time: null,
    },
  ],
};

test("WorldProjection consumes the exact active occurrence ids supplied by the logical timeline viewport", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow({
    start: Date.parse("2026-09-23T09:00:00Z"),
    end: Date.parse("2026-09-23T11:00:00Z"),
    activeOccurrenceIds: ["meeting"],
  });

  assert.deepEqual(
    getProjection().edges.map((edge) => edge.id),
    ["meeting"],
  );
});

test("an explicitly empty active occurrence set means no relationship is logically active", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow({
    start: Date.parse("2026-09-23T09:00:00Z"),
    end: Date.parse("2026-09-23T11:00:00Z"),
    activeOccurrenceIds: [],
  });

  assert.deepEqual(getProjection().edges, []);
});
