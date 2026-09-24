import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { WorldProjectionView } from "../site/world/world-projection-view.ts";
import { activeOccurrenceIds } from "../src/projection/spatiotemporal-projection.ts";

function harness() {
  let projection = null;
  const windows = [];
  const runtime = {
    setProjection(value) {
      projection = value;
    },
    setTemporalWindow(value) {
      windows.push(value);
    },
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
    windows,
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
      time: { type: "instant", start: { value: "2026-09-23T10:00:00Z" } },
    },
    {
      id: "later",
      subjectId: "bob",
      objectId: "charlie",
      predicate: "called",
      time: { type: "instant", start: { value: "2026-09-24T10:00:00Z" } },
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

const window = Object.freeze({
  start: Date.parse("2026-09-23T09:00:00Z"),
  end: Date.parse("2026-09-23T11:00:00Z"),
});

function edgeIds(projection) {
  return projection.edges.map((edge) => String(edge.id));
}

test("WorldProjection consumes the exact active occurrence ids supplied by the logical timeline viewport", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow({ ...window, activeOccurrenceIds: ["meeting"] });

  assert.deepEqual(edgeIds(getProjection()), ["meeting"]);
});

test("the supplied active set is authoritative even where an independent world re-query would differ", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  // The world's own temporal index would activate "meeting" (inside the
  // window) plus the timeless relationship; the shared logical set says only
  // "later" is active, and the world must not second-guess it.
  view.setWindow({ ...window, activeOccurrenceIds: ["later"] });

  assert.deepEqual(edgeIds(getProjection()), ["later"]);
});

test("an explicitly empty active occurrence set means no relationship is logically active", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow({ ...window, activeOccurrenceIds: [] });

  assert.deepEqual(getProjection().edges, []);
  assert.deepEqual(getProjection().instances, []);
});

test("active ids unknown to the canonical world model are ignored rather than invented", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow({ ...window, activeOccurrenceIds: ["meeting", "not-canonical"] });

  assert.deepEqual(edgeIds(getProjection()), ["meeting"]);
});

test("the shared active set survives a model refresh until the timeline publishes a new one", () => {
  const { view, getProjection } = harness();
  view.setModel(model);
  view.setWindow({ ...window, activeOccurrenceIds: ["later"] });

  view.setModel(model);

  assert.deepEqual(edgeIds(getProjection()), ["later"]);
});

test("the temporal window forwarded to the renderer stays purely temporal", () => {
  const { view, windows } = harness();
  view.setModel(model);

  view.setWindow({ ...window, activeOccurrenceIds: ["meeting"] });

  assert.deepEqual(windows.at(-1), window);
});

test("without a shared active set the world keeps its standalone temporal query", () => {
  const { view, getProjection } = harness();
  view.setModel(model);

  view.setWindow(window);

  assert.deepEqual(edgeIds(getProjection()).sort(), ["meeting", "timeless"]);
});

test("activeOccurrenceIds is the deterministic logical set for a temporal extent", () => {
  const occurrences = [
    { id: "b", start: 10, end: 20 },
    { id: "a", start: 10, end: 20 },
    { id: "outside", start: 100, end: 120 },
    { id: "edge", start: 30, end: null },
    { id: "invalid", start: Number.NaN, end: 5 },
  ];

  const ids = activeOccurrenceIds(occurrences, { start: 15, end: 30 });

  assert.deepEqual(ids, ["a", "b", "edge"]);
  assert.ok(Object.isFrozen(ids));
  assert.deepEqual(activeOccurrenceIds(occurrences, { start: 40, end: 50 }), []);
  assert.deepEqual(activeOccurrenceIds([...occurrences].reverse(), { start: 15, end: 30 }), ids);
});

test("TimelineSurface publishes activation from the logical viewport, never from retention or render windows", async () => {
  const [view, app] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  const emit =
    /emitViewport\(committed: boolean\): void \{([\s\S]*?)\n {2}\}/.exec(view)?.[1] ?? "";
  assert.match(emit, /activeOccurrenceIds\(this\.relationships, this\.viewport\)/);
  assert.doesNotMatch(emit, /activeOccurrenceIds\([^)]*(renderWindow|retention)/);
  assert.match(
    app,
    /timelineviewportchange[\s\S]{0,200}setWindow\(event\.detail\?\.viewport \|\| null\)/,
  );
});
