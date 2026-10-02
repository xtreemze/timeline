import assert from "node:assert/strict";
import test from "node:test";
import { validateProjectInterchange } from "../src/application/project-interchange.ts";
import {
  assembleProjectModules,
  createProjectModule,
  validateProjectModule,
} from "../src/application/project-module.ts";

const base = {
  projectKey: "classic-tales-three-little-pigs",
  storyId: "story-three-little-pigs",
};

test("one modular source file owns exactly one canonical collection", () => {
  const module = createProjectModule({
    ...base,
    collection: "categories",
    records: [{ id: "movement", name: "Movement", color: "#0e7090", attributes: {} }],
  });
  const parsed = JSON.parse(module);
  assert.equal(parsed.format, "lum-project-module");
  assert.equal(parsed.moduleVersion, 1);
  assert.equal(parsed.collection, "categories");
  assert.equal(parsed.records.length, 1);
  assert.equal(validateProjectModule(module).valid, true);
});

test("module validation rejects invented envelope fields and wrong collection records", () => {
  const parsed = JSON.parse(
    createProjectModule({
      ...base,
      collection: "stories",
      records: [
        {
          id: "story-three-little-pigs",
          title: "The Three Little Pigs",
          occurrenceIds: [],
          placeIds: [],
          attributes: {},
        },
      ],
    }),
  );
  parsed.camera = { zoom: 4 };
  const invalidEnvelope = validateProjectModule(JSON.stringify(parsed));
  assert.equal(invalidEnvelope.valid, false);
  if (!invalidEnvelope.valid) {
    assert.ok(invalidEnvelope.diagnostics.some((d) => d.path === "/camera"));
  }

  delete parsed.camera;
  parsed.records[0].camera = { zoom: 4 };
  const invalidRecord = validateProjectModule(JSON.stringify(parsed));
  assert.equal(invalidRecord.valid, false);
  if (!invalidRecord.valid) {
    assert.ok(invalidRecord.diagnostics.some((d) => d.path === "/records/0/camera"));
  }
});

test("module assembly composes canonical collections and must pass whole-project Lūm validation", () => {
  const modules = [
    createProjectModule({ ...base, collection: "entities", records: [] }),
    createProjectModule({ ...base, collection: "relationships", records: [] }),
    createProjectModule({ ...base, collection: "occurrences", records: [] }),
    createProjectModule({ ...base, collection: "places", records: [] }),
    createProjectModule({ ...base, collection: "sources", records: [] }),
    createProjectModule({ ...base, collection: "categories", records: [] }),
    createProjectModule({
      ...base,
      collection: "stories",
      records: [
        {
          id: "story-three-little-pigs",
          title: "The Three Little Pigs",
          occurrenceIds: [],
          placeIds: [],
          attributes: {},
        },
      ],
    }),
  ];

  const assembled = assembleProjectModules(modules, {
    savedAt: "2026-09-28T09:15:00.000Z",
  });
  assert.equal(assembled.snapshot.project.stories?.[0]?.id, "story-three-little-pigs");
  assert.equal(validateProjectInterchange(assembled.serialized).valid, true);
});

test("module assembly rejects mixed project/story ownership and duplicate collection modules", () => {
  const entities = createProjectModule({ ...base, collection: "entities", records: [] });
  const duplicate = createProjectModule({ ...base, collection: "entities", records: [] });
  assert.throws(
    () => assembleProjectModules([entities, duplicate], { savedAt: "2026-09-28T09:15:00.000Z" }),
    /duplicate module/i,
  );

  const foreign = createProjectModule({
    ...base,
    storyId: "story-snow-white",
    collection: "stories",
    records: [],
  });
  assert.throws(
    () => assembleProjectModules([entities, foreign], { savedAt: "2026-09-28T09:15:00.000Z" }),
    /same projectKey and storyId/i,
  );
});
