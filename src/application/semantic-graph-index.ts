import type { CanonicalEntity } from "../domain/entity.ts";
import type { EntityId, RelationshipId } from "../domain/ids.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";
import { validateActionPredicate } from "../domain/relationship.ts";

export interface SemanticNeighborhoodOptions {
  readonly depth?: number;
  readonly limit?: number;
}

export interface SemanticNeighborhood {
  readonly entityIds: readonly EntityId[];
  readonly relationshipIds: readonly RelationshipId[];
}

export interface SemanticDegree {
  readonly incoming: number;
  readonly outgoing: number;
  readonly total: number;
}

export interface SemanticGraphSnapshot {
  readonly entityIds: readonly string[];
  readonly relationships: readonly {
    readonly id: string;
    readonly subjectId: string;
    readonly objectId: string;
    readonly predicate: string;
  }[];
}

interface IndexState {
  readonly project: CanonicalProject;
  readonly entities: ReadonlyMap<EntityId, CanonicalEntity>;
  readonly relationships: ReadonlyMap<RelationshipId, CanonicalRelationship>;
  readonly incoming: ReadonlyMap<EntityId, readonly CanonicalRelationship[]>;
  readonly outgoing: ReadonlyMap<EntityId, readonly CanonicalRelationship[]>;
  readonly incident: ReadonlyMap<EntityId, readonly CanonicalRelationship[]>;
}

function compareIds(left: { readonly id: string }, right: { readonly id: string }): number {
  return String(left.id).localeCompare(String(right.id));
}

function sortedRelationships(
  relationships: readonly CanonicalRelationship[],
): readonly CanonicalRelationship[] {
  return [...relationships].sort(compareIds);
}

function buildState(project: CanonicalProject): IndexState {
  const entities = new Map<EntityId, CanonicalEntity>();
  for (const entity of project.entities) {
    if (entities.has(entity.id)) {
      throw new Error(`Duplicate entity ID "${String(entity.id)}".`);
    }
    entities.set(entity.id, entity);
  }

  const relationships = new Map<RelationshipId, CanonicalRelationship>();
  const incomingMutable = new Map<EntityId, CanonicalRelationship[]>();
  const outgoingMutable = new Map<EntityId, CanonicalRelationship[]>();

  for (const relationship of project.relationships) {
    if (relationships.has(relationship.id)) {
      throw new Error(`Duplicate relationship ID "${String(relationship.id)}".`);
    }
    if (relationship.subjectId === relationship.objectId) {
      throw new Error("A canonical relationship cannot target its source entity.");
    }
    if (!entities.has(relationship.subjectId) || !entities.has(relationship.objectId)) {
      throw new Error("Both relationship endpoints must reference existing canonical entities.");
    }
    const predicateValidation = validateActionPredicate(relationship.predicate);
    if (!predicateValidation.valid) throw new Error(predicateValidation.message);

    relationships.set(relationship.id, relationship);

    const incoming = incomingMutable.get(relationship.objectId) ?? [];
    incoming.push(relationship);
    incomingMutable.set(relationship.objectId, incoming);

    const outgoing = outgoingMutable.get(relationship.subjectId) ?? [];
    outgoing.push(relationship);
    outgoingMutable.set(relationship.subjectId, outgoing);
  }

  const incoming = new Map<EntityId, readonly CanonicalRelationship[]>();
  const outgoing = new Map<EntityId, readonly CanonicalRelationship[]>();
  const incident = new Map<EntityId, readonly CanonicalRelationship[]>();

  for (const entityId of entities.keys()) {
    const incomingRecords = sortedRelationships(incomingMutable.get(entityId) ?? []);
    const outgoingRecords = sortedRelationships(outgoingMutable.get(entityId) ?? []);
    incoming.set(entityId, incomingRecords);
    outgoing.set(entityId, outgoingRecords);
    incident.set(
      entityId,
      sortedRelationships(
        [...new Map(
          [...incomingRecords, ...outgoingRecords].map((relationship) => [
            relationship.id,
            relationship,
          ]),
        ).values()],
      ),
    );
  }

  return {
    project,
    entities,
    relationships,
    incoming,
    outgoing,
    incident,
  };
}

function normalizedDepth(value: number | undefined): number {
  return Math.max(0, Math.trunc(value ?? 1));
}

function normalizedLimit(value: number | undefined): number {
  return Math.max(1, Math.trunc(value ?? 36));
}

export function createSemanticGraphIndex(initialProject: CanonicalProject) {
  let state = buildState(initialProject);
  let revision = 0;

  function entity(id: EntityId): CanonicalEntity | undefined {
    return state.entities.get(id);
  }

  function relationship(id: RelationshipId): CanonicalRelationship | undefined {
    return state.relationships.get(id);
  }

  function incoming(id: EntityId): readonly CanonicalRelationship[] {
    return state.incoming.get(id) ?? [];
  }

  function outgoing(id: EntityId): readonly CanonicalRelationship[] {
    return state.outgoing.get(id) ?? [];
  }

  function incident(id: EntityId): readonly CanonicalRelationship[] {
    return state.incident.get(id) ?? [];
  }

  function degree(id: EntityId): SemanticDegree {
    const incomingCount = incoming(id).length;
    const outgoingCount = outgoing(id).length;
    return {
      incoming: incomingCount,
      outgoing: outgoingCount,
      total: incident(id).length,
    };
  }

  function neighborhood(
    rootId: EntityId,
    options: SemanticNeighborhoodOptions = {},
  ): SemanticNeighborhood {
    if (!state.entities.has(rootId)) {
      return { entityIds: [], relationshipIds: [] };
    }

    const depth = normalizedDepth(options.depth);
    const limit = normalizedLimit(options.limit);
    const selected = new Set<EntityId>([rootId]);
    let frontier: EntityId[] = [rootId];

    for (let level = 0; level < depth && selected.size < limit; level += 1) {
      const candidates = new Set<EntityId>();

      for (const currentId of frontier) {
        for (const edge of incident(currentId)) {
          const neighbor =
            edge.subjectId === currentId ? edge.objectId : edge.subjectId;
          if (!selected.has(neighbor)) candidates.add(neighbor);
        }
      }

      const next: EntityId[] = [];
      for (const candidate of [...candidates].sort((left, right) =>
        String(left).localeCompare(String(right)),
      )) {
        if (selected.size >= limit) break;
        selected.add(candidate);
        next.push(candidate);
      }

      frontier = next;
      if (frontier.length === 0) break;
    }

    const entityIds = [...selected].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
    const selectedIds = new Set(entityIds);
    const relationshipIds = [...state.relationships.values()]
      .filter(
        (edge) =>
          selectedIds.has(edge.subjectId) && selectedIds.has(edge.objectId),
      )
      .map((edge) => edge.id)
      .sort((left, right) => String(left).localeCompare(String(right)));

    return { entityIds, relationshipIds };
  }

  function connectedComponents(): readonly (readonly EntityId[])[] {
    const remaining = new Set(
      [...state.entities.keys()].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ),
    );
    const components: EntityId[][] = [];

    while (remaining.size) {
      const root = remaining.values().next().value as EntityId;
      const component: EntityId[] = [];
      const queue: EntityId[] = [root];
      remaining.delete(root);

      while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        component.push(current);

        const neighbors = incident(current)
          .map((edge) =>
            edge.subjectId === current ? edge.objectId : edge.subjectId,
          )
          .filter((candidate) => remaining.has(candidate))
          .sort((left, right) => String(left).localeCompare(String(right)));

        for (const neighbor of neighbors) {
          if (!remaining.delete(neighbor)) continue;
          queue.push(neighbor);
        }
      }

      component.sort((left, right) => String(left).localeCompare(String(right)));
      components.push(component);
    }

    return components.sort((left, right) =>
      String(left[0] ?? "").localeCompare(String(right[0] ?? "")),
    );
  }

  function snapshot(): SemanticGraphSnapshot {
    return {
      entityIds: [...state.entities.keys()]
        .map(String)
        .sort((left, right) => left.localeCompare(right)),
      relationships: [...state.relationships.values()]
        .sort(compareIds)
        .map((edge) => ({
          id: String(edge.id),
          subjectId: String(edge.subjectId),
          objectId: String(edge.objectId),
          predicate: edge.predicate,
        })),
    };
  }

  function replace(project: CanonicalProject): void {
    const next = buildState(project);
    state = next;
    revision += 1;
  }

  function currentRevision(): number {
    return revision;
  }

  return Object.freeze({
    entity,
    relationship,
    incoming,
    outgoing,
    incident,
    degree,
    neighborhood,
    connectedComponents,
    snapshot,
    replace,
    revision: currentRevision,
  });
}

export type SemanticGraphIndex = ReturnType<typeof createSemanticGraphIndex>;
