import {
  suggestSemanticIcon,
  suggestSemanticIconForPlace,
} from "../src/presentation/semantic-icon-inference.ts";
import { SEMANTIC_ICON_NAMES, type SemanticIconName } from "../src/presentation/semantic-icons.ts";

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
  /** First selected category retained for compatibility with singular consumers. */
  readonly category?: string;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
}

export interface OccurrenceInvestigativeQualifier {
  readonly id: string;
  readonly section: ComposerEditableSectionKind | "sentence";
  readonly start: number;
  readonly end: number;
  readonly operatorIndex: number;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly scope: "section" | "sentence" | "ambiguous";
}

export interface OccurrenceInvestigationProjection {
  readonly qualifiers: readonly OccurrenceInvestigativeQualifier[];
  readonly sentenceQuestion: boolean;
  readonly hasAmbiguity: boolean;
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
  readonly investigation: OccurrenceInvestigationProjection;
}

export interface ComposerEntityOption {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly icon?: string;
  readonly alternateNames?: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly sourceIds?: readonly string[];
}

export interface ComposerPredicateOption {
  readonly name: string;
  readonly icon?: string;
  readonly color?: string;
}

export interface ComposerTagOption {
  readonly label: string;
  readonly icon?: string;
  readonly color?: string;
}

export interface ComposerPlaceOption {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly longitude?: number;
  readonly latitude?: number;
}

export interface ComposerCategoryOption {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  readonly icon?: string;
}

export interface ComposerSuggestion {
  readonly kind: "entity" | "predicate" | "place" | "time" | "property" | "category" | "tag";
  readonly label: string;
  readonly detail?: string;
  readonly icon?: string;
  readonly color?: string;
  readonly insertText: string;
  readonly replaceRange?: Readonly<{ start: number; end: number }>;
  readonly multiSelect?: boolean;
  readonly selected?: boolean;
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

export function normalizeComposerSemanticColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
  const hsl = color.match(/^hsl\(\s*(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%\s*\)$/i);
  if (!hsl) return undefined;
  const hue = Number(hsl[1]);
  const saturation = Number(hsl[2]);
  const lightness = Number(hsl[3]);
  if (hue > 360 || saturation > 100 || lightness > 100) return undefined;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function composerEntityColor(entity: ComposerEntityOption): string | undefined {
  const attributes = entity.attributes;
  const style =
    attributes?.["style"] && typeof attributes["style"] === "object"
      ? (attributes["style"] as Readonly<Record<string, unknown>>)
      : attributes;
  return normalizeComposerSemanticColor(
    style?.["color"] ?? style?.["fill"] ?? style?.["fillColor"] ?? style?.["border"],
  );
}

function normalizePredicateOption(
  predicate: string | ComposerPredicateOption,
): ComposerPredicateOption | null {
  if (typeof predicate === "string") {
    const name = predicate.trim();
    return name ? Object.freeze({ name, icon: actionIconHint(name) }) : null;
  }
  const name = predicate.name.trim();
  if (!name) return null;
  return Object.freeze({
    name,
    icon: predicate.icon || actionIconHint(name),
    ...(normalizeComposerSemanticColor(predicate.color)
      ? { color: normalizeComposerSemanticColor(predicate.color) }
      : {}),
  });
}

function normalizeTagOption(tag: string | ComposerTagOption): ComposerTagOption | null {
  if (typeof tag === "string") {
    const label = tag.trim();
    return label ? Object.freeze({ label }) : null;
  }
  const label = tag.label.trim();
  if (!label) return null;
  const color = normalizeComposerSemanticColor(tag.color);
  return Object.freeze({
    label,
    ...(tag.icon ? { icon: tag.icon } : {}),
    ...(color ? { color } : {}),
  });
}

function availableActions(
  projectPredicates: readonly (string | ComposerPredicateOption)[] = [],
): readonly ComposerPredicateOption[] {
  const actions = new Map<string, ComposerPredicateOption>();
  for (const name of ACTION_SUGGESTIONS) {
    actions.set(name.toLocaleLowerCase(), Object.freeze({ name, icon: actionIconHint(name) }));
  }
  for (const raw of projectPredicates) {
    const option = normalizePredicateOption(raw);
    if (!option) continue;
    const key = option.name.toLocaleLowerCase();
    const previous = actions.get(key);
    actions.set(
      key,
      Object.freeze({
        name: option.name,
        icon: option.icon ?? previous?.icon ?? actionIconHint(option.name),
        ...((option.color ?? previous?.color) ? { color: option.color ?? previous?.color } : {}),
      }),
    );
  }
  return Object.freeze([...actions.values()]);
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
  if (/^[^\s()[\]"]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function composerDelimitedSpans(
  value: string,
  delimiter: string,
): readonly Readonly<{ text: string; start: number; end: number }>[] {
  const segments: Array<Readonly<{ text: string; start: number; end: number }>> = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  const push = (end: number) => {
    segments.push(Object.freeze({ text: value.slice(start, end), start, end }));
  };
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === delimiter) {
      push(index);
      start = index + 1;
    }
  }
  push(value.length);
  return Object.freeze(segments);
}

function splitComposerDelimited(value: string, delimiter: string): readonly string[] {
  return Object.freeze(composerDelimitedSpans(value, delimiter).map((segment) => segment.text));
}

function composerPropertyEntries(
  value: string,
): readonly Readonly<{ key: string; rawValue: string; valueStart: number }>[] {
  const entries: Array<Readonly<{ key: string; rawValue: string; valueStart: number }>> = [];
  for (const segment of composerDelimitedSpans(value, ",")) {
    const separator = segment.text.indexOf(":");
    if (separator < 1) continue;
    const key = segment.text.slice(0, separator).trim();
    const rawTail = segment.text.slice(separator + 1);
    const leading = rawTail.length - rawTail.trimStart().length;
    const rawValue = rawTail.trim();
    if (!key || !rawValue) continue;
    entries.push(
      Object.freeze({
        key,
        rawValue,
        valueStart: segment.start + separator + 1 + leading,
      }),
    );
  }
  return Object.freeze(entries);
}

function composerListValues(value: string): readonly string[] {
  return Object.freeze(
    splitComposerDelimited(value, "|")
      .map((entry) => unquote(entry))
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function composerListSyntax(values: readonly string[]): string {
  return values
    .map((value) => {
      const trimmed = value.trim();
      if (/[|,]/.test(trimmed)) {
        return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      }
      return quoteComposerName(trimmed);
    })
    .join("|");
}

export interface OccurrenceCompositionInput {
  readonly subjectId: string;
  readonly predicate: string;
  readonly objectId: string;
  readonly placeId?: string | null;
  readonly start?: string | null;
  readonly end?: string | null;
  readonly category?: string | null;
  readonly categories?: readonly string[];
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
  const categories = [
    ...new Set(
      (input.categories ?? (input.category ? [input.category] : []))
        .map((category) => category.trim())
        .filter(Boolean),
    ),
  ];
  if (categories.length) {
    options.push(
      `${categories.length > 1 ? "categories" : "category"}: ${composerListSyntax(categories)}`,
    );
  }
  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length) options.push(`tags: ${composerListSyntax(tags)}`);
  if (options.length) sentence += ` [${options.join(", ")}]`;
  return sentence;
}

function parseProperties(value: string): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(composerPropertyEntries(value).map((entry) => [entry.key, entry.rawValue])),
  );
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
    const match = source.match(/^([^\s()[\]]+)/);
    if (!match) return { entity: null, rest: source };
    name = match[1] ?? "";
    offset = match[0].length;
  }

  let rest = source.slice(offset).trimStart();
  let properties: Readonly<Record<string, string>> = Object.freeze({});
  if (rest.startsWith("(")) {
    const close = rest.indexOf(")");
    if (close < 0) return { entity: null, rest: source };
    properties = Object.freeze(
      Object.fromEntries(
        Object.entries(parseProperties(rest.slice(1, close))).map(([key, value]) => [
          key,
          unquote(value),
        ]),
      ),
    );
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
    return {
      source: trimmed,
      options: Object.freeze({ categories: Object.freeze([]), tags: Object.freeze([]) }),
      malformed: false,
    };
  }
  const open = trimmed.lastIndexOf("[");
  if (open < 0) {
    return {
      source: trimmed,
      options: Object.freeze({ categories: Object.freeze([]), tags: Object.freeze([]) }),
      malformed: true,
    };
  }
  const properties = parseProperties(trimmed.slice(open + 1, -1));
  const categories = composerListValues(properties.categories ?? properties.category ?? "");
  const tags = composerListValues(properties.tags ?? "");
  return {
    source: trimmed.slice(0, open).trimEnd(),
    options: Object.freeze({
      ...(categories[0] ? { category: categories[0] } : {}),
      categories,
      tags,
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
      time: Object.freeze({ kind: "range", start: range[1] ?? "", end: range[2] ?? "" }),
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
  const investigation = projectOccurrenceInvestigation(input);
  const sourceInput = stripInvestigativeOperators(input, investigation.qualifiers);
  const optionPass = stripOptions(sourceInput);
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
      investigation,
    });
  }

  const predicateMatch = subjectPass.rest.match(/^([^\s()[\]]+)/);
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
      investigation,
    });
  }

  const predicate = predicateMatch[1] ?? "";
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
      investigation,
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
    investigation,
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
  while (cursor < input.length && /\s/.test(input.charAt(cursor))) cursor += 1;
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
      const character = input.charAt(nameEnd);
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
    while (nameEnd < input.length && !/[\s()[\]]/.test(input.charAt(nameEnd))) nameEnd += 1;
  }
  if (nameEnd <= start) return null;

  let end = nameEnd;
  const propertyStart = skipSpaces(input, nameEnd);
  if (input[propertyStart] === "(") {
    const close = input.indexOf(")", propertyStart + 1);
    end = close >= 0 ? close + 1 : input.length;
  }
  if (input[end] === "?" && !questionMarkIsEscaped(input, end)) end += 1;

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
  while (end < input.length && !/[\s()[\]]/.test(input.charAt(end))) end += 1;
  return end > start ? { start, end, text: input.slice(start, end) } : null;
}

function trimRangeEnd(input: string, start: number, end: number): number {
  let cursor = Math.max(start, Math.min(input.length, end));
  while (cursor > start && /\s/.test(input.charAt(cursor - 1))) cursor -= 1;
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

  if (
    cursorWithinSpan(offset, subject.start, subject.end, input.length) ||
    (offset === semanticEnd(input, subject.start, subject.end) &&
      input[offset] === "?" &&
      !questionMarkIsEscaped(input, offset))
  ) {
    return Object.freeze({
      kind: "subject",
      start: subject.start,
      end: semanticEnd(input, subject.start, subject.end),
      text: subject.text.replace(/\?$/, ""),
    });
  }

  const predicate = readTokenSpan(input, subject.end);
  if (!predicate) return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });
  if (
    cursorWithinSpan(offset, predicate.start, predicate.end, input.length) ||
    (offset === semanticEnd(input, predicate.start, predicate.end) &&
      input[offset] === "?" &&
      !questionMarkIsEscaped(input, offset))
  ) {
    return Object.freeze({
      kind: "predicate",
      start: predicate.start,
      end: semanticEnd(input, predicate.start, predicate.end),
      text: sectionText(input, predicate.start, predicate.end),
    });
  }

  const object = readEntitySpan(input, predicate.end);
  if (!object) return Object.freeze({ kind: "tail", start: offset, end: offset, text: "" });
  if (
    cursorWithinSpan(offset, object.start, object.end, input.length) ||
    (offset === semanticEnd(input, object.start, object.end) &&
      input[offset] === "?" &&
      !questionMarkIsEscaped(input, offset))
  ) {
    return Object.freeze({
      kind: "object",
      start: object.start,
      end: semanticEnd(input, object.start, object.end),
      text: object.text.replace(/\?$/, ""),
    });
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
  while (valueStart < valueEnd && /\s/.test(input.charAt(valueStart))) valueStart += 1;
  while (valueEnd > valueStart && /\s/.test(input.charAt(valueEnd - 1))) valueEnd -= 1;
  return Object.freeze({ start: valueStart, end: valueEnd });
}

function composerDelimitedRanges(
  input: string,
  rawStart: number,
  rawValue: string,
): readonly Readonly<{ start: number; end: number; index: number }>[] {
  const ranges: Array<Readonly<{ start: number; end: number; index: number }>> = [];
  let segmentStart = 0;
  let quoted = false;
  let escaped = false;
  let itemIndex = 0;
  const push = (segmentEnd: number) => {
    const range = trimmedValueRange(input, rawStart + segmentStart, rawStart + segmentEnd);
    if (range.end > range.start) {
      ranges.push(Object.freeze({ ...range, index: itemIndex }));
      itemIndex += 1;
    }
  };
  for (let index = 0; index < rawValue.length; index += 1) {
    const character = rawValue.charAt(index);
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === "|") {
      push(index);
      segmentStart = index + 1;
    }
  }
  push(rawValue.length);
  return Object.freeze(ranges);
}

function questionMarkIsEscaped(input: string, index: number): boolean {
  if (index <= 0 || input[index] !== "?") return false;
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && input[cursor] === "\\"; cursor -= 1) slashCount += 1;
  return slashCount > 0;
}

function semanticEnd(input: string, start: number, end: number): number {
  if (end <= start) return end;
  const operatorIndex = end - 1;
  return input[operatorIndex] === "?" && !questionMarkIsEscaped(input, operatorIndex)
    ? operatorIndex
    : end;
}

function sectionText(input: string, start: number, end: number, unquoteValue = false): string {
  const value = input.slice(start, semanticEnd(input, start, end)).trim();
  return unquoteValue ? unquote(value) : value;
}

export function composerEditableSections(input: string): readonly ComposerEditableSection[] {
  const sections: ComposerEditableSection[] = [];
  const subject = readEntitySpan(input, 0);
  if (!subject) return Object.freeze(sections);
  sections.push(
    Object.freeze({
      kind: "subject",
      start: subject.start,
      end: semanticEnd(input, subject.start, subject.end),
      text: subject.text.replace(/\?$/, ""),
    }),
  );

  const predicate = readTokenSpan(input, subject.end);
  if (!predicate) return Object.freeze(sections);
  sections.push(
    Object.freeze({
      kind: "predicate",
      start: predicate.start,
      end: semanticEnd(input, predicate.start, predicate.end),
      text: sectionText(input, predicate.start, predicate.end),
    }),
  );

  const object = readEntitySpan(input, predicate.end);
  if (!object) return Object.freeze(sections);
  sections.push(
    Object.freeze({
      kind: "object",
      start: object.start,
      end: semanticEnd(input, object.start, object.end),
      text: object.text.replace(/\?$/, ""),
    }),
  );

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
          end: semanticEnd(input, valueStart, valueEnd),
          text: sectionText(input, valueStart, valueEnd, true),
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
          end: semanticEnd(input, clauseStart, clauseEnd),
          text: sectionText(input, clauseStart, clauseEnd),
        }),
      );
    }
  }

  if (optionsStart >= 0) {
    const optionsClose = input.indexOf("]", optionsStart + 1);
    const bodyEnd = optionsClose >= 0 ? optionsClose : input.length;
    const body = input.slice(optionsStart + 1, bodyEnd);
    const optionEntries = composerPropertyEntries(body);
    const categoryEntry = optionEntries.find((entry) =>
      /^(?:category|categories)$/i.test(entry.key),
    );
    if (categoryEntry) {
      const rawStart = optionsStart + 1 + categoryEntry.valueStart;
      for (const range of composerDelimitedRanges(input, rawStart, categoryEntry.rawValue)) {
        sections.push(
          Object.freeze({
            kind: "category",
            start: range.start,
            end: semanticEnd(input, range.start, range.end),
            text: sectionText(input, range.start, range.end, true),
            index: range.index,
          }),
        );
      }
    }

    const tagsEntry = optionEntries.find((entry) => /^tags$/i.test(entry.key));
    if (tagsEntry) {
      const rawStart = optionsStart + 1 + tagsEntry.valueStart;
      for (const range of composerDelimitedRanges(input, rawStart, tagsEntry.rawValue)) {
        sections.push(
          Object.freeze({
            kind: "tag",
            start: range.start,
            end: semanticEnd(input, range.start, range.end),
            text: sectionText(input, range.start, range.end, true),
            index: range.index,
          }),
        );
      }
    }
  }

  return Object.freeze(sections);
}

export function projectOccurrenceInvestigation(input: string): OccurrenceInvestigationProjection {
  const qualifiers: OccurrenceInvestigativeQualifier[] = [];
  const sections = composerEditableSections(input);
  const claimedOperators = new Set<number>();

  for (const section of sections) {
    const operatorIndex = section.end;
    if (input[operatorIndex] !== "?" || questionMarkIsEscaped(input, operatorIndex)) {
      continue;
    }
    const end = operatorIndex + 1;
    const rawText = input.slice(section.start, end);
    const trimmedEnd = input.trimEnd().length;
    const scope =
      operatorIndex === trimmedEnd - 1 && ["place", "time"].includes(section.kind)
        ? "ambiguous"
        : "section";
    qualifiers.push(
      Object.freeze({
        id: `${section.kind}:${section.start}:${end}`,
        section: section.kind,
        start: section.start,
        end,
        operatorIndex,
        rawText,
        normalizedText: section.text,
        scope,
      }),
    );
    claimedOperators.add(operatorIndex);
  }

  const trimmedEnd = input.trimEnd().length;
  const finalOperator = trimmedEnd - 1;
  const detachedSentenceQuestion =
    finalOperator >= 0 &&
    input[finalOperator] === "?" &&
    !questionMarkIsEscaped(input, finalOperator) &&
    !claimedOperators.has(finalOperator) &&
    /\s/.test(input[finalOperator - 1] ?? "");
  if (detachedSentenceQuestion) {
    qualifiers.push(
      Object.freeze({
        id: `sentence:0:${input.length}`,
        section: "sentence",
        start: 0,
        end: input.length,
        operatorIndex: finalOperator,
        rawText: input,
        normalizedText: input.slice(0, finalOperator).trimEnd(),
        scope: "sentence",
      }),
    );
  }

  return Object.freeze({
    qualifiers: Object.freeze(qualifiers),
    sentenceQuestion: detachedSentenceQuestion,
    hasAmbiguity: qualifiers.some((qualifier) => qualifier.scope === "ambiguous"),
  });
}

function stripInvestigativeOperators(
  input: string,
  qualifiers: readonly OccurrenceInvestigativeQualifier[],
): string {
  const operators = [...new Set(qualifiers.map((qualifier) => qualifier.operatorIndex))].sort(
    (left, right) => right - left,
  );
  let result = input;
  for (const operatorIndex of operators) {
    result = result.slice(0, operatorIndex) + result.slice(operatorIndex + 1);
  }
  return result;
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
  return previous[right.length] ?? right.length;
}

function entityReferenceNeedsCanonicalId(
  entity: ComposerEntityOption,
  entities: readonly ComposerEntityOption[],
): boolean {
  const key = normalizedMatchText(entity.name);
  if (!key) return true;
  let matches = 0;
  for (const candidate of entities) {
    if (
      [candidate.name, ...(candidate.alternateNames ?? [])].some(
        (name) => normalizedMatchText(name) === key,
      )
    ) {
      matches += 1;
      if (matches > 1) return true;
    }
  }
  return false;
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
      const canonicalReferenceRequired = entityReferenceNeedsCanonicalId(entity, entities);
      return {
        kind: "entity" as const,
        label: entity.name,
        detail: canonicalReferenceRequired
          ? `nearest ${section.kind} · ${entity.type || "entity"} · ${entity.id}`
          : `nearest ${section.kind} · ${entity.type || "entity"}`,
        ...(entity.icon ? { icon: entity.icon } : {}),
        ...(composerEntityColor(entity) ? { color: composerEntityColor(entity) } : {}),
        insertText: canonicalReferenceRequired ? `@${entity.id}` : quoteComposerName(entity.name),
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
  projectPredicates: readonly (string | ComposerPredicateOption)[] = [],
): readonly ComposerSuggestion[] {
  return Object.freeze(
    [...availableActions(projectPredicates)]
      .sort(
        (left, right) =>
          nearestMatchScore(section.text, [left.name]) -
            nearestMatchScore(section.text, [right.name]) || left.name.localeCompare(right.name),
      )
      .slice(0, 8)
      .map((action) => ({
        kind: "predicate" as const,
        label: action.name,
        detail: "nearest action",
        icon: action.icon ?? actionIconHint(action.name),
        ...(action.color ? { color: action.color } : {}),
        insertText: action.name,
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
    readonly predicates?: readonly (string | ComposerPredicateOption)[];
    readonly tags?: readonly (string | ComposerTagOption)[];
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
          ...(iconValueActive ? { icon: property.replace(/^icon:\s*/, "") } : {}),
          insertText: property,
        })),
    );
  }

  if (/\[[^\]]*$/.test(prefix)) {
    const optionStart = prefix.lastIndexOf("[");
    const optionText = prefix.slice(optionStart + 1);
    const categoryMatch = optionText.match(/(?:^|,)\s*categor(?:y|ies)\s*:\s*([^,\]]*)$/i);
    const tagMatch = optionText.match(/(?:^|,)\s*tags\s*:\s*([^,\]]*)$/i);

    if (tagMatch) {
      const rawTags = tagMatch[1] ?? "";
      const selectedTags = composerListValues(rawTags);
      const selectedKeys = new Set(selectedTags.map(normalizedMatchText));
      const activeTag = normalizedMatchText(splitComposerDelimited(rawTags, "|").at(-1) ?? "");
      return uniqueSuggestions(
        (options.tags ?? [])
          .map(normalizeTagOption)
          .filter((tag): tag is ComposerTagOption => Boolean(tag))
          .filter(
            (tag) =>
              !activeTag ||
              selectedKeys.has(normalizedMatchText(tag.label)) ||
              normalizedMatchText(tag.label).includes(activeTag),
          )
          .slice(0, 10)
          .map((tag) => ({
            kind: "tag" as const,
            label: tag.label,
            detail: selectedKeys.has(normalizedMatchText(tag.label)) ? "selected tag" : "tag",
            ...(tag.icon ? { icon: tag.icon } : {}),
            ...(tag.color ? { color: tag.color } : {}),
            insertText: quoteComposerName(tag.label),
            multiSelect: true,
            selected: selectedKeys.has(normalizedMatchText(tag.label)),
          })),
      );
    }

    const rawCategories = categoryMatch?.[1] ?? "";
    const selectedCategories = composerListValues(rawCategories);
    const selectedKeys = new Set(selectedCategories.map(normalizedMatchText));
    const activeCategory = normalizedMatchText(
      splitComposerDelimited(rawCategories, "|").at(-1) ?? "",
    );
    const categorySuggestions = options.categories
      .filter(
        (category) =>
          !activeCategory ||
          selectedKeys.has(normalizedMatchText(category.name)) ||
          normalizedMatchText(category.name).includes(activeCategory),
      )
      .slice(0, 10)
      .map((category) => ({
        kind: "category" as const,
        label: category.name,
        detail: selectedKeys.has(normalizedMatchText(category.name))
          ? "selected category"
          : "category",
        ...(category.icon ? { icon: category.icon } : {}),
        ...(normalizeComposerSemanticColor(category.color)
          ? { color: normalizeComposerSemanticColor(category.color) }
          : {}),
        insertText: quoteComposerName(category.name),
        multiSelect: true,
        selected: selectedKeys.has(normalizedMatchText(category.name)),
      }));

    if (categoryMatch) return uniqueSuggestions(categorySuggestions);

    return uniqueSuggestions(categorySuggestions);
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
  if (
    (cursorSection.kind === "time" || editableSection?.kind === "time") &&
    options.timelineDefault
  ) {
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
        const canonicalReferenceRequired = entityReferenceNeedsCanonicalId(
          entity,
          options.entities,
        );
        return {
          kind: "entity" as const,
          label: entity.name,
          detail: canonicalReferenceRequired
            ? `${entity.type || "entity"} · ${entity.id}`
            : entity.type || "entity",
          ...(entity.icon ? { icon: entity.icon } : {}),
          insertText: canonicalReferenceRequired ? `@${entity.id}` : quoteComposerName(entity.name),
        };
      });
    return uniqueSuggestions(entitySuggestions);
  }

  if (parsed.stage === "predicate") {
    return Object.freeze(
      availableActions(options.predicates)
        .filter((action) => !token || action.name.toLocaleLowerCase().includes(token))
        .slice(0, 12)
        .map((action) => ({
          kind: "predicate" as const,
          label: action.name,
          detail: "action",
          icon: action.icon ?? actionIconHint(action.name),
          ...(action.color ? { color: action.color } : {}),
          insertText: action.name,
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
  const selectedCategoryKeys = new Set(parsed.options.categories.map(normalizedMatchText));
  contextSuggestions.push(
    ...options.categories.slice(0, 8).map((category) => ({
      kind: "category" as const,
      label: category.name,
      detail: selectedCategoryKeys.has(normalizedMatchText(category.name))
        ? "selected category"
        : "occurrence category",
      ...(category.icon ? { icon: category.icon } : {}),
      ...(normalizeComposerSemanticColor(category.color)
        ? { color: normalizeComposerSemanticColor(category.color) }
        : {}),
      insertText: quoteComposerName(category.name),
      multiSelect: true,
      selected: selectedCategoryKeys.has(normalizedMatchText(category.name)),
    })),
  );

  const selectedTagKeys = new Set(parsed.options.tags.map(normalizedMatchText));
  contextSuggestions.push(
    ...(options.tags ?? [])
      .map(normalizeTagOption)
      .filter((tag): tag is ComposerTagOption => Boolean(tag))
      .slice(0, 8)
      .map((tag) => ({
        kind: "tag" as const,
        label: tag.label,
        detail: selectedTagKeys.has(normalizedMatchText(tag.label))
          ? "selected tag"
          : "occurrence tag",
        ...(tag.icon ? { icon: tag.icon } : {}),
        ...(tag.color ? { color: tag.color } : {}),
        insertText: quoteComposerName(tag.label),
        multiSelect: true,
        selected: selectedTagKeys.has(normalizedMatchText(tag.label)),
      })),
  );
  return uniqueSuggestions(contextSuggestions);
}

function composerOptionSentence(
  input: string,
  categories: readonly string[],
  tags: readonly string[],
  options: { readonly includeEmptyTags?: boolean } = {},
): { readonly value: string; readonly categoryEnd: number; readonly tagEnd: number } {
  const open = input.lastIndexOf("[");
  const close = open >= 0 ? input.indexOf("]", open + 1) : -1;
  const base = (open >= 0 ? input.slice(0, open) : input).trimEnd();
  const parts: string[] = [];
  let categoryEnd = -1;
  let tagEnd = -1;
  const normalizedCategories = [
    ...new Set(categories.map((value) => value.trim()).filter(Boolean)),
  ];
  const normalizedTags = [...new Set(tags.map((value) => value.trim()).filter(Boolean))];

  if (normalizedCategories.length) {
    const key = normalizedCategories.length > 1 ? "categories" : "category";
    parts.push(`${key}: ${composerListSyntax(normalizedCategories)}`);
  }
  if (normalizedTags.length || options.includeEmptyTags) {
    parts.push(`tags: ${composerListSyntax(normalizedTags)}`);
  }

  if (!parts.length) {
    return Object.freeze({ value: base, categoryEnd: base.length, tagEnd: base.length });
  }

  const block = `[${parts.join(", ")}]`;
  const value = `${base}${base ? " " : ""}${block}`;
  const blockStart = value.lastIndexOf("[") + 1;
  const categoryPart = parts.find((part) => /^categor(?:y|ies):/i.test(part));
  const tagPart = parts.find((part) => /^tags:/i.test(part));
  if (categoryPart) {
    const offset = value.indexOf(categoryPart, blockStart);
    categoryEnd = offset + categoryPart.length;
  }
  if (tagPart) {
    const offset = value.indexOf(tagPart, blockStart);
    tagEnd = offset + tagPart.length;
  }

  // Preserve trailing non-option text only when a caller supplied it intentionally.
  // Canonical composer options are terminal, so text after a closed option block is discarded.
  void close;
  return Object.freeze({
    value,
    categoryEnd: categoryEnd >= 0 ? categoryEnd : value.length,
    tagEnd: tagEnd >= 0 ? tagEnd : value.length,
  });
}

export function toggleComposerMultiOption(
  input: string,
  kind: "category" | "tag",
  value: string,
): ComposerSuggestionApplication {
  const normalized = value.trim();
  if (!normalized) return Object.freeze({ value: input, cursorOffset: input.length });
  const parsed = parseOccurrenceSentence(input);
  const current = kind === "category" ? [...parsed.options.categories] : [...parsed.options.tags];
  const key = normalizedMatchText(normalized);
  const existingIndex = current.findIndex((entry) => normalizedMatchText(entry) === key);
  if (existingIndex >= 0) current.splice(existingIndex, 1);
  else current.push(normalized);

  const categories = kind === "category" ? current : [...parsed.options.categories];
  const tags = kind === "tag" ? current : [...parsed.options.tags];
  const result = composerOptionSentence(input, categories, tags);
  return Object.freeze({
    value: result.value,
    cursorOffset: kind === "category" ? result.categoryEnd : result.tagEnd,
  });
}

export function advanceComposerMultiOption(
  input: string,
  kind: "category" | "tag",
): ComposerSuggestionApplication {
  const parsed = parseOccurrenceSentence(input);
  if (kind === "category") {
    const result = composerOptionSentence(input, parsed.options.categories, parsed.options.tags, {
      includeEmptyTags: true,
    });
    return Object.freeze({ value: result.value, cursorOffset: result.tagEnd });
  }
  const result = composerOptionSentence(input, parsed.options.categories, parsed.options.tags);
  return Object.freeze({ value: result.value, cursorOffset: result.value.length });
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
  const separator = terminalGrammarSuggestion && !suggestion.insertText.endsWith(" ") ? " " : "";
  const value = `${before}${suggestion.insertText}${separator}${after}`;
  return Object.freeze({
    value,
    cursorOffset: range.start + suggestion.insertText.length + separator.length,
  });
}
