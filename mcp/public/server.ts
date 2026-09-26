import {
  DOCUMENT_STORY_GUIDE,
  authoringGuideResult,
  stageStoryProject,
} from "./story-authoring.ts";

type JsonRecord = Record<string, unknown>;
type JsonRpcId = string | number | null;

const SERVER_NAME = "lum-public-mcp";
const SERVER_VERSION = "0.4.0";
const MODERN_VERSION = "2026-07-28";
const LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
const SUPPORTED_VERSIONS = [MODERN_VERSION, ...LEGACY_VERSIONS] as const;
const MAX_REQUEST_CHARS = 5_000_000;

const SERVER_INSTRUCTIONS =
  "Build source-grounded Lūm story proposals from user-provided documents/text. " +
  "For new projects, call lum.get_story_authoring_guide before authoring. " +
  "Read uploaded documents in the host; do not send raw document binaries to this server. " +
  "Construct the complete project, preserve uncertainty and evidence locators, then call " +
  "lum.stage_story_project. A successful preflight is structural only: the user must import " +
  "the proposal into Lūm and verify it with the live graph audit/project validator.";

const EMPTY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;

const SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 160 },
    title: { type: "string", maxLength: 500 },
    mediaType: { type: "string", maxLength: 160 },
    locator: { type: "string", maxLength: 1000 },
    digest: { type: "string", maxLength: 256 },
  },
  required: ["id"],
} as const;

const TOOLS = Object.freeze([
  {
    name: "lum.get_story_authoring_guide",
    title: "Get Lūm story authoring guide",
    description:
      "Return the source-first workflow, graph contract, and blank project template for generating a complete Lūm story from uploaded documents or supplied text.",
    inputSchema: EMPTY_SCHEMA,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "lum.stage_story_project",
    title: "Stage a source-derived Lūm story project",
    description:
      "Preflight and package a complete source-derived Lūm project for user verification. This tool is stateless, does not persist documents or mutate a browser project, and does not assert factual truth.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project: {
          type: "object",
          description:
            "Complete Lūm project proposal with stories, chronology items, entities, relationships, evidence, and optional places/categories.",
        },
        sources: {
          type: "array",
          maxItems: 128,
          items: SOURCE_SCHEMA,
          description:
            "Small manifest of the uploaded/provided sources. Keep raw document contents in the host instead of sending them here.",
        },
        unresolved: {
          type: "array",
          maxItems: 1000,
          items: { type: "string", maxLength: 2000 },
          description:
            "Facts or modeling questions the sources do not support strongly enough to canonicalize.",
        },
        generationNotes: {
          type: "string",
          maxLength: 10000,
          description: "Short notes about source scope, assumptions, and omitted material.",
        },
      },
      required: ["project", "sources"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
]);

const RESOURCE = Object.freeze({
  uri: "lum://authoring/document-story",
  name: "Lūm document-to-story authoring guide",
  title: "Lūm document-to-story authoring guide",
  description:
    "Provider-neutral source-first instructions for generating a complete Lūm project from documents/text and handing it to the user for verification.",
  mimeType: "text/markdown",
});

const PROMPT = Object.freeze({
  name: "lum_generate_story_from_sources",
  title: "Generate a Lūm story from sources",
  description:
    "Guide the model to read user-provided documents/text, construct a complete source-grounded Lūm project, stage it, repair structural errors, and hand it to the user for verification.",
  arguments: [
    {
      name: "goal",
      description: "Optional user goal or emphasis for the generated story.",
      required: false,
    },
  ],
});

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function textValue(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function rpcId(value: unknown): JsonRpcId {
  return typeof value === "string" || typeof value === "number" || value === null ? value : null;
}

function isNotification(message: JsonRecord): boolean {
  return !Object.prototype.hasOwnProperty.call(message, "id");
}

function success(id: JsonRpcId, result: unknown): JsonRecord {
  return { jsonrpc: "2.0", id, result };
}

function failure(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRecord {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "MCP-Protocol-Version",
    "Cache-Control": "no-store",
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  const headers = corsHeaders();
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: corsHeaders() });
}

function modernMeta(message: JsonRecord): JsonRecord | null {
  const params = record(message.params);
  return record(params?._meta);
}

function requestedModernVersion(request: Request, message: JsonRecord): string {
  return (
    textValue(request.headers.get("MCP-Protocol-Version"), 80) ||
    textValue(modernMeta(message)?.["io.modelcontextprotocol/protocolVersion"], 80)
  );
}

function modernRequest(request: Request, message: JsonRecord): boolean {
  return (
    requestedModernVersion(request, message) === MODERN_VERSION ||
    textValue(message.method, 120) === "server/discover"
  );
}

function validateModernHeaders(request: Request, message: JsonRecord): string | null {
  const method = textValue(message.method, 160);
  const protocol = textValue(request.headers.get("MCP-Protocol-Version"), 80);
  const routedMethod = textValue(request.headers.get("Mcp-Method"), 160);
  if (protocol !== MODERN_VERSION) {
    return "MCP-Protocol-Version must match 2026-07-28 for modern requests.";
  }
  if (routedMethod !== method) {
    return "Mcp-Method must match the JSON-RPC method.";
  }
  if (method === "tools/call" || method === "prompts/get" || method === "resources/read") {
    const params = record(message.params);
    const bodyName = textValue(
      method === "resources/read" ? params?.uri : params?.name,
      500,
    );
    const routedName = textValue(request.headers.get("Mcp-Name"), 500);
    if (!bodyName || routedName !== bodyName) {
      return "Mcp-Name must match the routed tool, prompt, or resource name.";
    }
  }
  return null;
}

function modernResult(result: JsonRecord): JsonRecord {
  return { resultType: "complete", ...result };
}

function cacheableModern(result: JsonRecord): JsonRecord {
  return modernResult({
    ...result,
    ttlMs: 300_000,
    cacheScope: "public",
  });
}

function toolResult(value: unknown, modern: boolean): JsonRecord {
  const result: JsonRecord = {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
  return modern ? modernResult(result) : result;
}

function errorToolResult(message: string, modern: boolean): JsonRecord {
  const result: JsonRecord = {
    content: [{ type: "text", text: message }],
    isError: true,
  };
  return modern ? modernResult(result) : result;
}

function listTools(modern: boolean): JsonRecord {
  const result = { tools: TOOLS.map((tool) => ({ ...tool })) };
  return modern ? cacheableModern(result) : result;
}

function listPrompts(modern: boolean): JsonRecord {
  const result = { prompts: [{ ...PROMPT }] };
  return modern ? cacheableModern(result) : result;
}

function listResources(modern: boolean): JsonRecord {
  const result = { resources: [{ ...RESOURCE }] };
  return modern ? cacheableModern(result) : result;
}

function promptResult(params: JsonRecord, modern: boolean): JsonRecord {
  const args = record(params.arguments) || {};
  const goal = textValue(args.goal, 2000);
  const content =
    DOCUMENT_STORY_GUIDE +
    (goal ? "\n\n## User goal for this run\n\n" + goal : "");
  const result: JsonRecord = {
    description:
      "Read the user's uploaded documents/text first, then construct and stage a complete Lūm project.",
    messages: [
      {
        role: "user",
        content: { type: "text", text: content },
      },
    ],
  };
  return modern ? modernResult(result) : result;
}

function resourceResult(modern: boolean): JsonRecord {
  const result: JsonRecord = {
    contents: [
      {
        uri: RESOURCE.uri,
        mimeType: RESOURCE.mimeType,
        text: DOCUMENT_STORY_GUIDE,
      },
    ],
  };
  return modern ? cacheableModern(result) : result;
}

function callTool(params: JsonRecord, modern: boolean): JsonRecord {
  const name = textValue(params.name, 240);
  const args = record(params.arguments) || {};

  if (name === "lum.get_story_authoring_guide") {
    return toolResult(authoringGuideResult(), modern);
  }
  if (name === "lum.stage_story_project") {
    const staged = stageStoryProject(args);
    return toolResult(staged, modern);
  }
  return errorToolResult("Unknown Lūm MCP tool: " + (name || "(missing name)"), modern);
}

function initialize(params: JsonRecord): JsonRecord {
  const requested = textValue(params.protocolVersion, 80);
  const protocolVersion = LEGACY_VERSIONS.includes(
    requested as (typeof LEGACY_VERSIONS)[number],
  )
    ? requested
    : LEGACY_VERSIONS[0];

  return {
    protocolVersion,
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    instructions: SERVER_INSTRUCTIONS,
  };
}

function discover(): JsonRecord {
  return cacheableModern({
    supportedVersions: [...SUPPORTED_VERSIONS],
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
    instructions: SERVER_INSTRUCTIONS,
    _meta: {
      "io.modelcontextprotocol/serverInfo": {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    },
  });
}

function route(message: JsonRecord, modern: boolean): JsonRecord | null {
  const id = rpcId(message.id);
  const method = textValue(message.method, 160);
  const params = record(message.params) || {};

  if (method === "server/discover") return success(id, discover());
  if (method === "initialize") return success(id, initialize(params));
  if (method === "ping") return success(id, modern ? modernResult({}) : {});
  if (method === "tools/list") return success(id, listTools(modern));
  if (method === "tools/call") return success(id, callTool(params, modern));
  if (method === "prompts/list") return success(id, listPrompts(modern));
  if (method === "prompts/get") {
    const name = textValue(params.name, 240);
    if (name !== PROMPT.name) {
      return failure(id, -32602, "Unknown prompt: " + (name || "(missing name)"));
    }
    return success(id, promptResult(params, modern));
  }
  if (method === "resources/list") return success(id, listResources(modern));
  if (method === "resources/read") {
    if (textValue(params.uri, 500) !== RESOURCE.uri) {
      return failure(id, -32602, "Unknown resource URI.");
    }
    return success(id, resourceResult(modern));
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }

  return failure(id, -32601, "Method not found: " + (method || "(missing method)"));
}

async function parseMessage(request: Request): Promise<JsonRecord | Response> {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse(
      failure(null, -32600, "Streamable HTTP POST requires Content-Type application/json."),
      415,
    );
  }

  const advertisedLength = Number(request.headers.get("Content-Length") || 0);
  if (advertisedLength > MAX_REQUEST_CHARS) {
    return jsonResponse(failure(null, -32600, "MCP request payload is too large."), 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_REQUEST_CHARS) {
    return jsonResponse(failure(null, -32600, "MCP request payload is too large."), 413);
  }

  try {
    const parsed = JSON.parse(raw);
    const message = record(parsed);
    if (!message || message.jsonrpc !== "2.0" || !textValue(message.method, 160)) {
      return jsonResponse(failure(rpcId(message?.id), -32600, "Invalid JSON-RPC request."), 400);
    }
    return message;
  } catch {
    return jsonResponse(failure(null, -32700, "Invalid JSON."), 400);
  }
}

export async function handlePublicMcpRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return emptyResponse(204);
  if (request.method !== "POST") {
    const headers = corsHeaders();
    headers.set("Allow", "POST, OPTIONS");
    return new Response("Method not allowed.", { status: 405, headers });
  }

  const parsed = await parseMessage(request);
  if (parsed instanceof Response) return parsed;

  const modern = modernRequest(request, parsed);
  if (modern) {
    const headerError = validateModernHeaders(request, parsed);
    if (headerError) {
      return jsonResponse(
        failure(rpcId(parsed.id), -32020, headerError, {
          supported: [MODERN_VERSION],
        }),
        400,
      );
    }
  }

  const result = route(parsed, modern);
  if (result === null || isNotification(parsed)) return emptyResponse(202);
  return jsonResponse(result);
}

export const PublicMcpServer = Object.freeze({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  supportedVersions: SUPPORTED_VERSIONS,
  instructions: SERVER_INSTRUCTIONS,
  tools: TOOLS,
  resource: RESOURCE,
  prompt: PROMPT,
  handleRequest: handlePublicMcpRequest,
});
