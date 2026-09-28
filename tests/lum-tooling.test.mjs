import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
  LUM_PROJECT_FILE_EXTENSION,
  LUM_PROJECT_SCHEMA_ID,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";
import { parseOccurrenceSentence } from "../site/occurrence-composer-model.ts";
import { createLumLanguageServer } from "../scripts/lum-lsp.mjs";
import { attachLumDiagnosticRanges } from "../scripts/lib/lum-diagnostics.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runLum(args, options = {}) {
  return spawnSync(process.execPath, ["scripts/lum.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

test("Lūm schema is strict and describes the portable envelope", async () => {
  const schema = JSON.parse(
    await readFile(new URL("../schemas/lum-project-v1.schema.json", import.meta.url), "utf8"),
  );

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, LUM_PROJECT_SCHEMA_ID);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.format.const, "lum-project");
  assert.equal(schema.properties.interchangeVersion.const, 1);
  assert.equal(schema.properties.project.additionalProperties, false);
  assert.equal(schema.$defs.entity.additionalProperties, false);
  assert.equal(schema.$defs.relationship.additionalProperties, false);
  assert.equal(schema.$defs.occurrence.additionalProperties, false);
});

test("empty project scaffold is strict, valid, self-describing, and canonically formatted", () => {
  const serialized = createEmptyProjectInterchange({
    projectKey: "new-case",
    savedAt: "2026-09-28T08:00:00.000Z",
  });
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.$schema, LUM_PROJECT_SCHEMA_ID);
  assert.equal(parsed.format, "lum-project");
  assert.equal(parsed.interchangeVersion, 1);
  assert.equal(parsed.projectKey, "new-case");
  assert.deepEqual(parsed.project.entities, []);
  assert.deepEqual(parsed.project.relationships, []);
  assert.equal(serialized, formatProjectInterchange(serialized));
  assert.equal(validateProjectInterchange(serialized).valid, true);
});

test("portable Lūm interchange requires its canonical schema identifier", () => {
  const parsed = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "schema-case",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
  );
  delete parsed.$schema;
  const validation = validateProjectInterchange(JSON.stringify(parsed));
  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.ok(validation.diagnostics.some((d) => d.code === "unsupported-schema-id"));
});

test("formatter is deterministic, idempotent, and preserves array order", () => {
  const source = createEmptyProjectInterchange({
    projectKey: "format-case",
    savedAt: "2026-09-28T08:00:00.000Z",
  });
  const parsed = JSON.parse(source);
  parsed.project.entities = [
    {
      id: "z",
      type: "person",
      name: "Zulu",
      alternateNames: [],
      sourceIds: [],
      attributes: { zeta: 2, alpha: 1 },
    },
    {
      id: "a",
      type: "person",
      name: "Alpha",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];

  const messy = JSON.stringify(parsed);
  const once = formatProjectInterchange(messy);
  const twice = formatProjectInterchange(once);

  assert.equal(once, twice);
  assert.deepEqual(
    JSON.parse(once).project.entities.map((entity) => entity.id),
    ["z", "a"],
  );
  assert.ok(once.endsWith("\n"));
});

test("formatter uses semantic canonical field order rather than arbitrary alphabetic order", () => {
  const parsed = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "order-case",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
  );
  parsed.project.entities = [
    {
      attributes: { zeta: 2, alpha: 1 },
      sourceIds: [],
      alternateNames: [],
      name: "Alice",
      type: "person",
      id: "alice",
    },
  ];
  parsed.project.relationships = [
    {
      attributes: {},
      time: null,
      confidence: 1,
      sourceIds: [],
      itemIds: [],
      objectId: "bob",
      predicate: "warns",
      subjectId: "alice",
      id: "rel-1",
    },
  ];

  const formatted = formatProjectInterchange(JSON.stringify(parsed));
  const envelopeKeys = Object.keys(JSON.parse(formatted));
  assert.deepEqual(envelopeKeys, [
    "$schema",
    "format",
    "interchangeVersion",
    "schemaVersion",
    "projectKey",
    "revision",
    "savedAt",
    "project",
  ]);

  const project = JSON.parse(formatted).project;
  assert.deepEqual(Object.keys(project), ["schemaVersion", "entities", "relationships"]);
  assert.deepEqual(Object.keys(project.entities[0]), [
    "id",
    "type",
    "name",
    "alternateNames",
    "sourceIds",
    "attributes",
  ]);
  assert.deepEqual(Object.keys(project.relationships[0]).slice(0, 4), [
    "id",
    "subjectId",
    "predicate",
    "objectId",
  ]);
  assert.deepEqual(Object.keys(project.entities[0].attributes), ["alpha", "zeta"]);
});

test("strict validator rejects unknown fields rather than preserving agent guesses", () => {
  const parsed = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "strict-case",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
  );
  parsed.project.camera = { longitude: 18, latitude: 59 };

  const result = validateProjectInterchange(JSON.stringify(parsed));
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "unknown-field" && diagnostic.path === "/project/camera",
    ),
  );
});

test("machine diagnostics pinpoint the JSON Pointer source range", () => {
  const valid = createEmptyProjectInterchange({
    projectKey: "range-case",
    savedAt: "2026-09-28T08:00:00.000Z",
  });
  const source = valid.replace('  "project": {', '  "surprise": true,\n  "project": {');
  const validation = validateProjectInterchange(source);
  assert.equal(validation.valid, false);
  if (validation.valid) return;

  const [finding] = attachLumDiagnosticRanges(
    source,
    validation.diagnostics.filter((diagnostic) => diagnostic.path === "/surprise"),
  );
  assert.ok(finding?.range);
  assert.ok(finding.range.start.line > 0);
  assert.match(source.split("\n")[finding.range.start.line], /"surprise"/);
});

test("lum CLI init/check/fmt/lint/schema form one strict workflow", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const init = runLum(["init", directory, "--project-key", "cli-case"]);
  assert.equal(init.status, 0, init.stderr);

  const projectPath = path.join(directory, `project${LUM_PROJECT_FILE_EXTENSION}`);
  const source = await readFile(projectPath, "utf8");
  assert.equal(validateProjectInterchange(source).valid, true);

  const check = runLum(["check", projectPath, "--json"]);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).valid, true);

  await writeFile(projectPath, JSON.stringify(JSON.parse(source)), "utf8");
  const lint = runLum(["lint", projectPath, "--json"]);
  assert.equal(lint.status, 1);
  assert.ok(JSON.parse(lint.stdout).diagnostics.some((d) => d.code === "non-canonical-format"));

  const formatCheck = runLum(["fmt", "--check", projectPath]);
  assert.equal(formatCheck.status, 1);

  const formatWrite = runLum(["fmt", projectPath]);
  assert.equal(formatWrite.status, 0, formatWrite.stderr);
  assert.equal(await readFile(projectPath, "utf8"), source);

  const schema = runLum(["schema", "--json"]);
  assert.equal(schema.status, 0, schema.stderr);
  assert.equal(JSON.parse(schema.stdout).id, LUM_PROJECT_SCHEMA_ID);
});

test("lum compose exposes the same parser as the application composer", () => {
  const sentence = '"Alice Example" warns Bob on 2026-09-28T08:00:00Z';
  const cli = runLum(["compose", sentence, "--json"]);
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), parseOccurrenceSentence(sentence));
});

test("LSP uses strict diagnostics and canonical formatter from the same toolchain", () => {
  const outbound = [];
  const server = createLumLanguageServer((message) => outbound.push(message));

  server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  const initialized = outbound.find((message) => message.id === 1);
  assert.equal(initialized.result.capabilities.documentFormattingProvider, true);

  const uri = "file:///tmp/example.lum.json";
  const valid = createEmptyProjectInterchange({
    projectKey: "lsp-case",
    savedAt: "2026-09-28T08:00:00.000Z",
  });
  const invalid = valid.replace('  "project": {', '  "surprise": true,\n  "project": {');

  server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: { textDocument: { uri, version: 1, text: invalid } },
  });
  const diagnostics = outbound.at(-1);
  assert.equal(diagnostics.method, "textDocument/publishDiagnostics");
  const unknown = diagnostics.params.diagnostics.find(
    (diagnostic) => diagnostic.code === "unknown-field",
  );
  assert.ok(unknown);
  assert.ok(unknown.range.start.line > 0);

  server.handle({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/formatting",
    params: { textDocument: { uri }, options: {} },
  });
  const formatting = outbound.find((message) => message.id === 2);
  assert.equal(formatting.result.length, 1);
  assert.ok(formatting.result[0].newText.endsWith("\n"));
});

test("trajectory external semantic mappings survive strict interchange validation", () => {
  const parsed = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "trajectory-mapping",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
  );
  parsed.project.trajectories = [
    {
      id: "track-1",
      sourceIds: [],
      sampleCount: 0,
      time: null,
      bounds: null,
      channels: [],
      levels: [],
      storage: { kind: "external", ref: "urn:track:1" },
      externalMappings: [
        {
          scheme: "example",
          identifier: "track-1",
          relation: "exact",
        },
      ],
      attributes: {},
    },
  ];

  const validation = validateProjectInterchange(formatProjectInterchange(JSON.stringify(parsed)));
  assert.equal(validation.valid, true);
  if (!validation.valid) return;
  assert.deepEqual(validation.snapshot.project.trajectories?.[0]?.externalMappings, [
    {
      scheme: "example",
      identifier: "track-1",
      relation: "exact",
    },
  ]);
});

test("lum agent context emits bounded canonical context for limited-context agents", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, `project${LUM_PROJECT_FILE_EXTENSION}`);
  await writeFile(
    projectPath,
    createEmptyProjectInterchange({
      projectKey: "agent-case",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
    "utf8",
  );

  const result = runLum(["agent", "context", projectPath, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const context = JSON.parse(result.stdout);
  assert.equal(context.protocol, "lum-agent-context-v2");
  assert.equal(context.project.projectKey, "agent-case");
  assert.equal(context.schema.id, LUM_PROJECT_SCHEMA_ID);
  assert.ok(context.manifest.counts.entities >= 0);
  assert.equal(
    context.schema.proposalSchemaId,
    "https://xtreemze.github.io/timeline/schemas/lum-change-proposal-v1.schema.json",
  );
  assert.deepEqual(context.project.places, []);
  assert.deepEqual(context.project.sources, []);
  assert.deepEqual(context.project.categories, []);
  assert.deepEqual(context.project.stories, []);
  assert.match(context.composer.syntax, /SUBJECT/);
  assert.ok(context.workflow.includes("lum lint <candidate.lum.json> --json"));
  assert.equal(context.proposalWorkflow.schema, context.schema.proposalSchemaId);
});
