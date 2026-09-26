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
import {
  entityId,
  occurrenceId,
  relationshipId,
  sourceArtifactId,
  sourceId,
  trajectoryId,
} from "../src/domain/index.ts";

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

test("serialized project snapshots preserve unresolved identity state", () => {
  const unresolvedProject = {
    ...project(),
    entities: [
      {
        ...alice,
        id: entityId("unknown-person-a"),
        name: "Unidentified person A",
        identityResolution: "unresolved",
      },
      bob,
    ],
  };
  const serialized = serializeProjectSnapshot({
    projectKey: "case-unresolved",
    revision: 1,
    savedAt: "2026-09-26T17:20:00.000Z",
    project: unresolvedProject,
  });
  assert.deepEqual(deserializeProjectSnapshot(serialized).project, unresolvedProject);
});

test("serialized project snapshots preserve standards-aware actor and occurrence semantics", () => {
  const semanticProject = {
    schemaVersion: 3,
    entities: [
      {
        ...alice,
        identifiers: [{ scheme: "isni", value: "000000012146438X" }],
        appellations: [{ value: "Alice Example", kind: "legal", languageTag: "en" }],
        semanticMappings: [
          { scheme: "ISO 21127", version: "2023", identifier: "E21", relation: "exact" },
        ],
      },
      {
        ...bob,
        type: "organization",
        semanticMappings: [
          { scheme: "ISO 21127", version: "2023", identifier: "E74", relation: "related" },
        ],
      },
    ],
    relationships: [
      {
        ...relationship,
        predicate: "signed",
        occurrenceType: "representation",
        subjectContext: {
          roleType: "director",
          representedEntityId: bob.id,
          organizationId: bob.id,
          authoritySourceIds: [sourceId("authority-source")],
        },
        semanticMappings: [
          { scheme: "ISO 21127", version: "2023", identifier: "E7", relation: "broader" },
        ],
      },
    ],
  };

  const serialized = serializeProjectSnapshot({
    projectKey: "case-semantic",
    revision: 2,
    savedAt: "2026-09-26T13:45:00.000Z",
    project: semanticProject,
  });
  const restored = deserializeProjectSnapshot(serialized);
  assert.deepEqual(restored.project, semanticProject);
});

test("serialized project snapshots preserve standalone multi-participant occurrences", () => {
  const occurrenceProject = {
    ...project(),
    occurrences: [
      {
        id: occurrenceId("meeting-1"),
        title: "Review meeting",
        occurrenceType: "meeting",
        time: { type: "instant", start: { value: "2026-09-26" } },
        participantContexts: [
          { entityId: alice.id, roleType: "participant" },
          { entityId: bob.id, roleType: "participant" },
        ],
        relationshipIds: [relationship.id],
        sourceIds: [sourceId("minutes")],
        confidence: 0.9,
        attributes: {},
      },
    ],
  };

  const serialized = serializeProjectSnapshot({
    projectKey: "case-occurrence",
    revision: 3,
    savedAt: "2026-09-26T15:10:00.000Z",
    project: occurrenceProject,
  });
  assert.deepEqual(deserializeProjectSnapshot(serialized).project, occurrenceProject);
});

test("serialized project snapshots preserve dense trajectory manifests without embedding samples", () => {
  const trajectoryProject = {
    ...project(),
    trajectories: [
      {
        id: trajectoryId("track-1"),
        sourceIds: [sourceId("gps-source")],
        sourceArtifactIds: [sourceArtifactId("gpx-file")],
        observedEntityIds: [alice.id],
        sampleCount: 100_000,
        time: {
          type: "interval",
          start: { value: "2026-09-26T08:00:00Z" },
          end: { value: "2026-09-26T10:00:00Z" },
        },
        bounds: {
          minLongitude: 17.9,
          minLatitude: 59.1,
          maxLongitude: 18.2,
          maxLatitude: 59.4,
          minElevationMeters: 2,
          maxElevationMeters: 143,
        },
        channels: [{ id: "position" }, { id: "elevation", unit: "m" }],
        levels: [
          { id: "raw", pointCount: 100_000 },
          { id: "overview", pointCount: 500, toleranceMeters: 25 },
        ],
        storage: { kind: "source-artifact", ref: "gpx-file", mediaType: "application/gpx+xml" },
        attributes: {},
      },
    ],
    occurrences: [
      {
        id: occurrenceId("journey-1"),
        occurrenceType: "migration",
        time: null,
        participantContexts: [{ entityId: alice.id, roleType: "traveller" }],
        relationshipIds: [],
        trajectoryIds: [trajectoryId("track-1")],
        sourceIds: [sourceId("gps-source")],
        confidence: 1,
        attributes: {},
      },
    ],
  };

  const serialized = serializeProjectSnapshot({
    projectKey: "case-trajectory",
    revision: 2,
    savedAt: "2026-09-26T17:15:00.000Z",
    project: trajectoryProject,
  });
  const restored = deserializeProjectSnapshot(serialized).project;
  assert.deepEqual(restored, trajectoryProject);
  assert.equal(restored.trajectories?.[0].sampleCount, 100_000);
  assert.equal("samples" in restored.trajectories?.[0], false);
});

test("canonical project validation rejects occurrence IDs colliding with relationship IDs", () => {
  assert.throws(() =>
    assertCanonicalProject({
      ...project(),
      occurrences: [
        {
          id: occurrenceId("rel-1"),
          occurrenceType: "meeting",
          time: null,
          participantContexts: [{ entityId: alice.id, roleType: "participant" }],
          relationshipIds: [],
          sourceIds: [],
          confidence: null,
          attributes: {},
        },
      ],
    }),
  );
});

test("canonical project validation rejects unresolved contextual representation", () => {
  assert.throws(() =>
    assertCanonicalProject({
      ...project(),
      relationships: [
        {
          ...relationship,
          occurrenceType: "representation",
          subjectContext: {
            roleType: "director",
            representedEntityId: entityId("missing-company"),
          },
        },
      ],
    }),
  );
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
