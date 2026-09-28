const COLLECTIONS = Object.freeze({
  entities: "entity",
  relationships: "relationship",
  occurrences: "occurrence",
  trajectories: "trajectory",
  places: "place",
  sources: "source",
  categories: "category",
  stories: "story",
});

const ENVELOPE_KEYS = new Set([
  "$schema",
  "format",
  "interchangeVersion",
  "schemaVersion",
  "projectKey",
  "revision",
  "savedAt",
  "project",
]);

const REFERENCE_TARGETS = Object.freeze({
  subjectId: "entities",
  objectId: "entities",
  entityId: "entities",
  representedEntityId: "entities",
  organizationId: "entities",
  placeId: "places",
  sourceIds: "sources",
  relationshipIds: "relationships",
  trajectoryIds: "trajectories",
  occurrenceIds: "occurrences",
  placeIds: "places",
  categoryId: "categories",
  storyId: "stories",
});

const FIELD_DOCS = Object.freeze({
  $schema: "Canonical JSON Schema identifier for this Lūm interchange document.",
  format: 'Portable format discriminator. Lūm Project Interchange v1 uses "lum-project".',
  interchangeVersion: "Version of the portable Lūm interchange envelope.",
  schemaVersion: "Version of the canonical project/domain schema.",
  projectKey: "Stable project identity used for persistence and change preconditions.",
  revision: "Monotonic project revision used to detect stale edits.",
  savedAt: "ISO 8601 timestamp for the serialized project snapshot.",
  project: "Canonical Lūm continuum. Runtime camera/layout state does not belong here.",
  entities: "Durable canonical nouns with stable identity.",
  relationships: "Directed subject–action–object facts between canonical entities.",
  occurrences: "Situated facts that carry temporal/spatial/evidentiary context.",
  trajectories: "Dense movement/sample series kept separate from semantic geography.",
  places: "Reusable canonical geographic records.",
  sources: "Evidence/provenance source records referenced by canonical facts.",
  categories: "Reusable project classification records.",
  stories: "Authored traversals over canonical occurrences and places.",
  id: "Stable canonical identifier for this record.",
  subjectId: "Canonical entity ID at the subject end of a directed relationship.",
  objectId: "Canonical entity ID at the object end of a directed relationship.",
  entityId: "Canonical entity reference.",
  placeId: "Canonical place reference.",
  sourceIds: "Canonical source/evidence references.",
  relationshipIds: "Canonical relationship references.",
  occurrenceIds: "Canonical occurrence references.",
  trajectoryIds: "Canonical trajectory references.",
  placeIds: "Canonical place references.",
  categoryId: "Canonical category reference.",
  predicate: "Action-only predicate describing a directed relationship fact.",
  time: "Canonical temporal context. Formatting never invents or repairs time.",
  attributes: "Explicit extensibility namespace. Structural fields remain closed and strict.",
});

export const LUM_SEMANTIC_TOKEN_TYPES = Object.freeze([
  "keyword",
  "property",
  "variable",
  "type",
]);

export const LUM_SEMANTIC_TOKEN_MODIFIERS = Object.freeze(["declaration", "readonly"]);

function decodeString(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

function lineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function offsetToPositionFromStarts(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle - 1;
  }
  const line = Math.max(0, high);
  return { line, character: Math.max(0, offset - starts[line]) };
}

export function positionToOffset(source, position) {
  const starts = lineStarts(source);
  const line = Math.max(0, Math.min(position?.line ?? 0, starts.length - 1));
  const lineStart = starts[line];
  const lineEnd = line + 1 < starts.length ? starts[line + 1] - 1 : source.length;
  return Math.max(lineStart, Math.min(lineStart + (position?.character ?? 0), lineEnd));
}

function rangeFromOffsets(source, start, end, starts = lineStarts(source)) {
  return {
    start: offsetToPositionFromStarts(starts, start),
    end: offsetToPositionFromStarts(starts, end),
  };
}

function quotedTokens(source) {
  const result = [];
  const pattern = /"((?:\\.|[^"\\])*)"/g;
  for (const match of source.matchAll(pattern)) {
    const start = match.index + 1;
    const end = match.index + match[0].length - 1;
    let cursor = match.index + match[0].length;
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
    result.push({
      value: decodeString(match[1]),
      start,
      end,
      property: source[cursor] === ":",
    });
  }
  return result;
}

function keyOccurrences(source) {
  return quotedTokens(source).filter((token) => token.property);
}

function matchingBracket(source, start, open, close) {
  if (source[start] !== open) return -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === open) depth += 1;
    else if (character === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function collectionArraySpan(source, key) {
  const occurrence = keyOccurrences(source).find((token) => token.value === key);
  if (!occurrence) return null;
  const colon = source.indexOf(":", occurrence.end + 1);
  const start = source.indexOf("[", colon + 1);
  if (colon < 0 || start < 0) return null;
  const end = matchingBracket(source, start, "[", "]");
  return end < 0 ? null : { start, end, key: occurrence };
}

function directObjectSpans(source, arraySpan) {
  const result = [];
  let inString = false;
  let escaped = false;
  let squareDepth = 0;
  let braceDepth = 0;
  let objectStart = -1;
  for (let index = arraySpan.start + 1; index < arraySpan.end; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "[") squareDepth += 1;
    else if (character === "]") squareDepth -= 1;
    else if (character === "{") {
      if (squareDepth === 0 && braceDepth === 0) objectStart = index;
      braceDepth += 1;
    } else if (character === "}") {
      braceDepth -= 1;
      if (squareDepth === 0 && braceDepth === 0 && objectStart >= 0) {
        result.push({ start: objectStart, end: index + 1 });
        objectStart = -1;
      }
    }
  }
  return result;
}

function declarationIndex(source) {
  const starts = lineStarts(source);
  const collections = new Map();
  for (const [collection, kind] of Object.entries(COLLECTIONS)) {
    const arraySpan = collectionArraySpan(source, collection);
    const declarations = [];
    if (arraySpan) {
      for (const objectSpan of directObjectSpans(source, arraySpan)) {
        const recordSource = source.slice(objectSpan.start, objectSpan.end);
        const match = /"id"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(recordSource);
        if (!match) continue;
        const fullOffset = objectSpan.start + match.index;
        const valueOffsetInMatch = match[0].lastIndexOf('"', match[0].length - 2);
        const valueStart = fullOffset + valueOffsetInMatch + 1;
        const value = decodeString(match[1]);
        const valueEnd = valueStart + match[1].length;
        let label = value;
        try {
          const parsed = JSON.parse(recordSource);
          const display = parsed.name ?? parsed.title ?? parsed.predicate ?? parsed.type;
          if (display && display !== value) label = `${value} — ${display}`;
        } catch {
          // Keep the stable ID as the symbol label while the document is incomplete.
        }
        declarations.push({
          id: value,
          kind,
          collection,
          label,
          range: rangeFromOffsets(source, valueStart, valueEnd, starts),
          recordRange: rangeFromOffsets(source, objectSpan.start, objectSpan.end, starts),
          start: valueStart,
          end: valueEnd,
        });
      }
    }
    collections.set(collection, declarations);
  }
  return collections;
}

function referenceOccurrences(source) {
  const starts = lineStarts(source);
  const references = [];
  for (const [field, targetCollection] of Object.entries(REFERENCE_TARGETS)) {
    if (field.endsWith("Ids")) {
      const pattern = new RegExp(`"${field}"\\s*:\\s*\\[`, "g");
      for (const match of source.matchAll(pattern)) {
        const arrayStart = source.indexOf("[", match.index);
        const arrayEnd = matchingBracket(source, arrayStart, "[", "]");
        if (arrayEnd < 0) continue;
        const segment = source.slice(arrayStart + 1, arrayEnd);
        const stringPattern = /"((?:\\.|[^"\\])*)"/g;
        for (const token of segment.matchAll(stringPattern)) {
          const start = arrayStart + 1 + token.index + 1;
          const end = start + token[1].length;
          references.push({
            id: decodeString(token[1]),
            field,
            targetCollection,
            range: rangeFromOffsets(source, start, end, starts),
            start,
            end,
          });
        }
      }
      continue;
    }

    const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "g");
    for (const match of source.matchAll(pattern)) {
      const valueOffset = match[0].lastIndexOf('"', match[0].length - 2);
      const start = match.index + valueOffset + 1;
      const end = start + match[1].length;
      references.push({
        id: decodeString(match[1]),
        field,
        targetCollection,
        range: rangeFromOffsets(source, start, end, starts),
        start,
        end,
      });
    }
  }
  return references;
}

function stringTokenAt(source, position) {
  const offset = positionToOffset(source, position);
  return quotedTokens(source).find((token) => offset >= token.start && offset <= token.end) ?? null;
}

function referenceAt(source, position) {
  const offset = positionToOffset(source, position);
  return referenceOccurrences(source).find(
    (reference) => offset >= reference.start && offset <= reference.end,
  ) ?? null;
}

function declarationAt(source, position) {
  const offset = positionToOffset(source, position);
  for (const declarations of declarationIndex(source).values()) {
    const declaration = declarations.find(
      (candidate) => offset >= candidate.start && offset <= candidate.end,
    );
    if (declaration) return declaration;
  }
  return null;
}

function completionTarget(source, position) {
  const offset = positionToOffset(source, position);
  for (const [field, targetCollection] of Object.entries(REFERENCE_TARGETS)) {
    const keyPattern = new RegExp(`"${field}"\\s*:`, "g");
    for (const match of source.matchAll(keyPattern)) {
      const colon = source.indexOf(":", match.index);
      if (field.endsWith("Ids")) {
        const start = source.indexOf("[", colon + 1);
        if (start < 0) continue;
        const end = matchingBracket(source, start, "[", "]");
        if (offset > start && (end < 0 || offset <= end)) return targetCollection;
      } else {
        const start = source.indexOf('"', colon + 1);
        if (start < 0) continue;
        const end = source.indexOf('"', start + 1);
        if (offset >= start + 1 && (end < 0 || offset <= end)) return targetCollection;
      }
    }
  }
  return null;
}

export function lumCompletions(source, position) {
  const targetCollection = completionTarget(source, position);
  if (!targetCollection) return [];
  return (declarationIndex(source).get(targetCollection) ?? []).map((declaration) => ({
    label: declaration.id,
    kind: 18,
    detail: `Lūm ${declaration.kind}`,
    insertText: declaration.id,
    sortText: declaration.id,
  }));
}

export function lumHover(source, position) {
  const token = stringTokenAt(source, position);
  if (!token) return null;

  if (token.property) {
    const documentation = FIELD_DOCS[token.value];
    if (!documentation) return null;
    return {
      contents: {
        kind: "markdown",
        value: `**${token.value}**\n\n${documentation}`,
      },
    };
  }

  const reference = referenceAt(source, position);
  if (reference) {
    const declaration = (declarationIndex(source).get(reference.targetCollection) ?? []).find(
      (candidate) => candidate.id === reference.id,
    );
    const kind = COLLECTIONS[reference.targetCollection] ?? "record";
    return {
      contents: {
        kind: "markdown",
        value: declaration
          ? `**Lūm ${kind} reference** \`${reference.id}\`\n\nResolves to ${declaration.label}.`
          : `**Unresolved Lūm ${kind} reference** \`${reference.id}\`.`,
      },
    };
  }

  const declaration = declarationAt(source, position);
  if (declaration) {
    return {
      contents: {
        kind: "markdown",
        value: `**Canonical ${declaration.kind} ID** \`${declaration.id}\`.`,
      },
    };
  }

  return null;
}

export function lumDocumentSymbols(source) {
  const starts = lineStarts(source);
  const declarations = declarationIndex(source);
  const result = [];
  for (const [collection, kind] of Object.entries(COLLECTIONS)) {
    const span = collectionArraySpan(source, collection);
    if (!span) continue;
    const children = (declarations.get(collection) ?? []).map((declaration) => ({
      name: declaration.label,
      detail: `Lūm ${kind}`,
      kind: 19,
      range: declaration.recordRange,
      selectionRange: declaration.range,
    }));
    result.push({
      name: `${collection} (${children.length})`,
      detail: `Lūm ${kind} collection`,
      kind: 18,
      range: rangeFromOffsets(source, span.start, span.end + 1, starts),
      selectionRange: rangeFromOffsets(source, span.key.start, span.key.end, starts),
      children,
    });
  }
  return result;
}

export function lumDefinition(source, position, uri) {
  const reference = referenceAt(source, position);
  if (!reference) return null;
  const declaration = (declarationIndex(source).get(reference.targetCollection) ?? []).find(
    (candidate) => candidate.id === reference.id,
  );
  return declaration ? { uri, range: declaration.range } : null;
}

export function lumReferences(source, position, uri, includeDeclaration = true) {
  const reference = referenceAt(source, position);
  const declaration = declarationAt(source, position);
  const id = reference?.id ?? declaration?.id;
  const collection = reference?.targetCollection ?? declaration?.collection;
  if (!id || !collection) return [];

  const locations = referenceOccurrences(source)
    .filter(
      (candidate) => candidate.id === id && candidate.targetCollection === collection,
    )
    .map((candidate) => ({ uri, range: candidate.range }));

  if (includeDeclaration) {
    const declared = (declarationIndex(source).get(collection) ?? []).find(
      (candidate) => candidate.id === id,
    );
    if (declared) locations.unshift({ uri, range: declared.range });
  }

  return locations;
}

function tokenTypeIndex(type) {
  return LUM_SEMANTIC_TOKEN_TYPES.indexOf(type);
}

function modifierBits(modifiers) {
  let bits = 0;
  for (const modifier of modifiers) {
    const index = LUM_SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
    if (index >= 0) bits |= 1 << index;
  }
  return bits;
}

export function lumSemanticTokens(source) {
  const starts = lineStarts(source);
  const rawTokens = [];

  for (const key of keyOccurrences(source)) {
    const type = ENVELOPE_KEYS.has(key.value)
      ? "keyword"
      : Object.hasOwn(COLLECTIONS, key.value)
        ? "type"
        : "property";
    rawTokens.push({
      start: key.start,
      end: key.end,
      type,
      modifiers: ENVELOPE_KEYS.has(key.value) ? ["readonly"] : [],
    });
  }

  for (const declarations of declarationIndex(source).values()) {
    for (const declaration of declarations) {
      rawTokens.push({
        start: declaration.start,
        end: declaration.end,
        type: "variable",
        modifiers: ["declaration"],
      });
    }
  }

  for (const reference of referenceOccurrences(source)) {
    rawTokens.push({
      start: reference.start,
      end: reference.end,
      type: "variable",
      modifiers: [],
    });
  }

  rawTokens.sort((left, right) => left.start - right.start || left.end - right.end);

  const data = [];
  let previousLine = 0;
  let previousCharacter = 0;
  for (const token of rawTokens) {
    const start = offsetToPositionFromStarts(starts, token.start);
    const end = offsetToPositionFromStarts(starts, token.end);
    if (end.line !== start.line || end.character <= start.character) continue;
    const deltaLine = start.line - previousLine;
    const deltaStart = deltaLine === 0 ? start.character - previousCharacter : start.character;
    data.push(
      deltaLine,
      deltaStart,
      end.character - start.character,
      tokenTypeIndex(token.type),
      modifierBits(token.modifiers),
    );
    previousLine = start.line;
    previousCharacter = start.character;
  }

  return { data };
}
