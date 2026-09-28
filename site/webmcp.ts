/**
 * Lūm WebMCP tool definitions and graph contract management.
 * Canonical mutation is owned by the application transaction command.
 */

import {
  applyProjectTransaction,
  PROJECT_TRANSACTION_COLLECTIONS,
  PROJECT_TRANSACTION_TOP_LEVEL_FIELDS,
  type ProjectTransactionOperation,
} from "../src/application/project-transaction.ts";

const MANAGED_COLLECTIONS = PROJECT_TRANSACTION_COLLECTIONS;
const TOP_LEVEL_FIELDS = PROJECT_TRANSACTION_TOP_LEVEL_FIELDS;

function text(value: unknown, max: number = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type Operation = ProjectTransactionOperation;

/**
 * Compatibility adapter for existing callers. Mutation semantics live in
 * src/application/project-transaction.ts.
 */
export function applyOperations<TProject>(
  project: TProject,
  operations: readonly Operation[],
): TProject {
  return applyProjectTransaction(project, operations);
}

export function operationSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      op: { type: "string", enum: ["upsert", "patch", "delete", "set"] },
      collection: { type: "string", enum: MANAGED_COLLECTIONS },
      id: { type: "string", minLength: 1, maxLength: 120 },
      field: { type: "string", enum: TOP_LEVEL_FIELDS },
      value: {},
    },
    required: ["op"],
  };
}

export function requireGraphContractVersion(provided: string, expected: string): void {
  if (provided !== expected) {
    throw new Error(
      `Graph contract version mismatch. Expected "${expected}"; read timeline.get_graph_contract and retry the complete atomic mutation.`,
    );
  }
}

export function graphContractVersionSchema(version: string): Record<string, unknown> {
  return {
    type: "string",
    const: version,
    description:
      "Exact version returned by timeline.get_graph_contract. Required on every graph-capable mutation so stale agents cannot silently write against an older modeling contract.",
  };
}

interface TimelineAdapter {
  getGraphContract(): any;
  getProject(): Promise<any>;
  auditGraph(project?: any): Promise<any>;
  validateProject(project?: any): Promise<any>;
  applyOperations(operations: Operation[]): Promise<any>;
  replaceProject(project: any): Promise<any>;
  exportMemgraph(options?: any): Promise<any>;
  importMemgraph(snapshot: any): Promise<any>;
}

export function toolDefinitions(adapter: TimelineAdapter): Record<string, unknown>[] {
  if (!adapter || typeof adapter !== "object") throw new Error("Lūm WebMCP adapter is required.");
  if (typeof adapter.getGraphContract !== "function" || typeof adapter.auditGraph !== "function") {
    throw new Error("Lūm WebMCP adapter must expose getGraphContract() and auditGraph().");
  }

  const graphContract = adapter.getGraphContract();
  const graphContractVersion = String(graphContract?.version || "").trim();
  if (!graphContractVersion) throw new Error("Lūm graph contract must expose a version.");

  const emptySchema = { type: "object", additionalProperties: false, properties: {} };
  const readOnlyAnnotations = {
    readOnlyHint: true,
    openWorldHint: false,
    consequentialHint: false,
  };
  const destructiveWriteAnnotations = {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
    consequentialHint: true,
  };

  return [
    {
      name: "timeline.get_project",
      title: "Read Lūm project",
      description:
        "Return the complete current Lūm continuum as canonical JSON, including temporal records, stories, categories, entity relationships, places, evidence, and reasoning.",
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: async () => adapter.getProject(),
    },
    {
      name: "timeline.get_graph_contract",
      title: "Read Lūm graph contract",
      description:
        "Return the authoritative, versioned Lūm relational-authoring contract. Agents must follow this contract before creating or editing entities, occurrences/relationships, places, or narrative context. It defines entity-only nodes, distinct endpoints, action-only predicates, category/story separation, named-context entity coverage, and required validation workflow.",
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: async () => adapter.getGraphContract(),
    },
    {
      name: "timeline.audit_graph",
      title: "Audit Lūm relational model",
      description:
        "Audit a supplied Lūm project, or the active project when omitted, against the complete relational contract without mutating state. Returns all graph errors plus structural duplicate/orphan diagnostics. Use this before and after relational-authoring transactions.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { project: { type: "object" } },
      },
      annotations: readOnlyAnnotations,
      execute: async ({ project } = {} as any) => adapter.auditGraph(project),
    },
    {
      name: "timeline.validate_project",
      title: "Validate Lūm project",
      description:
        "Validate a supplied Lūm project, or the active project when omitted, using canonical normalization and the strict graph contract. Known canonical entities named in event title/description/image alt/evidence note must be endpoints of event-linked action edges; graph categories, self-loops, generic/compound predicates, duplicate facts, mirrored copies, orphan entities, and invalid place/time modeling are rejected.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { project: { type: "object" } },
      },
      annotations: readOnlyAnnotations,
      execute: async ({ project } = {} as any) => adapter.validateProject(project),
    },
    {
      name: "timeline.apply_transaction",
      title: "Edit Lūm project",
      description:
        "Atomically create, update, patch, delete, and manage Timeline records under the current graph contract. For narrative edits, extract every durable named entity first, create/reuse its entity node, and include meaningful action edges in the same transaction. Edges must connect two different entities and use an action-only predicate; time/place are structured properties; categories stay on chronology items only. Batch related entity + edge + item changes together because validation runs after the complete transaction.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          graphContractVersion: graphContractVersionSchema(graphContractVersion),
          operations: {
            type: "array",
            minItems: 1,
            maxItems: 500,
            items: operationSchema(),
          },
        },
        required: ["graphContractVersion", "operations"],
      },
      annotations: destructiveWriteAnnotations,
      execute: async ({ graphContractVersion: version, operations }: any) => {
        requireGraphContractVersion(version, graphContractVersion);
        return adapter.applyOperations(operations);
      },
    },
    {
      name: "timeline.replace_project",
      title: "Replace Lūm project",
      description:
        "Replace the complete active Lūm project only after strict graph-contract validation. The replacement must obey entity-only topology, action-only directed edges, named-context coverage, category/story separation, and canonical time/place rules.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          graphContractVersion: graphContractVersionSchema(graphContractVersion),
          project: { type: "object" },
        },
        required: ["graphContractVersion", "project"],
      },
      annotations: {
        ...destructiveWriteAnnotations,
        idempotentHint: true,
      },
      execute: async ({ graphContractVersion: version, project }: any) => {
        requireGraphContractVersion(version, graphContractVersion);
        return adapter.replaceProject(project);
      },
    },
    {
      name: "timeline.memgraph_export",
      title: "Export Lūm for Memgraph MCP",
      description:
        "Return a Memgraph interoperability bundle containing canonical records, deterministic Cypher statements, schema setup suggestions, and read-back queries suitable for a Memgraph MCP client. Export is read-only and preserves Timeline graph semantics.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          namespace: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            description: "Logical Memgraph namespace used to isolate this Lūm project.",
          },
        },
      },
      annotations: readOnlyAnnotations,
      execute: async (options = {} as any) => adapter.exportMemgraph(options),
    },
    {
      name: "timeline.memgraph_import",
      title: "Import Memgraph MCP records",
      description:
        "Import Memgraph MCP query rows or a Timeline Memgraph export bundle into the active project. The merged result must satisfy the current Timeline graph contract before commit; Memgraph labels/storage envelopes never relax Timeline node/edge semantics.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          graphContractVersion: graphContractVersionSchema(graphContractVersion),
          snapshot: { type: "object" },
        },
        required: ["graphContractVersion", "snapshot"],
      },
      annotations: {
        ...destructiveWriteAnnotations,
        idempotentHint: true,
      },
      execute: async ({ graphContractVersion: version, snapshot }: any) => {
        requireGraphContractVersion(version, graphContractVersion);
        return adapter.importMemgraph(snapshot);
      },
    },
  ];
}

interface RegisterResult {
  registered: boolean;
  reason?: string;
  toolNames?: string[];
  dispose?: () => void;
}

export async function register(
  adapter: TimelineAdapter,
  options: any = {},
): Promise<RegisterResult> {
  const modelContext = options.modelContext || (globalThis as any).document?.modelContext || null;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return {
      registered: false,
      reason:
        "document.modelContext is unavailable. Enable a WebMCP-capable browser or MCP-B compatible polyfill/bridge.",
    };
  }

  const controller = new AbortController();
  const tools = toolDefinitions(adapter);
  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal: controller.signal });
  }
  return {
    registered: true,
    toolNames: tools.map((tool: any) => tool.name),
    dispose() {
      controller.abort();
    },
  };
}

const TimelineWebMCPObj = {
  MANAGED_COLLECTIONS,
  TOP_LEVEL_FIELDS,
  applyOperations,
  requireGraphContractVersion,
  toolDefinitions,
  register,
} as const;

export const TimelineWebMCP = Object.freeze(TimelineWebMCPObj);
