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


const NARRATIVE_DAYPART_HOURS = Object.freeze({
  morning: 8,
  afternoon: 15,
  evening: 19,
  night: 21,
});

const NARRATIVE_NUMBER_WORDS = Object.freeze({
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
});

function narrativeNumber(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return NARRATIVE_NUMBER_WORDS[normalized] || 0;
}

function parseUtc(value) {
  const millis = Date.parse(String(value || ""));
  return Number.isFinite(millis) ? millis : null;
}

function utcDateOnly(millis) {
  return new Date(millis).toISOString().slice(0, 10);
}

function utcMinute(millis) {
  return new Date(millis).toISOString().slice(0, 16) + "Z";
}

function utcDayStart(millis) {
  const date = new Date(millis);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function storyItems(story, items) {
  const ids = new Set(uniqueIds(story?.itemIds));
  return (items || []).filter((item) => ids.has(stringId(item?.id)));
}

function itemStart(item) {
  return item?.time?.start?.value || item?.start || "";
}

export function nextNarrativeSequence(story, items) {
  const sequences = storyItems(story, items)
    .map((item) => Number(item?.extensions?.narrative?.sequence))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (sequences.length) return Math.max(...sequences) + 1;
  return uniqueIds(story?.itemIds).length + 1;
}

export function narrativeStoryEpoch(story, items) {
  const explicit = story?.extensions?.narrative?.syntheticEpoch;
  if (parseUtc(explicit) !== null) return explicit;

  const starts = storyItems(story, items)
    .map((item) => itemStart(item))
    .filter(Boolean)
    .map((value) => ({ value, millis: parseUtc(value) }))
    .filter((entry) => entry.millis !== null)
    .sort((a, b) => a.millis - b.millis);
  return starts[0]?.value || "";
}

export function parseNarrativeRelativeTime(value) {
  const source = String(value ?? "").trim();
  if (!source) return null;

  const dayMatch = source.match(/^day\s+(\d+)(?:\s*[·,\-]?\s*(\d{1,2}):(\d{2}))?$/i);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    const hour = dayMatch[2] === undefined ? null : Number(dayMatch[2]);
    const minute = dayMatch[3] === undefined ? null : Number(dayMatch[3]);
    if (day < 1 || (hour !== null && (hour > 23 || minute > 59))) return null;
    return { kind: "day", day, hour, minute, displayTime: source };
  }

  const laterMatch = source.match(
    /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?\s+later$/i,
  );
  if (laterMatch) {
    const days = narrativeNumber(laterMatch[1]);
    return days > 0 ? { kind: "offset", days, displayTime: source } : null;
  }

  const followingMatch = source.match(/^the\s+following\s+(morning|afternoon|evening|night)$/i);
  if (followingMatch) {
    const daypart = followingMatch[1].toLowerCase();
    return {
      kind: "offset-daypart",
      days: 1,
      daypart,
      hour: NARRATIVE_DAYPART_HOURS[daypart],
      displayTime: source,
    };
  }

  return null;
}

export function resolveNarrativeRelativeTime(
  value,
  { epoch = "", previousStart = "", occupiedValues = [] } = {},
) {
  const intent = parseNarrativeRelativeTime(value);
  if (!intent) throw new RangeError("Unsupported narrative-relative time.");

  let resolvedValue = "";
  let precision = "day";

  if (intent.kind === "day") {
    const epochMillis = parseUtc(epoch);
    if (epochMillis === null) throw new RangeError("A narrative epoch is required for Day N input.");
    const dayStart = utcDayStart(epochMillis) + (intent.day - 1) * 86_400_000;
    if (intent.hour === null) {
      resolvedValue = utcDateOnly(dayStart);
    } else {
      resolvedValue = utcMinute(dayStart + intent.hour * 3_600_000 + intent.minute * 60_000);
      precision = "minute";
    }
  } else {
    const previousMillis = parseUtc(previousStart);
    if (previousMillis === null) {
      throw new RangeError("A previous scene time is required for relative narrative input.");
    }
    const shifted = previousMillis + intent.days * 86_400_000;
    if (intent.kind === "offset-daypart") {
      const dayStart = utcDayStart(shifted);
      resolvedValue = utcMinute(dayStart + intent.hour * 3_600_000);
      precision = "minute";
    } else if (String(previousStart).includes("T")) {
      resolvedValue = utcMinute(shifted);
      precision = "minute";
    } else {
      resolvedValue = utcDateOnly(shifted);
    }
  }

  if (new Set(occupiedValues || []).has(resolvedValue)) {
    throw new RangeError(`Narrative-relative time resolves to occupied anchor ${resolvedValue}.`);
  }

  return {
    value: resolvedValue,
    precision,
    displayTime: intent.displayTime,
    intent,
  };
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
  const explicitPlaceIds = (story?.placeIds || []).filter((placeId) =>
    validPlaceIds.has(stringId(placeId)),
  );
  const contextualPlaceIds = contextualRelationships(story, relationships)
    .map((relationship) => stringId(relationship?.placeId))
    .filter((placeId) => placeId && validPlaceIds.has(placeId));
  const attributedPlaceIds =
    explicitPlaceIds.length || contextualPlaceIds.length
      ? []
      : (places || [])
          .filter((place) => stringId(place?.attributes?.storyId) === storyId)
          .map((place) => stringId(place?.id))
          .filter(Boolean);

  return uniqueIds([...explicitPlaceIds, ...contextualPlaceIds, ...attributedPlaceIds]);
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
