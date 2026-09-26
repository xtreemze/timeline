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

const ENTITY_PROPERTY_SUGGESTIONS = Object.freeze([
  "type: person",
  "type: organization",
  "type: group",
  "type: document",
  "type: object",
  "icon: user",
  "icon: building",
  "icon: document",
  "color: #667085",
  "style: default",
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
    name = match[1];
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
      time: Object.freeze({ kind: "range", start: range[1], end: range[2] }),
    };
  }
  const instant = input.match(/\s+on\s+(\S+)\s*$/i);
  if (instant) {
    return {
      source: input.slice(0, instant.index).trimEnd(),
      time: Object.freeze({ kind: "instant", start: instant[1] }),
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

  const predicate = predicateMatch[1];
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
  const match = input.match(/(?:^|\s)([^\s]*)$/);
  return (match?.[1] ?? "").replace(/^["([]/, "").toLocaleLowerCase();
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
    readonly timelineDefault?: string | null;
    readonly locationDefault?: string | null;
  },
): readonly ComposerSuggestion[] {
  const parsed = parseOccurrenceSentence(input);
  const token = currentToken(input);

  if (/\([^)]*$/.test(input)) {
    return Object.freeze(
      ENTITY_PROPERTY_SUGGESTIONS.filter(
        (property) => !token || property.toLocaleLowerCase().includes(token),
      ).map((property) => ({
        kind: "property" as const,
        label: property,
        detail: "entity property",
        insertText: property,
      })),
    );
  }

  if (/\[[^\]]*$/.test(input)) {
    const categorySuggestions = options.categories.slice(0, 10).map((category) => ({
      kind: "category" as const,
      label: category.name,
      detail: "category",
      insertText: `category: ${quoteComposerName(category.name)}`,
    }));
    return uniqueSuggestions([
      ...categorySuggestions,
      { kind: "tag", label: "tags", detail: "separate tags with |", insertText: "tags: " },
    ]);
  }

  if (parsed.stage === "subject" || parsed.stage === "object") {
    const entitySuggestions = options.entities
      .filter((entity) => {
        if (!token) return true;
        return [entity.name, ...(entity.alternateNames ?? [])].some((name) =>
          name.toLocaleLowerCase().includes(token),
        );
      })
      .slice(0, 12)
      .map((entity) => {
        const sameNameCount = options.entities.filter(
          (candidate) =>
            candidate.name.toLocaleLowerCase() === entity.name.toLocaleLowerCase(),
        ).length;
        return {
          kind: "entity" as const,
          label: entity.name,
          detail:
            sameNameCount > 1
              ? `${entity.type || "entity"} · ${entity.id}`
              : entity.type || "entity",
          insertText:
            sameNameCount > 1 ? `@${entity.id}` : quoteComposerName(entity.name),
        };
      });
    return uniqueSuggestions(entitySuggestions);
  }

  if (parsed.stage === "predicate") {
    return Object.freeze(
      ACTION_SUGGESTIONS.filter((action) => !token || action.includes(token))
        .slice(0, 12)
        .map((action) => ({
          kind: "predicate" as const,
          label: action,
          detail: "action",
          insertText: action,
        })),
    );
  }

  const placeSuggestions = options.places.slice(0, 10).map((place) => {
    const sameNameCount = options.places.filter(
      (candidate) =>
        candidate.name.toLocaleLowerCase() === place.name.toLocaleLowerCase(),
    ).length;
    return {
      kind: "place" as const,
      label: place.name,
      detail: sameNameCount > 1 ? `place · ${place.id}` : "place",
      insertText:
        sameNameCount > 1
          ? `at @${place.id}`
          : `at ${quoteComposerName(place.name)}`,
    };
  });
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
      ...options.categories.slice(0, 6).map((category) => ({
        kind: "category" as const,
        label: category.name,
        detail: "occurrence category",
        insertText: `[category: ${quoteComposerName(category.name)}]`,
      })),
    );
  }
  return uniqueSuggestions(contextSuggestions);
}

export function replaceComposerTail(input: string, insertText: string, stage: OccurrenceComposerStage): string {
  if (!insertText) return input;
  const trimmed = input.trimEnd();

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
    const predicate = parsedSubject.rest.match(/^([^\s()\[\]]+)/)?.[1] ?? "";
    const prefix = `${quoteComposerName(parsedSubject.entity?.name ?? "")} ${predicate}`.trim();
    return `${prefix} ${insertText} `;
  }
  const separator = trimmed ? " " : "";
  return `${trimmed}${separator}${insertText} `;
}
