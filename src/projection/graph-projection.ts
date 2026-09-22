import type { SemanticGraphIndex } from "../application/semantic-graph-index.ts";
import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import type {
  GraphEdgeProjection,
  GraphProjection,
  GraphTemporalState,
  TemporalProjectionBounds,
} from "../layout/graph-surface.ts";

export interface CompatibilityRelationChange {
  readonly relationshipId?: unknown;
  readonly operation?: unknown;
  readonly predicate?: unknown;
  readonly role?: unknown;
}

export interface CompatibilityChronologyItem {
  readonly id?: unknown;
  readonly start?: unknown;
  readonly time?: {
    readonly start?: unknown;
  } | null;
  readonly relationChanges?: readonly CompatibilityRelationChange[];
}

export interface GraphProjectionProject extends CanonicalProject {
  readonly items?: readonly CompatibilityChronologyItem[];
}

export interface FocusedGraphProjectionOptions {
  readonly depth?: number;
  readonly limit?: number;
}

interface RelationshipChange {
  readonly relationshipId: string;
  readonly operation: "activate" | "deactivate" | "update";
  readonly predicate: string;
  readonly role: string;
  readonly itemId: string;
  readonly time: number;
}

interface RelationshipProjectionState {
  readonly active: boolean;
  readonly changedInWindow: boolean;
  readonly predicate: string;
  readonly role: string;
  readonly changes: readonly RelationshipChange[];
  readonly locatable: boolean;
}

function text(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function utcDate(
  year: number,
  monthIndex = 0,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function parseCanonicalTime(value: unknown): number {
  const source = text(value, 160);
  if (!source) return Number.NaN;

  const year = /^([+-]?\d{1,6})$/.exec(source);
  if (year) return utcDate(Number(year[1]), 0, 1);

  const month = /^([+-]?\d{1,6})-(\d{2})$/.exec(source);
  if (month) return utcDate(Number(month[1]), Number(month[2]) - 1, 1);

  const day = /^([+-]?\d{1,6})-(\d{2})-(\d{2})$/.exec(source);
  if (day) return utcDate(Number(day[1]), Number(day[2]) - 1, Number(day[3]));

  const timestamp = Date.parse(source);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

interface EndpointBounds {
  readonly start: number;
  readonly end: number;
  readonly locatable: boolean;
}

function endpointBounds(endpoint: unknown): EndpointBounds {
  if (typeof endpoint === "string") {
    const value = parseCanonicalTime(endpoint);
    return { start: value, end: value, locatable: Number.isFinite(value) };
  }
  if (!endpoint || typeof endpoint !== "object") {
    return { start: Number.NaN, end: Number.NaN, locatable: false };
  }

  const record = endpoint as Readonly<Record<string, unknown>>;
  const exact = parseCanonicalTime(record.value);
  const earliest = parseCanonicalTime(record.earliest);
  const latest = parseCanonicalTime(record.latest);
  const start = Number.isFinite(earliest) ? earliest : exact;
  const end = Number.isFinite(latest) ? latest : exact;
  return {
    start,
    end,
    locatable: Number.isFinite(start) && Number.isFinite(end) && start <= end,
  };
}

function representativeTime(endpoint: unknown): number {
  const bounds = endpointBounds(endpoint);
  return bounds.locatable ? bounds.start + (bounds.end - bounds.start) / 2 : Number.NaN;
}

function relationshipBounds(relationship: CanonicalRelationship): EndpointBounds {
  const time = relationship.time;
  if (!time || time.openStart || !time.start) {
    return { start: Number.NaN, end: Number.NaN, locatable: false };
  }

  const start = endpointBounds(time.start);
  if (!start.locatable) return start;
  if (time.type !== "interval" || time.openEnd) return start;

  const end = endpointBounds(time.end);
  if (!end.locatable) {
    return { start: Number.NaN, end: Number.NaN, locatable: false };
  }
  return {
    start: start.start,
    end: end.end,
    locatable: start.start <= end.end,
  };
}

function validViewport(
  viewport: TemporalProjectionBounds | null | undefined,
): viewport is TemporalProjectionBounds {
  return Boolean(
    viewport &&
      Number.isFinite(viewport.start) &&
      Number.isFinite(viewport.end) &&
      viewport.end >= viewport.start,
  );
}

function normalizeRelationChanges(
  project: GraphProjectionProject,
): ReadonlyMap<string, readonly RelationshipChange[]> {
  const indexed = new Map<string, RelationshipChange[]>();

  for (const item of Array.isArray(project.items) ? project.items : []) {
    const itemId = text(item?.id, 120);
    const itemTime = representativeTime(item?.time?.start ?? item?.start);
    if (!itemId || !Number.isFinite(itemTime)) continue;

    for (const raw of Array.isArray(item.relationChanges) ? item.relationChanges : []) {
      const relationshipId = text(raw?.relationshipId, 120);
      const operation = text(raw?.operation, 40);
      if (
        !relationshipId ||
        (operation !== "activate" && operation !== "deactivate" && operation !== "update")
      ) {
        continue;
      }
      const change: RelationshipChange = {
        relationshipId,
        operation,
        predicate: text(raw?.predicate, 120),
        role: text(raw?.role, 120),
        itemId,
        time: itemTime,
      };
      const records = indexed.get(relationshipId) ?? [];
      records.push(change);
      indexed.set(relationshipId, records);
    }
  }

  for (const records of indexed.values()) {
    records.sort(
      (left, right) =>
        left.time - right.time ||
        left.itemId.localeCompare(right.itemId) ||
        left.operation.localeCompare(right.operation),
    );
  }
  return indexed;
}

function relationshipState(
  relationship: CanonicalRelationship,
  viewport: TemporalProjectionBounds | null,
  changes: readonly RelationshipChange[],
): RelationshipProjectionState {
  const relationshipRecord = relationship as CanonicalRelationship & {
    readonly initialState?: "active" | "inactive";
  };
  const bounds = relationshipBounds(relationship);
  const hasViewport = validViewport(viewport);
  const snapshotTime = hasViewport
    ? viewport.start + (viewport.end - viewport.start) / 2
    : Number.POSITIVE_INFINITY;

  let active = relationshipRecord.initialState !== "inactive";
  let predicate = relationship.predicate;
  let role = relationship.role ?? "";

  if (relationship.time && bounds.locatable) {
    active = hasViewport
      ? bounds.end >= viewport.start && bounds.start <= viewport.end
      : true;
  }

  let changedInWindow = false;
  for (const change of changes) {
    if (hasViewport && change.time >= viewport.start && change.time <= viewport.end) {
      changedInWindow = true;
    }
    if (change.time > snapshotTime) break;
    if (change.operation === "activate") active = true;
    else if (change.operation === "deactivate") active = false;
    else {
      if (change.predicate) predicate = change.predicate;
      if (change.role) role = change.role;
    }
  }

  return {
    active,
    changedInWindow,
    predicate,
    role,
    changes,
    locatable: bounds.locatable,
  };
}

function temporalState(
  relationship: CanonicalRelationship,
  state: RelationshipProjectionState,
): GraphTemporalState {
  if (state.changedInWindow) return "changed";
  if (!relationship.time && state.changes.length === 0 && state.active) return "timeless";
  if (relationship.time && !state.locatable && state.active) return "unknown";
  return state.active ? "active" : "inactive";
}

function nodeProjection(index: SemanticGraphIndex, id: EntityId) {
  const entity = index.entity(id);
  return entity
    ? {
        id: entity.id,
        label: entity.name || String(entity.id),
        kind: entity.type || "entity",
      }
    : null;
}

function edgeProjection(
  relationship: CanonicalRelationship,
  label: string,
  state: GraphTemporalState,
): GraphEdgeProjection {
  return {
    id: relationship.id,
    sourceId: relationship.subjectId,
    targetId: relationship.objectId,
    label,
    temporalState: state,
  };
}

function sortedEntityIds(values: Iterable<EntityId>): EntityId[] {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sortedRelationshipIds(values: Iterable<RelationshipId>): RelationshipId[] {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

export function projectGraphWindow(
  project: GraphProjectionProject,
  index: SemanticGraphIndex,
  viewport: TemporalProjectionBounds | null,
): GraphProjection {
  const changesByRelationship = normalizeRelationChanges(project);
  const visibleEdges: GraphEdgeProjection[] = [];
  const visibleEntityIds = new Set<EntityId>();

  const relationships = [...project.relationships].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  );

  for (const relationship of relationships) {
    const state = relationshipState(
      relationship,
      viewport,
      changesByRelationship.get(String(relationship.id)) ?? [],
    );
    const edgeState = temporalState(relationship, state);
    if (edgeState === "inactive") continue;
    visibleEdges.push(edgeProjection(relationship, state.predicate, edgeState));
    visibleEntityIds.add(relationship.subjectId);
    visibleEntityIds.add(relationship.objectId);
  }

  const nodeIds = validViewport(viewport)
    ? sortedEntityIds(visibleEntityIds)
    : sortedEntityIds(project.entities.map((entity) => entity.id));
  const nodes = nodeIds
    .map((id) => nodeProjection(index, id))
    .filter((node): node is NonNullable<typeof node> => node !== null);

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(
      visibleEdges.sort((left, right) => String(left.id).localeCompare(String(right.id))),
    ),
    ...(validViewport(viewport)
      ? { temporal: Object.freeze({ start: viewport.start, end: viewport.end }) }
      : {}),
  });
}

function compatibilityContextRelationshipIds(
  project: GraphProjectionProject,
  rootId: string,
): Set<RelationshipId> {
  const result = new Set<RelationshipId>();
  for (const relationship of project.relationships) {
    if (
      String(relationship.id) === rootId ||
      relationship.itemIds.some((itemId) => String(itemId) === rootId)
    ) {
      result.add(relationship.id);
    }
  }
  const rootItem = (Array.isArray(project.items) ? project.items : []).find(
    (item) => text(item?.id, 120) === rootId,
  );
  for (const change of Array.isArray(rootItem?.relationChanges)
    ? rootItem.relationChanges
    : []) {
    const id = text(change?.relationshipId, 120);
    const relationship = [...project.relationships].find(
      (candidate) => String(candidate.id) === id,
    );
    if (relationship) result.add(relationship.id);
  }
  return result;
}

export function projectFocusedGraph(
  project: GraphProjectionProject,
  index: SemanticGraphIndex,
  rootId: EntityId | string,
  viewport: TemporalProjectionBounds | null,
  options: FocusedGraphProjectionOptions = {},
): GraphProjection {
  const base = projectGraphWindow(project, index, viewport);
  const visibleEdgeIds = new Set(base.edges.map((edge) => edge.id));
  const edgeById = new Map(base.edges.map((edge) => [edge.id, edge] as const));
  const visibleNodeIds = new Set(base.nodes.map((node) => node.id));
  const selected = new Set<EntityId>();
  const root = String(rootId || "");
  const rootEntity = sortedEntityIds(visibleNodeIds).find((id) => String(id) === root);
  if (rootEntity) selected.add(rootEntity);

  const contextRelationshipIds = compatibilityContextRelationshipIds(project, root);
  for (const relationshipId of sortedRelationshipIds(contextRelationshipIds)) {
    if (!visibleEdgeIds.has(relationshipId)) continue;
    const relationship = index.relationship(relationshipId);
    if (!relationship) continue;
    selected.add(relationship.subjectId);
    selected.add(relationship.objectId);
  }

  if (selected.size === 0) {
    return Object.freeze({
      nodes: Object.freeze([]),
      edges: Object.freeze([]),
      ...(base.temporal ? { temporal: base.temporal } : {}),
    });
  }

  const depth = Math.max(0, Math.trunc(options.depth ?? 1));
  const limit = Math.max(1, Math.trunc(options.limit ?? 36));
  const limitedSeeds = sortedEntityIds(selected).slice(0, limit);
  selected.clear();
  for (const id of limitedSeeds) selected.add(id);
  let frontier = limitedSeeds;

  for (let level = 0; level < depth && selected.size < limit; level += 1) {
    const candidates = new Set<EntityId>();
    for (const entityId of frontier) {
      for (const relationship of index.incident(entityId)) {
        if (!visibleEdgeIds.has(relationship.id)) continue;
        const neighbor =
          relationship.subjectId === entityId
            ? relationship.objectId
            : relationship.subjectId;
        if (visibleNodeIds.has(neighbor) && !selected.has(neighbor)) {
          candidates.add(neighbor);
        }
      }
    }

    const next: EntityId[] = [];
    for (const candidate of sortedEntityIds(candidates)) {
      if (selected.size >= limit) break;
      selected.add(candidate);
      next.push(candidate);
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  const selectedIds = sortedEntityIds(selected);
  const selectedSet = new Set(selectedIds);
  const nodes = selectedIds
    .map((id) => nodeProjection(index, id))
    .filter((node): node is NonNullable<typeof node> => node !== null);
  const relationshipIds = sortedRelationshipIds(
    [...visibleEdgeIds].filter((id) => {
      const relationship = index.relationship(id);
      return Boolean(
        relationship &&
          selectedSet.has(relationship.subjectId) &&
          selectedSet.has(relationship.objectId),
      );
    }),
  );
  const edges = relationshipIds
    .map((id) => edgeById.get(id))
    .filter((edge): edge is GraphEdgeProjection => edge !== undefined);

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    ...(base.temporal ? { temporal: base.temporal } : {}),
  });
}
