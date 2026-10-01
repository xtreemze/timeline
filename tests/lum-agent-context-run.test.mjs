import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
} from "../src/application/project-interchange.ts";
import { buildLumAgentContext, parseLumAgentSelectors } from "../scripts/lib/lum-agent-context.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function fixtureProject() {
  const value = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "bounded-agent",
      savedAt: "2026-09-28T10:00:00.000Z",
    }),
  );
  value.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: ["source-a"],
      attributes: { privateNoise: "omit" },
    },
    { id: "bob", type: "person", name: "Bob", alternateNames: [], sourceIds: [], attributes: {} },
    {
      id: "carol",
      type: "person",
      name: "Carol",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];
  value.project.relationships = [
    {
      id: "r1",
      subjectId: "alice",
      predicate: "warns",
      objectId: "bob",
      placeId: "stockholm",
      itemIds: [],
      sourceIds: ["source-a"],
      confidence: 1,
      time: null,
      attributes: {},
    },
    {
      id: "r2",
      subjectId: "bob",
      predicate: "calls",
      objectId: "carol",
      itemIds: [],
      sourceIds: [],
      confidence: 1,
      time: null,
      attributes: {},
    },
  ];
  value.project.occurrences = [
    {
      id: "o1",
      title: "Warning",
      time: null,
      placeId: "stockholm",
      participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
      relationshipIds: ["r1"],
      trajectoryIds: [],
      sourceIds: ["source-a"],
      confidence: 1,
      attributes: {},
    },
    {
      id: "o2",
      title: "Call",
      time: null,
      participantContexts: [{ entityId: "bob" }, { entityId: "carol" }],
      relationshipIds: ["r2"],
      trajectoryIds: [],
      sourceIds: [],
      confidence: 1,
      attributes: {},
    },
  ];
  value.project.places = [
    {
      id: "stockholm",
      name: "Stockholm",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      sourceIds: [],
      attributes: {},
    },
  ];
  value.project.sources = [
    {
      id: "source-a",
      kind: "document",
      title: "Source A",
      note: "sensitive full note",
      attributes: {},
    },
  ];
  value.project.stories = [
    {
      id: "story-1",
      title: "Warning story",
      occurrenceIds: ["o1"],
      placeIds: ["stockholm"],
      attributes: {},
    },
  ];
  return formatProjectInterchange(JSON.stringify(value));
}

test("story context emits deterministic bounded dependency closure and omits unrelated attributes", () => {
  const context = buildLumAgentContext(fixtureProject(), { storyIds: ["story-1"] });
  assert.equal(context.protocol, "lum-agent-context-v2");
  assert.equal(context.selector.mode, "story");
  assert.deepEqual(
    context.project.stories.map((record) => record.id),
    ["story-1"],
  );
  assert.deepEqual(
    context.project.occurrences.map((record) => record.id),
    ["o1"],
  );
  assert.deepEqual(
    context.project.relationships.map((record) => record.id),
    ["r1"],
  );
  assert.deepEqual(
    context.project.entities.map((record) => record.id),
    ["alice", "bob"],
  );
  assert.deepEqual(
    context.project.places.map((record) => record.id),
    ["stockholm"],
  );
  assert.deepEqual(
    context.project.sources.map((record) => record.id),
    ["source-a"],
  );
  assert.equal("attributes" in context.project.entities[0], false);
  assert.equal("note" in context.project.sources[0], false);
  assert.equal(context.manifest.counts.entities, 3);
  assert.equal(context.unresolvedReferences.length, 0);
});

test("story and occurrence selectors resolve relationship-derived canonical occurrences", () => {
  const parsed = JSON.parse(fixtureProject());
  parsed.project.stories[0].occurrenceIds = ["r1"];
  const source = formatProjectInterchange(JSON.stringify(parsed));

  const story = buildLumAgentContext(source, { storyIds: ["story-1"] });
  assert.deepEqual(story.project.occurrences, []);
  assert.deepEqual(story.project.relationships.map((record) => record.id), ["r1"]);
  assert.deepEqual(story.project.entities.map((record) => record.id), ["alice", "bob"]);

  const selected = buildLumAgentContext(source, { occurrenceIds: ["r1"] });
  assert.deepEqual(selected.project.occurrences, []);
  assert.deepEqual(selected.project.relationships.map((record) => record.id), ["r1"]);
  assert.equal(selected.unresolvedReferences.length, 0);
});

test("entity neighborhood depth is bounded and deterministic", () => {
  const depth1 = buildLumAgentContext(fixtureProject(), { entityIds: ["alice"], depth: 1 });
  assert.deepEqual(
    depth1.project.entities.map((record) => record.id),
    ["alice", "bob"],
  );
  assert.deepEqual(
    depth1.project.relationships.map((record) => record.id),
    ["r1"],
  );
  assert.deepEqual(
    depth1.project.occurrences.map((record) => record.id),
    ["o1"],
  );

  const depth2 = buildLumAgentContext(fixtureProject(), { entityIds: ["alice"], depth: 2 });
  assert.deepEqual(
    depth2.project.entities.map((record) => record.id),
    ["alice", "bob", "carol"],
  );
  assert.deepEqual(
    depth2.project.relationships.map((record) => record.id),
    ["r1", "r2"],
  );
});

test("selector parser supports story occurrence entity depth and ids with strict bounds", () => {
  assert.deepEqual(parseLumAgentSelectors(["--story", "story-1"]), { storyIds: ["story-1"] });
  assert.deepEqual(parseLumAgentSelectors(["--occurrence", "o1"]), { occurrenceIds: ["o1"] });
  assert.deepEqual(parseLumAgentSelectors(["--entity", "alice", "--depth", "2"]), {
    entityIds: ["alice"],
    depth: 2,
  });
  assert.deepEqual(parseLumAgentSelectors(["--ids", "alice,o1"]), { ids: ["alice", "o1"] });
  assert.throws(() => parseLumAgentSelectors(["--entity", "alice", "--depth", "9"]), /depth/i);
});

test("missing selected or dependent references are explicit rather than invented", () => {
  const parsed = JSON.parse(fixtureProject());
  parsed.project.occurrences[0].sourceIds = ["missing-source"];
  const context = buildLumAgentContext(formatProjectInterchange(JSON.stringify(parsed)), {
    occurrenceIds: ["o1"],
  });
  assert.ok(context.unresolvedReferences.some((entry) => entry.id === "missing-source"));
  assert.throws(
    () => buildLumAgentContext(fixtureProject(), { occurrenceIds: ["missing-occurrence"] }),
    /Unknown occurrence/i,
  );
});

test("agent run invokes only an explicit stdio adapter and validates its proposal output", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-run-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project.lum.json");
  const adapterPath = path.join(directory, "adapter.mjs");
  const outputPath = path.join(directory, "result.lum-proposal.json");
  await writeFile(projectPath, fixtureProject(), "utf8");
  await writeFile(
    adapterPath,
    `
let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
const context = JSON.parse(input);
const alice = context.project.entities.find((record) => record.id === "alice");
process.stdout.write(JSON.stringify({
  $schema: "https://xtreemze.github.io/timeline/schemas/lum-change-proposal-v1.schema.json",
  format: "lum-change-proposal",
  version: 1,
  projectKey: context.project.projectKey,
  expectedRevision: context.project.revision,
  verificationRequired: true,
  instruction: "Rename the selected entity",
  unresolvedFacts: [],
  operations: [{
    op: "replace",
    collection: "entities",
    record: { id: alice.id, type: alice.type, name: "Alice Updated", alternateNames: [], sourceIds: ["source-a"], attributes: {} }
  }]
}));
`,
    "utf8",
  );

  const result = spawnSync(
    process.execPath,
    [
      "scripts/lum.mjs",
      "agent",
      "run",
      projectPath,
      "--entity",
      "alice",
      "--adapter",
      process.execPath,
      "--adapter-arg",
      adapterPath,
      "--output",
      outputPath,
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const response = JSON.parse(result.stdout);
  assert.equal(response.valid, true);
  assert.equal(response.verificationRequired, true);
  assert.equal(response.output, outputPath);
  const proposal = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(proposal.operations[0].record.name, "Alice Updated");
});

test("agent run rejects invalid provider output and never applies it to the project", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-invalid-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project.lum.json");
  const before = fixtureProject();
  await writeFile(projectPath, before, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "scripts/lum.mjs",
      "agent",
      "run",
      projectPath,
      "--adapter",
      process.execPath,
      "--adapter-arg",
      "-e",
      "--adapter-arg",
      "process.stdout.write(JSON.stringify({format:'not-a-proposal'}))",
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.equal(await readFile(projectPath, "utf8"), before);
});
