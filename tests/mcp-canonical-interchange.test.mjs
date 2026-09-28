import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  LUM_PROJECT_SCHEMA_ID,
} from "../src/application/project-interchange.ts";
import {
  createProjectModule,
  LUM_PROJECT_MODULE_SCHEMA_ID,
} from "../src/application/project-module.ts";
import {
  authoringGuideResult,
  preflightStoryProject,
  stageStoryProject,
  validateStoryProjectModule,
} from "../mcp/public/story-authoring.ts";

function canonicalFixture() {
  const doc = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "mcp-fixture",
      savedAt: "2026-09-28T09:30:00.000Z",
    }),
  );
  doc.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: ["src-a"],
      attributes: {},
    },
    {
      id: "bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      sourceIds: ["src-a"],
      attributes: {},
    },
  ];
  doc.project.relationships = [
    {
      id: "rel-a",
      subjectId: "alice",
      predicate: "warns",
      objectId: "bob",
      itemIds: ["event-a"],
      sourceIds: ["src-a"],
      confidence: 1,
      time: null,
      attributes: {},
    },
  ];
  doc.project.occurrences = [
    {
      id: "event-a",
      title: "Alice warns Bob",
      time: null,
      participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
      relationshipIds: ["rel-a"],
      sourceIds: ["src-a"],
      confidence: 1,
      attributes: {},
    },
  ];
  doc.project.sources = [
    {
      id: "src-a",
      kind: "document",
      title: "Exhibit A",
      attributes: {},
    },
  ];
  doc.project.places = [];
  doc.project.categories = [];
  doc.project.stories = [
    {
      id: "story-a",
      title: "Fixture story",
      occurrenceIds: ["event-a"],
      placeIds: [],
      attributes: {},
    },
  ];
  return doc;
}

test("MCP story preflight delegates whole-project validity to canonical Lūm interchange", () => {
  const project = canonicalFixture();
  const preflight = preflightStoryProject(project);
  assert.equal(preflight.valid, true);
  assert.deepEqual(preflight.diagnostics, []);
  assert.equal(preflight.summary.occurrences, 1);

  project.project.relationships[0].objectId = "missing";
  const invalid = preflightStoryProject(project);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some((d) => d.code === "invalid-project"));
});

test("staging preserves the canonical interchange envelope and verification requirement", () => {
  const project = canonicalFixture();
  const staged = stageStoryProject({
    project,
    sources: [{ id: "src-a", locator: "page 4" }],
    unresolved: ["Meeting location is not established."],
    generationNotes: "Fixture.",
  });

  assert.equal(staged.status, "ready-for-user-verification");
  assert.equal(staged.verificationRequired, true);
  assert.equal(staged.project.$schema, LUM_PROJECT_SCHEMA_ID);
  assert.equal(staged.project.format, "lum-project");
  assert.deepEqual(staged.unresolved, ["Meeting location is not established."]);
});

test("authoring guide exposes canonical project/module schema capabilities instead of a v2 template", () => {
  const guide = authoringGuideResult();
  assert.equal(guide.format.projectSchema, LUM_PROJECT_SCHEMA_ID);
  assert.equal(guide.format.moduleSchema, LUM_PROJECT_MODULE_SCHEMA_ID);
  assert.equal(guide.projectTemplate.format, "lum-project");
  assert.equal(guide.projectTemplate.interchangeVersion, 1);
  assert.equal("version" in guide.projectTemplate, false);
  assert.match(guide.guide, /canonical Lūm interchange/i);
});

test("MCP module validation uses the shared module diagnostic vocabulary", () => {
  const module = createProjectModule({
    projectKey: "mcp-fixture",
    storyId: "story-a",
    collection: "entities",
    records: [],
  });
  const valid = validateStoryProjectModule(JSON.parse(module));
  assert.equal(valid.valid, true);
  assert.equal(valid.validationScope, "module");

  const broken = JSON.parse(module);
  broken.camera = {};
  const invalid = validateStoryProjectModule(broken);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some((d) => d.code === "unknown-field" && d.path === "/camera"));
});
