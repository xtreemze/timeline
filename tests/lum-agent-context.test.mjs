import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";
import { buildLumAgentContext } from "../scripts/lib/lum-agent-context.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runLum(args, options = {}) {
  return spawnSync(process.execPath, ["scripts/lum.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

function fixtureSource() {
  const doc = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "agent-selectors",
      savedAt: "2026-09-28T10:00:00.000Z",
    }),
  );
  doc.revision = 7;
  doc.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: ["source-a"],
      attributes: {},
    },
    {
      id: "bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
    {
      id: "carol",
      type: "person",
      name: "Carol",
      alternateNames: [],
      sourceIds: ["source-b"],
      attributes: {},
    },
  ];
  doc.project.relationships = [
    {
      id: "rel-warns",
      subjectId: "alice",
      predicate: "warns",
      objectId: "bob",
      placeId: "forest",
      itemIds: [],
      sourceIds: ["source-a"],
      confidence: 1,
      time: null,
      attributes: {},
    },
    {
      id: "rel-meets",
      subjectId: "carol",
      predicate: "meets",
      objectId: "bob",
      placeId: "town",
      itemIds: [],
      sourceIds: ["source-b"],
      confidence: 1,
      time: null,
      attributes: {},
    },
  ];
  doc.project.occurrences = [
    {
      id: "occ-warning",
      title: "Alice warns Bob",
      time: null,
      placeId: "forest",
      participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
      relationshipIds: ["rel-warns"],
      trajectoryIds: [],
      sourceIds: ["source-a"],
      confidence: 1,
      attributes: {},
    },
    {
      id: "occ-meeting",
      title: "Carol meets Bob",
      time: null,
      placeId: "town",
      participantContexts: [{ entityId: "carol" }, { entityId: "bob" }],
      relationshipIds: ["rel-meets"],
      trajectoryIds: [],
      sourceIds: ["source-b"],
      confidence: 1,
      attributes: {},
    },
  ];
  doc.project.places = [
    {
      id: "forest",
      name: "Forest",
      geometry: { type: "Point", coordinates: [18.1, 59.3] },
      sourceIds: ["source-a"],
      attributes: {},
    },
    {
      id: "town",
      name: "Town",
      geometry: { type: "Point", coordinates: [18.2, 59.4] },
      sourceIds: ["source-b"],
      attributes: {},
    },
  ];
  doc.project.sources = [
    { id: "source-a", kind: "document", title: "Source A", attributes: {} },
    { id: "source-b", kind: "document", title: "Source B", attributes: {} },
  ];
  doc.project.stories = [
    {
      id: "story-warning",
      title: "Warning story",
      occurrenceIds: ["occ-warning"],
      placeIds: ["forest"],
      attributes: {},
    },
    {
      id: "story-meeting",
      title: "Meeting story",
      occurrenceIds: ["occ-meeting"],
      placeIds: ["town"],
      attributes: {},
    },
  ];
  const source = formatProjectInterchange(JSON.stringify(doc));
  const validation = validateProjectInterchange(source);
  assert.equal(validation.valid, true);
  return source;
}

test("story selector produces deterministic dependency-closed context", () => {
  const validation = validateProjectInterchange(fixtureSource());
  assert.equal(validation.valid, true);
  if (!validation.valid) return;

  const context = buildLumAgentContext(validation.snapshot, { storyId: "story-warning" });
  assert.deepEqual(context.project.entities.map((record) => record.id), ["alice", "bob"]);
  assert.deepEqual(context.project.relationships.map((record) => record.id), ["rel-warns"]);
  assert.deepEqual(context.project.occurrences.map((record) => record.id), ["occ-warning"]);
  assert.deepEqual(context.project.places.map((record) => record.id), ["forest"]);
  assert.deepEqual(context.project.sources.map((record) => record.id), ["source-a"]);
  assert.deepEqual(context.project.stories.map((record) => record.id), ["story-warning"]);
  assert.equal(context.manifest.total.entities, 3);
  assert.equal(context.manifest.included.entities, 2);
  assert.deepEqual(context.unresolvedReferences, []);
});

test("entity neighborhood selector follows graph depth without unrelated leakage", () => {
  const validation = validateProjectInterchange(fixtureSource());
  assert.equal(validation.valid, true);
  if (!validation.valid) return;

  const context = buildLumAgentContext(validation.snapshot, { entityId: "alice", depth: 1 });
  assert.deepEqual(context.project.entities.map((record) => record.id), ["alice", "bob"]);
  assert.deepEqual(context.project.relationships.map((record) => record.id), ["rel-warns"]);
  assert.deepEqual(context.project.occurrences.map((record) => record.id), ["occ-warning"]);
  assert.equal(context.project.entities.some((record) => record.id === "carol"), false);
});

test("CLI context selectors expose bounded context and reject unknown selectors", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-context-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project.lum.json");
  await writeFile(projectPath, fixtureSource(), "utf8");

  const selected = runLum(["agent", "context", projectPath, "--story", "story-warning", "--json"]);
  assert.equal(selected.status, 0, selected.stderr);
  const context = JSON.parse(selected.stdout);
  assert.deepEqual(context.project.occurrences.map((record) => record.id), ["occ-warning"]);
  assert.equal(context.selector.kind, "story");

  const missing = runLum(["agent", "context", projectPath, "--story", "missing-story", "--json"]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing-story/);
});

test("agent run validates an explicit stdin/stdout adapter proposal before writing it", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-run-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project.lum.json");
  const adapterPath = path.join(directory, "adapter.mjs");
  const outputPath = path.join(directory, "change.lum-proposal.json");
  await writeFile(projectPath, fixtureSource(), "utf8");
  await writeFile(
    adapterPath,
    `let source = ""; process.stdin.setEncoding("utf8"); for await (const chunk of process.stdin) source += chunk; const input = JSON.parse(source); process.stdout.write(JSON.stringify(input.proposalScaffold));`,
    "utf8",
  );

  const result = runLum([
    "agent",
    "run",
    projectPath,
    "--story",
    "story-warning",
    "--instruction",
    "Review the warning occurrence.",
    "--adapter",
    process.execPath,
    "--adapter-args-json",
    JSON.stringify([adapterPath]),
    "--output",
    outputPath,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.valid, true);
  assert.equal(summary.verificationRequired, true);
  const proposal = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(proposal.projectKey, "agent-selectors");
  assert.equal(proposal.expectedRevision, 7);
  assert.equal(proposal.verificationRequired, true);
});

test("agent run rejects invalid adapter output without creating a proposal", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-run-invalid-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project.lum.json");
  const adapterPath = path.join(directory, "bad-adapter.mjs");
  const outputPath = path.join(directory, "bad.lum-proposal.json");
  await writeFile(projectPath, fixtureSource(), "utf8");
  await writeFile(adapterPath, `process.stdout.write("{}");`, "utf8");

  const result = runLum([
    "agent",
    "run",
    projectPath,
    "--adapter",
    process.execPath,
    "--adapter-args-json",
    JSON.stringify([adapterPath]),
    "--output",
    outputPath,
    "--json",
  ]);
  assert.equal(result.status, 1);
  await assert.rejects(readFile(outputPath, "utf8"));
});
