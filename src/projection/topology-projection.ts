import type { SemanticGraphIndex } from "../application/semantic-graph-index.ts";
import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { TopologyEdgeProjection, TopologyProjection } from "./topology-types.ts";

export interface CompatibilityRelationChange {
  readonly relationshipId?: unknown;
}

export interface CompatibilityChronologyItem {
  readonly id?: unknown;
  readonly relationChanges?: readonly CompatibilityRelationChange[];
}

export interface TopologyProjectionProject extends CanonicalProject {
  readonly items?: readonly CompatibilityChronologyItem[];
}

export interface FocusedTopologyProjectionOptions {
  readonly depth?: number;
  readonly limit?: number;
}

function text(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sortedEntityIds(values: Iterable<EntityId>): EntityId[] {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sortedRelationshipIds(values: Iterable<RelationshipId>): RelationshipId[] {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function nodeProjection(index: SemanticGraphIndex, id: EntityId) {
  const entity = index.entity(id);
  return entity
    ? Object.freeze({
        id: entity.id,
        label: entity.name || String(entity.id),
        kind: entity.type || "entity",
      })
    : null;
}

function activeRelationshipSet(
  project: TopologyProjectionProject,
  relationshipIds: readonly RelationshipId[],
): Set<RelationshipId> {
  const canonical = new Set(project.relationships.map((relationship) => relationship.id));
  const result = new Set<RelationshipId>();
  for (const id of relationshipIds) {
    if (!canonical.has(id)) {
      throw new Error(`Active topology relationship ${String(id)} is not canonical.`);
    }
    result.add(id);
  }
  return result;
}

export function projectTopology(
  project: TopologyProjectionProject,
  index: SemanticGraphIndex,
  relationshipIds: readonly RelationshipId[],
): TopologyProjection {
  const active = activeRelationshipSet(project, relationshipIds);
  const nodeIds = new Set<EntityId>();
  const edges: TopologyEdgeProjection[] = [];

  for (const id of sortedRelationshipIds(active)) {
    const relationship = index.relationship(id);
    if (!relationship) {
      throw new Error(`SemanticGraphIndex is missing canonical relationship ${String(id)}.`);
    }
    nodeIds.add(relationship.subjectId);
    nodeIds.add(relationship.objectId);
    edges.push(
      Object.freeze({
        id: relationship.id,
        sourceId: relationship.subjectId,
        targetId: relationship.objectId,
        label: relationship.predicate,
      }),
    );
  }

  const nodes = sortedEntityIds(nodeIds)
    .map((id) => nodeProjection(index, id))
    .filter((node): node is NonNullable<typeof node> => node !== null);

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}

function contextRelationshipIds(
  project: TopologyProjectionProject,
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

  const item = (Array.isArray(project.items) ? project.items : []).find(
    (candidate) => text(candidate?.id, 120) === rootId,
  );
  for (const change of Array.isArray(item?.relationChanges) ? item.relationChanges : []) {
    const id = text(change?.relationshipId, 120);
    const relationship = project.relationships.find(
      (candidate) => String(candidate.id) === id,
    );
    if (relationship) result.add(relationship.id);
  }
  return result;
}

export function projectFocusedTopology(
  project: TopologyProjectionProject,
  index: SemanticGraphIndex,
  relationshipIds: readonly RelationshipId[],
  rootId: EntityId | string,
  options: FocusedTopologyProjectionOptions = {},
): TopologyProjection {
  const base = projectTopology(project, index, relationshipIds);
  const activeEdges = new Map(base.edges.map((edge) => [edge.id, edge] as const));
  const visibleNodes = new Set(base.nodes.map((node) => node.id));
  const selected = new Set<EntityId>();
  const root = String(rootId || "");

  const rootEntity = sortedEntityIds(visibleNodes).find((id) => String(id) === root);
  if (rootEntity) selected.add(rootEntity);

  for (const relationshipId of sortedRelationshipIds(contextRelationshipIds(project, root))) {
    const edge = activeEdges.get(relationshipId);
    if (!edge) continue;
    selected.add(edge.sourceId);
    selected.add(edge.targetId);
  }

  if (selected.size === 0) {
    return Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) });
  }

  const depth = Math.max(0, Math.trunc(options.depth ?? 1));
  const limit = Math.max(1, Math.trunc(options.limit ?? 36));
  const seeds = sortedEntityIds(selected).slice(0, limit);
  selected.clear();
  for (const id of seeds) selected.add(id);
  let frontier = seeds;

  for (let level = 0; level < depth && selected.size < limit; level += 1) {
    const candidates = new Set<EntityId>();
    for (const entityId of frontier) {
      for (const relationship of index.incident(entityId)) {
        if (!activeEdges.has(relationship.id)) continue;
        const neighbor =
          relationship.subjectId === entityId
            ? relationship.objectId
            : relationship.subjectId;
        if (visibleNodes.has(neighbor) && !selected.has(neighbor)) candidates.add(neighbor);
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

  const nodeIds = sortedEntityIds(selected);
  const selectedSet = new Set(nodeIds);
  const nodes = nodeIds
    .map((id) => nodeProjection(index, id))
    .filter((node): node is NonNullable<typeof node> => node !== null);
  const edges = sortedRelationshipIds(activeEdges.keys())
    .map((id) => activeEdges.get(id))
    .filter(
      (edge): edge is TopologyEdgeProjection =>
        edge !== undefined &&
        selectedSet.has(edge.sourceId) &&
        selectedSet.has(edge.targetId),
    );

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
