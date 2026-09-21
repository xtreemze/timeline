import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/memgraph-interchange-shim.ts");
await import("../site/webmcp-shim.ts");

const memgraph = globalThis.TimelineMemgraphInterchange;
const webmcp = globalThis.TimelineWebMCP;

function projectFixture() {
  return {
    version: 2,
    title: "Agent project",
    categories: [{ id: "incident", name: "Incident", color: "#b42318" }],
    items: [
      {
        id: "event-a",
        kind: "event",
        start: "2026-09-20",
        end: null,
        title: "Alice calls Bob",
        description: "",
        categoryId: "incident",
        itemIds: [],
      },
    ],
    stories: [{ id: "story-a", title: "Story", description: "", itemIds: ["event-a"] }],
    entities: [
      { id: "alice", type: "person", name: "Alice", attributes: {} },
      { id: "bob", type: "person", name: "Bob", attributes: {} },
    ],
    places: [
      {
        id: "place-a",
        name: "Office",
        geometry: { type: "Point", coordinates: [18, 59] },
        icon: "place",
        markerShape: "pin",
      },
    ],
    relationships: [
      {
        id: "rel-a",
        subjectId: "alice",
        objectId: "bob",
        predicate: "searchesFor",
        placeId: "place-a",
        itemIds: ["event-a"],
        attributes: {},
      },
    ],
    evidence: [{ id: "source-a", type: "note", title: "Source", sourceName: "Fixture" }],
    custodyActions: [],
    reasoning: {},
  };
}

test("WebMCP transaction editing can manage every canonical collection atomically", () => {
  const base = projectFixture();
  const edited = webmcp.applyOperations(base, [
    { op: "set", field: "title", value: "AI managed" },
    {
      op: "upsert",
      collection: "entities",
      id: "charlie",
      value: { type: "person", name: "Charlie", attributes: {} },
    },
    {
      op: "upsert",
      collection: "relationships",
      id: "rel-b",
      value: { subjectId: "charlie", objectId: "alice", predicate: "calls", itemIds: [] },
    },
    {
      op: "patch",
      collection: "stories",
      id: "story-a",
      value: { description: "Updated by agent" },
    },
    { op: "delete", collection: "evidence", id: "source-a" },
  ]);

  assert.equal(edited.title, "AI managed");
  assert.equal(edited.entities.find((entity) => entity.id === "charlie")?.name, "Charlie");
  assert.equal(
    edited.relationships.find((relationship) => relationship.id === "rel-b")?.subjectId,
    "charlie",
  );
  assert.equal(edited.stories[0].description, "Updated by agent");
  assert.equal(edited.evidence.length, 0);
});

test("WebMCP deletes preserve referential integrity before strict app validation", () => {
  const base = projectFixture();
  const withoutItem = webmcp.applyOperations(base, [
    { op: "delete", collection: "items", id: "event-a" },
  ]);
  assert.deepEqual(withoutItem.stories[0].itemIds, []);
  assert.deepEqual(withoutItem.relationships[0].itemIds, []);

  const withoutEntity = webmcp.applyOperations(base, [
    { op: "delete", collection: "entities", id: "bob" },
  ]);
  assert.equal(withoutEntity.relationships.length, 0);

  const withoutPlace = webmcp.applyOperations(base, [
    { op: "delete", collection: "places", id: "place-a" },
  ]);
  assert.equal(withoutPlace.relationships[0].placeId, "");
});

test("WebMCP registers current document.modelContext tools with mutation annotations", async () => {
  const registered = [];
  const modelContext = {
    async registerTool(tool, options) {
      registered.push({ tool, options });
    },
  };
  const adapter = {
    getProject: () => projectFixture(),
    getGraphContract: () => ({
      version: "2026-09-21.1",
      rules: {
        selfLoops: "forbidden",
        predicateSemantics: "one-action-verb-plus-optional-particle-no-entities",
      },
    }),
    auditGraph: () => ({ valid: true, graphContractVersion: "2026-09-21.1", errors: [] }),
    validateProject: () => ({ valid: true, errors: [] }),
    applyOperations: (operations) => ({ appliedOperations: operations.length }),
    replaceProject: () => ({ ok: true }),
    exportMemgraph: () => ({ format: "timeline-memgraph-v1" }),
    importMemgraph: () => ({ ok: true }),
  };

  const result = await webmcp.register(adapter, { modelContext });
  assert.equal(result.registered, true);
  assert.deepEqual(result.toolNames, [
    "timeline.get_project",
    "timeline.get_graph_contract",
    "timeline.audit_graph",
    "timeline.validate_project",
    "timeline.apply_transaction",
    "timeline.replace_project",
    "timeline.memgraph_export",
    "timeline.memgraph_import",
  ]);
  assert.equal(registered[0].tool.annotations.readOnlyHint, true);
  assert.equal(registered[0].tool.annotations.openWorldHint, false);
  assert.equal(registered[4].tool.annotations.consequentialHint, true);
  assert.equal(registered[4].tool.annotations.destructiveHint, true);
  assert.equal(registered[4].tool.annotations.openWorldHint, false);
  assert.equal(registered[4].options.signal instanceof AbortSignal, true);
  assert.equal((await registered[1].tool.execute()).version, "2026-09-21.1");
  await assert.rejects(
    () =>
      registered[4].tool.execute({
        graphContractVersion: "stale",
        operations: [{ op: "set", field: "title", value: "x" }],
      }),
    /Graph contract version mismatch/,
  );
  assert.deepEqual(
    await registered[4].tool.execute({
      graphContractVersion: "2026-09-21.1",
      operations: [{ op: "set", field: "title", value: "x" }],
    }),
    { appliedOperations: 1 },
  );
  result.dispose();
  assert.equal(registered[0].options.signal.aborted, true);
});

test("Memgraph export preserves Timeline action direction, predicate, namespace, and round-trip payload", () => {
  const project = projectFixture();
  const bundle = memgraph.exportBundle(project, { namespace: "case-17" });

  assert.equal(bundle.format, "timeline-memgraph-v1");
  assert.equal(bundle.namespace, "case-17");
  assert.equal(memgraph.relationshipType("searchesFor"), "SEARCHES_FOR");
  assert.ok(
    bundle.setupCypher.some((query) => /TimelineEntity.*timelineKey IS UNIQUE/.test(query)),
  );
  assert.ok(bundle.replacePrelude.every((query) => /case-17/.test(query)));
  assert.ok(bundle.statements.some((query) => /:SEARCHES_FOR/.test(query)));
  assert.ok(bundle.statements.some((query) => /timelineProjectId = 'case-17'/.test(query)));
  assert.match(bundle.queries.relationships, /recordJson/);
  assert.deepEqual(bundle.records.entities, project.entities);
  assert.deepEqual(bundle.records.relationships, project.relationships);
});

test("Memgraph MCP query rows import back into the matching Timeline collections", () => {
  const base = projectFixture();
  const entity = { id: "alice", type: "person", name: "Alice Updated", attributes: {} };
  const relationship = {
    id: "rel-updated",
    subjectId: "alice",
    objectId: "bob",
    predicate: "calls",
    itemIds: [],
    attributes: {},
  };
  const imported = memgraph.importSnapshot(
    {
      entities: [
        { recordJson: JSON.stringify(entity) },
        { recordJson: JSON.stringify(base.entities[1]) },
      ],
      relationships: [{ recordJson: JSON.stringify(relationship) }],
    },
    base,
  );

  assert.equal(imported.entities[0].name, "Alice Updated");
  assert.deepEqual(imported.relationships, [relationship]);
  assert.deepEqual(imported.items, base.items);
  assert.deepEqual(imported.stories, base.stories);
});

test("browser runtime loads WebMCP before app and wires tools to canonical persistence/rendering", async () => {
  const [html, app, webmcpSource, memgraphSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/webmcp.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/memgraph-interchange.ts", import.meta.url), "utf8"),
  ]);

  const memgraphIndex = html.indexOf("./memgraph-interchange-shim.ts");
  const webmcpIndex = html.indexOf("./webmcp-shim.ts");
  const appIndex = html.indexOf("./app.ts");
  assert.ok(memgraphIndex >= 0, "Memgraph interchange shim must be loaded");
  assert.ok(webmcpIndex > memgraphIndex, "WebMCP must load after Memgraph interchange");
  assert.ok(appIndex > webmcpIndex, "app must load after WebMCP");
  assert.match(webmcpSource, /document\?\.modelContext|globalThis\.document\?\.modelContext/);
  assert.match(webmcpSource, /timeline\.get_graph_contract/);
  assert.match(webmcpSource, /timeline\.audit_graph/);
  assert.match(webmcpSource, /graphContractVersion/);
  assert.match(webmcpSource, /timeline\.apply_transaction/);
  assert.match(webmcpSource, /timeline\.replace_project/);
  assert.match(webmcpSource, /timeline\.memgraph_export/);
  assert.match(webmcpSource, /timeline\.memgraph_import/);
  assert.match(memgraphSource, /TimelineEntity/);
  assert.match(memgraphSource, /recordJson/);
  assert.match(app, /globalThis\.TimelineAgentAPI = agentApi/);
  assert.match(app, /webMcp\s*\.register\s*\(agentApi\)/);
  assert.match(app, /applyImportedTimeline\(normalized, "AI updated"\)/);
  assert.match(app, /persist\(\)[\s\S]*renderAll\(\)/);
});
