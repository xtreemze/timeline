import { SEMANTIC_ICON_NAMES, type SemanticIconName } from "../src/presentation/semantic-icons.ts";
import {
  suggestSemanticIcon,
  suggestSemanticIconForPlace,
} from "../src/presentation/semantic-icon-inference.ts";

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
  readonly icon?: string;
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
  readonly replaceRange?: Readonly<{ start: number; end: number }>;
}

export type ComposerCursorSectionKind =
  | "subject"
  | "predicate"
  | "object"
  | "place"
  | "time"
  | "options"
  | "tail";

export interface ComposerCursorSection {
  readonly kind: ComposerCursorSectionKind;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export type ComposerEditableSectionKind =
  | "subject"
  | "predicate"
  | "object"
  | "place"
  | "time"
  | "category"
  | "tag";

export interface ComposerEditableSection {
  readonly kind: ComposerEditableSectionKind;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly index?: number;
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

const ACTION_ICON_HINTS = Object.freeze({
  meets: "relation",
  calls: "relation",
  visits: "relation",
  sends: "relation",
  receives: "relation",
  finds: "search",
  observes: "view",
  creates: "milestone",
  moves: "relation",
  joins: "relation",
  leaves: "relation",
  helps: "relation",
  attacks: "danger",
  warns: "danger",
  asks: "relation",
  answers: "relation",
  reports: "evidence",
  transfers: "relation",
} satisfies Partial<Record<string, SemanticIconName>>);

function actionIconHint(action: string): SemanticIconName {
  const direct = Reflect.get(ACTION_ICON_HINTS, action) as SemanticIconName | undefined;
  if (direct) return direct;
  const normalized = action.trim().toLocaleLowerCase();
  if (/attack|harm|threat|confront|fight|seize|rob|chase/.test(normalized)) return "danger";
  if (/find|discover|identify|search|question/.test(normalized)) return "search";
  if (/observe|watch|see|hear/.test(normalized)) return "view";
  if (/create|build|make|prepare/.test(normalized)) return "milestone";
  if (/decide|choose|order|instruct/.test(normalized)) return "decision";
  if (/report|record|document/.test(normalized)) return "evidence";
  return "relation";
}

function availableActions(projectPredicates: readonly string[] = []): readonly string[] {
  return Object.freeze(
    [
      ...new Set([
        ...ACTION_SUGGESTIONS,
        ...projectPredicates.map((predicate) => predicate.trim()),
      ]),
    ].filter(Boolean),
  );
}

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
  if (/^[^\s()[\]",|]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function findMarkerOutsideQuotes(input: string, marker: string, fromIndex = 0): number {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (index >= fromIndex && input.startsWith(marker, index)) return index;
  }
  return -1;
}

function findLastMarkerOutsideQuotes(input: string, marker: string, fromIndex = 0): number {
  let quoted = false;
  let escaped = false;
  let found = -1;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (index >= fromIndex && input.startsWith(marker, index)) found = index;
  }
  return found;
}

function splitRangesOutsideQuotes(
  input: string,
  delimiter: string,
): readonly Readonly<{ start: number; end: number }>[] {
  const ranges: Array<Readonly<{ start: number; end: number }>> = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (input.startsWith(delimiter, index)) {
      ranges.push(Object.freeze({ start, end: index }));
      start = index + delimiter.length;
      index += delimiter.length - 1;
    }
  }
  ranges.push(Object.freeze({ start, end: input.length }));
  return Object.freeze(ranges);
}

interface ComposerPropertyEntry {
  readonly key: string;
  readonly rawValue: string;
  readonly valueStart: number;
  readonly valueEnd: number;
}

function parsePropertyEntries(value: string): readonly ComposerPropertyEntry[] {
  const entries: ComposerPropertyEntry[] = [];
  for (const range of splitRangesOutsideQuotes(value, ",")) {
    const segment = value.slice(range.start, range.end);
    const separator = findMarkerOutsideQuotes(segment, ":");
    if (separator < 1) continue;
    const key = segment.slice(0, separator).trim();
    if (!key) continue;
    const valueRange = trimmedValueRange(
      value,
      range.start + separator + 1,
      range.end,
    );
    entries.push(
      Object.freeze({
        key,
        rawValue: value.slice(valueRange.start, valueRange.end),
        valueStart: valueRange.start,
        valueEnd: valueRange.end,
      }),
    );
  }
  return Object.freeze(entries);
}

export interface OccurrenceCompositionInput {
  readonly subjectId: string;
  readonly predicate: string;
  readonly objectId: string;
  readonly placeId?: string | null;
  readonly start?: string | null;
  readonly end?: string | null;
  readonly category?: string | null;
  readonly tags?: readonly string[];
}

export function formatOccurrenceComposition(input: OccurrenceCompositionInput): string {
  const subjectId = input.subjectId.trim();
  const objectId = input.objectId.trim();
  const predicate = input.predicate.trim();
  if (!subjectId || !objectId || !predicate) return "";
  let sentence = `@${subjectId} ${predicate} @${objectId}`;
  const placeId = input.placeId?.trim() ?? "";
  if (placeId) sentence += ` at @${placeId}`;
  const start = input.start?.trim() ?? "";
  const end = input.end?.trim() ?? "";
  if (start && end) sentence += ` from ${start} to ${end}`;
  else if (start) sentence += ` on ${start}`;
  const options: string[] = [];
  const category = input.category?.trim() ?? "";
  if (category) options.push(`category: ${quoteComposerName(category)}`);
  const tags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (tags.length) options.push(`tags: ${tags.map(quoteComposerName).join("|")}`);
  if (options.length) sentence += ` [${options.join(", ")}]`;
  return sentence;
}

function parseProperties(value: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of parsePropertyEntries(value)) {
    if (!entry.rawValue) continue;
    result[entry.key] = unquote(entry.rawValue);
  }
  return Object.freeze(result);
}

function parseEntityAtStart(input: string): {
  readonly entity: ComposerEntityReference | null;
  readonly rest: string;
} {
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
    const close = findMarkerOutsideQuotes(rest, ")", 1);
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
  const close = findLastMarkerOutsideQuotes(trimmed, "]");
  if (close !== trimmed.length - 1) {
    return {
      source: trimmed,
      options: Object.freeze({ tags: Object.freeze([]) }),
      malformed: false,
    };
  }
  const open = findLastMarkerOutsideQuotes(trimmed, "[");
  if (open < 0 || open > close) {
    return {
      source: trimmed,
      options: Object.freeze({ tags: Object.freeze([]) }),
      malformed: true,
    };
  }
  const body = trimmed.slice(open + 1, close);
  const entries = parsePropertyEntries(body);
  const categoryEntry = entries.find(
    (entry) => entry.key.toLocaleLowerCase() === "category",
  );
  const tagsEntry = entries.find((entry) => entry.key.toLocaleLowerCase() === "tags");
  const category = categoryEntry?.rawValue ? unquote(categoryEntry.rawValue) : "";
  const tags = tagsEntry
    ? splitRangesOutsideQuotes(tagsEntry.rawValue, "|")
        .map((range) => unquote(tagsEntry.rawValue.slice(range.start, range.end)))
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  return {
    source: trimmed.slice(0, open).trimEnd(),
    options: Object.freeze({
      ...(category ? { category } : {}),
      tags: Object.freeze(tags),
    }),
    malformed: false,
  };
}

function stripTime(input: string): {
  readonly source: string;
  readonly time: ComposerTimeReference | null;
} {
  const lower = input.toLocaleLowerCase();
  const fromMarker = findLastMarkerOutsideQuotes(lower, " from ");
  if (fromMarker >= 0) {
    const suffix = input.slice(fromMarker + 6);
    const suffixLower = lower.slice(fromMarker + 6);
    const toMarker = findLastMarkerOutsideQuotes(suffixLower, " to ");
    if (toMarker >= 0) {
      const start = suffix.slice(0, toMarker).trim();
      const end = suffix.slice(toMarker + 4).trim();
      if (start && end && !/\s/.test(start) && !/\s/.test(end)) {
        return {
          source: input.slice(0, fromMarker).trimEnd(),
          time: Object.freeze({ kind: "range", start, end }),
        };
      }
    }
  }

  const onMarker = findLastMarkerOutsideQuotes(lower, " on ");
  if (onMarker >= 0) {
    const start = input.slice(onMarker + 4).trim();
    if (start && !/\s/.test(start)) {
      return {
        source: input.slice(0, onMarker).trimEnd(),
        time: Object.freeze({ kind: "instant", start }),
      };
    }
  }
  return { source: input, time: null };
}

function stripPlace(input: string): {
  readonly source: string;
  readonly place: ComposerPlaceReference | null;
} {
  const marker = findLastMarkerOutsideQuotes(input.toLocaleLowerCase(), " at ");
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
  const match = input.match(/(?:^|\s)([^\s]*)$/);
  return (match?.[1] ?? "").replace(/^["([]/, "").toLocaleLowerCase();
}

function uniqueSuggestions(
  suggestions: readonly ComposerSuggestion[],
): readonly ComposerSuggestion[] {
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

function skipSpaces(input: string, offset: number): number {
  let cursor = Math.max(0, Math.min(input.length, offset));
  while (cursor < input.length && /\s/.test(input[cursor]!)) cursor += 1;
  return cursor;
}

function readEntitySpan(
  input: string,
  offset: number,
): { start: number; end: number; text: string } | null {
  const start = skipSpaces(input, offset);
  if (start >= input.length) return null;

  let nameEnd = start;
  if (input[start] === '"') {
    let escaped = false;
    nameEnd = start + 1;
    while (nameEnd < input.length) {
      const character = input[nameEnd]!;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        nameEnd += 1;
        break;
      }
      nameEnd += 1;
    }
  } else {
    while (nameEnd < input.length && !/[\s()[\]]/.test(input[nameEnd]!)) nameEnd += 1;
  }
  if (nameEnd <= start) return null;

  let end = nameEnd;
  const propertyStart = skipSpaces(input, nameEnd);
  if (input[propertyStart] === "(") {
    const close = input.indexOf(")", propertyStart + 1);
    end = close >= 0 ? close + 1 : input.length;
  }

  return {
    start,
    end,
    text: unquote(input.slice(start, nameEnd)),
  };
}

function readTokenSpan(
  input: string,
  offset: number,
): { start: number; end: number; text: string } | null {
  const start = skipSpaces(input, offset);
  if (start >= input.length) return null;
  let end = start;
  while (end < input.length && !/[\s()[\]]/.test(input[end]!)) end += 1;
  return end > start ? { start, end, text: input.slice(start, end) } : null;
}

function trimRangeEnd(input: string, start: number, end: number): number {
  let cursor = Math.max(start, Math.min(input.length, end));
  while (cursor > start && /\s/.test(input[cursor - 1]!)) cursor -= 1;
  return cursor;
}

function cursorWithinSpan(
  offset: number,
  start: number,
  end: number,
  inputLength: number,
): boolean {
  return offset >= start && (offset < end || (offset === end && offset === inputLength));
}

export function composerCursorSection(input: string, cursorOffset: number): ComposerCursorSection {
  const offset = Math.max(0, Math.min(input.length, cursorOffset));
  const subject = readEntitySpan(input, 0);
  if (!subject) return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });

  if (cursorWithinSpan(offset, subject.start, subject.end, input.length)) {
    return Object.freeze({ kind: "subject", ...subject });
  }

  const predicate = readTokenSpan(input, subject.end);
  if (!predicate) return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });
  if (cursorWithinSpan(offset, predicate.start, predicate.end, input.length)) {
    return Object.freeze({ kind: "predicate", ...predicate });
  }

  const object = readEntitySpan(input, predicate.end);
  if (!object) return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });
  if (cursorWithinSpan(offset, object.start, object.end, input.length)) {
    return Object.freeze({ kind: "object", ...object });
  }

  const lower = input.toLocaleLowerCase();
  const optionsStart = lower.indexOf("[", object.end);
  const onMarker = lower.indexOf(" on ", object.end);
  const fromMarker = lower.indexOf(" from ", object.end);
  const timeMarker =
    onMarker < 0 ? fromMarker : fromMarker < 0 ? onMarker : Math.min(onMarker, fromMarker);
  const placeMarker = lower.indexOf(" at ", object.end);

  if (placeMarker >= 0 && (timeMarker < 0 || placeMarker < timeMarker)) {
    const start = placeMarker + 4;
    const boundaryCandidates = [timeMarker, optionsStart, input.length].filter(
      (candidate) => candidate >= start,
    );
    const end = trimRangeEnd(input, start, Math.min(...boundaryCandidates));
    if (offset >= placeMarker && cursorWithinSpan(offset, start, end, input.length)) {
      return Object.freeze({
        kind: "place",
        start,
        end,
        text: unquote(input.slice(start, end)),
      });
    }
  }

  if (timeMarker >= 0) {
    const markerLength = timeMarker === onMarker ? 4 : 6;
    const start = timeMarker + markerLength;
    const end = trimRangeEnd(input, start, optionsStart >= start ? optionsStart : input.length);
    if (offset >= timeMarker && cursorWithinSpan(offset, start, end, input.length)) {
      return Object.freeze({ kind: "time", start, end, text: input.slice(start, end).trim() });
    }
  }

  if (optionsStart >= 0) {
    const optionsEnd = input.indexOf("]", optionsStart + 1);
    const end = optionsEnd >= 0 ? optionsEnd + 1 : input.length;
    if (offset >= optionsStart && offset < end) {
      return Object.freeze({
        kind: "options",
        start: optionsStart,
        end,
        text: input.slice(optionsStart, end),
      });
    }
  }

  return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });
}

function trimmedValueRange(
  input: string,
  start: number,
  end: number,
): Readonly<{ start: number; end: number }> {
  let valueStart = Math.max(0, Math.min(input.length, start));
  let valueEnd = Math.max(valueStart, Math.min(input.length, end));
  while (valueStart < valueEnd && /\s/.test(input[valueStart]!)) valueStart += 1;
  while (valueEnd > valueStart && /\s/.test(input[valueEnd - 1]!)) valueEnd -= 1;
  return Object.freeze({ start: valueStart, end: valueEnd });
}

export function composerEditableSections(input: string): readonly ComposerEditableSection[] {
  const sections: ComposerEditableSection[] = [];
  const subject = readEntitySpan(input, 0);
  if (!subject) return Object.freeze(sections);
  sections.push(Object.freeze({ kind: "subject", ...subject }));

  const predicate = readTokenSpan(input, subject.end);
  if (!predicate) return Object.freeze(sections);
  sections.push(Object.freeze({ kind: "predicate", ...predicate }));

  const object = readEntitySpan(input, predicate.end);
  if (!object) return Object.freeze(sections);
  sections.push(Object.freeze({ kind: "object", ...object }));

  const lower = input.toLocaleLowerCase();
  const optionsStart = lower.indexOf("[", object.end);
  const onMarker = lower.indexOf(" on ", object.end);
  const fromMarker = lower.indexOf(" from ", object.end);
  const timeMarker =
    onMarker < 0 ? fromMarker : fromMarker < 0 ? onMarker : Math.min(onMarker, fromMarker);
  const placeMarker = lower.indexOf(" at ", object.end);

  if (placeMarker >= 0 && (timeMarker < 0 || placeMarker < timeMarker)) {
    const valueStart = placeMarker + 4;
    const boundaryCandidates = [timeMarker, optionsStart, input.length].filter(
      (candidate) => candidate >= valueStart,
    );
    const valueEnd = trimRangeEnd(input, valueStart, Math.min(...boundaryCandidates));
    if (valueEnd > valueStart) {
      sections.push(
        Object.freeze({
          kind: "place",
          start: valueStart,
          end: valueEnd,
          text: unquote(input.slice(valueStart, valueEnd)),
        }),
      );
    }
  }

  if (timeMarker >= 0) {
    const clauseStart = timeMarker + 1;
    const clauseEnd = trimRangeEnd(
      input,
      clauseStart,
      optionsStart >= clauseStart ? optionsStart : input.length,
    );
    if (clauseEnd > clauseStart) {
      sections.push(
        Object.freeze({
          kind: "time",
          start: clauseStart,
          end: clauseEnd,
          text: input.slice(clauseStart, clauseEnd).trim(),
        }),
      );
    }
  }

  if (optionsStart >= 0) {
    const optionsClose = input.indexOf("]", optionsStart + 1);
    const bodyEnd = optionsClose >= 0 ? optionsClose : input.length;
    const body = input.slice(optionsStart + 1, bodyEnd);
    const categoryMatch = /(?:^|,)\s*category\s*:\s*([^,\]]*)/i.exec(body);
    if (categoryMatch && categoryMatch.index >= 0) {
      const rawValue = categoryMatch[1] ?? "";
      const rawStart =
        optionsStart +
        1 +
        categoryMatch.index +
        categoryMatch[0].lastIndexOf(rawValue);
      const range = trimmedValueRange(input, rawStart, rawStart + rawValue.length);
      if (range.end > range.start) {
        sections.push(
          Object.freeze({
            kind: "category",
            start: range.start,
            end: range.end,
            text: unquote(input.slice(range.start, range.end)),
          }),
        );
      }
    }

    const tagsMatch = /(?:^|,)\s*tags\s*:\s*([^,\]]*)/i.exec(body);
    if (tagsMatch && tagsMatch.index >= 0) {
      const rawTags = tagsMatch[1] ?? "";
      const rawStart =
        optionsStart + 1 + tagsMatch.index + tagsMatch[0].lastIndexOf(rawTags);
      let segmentOffset = 0;
      let tagIndex = 0;
      for (const segment of rawTags.split("|")) {
        const range = trimmedValueRange(
          input,
          rawStart + segmentOffset,
          rawStart + segmentOffset + segment.length,
        );
        if (range.end > range.start) {
          sections.push(
            Object.freeze({
              kind: "tag",
              start: range.start,
              end: range.end,
              text: unquote(input.slice(range.start, range.end)),
              index: tagIndex,
            }),
          );
          tagIndex += 1;
        }
        segmentOffset += segment.length + 1;
      }
    }
  }

  return Object.freeze(sections);
}

function normalizedMatchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}@]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1]! + 1,
        previous[column]! + 1,
        previous[column - 1]! + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length]!;
}

function nearestMatchScore(query: string, candidates: readonly string[]): number {
  const needle = normalizedMatchText(query);
  if (!needle) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const value = normalizedMatchText(candidate);
    if (!value) continue;
    if (value === needle) return 0;
    if (value.startsWith(needle) || needle.startsWith(value)) best = Math.min(best, 0.5);
    else if (value.includes(needle) || needle.includes(value)) best = Math.min(best, 1);
    const distance = editDistance(needle, value) / Math.max(needle.length, value.length, 1);
    best = Math.min(best, 2 + distance);
  }
  return best;
}

function cursorEntitySuggestions(
  section: ComposerCursorSection,
  entities: readonly ComposerEntityOption[],
): readonly ComposerSuggestion[] {
  const ranked = entities
    .map((entity) => ({
      entity,
      score: nearestMatchScore(section.text, [
        entity.name,
        `@${entity.id}`,
        ...(entity.alternateNames ?? []),
      ]),
    }))
    .sort(
      (left, right) =>
        left.score - right.score || left.entity.name.localeCompare(right.entity.name),
    )
    .slice(0, 8)
    .map(({ entity }) => {
      const sameNameCount = entities.filter(
        (candidate) => normalizedMatchText(candidate.name) === normalizedMatchText(entity.name),
      ).length;
      return {
        kind: "entity" as const,
        label: entity.name,
        detail:
          sameNameCount > 1
            ? `nearest ${section.kind} · ${entity.type || "entity"} · ${entity.id}`
            : `nearest ${section.kind} · ${entity.type || "entity"}`,
        ...(entity.icon ? { icon: entity.icon } : {}),
        insertText: sameNameCount > 1 ? `@${entity.id}` : quoteComposerName(entity.name),
        replaceRange: Object.freeze({ start: section.start, end: section.end }),
      };
    });

  if (section.text.startsWith("@")) return uniqueSuggestions(ranked);
  const inferred = suggestSemanticIcon({ name: section.text, type: "object" });
  const exact = entities.some((entity) =>
    [entity.name, ...(entity.alternateNames ?? [])].some(
      (name) => normalizedMatchText(name) === normalizedMatchText(section.text),
    ),
  );
  if (!inferred || exact || !section.text.trim()) return uniqueSuggestions(ranked);

  return uniqueSuggestions([
    {
      kind: "entity",
      label: `Use “${section.text.trim()}”`,
      detail: `new entity · suggested ${inferred.icon} icon`,
      icon: inferred.icon,
      insertText: `${quoteComposerName(section.text.trim())}(icon: ${inferred.icon})`,
      replaceRange: Object.freeze({ start: section.start, end: section.end }),
    },
    ...ranked,
  ]);
}

function cursorPredicateSuggestions(
  section: ComposerCursorSection,
  projectPredicates: readonly string[] = [],
): readonly ComposerSuggestion[] {
  return Object.freeze(
    [...availableActions(projectPredicates)]
      .sort(
        (left, right) =>
          nearestMatchScore(section.text, [left]) - nearestMatchScore(section.text, [right]) ||
          left.localeCompare(right),
      )
      .slice(0, 8)
      .map((action) => ({
        kind: "predicate" as const,
        label: action,
        detail: "nearest action",
        icon: actionIconHint(action),
        insertText: action,
        replaceRange: Object.freeze({ start: section.start, end: section.end }),
      })),
  );
}

function cursorPlaceSuggestions(
  section: ComposerCursorSection,
  places: readonly ComposerPlaceOption[],
): readonly ComposerSuggestion[] {
  const ranked = places
    .map((place) => ({
      place,
      score: nearestMatchScore(section.text, [place.name, `@${place.id}`]),
    }))
    .sort(
      (left, right) => left.score - right.score || left.place.name.localeCompare(right.place.name),
    )
    .slice(0, 8)
    .map(({ place }) => {
      const sameNameCount = places.filter(
        (candidate) => normalizedMatchText(candidate.name) === normalizedMatchText(place.name),
      ).length;
      return {
        kind: "place" as const,
        label: place.name,
        detail: sameNameCount > 1 ? `nearest place · ${place.id}` : "nearest place",
        ...(place.icon ? { icon: place.icon } : {}),
        insertText: sameNameCount > 1 ? `@${place.id}` : quoteComposerName(place.name),
        replaceRange: Object.freeze({ start: section.start, end: section.end }),
      };
    });

  if (section.text.startsWith("@")) return uniqueSuggestions(ranked);
  const inferred = suggestSemanticIconForPlace({ name: section.text });
  const exact = places.some(
    (place) => normalizedMatchText(place.name) === normalizedMatchText(section.text),
  );
  if (!inferred || exact || !section.text.trim()) return uniqueSuggestions(ranked);

  return uniqueSuggestions([
    {
      kind: "place",
      label: `Use “${section.text.trim()}”`,
      detail: `new place · suggested ${inferred.icon} icon`,
      icon: inferred.icon,
      insertText: quoteComposerName(section.text.trim()),
      replaceRange: Object.freeze({ start: section.start, end: section.end }),
    },
    ...ranked,
  ]);
}

export function occurrenceComposerSuggestions(
  input: string,
  options: {
    readonly entities: readonly ComposerEntityOption[];
    readonly places: readonly ComposerPlaceOption[];
    readonly categories: readonly ComposerCategoryOption[];
    readonly timelineDefault?: string | null;
    readonly locationDefault?: string | null;
    readonly preferredEntityIds?: readonly string[];
    readonly predicates?: readonly string[];
    readonly tags?: readonly string[];
    readonly cursorOffset?: number | null;
  },
): readonly ComposerSuggestion[] {
  const parsed = parseOccurrenceSentence(input);
  const cursorOffset =
    options.cursorOffset === null || options.cursorOffset === undefined
      ? input.length
      : Math.max(0, Math.min(input.length, options.cursorOffset));
  const prefix = input.slice(0, cursorOffset);
  const token = currentToken(prefix);
  const editableSection = composerEditableSections(input).find(
    (section) => cursorOffset >= section.start && cursorOffset <= section.end,
  );

  if (/\([^)]*$/.test(prefix)) {
    const iconValueActive = /(?:^|[,(])\s*icon\s*:\s*[^,)]*$/i.test(prefix);
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

  if (/\[[^\]]*$/.test(prefix)) {
    const optionStart = prefix.lastIndexOf("[");
    const optionText = prefix.slice(optionStart + 1);
    const categoryMatch = optionText.match(/(?:^|,)\s*category\s*:\s*([^,\]]*)$/i);
    const tagMatch = optionText.match(/(?:^|,)\s*tags\s*:\s*([^,\]]*)$/i);

    if (tagMatch) {
      const rawTags = tagMatch[1] ?? "";
      const segments = rawTags.split("|");
      const activeTag = normalizedMatchText(segments.at(-1) ?? "");
      const retainedTags = segments
        .slice(0, -1)
        .map((tag) => tag.trim())
        .filter(Boolean);
      const retainedKeys = new Set(retainedTags.map(normalizedMatchText));
      return uniqueSuggestions(
        (options.tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean)
          .filter((tag) => !retainedKeys.has(normalizedMatchText(tag)))
          .filter((tag) => {
            if (editableSection?.kind === "tag" || !activeTag) return true;
            return normalizedMatchText(tag).includes(activeTag);
          })
          .slice(0, 10)
          .map((tag) =>
            editableSection?.kind === "tag"
              ? {
                  kind: "tag" as const,
                  label: tag,
                  detail: "existing tag",
                  insertText: tag,
                  replaceRange: Object.freeze({
                    start: editableSection.start,
                    end: editableSection.end,
                  }),
                }
              : {
                  kind: "tag" as const,
                  label: tag,
                  detail: "existing tag",
                  insertText: `tags: ${[...retainedTags, tag].join("|")}`,
                },
          ),
      );
    }

    const categorySuggestions = options.categories
      .filter((category) => {
        const activeCategory =
          editableSection?.kind === "category"
            ? ""
            : normalizedMatchText(categoryMatch?.[1] ?? "");
        return !activeCategory || normalizedMatchText(category.name).includes(activeCategory);
      })
      .slice(0, 10)
      .map((category) =>
        editableSection?.kind === "category"
          ? {
              kind: "category" as const,
              label: category.name,
              detail: "category",
              insertText: quoteComposerName(category.name),
              replaceRange: Object.freeze({
                start: editableSection.start,
                end: editableSection.end,
              }),
            }
          : {
              kind: "category" as const,
              label: category.name,
              detail: "category",
              insertText: `category: ${quoteComposerName(category.name)}`,
            },
      );

    if (categoryMatch) return uniqueSuggestions(categorySuggestions);

    return uniqueSuggestions([
      ...categorySuggestions,
      { kind: "tag", label: "tags", detail: "separate tags with |", insertText: "tags: " },
    ]);
  }

  const cursorSection = composerCursorSection(input, cursorOffset);
  if (editableSection?.kind === "subject" || editableSection?.kind === "object") {
    return cursorEntitySuggestions(
      Object.freeze({
        kind: editableSection.kind,
        start: editableSection.start,
        end: editableSection.end,
        text: editableSection.text,
      }),
      options.entities,
    );
  }
  if (editableSection?.kind === "predicate") {
    return cursorPredicateSuggestions(
      Object.freeze({
        kind: "predicate",
        start: editableSection.start,
        end: editableSection.end,
        text: editableSection.text,
      }),
      options.predicates,
    );
  }
  if (editableSection?.kind === "place") {
    return cursorPlaceSuggestions(
      Object.freeze({
        kind: "place",
        start: editableSection.start,
        end: editableSection.end,
        text: editableSection.text,
      }),
      options.places,
    );
  }
  if (cursorSection.kind === "subject" || cursorSection.kind === "object") {
    return cursorEntitySuggestions(cursorSection, options.entities);
  }
  if (cursorSection.kind === "predicate") {
    return cursorPredicateSuggestions(cursorSection, options.predicates);
  }
  if (cursorSection.kind === "place") {
    return cursorPlaceSuggestions(cursorSection, options.places);
  }
  if ((cursorSection.kind === "time" || editableSection?.kind === "time") && options.timelineDefault) {
    const editableTime =
      editableSection?.kind === "time"
        ? editableSection
        : Object.freeze({
            start: cursorSection.start,
            end: cursorSection.end,
          });
    return Object.freeze([
      {
        kind: "time" as const,
        label: options.timelineDefault,
        detail: "current timeline center",
        icon: "milestone",
        insertText:
          editableSection?.kind === "time"
            ? `on ${options.timelineDefault}`
            : options.timelineDefault,
        replaceRange: Object.freeze({ start: editableTime.start, end: editableTime.end }),
      },
    ]);
  }

  if (parsed.stage === "subject" || parsed.stage === "object") {
    const preferredEntityIds = options.preferredEntityIds ?? [];
    const priority = new Map(preferredEntityIds.map((id, index) => [id, index] as const));
    const entitySuggestions = [...options.entities]
      .sort(
        (left, right) =>
          (priority.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (priority.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      )
      .filter((entity) => {
        if (!token) return true;
        return [entity.name, ...(entity.alternateNames ?? [])].some((name) =>
          name.toLocaleLowerCase().includes(token),
        );
      })
      .slice(0, 12)
      .map((entity) => {
        const sameNameCount = options.entities.filter(
          (candidate) => candidate.name.toLocaleLowerCase() === entity.name.toLocaleLowerCase(),
        ).length;
        return {
          kind: "entity" as const,
          label: entity.name,
          detail:
            sameNameCount > 1
              ? `${entity.type || "entity"} · ${entity.id}`
              : entity.type || "entity",
          ...(entity.icon ? { icon: entity.icon } : {}),
          insertText: sameNameCount > 1 ? `@${entity.id}` : quoteComposerName(entity.name),
        };
      });
    return uniqueSuggestions(entitySuggestions);
  }

  if (parsed.stage === "predicate") {
    return Object.freeze(
      availableActions(options.predicates)
        .filter((action) => !token || action.toLocaleLowerCase().includes(token))
        .slice(0, 12)
        .map((action) => ({
          kind: "predicate" as const,
          label: action,
          detail: "action",
          icon: actionIconHint(action),
          insertText: action,
        })),
    );
  }

  const placeSuggestions = options.places.slice(0, 10).map((place) => {
    const sameNameCount = options.places.filter(
      (candidate) => candidate.name.toLocaleLowerCase() === place.name.toLocaleLowerCase(),
    ).length;
    return {
      kind: "place" as const,
      label: place.name,
      detail: sameNameCount > 1 ? `place · ${place.id}` : "place",
      insertText: sameNameCount > 1 ? `at @${place.id}` : `at ${quoteComposerName(place.name)}`,
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
  const optionsOpen = input.lastIndexOf("[");
  const optionsClose = optionsOpen >= 0 ? input.indexOf("]", optionsOpen + 1) : -1;
  const appendClosedOptionSuggestion = (
    kind: "category" | "tag",
    label: string,
    detail: string,
    key: "category" | "tags",
    value: string,
  ): ComposerSuggestion => {
    if (optionsOpen >= 0 && optionsClose >= 0) {
      let replaceEnd = optionsClose + 1;
      while (replaceEnd < input.length && /\s/.test(input[replaceEnd]!)) replaceEnd += 1;
      const body = input.slice(optionsOpen + 1, optionsClose).trim();
      return Object.freeze({
        kind,
        label,
        detail,
        insertText: `${body ? ", " : ""}${key}: ${value}] `,
        replaceRange: Object.freeze({ start: optionsClose, end: replaceEnd }),
      });
    }
    const trimmedEnd = input.trimEnd().length;
    return Object.freeze({
      kind,
      label,
      detail,
      insertText: `${trimmedEnd ? " " : ""}[${key}: ${value}] `,
      replaceRange: Object.freeze({ start: trimmedEnd, end: input.length }),
    });
  };

  if (!parsed.options.category) {
    contextSuggestions.push(
      ...options.categories.slice(0, 6).map((category) =>
        appendClosedOptionSuggestion(
          "category",
          category.name,
          "occurrence category",
          "category",
          quoteComposerName(category.name),
        ),
      ),
    );
  }

  const selectedTagKeys = new Set(parsed.options.tags.map(normalizedMatchText));
  if (!parsed.options.tags.length) {
    contextSuggestions.push(
      ...(options.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => !selectedTagKeys.has(normalizedMatchText(tag)))
        .slice(0, 6)
        .map((tag) =>
          appendClosedOptionSuggestion("tag", tag, "occurrence tag", "tags", quoteComposerName(tag)),
        ),
    );
  } else {
    const tagSections = composerEditableSections(input).filter((section) => section.kind === "tag");
    const lastTag = tagSections.at(-1);
    if (lastTag) {
      contextSuggestions.push(
        ...(options.tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean)
          .filter((tag) => !selectedTagKeys.has(normalizedMatchText(tag)))
          .slice(0, 6)
          .map((tag) => ({
            kind: "tag" as const,
            label: tag,
            detail: "add occurrence tag",
            insertText: `|${quoteComposerName(tag)}`,
            replaceRange: Object.freeze({ start: lastTag.end, end: lastTag.end }),
          })),
      );
    }
  }
  return uniqueSuggestions(contextSuggestions);
}

export function composerCompletionSuffix(
  input: string,
  suggestion: ComposerSuggestion | null | undefined,
): string {
  if (!suggestion) return "";
  const trimmed = input.trimEnd();
  const inputParts = trimmed.split(/\s+/);
  for (const candidate of [suggestion.label, suggestion.insertText]) {
    const candidateLower = candidate.toLocaleLowerCase();
    for (let start = 0; start < inputParts.length; start += 1) {
      const fragment = inputParts
        .slice(start)
        .join(" ")
        .replace(/^[@"'([]+/, "");
      if (!fragment) continue;
      if (candidateLower.startsWith(fragment.toLocaleLowerCase())) {
        return candidate.slice(fragment.length);
      }
    }
  }
  return "";
}

export function replaceComposerTail(
  input: string,
  insertText: string,
  stage: OccurrenceComposerStage,
): string {
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
  if (stage === "predicate" || stage === "object") {
    // At these parser stages there is no predicate/object token yet. Explicit suggestion
    // acceptance must append the next grammar component instead of reconstructing or
    // trimming the already-accepted prefix (which can contain quoted/multi-word entities
    // or canonical @ids).
    return `${trimmed}${trimmed ? " " : ""}${insertText} `;
  }
  const separator = trimmed ? " " : "";
  return `${trimmed}${separator}${insertText} `;
}

export interface ComposerSuggestionApplication {
  readonly value: string;
  readonly cursorOffset: number;
}

export function acceptComposerSuggestion(
  input: string,
  suggestion: ComposerSuggestion,
  stage: OccurrenceComposerStage,
): ComposerSuggestionApplication {
  if (!suggestion.insertText) {
    return Object.freeze({ value: input, cursorOffset: input.length });
  }

  const range = suggestion.replaceRange;
  if (!range) {
    const value = replaceComposerTail(input, suggestion.insertText, stage);
    return Object.freeze({ value, cursorOffset: value.length });
  }

  const before = input.slice(0, range.start);
  const after = input.slice(range.end);
  const terminalGrammarSuggestion =
    range.end === input.length &&
    (suggestion.kind === "entity" ||
      suggestion.kind === "predicate" ||
      suggestion.kind === "place" ||
      suggestion.kind === "time");
  const separator =
    terminalGrammarSuggestion && !suggestion.insertText.endsWith(" ") ? " " : "";
  const value = `${before}${suggestion.insertText}${separator}${after}`;
  return Object.freeze({
    value,
    cursorOffset: range.start + suggestion.insertText.length + separator.length,
  });
}
