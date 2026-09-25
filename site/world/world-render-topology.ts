import type { EntityId, PlaceId, RelationshipId } from "../../src/domain/ids.ts";
import type { WorldSelection } from "../../src/layout/world-surface.ts";
import type {
  ProjectedWorldInstance,
  WorldInstanceId,
  WorldProjection,
} from "../../src/projection/world-projection.ts";
import type { WorldProjectionDelta } from "../../src/projection/world-projection-delta.ts";

type WorldProjectionEdge = WorldProjection["edges"][number];

export interface WorldInteractionNeighborhood {
  readonly entityIds: ReadonlySet<EntityId>;
  readonly relationshipIds: ReadonlySet<RelationshipId>;
  readonly placeIds: ReadonlySet<PlaceId>;
}

/**
 * Retained topology lookup for renderer interaction and relationship routing.
 *
 * Force/layout deltas update only derived instance positions. They therefore
 * update instance records in place without rebuilding edge adjacency or
 * parallel-edge lane assignments. Structural projection changes rebuild the
 * index from canonical projection data.
 */
export class WorldRenderTopologyIndex {
  #instanceById = new Map<WorldInstanceId, ProjectedWorldInstance>();
  #entityByInstance = new Map<WorldInstanceId, EntityId>();
  #edgeById = new Map<RelationshipId, WorldProjectionEdge>();
  #edgesByEntity = new Map<EntityId, readonly WorldProjectionEdge[]>();
  #placeMemberCounts = new Map<PlaceId, number>();
  #lanes = new Map<RelationshipId, number>();

  constructor(projection: WorldProjection) {
    this.replace(projection);
  }

  get instanceById(): ReadonlyMap<WorldInstanceId, ProjectedWorldInstance> {
    return this.#instanceById;
  }

  get entityByInstance(): ReadonlyMap<WorldInstanceId, EntityId> {
    return this.#entityByInstance;
  }

  get edgeById(): ReadonlyMap<RelationshipId, WorldProjectionEdge> {
    return this.#edgeById;
  }

  get edgesByEntity(): ReadonlyMap<EntityId, readonly WorldProjectionEdge[]> {
    return this.#edgesByEntity;
  }

  get placeMemberCounts(): ReadonlyMap<PlaceId, number> {
    return this.#placeMemberCounts;
  }

  get lanes(): ReadonlyMap<RelationshipId, number> {
    return this.#lanes;
  }

  replace(projection: WorldProjection): void {
    const instanceById = new Map<WorldInstanceId, ProjectedWorldInstance>();
    const entityByInstance = new Map<WorldInstanceId, EntityId>();
    const placeMemberCounts = new Map<PlaceId, number>();
    for (const instance of projection.instances) {
      instanceById.set(instance.id, instance);
      entityByInstance.set(instance.id, instance.canonicalId);
      const placeId = instance.geographicAnchors[0]?.placeId;
      if (placeId) placeMemberCounts.set(placeId, (placeMemberCounts.get(placeId) ?? 0) + 1);
    }

    const edgeById = new Map<RelationshipId, WorldProjectionEdge>();
    const mutableEdgesByEntity = new Map<EntityId, WorldProjectionEdge[]>();
    const groups = new Map<string, WorldProjectionEdge[]>();

    for (const edge of projection.edges) {
      edgeById.set(edge.id, edge);

      const sourceEntityId = entityByInstance.get(edge.sourceInstanceId);
      const targetEntityId = entityByInstance.get(edge.targetInstanceId);
      if (sourceEntityId) {
        const sourceEdges = mutableEdgesByEntity.get(sourceEntityId);
        if (sourceEdges) sourceEdges.push(edge);
        else mutableEdgesByEntity.set(sourceEntityId, [edge]);
      }
      if (targetEntityId && targetEntityId !== sourceEntityId) {
        const targetEdges = mutableEdgesByEntity.get(targetEntityId);
        if (targetEdges) targetEdges.push(edge);
        else mutableEdgesByEntity.set(targetEntityId, [edge]);
      }

      const sourceKey = String(edge.sourceInstanceId);
      const targetKey = String(edge.targetInstanceId);
      const pair =
        sourceKey.localeCompare(targetKey) <= 0
          ? JSON.stringify([sourceKey, targetKey])
          : JSON.stringify([targetKey, sourceKey]);
      const group = groups.get(pair);
      if (group) group.push(edge);
      else groups.set(pair, [edge]);
    }

    const lanes = new Map<RelationshipId, number>();
    for (const group of groups.values()) {
      group.sort((left, right) => String(left.id).localeCompare(String(right.id)));
      if (group.length === 1) {
        const [onlyEdge] = group;
        if (onlyEdge) lanes.set(onlyEdge.id, 0);
        continue;
      }
      group.forEach((edge, index) => {
        const magnitude = Math.floor(index / 2) + 1;
        lanes.set(edge.id, index % 2 === 0 ? -magnitude : magnitude);
      });
    }

    this.#instanceById = instanceById;
    this.#entityByInstance = entityByInstance;
    this.#edgeById = edgeById;
    this.#edgesByEntity = new Map(
      [...mutableEdgesByEntity].map(([entityId, edges]) => [entityId, Object.freeze([...edges])]),
    );
    this.#placeMemberCounts = placeMemberCounts;
    this.#lanes = lanes;
  }

  applyDelta(delta: WorldProjectionDelta, projection: WorldProjection): void {
    const hasStructuralChange =
      delta.addedInstances.length > 0 ||
      delta.removedInstanceIds.length > 0 ||
      delta.addedEdges.length > 0 ||
      delta.updatedEdges.length > 0 ||
      delta.removedEdgeIds.length > 0;

    if (hasStructuralChange) {
      this.replace(projection);
      return;
    }

    for (const instance of delta.updatedInstances) {
      const previous = this.#instanceById.get(instance.id);
      if (
        !previous ||
        previous.canonicalId !== instance.canonicalId ||
        previous.geographicAnchors[0]?.placeId !== instance.geographicAnchors[0]?.placeId
      ) {
        this.replace(projection);
        return;
      }
    }

    for (const instance of delta.updatedInstances) {
      this.#instanceById.set(instance.id, instance);
    }
  }

  interactionNeighborhood(
    selections: readonly (WorldSelection | null)[],
  ): WorldInteractionNeighborhood {
    const entityIds = new Set<EntityId>();
    const relationshipIds = new Set<RelationshipId>();
    const placeIds = new Set<PlaceId>();

    for (const selection of selections) {
      if (!selection) continue;
      if (selection.kind === "place") {
        placeIds.add(selection.id);
        continue;
      }

      if (selection.kind === "relationship") {
        relationshipIds.add(selection.id);
        const edge = this.#edgeById.get(selection.id);
        if (!edge) continue;
        const source = this.#entityByInstance.get(edge.sourceInstanceId);
        const target = this.#entityByInstance.get(edge.targetInstanceId);
        if (source) entityIds.add(source);
        if (target) entityIds.add(target);
        continue;
      }

      entityIds.add(selection.id);
      for (const edge of this.#edgesByEntity.get(selection.id) ?? []) {
        relationshipIds.add(edge.id);
        const source = this.#entityByInstance.get(edge.sourceInstanceId);
        const target = this.#entityByInstance.get(edge.targetInstanceId);
        if (source) entityIds.add(source);
        if (target) entityIds.add(target);
      }
    }

    return Object.freeze({ entityIds, relationshipIds, placeIds });
  }
}
