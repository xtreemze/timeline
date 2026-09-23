import type { CanonicalProject } from "../domain/project.ts";
import type { CanonicalRelationship } from "../domain/relationship.ts";

export interface RelationshipMatrixFilter {
  readonly predicates?: readonly string[];
  readonly placeIds?: readonly string[];
  readonly sourceCoverage?: "all" | "with-source" | "without-source";
}

export interface RelationshipMatrixEntity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
}

export interface RelationshipMatrixRelationship {
  readonly id: string;
  readonly predicate: string;
  readonly placeId: string | null;
  readonly timed: boolean;
  readonly sourceCount: number;
  readonly itemCount: number;
}

export interface RelationshipMatrixCell {
  readonly rowEntityId: string;
  readonly columnEntityId: string;
  readonly state: "empty" | "visible" | "filtered";
  readonly relationships: readonly RelationshipMatrixRelationship[];
  readonly hiddenRelationshipCount: number;
}

export interface RelationshipMatrixProjection {
  readonly entities: readonly RelationshipMatrixEntity[];
  readonly cells: readonly RelationshipMatrixCell[];
}

function semanticKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right)),
  );
}

function relationshipVisible(
  relationship: CanonicalRelationship,
  filter: RelationshipMatrixFilter,
): boolean {
  const predicates = new Set((filter.predicates ?? []).map(semanticKey));
  if (predicates.size > 0 && !predicates.has(semanticKey(relationship.predicate))) {
    return false;
  }

  const placeIds = new Set(filter.placeIds ?? []);
  if (placeIds.size > 0 && (!relationship.placeId || !placeIds.has(String(relationship.placeId)))) {
    return false;
  }

  if (filter.sourceCoverage === "with-source" && relationship.sourceIds.length === 0) {
    return false;
  }

  if (filter.sourceCoverage === "without-source" && relationship.sourceIds.length > 0) {
    return false;
  }

  return true;
}

function projectedRelationship(
  relationship: CanonicalRelationship,
): RelationshipMatrixRelationship {
  return Object.freeze({
    id: String(relationship.id),
    predicate: relationship.predicate,
    placeId: relationship.placeId ? String(relationship.placeId) : null,
    timed: relationship.time !== null,
    sourceCount: relationship.sourceIds.length,
    itemCount: relationship.itemIds.length,
  });
}

export function projectRelationshipMatrix(
  project: CanonicalProject,
  options: {
    readonly entityIds?: readonly string[];
    readonly filter?: RelationshipMatrixFilter;
  } = {},
): RelationshipMatrixProjection {
  const requestedIds = sortedUnique(options.entityIds ?? []);
  const requestedSet = new Set(requestedIds);
  const includeAll = requestedIds.length === 0;
  const filter = options.filter ?? {};

  const entities = project.entities
    .filter((entity) => includeAll || requestedSet.has(String(entity.id)))
    .map((entity) =>
      Object.freeze({
        id: String(entity.id),
        name: entity.name,
        type: entity.type,
      }),
    )
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));

  const includedEntityIds = new Set(entities.map((entity) => entity.id));
  const relationships = project.relationships.filter(
    (relationship) =>
      includedEntityIds.has(String(relationship.subjectId)) &&
      includedEntityIds.has(String(relationship.objectId)),
  );

  const relationshipsByPair = new Map<string, CanonicalRelationship[]>();
  for (const relationship of relationships) {
    const key = String(relationship.subjectId) + "\u0000" + String(relationship.objectId);
    const current = relationshipsByPair.get(key);
    if (current) {
      current.push(relationship);
    } else {
      relationshipsByPair.set(key, [relationship]);
    }
  }

  const cells: RelationshipMatrixCell[] = [];
  for (const row of entities) {
    for (const column of entities) {
      const key = row.id + "\u0000" + column.id;
      const pair = relationshipsByPair.get(key) ?? [];
      const visible = pair
        .filter((relationship) => relationshipVisible(relationship, filter))
        .sort(
          (left, right) =>
            left.predicate.localeCompare(right.predicate) ||
            String(left.id).localeCompare(String(right.id)),
        );

      const state: RelationshipMatrixCell["state"] =
        pair.length === 0 ? "empty" : visible.length > 0 ? "visible" : "filtered";

      cells.push(
        Object.freeze({
          rowEntityId: row.id,
          columnEntityId: column.id,
          state,
          relationships: Object.freeze(visible.map(projectedRelationship)),
          hiddenRelationshipCount: Math.max(0, pair.length - visible.length),
        }),
      );
    }
  }

  return Object.freeze({
    entities: Object.freeze(entities),
    cells: Object.freeze(cells),
  });
}
