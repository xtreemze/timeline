export const PROJECT_TRANSACTION_COLLECTIONS = Object.freeze([
  "categories",
  "items",
  "stories",
  "entities",
  "places",
  "relationships",
  "evidence",
  "custodyActions",
] as const);

export const PROJECT_TRANSACTION_TOP_LEVEL_FIELDS = Object.freeze([
  "title",
  "extensions",
  "reasoning",
] as const);

export type ProjectTransactionCollection = (typeof PROJECT_TRANSACTION_COLLECTIONS)[number];

export type ProjectTransactionTopLevelField = (typeof PROJECT_TRANSACTION_TOP_LEVEL_FIELDS)[number];

export interface ProjectTransactionOperation {
  readonly op: string;
  readonly collection?: string;
  readonly id?: string;
  readonly field?: string;
  readonly value?: unknown;
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function text(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function deepMerge(target: unknown, patch: unknown): unknown {
  const patchRecord = record(patch);
  if (!patchRecord) return cloneValue(patch);

  const targetRecord = record(target);
  const result: JsonRecord = targetRecord ? cloneValue(targetRecord) : {};
  for (const [key, value] of Object.entries(patchRecord)) {
    result[key] = record(value) ? deepMerge(result[key], value) : cloneValue(value);
  }
  return result;
}

function supportedCollection(value: string): value is ProjectTransactionCollection {
  return PROJECT_TRANSACTION_COLLECTIONS.some((candidate) => candidate === value);
}

function supportedTopLevelField(value: string): value is ProjectTransactionTopLevelField {
  return PROJECT_TRANSACTION_TOP_LEVEL_FIELDS.some((candidate) => candidate === value);
}

function ensureCollection(project: JsonRecord, collection: string): unknown[] {
  if (!supportedCollection(collection)) {
    throw new Error(`Unsupported collection "${collection}".`);
  }
  if (!Array.isArray(project[collection])) project[collection] = [];
  return project[collection] as unknown[];
}

function records(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanupDelete(project: JsonRecord, collection: string, id: string): void {
  if (collection === "categories") {
    const fallback = records(project["categories"]).find((raw) => {
      const candidate = record(raw);
      return candidate && String(candidate["id"] ?? "") !== id;
    });
    const fallbackRecord = record(fallback);
    if (!fallbackRecord) throw new Error("The last category cannot be deleted.");
    for (const raw of records(project["items"])) {
      const item = record(raw);
      if (item && String(item["categoryId"] ?? "") === id)
        item["categoryId"] = fallbackRecord["id"];
    }
  }

  if (collection === "items") {
    for (const raw of records(project["stories"])) {
      const story = record(raw);
      if (!story) continue;
      story["itemIds"] = records(story["itemIds"]).filter((itemId) => String(itemId) !== id);
    }
    for (const raw of records(project["relationships"])) {
      const relationship = record(raw);
      if (!relationship) continue;
      relationship["itemIds"] = records(relationship["itemIds"]).filter(
        (itemId) => String(itemId) !== id,
      );
    }
  }

  if (collection === "entities") {
    project["relationships"] = records(project["relationships"]).filter((raw) => {
      const relationship = record(raw);
      return (
        !relationship ||
        (String(relationship["subjectId"] ?? "") !== id &&
          String(relationship["objectId"] ?? "") !== id)
      );
    });
  }

  if (collection === "places") {
    for (const raw of records(project["relationships"])) {
      const relationship = record(raw);
      if (relationship && String(relationship["placeId"] ?? "") === id) {
        relationship["placeId"] = "";
      }
    }
  }

  if (collection === "relationships") {
    for (const raw of records(project["items"])) {
      const item = record(raw);
      if (!item) continue;
      item["relationChanges"] = records(item["relationChanges"]).filter((rawChange) => {
        const change = record(rawChange);
        return !change || String(change["relationshipId"] ?? "") !== id;
      });
    }
  }

  if (collection === "evidence") {
    for (const raw of records(project["items"])) {
      const item = record(raw);
      if (!item) continue;
      item["evidenceIds"] = records(item["evidenceIds"]).filter(
        (evidenceId) => String(evidenceId) !== id,
      );
    }
    project["custodyActions"] = records(project["custodyActions"]).filter((raw) => {
      const action = record(raw);
      if (!action) return true;
      const evidenceId =
        action["evidenceId"] ?? action["recordId"] ?? action["evidenceRecordId"] ?? "";
      return String(evidenceId) !== id;
    });
  }
}

function applyOperation(project: JsonRecord, operation: ProjectTransactionOperation): void {
  if (!operation || typeof operation !== "object") {
    throw new Error("Each operation must be an object.");
  }

  const op = text(operation.op, 32);
  if (op === "set") {
    const field = text(operation.field, 60);
    if (!supportedTopLevelField(field)) {
      throw new Error(
        `Unsupported top-level field "${field}". Use replace_project for a complete replacement.`,
      );
    }
    project[field] = cloneValue(operation.value);
    return;
  }

  const collection = text(operation.collection, 60);
  const collectionRecords = ensureCollection(project, collection);
  const suppliedId = text(operation.id, 120);
  const valueId = text(record(operation.value)?.["id"], 120);
  const id = suppliedId || valueId;
  if (!id) {
    throw new Error(`${op || "collection"} operation on ${collection} requires a stable id.`);
  }

  const index = collectionRecords.findIndex((raw) => String(record(raw)?.["id"] ?? "") === id);
  if (op === "delete") {
    if (index < 0) throw new Error(`${collection} record "${id}" does not exist.`);
    cleanupDelete(project, collection, id);
    const currentRecords = ensureCollection(project, collection);
    const currentIndex = currentRecords.findIndex(
      (raw) => String(record(raw)?.["id"] ?? "") === id,
    );
    if (currentIndex >= 0) currentRecords.splice(currentIndex, 1);
    return;
  }

  if (op !== "upsert" && op !== "patch") {
    throw new Error(`Unsupported operation "${op}". Use upsert, patch, delete, or set.`);
  }

  const input = record(operation.value);
  if (!input) {
    throw new Error(`${op} operation on ${collection} requires an object value.`);
  }

  const value = cloneValue(input);
  value["id"] = id;
  if (index < 0) {
    collectionRecords.push(value);
    return;
  }
  collectionRecords[index] = op === "patch" ? deepMerge(collectionRecords[index], value) : value;
}

export function applyProjectTransaction<TProject>(
  project: TProject,
  operations: readonly ProjectTransactionOperation[],
): TProject {
  const draft = cloneValue(project);
  const draftRecord = record(draft);
  if (!draftRecord) throw new Error("Lūm project must be an object.");
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("A non-empty operations array is required.");
  }
  if (operations.length > 500) {
    throw new Error("A transaction is limited to 500 operations.");
  }

  for (const operation of operations) applyOperation(draftRecord, operation);
  return draft;
}
