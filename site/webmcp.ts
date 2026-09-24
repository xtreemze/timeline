/**
 * Lūm WebMCP tool definitions and graph contract management
 * Integrates Lūm with Model Context Protocol for agent-driven mutations
 */

const MANAGED_COLLECTIONS = Object.freeze([
  "categories",
  "items",
  "stories",
  "entities",
  "places",
  "relationships",
  "evidence",
  "custodyActions",
] as const);

const TOP_LEVEL_FIELDS = Object.freeze(["title", "extensions", "reasoning"] as const);

function clone(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function text(value: unknown, max: number = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function deepMerge(target: unknown, patch: unknown): unknown {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return clone(patch);
  const result =
    target && typeof target === "object" && !Array.isArray(target) ? clone(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      (result as any)[key] = deepMerge((result as any)[key], value);
    } else {
      (result as any)[key] = clone(value);
    }
  }
  return result;
}

function ensureCollection(project: any, collection: string): any[] {
  if (!MANAGED_COLLECTIONS.includes(collection as any))
    throw new Error(`Unsupported collection "${collection}".`);
  if (!Array.isArray(project[collection])) project[collection] = [];
  return project[collection];
}

function cleanupDelete(project: any, collection: string, id: string): void {
  if (collection === "categories") {
    const fallback = project.categories?.find((record: any) => String(record.id) !== id);
    if (!fallback) throw new Error("The last category cannot be deleted.");
    for (const item of project.items || []) {
      if (String(item.categoryId) === id) item.categoryId = fallback.id;
    }
  }
  if (collection === "items") {
    for (const story of project.stories || []) {
      story.itemIds = (story.itemIds || []).filter((itemId: any) => String(itemId) !== id);
    }
    for (const relationship of project.relationships || []) {
      relationship.itemIds = (relationship.itemIds || []).filter(
        (itemId: any) => String(itemId) !== id,
      );
    }
  }
  if (collection === "entities") {
    project.relationships = (project.relationships || []).filter(
      (relationship: any) =>
        String(relationship.subjectId) !== id && String(relationship.objectId) !== id,
    );
  }
  if (collection === "places") {
    for (const relationship of project.relationships || []) {
      if (String(relationship.placeId || "") === id) relationship.placeId = "";
    }
  }
  if (collection === "relationships") {
    for (const item of project.items || []) {
      item.relationChanges = (item.relationChanges || []).filter(
        (change: any) => String(change.relationshipId) !== id,
      );
    }
  }
  if (collection === "evidence") {
    for (const item of project.items || []) {
      item.evidenceIds = (item.evidenceIds || []).filter(
        (evidenceId: any) => String(evidenceId) !== id,
      );
    }
    project.custodyActions = (project.custodyActions || []).filter(
      (action: any) =>
        String(action.evidenceId || action.recordId || action.evidenceRecordId || "") !== id,
    );
  }
}

interface Operation {
  op: string;
  collection?: string;
  id?: string;
  field?: string;
  value?: unknown;
}

function applyOperation(project: any, operation: Operation): void {
  if (!operation || typeof operation !== "object")
    throw new Error("Each operation must be an object.");
  const op = text(operation.op, 32);

  if (op === "set") {
    const field = text(operation.field, 60);
    if (!TOP_LEVEL_FIELDS.includes(field as any)) {
      throw new Error(
        `Unsupported top-level field "${field}". Use replace_project for a complete replacement.`,
      );
    }
    project[field] = clone(operation.value);
    return;
  }

  const collection = text(operation.collection, 60);
  const records = ensureCollection(project, collection);
  const suppliedId = text(operation.id, 120);
  const valueId = text((operation.value as any)?.id, 120);
  const id = suppliedId || valueId;
  if (!id)
    throw new Error(`${op || "collection"} operation on ${collection} requires a stable id.`);

  const index = records.findIndex((record: any) => String(record?.id || "") === id);
  if (op === "delete") {
    if (index < 0) throw new Error(`${collection} record "${id}" does not exist.`);
    cleanupDelete(project, collection, id);
    const currentRecords = ensureCollection(project, collection);
    const currentIndex = currentRecords.findIndex((record: any) => String(record?.id || "") === id);
    if (currentIndex >= 0) currentRecords.splice(currentIndex, 1);
    return;
  }

  if (op !== "upsert" && op !== "patch") {
    throw new Error(`Unsupported operation "${op}". Use upsert, patch, delete, or set.`);
  }
  if (!operation.value || typeof operation.value !== "object" || Array.isArray(operation.value)) {
    throw new Error(`${op} operation on ${collection} requires an object value.`);
  }

  const value = clone(operation.value);
  (value as any).id = id;
  if (index < 0) {
    records.push(value);
    return;
  }
  records[index] = op === "patch" ? deepMerge(records[index], value) : value;
}

export function applyOperations(project: any, operations: Operation[]): any {
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    throw new Error("Lūm project must be an object.");
  }
  if (!Array.isArray(operations) || !operations.length) {
    throw new Error("A non-empty operations array is required.");
  }
  if (operations.length > 500) throw new Error("A transaction is limited to 500 operations.");
  const draft = clone(project);
  for (const operation of operations) applyOperation(draft as any, operation);
  return draft;
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
        "Validate a supplied Timeline project, or the active project when omitted, using canonical normalization and the strict graph contract. Known canonical entities named in event title/description/image alt/evidence note must be endpoints of event-linked action edges; graph categories, self-loops, generic/compound predicates, duplicate facts, mirrored copies, orphan entities, and invalid place/time modeling are rejected.",
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
        "Replace the complete active Timeline project only after strict graph-contract validation. The replacement must obey entity-only topology, action-only directed edges, named-context coverage, category/story separation, and canonical time/place rules.",
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
