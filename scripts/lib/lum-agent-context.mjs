const COLLECTION_NAMES = Object.freeze([
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
]);

function id(value) {
  return String(value);
}

function addAll(target, values = []) {
  let changed = false;
  for (const value of values) {
    if (value == null) continue;
    const key = id(value);
    if (!target.has(key)) {
      target.add(key);
      changed = true;
    }
  }
  return changed;
}

function sourceIdsFromActorContext(context) {
  if (!context || typeof context !== "object") return [];
  return [
    ...(context.authoritySourceIds ?? []),
  ];
}

function categoryIdFromAttributes(attributes) {
  return attributes && typeof attributes === "object" && typeof attributes.categoryId === "string"
    ? attributes.categoryId
    : null;
}

function indexes(project) {
  const result = {};
  for (const collection of COLLECTION_NAMES) {
    result[collection] = new Map(
      (project[collection] ?? []).map((record) => [id(record.id), record]),
    );
  }
  return result;
}

function emptySelection() {
  return Object.fromEntries(COLLECTION_NAMES.map((name) => [name, new Set()]));
}

function allSelection(project) {
  const selection = emptySelection();
  for (const collection of COLLECTION_NAMES) {
    addAll(
      selection[collection],
      (project[collection] ?? []).map((record) => record.id),
    );
  }
  return selection;
}

function selectorKind(selector) {
  if (!selector || Object.keys(selector).length === 0) return "all";
  const kinds = [
    selector.storyId ? "story" : null,
    selector.occurrenceId ? "occurrence" : null,
    selector.entityId ? "entity" : null,
    selector.ids?.length ? "ids" : null,
  ].filter(Boolean);
  if (kinds.length !== 1) {
    throw new Error("Choose exactly one agent context selector: story, occurrence, entity, or ids.");
  }
  return kinds[0];
}

function resolveOne(index, collection, recordId, selection) {
  const key = id(recordId);
  const record = index[collection].get(key);
  if (!record) {
    throw new Error(`Unknown Lūm ${collection.slice(0, -1)} ID "${key}".`);
  }
  selection[collection].add(key);
  return record;
}

function resolveExplicitIds(index, ids, selection) {
  for (const rawId of ids) {
    const key = id(rawId);
    const matches = COLLECTION_NAMES.filter((collection) => index[collection].has(key));
    if (matches.length === 0) {
      throw new Error(`Unknown canonical ID "${key}".`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous canonical ID "${key}" exists in: ${matches.join(", ")}.`,
      );
    }
    selection[matches[0]].add(key);
  }
}

function seedEntityNeighborhood(project, index, entityId, depth, selection) {
  resolveOne(index, "entities", entityId, selection);
  if (!Number.isInteger(depth) || depth < 0 || depth > 3) {
    throw new Error("Entity context depth must be an integer from 0 through 3.");
  }

  let frontier = new Set([id(entityId)]);
  for (let level = 0; level < depth; level += 1) {
    const next = new Set();
    for (const relationship of project.relationships ?? []) {
      const subjectId = id(relationship.subjectId);
      const objectId = id(relationship.objectId);
      if (!frontier.has(subjectId) && !frontier.has(objectId)) continue;
      selection.relationships.add(id(relationship.id));
      if (!selection.entities.has(subjectId)) next.add(subjectId);
      if (!selection.entities.has(objectId)) next.add(objectId);
      selection.entities.add(subjectId);
      selection.entities.add(objectId);
    }
    frontier = next;
    if (frontier.size === 0) break;
  }

  if (selection.relationships.size > 0 || selection.entities.size > 0) {
    for (const occurrence of project.occurrences ?? []) {
      const relationshipHit = (occurrence.relationshipIds ?? []).some((value) =>
        selection.relationships.has(id(value)),
      );
      const participantHit = (occurrence.participantContexts ?? []).some((participant) =>
        selection.entities.has(id(participant.entityId)),
      );
      if (relationshipHit || participantHit) {
        selection.occurrences.add(id(occurrence.id));
      }
    }
  }
}

function seedSelection(project, index, selector) {
  const kind = selectorKind(selector);
  if (kind === "all") return { kind, selection: allSelection(project) };

  const selection = emptySelection();
  if (kind === "story") {
    const story = resolveOne(index, "stories", selector.storyId, selection);
    addAll(selection.occurrences, story.occurrenceIds);
    addAll(selection.places, story.placeIds);
    return { kind, selection };
  }
  if (kind === "occurrence") {
    resolveOne(index, "occurrences", selector.occurrenceId, selection);
    return { kind, selection };
  }
  if (kind === "entity") {
    seedEntityNeighborhood(project, index, selector.entityId, selector.depth ?? 1, selection);
    return { kind, selection };
  }

  resolveExplicitIds(index, selector.ids, selection);
  return { kind, selection };
}

function closeDependencies(project, index, selection) {
  const unresolved = [];
  const unresolvedKey = new Set();

  function addReference(collection, value, from) {
    if (value == null) return false;
    const key = id(value);
    if (!index[collection].has(key)) {
      const token = `${collection}:${key}:${from}`;
      if (!unresolvedKey.has(token)) {
        unresolvedKey.add(token);
        unresolved.push({ collection, id: key, from });
      }
      return false;
    }
    if (selection[collection].has(key)) return false;
    selection[collection].add(key);
    return true;
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const relationshipId of [...selection.relationships]) {
      const relationship = index.relationships.get(relationshipId);
      if (!relationship) continue;
      changed = addReference("entities", relationship.subjectId, `relationship:${relationshipId}`) || changed;
      changed = addReference("entities", relationship.objectId, `relationship:${relationshipId}`) || changed;
      changed = addReference("places", relationship.placeId, `relationship:${relationshipId}`) || changed;
      for (const sourceId of relationship.sourceIds ?? []) {
        changed = addReference("sources", sourceId, `relationship:${relationshipId}`) || changed;
      }
      for (const sourceId of sourceIdsFromActorContext(relationship.subjectContext)) {
        changed = addReference("sources", sourceId, `relationship:${relationshipId}`) || changed;
      }
      for (const sourceId of sourceIdsFromActorContext(relationship.objectContext)) {
        changed = addReference("sources", sourceId, `relationship:${relationshipId}`) || changed;
      }
    }

    for (const occurrenceId of [...selection.occurrences]) {
      const occurrence = index.occurrences.get(occurrenceId);
      if (!occurrence) continue;
      changed = addReference("places", occurrence.placeId, `occurrence:${occurrenceId}`) || changed;
      for (const participant of occurrence.participantContexts ?? []) {
        changed = addReference("entities", participant.entityId, `occurrence:${occurrenceId}`) || changed;
        for (const sourceId of sourceIdsFromActorContext(participant)) {
          changed = addReference("sources", sourceId, `occurrence:${occurrenceId}`) || changed;
        }
      }
      for (const relationshipId of occurrence.relationshipIds ?? []) {
        changed = addReference("relationships", relationshipId, `occurrence:${occurrenceId}`) || changed;
      }
      for (const trajectoryId of occurrence.trajectoryIds ?? []) {
        changed = addReference("trajectories", trajectoryId, `occurrence:${occurrenceId}`) || changed;
      }
      for (const sourceId of occurrence.sourceIds ?? []) {
        changed = addReference("sources", sourceId, `occurrence:${occurrenceId}`) || changed;
      }
      const categoryId = categoryIdFromAttributes(occurrence.attributes);
      changed = addReference("categories", categoryId, `occurrence:${occurrenceId}`) || changed;
    }

    for (const trajectoryId of [...selection.trajectories]) {
      const trajectory = index.trajectories.get(trajectoryId);
      if (!trajectory) continue;
      for (const entityId of trajectory.observedEntityIds ?? []) {
        changed = addReference("entities", entityId, `trajectory:${trajectoryId}`) || changed;
      }
      for (const sourceId of trajectory.sourceIds ?? []) {
        changed = addReference("sources", sourceId, `trajectory:${trajectoryId}`) || changed;
      }
    }

    for (const entityId of [...selection.entities]) {
      const entity = index.entities.get(entityId);
      if (!entity) continue;
      for (const sourceId of entity.sourceIds ?? []) {
        changed = addReference("sources", sourceId, `entity:${entityId}`) || changed;
      }
    }

    for (const placeId of [...selection.places]) {
      const place = index.places.get(placeId);
      if (!place) continue;
      for (const sourceId of place.sourceIds ?? []) {
        changed = addReference("sources", sourceId, `place:${placeId}`) || changed;
      }
    }

    for (const storyId of [...selection.stories]) {
      const story = index.stories.get(storyId);
      if (!story) continue;
      for (const occurrenceId of story.occurrenceIds ?? []) {
        changed = addReference("occurrences", occurrenceId, `story:${storyId}`) || changed;
      }
      for (const placeId of story.placeIds ?? []) {
        changed = addReference("places", placeId, `story:${storyId}`) || changed;
      }
    }

    // Reverse ownership is useful context, but once a story is selected its explicit
    // membership remains the only forward expansion.
    for (const occurrence of project.occurrences ?? []) {
      if (
        !selection.occurrences.has(id(occurrence.id)) &&
        (occurrence.relationshipIds ?? []).some((value) => selection.relationships.has(id(value)))
      ) {
        selection.occurrences.add(id(occurrence.id));
        changed = true;
      }
    }
    for (const story of project.stories ?? []) {
      if (
        !selection.stories.has(id(story.id)) &&
        (story.occurrenceIds ?? []).some((value) => selection.occurrences.has(id(value)))
      ) {
        selection.stories.add(id(story.id));
        changed = true;
      }
    }
  }

  return unresolved;
}

function selectedInProjectOrder(project, selection, collection) {
  return (project[collection] ?? []).filter((record) => selection[collection].has(id(record.id)));
}

function summarizeEntity(entity) {
  return {
    id: id(entity.id),
    name: entity.name,
    type: entity.type,
    ...(entity.sourceIds?.length ? { sourceIds: entity.sourceIds.map(id) } : {}),
  };
}

function summarizeRelationship(relationship) {
  return {
    id: id(relationship.id),
    subjectId: id(relationship.subjectId),
    predicate: relationship.predicate,
    objectId: id(relationship.objectId),
    ...(relationship.placeId ? { placeId: id(relationship.placeId) } : {}),
    ...(relationship.time ? { time: relationship.time } : {}),
    ...(relationship.sourceIds?.length ? { sourceIds: relationship.sourceIds.map(id) } : {}),
  };
}

function summarizeOccurrence(occurrence) {
  return {
    id: id(occurrence.id),
    ...(occurrence.title ? { title: occurrence.title } : {}),
    ...(occurrence.occurrenceType ? { occurrenceType: occurrence.occurrenceType } : {}),
    ...(occurrence.time ? { time: occurrence.time } : {}),
    ...(occurrence.placeId ? { placeId: id(occurrence.placeId) } : {}),
    participantEntityIds: (occurrence.participantContexts ?? []).map((participant) =>
      id(participant.entityId),
    ),
    relationshipIds: (occurrence.relationshipIds ?? []).map(id),
    trajectoryIds: (occurrence.trajectoryIds ?? []).map(id),
    ...(occurrence.sourceIds?.length ? { sourceIds: occurrence.sourceIds.map(id) } : {}),
  };
}

function summarizeTrajectory(trajectory) {
  return {
    id: id(trajectory.id),
    sampleCount: trajectory.sampleCount,
    ...(trajectory.observedEntityIds?.length
      ? { observedEntityIds: trajectory.observedEntityIds.map(id) }
      : {}),
    ...(trajectory.sourceIds?.length ? { sourceIds: trajectory.sourceIds.map(id) } : {}),
  };
}

function summarizePlace(place) {
  return {
    id: id(place.id),
    name: place.name,
    ...(place.sourceIds?.length ? { sourceIds: place.sourceIds.map(id) } : {}),
  };
}

function summarizeSource(source) {
  return {
    id: id(source.id),
    kind: source.kind,
    title: source.title,
  };
}

function summarizeCategory(category) {
  return {
    id: id(category.id),
    name: category.name,
    ...(category.color ? { color: category.color } : {}),
  };
}

function summarizeStory(story) {
  return {
    id: id(story.id),
    title: story.title,
    occurrenceIds: (story.occurrenceIds ?? []).map(id),
    placeIds: (story.placeIds ?? []).map(id),
  };
}

const SUMMARIZERS = Object.freeze({
  entities: summarizeEntity,
  relationships: summarizeRelationship,
  occurrences: summarizeOccurrence,
  trajectories: summarizeTrajectory,
  places: summarizePlace,
  sources: summarizeSource,
  categories: summarizeCategory,
  stories: summarizeStory,
});

function selectorDescription(kind, selector) {
  switch (kind) {
    case "story":
      return { kind, id: id(selector.storyId) };
    case "occurrence":
      return { kind, id: id(selector.occurrenceId) };
    case "entity":
      return { kind, id: id(selector.entityId), depth: selector.depth ?? 1 };
    case "ids":
      return { kind, ids: selector.ids.map(id) };
    default:
      return { kind: "all" };
  }
}

export function buildLumAgentContext(snapshot, selector = {}) {
  const project = snapshot.project;
  const index = indexes(project);
  const seeded = seedSelection(project, index, selector);
  const unresolvedReferences = closeDependencies(project, index, seeded.selection);

  const total = {};
  const included = {};
  const omitted = {};
  const selectedRecords = {};
  for (const collection of COLLECTION_NAMES) {
    const records = selectedInProjectOrder(project, seeded.selection, collection);
    total[collection] = (project[collection] ?? []).length;
    included[collection] = records.length;
    omitted[collection] = total[collection] - records.length;
    selectedRecords[collection] = records.map(SUMMARIZERS[collection]);
  }

  return Object.freeze({
    protocol: "lum-agent-context-v1",
    selector: selectorDescription(seeded.kind, selector),
    manifest: Object.freeze({
      total: Object.freeze(total),
      included: Object.freeze(included),
      omitted: Object.freeze(omitted),
    }),
    project: Object.freeze({
      projectKey: snapshot.projectKey,
      revision: snapshot.revision,
      ...selectedRecords,
    }),
    unresolvedReferences: Object.freeze(unresolvedReferences),
  });
}
