import assert from "node:assert/strict";
import test from "node:test";

import {
  ollamaToolDefinitions,
  runOllamaAgent,
} from "../site/local-llm-agent.ts";

function adapterFixture(overrides = {}) {
  const project = { title: "Fixture", items: [], entities: [], relationships: [] };
  return {
    getProject: async () => project,
    getGraphContract: () => ({ version: "contract-v1" }),
    auditGraph: async () => ({ valid: true, errors: [] }),
    validateProject: async () => ({ valid: true, errors: [] }),
    applyOperations: async (operations) => ({ appliedOperations: operations.length }),
    replaceProject: async (replacement) => ({ project: replacement }),
    exportMemgraph: async () => ({ schema: "timeline-memgraph-v1" }),
    importMemgraph: async () => ({ imported: true }),
    ...overrides,
  };
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("Ollama tool projection preserves MCP schemas and hides mutation tools by default", () => {
  const readOnly = ollamaToolDefinitions(adapterFixture());
  const readOnlyNames = readOnly.map((tool) => tool.function.name);

  assert.ok(readOnlyNames.includes("timeline__get_project"));
  assert.ok(readOnlyNames.includes("timeline__get_graph_contract"));
  assert.ok(readOnlyNames.includes("timeline__audit_graph"));
  assert.ok(readOnlyNames.includes("timeline__validate_project"));
  assert.ok(readOnlyNames.includes("timeline__memgraph_export"));
  assert.ok(!readOnlyNames.includes("timeline__apply_transaction"));

  const writable = ollamaToolDefinitions(adapterFixture(), { allowMutations: true });
  const writableNames = writable.map((tool) => tool.function.name);
  assert.ok(writableNames.includes("timeline__apply_transaction"));
  assert.ok(writableNames.includes("timeline__replace_project"));
  assert.ok(writableNames.includes("timeline__memgraph_import"));
});

test("Ollama agent executes MCP reads and feeds tool results back to the model", async () => {
  const requests = [];
  const fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    requests.push(body);
    if (requests.length === 1) {
      return jsonResponse({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              function: {
                name: "timeline__get_graph_contract",
                arguments: {},
              },
            },
          ],
        },
      });
    }
    return jsonResponse({
      message: {
        role: "assistant",
        content: "The graph contract is available and the project can be verified.",
      },
    });
  };

  const result = await runOllamaAgent(adapterFixture(), {
    model: "gpt-oss:20b",
    prompt: "Verify the current project.",
    fetch,
  });

  assert.equal(result.steps, 2);
  assert.deepEqual(result.toolCalls, ["timeline.get_graph_contract"]);
  assert.match(result.content, /verified/i);
  assert.equal(requests[1].messages.at(-1).role, "tool");
  assert.equal(requests[1].messages.at(-1).tool_name, "timeline__get_graph_contract");
  assert.match(requests[1].messages.at(-1).content, /contract-v1/);
});

test("mutation access is opt-in and dispatches through the existing MCP adapter", async () => {
  const applied = [];
  const fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    const toolMessages = body.messages.filter((message) => message.role === "tool");
    if (!toolMessages.length) {
      return jsonResponse({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              function: {
                name: "timeline__apply_transaction",
                arguments: {
                  graphContractVersion: "contract-v1",
                  operations: [
                    {
                      op: "set",
                      field: "title",
                      value: "Imported",
                    },
                  ],
                },
              },
            },
          ],
        },
      });
    }
    return jsonResponse({
      message: {
        role: "assistant",
        content: "Mutation completed; run audit and validation next.",
      },
    });
  };

  const adapter = adapterFixture({
    applyOperations: async (operations) => {
      applied.push(...operations);
      return { appliedOperations: operations.length };
    },
  });

  const result = await runOllamaAgent(adapter, {
    model: "gpt-oss:20b",
    prompt: "Update the project title.",
    allowMutations: true,
    fetch,
  });

  assert.equal(result.steps, 3);
  assert.deepEqual(result.toolCalls, [
    "timeline.apply_transaction",
    "timeline.audit_graph",
    "timeline.validate_project",
  ]);
  assert.equal(result.verification.audit.valid, true);
  assert.equal(result.verification.validation.valid, true);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].field, "title");
});


test("post-mutation canonical verification failure stops the local agent", async () => {
  const fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    const hasToolResult = body.messages.some((message) => message.role === "tool");
    if (!hasToolResult) {
      return jsonResponse({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              function: {
                name: "timeline__apply_transaction",
                arguments: {
                  graphContractVersion: "contract-v1",
                  operations: [{ op: "set", field: "title", value: "Changed" }],
                },
              },
            },
          ],
        },
      });
    }
    return jsonResponse({
      message: { role: "assistant", content: "Done." },
    });
  };

  await assert.rejects(
    runOllamaAgent(
      adapterFixture({
        auditGraph: async () => ({ valid: false, errors: ["fixture audit failure"] }),
      }),
      {
        model: "gpt-oss:20b",
        prompt: "Change the title.",
        allowMutations: true,
        fetch,
      },
    ),
    /fixture audit failure/,
  );
});

test("read-only sessions reject mutation tool requests from the model", async () => {
  const fetch = async () =>
    jsonResponse({
      message: {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            function: {
              name: "timeline__apply_transaction",
              arguments: {},
            },
          },
        ],
      },
    });

  await assert.rejects(
    runOllamaAgent(adapterFixture(), {
      model: "gpt-oss:20b",
      prompt: "Change the project.",
      fetch,
    }),
    /unavailable MCP tool/,
  );
});
