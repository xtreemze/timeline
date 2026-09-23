/**
 * Timeline interchange adapter
 * Converts external data formats (JSON interchange, XML) to/from Timeline format
 * Vendor-neutral import/export with extension preservation
 */

const FORMAT = "timeline.interchange";
const SCHEMA_VERSION = 1;
const MAX_PRESERVED_RECORD_CHARS = 64_000;
const DEFAULT_COLOR = "#667085";
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function cloneJson(value: unknown): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function boundedClone(value: unknown): unknown {
  const cloned = cloneJson(value);
  if (cloned === undefined || cloned === null) return cloned;
  const serialized = JSON.stringify(cloned);
  if (serialized.length <= MAX_PRESERVED_RECORD_CHARS) return cloned;
  return {
    truncated: true,
    originalKeys: cloned && typeof cloned === "object" ? Object.keys(cloned).slice(0, 100) : [],
  };
}


function clonedArray(value: unknown): unknown[] {
  const cloned = boundedClone(value);
  return Array.isArray(cloned) ? cloned : [];
}

function clonedRecord(value: unknown): Record<string, unknown> {
  const cloned = boundedClone(value);
  return cloned && typeof cloned === "object" && !Array.isArray(cloned)
    ? (cloned as Record<string, unknown>)
    : {};
}

function firstDefined(object: unknown, keys: string[]): unknown {
  if (!object || typeof object !== "object") return undefined;
  for (const key of keys) {
    const value = (object as any)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function firstArray(object: unknown, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray((object as any)?.[key])) return (object as any)[key];
  }
  return [];
}

function text(value: unknown, max: number = 2000): string {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function safeToken(value: unknown, fallback: string): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized || fallback;
}

function normalizeColor(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return COLOR_PATTERN.test(candidate) ? candidate.toLowerCase() : DEFAULT_COLOR;
}

function pad(value: unknown, width: number = 2): string {
  return String(value).padStart(width, "0");
}

function canonicalDateFromDate(date: Date, includeTime: boolean = true): string | null {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const day = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  if (!includeTime) return day;
  return `${day}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function normalizeTemporalValue(value: unknown, warnings: string[], fieldName: string): string | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 100_000_000_000 ? value * 1000 : value;
    const date = new Date(milliseconds);
    const canonical = canonicalDateFromDate(date, true);
    if (!canonical) return null;
    warnings.push(`${fieldName} numeric timestamp was normalized to UTC minute precision.`);
    return canonical;
  }

  if (typeof value === "object") {
    const year = Number(firstDefined(value, ["year", "y"]));
    const month = Number(firstDefined(value, ["month", "m"]));
    const day = Number(firstDefined(value, ["day", "date", "d"]));
    if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
      const hourRaw = firstDefined(value, ["hour", "hours", "h"]);
      const minuteRaw = firstDefined(value, ["minute", "minutes", "min"]);
      const hour = hourRaw === undefined ? null : Number(hourRaw);
      const minute = minuteRaw === undefined ? 0 : Number(minuteRaw);
      const date = new Date(Date.UTC(year, month - 1, day, hour ?? 0, minute));
      if (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      ) {
        return canonicalDateFromDate(date, hour !== null);
      }
    }
    const nested = firstDefined(value, ["value", "iso", "dateTime", "datetime", "timestamp"]);
    if (nested !== undefined && nested !== value)
      return normalizeTemporalValue(nested, warnings, fieldName);
    return null;
  }

  const source = String(value).trim();
  const simple = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(source);
  if (simple) {
    const canonical = `${simple[1]}-${simple[2]}-${simple[3]}${simple[4] ? `T${simple[4]}:${simple[5]}` : ""}`;
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(source) || /:\d{2}(?:[.,]\d+)?/.test(source.slice(10))) {
      warnings.push(
        `${fieldName} contained timezone/second precision; Timeline v2 keeps minute precision while preserving the source record.`,
      );
    }
    return canonical;
  }

  const timestamp = Date.parse(source);
  if (Number.isFinite(timestamp)) {
    warnings.push(
      `${fieldName} was parsed from a non-canonical interchange date and normalized to UTC minute precision.`,
    );
    return canonicalDateFromDate(new Date(timestamp), true);
  }
  return null;
}

function sourceRoot(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as any;
  if (obj.timeline && typeof obj.timeline === "object") return obj.timeline;
  if (obj.data?.timeline && typeof obj.data.timeline === "object") return obj.data.timeline;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) return obj.data;
  if (obj.project && typeof obj.project === "object") return obj.project;
  return obj;
}

function extractGroupReference(raw: unknown): unknown {
  const direct = firstDefined(raw, [
    "groupId",
    "group_id",
    "categoryId",
    "category_id",
    "group",
    "category",
    "tag",
  ]);
  if (direct && typeof direct === "object")
    return firstDefined(direct, ["id", "name", "title", "label"]);
  if (direct !== undefined) return direct;
  const tags = firstArray(raw, ["groups", "categories", "tags"]);
  const first = tags[0];
  return first && typeof first === "object"
    ? firstDefined(first, ["id", "name", "title", "label"])
    : first;
}

interface PreservedFields {
  sourceType: string;
  sourceId: string | null;
  media: unknown;
  comments: unknown;
  statistics: unknown;
  raw: unknown;
}

function collectPreservedFields(
  raw: unknown,
  sourceType: string,
  sourceId: unknown,
): PreservedFields {
  const media = firstArray(raw, ["media", "attachments", "images", "videos", "links"]);
  const comments = firstArray(raw, ["comments", "notes"]);
  const statistics = firstDefined(raw, ["statistics", "stats", "chart", "series"]);
  return {
    sourceType,
    sourceId: sourceId === undefined || sourceId === null ? null : String(sourceId),
    media: boundedClone(media),
    comments: boundedClone(comments),
    statistics: boundedClone(statistics),
    raw: boundedClone(raw),
  };
}

interface TimelineItem {
  id: string;
  kind: "event" | "range";
  start: string;
  end: string | null;
  title: string;
  description: string;
  categoryId: string;
  extensions: {
    externalInterchange: PreservedFields;
  };
  media?: unknown;
  tags?: unknown;
  location?: unknown;
  time?: unknown;
  presentation?: unknown;
  relationChanges?: unknown;
  evidenceIds?: unknown;
}

function extractItem(
  raw: unknown,
  sourceType: string,
  index: number,
  categoryFor: (ref: unknown, raw: unknown) => string,
  warnings: string[],
): TimelineItem | null {
  if (!raw || typeof raw !== "object") {
    warnings.push(`Ignored ${sourceType} ${index + 1}: expected an object.`);
    return null;
  }

  const startRaw = firstDefined(raw, [
    "start",
    "startDate",
    "start_date",
    "date",
    "datetime",
    "dateTime",
    "time",
    "timestamp",
    "from",
  ]);
  const endRaw = firstDefined(raw, ["end", "endDate", "end_date", "to", "finish", "finishDate"]);
  const start = normalizeTemporalValue(startRaw, warnings, `${sourceType} ${index + 1} start`);
  const end = normalizeTemporalValue(endRaw, warnings, `${sourceType} ${index + 1} end`);
  const kind = sourceType === "period" || end ? "range" : "event";

  if (!start) {
    warnings.push(`Ignored ${sourceType} ${index + 1}: no supported start date was found.`);
    return null;
  }
  if (kind === "range" && !end) {
    warnings.push(`Ignored period ${index + 1}: no supported end date was found.`);
    return null;
  }

  const sourceId = firstDefined(raw, ["id", "_id", "uid", "eventId", "periodId", "key"]);
  const fallbackId = `${sourceType}-${index + 1}`;
  const id = `ext-${safeToken(sourceId, fallbackId)}`;
  const title =
    text(firstDefined(raw, ["title", "name", "label", "text", "caption"]), 160) ||
    `Untitled ${sourceType}`;
  const description = text(
    firstDefined(raw, ["description", "content", "details", "body", "note", "notes"]),
    2000,
  );
  const categoryId = categoryFor(extractGroupReference(raw), raw);

  const item: TimelineItem = {
    id,
    kind,
    start,
    end: kind === "range" ? (end as string) : null,
    title,
    description,
    categoryId,
    extensions: {
      externalInterchange: collectPreservedFields(raw, sourceType, sourceId),
    },
  };
  const rawObj = raw as any;
  if (Array.isArray(rawObj.media)) item.media = boundedClone(rawObj.media);
  if (Array.isArray(rawObj.tags)) item.tags = boundedClone(rawObj.tags);
  if (rawObj.location && typeof rawObj.location === "object")
    item.location = boundedClone(rawObj.location);
  if (rawObj.time && typeof rawObj.time === "object") item.time = boundedClone(rawObj.time);
  if (rawObj.presentation && typeof rawObj.presentation === "object")
    item.presentation = boundedClone(rawObj.presentation);
  if (Array.isArray(rawObj.relationChanges))
    item.relationChanges = boundedClone(rawObj.relationChanges);
  if (Array.isArray(rawObj.evidenceIds)) item.evidenceIds = boundedClone(rawObj.evidenceIds);
  return item;
}

interface ImportResult {
  timeline: {
    version: number;
    title: string;
    categories: unknown[];
    items: TimelineItem[];
    stories: unknown[];
    entities: unknown[];
    places: unknown[];
    relationships: unknown[];
    evidence: unknown[];
    reasoning: Record<string, unknown>;
    extensions: {
      externalInterchange: Record<string, unknown>;
    };
  };
  warnings: string[];
  source: {
    format: string;
    schemaVersion: number;
    eventCount: number;
    periodCount: number;
    groupCount: number;
  };
}

function importObject(payload: unknown): ImportResult {
  const warnings: string[] = [];
  const root = sourceRoot(payload);
  const rawGroups = firstArray(root, ["groups", "categories", "tags"]);
  const categories: any[] = [];
  const groupMap = new Map<string, string>();
  const usedCategoryIds = new Set<string>();

  const addCategory = (reference: unknown, raw: Record<string, unknown> = {}): string => {
    const sourceId =
      reference ?? firstDefined(raw, ["id", "_id", "uid", "name", "title", "label"]);
    const sourceName = firstDefined(raw, ["name", "title", "label"]) ?? sourceId ?? "Interchange";
    let id = `ext-group-${safeToken(sourceId, safeToken(sourceName, String(categories.length + 1)))}`;
    let suffix = 2;
    const baseId = id;
    while (usedCategoryIds.has(id)) id = `${baseId}-${suffix++}`;
    const category = {
      id,
      name: text(String(sourceName), 60) || "Interchange",
      color: normalizeColor(firstDefined(raw, ["color", "backgroundColor", "background_color", "hex"])),
      extensions: {
        externalInterchange: {
          sourceId: sourceId === undefined || sourceId === null ? null : String(sourceId),
          raw: boundedClone(raw),
        },
      },
    };
    categories.push(category);
    usedCategoryIds.add(id);
    for (const key of [sourceId, sourceName]) {
      if (key !== undefined && key !== null && String(key).trim()) groupMap.set(String(key), id);
    }
    return id;
  };

  rawGroups.forEach((raw, index) => {
    if (raw && typeof raw === "object")
      addCategory(firstDefined(raw, ["id", "_id", "uid", "name", "title"]), raw as any);
    else addCategory(raw, { id: String(raw), name: String(raw) || `Group ${index + 1}` });
  });

  const categoryFor = (reference: unknown, raw: unknown): string => {
    if (reference !== undefined && reference !== null && groupMap.has(String(reference))) {
      return groupMap.get(String(reference))!;
    }
    if (reference !== undefined && reference !== null && String(reference).trim()) {
      return addCategory(reference, {
        id: String(reference),
        name: typeof reference === "string" ? reference : `Group ${categories.length + 1}`,
        color: String(firstDefined(raw, ["color", "backgroundColor", "background_color"]) ?? ""),
      });
    }
    if (!categories.length)
      addCategory("default", { id: "default", name: "Interchange", color: DEFAULT_COLOR });
    return categories[0].id;
  };

  const events = [...firstArray(root, ["events", "points", "milestones", "dates"])];
  const periods = [...firstArray(root, ["periods", "ranges", "intervals", "eras"])];
  const genericItems = firstArray(root, ["items", "entries"]);

  for (const raw of genericItems) {
    const type = text(firstDefined(raw, ["kind", "type", "itemType"]), 40).toLowerCase();
    const hasEnd = firstDefined(raw, ["end", "endDate", "end_date", "to", "finish"]) !== undefined;
    if (hasEnd || /period|range|interval|era/.test(type)) periods.push(raw);
    else events.push(raw);
  }

  const items: TimelineItem[] = [];
  events.forEach((raw, index) => {
    const item = extractItem(raw, "event", index, categoryFor, warnings);
    if (item) items.push(item);
  });
  periods.forEach((raw, index) => {
    const item = extractItem(raw, "period", index, categoryFor, warnings);
    if (item) items.push(item);
  });

  if (!items.length) {
    throw new Error("No interchange events or periods with supported dates were found.");
  }

  const sourceTitle = text(
    firstDefined(root, ["title", "name", "timelineTitle", "timeline_name"]),
    120,
  );
  const rootExtensions: Record<string, unknown> = {
    sourceId: firstDefined(root, ["id", "_id", "uid", "timelineId"]),
    description: text(firstDefined(root, ["description", "summary", "about"]), 4000),
    background: boundedClone(
      firstDefined(root, ["background", "backgroundImage", "background_image", "cover"]),
    ),
    rawMetadata: boundedClone(firstDefined(root, ["metadata", "settings", "config", "options"])),
  };

  const timelineMetadata =
    (payload as any)?._timeline && typeof (payload as any)._timeline === "object"
      ? (payload as any)._timeline
      : {};

  return {
    timeline: {
      version: 2,
      title: sourceTitle,
      categories,
      items,
      stories: Array.isArray(timelineMetadata.stories) ? clonedArray(timelineMetadata.stories) : [],
      entities: Array.isArray(timelineMetadata.entities)
        ? clonedArray(timelineMetadata.entities)
        : [],
      places: Array.isArray(timelineMetadata.places) ? clonedArray(timelineMetadata.places) : [],
      relationships: Array.isArray(timelineMetadata.relationships)
        ? clonedArray(timelineMetadata.relationships)
        : [],
      evidence: Array.isArray(timelineMetadata.evidence)
        ? clonedArray(timelineMetadata.evidence)
        : [],
      reasoning:
        timelineMetadata.reasoning && typeof timelineMetadata.reasoning === "object"
          ? clonedRecord(timelineMetadata.reasoning)
          : {},
      extensions: {
        externalInterchange: rootExtensions,
      },
    },
    warnings,
    source: {
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      eventCount: events.length,
      periodCount: periods.length,
      groupCount: categories.length,
    },
  };
}

function xmlText(node: any, names: string[]): string | undefined {
  for (const name of names) {
    const attribute = node.getAttribute?.(name);
    if (attribute !== null && attribute !== undefined && attribute !== "") return attribute;
    const child = (Array.from(node.children || []) as Element[]).find(
      (candidate) => candidate.localName?.toLowerCase() === name.toLowerCase(),
    );
    if (child?.textContent?.trim()) return child.textContent.trim();
  }
  return undefined;
}

interface XmlRecord {
  id?: string;
  type: string;
  title?: string;
  description?: string;
  date?: string;
  start?: string;
  end?: string;
  group?: string;
  color?: string;
}

function xmlRecord(node: any, kind: string): XmlRecord {
  return {
    id: xmlText(node, ["id", "uid", "key"]),
    type: kind,
    title: xmlText(node, ["title", "name", "label", "text"]),
    description: xmlText(node, ["description", "content", "details", "note"]),
    date: xmlText(node, ["date", "datetime", "time", "timestamp"]),
    start: xmlText(node, ["start", "startDate", "from"]),
    end: xmlText(node, ["end", "endDate", "to", "finish"]),
    group: xmlText(node, ["group", "groupId", "category", "categoryId", "tag"]),
    color: xmlText(node, ["color", "backgroundColor"]),
  };
}

interface ParsedXml {
  title?: string;
  description?: string;
  events: XmlRecord[];
  periods: XmlRecord[];
  groups: any[];
}

function parseXml(xml: string): ParsedXml {
  if (typeof DOMParser !== "function")
    throw new Error("XML import requires the browser DOMParser API.");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror"))
    throw new Error("The external XML file is not well formed.");

  const root = document.documentElement;
  const lowerName = (node: any) => node.localName?.toLowerCase() || "";
  const all = Array.from(root.querySelectorAll("*"));
  const events = all
    .filter((node: any) => ["event", "point", "milestone"].includes(lowerName(node)))
    .map((node: any) => xmlRecord(node, "event"));
  const periods = all
    .filter((node: any) => ["period", "range", "interval", "era"].includes(lowerName(node)))
    .map((node: any) => xmlRecord(node, "period"));
  const groups = all
    .filter((node: any) => ["group", "category", "tag"].includes(lowerName(node)))
    .map((node: any) => ({
      id: xmlText(node, ["id", "uid", "key"]) || node.textContent?.trim(),
      name: xmlText(node, ["name", "title", "label"]) || node.textContent?.trim(),
      color: xmlText(node, ["color", "backgroundColor"]),
    }));

  return {
    title: xmlText(root, ["title", "name"]),
    description: xmlText(root, ["description", "summary"]),
    events,
    periods,
    groups,
  };
}

export function importData(input: unknown): ImportResult {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) throw new Error("The interchange input is empty.");
    if (trimmed.startsWith("<")) return importObject(parseXml(trimmed));
    return importObject(JSON.parse(trimmed));
  }
  return importObject(input);
}

export function isLikelyInterchange(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const root = sourceRoot(input);
  const format = text(
    firstDefined((input as any)?._timeline || input, ["format", "source", "application"]),
    80,
  ).toLowerCase();
  if (/timeline[._ -]?interchange/.test(format)) return true;
  return (
    Array.isArray(root.periods) ||
    Array.isArray(root.groups) ||
    Array.isArray(root.statistics) ||
    Array.isArray(root.attachments)
  );
}

function sourceExtension(record: any): Record<string, unknown> {
  return record?.extensions?.externalInterchange &&
    typeof record.extensions.externalInterchange === "object"
    ? record.extensions.externalInterchange
    : {};
}

interface ExportItem {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string;
  group: string;
  start?: string;
  end?: string;
  date?: string;
}

interface ExportCategory {
  id: string;
  name?: string;
  color?: string;
  extensions?: {
    externalInterchange?: {
      sourceId?: unknown;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

function exportItem(item: any, categoriesById: Map<string, ExportCategory>): ExportItem {
  const extension = sourceExtension(item);
  const raw =
    extension.raw && typeof extension.raw === "object" && !Array.isArray(extension.raw)
      ? cloneJson(extension.raw)
      : {};
  const category = categoriesById.get(item.categoryId);
  const base: ExportItem = {
    ...(raw as any),
    id: extension.sourceId ?? item.id,
    title: item.title,
    description: item.description || "",
    group:
      category?.extensions?.externalInterchange?.sourceId ?? category?.name ?? item.categoryId,
  };
  if (item.time) base.time = cloneJson(item.time);
  if (item.location) base.location = cloneJson(item.location);
  if (item.tags?.length) base.tags = cloneJson(item.tags);
  if (item.presentation) base.presentation = cloneJson(item.presentation);
  if (item.relationChanges?.length) base.relationChanges = cloneJson(item.relationChanges);
  if (item.evidenceIds?.length) base.evidenceIds = cloneJson(item.evidenceIds);

  if (item.media?.length) {
    base.media = item.media.map((entry: any) => ({
      url: entry.src,
      alt: entry.alt || "",
      caption: entry.caption || "",
    }));
  } else if ((extension as any).media?.length) {
    base.media = cloneJson((extension as any).media);
  }
  if ((extension as any).comments?.length) base.comments = cloneJson((extension as any).comments);
  if ((extension as any).statistics !== undefined && (extension as any).statistics !== null)
    base.statistics = cloneJson((extension as any).statistics);

  if (item.kind === "range") {
    base.start = item.start;
    base.end = item.end;
    delete base.date;
  } else {
    base.date = item.start;
    delete base.start;
    delete base.end;
  }
  return base;
}

interface ExportResult {
  title: string;
  groups: any[];
  events: ExportItem[];
  periods: ExportItem[];
  _timeline: {
    format: string;
    schemaVersion: number;
    generatedBy: string;
    canonicalVersion: number;
    stories: unknown;
    entities: unknown;
    places: unknown;
    relationships: unknown;
    evidence: unknown;
    reasoning: unknown;
    note: string;
  };
}

export function exportData(timeline: any): ExportResult {
  if (!timeline || typeof timeline !== "object") throw new Error("Expected a Timeline document.");
  const categories: ExportCategory[] = Array.isArray(timeline.categories)
    ? timeline.categories
    : [];
  const items = Array.isArray(timeline.items) ? timeline.items : [];
  const categoriesById = new Map<string, ExportCategory>(
    categories.map((category): [string, ExportCategory] => [
      String(category.id),
      category,
    ]),
  );

  const groups = categories.map((category) => {
    const extension = sourceExtension(category);
    const raw =
      extension.raw && typeof extension.raw === "object" && !Array.isArray(extension.raw)
        ? clonedRecord(extension.raw)
        : {};
    return {
      ...raw,
      id: extension.sourceId ?? category.id,
      name: category.name,
      color: category.color,
    };
  });

  const events: ExportItem[] = [];
  const periods: ExportItem[] = [];
  for (const item of items) {
    const converted = exportItem(item, categoriesById);
    if (item.kind === "range") periods.push(converted);
    else events.push(converted);
  }

  return {
    title: text(timeline.title, 120),
    groups,
    events,
    periods,
    _timeline: {
      format: "timeline-interchange",
      schemaVersion: SCHEMA_VERSION,
      generatedBy: "xtreemze/timeline",
      canonicalVersion: Number(timeline.version) || 2,
      stories: cloneJson(Array.isArray(timeline.stories) ? timeline.stories : []),
      entities: cloneJson(Array.isArray(timeline.entities) ? timeline.entities : []),
      places: cloneJson(Array.isArray(timeline.places) ? timeline.places : []),
      relationships: cloneJson(
        Array.isArray(timeline.relationships) ? timeline.relationships : [],
      ),
      evidence: cloneJson(Array.isArray(timeline.evidence) ? timeline.evidence : []),
      reasoning: cloneJson(
        timeline.reasoning && typeof timeline.reasoning === "object" ? timeline.reasoning : {},
      ),
      note: "Timeline interchange keeps external event, period, group, story, entity, reusable place, relationship, evidence, and analytical reasoning metadata behind a vendor-neutral adapter and preserves imported extension records when available. PDF blobs remain browser-local and are not embedded in interchange JSON.",
    },
  };
}

// Export public API as frozen object for backward compatibility
const TimelineInterchangeAdapterObj = {
  FORMAT,
  SCHEMA_VERSION,
  importData,
  exportData,
  isLikelyInterchange,
} as const;

export const TimelineInterchangeAdapter = Object.freeze(TimelineInterchangeAdapterObj);
