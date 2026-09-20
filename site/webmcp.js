(() => {
  "use strict";

  const MANAGED_COLLECTIONS = Object.freeze([
    "categories",
    "items",
    "stories",
    "entities",
    "places",
    "relationships",
    "evidence",
    "custodyActions"
  ]);
  const TOP_LEVEL_FIELDS = Object.freeze(["title", "extensions", "reasoning"]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function text(value, max = 240) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function deepMerge(target, patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return clone(patch);
    const result = target && typeof target === "object" && !Array.isArray(target) ? clone(target) : {};
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = clone(value);
      }
    }
    return result;
  }

  function ensureCollection(project, collection) {
    if (!MANAGED_COLLECTIONS.includes(collection)) throw new Error(`Unsupported collection “${collection}”.`);
    if (!Array.isArray(project[collection])) project[collection] = [];
    return project[collection];
  }

  function cleanupDelete(project, collection, id) {
    if (collection === "categories") {
      const fallback = project.categories?.find((record) => String(record.id) !== id);
      if (!fallback) throw new Error("The last category cannot be deleted.");
      for (const item of project.items || []) {
        if (String(item.categoryId) === id) item.categoryId = fallback.id;
      }
    }
    if (collection === "items") {
      for (const story of project.stories || []) {
        story.itemIds = (story.itemIds || []).filter((itemId) => String(itemId) !== id);
      }
      for (const relationship of project.relationships || []) {
        relationship.itemIds = (relationship.itemIds || []).filter((itemId) => String(itemId) !== id);
      }
    }
    if (collection === "entities") {
      project.relationships = (project.relationships || []).filter(
        (relationship) => String(relationship.subjectId) !== id && String(relationship.objectId) !== id
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
          (change) => String(change.relationshipId) !== id
        );
      }
    }
    if (collection === "evidence") {
      for (const item of project.items || []) {
        item.evidenceIds = (item.evidenceIds || []).filter((evidenceId) => String(evidenceId) !== id);
      }
      project.custodyActions = (project.custodyActions || []).filter((action) =>
        String(action.evidenceId || action.recordId || action.evidenceRecordId || "") !== id
      );
    }
  }

  function applyOperation(project, operation) {
    if (!operation || typeof operation !== "object") throw new Error("Each operation must be an object.");
    const op = text(operation.op, 32);

    if (op === "set") {
      const field = text(operation.field, 60);
      if (!TOP_LEVEL_FIELDS.includes(field)) {
        throw new Error(`Unsupported top-level field “${field}”. Use replace_project for a complete replacement.`);
      }
      project[field] = clone(operation.value);
      return;
    }

    const collection = text(operation.collection, 60);
    const records = ensureCollection(project, collection);
    const suppliedId = text(operation.id, 120);
    const valueId = text(operation.value?.id, 120);
    const id = suppliedId || valueId;
    if (!id) throw new Error(`${op || "collection"} operation on ${collection} requires a stable id.`);

    const index = records.findIndex((record) => String(record?.id || "") === id);
    if (op === "delete") {
      if (index < 0) throw new Error(`${collection} record “${id}” does not exist.`);
      cleanupDelete(project, collection, id);
      const currentRecords = ensureCollection(project, collection);
      const currentIndex = currentRecords.findIndex((record) => String(record?.id || "") === id);
      if (currentIndex >= 0) currentRecords.splice(currentIndex, 1);
      return;
    }

    if (op !== "upsert" && op !== "patch") {
      throw new Error(`Unsupported operation “${op}”. Use upsert, patch, delete, or set.`);
    }
    if (!operation.value || typeof operation.value !== "object" || Array.isArray(operation.value)) {
      throw new Error(`${op} operation on ${collection} requires an object value.`);
    }

    const value = clone(operation.value);
    value.id = id;
    if (index < 0) {
      records.push(value);
      return;
    }
    records[index] = op === "patch" ? deepMerge(records[index], value) : value;
  }

  function applyOperations(project, operations) {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      throw new Error("Timeline project must be an object.");
    }
    if (!Array.isArray(operations) || !operations.length) {
      throw new Error("A non-empty operations array is required.");
    }
    if (operations.length > 500) throw new Error("A transaction is limited to 500 operations.");
    const draft = clone(project);
    for (const operation of operations) applyOperation(draft, operation);
    return draft;
  }

  function operationSchema() {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        op: { type: "string", enum: ["upsert", "patch", "delete", "set"] },
        collection: { type: "string", enum: MANAGED_COLLECTIONS },
        id: { type: "string", minLength: 1, maxLength: 120 },
        field: { type: "string", enum: TOP_LEVEL_FIELDS },
        value: {}
      },
      required: ["op"]
    };
  }

  function toolDefinitions(adapter) {
    if (!adapter || typeof adapter !== "object") throw new Error("Timeline WebMCP adapter is required.");
    const emptySchema = { type: "object", additionalProperties: false, properties: {} };
    return [
      {
        name: "timeline.get_project",
        title: "Read Timeline project",
        description: "Return the complete current Timeline project as canonical JSON, including chronology, stories, categories, entity graph, places, evidence, and reasoning.",
        inputSchema: emptySchema,
        annotations: { readOnlyHint: true, consequentialHint: false },
        execute: async () => adapter.getProject()
      },
      {
        name: "timeline.validate_project",
        title: "Validate Timeline project",
        description: "Validate a supplied Timeline project, or the active project when omitted, using the same normalization and strict graph rules as the application.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: { project: { type: "object" } }
        },
        annotations: { readOnlyHint: true, consequentialHint: false },
        execute: async ({ project } = {}) => adapter.validateProject(project)
      },
      {
        name: "timeline.apply_transaction",
        title: "Edit Timeline project",
        description: "Atomically create, update, patch, delete, and manage Timeline records. Batch related edits together so graph invariants are validated only after the complete transaction. Supported collections: categories, items, stories, entities, places, relationships, evidence, custodyActions. Top-level title, extensions, and reasoning use op=set.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            operations: {
              type: "array",
              minItems: 1,
              maxItems: 500,
              items: operationSchema()
            }
          },
          required: ["operations"]
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: async ({ operations }) => adapter.applyOperations(operations)
      },
      {
        name: "timeline.replace_project",
        title: "Replace Timeline project",
        description: "Replace the complete active Timeline project with supplied canonical JSON after strict application validation. This persists locally and rerenders the app.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: { project: { type: "object" } },
          required: ["project"]
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: async ({ project }) => adapter.replaceProject(project)
      },
      {
        name: "timeline.memgraph_export",
        title: "Export Timeline for Memgraph MCP",
        description: "Return a Memgraph interoperability bundle containing canonical records, deterministic Cypher statements, schema setup suggestions, and read-back queries suitable for a Memgraph MCP client.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            namespace: {
              type: "string",
              minLength: 1,
              maxLength: 120,
              description: "Logical Memgraph namespace used to isolate this Timeline project."
            }
          }
        },
        annotations: { readOnlyHint: true, consequentialHint: false },
        execute: async (options = {}) => adapter.exportMemgraph(options)
      },
      {
        name: "timeline.memgraph_import",
        title: "Import Memgraph MCP records",
        description: "Import Memgraph MCP query rows or a Timeline Memgraph export bundle into the active project. Supplied collections replace the corresponding Timeline collections; omitted collections remain unchanged. The merged result is strictly validated before commit.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            snapshot: { type: "object" }
          },
          required: ["snapshot"]
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: async ({ snapshot }) => adapter.importMemgraph(snapshot)
      }
    ];
  }

  async function register(adapter, options = {}) {
    const modelContext = options.modelContext || globalThis.document?.modelContext || null;
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      return {
        registered: false,
        reason: "document.modelContext is unavailable. Enable a WebMCP-capable browser or MCP-B compatible polyfill/bridge."
      };
    }

    const controller = new AbortController();
    const tools = toolDefinitions(adapter);
    for (const tool of tools) {
      await modelContext.registerTool(tool, { signal: controller.signal });
    }
    return {
      registered: true,
      toolNames: tools.map((tool) => tool.name),
      dispose() { controller.abort(); }
    };
  }

  globalThis.TimelineWebMCP = Object.freeze({
    MANAGED_COLLECTIONS,
    TOP_LEVEL_FIELDS,
    applyOperations,
    toolDefinitions,
    register
  });
})();
