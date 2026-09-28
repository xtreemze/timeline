import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createProjectModule,
  formatProjectModule,
  lintProjectModule,
  LUM_PROJECT_MODULE_FILE_EXTENSION,
  LUM_PROJECT_MODULE_SCHEMA_ID,
} from "../src/application/project-module.ts";
import { createLumLanguageServer } from "../scripts/lum-lsp.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runLum(args, options = {}) {
  return spawnSync(process.execPath, ["scripts/lum.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

function validModule(collection = "entities", records = []) {
  return createProjectModule({
    projectKey: "module-case",
    storyId: "story-module-case",
    collection,
    records,
  });
}

test("module formatter and linter share deterministic Lūm formatting", () => {
  const canonical = validModule();
  const messy = JSON.stringify(JSON.parse(canonical));
  assert.equal(formatProjectModule(messy), canonical);
  assert.equal(formatProjectModule(canonical), canonical);

  const lint = lintProjectModule(messy, { fileName: "entities.module.lum.json" });
  assert.equal(lint.valid, false);
  assert.ok(lint.diagnostics.some((finding) => finding.code === "non-canonical-format"));
});

test("lum check/lint/fmt auto-detect project modules", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-module-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modulePath = path.join(directory, `entities${LUM_PROJECT_MODULE_FILE_EXTENSION}`);
  const canonical = validModule();
  await writeFile(modulePath, JSON.stringify(JSON.parse(canonical)), "utf8");

  const check = runLum(["check", modulePath, "--json"]);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).valid, true);

  const lint = runLum(["lint", modulePath, "--json"]);
  assert.equal(lint.status, 1);
  assert.ok(
    JSON.parse(lint.stdout).diagnostics.some((finding) => finding.code === "non-canonical-format"),
  );

  const fmt = runLum(["fmt", modulePath]);
  assert.equal(fmt.status, 0, fmt.stderr);
  assert.equal(await readFile(modulePath, "utf8"), canonical);
});

test("lum init-module creates a strict current module scaffold", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-module-init-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, "entities.module.lum.json");

  const result = runLum([
    "init-module",
    target,
    "--project-key",
    "module-case",
    "--story-id",
    "story-module-case",
    "--collection",
    "entities",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(await readFile(target, "utf8"));
  assert.equal(parsed.$schema, LUM_PROJECT_MODULE_SCHEMA_ID);
  assert.equal(parsed.collection, "entities");
  assert.deepEqual(parsed.records, []);
});

test("lum check-modules performs whole-project validation across module files", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-modules-workspace-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const entities = validModule("entities", [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: [],
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
  ]);
  const relationships = validModule("relationships", [
    {
      id: "rel-1",
      subjectId: "alice",
      predicate: "warns",
      objectId: "bob",
      itemIds: [],
      sourceIds: [],
      confidence: null,
      time: null,
      attributes: {},
    },
  ]);
  const occurrences = validModule("occurrences", []);
  const files = [
    ["entities.module.lum.json", entities],
    ["relationships.module.lum.json", relationships],
    ["occurrences.module.lum.json", occurrences],
  ];
  for (const [name, source] of files) await writeFile(path.join(directory, name), source, "utf8");

  const result = runLum([
    "check-modules",
    ...files.map(([name]) => path.join(directory, name)),
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.valid, true);
  assert.equal(payload.moduleCount, 3);
});

test("LSP dispatches module diagnostics and formatting by format discriminator", () => {
  const outbound = [];
  const server = createLumLanguageServer((message) => outbound.push(message));
  const uri = "file:///tmp/entities.module.lum.json";
  const canonical = validModule();
  const messy = JSON.stringify(JSON.parse(canonical));

  server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: { textDocument: { uri, version: 1, text: messy } },
  });
  const diagnostics = outbound.at(-1).params.diagnostics;
  assert.ok(diagnostics.some((finding) => finding.code === "non-canonical-format"));

  server.handle({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/formatting",
    params: { textDocument: { uri }, options: {} },
  });
  assert.equal(outbound.find((message) => message.id === 2).result[0].newText, canonical);
});

test("VS Code selects the module schema without applying the project schema", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../editors/vscode-lum/package.json", import.meta.url), "utf8"),
  );
  const moduleAssociation = manifest.contributes.jsonValidation.find((entry) =>
    entry.fileMatch.includes("*.module.lum.json"),
  );
  assert.equal(
    moduleAssociation.url,
    "https://xtreemze.github.io/timeline/schemas/lum-project-module-v1.schema.json",
  );
  const projectAssociation = manifest.contributes.jsonValidation.find((entry) =>
    entry.url.endsWith("/lum-project-v1.schema.json"),
  );
  assert.ok(projectAssociation.fileMatch.includes("!*.module.lum.json"));
});

test("check-modules maps cross-module semantic failures back to the owning module file", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-modules-source-map-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const entitiesPath = path.join(directory, "entities.module.lum.json");
  const relationshipsPath = path.join(directory, "relationships.module.lum.json");
  await writeFile(
    entitiesPath,
    validModule("entities", [
      {
        id: "alice",
        type: "person",
        name: "Alice",
        alternateNames: [],
        sourceIds: [],
        attributes: {},
      },
    ]),
    "utf8",
  );
  await writeFile(
    relationshipsPath,
    validModule("relationships", [
      {
        id: "bad-rel",
        subjectId: "alice",
        predicate: "warns",
        objectId: "missing-bob",
        itemIds: [],
        sourceIds: [],
        confidence: null,
        time: null,
        attributes: {},
      },
    ]),
    "utf8",
  );

  const result = runLum(["check-modules", entitiesPath, relationshipsPath, "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  const finding = payload.diagnostics.find((entry) => entry.code === "invalid-module-workspace");
  assert.ok(finding);
  assert.equal(finding.file, relationshipsPath);
  assert.equal(finding.path, "/records/0/objectId");
});
