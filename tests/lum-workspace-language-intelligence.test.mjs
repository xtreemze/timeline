import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { createProjectModule } from "../src/application/project-module.ts";
import { createLumLanguageServer } from "../scripts/lum-lsp.mjs";

function positionOf(text, needle, innerOffset = 0) {
  const offset = text.indexOf(needle);
  assert.notEqual(offset, -1, `Missing test needle: ${needle}`);
  const target = offset + innerOffset;
  const before = text.slice(0, target).split("\n");
  return { line: before.length - 1, character: before.at(-1).length };
}

function response(messages, id) {
  return messages.find((message) => message.id === id);
}

function modules() {
  const common = { projectKey: "workspace-case", storyId: "story-workspace" };
  const entities = createProjectModule({
    ...common,
    collection: "entities",
    records: [
      {
        id: "alice",
        type: "person",
        name: "Alice",
        alternateNames: [],
        sourceIds: [],
        attributes: { note: "alice must not be text-renamed here" },
      },
      {
        id: "bob",
        type: "person",
        name: "Bob",
        alternateNames: [],
        sourceIds: [],
        attributes: {},
      },
    ],
  });
  const relationships = createProjectModule({
    ...common,
    collection: "relationships",
    records: [
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
    ],
  });
  return { entities, relationships };
}

async function workspaceHarness(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-lsp-workspace-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { entities, relationships } = modules();
  const entityPath = path.join(directory, "entities.module.lum.json");
  const relationshipPath = path.join(directory, "relationships.module.lum.json");
  await writeFile(entityPath, entities, "utf8");
  await writeFile(relationshipPath, relationships, "utf8");

  const entityUri = pathToFileURL(entityPath).href;
  const relationshipUri = pathToFileURL(relationshipPath).href;
  const messages = [];
  const server = createLumLanguageServer((message) => messages.push(message));
  server.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      workspaceFolders: [{ uri: pathToFileURL(directory).href, name: "fixture" }],
    },
  });
  server.handle({ jsonrpc: "2.0", method: "initialized", params: {} });

  return { server, messages, entities, relationships, entityUri, relationshipUri };
}

test("workspace LSP indexes unopened module files for compatible completion", async (t) => {
  const harness = await workspaceHarness(t);
  const editable = harness.relationships.replace('"subjectId": "alice"', '"subjectId": ""');
  harness.server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: harness.relationshipUri,
        languageId: "lum",
        version: 2,
        text: editable,
      },
    },
  });
  const position = positionOf(editable, '"subjectId": ""', '"subjectId": "'.length);
  harness.server.handle({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/completion",
    params: { textDocument: { uri: harness.relationshipUri }, position },
  });

  const labels = response(harness.messages, 2).result.map((item) => item.label).sort();
  assert.deepEqual(labels, ["alice", "bob"]);
});

test("workspace definition and references cross module boundaries", async (t) => {
  const harness = await workspaceHarness(t);
  harness.server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: harness.relationshipUri,
        languageId: "lum",
        version: 1,
        text: harness.relationships,
      },
    },
  });

  const referencePosition = positionOf(
    harness.relationships,
    '"subjectId": "alice"',
    '"subjectId": "'.length + 2,
  );
  harness.server.handle({
    jsonrpc: "2.0",
    id: 3,
    method: "textDocument/definition",
    params: { textDocument: { uri: harness.relationshipUri }, position: referencePosition },
  });
  const definition = response(harness.messages, 3).result;
  assert.equal(definition.uri, harness.entityUri);

  harness.server.handle({
    jsonrpc: "2.0",
    id: 4,
    method: "textDocument/references",
    params: {
      textDocument: { uri: harness.relationshipUri },
      position: referencePosition,
      context: { includeDeclaration: true },
    },
  });
  const refs = response(harness.messages, 4).result;
  assert.ok(refs.some((entry) => entry.uri === harness.entityUri));
  assert.ok(refs.some((entry) => entry.uri === harness.relationshipUri));
});

test("workspace symbols expose canonical module records", async (t) => {
  const harness = await workspaceHarness(t);
  harness.server.handle({
    jsonrpc: "2.0",
    id: 5,
    method: "workspace/symbol",
    params: { query: "Alice" },
  });
  const symbols = response(harness.messages, 5).result;
  assert.ok(symbols.some((symbol) => symbol.name.includes("alice") && symbol.location.uri === harness.entityUri));
});

test("module document symbols identify the owned canonical collection", async (t) => {
  const harness = await workspaceHarness(t);
  harness.server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: harness.entityUri,
        languageId: "lum",
        version: 1,
        text: harness.entities,
      },
    },
  });
  harness.server.handle({
    jsonrpc: "2.0",
    id: 6,
    method: "textDocument/documentSymbol",
    params: { textDocument: { uri: harness.entityUri } },
  });
  const symbols = response(harness.messages, 6).result;
  assert.ok(symbols.some((symbol) => symbol.name === "entities (2)"));
});

test("canonical ID rename previews only typed declarations and references across modules", async (t) => {
  const harness = await workspaceHarness(t);
  harness.server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: harness.entityUri,
        languageId: "lum",
        version: 1,
        text: harness.entities,
      },
    },
  });

  const declarationPosition = positionOf(
    harness.entities,
    '"id": "alice"',
    '"id": "'.length + 2,
  );
  harness.server.handle({
    jsonrpc: "2.0",
    id: 7,
    method: "textDocument/prepareRename",
    params: { textDocument: { uri: harness.entityUri }, position: declarationPosition },
  });
  assert.equal(response(harness.messages, 7).result.placeholder, "alice");

  harness.server.handle({
    jsonrpc: "2.0",
    id: 8,
    method: "textDocument/rename",
    params: {
      textDocument: { uri: harness.entityUri },
      position: declarationPosition,
      newName: "alice-renamed",
    },
  });
  const edit = response(harness.messages, 8).result;
  assert.equal(edit.changes[harness.entityUri].length, 1);
  assert.equal(edit.changes[harness.relationshipUri].length, 1);
  assert.equal(
    edit.changes[harness.entityUri].some((change) => change.newText === "alice-renamed"),
    true,
  );
  assert.equal(
    edit.changes[harness.relationshipUri].some((change) => change.newText === "alice-renamed"),
    true,
  );
});

test("workspace intelligence never crosses projectKey boundaries", async (t) => {
  const harness = await workspaceHarness(t);
  const foreign = createProjectModule({
    projectKey: "foreign-project",
    storyId: "foreign-story",
    collection: "entities",
    records: [
      {
        id: "mallory",
        type: "person",
        name: "Mallory",
        alternateNames: [],
        sourceIds: [],
        attributes: {},
      },
    ],
  });
  const foreignPath = new URL("./foreign.module.lum.json", harness.entityUri);
  await writeFile(foreignPath, foreign, "utf8");
  harness.server.handle({
    jsonrpc: "2.0",
    method: "workspace/didChangeWatchedFiles",
    params: { changes: [{ uri: foreignPath.href, type: 1 }] },
  });

  const editable = harness.relationships.replace('"subjectId": "alice"', '"subjectId": ""');
  harness.server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: harness.relationshipUri,
        languageId: "lum",
        version: 2,
        text: editable,
      },
    },
  });
  const position = positionOf(editable, '"subjectId": ""', '"subjectId": "'.length);
  harness.server.handle({
    jsonrpc: "2.0",
    id: 9,
    method: "textDocument/completion",
    params: { textDocument: { uri: harness.relationshipUri }, position },
  });
  const labels = response(harness.messages, 9).result.map((item) => item.label);
  assert.equal(labels.includes("mallory"), false);
});
