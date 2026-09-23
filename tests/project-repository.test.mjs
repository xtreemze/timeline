import assert from "node:assert/strict";
import test from "node:test";

import {
  PROJECT_ENVELOPE_FORMAT,
  createProjectEnvelope,
  migrateProjectEnvelope,
  parseProjectEnvelope,
} from "../src/application/project-repository.ts";

function validateV3(candidate) {
  if (!candidate || typeof candidate !== "object" || candidate.schemaVersion !== 3) {
    throw new Error("Expected canonical schema version 3 project.");
  }
  return candidate;
}

test("project envelope rejects invalid revision and timestamp metadata", () => {
  assert.throws(() =>
    createProjectEnvelope({
      project: {},
      schemaVersion: 3,
      revision: -1,
      savedAt: "2026-09-23T18:00:00Z",
    }),
  );
  assert.throws(() =>
    createProjectEnvelope({
      project: {},
      schemaVersion: 3,
      revision: 1,
      savedAt: "not-a-date",
    }),
  );
});

test("project envelope parses only the explicit Lūm persistence format", () => {
  const parsed = parseProjectEnvelope(
    {
      format: PROJECT_ENVELOPE_FORMAT,
      schemaVersion: 3,
      revision: 7,
      savedAt: "2026-09-23T18:00:00Z",
      project: { schemaVersion: 3, title: "Case" },
    },
    validateV3,
  );

  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.revision, 7);
  assert.equal(parsed.project.title, "Case");

  assert.throws(() =>
    parseProjectEnvelope(
      {
        format: "legacy-timeline",
        schemaVersion: 3,
        revision: 7,
        savedAt: "2026-09-23T18:00:00Z",
        project: { schemaVersion: 3 },
      },
      validateV3,
    ),
  );
});

test("project migrations are contiguous, deterministic steps and preserve revision metadata", () => {
  const source = createProjectEnvelope({
    project: { schemaVersion: 1, title: "Case" },
    schemaVersion: 1,
    revision: 12,
    savedAt: "2026-09-23T18:00:00Z",
  });

  const migrated = migrateProjectEnvelope(
    source,
    3,
    [
      {
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        migrate(project) {
          return { ...project, schemaVersion: 2, entities: [] };
        },
      },
      {
        fromSchemaVersion: 2,
        toSchemaVersion: 3,
        migrate(project) {
          return { ...project, schemaVersion: 3, relationships: [] };
        },
      },
    ],
    validateV3,
  );

  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.revision, 12);
  assert.equal(migrated.savedAt, source.savedAt);
  assert.deepEqual(migrated.project, {
    schemaVersion: 3,
    title: "Case",
    entities: [],
    relationships: [],
  });
});

test("project migrations reject gaps, duplicate sources, and downgrades", () => {
  const source = createProjectEnvelope({
    project: { schemaVersion: 1 },
    schemaVersion: 1,
    revision: 0,
    savedAt: "2026-09-23T18:00:00Z",
  });

  assert.throws(() => migrateProjectEnvelope(source, 3, [], validateV3), /Missing migration/);

  assert.throws(
    () =>
      migrateProjectEnvelope(
        source,
        3,
        [
          { fromSchemaVersion: 1, toSchemaVersion: 2, migrate: (project) => project },
          { fromSchemaVersion: 1, toSchemaVersion: 2, migrate: (project) => project },
        ],
        validateV3,
      ),
    /Duplicate migration/,
  );

  const future = createProjectEnvelope({
    project: { schemaVersion: 4 },
    schemaVersion: 4,
    revision: 1,
    savedAt: "2026-09-23T18:00:00Z",
  });
  assert.throws(() => migrateProjectEnvelope(future, 3, [], validateV3), /downgrade is not allowed/);
});
