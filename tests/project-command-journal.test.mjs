import assert from "node:assert/strict";
import test from "node:test";

import { createProjectCommandJournal } from "../src/application/project-command-journal.ts";

function fixture() {
  return {
    title: "Fixture",
    categories: [
      { id: "incident", name: "Incident" },
      { id: "other", name: "Other" },
    ],
    items: [],
    stories: [],
    entities: [{ id: "alice", name: "Alice", type: "person" }],
    places: [],
    relationships: [],
    evidence: [],
    custodyActions: [],
    extensions: {},
    reasoning: {},
  };
}

function upsertEntity(id, name = id) {
  return {
    op: "upsert",
    collection: "entities",
    id,
    value: { id, name, type: "person" },
  };
}

test("command journal commits atomically and undoes/redoes heterogeneous transactions", () => {
  const journal = createProjectCommandJournal(fixture(), { maxEntries: 8 });

  const first = journal.commit({
    id: "tx-create-bob",
    type: "CreateEntity",
    operations: [upsertEntity("bob", "Bob")],
    source: "user",
    timestamp: "2026-09-28T10:40:00.000Z",
  });
  assert.equal(first.project.entities.some((entity) => entity.id === "bob"), true);
  assert.equal(first.canUndo, true);
  assert.equal(first.canRedo, false);

  const second = journal.commit({
    id: "tx-title",
    type: "ChangePresentation",
    operations: [{ op: "set", field: "title", value: "Updated" }],
    source: "user",
    timestamp: "2026-09-28T10:41:00.000Z",
  });
  assert.equal(second.project.title, "Updated");
  assert.equal(second.history.length, 2);

  const undone = journal.undo();
  assert.equal(undone.project.title, "Fixture");
  assert.equal(undone.project.entities.some((entity) => entity.id === "bob"), true);
  assert.equal(undone.canRedo, true);

  const redone = journal.redo();
  assert.equal(redone.project.title, "Updated");
  assert.equal(redone.canRedo, false);
});

test("undo followed by a new commit truncates the redo branch", () => {
  const journal = createProjectCommandJournal(fixture());
  journal.commit({
    id: "tx-a",
    type: "CreateEntity",
    operations: [upsertEntity("bob")],
  });
  journal.commit({
    id: "tx-b",
    type: "CreateEntity",
    operations: [upsertEntity("carol")],
  });
  journal.undo();

  const branch = journal.commit({
    id: "tx-c",
    type: "CreateEntity",
    operations: [upsertEntity("dave")],
  });

  assert.equal(branch.project.entities.some((entity) => entity.id === "carol"), false);
  assert.equal(branch.project.entities.some((entity) => entity.id === "dave"), true);
  assert.equal(branch.canRedo, false);
  assert.deepEqual(branch.history.map((entry) => entry.id), ["tx-a", "tx-c"]);
});

test("failed transactions leave canonical state, cursor, and history unchanged", () => {
  const journal = createProjectCommandJournal(fixture());
  const before = journal.snapshot();

  assert.throws(
    () =>
      journal.commit({
        id: "tx-invalid",
        type: "DeleteRecord",
        operations: [{ op: "delete", collection: "entities", id: "missing" }],
      }),
    /does not exist/i,
  );

  assert.deepEqual(journal.snapshot(), before);
});

test("validation failure rolls back the whole grouped transaction", () => {
  const journal = createProjectCommandJournal(fixture(), {
    validate(project) {
      if (project.entities.some((entity) => entity.id === "forbidden")) {
        throw new Error("forbidden entity");
      }
      return project;
    },
  });
  const before = journal.snapshot();

  assert.throws(
    () =>
      journal.commit({
        id: "tx-group",
        type: "BulkImport",
        operations: [
          upsertEntity("bob"),
          upsertEntity("forbidden"),
        ],
      }),
    /forbidden entity/,
  );

  assert.deepEqual(journal.snapshot(), before);
});

test("bounded history drops oldest undo entries without changing current state", () => {
  const journal = createProjectCommandJournal(fixture(), { maxEntries: 2 });
  journal.commit({ id: "tx-a", type: "CreateEntity", operations: [upsertEntity("a")] });
  journal.commit({ id: "tx-b", type: "CreateEntity", operations: [upsertEntity("b")] });
  const current = journal.commit({
    id: "tx-c",
    type: "CreateEntity",
    operations: [upsertEntity("c")],
  });

  assert.deepEqual(current.history.map((entry) => entry.id), ["tx-b", "tx-c"]);
  assert.equal(current.project.entities.some((entity) => entity.id === "a"), true);

  journal.undo();
  const oldestReachable = journal.undo();
  assert.equal(oldestReachable.project.entities.some((entity) => entity.id === "a"), true);
  assert.equal(oldestReachable.project.entities.some((entity) => entity.id === "b"), false);
  assert.equal(oldestReachable.canUndo, false);
});

test("reload/reset establishes a fresh canonical base and clears ephemeral history", () => {
  const journal = createProjectCommandJournal(fixture());
  journal.commit({ id: "tx-a", type: "CreateEntity", operations: [upsertEntity("bob")] });

  const reloaded = fixture();
  reloaded.title = "Reloaded";
  const snapshot = journal.reset(reloaded);

  assert.equal(snapshot.project.title, "Reloaded");
  assert.deepEqual(snapshot.history, []);
  assert.equal(snapshot.canUndo, false);
  assert.equal(snapshot.canRedo, false);
});

test("transaction IDs are stable and cannot be reused inside one journal", () => {
  const journal = createProjectCommandJournal(fixture());
  journal.commit({ id: "tx-a", type: "CreateEntity", operations: [upsertEntity("bob")] });

  assert.throws(
    () =>
      journal.commit({
        id: "tx-a",
        type: "CreateEntity",
        operations: [upsertEntity("carol")],
      }),
    /transaction id/i,
  );
});
