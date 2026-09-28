import assert from "node:assert/strict";
import test from "node:test";

import {
  deserializeProjectInterchange,
  LUM_PROJECT_INTERCHANGE_VERSION,
  ProjectInterchangeValidationError,
  serializeProjectInterchange,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";
import { entityId, relationshipId, sourceId } from "../src/domain/index.ts";

function snapshot(attributes = { zeta: 2, alpha: 1 }) {
  const alice = {
    id: entityId("alice"),
    type: "person",
    name: "Alice",
    alternateNames: [],
    sourceIds: [],
    attributes,
  };
  const bob = {
    id: entityId("bob"),
    type: "person",
    name: "Bob",
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };

  return {
    projectKey: "case-a",
    revision: 4,
    savedAt: "2026-09-28T07:30:00.000Z",
    project: {
      schemaVersion: 3,
      entities: [alice, bob],
      relationships: [
        {
          id: relationshipId("rel-1"),
          subjectId: alice.id,
          objectId: bob.id,
          predicate: "warned",
          itemIds: [],
          sourceIds: [sourceId("source-a")],
          confidence: 0.8,
          time: null,
          attributes: {},
        },
      ],
    },
  };
}

test("Lūm interchange separates format version from canonical schema version", () => {
  const serialized = serializeProjectInterchange(snapshot());
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.format, "lum-project");
  assert.equal(parsed.interchangeVersion, LUM_PROJECT_INTERCHANGE_VERSION);
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.project.schemaVersion, 3);
});

test("Lūm interchange serialization is deterministic across object key order", () => {
  const left = serializeProjectInterchange(snapshot({ zeta: 2, alpha: 1 }));
  const right = serializeProjectInterchange(snapshot({ alpha: 1, zeta: 2 }));

  assert.equal(left, right);
  assert.equal(left.endsWith("\n"), true);
});

test("strict interchange validation rejects unknown envelope and canonical project fields", () => {
  const parsed = JSON.parse(serializeProjectInterchange(snapshot()));
  parsed.agentGuess = true;
  parsed.project.camera = { longitude: 18.0, latitude: 59.3 };

  const validation = validateProjectInterchange(JSON.stringify(parsed));
  assert.equal(validation.valid, false);
  if (validation.valid) return;

  assert.deepEqual(
    validation.diagnostics.map(({ code, path }) => ({ code, path })),
    [
      { code: "unknown-field", path: "/agentGuess" },
      { code: "unknown-field", path: "/project/camera" },
    ],
  );
});

test("strict interchange validation rejects legacy persisted snapshots without an interchange version", () => {
  const parsed = JSON.parse(serializeProjectInterchange(snapshot()));
  delete parsed.interchangeVersion;

  const validation = validateProjectInterchange(JSON.stringify(parsed));
  assert.equal(validation.valid, false);
  if (validation.valid) return;

  assert.equal(validation.diagnostics[0]?.code, "unsupported-interchange-version");
  assert.equal(validation.diagnostics[0]?.path, "/interchangeVersion");
});

test("valid Lūm interchange round-trips canonical snapshot state", () => {
  const input = snapshot();
  const restored = deserializeProjectInterchange(serializeProjectInterchange(input));

  assert.deepEqual(restored, input);
});

test("deserializeProjectInterchange exposes machine-readable diagnostics", () => {
  assert.throws(
    () => deserializeProjectInterchange("{"),
    (error) => {
      assert.ok(error instanceof ProjectInterchangeValidationError);
      assert.equal(error.diagnostics[0]?.code, "invalid-json");
      assert.equal(error.diagnostics[0]?.path, "");
      return true;
    },
  );
});
