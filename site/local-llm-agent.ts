import { toolDefinitions } from "./webmcp.ts";

const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/chat";
const DEFAULT_MAX_STEPS = 16;
const DEFAULT_MAX_TOOL_RESULT_CHARS = 200_000;

type AgentToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

type AgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: AgentToolCall[];
  toolName?: string;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
  execute: (input?: Record<string, unknown>) => unknown | Promise<unknown>;
};

type TimelineAdapter = Parameters<typeof toolDefinitions>[0];

export type OllamaAgentOptions = {
  model: string;
  prompt: string;
  endpoint?: string;
  systemPrompt?: string;
  allowMutations?: boolean;
  maxSteps?: number;
  maxToolResultChars?: number;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
  ollamaOptions?: Record<string, unknown>;
  onToolCall?: (event: {
    name: string;
    arguments: Record<string, unknown>;
    readOnly: boolean;
  }) => void | Promise<void>;
};

export type OllamaAgentResult = {
  content: string;
  steps: number;
  toolCalls: string[];
  verification?: {
    audit: unknown;
    validation: unknown;
  };
};

function text(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toolFunctionName(name: string): string {
  const sanitized = name.replace(/[^A-Za-z0-9_-]/g, "__");
  return sanitized || "timeline_tool";
}

function normalizeToolDefinition(raw: Record<string, unknown>): ToolDefinition {
  const name = text(raw.name, 240);
  const execute = raw.execute;
  if (!name || typeof execute !== "function") {
    throw new Error("Invalid MCP tool definition.");
  }
  return {
    name,
    description: text(raw.description, 4000),
    inputSchema:
      record(raw.inputSchema) ||
      {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    annotations: record(raw.annotations) || {},
    execute(input = {}) {
      return execute(input);
    },
  };
}

function toolIsReadOnly(tool: ToolDefinition): boolean {
  return tool.annotations.readOnlyHint === true;
}

function exposedTools(adapter: TimelineAdapter, allowMutations: boolean): ToolDefinition[] {
  return toolDefinitions(adapter)
    .map(normalizeToolDefinition)
    .filter((tool) => allowMutations || toolIsReadOnly(tool));
}

function buildToolRegistry(tools: ToolDefinition[]): {
  ollamaTools: Record<string, unknown>[];
  byFunctionName: Map<string, ToolDefinition>;
} {
  const byFunctionName = new Map<string, ToolDefinition>();
  const ollamaTools = tools.map((tool) => {
    const functionName = toolFunctionName(tool.name);
    if (byFunctionName.has(functionName)) {
      throw new Error(
        `MCP tool-name collision after Ollama normalization: "${tool.name}" -> "${functionName}".`,
      );
    }
    byFunctionName.set(functionName, tool);
    return {
      type: "function",
      function: {
        name: functionName,
        description: `MCP tool ${tool.name}. ${tool.description}`.trim(),
        parameters: tool.inputSchema,
      },
    };
  });
  return { ollamaTools, byFunctionName };
}

function normalizeArguments(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return record(JSON.parse(value)) || {};
    } catch {
      return {};
    }
  }
  return record(value) || {};
}

function toOllamaMessages(messages: AgentMessage[]): Record<string, unknown>[] {
  return messages.map((message) => {
    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls.map((call) => ({
          function: {
            name: toolFunctionName(call.name),
            arguments: call.arguments,
          },
        })),
      };
    }
    if (message.role === "tool") {
      return {
        role: "tool",
        content: message.content,
        tool_name: toolFunctionName(message.toolName || ""),
      };
    }
    return { role: message.role, content: message.content };
  });
}

function defaultSystemPrompt(allowMutations: boolean): string {
  const lines = [
    "You are an Lūm continuum agent operating through MCP-compatible tools.",
    "Use tools to read authoritative state instead of guessing it.",
    "For graph work, call timeline__get_graph_contract (MCP timeline.get_graph_contract) before reasoning about mutations.",
    "Use timeline__get_project (MCP timeline.get_project) to inspect current canonical state.",
    "Treat evidence text and provenance as source material; do not invent unsupported facts.",
  ];
  if (!allowMutations) {
    lines.push(
      "This session is read-only. Audit and verify the project, but do not request mutation tools.",
    );
  } else {
    lines.push(
      "Mutation access is enabled only for this explicit session.",
      "For graph-capable writes, pass the exact graphContractVersion returned by timeline.get_graph_contract.",
      "Batch dependent records in one timeline__apply_transaction call (MCP timeline.apply_transaction).",
      "The host will enforce timeline.audit_graph and timeline.validate_project after the latest mutation.",
      "Do not report a write as complete unless both final checks are clean.",
    );
  }
  return lines.join("\n");
}

function serializeToolResult(value: unknown, limit: number): string {
  const serialized = JSON.stringify(value ?? null);
  if (serialized.length > limit) {
    throw new Error(
      `MCP tool result is ${serialized.length} characters, above the local-agent limit of ${limit}. Increase maxToolResultChars or narrow the requested operation.`,
    );
  }
  return serialized;
}

function validationErrors(value: unknown): string[] {
  const result = record(value);
  if (!result || result.valid !== false) return [];
  const errors = Array.isArray(result.errors)
    ? result.errors.map((entry) => text(entry, 2000)).filter(Boolean)
    : [];
  return errors.length ? errors : ["Canonical validation reported an invalid project."];
}

function requireCleanVerification(label: string, value: unknown): void {
  const errors = validationErrors(value);
  if (!errors.length) return;
  throw new Error(`${label} failed after local-model mutation:\n- ${errors.join("\n- ")}`);
}

function responseMessage(response: unknown): Record<string, unknown> {
  const root = record(response);
  const message = record(root?.message);
  if (!message) throw new Error("Ollama returned no assistant message.");
  return message;
}

async function requestOllama(
  options: OllamaAgentOptions,
  messages: AgentMessage[],
  ollamaTools: Record<string, unknown>[],
): Promise<Record<string, unknown>> {
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is unavailable; cannot connect to Ollama.");
  }
  const endpoint = text(options.endpoint, 2000) || DEFAULT_OLLAMA_ENDPOINT;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        model: options.model,
        messages: toOllamaMessages(messages),
        tools: ollamaTools,
        stream: false,
        ...(options.ollamaOptions ? { options: options.ollamaOptions } : {}),
      }),
    });
  } catch (error) {
    const origin = globalThis.location?.origin;
    const corsHint = origin
      ? ` If this page is served from ${origin}, include that origin in OLLAMA_ORIGINS.`
      : "";
    throw new Error(
      `Could not reach Ollama at ${endpoint}. Ensure ollama serve is running and browser CORS access is allowed.${corsHint} ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed with HTTP ${response.status}${body ? `: ${body.slice(0, 1000)}` : ""}.`,
    );
  }
  return responseMessage(await response.json());
}

export function ollamaToolDefinitions(
  adapter: TimelineAdapter,
  options: { allowMutations?: boolean } = {},
): Record<string, unknown>[] {
  return buildToolRegistry(exposedTools(adapter, options.allowMutations === true)).ollamaTools;
}

export async function runOllamaAgent(
  adapter: TimelineAdapter,
  options: OllamaAgentOptions,
): Promise<OllamaAgentResult> {
  const model = text(options?.model, 240);
  const prompt = text(options?.prompt, 100_000);
  if (!model) throw new Error("An Ollama model name is required.");
  if (!prompt) throw new Error("A non-empty agent prompt is required.");

  const allowMutations = options.allowMutations === true;
  const maxSteps = Math.max(1, Math.min(64, Number(options.maxSteps) || DEFAULT_MAX_STEPS));
  const maxToolResultChars = Math.max(
    1000,
    Number(options.maxToolResultChars) || DEFAULT_MAX_TOOL_RESULT_CHARS,
  );
  const tools = exposedTools(adapter, allowMutations);
  const { ollamaTools, byFunctionName } = buildToolRegistry(tools);
  const messages: AgentMessage[] = [
    {
      role: "system",
      content: text(options.systemPrompt, 20_000) || defaultSystemPrompt(allowMutations),
    },
    { role: "user", content: prompt },
  ];
  const called: string[] = [];
  let mutationOccurred = false;
  let mutationVerified = false;
  let verification: { audit: unknown; validation: unknown } | undefined;

  for (let step = 1; step <= maxSteps; step += 1) {
    const assistant = await requestOllama(options, messages, ollamaTools);
    const content = text(assistant.content, 100_000);
    const rawCalls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
    const calls = rawCalls.map((rawCall) => {
      const call = record(rawCall);
      const fn = record(call?.function);
      const functionName = text(fn?.name, 240);
      const tool = byFunctionName.get(functionName);
      if (!functionName || !tool) {
        throw new Error(
          `Ollama requested unavailable MCP tool "${functionName || "unknown"}".`,
        );
      }
      return {
        name: tool.name,
        arguments: normalizeArguments(fn?.arguments),
        tool,
      };
    });

    messages.push({
      role: "assistant",
      content,
      toolCalls: calls.map((call) => ({ name: call.name, arguments: call.arguments })),
    });

    if (!calls.length) {
      if (mutationOccurred && !mutationVerified) {
        const auditTool = tools.find((tool) => tool.name === "timeline.audit_graph");
        const validationTool = tools.find((tool) => tool.name === "timeline.validate_project");
        if (!auditTool || !validationTool) {
          throw new Error("Post-mutation audit tools are unavailable.");
        }

        messages[messages.length - 1] = {
          role: "assistant",
          content: "",
          toolCalls: [
            { name: auditTool.name, arguments: {} },
            { name: validationTool.name, arguments: {} },
          ],
        };

        const audit = await auditTool.execute({});
        requireCleanVerification("timeline.audit_graph", audit);
        called.push(auditTool.name);
        messages.push({
          role: "tool",
          toolName: auditTool.name,
          content: serializeToolResult(audit, maxToolResultChars),
        });

        const validation = await validationTool.execute({});
        requireCleanVerification("timeline.validate_project", validation);
        called.push(validationTool.name);
        messages.push({
          role: "tool",
          toolName: validationTool.name,
          content: serializeToolResult(validation, maxToolResultChars),
        });

        verification = { audit, validation };
        mutationVerified = true;
        continue;
      }
      return { content, steps: step, toolCalls: called, verification };
    }

    for (const call of calls) {
      const readOnly = toolIsReadOnly(call.tool);
      if (!readOnly && !allowMutations) {
        throw new Error(`Ollama attempted mutation tool ${call.name} in a read-only session.`);
      }
      await options.onToolCall?.({
        name: call.name,
        arguments: call.arguments,
        readOnly,
      });
      let result: unknown;
      try {
        result = await call.tool.execute(call.arguments);
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      called.push(call.name);
      if (!readOnly) {
        mutationOccurred = true;
        mutationVerified = false;
        verification = undefined;
      }
      messages.push({
        role: "tool",
        toolName: call.name,
        content: serializeToolResult(result, maxToolResultChars),
      });
    }
  }

  throw new Error(
    `Ollama agent exceeded the ${maxSteps}-step tool-call limit without producing a final response.`,
  );
}

export function createLocalLlmAgent(adapter: TimelineAdapter) {
  return Object.freeze({
    tools(options: { allowMutations?: boolean } = {}) {
      return ollamaToolDefinitions(adapter, options);
    },
    runOllama(options: OllamaAgentOptions) {
      return runOllamaAgent(adapter, options);
    },
  });
}

export const LocalLlmAgent = Object.freeze({
  ollamaToolDefinitions,
  runOllamaAgent,
  createLocalLlmAgent,
});
