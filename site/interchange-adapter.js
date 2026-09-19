(() => {
  "use strict";

  const FORMAT = "timeline.interchange";
  const SCHEMA_VERSION = 1;
  const MAX_PRESERVED_RECORD_CHARS = 64_000;
  const DEFAULT_COLOR = "#667085";
  const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

  function cloneJson(value) {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  function boundedClone(value) {
    const cloned = cloneJson(value);
    if (cloned === undefined || cloned === null) return cloned;
    const serialized = JSON.stringify(cloned);
    if (serialized.length <= MAX_PRESERVED_RECORD_CHARS) return cloned;
    return {
      truncated: true,
      originalKeys: cloned && typeof cloned === "object" ? Object.keys(cloned).slice(0, 100) : []
    };
  }

  function firstDefined(object, keys) {
    if (!object || typeof object !== "object") return undefined;
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null && object[key] !== "") return object[key];
    }
    return undefined;
  }

  function firstArray(object, keys) {
    for (const key of keys) {
      if (Array.isArray(object?.[key])) return object[key];
    }
    return [];
  }

  function text(value, max = 2000) {
    if (value === undefined || value === null) return "";
    return String(value).trim().slice(0, max);
  }

  function safeToken(value, fallback) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    return normalized || fallback;
  }

  function normalizeColor(value) {
    const candidate = typeof value === "string" ? value.trim() : "";
    return COLOR_PATTERN.test(candidate) ? candidate.toLowerCase() : DEFAULT_COLOR;
  }

  function pad(value, width = 2) {
    return String(value).padStart(width, "0");
  }

  function canonicalDateFromDate(date, includeTime = true) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
    const day = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    if (!includeTime) return day;
    return `${day}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }

  function normalizeTemporalValue(value, warnings, fieldName) {
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
      if (nested !== undefined && nested !== value) return normalizeTemporalValue(nested, warnings, fieldName);
      return null;
    }

    const source = String(value).trim();
    const simple = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(source);
    if (simple) {
      const canonical = `${simple[1]}-${simple[2]}-${simple[3]}${simple[4] ? `T${simple[4]}:${simple[5]}` : ""}`;
      if (
        /(?:Z|[+-]\d{2}:?\d{2})$/i.test(source) ||
        /:\d{2}(?:[.,]\d+)?/.test(source.slice(10))
      ) {
        warnings.push(`${fieldName} contained timezone/second precision; Timeline v2 keeps minute precision while preserving the source record.`);
      }
      return canonical;
    }

    const timestamp = Date.parse(source);
    if (Number.isFinite(timestamp)) {
      warnings.push(`${fieldName} was parsed from a non-canonical interchange date and normalized to UTC minute precision.`);
      return canonicalDateFromDate(new Date(timestamp), true);
    }
    return null;
  }

  function sourceRoot(payload) {
    if (!payload || typeof payload !== "object") return {};
    if (payload.timeline && typeof payload.timeline === "object") return payload.timeline;
    if (payload.data?.timeline && typeof payload.data.timeline === "object") return payload.data.timeline;
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
    if (payload.project && typeof payload.project === "object") return payload.project;
    return payload;
  }

  function extractGroupReference(raw) {
    const direct = firstDefined(raw, ["groupId", "group_id", "categoryId", "category_id", "group", "category", "tag"]);
    if (direct && typeof direct === "object") return firstDefined(direct, ["id", "name", "title", "label"]);
    if (direct !== undefined) return direct;
    const tags = firstArray(raw, ["groups", "categories", "tags"]);
    const first = tags[0];
    return first && typeof first === "object" ? firstDefined(first, ["id", "name", "title", "label"]) : first;
  }

  function collectPreservedFields(raw, sourceType, sourceId) {
    const media = firstArray(raw, ["media", "attachments", "images", "videos", "links"]);
    const comments = firstArray(raw, ["comments", "notes"]);
    const statistics = firstDefined(raw, ["statistics", "stats", "chart", "series"]);
    return {
      sourceType,
      sourceId: sourceId === undefined || sourceId === null ? null : String(sourceId),
      media: boundedClone(media),
      comments: boundedClone(comments),
      statistics: boundedClone(statistics),
      raw: boundedClone(raw)
    };
  }

  function extractItem(raw, sourceType, index, categoryFor, warnings) {
    if (!raw || typeof raw !== "object") {
      warnings.push(`Ignored ${sourceType} ${index + 1}: expected an object.`);
      return null;
    }

    const startRaw = firstDefined(raw, [
      "start", "startDate", "start_date", "date", "datetime", "dateTime", "time", "timestamp", "from"
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
    const title = text(firstDefined(raw, ["title", "name", "label", "text", "caption"]), 160) || `Untitled ${sourceType}`;
    const description = text(firstDefined(raw, ["description", "content", "details", "body", "note", "notes"]), 2000);
    const categoryId = categoryFor(extractGroupReference(raw), raw);

    return {
      id,
      kind,
      start,
      end: kind === "range" ? end : null,
      title,
      description,
      categoryId,
      extensions: {
        externalInterchange: collectPreservedFields(raw, sourceType, sourceId)
      }
    };
  }

  function importObject(payload) {
    const warnings = [];
    const root = sourceRoot(payload);
    const rawGroups = firstArray(root, ["groups", "categories", "tags"]);
    const categories = [];
    const groupMap = new Map();
    const usedCategoryIds = new Set();

    const addCategory = (reference, raw = {}) => {
      const sourceId = reference ?? firstDefined(raw, ["id", "_id", "uid", "name", "title", "label"]);
      const sourceName = firstDefined(raw, ["name", "title", "label"]) ?? sourceId ?? "Interchange";
      let id = `ext-group-${safeToken(sourceId, safeToken(sourceName, String(categories.length + 1)))}`;
      let suffix = 2;
      const baseId = id;
      while (usedCategoryIds.has(id)) id = `${baseId}-${suffix++}`;
      const category = {
        id,
        name: text(sourceName, 60) || "Interchange",
        color: normalizeColor(firstDefined(raw, ["color", "backgroundColor", "background_color", "hex"])),
        extensions: {
          externalInterchange: {
            sourceId: sourceId === undefined || sourceId === null ? null : String(sourceId),
            raw: boundedClone(raw)
          }
        }
      };
      categories.push(category);
      usedCategoryIds.add(id);
      for (const key of [sourceId, sourceName]) {
        if (key !== undefined && key !== null && String(key).trim()) groupMap.set(String(key), id);
      }
      return id;
    };

    rawGroups.forEach((raw, index) => {
      if (raw && typeof raw === "object") addCategory(firstDefined(raw, ["id", "_id", "uid", "name", "title"]), raw);
      else addCategory(raw, { id: raw, name: raw || `Group ${index + 1}` });
    });

    const categoryFor = (reference, raw) => {
      if (reference !== undefined && reference !== null && groupMap.has(String(reference))) {
        return groupMap.get(String(reference));
      }
      if (reference !== undefined && reference !== null && String(reference).trim()) {
        return addCategory(reference, {
          id: reference,
          name: typeof reference === "string" ? reference : `Group ${categories.length + 1}`,
          color: firstDefined(raw, ["color", "backgroundColor", "background_color"])
        });
      }
      if (!categories.length) addCategory("default", { id: "default", name: "Interchange", color: DEFAULT_COLOR });
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

    const items = [];
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

    const sourceTitle = text(firstDefined(root, ["title", "name", "timelineTitle", "timeline_name"]), 120);
    const rootExtensions = {
      sourceId: firstDefined(root, ["id", "_id", "uid", "timelineId"]),
      description: text(firstDefined(root, ["description", "summary", "about"]), 4000),
      background: boundedClone(firstDefined(root, ["background", "backgroundImage", "background_image", "cover"])),
      rawMetadata: boundedClone(firstDefined(root, ["metadata", "settings", "config", "options"]))
    };

    const timelineMetadata = payload?._timeline && typeof payload._timeline === "object"
      ? payload._timeline
      : {};

    return {
      timeline: {
        version: 2,
        title: sourceTitle,
        categories,
        items,
        stories: Array.isArray(timelineMetadata.stories) ? boundedClone(timelineMetadata.stories) : [],
        entities: Array.isArray(timelineMetadata.entities) ? boundedClone(timelineMetadata.entities) : [],
        relationships: Array.isArray(timelineMetadata.relationships) ? boundedClone(timelineMetadata.relationships) : [],
        extensions: {
          externalInterchange: rootExtensions
        }
      },
      warnings,
      source: {
        format: FORMAT,
        schemaVersion: SCHEMA_VERSION,
        eventCount: events.length,
        periodCount: periods.length,
        groupCount: categories.length
      }
    };
  }

  function xmlText(node, names) {
    for (const name of names) {
      const attribute = node.getAttribute?.(name);
      if (attribute !== null && attribute !== undefined && attribute !== "") return attribute;
      const child = Array.from(node.children || []).find((candidate) => candidate.localName?.toLowerCase() === name.toLowerCase());
      if (child?.textContent?.trim()) return child.textContent.trim();
    }
    return undefined;
  }

  function xmlRecord(node, kind) {
    return {
      id: xmlText(node, ["id", "uid", "key"]),
      type: kind,
      title: xmlText(node, ["title", "name", "label", "text"]),
      description: xmlText(node, ["description", "content", "details", "note"]),
      date: xmlText(node, ["date", "datetime", "time", "timestamp"]),
      start: xmlText(node, ["start", "startDate", "from"]),
      end: xmlText(node, ["end", "endDate", "to", "finish"]),
      group: xmlText(node, ["group", "groupId", "category", "categoryId", "tag"]),
      color: xmlText(node, ["color", "backgroundColor"])
    };
  }

  function parseXml(xml) {
    if (typeof DOMParser !== "function") throw new Error("XML import requires the browser DOMParser API.");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) throw new Error("The external XML file is not well formed.");

    const root = document.documentElement;
    const lowerName = (node) => node.localName?.toLowerCase() || "";
    const all = Array.from(root.querySelectorAll("*"));
    const events = all.filter((node) => ["event", "point", "milestone"].includes(lowerName(node))).map((node) => xmlRecord(node, "event"));
    const periods = all.filter((node) => ["period", "range", "interval", "era"].includes(lowerName(node))).map((node) => xmlRecord(node, "period"));
    const groups = all.filter((node) => ["group", "category", "tag"].includes(lowerName(node))).map((node) => ({
      id: xmlText(node, ["id", "uid", "key"]) || node.textContent?.trim(),
      name: xmlText(node, ["name", "title", "label"]) || node.textContent?.trim(),
      color: xmlText(node, ["color", "backgroundColor"])
    }));

    return {
      title: xmlText(root, ["title", "name"]),
      description: xmlText(root, ["description", "summary"]),
      events,
      periods,
      groups
    };
  }

  function importData(input) {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) throw new Error("The interchange input is empty.");
      if (trimmed.startsWith("<")) return importObject(parseXml(trimmed));
      return importObject(JSON.parse(trimmed));
    }
    return importObject(input);
  }

  function isLikelyInterchange(input) {
    if (!input || typeof input !== "object") return false;
    const root = sourceRoot(input);
    const format = text(
      firstDefined(input?._timeline || input, ["format", "source", "application"]),
      80
    ).toLowerCase();
    if (/timeline[._ -]?interchange/.test(format)) return true;
    return (
      Array.isArray(root.periods) ||
      Array.isArray(root.groups) ||
      Array.isArray(root.statistics) ||
      Array.isArray(root.attachments)
    );
  }

  function sourceExtension(record) {
    return record?.extensions?.externalInterchange && typeof record.extensions.externalInterchange === "object"
      ? record.extensions.externalInterchange
      : {};
  }

  function exportItem(item, categoriesById) {
    const extension = sourceExtension(item);
    const raw = extension.raw && typeof extension.raw === "object" && !Array.isArray(extension.raw)
      ? cloneJson(extension.raw)
      : {};
    const category = categoriesById.get(item.categoryId);
    const base = {
      ...raw,
      id: extension.sourceId ?? item.id,
      title: item.title,
      description: item.description || "",
      group: category?.extensions?.externalInterchange?.sourceId ?? category?.name ?? item.categoryId
    };

    if (item.media?.length) {
      base.media = item.media.map((entry) => ({
        url: entry.src,
        alt: entry.alt || "",
        caption: entry.caption || ""
      }));
    } else if (extension.media?.length) {
      base.media = cloneJson(extension.media);
    }
    if (extension.comments?.length) base.comments = cloneJson(extension.comments);
    if (extension.statistics !== undefined && extension.statistics !== null) base.statistics = cloneJson(extension.statistics);

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

  function exportData(timeline) {
    if (!timeline || typeof timeline !== "object") throw new Error("Expected a Timeline document.");
    const categories = Array.isArray(timeline.categories) ? timeline.categories : [];
    const items = Array.isArray(timeline.items) ? timeline.items : [];
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    const groups = categories.map((category) => {
      const extension = sourceExtension(category);
      const raw = extension.raw && typeof extension.raw === "object" && !Array.isArray(extension.raw)
        ? cloneJson(extension.raw)
        : {};
      return {
        ...raw,
        id: extension.sourceId ?? category.id,
        name: category.name,
        color: category.color
      };
    });

    const events = [];
    const periods = [];
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
        relationships: cloneJson(Array.isArray(timeline.relationships) ? timeline.relationships : []),
        note: "Timeline interchange keeps external event, period, group, story, entity, and relationship data behind a vendor-neutral adapter and preserves imported extension records when available."
      }
    };
  }

  globalThis.TimelineInterchangeAdapter = Object.freeze({
    FORMAT,
    SCHEMA_VERSION,
    importData,
    exportData,
    isLikelyInterchange
  });
})();
