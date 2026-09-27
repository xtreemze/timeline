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
 * Force/layout deltas normally update only derived instance positions. Those
 * updates replace the affected instance records without rebuilding edge
 * adjacency, place membership, or parallel-edge lane assignments. Structural
 * or semantic identity changes rebuild the index from the canonical projection.
 */
export class WorldRenderTopologyIndex {
  #instanceById = new Map<WorldInstanceId, ProjectedWorldInstance>();
  #entityByInstance = new Map<WorldInstanceId, EntityId>();
  #edgeById = new Map<RelationshipId, WorldProjectionEdge>();
  #edgesByEntity = new Map<EntityId, readonly WorldProjectionEdge[]>();
  #edgesByInstance = new Map<WorldInstanceId, readonly WorldProjectionEdge[]>();
  #placeIdsByInstance = new Map<WorldInstanceId, readonly PlaceId[]>();
  #placeIdsByEntity = new Map<EntityId, readonly PlaceId[]>();
  #instanceIdsByPlace = new Map<PlaceId, readonly WorldInstanceId[]>();
  #lanes = new Map<RelationshipId, number>();

  constructor(projection: WorldProjection) {
    this.replace(projection);
  }

  get instanceById(): ReadonlyMap<WorldInstanceId, ProjectedWorldInstance> {
    return this.#instanceById;
  }

  get lanes(): ReadonlyMap<RelationshipId, number> {
    return this.#lanes;
  }

  replace(projection: WorldProjection): void {
    const instanceById = new Map<WorldInstanceId, ProjectedWorldInstance>();
    const entityByInstance = new Map<WorldInstanceId, EntityId>();
    const placeIdsByInstance = new Map<WorldInstanceId, readonly PlaceId[]>();
    const mutablePlaceIdsByEntity = new Map<EntityId, Set<PlaceId>>();
    const mutableInstanceIdsByPlace = new Map<PlaceId, WorldInstanceId[]>();

    for (const instance of projection.instances) {
      instanceById.set(instance.id, instance);
      entityByInstance.set(instance.id, instance.canonicalId);
      const placeIds = Object.freeze(
        [...new Set(instance.geographicAnchors.map((anchor) => anchor.placeId))].sort((left, right) =>
          String(left).localeCompare(String(right)),
        ),
      );
      placeIdsByInstance.set(instance.id, placeIds);

      const entityPlaces = mutablePlaceIdsByEntity.get(instance.canonicalId) ?? new Set<PlaceId>();
      for (const placeId of placeIds) {
        entityPlaces.add(placeId);
        const members = mutableInstanceIdsByPlace.get(placeId);
        if (members) members.push(instance.id);
        else mutableInstanceIdsByPlace.set(placeId, [instance.id]);
      }
      mutablePlaceIdsByEntity.set(instance.canonicalId, entityPlaces);
    }

    const edgeById = new Map<RelationshipId, WorldProjectionEdge>();
    const mutableEdgesByEntity = new Map<EntityId, WorldProjectionEdge[]>();
    const mutableEdgesByInstance = new Map<WorldInstanceId, WorldProjectionEdge[]>();
    const groups = new Map<string, WorldProjectionEdge[]>();

    for (const edge of projection.edges) {
      edgeById.set(edge.id, edge);

      for (const instanceId of [edge.sourceInstanceId, edge.targetInstanceId] as const) {
        const instanceEdges = mutableEdgesByInstance.get(instanceId);
        if (instanceEdges) instanceEdges.push(edge);
        else mutableEdgesByInstance.set(instanceId, [edge]);
      }

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
    this.#edgesByInstance = new Map(
      [...mutableEdgesByInstance].map(([instanceId, edges]) => [
        instanceId,
        Object.freeze([...edges]),
      ]),
    );
    this.#placeIdsByInstance = placeIdsByInstance;
    this.#placeIdsByEntity = new Map(
      [...mutablePlaceIdsByEntity].map(([entityId, placeIds]) => [
        entityId,
        Object.freeze([...placeIds].sort((left, right) => String(left).localeCompare(String(right)))),
      ]),
    );
    this.#instanceIdsByPlace = new Map(
      [...mutableInstanceIdsByPlace].map(([placeId, instanceIds]) => [
        placeId,
        Object.freeze([...instanceIds]),
      ]),
    );
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
      const previousPlaces = previous
        ? [...new Set(previous.geographicAnchors.map((anchor) => anchor.placeId))].sort()
        : [];
      const nextPlaces = [...new Set(instance.geographicAnchors.map((anchor) => anchor.placeId))].sort();
      if (
        !previous ||
        previous.canonicalId !== instance.canonicalId ||
        previousPlaces.length !== nextPlaces.length ||
        previousPlaces.some((placeId, index) => placeId !== nextPlaces[index])
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

    const includeEdge = (edge: WorldProjectionEdge): void => {
      relationshipIds.add(edge.id);
      const source = this.#entityByInstance.get(edge.sourceInstanceId);
      const target = this.#entityByInstance.get(edge.targetInstanceId);
      if (source) entityIds.add(source);
      if (target) entityIds.add(target);
    };

    for (const selection of selections) {
      if (!selection) continue;

      if (selection.kind === "place") {
        placeIds.add(selection.id);
        for (const instanceId of this.#instanceIdsByPlace.get(selection.id) ?? []) {
          const entityId = this.#entityByInstance.get(instanceId);
          if (entityId) entityIds.add(entityId);
          for (const edge of this.#edgesByInstance.get(instanceId) ?? []) includeEdge(edge);
        }
        continue;
      }

      if (selection.kind === "relationship") {
        relationshipIds.add(selection.id);
        const edge = this.#edgeById.get(selection.id);
        if (!edge) continue;
        includeEdge(edge);
        for (const placeId of this.#placeIdsByInstance.get(edge.sourceInstanceId) ?? []) {
          placeIds.add(placeId);
        }
        for (const placeId of this.#placeIdsByInstance.get(edge.targetInstanceId) ?? []) {
          placeIds.add(placeId);
        }
        continue;
      }

      entityIds.add(selection.id);
      for (const placeId of this.#placeIdsByEntity.get(selection.id) ?? []) placeIds.add(placeId);
      for (const edge of this.#edgesByEntity.get(selection.id) ?? []) includeEdge(edge);
    }

    return Object.freeze({ entityIds, relationshipIds, placeIds });
  }
}
