import assert from "node:assert/strict";
import test from "node:test";

import worker from "../mcp/cloudflare-worker.ts";
import {
  preflightStoryProject,
  stageStoryProject,
} from "../mcp/public/story-authoring.ts";
import { handlePublicMcpRequest } from "../mcp/public/server.ts";

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
  return {
    version: 2,
    title: "Fixture source story",
    categories: [],
    evidence: [
      {
        id: "src-a",
        type: "document",
        title: "Exhibit A",
        sourceName: "Fixture",
        note: "Alice warned Bob on 2026-01-02.",
        extensions: {
          sourceLocator: { kind: "page", value: "4" },
        },
      },
    ],
    stories: [
      {
        id: "story-a",
        title: "Fixture story",
        description: "A source-grounded fixture.",
        itemIds: ["event-a"],
      },
    ],
    items: [
      {
        id: "event-a",
        kind: "event",
        start: "2026-01-02",
        end: null,
        time: time(),
        title: "Alice warns Bob",
        description: "Alice warned Bob.",
        categoryId: "",
        evidenceIds: ["src-a"],
        media: [],
        relationChanges: [],
        extensions: {
          narrative: {
            storyId: "story-a",
            sequence: 1,
          },
        },
      },
    ],
    entities: [
      {
        id: "alice",
        type: "person",
        name: "Alice",
        alternateNames: [],
        identifiers: [],
        sourceIds: ["src-a"],
        attributes: { storyId: "story-a" },
      },
      {
        id: "bob",
        type: "person",
        name: "Bob",
        alternateNames: [],
        identifiers: [],
        sourceIds: ["src-a"],
        attributes: { storyId: "story-a" },
      },
    ],
    places: [],
    relationships: [
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
    ],
    custodyActions: [],
    reasoning: {},
    extensions: {},
  };
}

test("document story preflight accepts a complete source-grounded project", () => {
  const result = preflightStoryProject(validProject(), [
    {
      id: "src-a",
      title: "Exhibit A",
      mediaType: "application/pdf",
      locator: "page 4",
    },
  ]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, {
    stories: 1,
    items: 1,
    entities: 2,
    relationships: 1,
    places: 0,
    evidence: 1,
    sources: 1,
  });
});

test("document story staging preserves unresolved facts and requires verification", () => {
  const result = stageStoryProject({
    project: validProject(),
    sources: [{ id: "src-a", title: "Exhibit A", mediaType: "application/pdf" }],
    unresolved: ["The source does not establish the meeting location."],
    generationNotes: "Only Exhibit A was used.",
  });

  assert.equal(result.status, "ready-for-user-verification");
  assert.equal(result.verificationRequired, true);
  assert.match(result.verificationInstructions.join(" "), /audit_graph/);
  assert.deepEqual(result.unresolved, [
    "The source does not establish the meeting location.",
  ]);
});

test("document story preflight rejects uncovered named entities", () => {
  const project = validProject();
  project.entities.push({
    id: "carol",
    type: "person",
    name: "Carol",
    alternateNames: [],
    identifiers: [],
    sourceIds: ["src-a"],
    attributes: { storyId: "story-a" },
  });
  project.items[0].description = "Alice warned Bob while Carol watched.";

  const result = preflightStoryProject(project, [{ id: "src-a" }]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Carol/);
  assert.match(result.errors.join("\n"), /action relationship linked to this item/i);
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
  assert.match(body.result.instructions, /source-grounded/i);
});

test("modern MCP tool discovery exposes guide and story staging tools", async () => {
  const response = await handlePublicMcpRequest(
    rpcRequest("tools/list", {}, { modern: true }),
  );
  const body = await response.json();
  const names = body.result.tools.map((tool) => tool.name);

  assert.deepEqual(names, [
    "lum.get_story_authoring_guide",
    "lum.stage_story_project",
  ]);
  assert.equal(body.result.resultType, "complete");
  assert.equal(body.result.cacheScope, "public");
});

test("modern story guide tool supplies initial from-scratch guidance", async () => {
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
  const guide = body.result.structuredContent.guide;

  assert.match(guide, /Read the user-provided source material before creating canonical records/);
  assert.match(guide, /Build a complete project from scratch/);
  assert.match(guide, /User verification is mandatory/);
  assert.equal(body.result.structuredContent.publicEndpointBehavior.stateless, true);
  assert.match(
    body.result.structuredContent.fieldReference.project.items,
    /chronology item/i,
  );
  assert.equal(
    body.result.structuredContent.minimalValidExample.stories[0].id,
    "story-exhibit-a",
  );
});

test("modern staging tool returns a complete proposal for later verification", async () => {
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
  assert.equal(body.result.structuredContent.project.title, "Fixture source story");
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
  assert.equal(listBody.result.tools.length, 2);
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
