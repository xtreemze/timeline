import assert from "node:assert/strict";
import test from "node:test";

import { WorldProjectionView } from "../site/world/world-projection-view.ts";

function harness() {
  const calls = [];
  let projection = null;
  const runtime = {
    setProjection(value) {
      projection = value;
      calls.push(["projection", value]);
    },
    setTemporalWindow(value) {
      calls.push(["window", value]);
    },
    focusEntity(id) {
      calls.push(["focus:entity", id]);
    },
    focusOccurrence(id) {
      calls.push(["focus:occurrence", id]);
    },
    focusPlace(id) {
      calls.push(["focus:place", id]);
    },
    refresh() {
      calls.push(["refresh"]);
    },
    getRenderProjection() {
      return projection;
    },
    destroy() {
      calls.push(["destroy"]);
    },
  };

  return {
    calls,
    runtime,
    view: new WorldProjectionView(runtime),
    getProjection: () => projection,
  };
}

const model = {
  entities: [{ id: "alice" }, { id: "bob" }, { id: "charlie" }],
  places: [
    {
      id: "stockholm",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      accuracyMeters: 25,
    },
    {
      id: "unknown-place",
      geometry: null,
    },
  ],
  relationships: [
    {
      id: "meeting",
      subjectId: "alice",
      objectId: "bob",
      predicate: "met",
      placeId: "stockholm",
      time: {
        type: "instant",
        start: { value: "2026-09-23T10:00:00Z" },
      },
      confidence: 1,
      attributes: {},
    },
    {
      id: "timeless",
      subjectId: "alice",
      objectId: "charlie",
      predicate: "knows",
      placeId: "unknown-place",
      time: null,
      confidence: 0.9,
      attributes: {},
    },
  ],
};

test("application model projects timed and timeless relationships into one world scene", () => {
  const { view, getProjection } = harness();

  view.setModel(model);

  const projection = getProjection();
  assert.deepEqual(
    projection.edges.map((edge) => edge.id),
    ["meeting", "timeless"],
  );
  assert.equal(
    projection.instances.filter((instance) => instance.canonicalId === "alice").length,
    2,
  );

  const meetingInstances = projection.instances.filter(
    (instance) => instance.occurrenceId === "meeting",
  );
  assert.ok(
    meetingInstances.every((instance) => instance.geographicAnchors[0]?.placeId === "stockholm"),
  );

  const timelessInstances = projection.instances.filter(
    (instance) => instance.occurrenceId === "timeless",
  );
  assert.ok(timelessInstances.every((instance) => instance.geographicAnchors.length === 0));
});

test("timeline window controls world activation through the shared temporal index", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  const start = Date.parse("2026-09-23T09:00:00Z");
  const end = Date.parse("2026-09-23T11:00:00Z");
  view.setWindow({ start, end });

  assert.deepEqual(
    getProjection().edges.map((edge) => edge.id),
    ["meeting", "timeless"],
  );

  view.setWindow({
    start: Date.parse("2026-09-24T09:00:00Z"),
    end: Date.parse("2026-09-24T11:00:00Z"),
  });

  assert.deepEqual(
    getProjection().edges.map((edge) => edge.id),
    ["timeless"],
  );
});

test("timed projection receives viewport weight while timeless relationships stay fully active", () => {
  const { view, getProjection } = harness();
  view.setModel(model);
  view.setWindow({
    start: Date.parse("2026-09-23T09:00:00Z"),
    end: Date.parse("2026-09-23T11:00:00Z"),
  });

  const meeting = getProjection().edges.find((edge) => edge.id === "meeting");
  const timeless = getProjection().edges.find((edge) => edge.id === "timeless");

  assert.ok(meeting.temporalWeight > 0);
  assert.ok(meeting.temporalWeight <= 1);
  assert.equal(timeless.temporalWeight, 1);
});

test("focus resolves canonical entity relationship and place IDs through the world runtime", () => {
  const { calls, view } = harness();
  view.setModel(model);

  view.setFocus("alice");
  view.setFocus("meeting");
  view.setFocus("stockholm");

  assert.deepEqual(
    calls.filter(([name]) => name.startsWith("focus:")),
    [
      ["focus:entity", "alice"],
      ["focus:occurrence", "meeting"],
      ["focus:place", "stockholm"],
    ],
  );
});

test("unlocated canonical places do not gain invented coordinates", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  const timeless = getProjection().instances.filter(
    (instance) => instance.occurrenceId === "timeless",
  );

  assert.ok(timeless.every((instance) => instance.geographicAnchors.length === 0));
});

test("presentation and refresh compatibility methods preserve the current app-facing surface", () => {
  const { calls, view } = harness();

  view.setPresentationMode(true);
  assert.equal(view.isPresentationMode(), true);

  view.refreshLayout();
  assert.deepEqual(calls.at(-1), ["refresh"]);

  view.destroy();
  assert.deepEqual(calls.at(-1), ["destroy"]);
});
