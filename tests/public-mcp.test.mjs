import assert from "node:assert/strict";
import test from "node:test";

import worker from "../mcp/cloudflare-worker.ts";
import {
  preflightStoryProject,
  stageStoryProject,
  validateStoryProjectModule,
} from "../mcp/public/story-authoring.ts";
import { handlePublicMcpRequest } from "../mcp/public/server.ts";
import {
  createEmptyProjectInterchange,
  LUM_PROJECT_SCHEMA_ID,
} from "../src/application/project-interchange.ts";
import {
  createProjectModule,
  LUM_PROJECT_MODULE_SCHEMA_ID,
} from "../src/application/project-module.ts";

const modernHeaders = (method, name = "") => ({
  "Content-Type": "application/json",
  "MCP-Protocol-Version": "2026-07-28",
  "Mcp-Method": method,
  ...(name ? { "Mcp-Name": name } : {}),
});

function rpcRequest(method, params = {}, { modern = false, name = "" } = {}) {
  return new Request("https://mcp.example/mcp", {
    method: "POST",
    headers: modern ? modernHeaders(method, name) : { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "test-1",
      method,
      params: modern
        ? {
            ...params,
            _meta: {
              ...(params._meta || {}),
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            },
          }
        : params,
    }),
  });
}

function time(value = "2026-01-02") {
  return {
    type: "instant",
    start: {
      value,
      precision: "day",
      certainty: "exact",
      calendar: "gregorian",
      timeZone: null,
      utcOffset: null,
      sourceText: value,
    },
    end: null,
  };
}

function validProject() {
  const doc = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "fixture-source-story",
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
      id: "rel-alice-warns-bob",
      subjectId: "alice",
      objectId: "bob",
      predicate: "warns",
      itemIds: ["event-a"],
      sourceIds: ["src-a"],
      confidence: 1,
      time: time(),
      attributes: {},
    },
  ];
  doc.project.occurrences = [
    {
      id: "event-a",
      title: "Alice warns Bob",
      time: time(),
      participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
      relationshipIds: ["rel-alice-warns-bob"],
      sourceIds: ["src-a"],
      confidence: 1,
      attributes: {},
    },
  ];
  doc.project.places = [];
  doc.project.sources = [
    {
      id: "src-a",
      kind: "document",
      title: "Exhibit A",
      sourceName: "Fixture",
      note: "Alice warned Bob on 2026-01-02.",
      attributes: { sourceLocator: { kind: "page", value: "4" } },
    },
  ];
  doc.project.categories = [];
  doc.project.stories = [
    {
      id: "story-a",
      title: "Fixture story",
      description: "A source-grounded fixture.",
      occurrenceIds: ["event-a"],
      placeIds: [],
      attributes: {},
    },
  ];
  return doc;
}

test("document story preflight accepts canonical Lūm interchange", () => {
  const result = preflightStoryProject(validProject());

  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.summary, {
    stories: 1,
    occurrences: 1,
    entities: 2,
    relationships: 1,
    places: 0,
    sources: 1,
    categories: 0,
  });
});

test("document story preflight returns canonical diagnostic codes and JSON Pointer scope", () => {
  const project = validProject();
  project.project.relationships[0].objectId = "missing";

  const result = preflightStoryProject(project);

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "invalid-project"));
  assert.ok(result.diagnostics.every((diagnostic) => typeof diagnostic.path === "string"));
});

test("document story staging preserves unresolved facts and requires verification", () => {
  const project = validProject();
  const result = stageStoryProject({
    project,
    sources: [{ id: "src-a", title: "Exhibit A", mediaType: "application/pdf" }],
    unresolved: ["The source does not establish the meeting location."],
    generationNotes: "Only Exhibit A was used.",
  });

  assert.equal(result.status, "ready-for-user-verification");
  assert.equal(result.verificationRequired, true);
  assert.equal(result.project.$schema, LUM_PROJECT_SCHEMA_ID);
  assert.match(result.verificationInstructions.join(" "), /audit_graph/);
  assert.deepEqual(result.unresolved, [
    "The source does not establish the meeting location.",
  ]);
});

test("bounded module validation uses shared module diagnostics", () => {
  const serialized = createProjectModule({
    projectKey: "fixture-source-story",
    storyId: "story-a",
    collection: "entities",
    records: [],
  });
  const valid = validateStoryProjectModule(JSON.parse(serialized));
  assert.equal(valid.valid, true);
  assert.equal(valid.validationScope, "module");

  const invalidModule = JSON.parse(serialized);
  invalidModule.camera = {};
  const invalid = validateStoryProjectModule(invalidModule);
  assert.equal(invalid.valid, false);
  assert.ok(
    invalid.diagnostics.some(
      (diagnostic) => diagnostic.code === "unknown-field" && diagnostic.path === "/camera",
    ),
  );
});

test("modern MCP discovery advertises current and legacy compatibility", async () => {
  const response = await handlePublicMcpRequest(
    rpcRequest("server/discover", {}, { modern: true }),
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.result.resultType, "complete");
  assert.ok(body.result.supportedVersions.includes("2026-07-28"));
  assert.ok(body.result.supportedVersions.includes("2025-11-25"));
  assert.match(body.result.instructions, /canonical Lūm interchange/i);
});

test("modern MCP tool discovery exposes canonical guide, staging and module validation tools", async () => {
  const response = await handlePublicMcpRequest(
    rpcRequest("tools/list", {}, { modern: true }),
  );
  const body = await response.json();
  const names = body.result.tools.map((tool) => tool.name);

  assert.deepEqual(names, [
    "lum.get_story_authoring_guide",
    "lum.stage_story_project",
    "lum.validate_project_module",
  ]);
  assert.equal(body.result.resultType, "complete");
  assert.equal(body.result.cacheScope, "public");
});

test("modern story guide publishes canonical schema capabilities", async () => {
  const response = await handlePublicMcpRequest(
    rpcRequest(
      "tools/call",
      {
        name: "lum.get_story_authoring_guide",
        arguments: {},
      },
      { modern: true, name: "lum.get_story_authoring_guide" },
    ),
  );
  const body = await response.json();
  const content = body.result.structuredContent;

  assert.match(content.guide, /canonical Lūm interchange/i);
  assert.equal(content.format.projectSchema, LUM_PROJECT_SCHEMA_ID);
  assert.equal(content.format.moduleSchema, LUM_PROJECT_MODULE_SCHEMA_ID);
  assert.equal(content.projectTemplate.format, "lum-project");
  assert.equal(content.projectTemplate.interchangeVersion, 1);
  assert.equal(content.publicEndpointBehavior.stateless, true);
  assert.equal(content.minimalValidExample.project.stories[0].id, "story-exhibit-a");
});

test("modern staging tool returns canonical proposal for later verification", async () => {
  const response = await handlePublicMcpRequest(
    rpcRequest(
      "tools/call",
      {
        name: "lum.stage_story_project",
        arguments: {
          project: validProject(),
          sources: [
            {
              id: "src-a",
              title: "Exhibit A",
              mediaType: "application/pdf",
              locator: "page 4",
            },
          ],
          unresolved: [],
          generationNotes: "Fixture.",
        },
      },
      { modern: true, name: "lum.stage_story_project" },
    ),
  );
  const body = await response.json();

  assert.equal(body.result.structuredContent.status, "ready-for-user-verification");
  assert.equal(body.result.structuredContent.preflight.valid, true);
  assert.equal(body.result.structuredContent.project.format, "lum-project");
});

test("modern module validation tool returns bounded diagnostics", async () => {
  const module = JSON.parse(
    createProjectModule({
      projectKey: "fixture-source-story",
      storyId: "story-a",
      collection: "entities",
      records: [],
    }),
  );
  const response = await handlePublicMcpRequest(
    rpcRequest(
      "tools/call",
      {
        name: "lum.validate_project_module",
        arguments: { module },
      },
      { modern: true, name: "lum.validate_project_module" },
    ),
  );
  const body = await response.json();
  assert.equal(body.result.structuredContent.valid, true);
  assert.equal(body.result.structuredContent.validationScope, "module");
});

test("legacy Streamable HTTP initialize and tools/list remain stateless", async () => {
  const initialize = await handlePublicMcpRequest(
    rpcRequest("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "fixture", version: "1.0.0" },
    }),
  );
  const initializeBody = await initialize.json();
  assert.equal(initializeBody.result.protocolVersion, "2025-11-25");
  assert.equal(initialize.headers.get("Mcp-Session-Id"), null);

  const list = await handlePublicMcpRequest(rpcRequest("tools/list"));
  const listBody = await list.json();
  assert.equal(listBody.result.tools.length, 3);
});

test("modern routing headers are enforced", async () => {
  const request = rpcRequest("tools/list", {}, { modern: true });
  const headers = new Headers(request.headers);
  headers.set("Mcp-Method", "resources/list");
  const broken = new Request(request.url, {
    method: "POST",
    headers,
    body: await request.text(),
  });

  const response = await handlePublicMcpRequest(broken);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, -32020);
});

test("Cloudflare worker exposes health, verification challenge, and MCP routes", async () => {
  const health = await worker.fetch(
    new Request("https://mcp.example/healthz"),
    {},
  );
  assert.equal(health.status, 200);
  assert.equal((await health.json()).endpoint, "/mcp");

  const challenge = await worker.fetch(
    new Request("https://mcp.example/.well-known/openai-apps-challenge"),
    { OPENAI_APPS_CHALLENGE: "challenge-token" },
  );
  assert.equal(await challenge.text(), "challenge-token");

  const mcp = await worker.fetch(
    rpcRequest("tools/list"),
    {},
  );
  assert.equal(mcp.status, 200);
});
