import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCanonicalProject,
  createInMemoryProjectRepository,
  deserializeProjectSnapshot,
  migrateProject,
  ProjectRevisionConflictError,
  serializeProjectSnapshot,
} from "../src/application/project-repository.ts";
import { entityId, relationshipId, sourceId } from "../src/domain/index.ts";

const alice = {
  id: entityId("alice"),
  type: "person",
  name: "Alice",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};

const bob = {
  id: entityId("bob"),
  type: "person",
  name: "Bob",
  alternateNames: [],
  sourceIds: [],
  attributes: {},
};

const relationship = {
  id: relationshipId("rel-1"),
  subjectId: alice.id,
  objectId: bob.id,
  predicate: "warned",
  itemIds: [],
  sourceIds: [sourceId("source-a")],
  confidence: 0.8,
  time: null,
  attributes: {},
};

function project(schemaVersion = 3) {
  return {
    schemaVersion,
    entities: [alice, bob],
    relationships: [relationship],
  };
}

test("ProjectRepository saves and reloads detached canonical snapshots", async () => {
  const repository = createInMemoryProjectRepository();
  assert.equal(await repository.load("case-a"), null);

  const input = project();
  const saved = await repository.save({
    projectKey: "case-a",
    expectedRevision: 0,
    savedAt: "2026-09-23T18:50:00.000Z",
    project: input,
  });

  assert.equal(saved.revision, 1);
  assert.deepEqual((await repository.load("case-a"))?.project, input);

  assert.notEqual(saved.project, input);
});

test("ProjectRepository rejects stale compare-and-swap writes without changing current state", async () => {
  const repository = createInMemoryProjectRepository();
  await repository.save({
    projectKey: "case-a",
    expectedRevision: 0,
    savedAt: "2026-09-23T18:50:00.000Z",
    project: project(),
  });

  await assert.rejects(
    repository.save({
      projectKey: "case-a",
      expectedRevision: 0,
      savedAt: "2026-09-23T18:51:00.000Z",
      project: project(),
    }),
    ProjectRevisionConflictError,
  );

  assert.equal((await repository.load("case-a"))?.revision, 1);
});

test("ProjectRepository retains the last-known-good checkpoint before replacement", async () => {
  const repository = createInMemoryProjectRepository();
  await repository.save({
    projectKey: "case-a",
    expectedRevision: 0,
    savedAt: "2026-09-23T18:50:00.000Z",
    project: project(),
  });
  await repository.save({
    projectKey: "case-a",
    expectedRevision: 1,
    savedAt: "2026-09-23T18:51:00.000Z",
    project: {
      ...project(),
      entities: [
        ...project().entities,
        {
          id: entityId("carol"),
          type: "person",
          name: "Carol",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      ],
    },
  });

  const checkpoint = await repository.recover("case-a");
  assert.equal(checkpoint?.revision, 1);
  assert.equal(checkpoint?.project.entities.length, 2);
  assert.equal((await repository.load("case-a"))?.project.entities.length, 3);
});

test("serialized project snapshots round-trip canonical state and revision metadata", () => {
  const serialized = serializeProjectSnapshot({
    projectKey: "case-a",
    revision: 4,
    savedAt: "2026-09-23T18:50:00.000Z",
    project: project(),
  });

  const restored = deserializeProjectSnapshot(serialized);
  assert.equal(restored.projectKey, "case-a");
  assert.equal(restored.revision, 4);
  assert.deepEqual(restored.project, project());
});

test("migration chain advances historical project schemas before validation", () => {
  const migrated = migrateProject(project(2), [
    {
      fromVersion: 2,
      toVersion: 3,
      migrate(value) {
        return { ...value, schemaVersion: 3 };
      },
    },
  ]);

  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.entities, project().entities);
});

test("migration rejects missing transitions and future project schemas", () => {
  assert.throws(() => migrateProject(project(2), []), /No migration registered/);
  assert.throws(() => migrateProject(project(4), []), /newer than supported/);
});

test("canonical project validation rejects malformed or unsafe relationship topology", () => {
  assert.throws(() =>
    assertCanonicalProject({
      ...project(),
      relationships: [
        {
          ...relationship,
          objectId: alice.id,
        },
      ],
    }),
  );

  assert.throws(() =>
    deserializeProjectSnapshot(
      JSON.stringify({
        format: "lum-project",
        schemaVersion: 3,
        projectKey: "case-a",
        revision: 1,
        savedAt: "2026-09-23T18:50:00.000Z",
        project: {
          schemaVersion: 3,
          entities: "not-an-array",
          relationships: [],
        },
      }),
    ),
  );
});
