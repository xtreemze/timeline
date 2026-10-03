import assert from "node:assert/strict";
import test from "node:test";

import { createLumLanguageServer } from "../scripts/lum-lsp.mjs";

const uri = "file:///tmp/intelligence.lum.json";

const source = `{
  "$schema": "https://xtreemze.github.io/timeline/schemas/lum-project-v1.schema.json",
  "format": "lum-project",
  "interchangeVersion": 1,
  "schemaVersion": 3,
  "projectKey": "language-intelligence",
  "revision": 1,
  "savedAt": "2026-09-28T09:00:00.000Z",
  "project": {
    "schemaVersion": 3,
    "entities": [
      {
        "id": "alice",
        "type": "person",
        "name": "Alice",
        "alternateNames": [],
        "sourceIds": [],
        "attributes": {}
      },
      {
        "id": "bob",
        "type": "person",
        "name": "Bob",
        "alternateNames": [],
        "sourceIds": [],
        "attributes": {}
      }
    ],
    "relationships": [
      {
        "id": "rel-1",
        "subjectId": "alice",
        "predicate": "warns",
        "objectId": "bob",
        "itemIds": [],
        "sourceIds": [],
        "confidence": 1,
        "time": null,
        "attributes": {}
      }
    ]
  }
}`;

function positionOf(text, needle, innerOffset = 0) {
  const offset = text.indexOf(needle);
  assert.notEqual(offset, -1, `Missing test needle: ${needle}`);
  const target = offset + innerOffset;
  const before = text.slice(0, target).split("\n");
  return { line: before.length - 1, character: before.at(-1).length };
}

function createHarness(text = source) {
  const messages = [];
  const server = createLumLanguageServer((message) => messages.push(message));
  server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  server.handle({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: { textDocument: { uri, languageId: "lum", version: 1, text } },
  });
  return { server, messages };
}

function response(messages, id) {
  return messages.find((message) => message.id === id);
}

test("Lūm LSP advertises language-intelligence capabilities", () => {
  const { messages } = createHarness();
  const initialized = response(messages, 1);
  assert.equal(
    initialized.result.capabilities.completionProvider.triggerCharacters.includes('"'),
    true,
  );
  assert.equal(initialized.result.capabilities.hoverProvider, true);
  assert.equal(initialized.result.capabilities.documentSymbolProvider, true);
  assert.equal(initialized.result.capabilities.definitionProvider, true);
  assert.equal(initialized.result.capabilities.referencesProvider, true);
  assert.equal(initialized.result.capabilities.semanticTokensProvider.full, true);
});

test("Lūm LSP completes compatible canonical IDs only", () => {
  const editable = source.replace('"subjectId": "alice"', '"subjectId": ""');
  const { server, messages } = createHarness(editable);
  const position = positionOf(editable, '"subjectId": ""', '"subjectId": "'.length);
  server.handle({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/completion",
    params: { textDocument: { uri }, position },
  });
  const labels = response(messages, 2).result.map((item) => item.label);
  assert.deepEqual(labels.sort(), ["alice", "bob"]);
  assert.equal(labels.includes("rel-1"), false);
});

test("Lūm LSP provides field hover and document symbols", () => {
  const { server, messages } = createHarness();
  const hoverPosition = positionOf(source, '"subjectId"', 2);
  server.handle({
    jsonrpc: "2.0",
    id: 3,
    method: "textDocument/hover",
    params: { textDocument: { uri }, position: hoverPosition },
  });
  assert.match(response(messages, 3).result.contents.value, /entity.*subject/i);

  server.handle({
    jsonrpc: "2.0",
    id: 4,
    method: "textDocument/documentSymbol",
    params: { textDocument: { uri } },
  });
  const symbols = response(messages, 4).result;
  const entities = symbols.find((symbol) => symbol.name.startsWith("entities"));
  assert.ok(entities);
  assert.ok(entities.children.some((symbol) => symbol.name.includes("alice")));
  assert.ok(symbols.some((symbol) => symbol.name.startsWith("relationships")));
});

test("Lūm LSP navigates canonical references to declarations and back", () => {
  const { server, messages } = createHarness();
  const referencePosition = positionOf(source, '"subjectId": "alice"', '"subjectId": "'.length + 2);
  server.handle({
    jsonrpc: "2.0",
    id: 5,
    method: "textDocument/definition",
    params: { textDocument: { uri }, position: referencePosition },
  });
  const definition = response(messages, 5).result;
  assert.equal(definition.uri, uri);
  assert.ok(definition.range.start.line < referencePosition.line);

  const declarationPosition = positionOf(source, '"id": "alice"', '"id": "'.length + 2);
  server.handle({
    jsonrpc: "2.0",
    id: 6,
    method: "textDocument/references",
    params: {
      textDocument: { uri },
      position: declarationPosition,
      context: { includeDeclaration: true },
    },
  });
  const references = response(messages, 6).result;
  assert.ok(references.length >= 2);
  assert.ok(
    references.some((location) => location.range.start.line === definition.range.start.line),
  );
  assert.ok(references.some((location) => location.range.start.line === referencePosition.line));
});

test("Lūm LSP resolves story occurrenceIds to relationship-derived occurrences", () => {
  const parsed = JSON.parse(source);
  parsed.project.stories = [
    {
      id: "story-1",
      title: "Warnings",
      occurrenceIds: ["rel-1"],
      placeIds: [],
      attributes: {},
    },
  ];
  const storySource = JSON.stringify(parsed, null, 2);
  const { server, messages } = createHarness(storySource);
  const referencePosition = positionOf(
    storySource,
    '"occurrenceIds": [\n          "rel-1"',
    '"occurrenceIds": [\n          "'.length + 2,
  );

  server.handle({
    jsonrpc: "2.0",
    id: 9,
    method: "textDocument/definition",
    params: { textDocument: { uri }, position: referencePosition },
  });
  const definition = response(messages, 9).result;
  const relationshipDeclaration = positionOf(storySource, '"id": "rel-1"', '"id": "'.length + 2);
  assert.equal(definition.range.start.line, relationshipDeclaration.line);

  const completionSource = storySource.replace(
    '"occurrenceIds": [\n          "rel-1"\n        ]',
    '"occurrenceIds": [\n          ""\n        ]',
  );
  const completionHarness = createHarness(completionSource);
  const completionPosition = positionOf(
    completionSource,
    '"occurrenceIds": [\n          ""',
    '"occurrenceIds": [\n          "'.length,
  );
  completionHarness.server.handle({
    jsonrpc: "2.0",
    id: 10,
    method: "textDocument/completion",
    params: { textDocument: { uri }, position: completionPosition },
  });
  const labels = response(completionHarness.messages, 10).result.map((item) => item.label);
  assert.ok(labels.includes("rel-1"));
});

test("Lūm LSP emits semantic tokens and survives incomplete JSON", () => {
  const { server, messages } = createHarness();
  server.handle({
    jsonrpc: "2.0",
    id: 7,
    method: "textDocument/semanticTokens/full",
    params: { textDocument: { uri } },
  });
  assert.ok(response(messages, 7).result.data.length > 0);

  const malformed = source.replace('"objectId": "bob",', '"objectId": ');
  const malformedHarness = createHarness(malformed);
  malformedHarness.server.handle({
    jsonrpc: "2.0",
    id: 8,
    method: "textDocument/semanticTokens/full",
    params: { textDocument: { uri } },
  });
  const malformedResponse = response(malformedHarness.messages, 8);
  assert.ok(malformedResponse);
  assert.ok(Array.isArray(malformedResponse.result.data));
});
