import assert from "node:assert/strict";
import test from "node:test";

import worker from "../mcp/cloudflare-worker.ts";
import { handlePublicMcpRequest } from "../mcp/public/server.ts";
import {
  authoringGuideResult,
  stageStoryProject,
  validateStoryFragment,
} from "../mcp/public/story-authoring.ts";
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

function validInterchange() {
  const project = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "fixture-source-story",
      savedAt: "2026-09-28T10:20:00.000Z",
    }),
  );
  project.project.sources = [
    {
      id: "source-a",
      kind: "document",
      title: "Exhibit A",
      note: "Alice warned Bob.",
      attributes: { locator: "page 4" },
    },
  ];
  project.project.entities = [
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
      sourceIds: ["source-a"],
      attributes: {},
    },
  ];
  project.project.relationships = [
    {
      id: "rel-a",
      subjectId: "alice",
      predicate: "warns",
      objectId: "bob",
      itemIds: ["occ-a"],
      sourceIds: ["source-a"],
      confidence: 1,
      time: null,
      attributes: {},
    },
  ];
  project.project.occurrences = [
    {
      id: "occ-a",
      title: "Alice warns Bob",
      time: null,
      participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
      relationshipIds: ["rel-a"],
      sourceIds: ["source-a"],
      confidence: 1,
      attributes: {},
    },
  ];
  project.project.stories = [
    {
      id: "story-a",
      title: "Fixture story",
      occurrenceIds: ["occ-a"],
      placeIds: [],
      attributes: {},
    },
  ];
  return project;
}

test("MCP authoring guide exposes canonical project/module format identifiers", () => {
  const guide = authoringGuideResult();
  assert.equal(guide.formats.project.schema, LUM_PROJECT_SCHEMA_ID);
  assert.equal(guide.formats.project.format, "lum-project");
  assert.equal(guide.formats.module.schema, LUM_PROJECT_MODULE_SCHEMA_ID);
  assert.equal(guide.formats.module.format, "lum-project-module");
  assert.equal(guide.publicEndpointBehavior.truthVerification, false);
});

test("fragment validation uses the exact project-module diagnostic vocabulary", () => {
  const fragment = JSON.parse(
    createProjectModule({
      projectKey: "fixture-source-story",
      storyId: "story-a",
      collection: "entities",
      records: [
        {
          id: "alice",
          type: "person",
          name: "Alice",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      ],
    }),
  );
  fragment.records[0].camera = { zoom: 4 };

  const result = validateStoryFragment(fragment);
  assert.equal(result.valid, false);
  assert.equal(result.syntaxValid, true);
  assert.equal(result.semanticScope, "fragment-structural");
  assert.ok(result.diagnostics.some((finding) => finding.code === "unknown-field"));
  assert.ok(result.diagnostics.some((finding) => finding.path === "/records/0/camera"));
});

test("whole-project staging uses canonical interchange validation and keeps factual verification separate", () => {
  const project = validInterchange();
  const result = stageStoryProject({
    project,
    sources: [{ id: "source-a", title: "Exhibit A", locator: "page 4" }],
    unresolved: ["Exact clock time is not established."],
    generationNotes: "Only Exhibit A was used.",
  });

  assert.equal(result.status, "ready-for-user-verification");
  assert.equal(result.preflight.valid, true);
  assert.equal(result.preflight.syntaxValid, true);
  assert.equal(result.preflight.semanticValid, true);
  assert.equal(result.preflight.factualVerification, "required");
  assert.equal(result.verificationRequired, true);
  assert.equal(result.project.format, "lum-project");
  assert.deepEqual(result.unresolved, ["Exact clock time is not established."]);
});

test("whole-project staging cannot become ready when canonical references are invalid", () => {
  const project = validInterchange();
  project.project.relationships[0].objectId = "missing-bob";
  const result = stageStoryProject({ project, sources: [{ id: "source-a" }] });

  assert.equal(result.status, "needs-repair");
  assert.equal(result.preflight.valid, false);
  assert.equal(result.preflight.semanticValid, false);
  assert.ok(result.preflight.diagnostics.some((finding) => finding.code === "invalid-project"));
  assert.equal(result.verificationRequired, true);
});

test("modern MCP advertises canonical guide, fragment validation, and final staging", async () => {
  const response = await handlePublicMcpRequest(rpcRequest("tools/list", {}, { modern: true }));
  const body = await response.json();
  assert.deepEqual(
    body.result.tools.map((tool) => tool.name),
    ["lum.get_story_authoring_guide", "lum.validate_project_fragment", "lum.stage_story_project"],
  );
});

test("fragment MCP tool returns structured stable diagnostics", async () => {
  const bad = {
    $schema: LUM_PROJECT_MODULE_SCHEMA_ID,
    format: "lum-project-module",
    moduleVersion: 1,
    canonicalSchemaVersion: 3,
    projectSchema: LUM_PROJECT_SCHEMA_ID,
    projectKey: "fixture-source-story",
    storyId: "story-a",
    collection: "entities",
    records: [
      {
        id: "alice",
        type: "person",
        name: "Alice",
        alternateNames: [],
        sourceIds: [],
        attributes: {},
        camera: {},
      },
    ],
  };
  const response = await handlePublicMcpRequest(
    rpcRequest(
      "tools/call",
      { name: "lum.validate_project_fragment", arguments: { fragment: bad } },
      { modern: true, name: "lum.validate_project_fragment" },
    ),
  );
  const body = await response.json();
  const result = body.result.structuredContent;
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((finding) => finding.path === "/records/0/camera"));
});

test("MCP staging agrees with the browser/import interchange validator on canonical fixtures", async () => {
  const project = validInterchange();
  const response = await handlePublicMcpRequest(
    rpcRequest(
      "tools/call",
      {
        name: "lum.stage_story_project",
        arguments: {
          project,
          sources: [{ id: "source-a", title: "Exhibit A", locator: "page 4" }],
          unresolved: [],
        },
      },
      { modern: true, name: "lum.stage_story_project" },
    ),
  );
  const body = await response.json();
  assert.equal(body.result.structuredContent.preflight.valid, true);
  assert.equal(body.result.structuredContent.status, "ready-for-user-verification");
  assert.equal(body.result.structuredContent.project.$schema, LUM_PROJECT_SCHEMA_ID);
});

test("legacy Streamable HTTP remains stateless with the canonical tools", async () => {
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

test("Cloudflare worker still exposes health and MCP routes", async () => {
  const health = await worker.fetch(new Request("https://mcp.example/healthz"), {});
  assert.equal(health.status, 200);
  const mcp = await worker.fetch(rpcRequest("tools/list"), {});
  assert.equal(mcp.status, 200);
});
