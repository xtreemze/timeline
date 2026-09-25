function stringId(value) {
  return String(value ?? "").trim();
}

function uniqueIds(values) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const id = stringId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function contextualRelationships(story, relationships) {
  const itemIds = new Set(uniqueIds(story?.itemIds));
  if (!itemIds.size) return [];
  return (relationships || []).filter((relationship) =>
    (relationship?.itemIds || []).some((itemId) => itemIds.has(stringId(itemId))),
  );
}

export function storyIdsForItem(stories, itemId) {
  const target = stringId(itemId);
  if (!target) return [];
  return (stories || [])
    .filter((story) => (story?.itemIds || []).some((candidate) => stringId(candidate) === target))
    .map((story) => stringId(story?.id))
    .filter(Boolean);
}

export function deriveStoryPlaceIds(story, relationships, places) {
  const storyId = stringId(story?.id);
  const validPlaceIds = new Set((places || []).map((place) => stringId(place?.id)).filter(Boolean));
  const contextualPlaceIds = contextualRelationships(story, relationships)
    .map((relationship) => stringId(relationship?.placeId))
    .filter((placeId) => placeId && validPlaceIds.has(placeId));
  const attributedPlaceIds = (places || [])
    .filter((place) => stringId(place?.attributes?.storyId) === storyId)
    .map((place) => stringId(place?.id))
    .filter(Boolean);

  return uniqueIds([
    ...(story?.placeIds || []).filter((placeId) => validPlaceIds.has(stringId(placeId))),
    ...contextualPlaceIds,
    ...attributedPlaceIds,
  ]);
}

export function reconcileStoryContext(story, relationships, places) {
  if (!story) return story;
  return {
    ...story,
    itemIds: uniqueIds(story.itemIds),
    placeIds: deriveStoryPlaceIds(story, relationships, places),
  };
}

export function addItemToStory(stories, storyId, itemId, relationships, places) {
  const targetStoryId = stringId(storyId);
  const targetItemId = stringId(itemId);
  if (!targetStoryId || !targetItemId) return [...(stories || [])];

  return (stories || []).map((story) => {
    if (stringId(story?.id) !== targetStoryId) return story;
    return reconcileStoryContext(
      {
        ...story,
        itemIds: uniqueIds([...(story?.itemIds || []), targetItemId]),
      },
      relationships,
      places,
    );
  });
}

export function auditStoryAuthoring(story, relationships, places) {
  const validPlaceIds = new Set((places || []).map((place) => stringId(place?.id)).filter(Boolean));
  const declaredPlaceIds = uniqueIds(story?.placeIds);
  const contextual = contextualRelationships(story, relationships);
  const contextualPlaceIds = uniqueIds(
    contextual
      .map((relationship) => stringId(relationship?.placeId))
      .filter((placeId) => placeId && validPlaceIds.has(placeId)),
  );
  const declaredPlaceSet = new Set(declaredPlaceIds);

  const issues = [];
  for (const relationship of contextual) {
    const relationshipId = stringId(relationship?.id) || "relationship";
    if (!relationship?.time) {
      issues.push({
        kind: "relationship-time",
        relationshipId,
        message: `Relationship ${relationshipId} has no canonical time.`,
      });
    }
    const placeId = stringId(relationship?.placeId);
    if (!placeId) {
      issues.push({
        kind: "relationship-place",
        relationshipId,
        message: `Relationship ${relationshipId} has no canonical place.`,
      });
    } else if (!validPlaceIds.has(placeId)) {
      issues.push({
        kind: "relationship-place-reference",
        relationshipId,
        placeId,
        message: `Relationship ${relationshipId} references unknown place ${placeId}.`,
      });
    }
  }

  for (const placeId of contextualPlaceIds) {
    if (declaredPlaceSet.has(placeId)) continue;
    issues.push({
      kind: "story-place-registry",
      placeId,
      message: `Story place registry is missing contextual place ${placeId}.`,
    });
  }

  for (const placeId of declaredPlaceIds) {
    if (validPlaceIds.has(placeId)) continue;
    issues.push({
      kind: "story-place-reference",
      placeId,
      message: `Story place registry references unknown place ${placeId}.`,
    });
  }

  return {
    storyId: stringId(story?.id),
    relationshipCount: contextual.length,
    contextualPlaceIds,
    declaredPlaceIds,
    issues,
    issueCount: issues.length,
    healthy: issues.length === 0,
  };
}
