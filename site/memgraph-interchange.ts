/**
 * Memgraph interoperability bundle and Cypher query generation
 * Handles Timeline export/import with Memgraph MCP via deterministic Cypher
 */

const FORMAT = "timeline-memgraph-v1";
const DEFAULT_NAMESPACE = "timeline-local";
const COLLECTION_LABELS = Object.freeze({
  categories: "TimelineCategory",
  items: "TimelineItem",
  stories: "TimelineStory",
  entities: "TimelineEntity",
  places: "TimelinePlace",
  evidence: "TimelineEvidence",
  custodyActions: "TimelineCustodyAction",
});

function clone(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function text(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cypherString(value: unknown): string {
  return `'${String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")}'`;
}

export function relationshipType(predicate: unknown): string {
  const normalized = text(predicate, 120)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!normalized) return "TIMELINE_ACTION";
  return /^[A-Z_]/.test(normalized) ? normalized : `ACTION_${normalized}`;
}

function recordJson(record: unknown): string {
  return JSON.stringify(record ?? null);
}

interface ProjectRecord {
  version: number;
  title: string;
  extensions?: unknown;
  reasoning?: unknown;
}

function projectRecord(project: any): ProjectRecord {
  return {
    version: project?.version ?? 2,
    title: text(project?.title, 120),
    extensions: clone(project?.extensions || null) as any,
    reasoning: clone(project?.reasoning || null) as any,
  };
}

function nodeStatement(label: string, record: any, namespace: string): string {
  const id = text(record?.id, 120);
  if (!id) throw new Error(`${label} record requires a stable id.`);
  const timelineKey = `${namespace}:${id}`;
  const properties = [
    `n.timelineId = ${cypherString(id)}`,
    `n.timelineProjectId = ${cypherString(namespace)}`,
    `n.recordKind = ${cypherString(label)}`,
    `n.recordJson = ${cypherString(recordJson(record))}`,
  ];
  if (record.name) properties.push(`n.name = ${cypherString(record.name)}`);
  if (record.title) properties.push(`n.title = ${cypherString(record.title)}`);
  if (record.type) properties.push(`n.entityType = ${cypherString(record.type)}`);
  if (record.kind) properties.push(`n.itemKind = ${cypherString(record.kind)}`);
  return `MERGE (n:${label} {timelineKey: ${cypherString(timelineKey)}}) SET ${properties.join(", ")} RETURN n.timelineId AS timelineId`;
}

function relationshipStatements(relationship: any, namespace: string): string[] {
  const id = text(relationship?.id, 120);
  const subjectId = text(relationship?.subjectId, 120);
  const objectId = text(relationship?.objectId, 120);
  const predicate = text(relationship?.predicate, 120);
  if (!(id && subjectId && objectId && predicate)) {
    throw new Error(
      "Memgraph export requires relationship id, subjectId, objectId, and predicate.",
    );
  }
  const type = relationshipType(predicate);
  const relationshipKey = `${namespace}:${id}`;
  const subjectKey = `${namespace}:${subjectId}`;
  const objectKey = `${namespace}:${objectId}`;
  const deleteExisting = `MATCH ()-[r]->() WHERE r.timelineKey = ${cypherString(relationshipKey)} DELETE r`;
  const create = [
    `MATCH (s:TimelineEntity {timelineKey: ${cypherString(subjectKey)}})`,
    `MATCH (o:TimelineEntity {timelineKey: ${cypherString(objectKey)}})`,
    `CREATE (s)-[r:${type}]->(o)`,
    `SET r.timelineKey = ${cypherString(relationshipKey)}, r.timelineId = ${cypherString(id)}, r.timelineProjectId = ${cypherString(namespace)}, r.predicate = ${cypherString(predicate)}, r.recordJson = ${cypherString(recordJson(relationship))}`,
    "RETURN r.timelineId AS timelineId",
  ].join(" ");
  return [deleteExisting, create];
}

export function queryRecipes(namespace: string = DEFAULT_NAMESPACE): Record<string, string> {
  const ns = cypherString(namespace);
  const collectionQueries: Record<string, string> = {};
  for (const [collection, label] of Object.entries(COLLECTION_LABELS)) {
    collectionQueries[collection] =
      `MATCH (n:${label}) WHERE n.timelineProjectId = ${ns} RETURN n.recordJson AS recordJson ORDER BY n.timelineId`;
  }
  return {
    project: `MATCH (n:TimelineProject) WHERE n.timelineProjectId = ${ns} RETURN n.recordJson AS recordJson LIMIT 1`,
    ...collectionQueries,
    relationships: `MATCH ()-[r]->() WHERE r.timelineProjectId = ${ns} AND r.recordJson IS NOT NULL RETURN r.recordJson AS recordJson ORDER BY r.timelineId`,
  };
}

export function setupCypher(): string[] {
  return [
    "CREATE CONSTRAINT ON (n:TimelineEntity) ASSERT n.timelineKey IS UNIQUE;",
    "CREATE INDEX ON :TimelineEntity(timelineProjectId);",
    "CREATE INDEX ON :TimelinePlace(timelineProjectId);",
    "CREATE INDEX ON :TimelineItem(timelineProjectId);",
    "CREATE INDEX ON :TimelineStory(timelineProjectId);",
  ];
}

interface ExportBundleOptions {
  namespace?: string;
}

interface ExportBundle {
  format: string;
  namespace: string;
  schema: Record<string, any>;
  setupCypher: string[];
  replacePrelude: string[];
  statements: string[];
  queries: Record<string, string>;
  records: Record<string, any>;
  mcp: Record<string, any>;
}

export function exportBundle(project: any, options?: ExportBundleOptions): ExportBundle {
  const namespace = text(options?.namespace, 120) || DEFAULT_NAMESPACE;
  const statements: string[] = [];
  const projectMeta = projectRecord(project);
  statements.push(
    `MERGE (n:TimelineProject {timelineKey: ${cypherString(`${namespace}:project`)}}) SET n.timelineId = ${cypherString("project")}, n.timelineProjectId = ${cypherString(namespace)}, n.recordJson = ${cypherString(recordJson(projectMeta))}, n.title = ${cypherString(projectMeta.title)} RETURN n.timelineId AS timelineId`,
  );

  for (const [collection, label] of Object.entries(COLLECTION_LABELS)) {
    for (const record of Array.isArray(project?.[collection]) ? project[collection] : []) {
      statements.push(nodeStatement(label as string, record, namespace));
    }
  }

  for (const relationship of Array.isArray(project?.relationships) ? project.relationships : []) {
    statements.push(...relationshipStatements(relationship, namespace));
  }

  const records = {
    project: projectMeta,
    categories: clone(project?.categories || []),
    items: clone(project?.items || []),
    stories: clone(project?.stories || []),
    entities: clone(project?.entities || []),
    places: clone(project?.places || []),
    relationships: clone(project?.relationships || []),
    evidence: clone(project?.evidence || []),
    custodyActions: clone(project?.custodyActions || []),
  };

  return {
    format: FORMAT,
    namespace,
    schema: {
      canonicalEntityLabel: "TimelineEntity",
      canonicalRelationshipProperty: "predicate",
      idProperty: "timelineId",
      namespaceProperty: "timelineProjectId",
      payloadProperty: "recordJson",
      collectionLabels: clone(COLLECTION_LABELS),
    },
    setupCypher: setupCypher(),
    replacePrelude: [
      `MATCH ()-[r]->() WHERE r.timelineProjectId = ${cypherString(namespace)} DELETE r`,
      `MATCH (n) WHERE n.timelineProjectId = ${cypherString(namespace)} DETACH DELETE n`,
    ],
    statements,
    queries: queryRecipes(namespace),
    records,
    mcp: {
      server: "memgraph/mcp-memgraph",
      writeRequirement:
        "Set MCP_READ_ONLY=false before asking Memgraph MCP to execute write Cypher.",
      writeWorkflow:
        "For a full mirror, execute replacePrelude first, then statements in order with the Memgraph MCP query tool. For non-destructive upsert-only sync, skip replacePrelude. setupCypher is optional and should be reviewed before first use.",
      readWorkflow:
        "Execute the generated queries with Memgraph MCP and pass their returned rows to timeline.memgraph_import.",
    },
  };
}

function rowRecord(row: any): any {
  if (row === null || row === undefined) return null;
  if (typeof row === "string") {
    try {
      return JSON.parse(row);
    } catch {
      return null;
    }
  }
  if (typeof row !== "object" || Array.isArray(row)) return null;
  const raw =
    row.recordJson ??
    row.record_json ??
    row.json ??
    row.record?.recordJson ??
    row.properties?.recordJson ??
    null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return clone(raw);
  if (row.id || row.title || row.name || row.subjectId || row.objectId) return clone(row);
  return null;
}

export function recordsFromRows(rows: unknown): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(rowRecord).filter(Boolean);
}

export function importSnapshot(snapshot: unknown, baseProject: any = {}): Record<string, any> {
  if (!snapshot || typeof snapshot !== "object")
    throw new Error("Memgraph snapshot must be an object.");
  const next = clone(baseProject || {}) as any;
  const source =
    (snapshot as any).records && typeof (snapshot as any).records === "object"
      ? (snapshot as any).records
      : snapshot;

  const wrappedProject =
    (source as any).project &&
    typeof (source as any).project === "object" &&
    !Array.isArray((source as any).project) &&
    !("recordJson" in (source as any).project) &&
    !("record_json" in (source as any).project) &&
    !("json" in (source as any).project) &&
    !("record" in (source as any).project) &&
    !("properties" in (source as any).project)
      ? clone((source as any).project)
      : null;
  const projectRows = Array.isArray((source as any).project)
    ? (source as any).project
    : (source as any).project
      ? [(source as any).project]
      : [];
  const project = wrappedProject || projectRows.map(rowRecord).find(Boolean);
  if (project) {
    if ("version" in project) next.version = project.version;
    if ("title" in project) next.title = project.title;
    if ("extensions" in project) next.extensions = clone(project.extensions);
    if ("reasoning" in project) next.reasoning = clone(project.reasoning);
  }

  for (const collection of Object.keys(COLLECTION_LABELS)) {
    if (Array.isArray((source as any)[collection]))
      next[collection] = recordsFromRows((source as any)[collection]);
  }
  if (Array.isArray((source as any).relationships)) {
    next.relationships = recordsFromRows((source as any).relationships);
  }

  return next;
}

const TimelineMemgraphInterchangeObj = {
  FORMAT,
  DEFAULT_NAMESPACE,
  COLLECTION_LABELS,
  relationshipType,
  queryRecipes,
  setupCypher,
  exportBundle,
  importSnapshot,
  recordsFromRows,
} as const;

export const TimelineMemgraphInterchange = Object.freeze(TimelineMemgraphInterchangeObj);
