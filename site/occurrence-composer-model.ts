import { SEMANTIC_ICON_NAMES } from "../src/presentation/semantic-icons.ts";

export type OccurrenceComposerStage =
  | "subject"
  | "predicate"
  | "object"
  | "place"
  | "time"
  | "options"
  | "complete";

export interface ComposerEntityReference {
  readonly name: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface ComposerPlaceReference {
  readonly name: string;
}

export interface ComposerTimeReference {
  readonly kind: "instant" | "range";
  readonly start: string;
  readonly end?: string;
}

export interface ComposerOccurrenceOptions {
  readonly category?: string;
  readonly tags: readonly string[];
}

export interface OccurrenceSentenceDraft {
  readonly subject: ComposerEntityReference | null;
  readonly predicate: string | null;
  readonly object: ComposerEntityReference | null;
  readonly place: ComposerPlaceReference | null;
  readonly time: ComposerTimeReference | null;
  readonly options: ComposerOccurrenceOptions;
  readonly stage: OccurrenceComposerStage;
  readonly diagnostics: readonly string[];
}

export interface ComposerEntityOption {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly icon?: string;
  readonly alternateNames?: readonly string[];
}

export interface ComposerPlaceOption {
  readonly id: string;
  readonly name: string;
}

export interface ComposerCategoryOption {
  readonly id: string;
  readonly name: string;
}

export interface ComposerSuggestion {
  readonly kind: "entity" | "predicate" | "place" | "time" | "property" | "category" | "tag";
  readonly label: string;
  readonly detail?: string;
  readonly icon?: string;
  readonly insertText: string;
}

const ACTION_SUGGESTIONS = Object.freeze([
  "meets",
  "calls",
  "visits",
  "sends",
  "receives",
  "finds",
  "observes",
  "creates",
  "moves",
  "joins",
  "leaves",
  "helps",
  "attacks",
  "warns",
  "asks",
  "answers",
  "reports",
  "transfers",
]);

const PRIMARY_ENTITY_ICONS = Object.freeze(["person", "group", "object", "evidence"] as const);
const ENTITY_ICON_PROPERTY_SUGGESTIONS = Object.freeze(
  SEMANTIC_ICON_NAMES.map((icon) => `icon: ${icon}`),
);
const ENTITY_PROPERTY_SUGGESTIONS = Object.freeze([
  "type: person",
  "type: organization",
  "type: group",
  "type: document",
  "type: object",
  ...PRIMARY_ENTITY_ICONS.map((icon) => `icon: ${icon}`),
  "color: #667085",
]);

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}

export function quoteComposerName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[^\s()[\]"]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseProperties(value: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const segment of value.split(",")) {
    const separator = segment.indexOf(":");
    if (separator < 1) continue;
    const key = segment.slice(0, separator).trim();
    const rawValue = segment.slice(separator + 1).trim();
    if (!key || !rawValue) continue;
    result[key] = unquote(rawValue);
  }
  return Object.freeze(result);
}

function parseEntityAtStart(
  input: string,
): { readonly entity: ComposerEntityReference | null; readonly rest: string } {
  const source = input.trimStart();
  if (!source) return { entity: null, rest: "" };

  let name = "";
  let offset = 0;
  if (source.startsWith('"')) {
    let escaped = false;
    let closedAt = -1;
    for (let index = 1; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === '"') {
        closedAt = index;
        break;
      }
    }
    if (closedAt < 0) return { entity: null, rest: source };
    name = unquote(source.slice(0, closedAt + 1));
    offset = closedAt + 1;
  } else {
    const match = source.match(/^([^\s()\[\]]+)/);
    if (!match) return { entity: null, rest: source };
    name = match[1]!;
    offset = match[0].length;
  }

  let rest = source.slice(offset).trimStart();
  let properties: Readonly<Record<string, string>> = Object.freeze({});
  if (rest.startsWith("(")) {
    const close = rest.indexOf(")");
    if (close < 0) return { entity: null, rest: source };
    properties = parseProperties(rest.slice(1, close));
    rest = rest.slice(close + 1).trimStart();
  }

  return {
    entity: Object.freeze({ name, properties }),
    rest,
  };
}

function stripOptions(input: string): {
  readonly source: string;
  readonly options: ComposerOccurrenceOptions;
  readonly malformed: boolean;
} {
  const trimmed = input.trim();
  if (!trimmed.endsWith("]")) {
    return { source: trimmed, options: Object.freeze({ tags: Object.freeze([]) }), malformed: false };
  }
  const open = trimmed.lastIndexOf("[");
  if (open < 0) {
    return { source: trimmed, options: Object.freeze({ tags: Object.freeze([]) }), malformed: true };
  }
  const properties = parseProperties(trimmed.slice(open + 1, -1));
  const tags = (properties.tags ?? "")
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    source: trimmed.slice(0, open).trimEnd(),
    options: Object.freeze({
      ...(properties.category ? { category: properties.category } : {}),
      tags: Object.freeze(tags),
    }),
    malformed: false,
  };
}

function stripTime(input: string): {
  readonly source: string;
  readonly time: ComposerTimeReference | null;
} {
  const range = input.match(/\s+from\s+(\S+)\s+to\s+(\S+)\s*$/i);
  if (range) {
    return {
      source: input.slice(0, range.index).trimEnd(),
      time: Object.freeze({ kind: "range", start: range[1]!, end: range[2]! }),
    };
  }
  const instant = input.match(/\s+on\s+(\S+)\s*$/i);
  if (instant) {
    return {
      source: input.slice(0, instant.index).trimEnd(),
      time: Object.freeze({ kind: "instant", start: instant[1]! }),
    };
  }
  return { source: input, time: null };
}

function stripPlace(input: string): {
  readonly source: string;
  readonly place: ComposerPlaceReference | null;
} {
  const marker = input.toLocaleLowerCase().lastIndexOf(" at ");
  if (marker < 0) return { source: input, place: null };
  const rawPlace = input.slice(marker + 4).trim();
  if (!rawPlace) return { source: input, place: null };
  return {
    source: input.slice(0, marker).trimEnd(),
    place: Object.freeze({ name: unquote(rawPlace) }),
  };
}

export function parseOccurrenceSentence(input: string): OccurrenceSentenceDraft {
  const diagnostics: string[] = [];
  const optionPass = stripOptions(input);
  if (optionPass.malformed) diagnostics.push("Close the occurrence options with ].");
  const timePass = stripTime(optionPass.source);
  const placePass = stripPlace(timePass.source);

  const subjectPass = parseEntityAtStart(placePass.source);
  if (!subjectPass.entity) {
    return Object.freeze({
      subject: null,
      predicate: null,
      object: null,
      place: placePass.place,
      time: timePass.time,
      options: optionPass.options,
      stage: "subject",
      diagnostics: Object.freeze(diagnostics),
    });
  }

  const predicateMatch = subjectPass.rest.match(/^([^\s()\[\]]+)/);
  if (!predicateMatch) {
    return Object.freeze({
      subject: subjectPass.entity,
      predicate: null,
      object: null,
      place: placePass.place,
      time: timePass.time,
      options: optionPass.options,
      stage: "predicate",
      diagnostics: Object.freeze(diagnostics),
    });
  }

  const predicate = predicateMatch[1]!;
  const afterPredicate = subjectPass.rest.slice(predicateMatch[0].length).trimStart();
  const objectPass = parseEntityAtStart(afterPredicate);
  if (!objectPass.entity) {
    return Object.freeze({
      subject: subjectPass.entity,
      predicate,
      object: null,
      place: placePass.place,
      time: timePass.time,
      options: optionPass.options,
      stage: "object",
      diagnostics: Object.freeze(diagnostics),
    });
  }

  if (objectPass.rest.trim()) {
    diagnostics.push(
      'Unexpected text after the object. Quote multi-word names, then use "at", "on", "from … to …", or "[…]".',
    );
  }

  return Object.freeze({
    subject: subjectPass.entity,
    predicate,
    object: objectPass.entity,
    place: placePass.place,
    time: timePass.time,
    options: optionPass.options,
    stage: diagnostics.length ? "object" : "complete",
    diagnostics: Object.freeze(diagnostics),
  });
}

function currentToken(input: string): string {
  const openQuote = input.match(/"([^"]*)$/);
  if (openQuote) return openQuote[1]!.trimStart().toLocaleLowerCase();
  const match = input.match(/(?:^|\s)([^\s]*)$/);
  return (match?.[1] ?? "").replace(/^["([]/, "").toLocaleLowerCase();
}

function normalizedSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function suggestionScore(query: string, candidate: string): number {
  const needle = normalizedSearch(query);
  if (!needle) return 0;
  const haystack = normalizedSearch(candidate);
  if (!haystack) return Number.POSITIVE_INFINITY;
  if (haystack === needle) return 0;
  if (haystack.startsWith(needle)) return 1;
  if (haystack.split(" ").some((word) => word.startsWith(needle))) return 2;
  if (haystack.includes(needle)) return 3;
  return Number.POSITIVE_INFINITY;
}

function rankedStrings(values: readonly string[], query: string): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .map((value) => ({ value, score: suggestionScore(query, value) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => left.score - right.score || left.value.localeCompare(right.value))
      .map(({ value }) => value),
  );
}

function composerPlaceTailQuery(input: string): string | null {
  const match = input.match(/\s+at\s+([^\[]*)$/i);
  if (!match) return null;
  const raw = match[1] ?? "";
  if (/\s+(?:on|from)\s+/i.test(raw)) return null;
  return unquote(raw.trim());
}

export function occurrenceComposerCompletionStage(input: string): OccurrenceComposerStage {
  const parsed = parseOccurrenceSentence(input);
  const trailingWhitespace = /\s$/.test(input);

  if (composerPlaceTailQuery(input) !== null) return "place";
  if (parsed.stage === "subject") return "subject";
  if (parsed.stage === "predicate") return trailingWhitespace ? "predicate" : "subject";
  if (parsed.stage === "object") {
    if (parsed.object) return "object";
    return trailingWhitespace ? "object" : "predicate";
  }
  if (
    parsed.stage === "complete" &&
    !parsed.place &&
    !parsed.time &&
    !parsed.options.category &&
    parsed.options.tags.length === 0 &&
    !trailingWhitespace
  ) {
    return "object";
  }
  return parsed.stage;
}

function uniqueSuggestions(suggestions: readonly ComposerSuggestion[]): readonly ComposerSuggestion[] {
  const seen = new Set<string>();
  const result: ComposerSuggestion[] = [];
  for (const suggestion of suggestions) {
    const key = `${suggestion.kind}:\0${suggestion.insertText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
  }
  return Object.freeze(result);
}

export function occurrenceComposerSuggestions(
  input: string,
  options: {
    readonly entities: readonly ComposerEntityOption[];
    readonly places: readonly ComposerPlaceOption[];
    readonly categories: readonly ComposerCategoryOption[];
    readonly tags?: readonly string[];
    readonly predicates?: readonly string[];
    readonly timelineDefault?: string | null;
    readonly locationDefault?: string | null;
    readonly preferredEntityIds?: readonly string[];
  },
): readonly ComposerSuggestion[] {
  const parsed = parseOccurrenceSentence(input);
  const completionStage = occurrenceComposerCompletionStage(input);
  const token = currentToken(input);

  if (/\([^)]*$/.test(input)) {
    const iconValueActive = /(?:^|[,(])\s*icon\s*:\s*[^,)]*$/i.test(input);
    const properties = iconValueActive
      ? ENTITY_ICON_PROPERTY_SUGGESTIONS
      : ENTITY_PROPERTY_SUGGESTIONS;
    return Object.freeze(
      properties
        .filter((property) => !token || property.toLocaleLowerCase().includes(token))
        .map((property) => ({
          kind: "property" as const,
          label: property,
          detail: iconValueActive ? "semantic icon" : "entity property",
          insertText: property,
        })),
    );
  }

  if (/\[[^\]]*$/.test(input)) {
    const open = input.lastIndexOf("[");
    const fragment = input.slice(open + 1);
    const segment = fragment.split(",").at(-1)?.trim() ?? "";
    const separator = segment.indexOf(":");
    const optionKey = separator >= 0 ? segment.slice(0, separator).trim().toLocaleLowerCase() : "";
    const optionValue = separator >= 0 ? segment.slice(separator + 1).trim() : segment;

    if (optionKey === "tags") {
      const pipe = optionValue.lastIndexOf("|");
      const retained = pipe >= 0 ? optionValue.slice(0, pipe + 1) : "";
      const query = pipe >= 0 ? optionValue.slice(pipe + 1).trim() : optionValue;
      return Object.freeze(
        rankedStrings(options.tags ?? [], query)
          .slice(0, 7)
          .map((tag) => ({
            kind: "tag" as const,
            label: tag,
            detail: "existing tag",
            insertText: `tags: ${retained}${tag}`,
          })),
      );
    }

    if (optionKey === "category") {
      return Object.freeze(
        options.categories
          .map((category) => ({
            category,
            score: suggestionScore(optionValue, category.name),
          }))
          .filter(({ score }) => Number.isFinite(score))
          .sort(
            (left, right) =>
              left.score - right.score || left.category.name.localeCompare(right.category.name),
          )
          .slice(0, 7)
          .map(({ category }) => ({
            kind: "category" as const,
            label: category.name,
            detail: "existing category",
            insertText: `category: ${quoteComposerName(category.name)}`,
          })),
      );
    }

    const categorySuggestions = options.categories.slice(0, 6).map((category) => ({
      kind: "category" as const,
      label: category.name,
      detail: "existing category",
      insertText: `category: ${quoteComposerName(category.name)}`,
    }));
    const tagSuggestions = (options.tags ?? []).slice(0, 4).map((tag) => ({
      kind: "tag" as const,
      label: tag,
      detail: "existing tag",
      insertText: `tags: ${tag}`,
    }));
    return uniqueSuggestions([
      ...categorySuggestions,
      ...tagSuggestions,
      { kind: "tag", label: "new tag", detail: "separate tags with |", insertText: "tags: " },
    ]);
  }

  const placeQuery = composerPlaceTailQuery(input);
  if (completionStage === "place" && placeQuery !== null) {
    return Object.freeze(
      options.places
        .map((place) => ({
          place,
          score: suggestionScore(placeQuery, place.name),
        }))
        .filter(({ score }) => Number.isFinite(score))
        .sort(
          (left, right) =>
            left.score - right.score || left.place.name.localeCompare(right.place.name),
        )
        .slice(0, 7)
        .map(({ place }) => ({
          kind: "place" as const,
          label: place.name,
          detail: `existing place · @${place.id}`,
          insertText: `at @${place.id}`,
        })),
    );
  }

  if (completionStage === "subject" || completionStage === "object") {
    const preferredEntityIds = options.preferredEntityIds ?? [];
    const priority = new Map(preferredEntityIds.map((id, index) => [id, index] as const));
    const entitySuggestions = [...options.entities]
      .map((entity) => ({
        entity,
        priority: priority.get(entity.id) ?? Number.MAX_SAFE_INTEGER,
        score: Math.min(
          ...[entity.name, ...(entity.alternateNames ?? [])].map((name) =>
            suggestionScore(token, name),
          ),
        ),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          left.score - right.score ||
          left.entity.name.localeCompare(right.entity.name),
      )
      .slice(0, 12)
      .map(({ entity }) => ({
        kind: "entity" as const,
        label: entity.name,
        detail: `${entity.type || "entity"} · @${entity.id}`,
        ...(entity.icon ? { icon: entity.icon } : {}),
        insertText: `@${entity.id}`,
      }));
    if (entitySuggestions.length > 0 || parsed.stage !== "complete") {
      return uniqueSuggestions(entitySuggestions);
    }
  }

  if (completionStage === "predicate") {
    const existing = new Set((options.predicates ?? []).map((predicate) => predicate.trim()));
    return Object.freeze(
      rankedStrings([...(options.predicates ?? []), ...ACTION_SUGGESTIONS], token)
        .slice(0, 12)
        .map((action) => ({
          kind: "predicate" as const,
          label: action,
          detail: existing.has(action) ? "existing action" : "action",
          insertText: action,
        })),
    );
  }

  if (
    completionStage === "subject" ||
    completionStage === "predicate" ||
    (completionStage === "object" && parsed.stage !== "complete")
  ) {
    return Object.freeze([]);
  }

  const placeSuggestions = options.places.slice(0, 10).map((place) => ({
    kind: "place" as const,
    label: place.name,
    detail: `existing place · @${place.id}`,
    insertText: `at @${place.id}`,
  }));
  const contextSuggestions: ComposerSuggestion[] = [];
  if (!parsed.place) {
    if (options.locationDefault) {
      contextSuggestions.push({
        kind: "place",
        label: options.locationDefault,
        detail: "current World center",
        insertText: "",
      });
    }
    contextSuggestions.push(...placeSuggestions);
  }
  if (!parsed.time && options.timelineDefault) {
    contextSuggestions.push({
      kind: "time",
      label: options.timelineDefault,
      detail: "current timeline center",
      insertText: `on ${options.timelineDefault}`,
    });
  }
  if (!parsed.options.category) {
    contextSuggestions.push(
      ...options.categories.slice(0, 4).map((category) => ({
        kind: "category" as const,
        label: category.name,
        detail: "existing category",
        insertText: `[category: ${quoteComposerName(category.name)}]`,
      })),
    );
  }
  if (!parsed.options.tags.length) {
    contextSuggestions.push(
      ...(options.tags ?? []).slice(0, 3).map((tag) => ({
        kind: "tag" as const,
        label: tag,
        detail: "existing tag",
        insertText: `[tags: ${tag}]`,
      })),
    );
  }
  return uniqueSuggestions(contextSuggestions);
}

export function composerCompletionSuffix(
  input: string,
  suggestion: ComposerSuggestion | null | undefined,
): string {
  if (!suggestion) return "";
  const token = currentToken(input);
  if (!token) return "";
  for (const candidate of [suggestion.label, suggestion.insertText]) {
    if (candidate.toLocaleLowerCase().startsWith(token)) {
      return candidate.slice(token.length);
    }
  }
  return "";
}

export function replaceComposerTail(input: string, insertText: string, stage: OccurrenceComposerStage): string {
  if (!insertText) return input;
  const trimmed = input.trimEnd();

  if (stage === "place" && /^at\s+/i.test(insertText)) {
    const placeTail = trimmed.match(/\s+at\s+([^\[]*)$/i);
    if (placeTail && !/\s+(?:on|from)\s+/i.test(placeTail[1] ?? "")) {
      const start = placeTail.index ?? trimmed.length;
      return `${trimmed.slice(0, start)} ${insertText} `;
    }
  }

  const bracketedOption = insertText.match(/^\[([^\]]+)\]$/)?.[1];
  const existingOptions = trimmed.match(/\[([^\]]*)\]\s*$/);
  if (bracketedOption && existingOptions) {
    const start = existingOptions.index ?? trimmed.length;
    const retained = existingOptions[1]!.trim();
    return `${trimmed.slice(0, start)}[${retained}${retained ? ", " : ""}${bracketedOption}] `;
  }

  const openEntityProperties = trimmed.lastIndexOf("(");
  const closeEntityProperties = trimmed.lastIndexOf(")");
  if (openEntityProperties > closeEntityProperties) {
    const prefix = trimmed.slice(0, openEntityProperties + 1);
    const current = trimmed.slice(openEntityProperties + 1);
    const comma = current.lastIndexOf(",");
    const retained = comma >= 0 ? current.slice(0, comma + 1) : "";
    return `${prefix}${retained}${retained ? " " : ""}${insertText}`;
  }

  const openOptions = trimmed.lastIndexOf("[");
  const closeOptions = trimmed.lastIndexOf("]");
  if (openOptions > closeOptions) {
    const prefix = trimmed.slice(0, openOptions + 1);
    const current = trimmed.slice(openOptions + 1);
    const comma = current.lastIndexOf(",");
    const retained = comma >= 0 ? current.slice(0, comma + 1) : "";
    return `${prefix}${retained}${retained ? " " : ""}${insertText}`;
  }

  if (stage === "subject") return `${insertText} `;
  if (stage === "predicate") {
    const withoutTail = trimmed.replace(/[^\s]*$/, "");
    return `${withoutTail}${insertText} `;
  }
  if (stage === "object") {
    const parsedSubject = parseEntityAtStart(trimmed);
    const predicateMatch = parsedSubject.rest.match(/^([^\s()\[\]]+)/);
    if (predicateMatch) {
      const restStart = trimmed.length - parsedSubject.rest.length;
      const prefix = trimmed.slice(0, restStart + predicateMatch[0].length).trimEnd();
      return `${prefix} ${insertText} `;
    }
    return `${insertText} `;
  }
  const separator = trimmed ? " " : "";
  return `${trimmed}${separator}${insertText} `;
}
