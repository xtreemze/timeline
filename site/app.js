(() => {
  "use strict";

  const VERSION = 2;
  const STORAGE_KEY = "timeline:v2";
  const LEGACY_STORAGE_KEY = "timeline:v1";
  const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const temporal = globalThis.TimelineTemporal;
  const spatial = globalThis.TimelineSpatial;
  const graph = globalThis.TimelineGraph;
  const presentation = globalThis.TimelinePresentation;
  const dateRangeFactory = globalThis.TimelineDateRangePicker;
  if (!temporal) throw new Error("TimelineTemporal must load before app.js.");
  if (!spatial) throw new Error("TimelineSpatial must load before app.js.");
  if (!graph) throw new Error("TimelineGraph must load before app.js.");
  if (!presentation) throw new Error("TimelinePresentation must load before app.js.");
  if (!dateRangeFactory) throw new Error("TimelineDateRangePicker must load before app.js.");

  const DEFAULT_CATEGORIES = [
    { id: "event", name: "Event", color: "#667085" },
    { id: "decision", name: "Decision", color: "#2563eb" },
    { id: "milestone", name: "Milestone", color: "#b54708" },
    { id: "evidence", name: "Evidence", color: "#027a48" },
    { id: "communication", name: "Communication", color: "#7a5af8" },
    { id: "project", name: "Project", color: "#c4320a" }
  ];

  const SAMPLE = {
    version: VERSION,
    title: "Evidence-rich product launch",
    categories: [
      { id: "decision", name: "Decision", color: "#2563eb" },
      { id: "fieldwork", name: "Fieldwork", color: "#c4320a" },
      { id: "evidence", name: "Evidence", color: "#027a48" },
      { id: "release", name: "Release", color: "#7a5af8" }
    ],
    items: [
      {
        id: "sample-brief",
        kind: "event",
        start: "2026-09-11T09:00+02:00",
        end: null,
        time: {
          type: "instant",
          start: {
            value: "2026-09-11T09:00+02:00",
            precision: "minute",
            certainty: "exact",
            calendar: "gregorian",
            timeZone: "Europe/Stockholm",
            utcOffset: "+02:00"
          },
          end: null
        },
        title: "Launch brief approved",
        description: "The team freezes the first release scope, evidence requirements, mapping behavior, temporal precision rules, and the visual language for focused events.",
        categoryId: "decision",
        location: {
          name: "Stockholm Central",
          geographicIdentifier: "Stockholm, Sweden",
          address: "Centralplan, Stockholm",
          geometry: { type: "Point", coordinates: [18.0586, 59.3300] },
          crs: "OGC:CRS84",
          source: "manual"
        },
        media: [
          {
            src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
            alt: "Workspace used as demonstration media",
            caption: "Hero photograph for the focused event composition."
          },
          {
            src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80",
            alt: "Interior workspace demonstration photograph",
            caption: "A second image demonstrates the three-photo slideshow."
          },
          {
            src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=80",
            alt: "Architectural demonstration photograph",
            caption: "A third image shows event media rotation."
          }
        ],
        tags: [
          { label: "Decision", icon: "decision", hue: 28 },
          { label: "Stockholm", icon: "place", hue: 205 },
          { label: "Team", icon: "person", hue: 292 }
        ]
      },
      {
        id: "sample-fieldwork",
        kind: "range",
        start: "2026-09-11T10:30+02:00",
        end: "2026-09-13T18:15+02:00",
        time: {
          type: "interval",
          start: {
            value: "2026-09-11T10:30+02:00",
            precision: "minute",
            certainty: "exact",
            calendar: "gregorian",
            timeZone: "Europe/Copenhagen",
            utcOffset: "+02:00"
          },
          end: {
            value: "2026-09-13T18:15+02:00",
            precision: "minute",
            certainty: "approximate",
            calendar: "gregorian",
            timeZone: "Europe/Copenhagen",
            utcOffset: "+02:00"
          }
        },
        title: "Fieldwork and interaction study",
        description: "A multi-day range demonstrates two-date calendar selection, independent clocks, a mapped place, rich media, event tags, relationships, and uncertainty on the end boundary.",
        categoryId: "fieldwork",
        location: {
          name: "Copenhagen",
          geographicIdentifier: "Copenhagen, Denmark",
          address: "",
          geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
          crs: "OGC:CRS84",
          source: "manual"
        },
        media: [
          {
            src: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1600&q=80",
            alt: "Copenhagen city demonstration photograph",
            caption: "Location-oriented hero media for a ranged event."
          },
          {
            src: "https://images.unsplash.com/photo-1552560880-2482cef14240?auto=format&fit=crop&w=1600&q=80",
            alt: "Urban bicycle demonstration photograph",
            caption: "Second fieldwork image."
          }
        ],
        tags: [
          { label: "Fieldwork", icon: "evidence", hue: 142 },
          { label: "Copenhagen", icon: "place", hue: 216 },
          { label: "Range", icon: "relation", hue: 52 }
        ]
      },
      {
        id: "sample-evidence",
        kind: "event",
        start: "2026-09-12",
        end: null,
        title: "Evidence package captured",
        description: "A date-only event demonstrates that Timeline can retain day precision without inventing a clock time.",
        categoryId: "evidence",
        media: [
          {
            src: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
            alt: "Documents used as demonstration evidence imagery",
            caption: "Evidence-oriented media remains presentation metadata, not evidentiary proof by itself."
          }
        ],
        tags: [
          { label: "Evidence", icon: "evidence", hue: 155 },
          { label: "Date only", icon: "milestone", hue: 44 }
        ]
      },
      {
        id: "sample-review",
        kind: "event",
        start: "2026-09-13T16:15+02:00",
        end: null,
        title: "Focused composition reviewed",
        description: "The selected-event design uses the whole chronology workspace: hero media and title dominate, supporting sections take asymmetric grid spans, and the timeline docks to an edge rather than competing with detail.",
        categoryId: "decision",
        tags: [
          { label: "UX review", icon: "decision", hue: 320 },
          { label: "Relations", icon: "relation", hue: 262 }
        ]
      },
      {
        id: "sample-release",
        kind: "event",
        start: "2026-09-14T09:30+02:00",
        end: null,
        title: "Release published",
        description: "The release demonstrates stories, graph relationships, temporal clustering, rich event focus, map locations, interchange, and accessible hue-constrained tags working together.",
        categoryId: "release",
        media: [
          {
            src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
            alt: "Computer display used as release demonstration media",
            caption: "Release hero."
          },
          {
            src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80",
            alt: "Code editor demonstration photograph",
            caption: "Implementation view."
          },
          {
            src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
            alt: "Laptop collaboration demonstration photograph",
            caption: "Collaboration view."
          }
        ],
        tags: [
          { label: "Release", icon: "milestone", hue: 275 },
          { label: "Media", icon: "media", hue: 190 },
          { label: "Portable", icon: "note", hue: 70 }
        ]
      }
    ],
    stories: [
      {
        id: "sample-story",
        title: "From brief to release",
        description: "A narrative path that reuses canonical chronology items without changing their dates, locations, media, tags, or graph relationships.",
        itemIds: ["sample-brief", "sample-fieldwork", "sample-evidence", "sample-review", "sample-release"]
      }
    ],
    entities: [
      { id: "person-lead", type: "person", name: "Project lead", identifiers: [], attributes: {} },
      { id: "place-stockholm", type: "place", name: "Stockholm", identifiers: [], attributes: {} },
      { id: "place-copenhagen", type: "place", name: "Copenhagen", identifiers: [], attributes: {} }
    ],
    relationships: [
      {
        id: "sample-relation-participant",
        subjectId: "person-lead",
        objectId: "sample-brief",
        predicate: "participant",
        role: "approver",
        time: {
          type: "instant",
          start: {
            value: "2026-09-11T09:00+02:00",
            precision: "minute",
            certainty: "exact",
            calendar: "gregorian",
            timeZone: "Europe/Stockholm",
            utcOffset: "+02:00"
          },
          end: null
        }
      },
      {
        id: "sample-relation-fieldwork",
        subjectId: "sample-fieldwork",
        objectId: "place-copenhagen",
        predicate: "occurredAt",
        role: "study-site",
        time: {
          type: "interval",
          start: {
            value: "2026-09-11T10:30+02:00",
            precision: "minute",
            certainty: "exact",
            calendar: "gregorian",
            timeZone: "Europe/Copenhagen",
            utcOffset: "+02:00"
          },
          end: {
            value: "2026-09-13T18:15+02:00",
            precision: "minute",
            certainty: "approximate",
            calendar: "gregorian",
            timeZone: "Europe/Copenhagen",
            utcOffset: "+02:00"
          }
        }
      },
      {
        id: "sample-relation-derived",
        subjectId: "sample-release",
        objectId: "sample-evidence",
        predicate: "derivedFrom",
        role: "release-evidence"
      }
    ]
  };

  const els = {
    title: document.querySelector("#timeline-title"),
    heading: document.querySelector("#timeline-heading"),
    itemCount: document.querySelector("#item-count"),
    storyCount: document.querySelector("#story-count"),
    categoryCount: document.querySelector("#category-count"),
    visibleCount: document.querySelector("#visible-count"),
    appShell: document.querySelector("#app-shell"),
    loadSample: document.querySelector("#load-sample"),
    importJson: document.querySelector("#import-json"),
    importInterchange: document.querySelector("#import-interchange"),
    exportJson: document.querySelector("#export-json"),
    exportInterchange: document.querySelector("#export-interchange"),
    exportMarkdown: document.querySelector("#export-markdown"),
    clear: document.querySelector("#clear-timeline"),
    tabs: [...document.querySelectorAll(".tab")],
    panels: [...document.querySelectorAll(".editor-section")],

    itemForm: document.querySelector("#item-form"),
    itemId: document.querySelector("#item-id"),
    itemKind: document.querySelector("#item-kind"),
    itemCategory: document.querySelector("#item-category"),
    itemDateRange: document.querySelector("#item-date-range"),
    itemCalendarPopover: document.querySelector("#item-calendar-popover"),
    itemCalendarGrid: document.querySelector("#item-calendar-grid"),
    itemCalendarMonth: document.querySelector("#item-calendar-month"),
    itemCalendarYear: document.querySelector("#item-calendar-year"),
    itemCalendarPrev: document.querySelector("#item-calendar-prev"),
    itemCalendarNext: document.querySelector("#item-calendar-next"),
    itemCalendarClear: document.querySelector("#item-calendar-clear"),
    itemStartDate: document.querySelector("#item-start-date"),
    itemStartTime: document.querySelector("#item-start-time"),
    itemStartPrecision: document.querySelector("#item-start-precision"),
    itemStartCertainty: document.querySelector("#item-start-certainty"),
    itemStartZone: document.querySelector("#item-start-zone"),
    itemStartTimeField: document.querySelector("#item-start-time-field"),
    itemStartZoneField: document.querySelector("#item-start-zone-field"),
    itemEndDate: document.querySelector("#item-end-date"),
    itemEndTime: document.querySelector("#item-end-time"),
    itemEndPrecision: document.querySelector("#item-end-precision"),
    itemEndCertainty: document.querySelector("#item-end-certainty"),
    itemEndZone: document.querySelector("#item-end-zone"),
    itemEndTimeField: document.querySelector("#item-end-time-field"),
    itemEndZoneField: document.querySelector("#item-end-zone-field"),
    timeZoneOptions: document.querySelector("#time-zone-options"),
    endField: document.querySelector("#end-field"),
    itemTitle: document.querySelector("#item-title"),
    itemDescription: document.querySelector("#item-description"),
    itemMediaDetails: document.querySelector("#item-media-details"),
    itemMediaRows: [...document.querySelectorAll("[data-media-slot]")],
    itemTagsDetails: document.querySelector("#item-tags-details"),
    itemTagRows: [...document.querySelectorAll("[data-tag-slot]")],
    itemLocationDetails: document.querySelector("#item-location-details"),
    itemLocationName: document.querySelector("#item-location-name"),
    itemLocationIdentifier: document.querySelector("#item-location-identifier"),
    itemLocationAddress: document.querySelector("#item-location-address"),
    itemLocationLatitude: document.querySelector("#item-location-latitude"),
    itemLocationLongitude: document.querySelector("#item-location-longitude"),
    itemLocationSource: document.querySelector("#item-location-source"),
    itemLocationAccuracy: document.querySelector("#item-location-accuracy"),
    itemGeolocation: document.querySelector("#item-geolocation"),
    itemLocationClear: document.querySelector("#item-location-clear"),
    itemLocationMap: document.querySelector("#item-location-map"),
    itemFormError: document.querySelector("#item-form-error"),
    saveItem: document.querySelector("#save-item"),
    cancelItemEdit: document.querySelector("#cancel-item-edit"),

    storyForm: document.querySelector("#story-form"),
    storyId: document.querySelector("#story-id"),
    storyTitle: document.querySelector("#story-title"),
    storyDescription: document.querySelector("#story-description"),
    storyPicker: document.querySelector("#story-picker"),
    storyPickerCount: document.querySelector("#story-picker-count"),
    storySequence: document.querySelector("#story-sequence"),
    storySequenceCount: document.querySelector("#story-sequence-count"),
    storyFormError: document.querySelector("#story-form-error"),
    saveStory: document.querySelector("#save-story"),
    cancelStoryEdit: document.querySelector("#cancel-story-edit"),
    storyList: document.querySelector("#story-list"),
    savedStoryCount: document.querySelector("#saved-story-count"),

    categoryForm: document.querySelector("#category-form"),
    categoryId: document.querySelector("#category-id"),
    categoryName: document.querySelector("#category-name"),
    categoryColor: document.querySelector("#category-color"),
    categoryFormError: document.querySelector("#category-form-error"),
    saveCategory: document.querySelector("#save-category"),
    cancelCategoryEdit: document.querySelector("#cancel-category-edit"),
    categoryList: document.querySelector("#category-list"),

    search: document.querySelector("#timeline-search"),
    categoryFilter: document.querySelector("#category-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    timelineViewRoot: document.querySelector("#timeline-view"),
    storyFocus: document.querySelector("#story-focus"),
    storyFocusTitle: document.querySelector("#story-focus-title"),
    storyFocusDescription: document.querySelector("#story-focus-description"),
    storyFocusPosition: document.querySelector("#story-focus-position"),
    storyPrev: document.querySelector("#story-prev"),
    storyNext: document.querySelector("#story-next"),
    storyExit: document.querySelector("#story-exit"),
    empty: document.querySelector("#empty-state"),
    filteredEmpty: document.querySelector("#filtered-empty-state"),
    list: document.querySelector("#timeline-list"),
    status: document.querySelector("#status")
  };

  let state = loadState();
  let storyDraftIds = [];
  let statusTimer = 0;
  const ui = {
    activePanel: "items",
    search: "",
    categoryFilter: "all",
    activeStoryId: null,
    storyCursor: 0
  };

  const timelineView = globalThis.TimelineView?.create(els.timelineViewRoot) || null;
  const dateRangePicker = dateRangeFactory.create({
    input: els.itemDateRange,
    popover: els.itemCalendarPopover,
    grid: els.itemCalendarGrid,
    heading: els.itemCalendarMonth,
    yearInput: els.itemCalendarYear,
    previousButton: els.itemCalendarPrev,
    nextButton: els.itemCalendarNext,
    clearButton: els.itemCalendarClear,
    startInput: els.itemStartDate,
    endInput: els.itemEndDate,
    mode: "event"
  });
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const locationMap = globalThis.TimelineLocationMap?.create({
    container: els.itemLocationMap,
    details: els.itemLocationDetails,
    latitude: els.itemLocationLatitude,
    longitude: els.itemLocationLongitude,
    accuracy: els.itemLocationAccuracy,
    source: els.itemLocationSource,
    geolocation: els.itemGeolocation,
    clearButton: els.itemLocationClear
  }) || null;

  function newId(prefix = "id") {
    const random = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeExtensions(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    try {
      return clone(value);
    } catch {
      return undefined;
    }
  }

  function parseDate(value) {
    const parsed = temporal.parse(value);
    if (!parsed) return null;
    const sortKey = temporal.sortKey(value);
    if (!Number.isFinite(sortKey)) return null;
    return { ...parsed, sortKey };
  }

  function formatDateParts(value) {
    const parsed = parseDate(value);
    if (!parsed) return { date: value || "Unknown", time: "" };

    const dateObject = new Date(0);
    dateObject.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
    dateObject.setUTCHours(
      parsed.hour || 0,
      parsed.minute || 0,
      parsed.second || 0,
      parsed.millisecond || 0
    );

    const date = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(dateObject);

    let time = "";
    if (parsed.hasTime) {
      const options = {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC"
      };
      if (parsed.precision === "second" || parsed.precision === "millisecond") options.second = "2-digit";
      if (parsed.precision === "millisecond") options.fractionalSecondDigits = 3;
      time = new Intl.DateTimeFormat(undefined, options).format(dateObject);
    }
    return { date, time };
  }

  function formatDateInline(value) {
    const parts = formatDateParts(value);
    return parts.time ? `${parts.date}, ${parts.time}` : parts.date;
  }

  function normalizeColor(value, fallback = "#667085") {
    return typeof value === "string" && COLOR_PATTERN.test(value) ? value.toLowerCase() : fallback;
  }

  function categoryLabelFromId(id) {
    return String(id || "Category")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .slice(0, 60);
  }

  function normalizeTimeline(input) {
    if (!input || typeof input !== "object") throw new Error("Expected a timeline object.");

    const categories = [];
    const categoryIds = new Set();
    const sourceCategories = Array.isArray(input.categories) && input.categories.length
      ? input.categories
      : DEFAULT_CATEGORIES;

    sourceCategories.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") return;
      const fallbackId = `category-${index + 1}`;
      const id = String(raw.id || fallbackId).trim().slice(0, 80) || fallbackId;
      if (categoryIds.has(id)) return;
      const name = String(raw.name || categoryLabelFromId(id)).trim().slice(0, 60) || categoryLabelFromId(id);
      const category = { id, name, color: normalizeColor(raw.color) };
      const extensions = normalizeExtensions(raw.extensions);
      if (extensions) category.extensions = extensions;
      categories.push(category);
      categoryIds.add(id);
    });

    if (!categories.length) {
      for (const category of DEFAULT_CATEGORIES) {
        categories.push(clone(category));
        categoryIds.add(category.id);
      }
    }

    const ensureCategory = (rawId) => {
      const candidate = String(rawId || categories[0].id).trim().slice(0, 80) || categories[0].id;
      if (!categoryIds.has(candidate)) {
        categories.push({ id: candidate, name: categoryLabelFromId(candidate), color: "#667085" });
        categoryIds.add(candidate);
      }
      return candidate;
    };

    let sourceItems;
    if (Array.isArray(input.items)) {
      sourceItems = input.items;
    } else if (Array.isArray(input.events)) {
      sourceItems = input.events.map((legacy) => ({
        id: legacy.id,
        kind: "event",
        start: legacy.date,
        end: null,
        title: legacy.title,
        description: legacy.description,
        categoryId: legacy.category
      }));
    } else {
      sourceItems = [];
    }

    const items = sourceItems.map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error(`Item ${index + 1} is not an object.`);
      const kind = raw.kind === "range" ? "range" : "event";
      const rawStart = raw.time?.start?.value ?? raw.start;
      const rawEnd = kind === "range" ? (raw.time?.end?.value ?? raw.end) : null;
      const start = typeof rawStart === "string" ? rawStart.trim() : "";
      const end = kind === "range" && typeof rawEnd === "string" ? rawEnd.trim() : null;
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
      const time = temporal.normalizeExtent(raw.time, start, end, kind);
      if (!time?.start) throw new Error(`Item ${index + 1} has an invalid ISO 8601 start value: ${start || "(missing)"}.`);
      if (!title) throw new Error(`Item ${index + 1} is missing a title.`);
      if (kind === "range") {
        if (!time.end) throw new Error(`Range ${index + 1} has an invalid ISO 8601 end value: ${end || "(missing)"}.`);
        if (temporal.sortKey(time.end) < temporal.sortKey(time.start)) {
          throw new Error(`Range ${index + 1} ends before it starts.`);
        }
      }

      let location = null;
      try {
        location = spatial.normalize(raw.location);
      } catch (error) {
        throw new Error(`Item ${index + 1} has invalid location coordinates: ${error instanceof Error ? error.message : "invalid location"}`);
      }

      const item = {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("item"),
        kind,
        start: time.start.value,
        end: kind === "range" ? time.end.value : null,
        time,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : "",
        categoryId: ensureCategory(raw.categoryId || raw.category)
      };
      const media = presentation.normalizeMedia(raw.media);
      const tags = presentation.normalizeTags(raw.tags);
      if (location) item.location = location;
      if (media.length) item.media = media;
      if (tags.length) item.tags = tags;
      const extensions = normalizeExtensions(raw.extensions);
      if (extensions) item.extensions = extensions;
      return item;
    });

    const itemIds = new Set(items.map((item) => item.id));
    const seenStoryIds = new Set();
    const stories = (Array.isArray(input.stories) ? input.stories : []).map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error(`Story ${index + 1} is not an object.`);
      let id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("story");
      if (seenStoryIds.has(id)) id = newId("story");
      seenStoryIds.add(id);
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
      if (!title) throw new Error(`Story ${index + 1} is missing a title.`);
      const uniqueIds = [];
      const seenItems = new Set();
      for (const itemId of Array.isArray(raw.itemIds) ? raw.itemIds : []) {
        if (typeof itemId === "string" && itemIds.has(itemId) && !seenItems.has(itemId)) {
          uniqueIds.push(itemId);
          seenItems.add(itemId);
        }
      }
      const story = {
        id,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 1500) : "",
        itemIds: uniqueIds
      };
      const extensions = normalizeExtensions(raw.extensions);
      if (extensions) story.extensions = extensions;
      return story;
    });

    const graphData = graph.normalizeGraphData(input, temporal);
    const normalized = {
      version: VERSION,
      title: typeof input.title === "string" ? input.title.slice(0, 120) : "",
      categories,
      items,
      stories,
      entities: graphData.entities,
      relationships: graphData.relationships
    };
    const extensions = normalizeExtensions(input.extensions);
    if (extensions) normalized.extensions = extensions;
    return normalized;
  }

  function blankTimeline() {
    return {
      version: VERSION,
      title: "",
      categories: clone(DEFAULT_CATEGORIES),
      items: [],
      stories: [],
      entities: [],
      relationships: []
    };
  }

  function loadState() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalizeTimeline(JSON.parse(current));

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = normalizeTimeline(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (error) {
      console.warn("Timeline state could not be restored:", error);
    }
    return blankTimeline();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Timeline state could not be saved:", error);
      showStatus("Changes are visible, but browser storage is unavailable.");
    }
  }

  function sortItems(items = state.items) {
    return [...items].sort((a, b) => {
      const startDelta = parseDate(a.start).sortKey - parseDate(b.start).sortKey;
      if (startDelta) return startDelta;
      const aEnd = a.end ? parseDate(a.end).sortKey : parseDate(a.start).sortKey;
      const bEnd = b.end ? parseDate(b.end).sortKey : parseDate(b.start).sortKey;
      return aEnd - bEnd || a.title.localeCompare(b.title);
    });
  }

  function getCategory(id) {
    return state.categories.find((category) => category.id === id) || state.categories[0];
  }

  function getStory(id) {
    return state.stories.find((story) => story.id === id) || null;
  }

  function getItem(id) {
    return state.items.find((item) => item.id === id) || null;
  }

  function storyMembershipCount(itemId) {
    return state.stories.reduce((count, story) => count + (story.itemIds.includes(itemId) ? 1 : 0), 0);
  }

  function getVisibleItems() {
    let items;
    const activeStory = getStory(ui.activeStoryId);
    if (activeStory) {
      items = activeStory.itemIds.map(getItem).filter(Boolean);
    } else {
      items = sortItems();
    }

    if (ui.categoryFilter !== "all") {
      items = items.filter((item) => item.categoryId === ui.categoryFilter);
    }
    if (ui.search.trim()) {
      const needle = ui.search.trim().toLocaleLowerCase();
      items = items.filter((item) => {
        const tagText = (item.tags || []).map((tag) => tag.label).join(" ");
        const locationText = item.location
          ? [item.location.name, item.location.geographicIdentifier, item.location.address].filter(Boolean).join(" ")
          : "";
        return `${item.title}\n${item.description}\n${tagText}\n${locationText}`
          .toLocaleLowerCase()
          .includes(needle);
      });
    }
    return items;
  }

  function setError(element, message = "") {
    element.textContent = message;
    element.hidden = !message;
  }

  function setActivePanel(name) {
    ui.activePanel = name;
    for (const tab of els.tabs) {
      const active = tab.dataset.panel === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of els.panels) panel.hidden = panel.id !== `panel-${name}`;
  }

  function renderProjectMeta() {
    if (document.activeElement !== els.title) els.title.value = state.title;
    els.heading.textContent = state.title.trim() || "Untitled timeline";
    els.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "items"}`;
    els.storyCount.textContent = `${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}`;
    els.categoryCount.textContent = `${state.categories.length} ${state.categories.length === 1 ? "category" : "categories"}`;
  }

  function fillCategorySelect(select, includeAll, selected) {
    const options = [];
    if (includeAll) {
      const option = document.createElement("option");
      option.value = "all";
      option.textContent = "All categories";
      options.push(option);
    }
    for (const category of state.categories) {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      options.push(option);
    }
    select.replaceChildren(...options);
    const valid = [...select.options].some((option) => option.value === selected);
    select.value = valid ? selected : includeAll ? "all" : state.categories[0]?.id || "";
  }

  function renderCategoryOptions() {
    const itemSelected = els.itemCategory.value || state.categories[0]?.id || "";
    fillCategorySelect(els.itemCategory, false, itemSelected);
    fillCategorySelect(els.categoryFilter, true, ui.categoryFilter);
  }

  function renderTimeline() {
    const activeStory = getStory(ui.activeStoryId);
    const visible = getVisibleItems();
    els.visibleCount.textContent = `${visible.length} shown`;
    els.empty.hidden = state.items.length > 0;
    els.filteredEmpty.hidden = state.items.length === 0 || visible.length > 0;
    els.list.hidden = visible.length === 0;

    if (activeStory) {
      ui.storyCursor = Math.max(0, Math.min(ui.storyCursor, Math.max(activeStory.itemIds.length - 1, 0)));
      els.storyFocus.hidden = false;
      els.storyFocusTitle.textContent = activeStory.title;
      els.storyFocusDescription.textContent = activeStory.description || "Only the items selected for this story are shown, in narrative order.";
      els.storyFocusPosition.textContent = activeStory.itemIds.length ? `${ui.storyCursor + 1} / ${activeStory.itemIds.length}` : "0 / 0";
      els.storyPrev.disabled = ui.storyCursor <= 0;
      els.storyNext.disabled = ui.storyCursor >= activeStory.itemIds.length - 1;
    } else {
      els.storyFocus.hidden = true;
    }

    els.list.replaceChildren(...visible.map((item) => renderItem(item, activeStory)));

    const storyCurrentId = activeStory?.itemIds[ui.storyCursor] || null;
    timelineView?.setItems(visible.map((item) => {
      const category = getCategory(item.categoryId);
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description,
        categoryName: category.name,
        color: category.color,
        start: temporal.sortKey(item.time?.start || item.start),
        end: item.end ? temporal.sortKey(item.time?.end || item.end) : null,
        startLabel: formatDateInline(item.start),
        endLabel: item.end ? formatDateInline(item.end) : "",
        locationName: item.location?.name || item.location?.geographicIdentifier || ""
      };
    }), {
      focusId: storyCurrentId,
      relationships: graph.temporalRelationProjection(state.relationships, temporal)
    });
  }

  function renderItem(item, activeStory) {
    const category = getCategory(item.categoryId);
    const li = document.createElement("li");
    li.className = `timeline-item${item.kind === "range" ? " is-range" : ""}`;
    li.dataset.id = item.id;
    li.style.setProperty("--category-color", category.color);

    let storyIndex = -1;
    if (activeStory) {
      storyIndex = activeStory.itemIds.indexOf(item.id);
      const currentId = activeStory.itemIds[ui.storyCursor];
      li.classList.toggle("is-current", item.id === currentId);
      li.classList.toggle("story-dimmed", item.id !== currentId);
    }

    const dateWrap = document.createElement("div");
    dateWrap.className = "timeline-date";
    const start = formatDateParts(item.start);
    const startDate = document.createElement("strong");
    startDate.textContent = start.date;
    dateWrap.append(startDate);
    const detail = document.createElement("span");
    if (item.kind === "range") {
      detail.textContent = `${start.time ? `${start.time} · ` : ""}→ ${formatDateInline(item.end)}`;
      detail.className = "range-end";
    } else {
      detail.textContent = start.time;
    }
    if (detail.textContent) dateWrap.append(detail);

    const marker = document.createElement("div");
    marker.className = "timeline-marker";
    marker.setAttribute("aria-hidden", "true");

    const card = document.createElement("article");
    card.className = "timeline-card";

    const top = document.createElement("div");
    top.className = "timeline-card-top";
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (activeStory && storyIndex !== ui.storyCursor) {
      const focus = actionButton("Focus", "story-focus", `Focus ${item.title}`);
      focus.dataset.storyIndex = String(storyIndex);
      actions.append(focus);
    }
    actions.append(
      actionButton("Edit", "edit-item", `Edit ${item.title}`),
      actionButton("Delete", "delete-item", `Delete ${item.title}`, "delete")
    );
    top.append(heading, actions);
    card.append(top);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      card.append(description);
    }

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "category";
    categoryBadge.style.setProperty("--category-color", category.color);
    categoryBadge.textContent = category.name;
    const kindBadge = document.createElement("span");
    kindBadge.className = "kind-badge";
    kindBadge.textContent = item.kind;
    meta.append(categoryBadge, kindBadge);

    const locationLabel = item.location?.name || item.location?.geographicIdentifier;
    if (locationLabel) {
      const placeBadge = document.createElement("span");
      placeBadge.className = "location-badge";
      placeBadge.textContent = locationLabel;
      meta.append(placeBadge);
    }

    if (activeStory && storyIndex >= 0) {
      const step = document.createElement("span");
      step.className = "story-step";
      step.textContent = `Story step ${storyIndex + 1}`;
      meta.append(step);
    } else {
      const memberships = storyMembershipCount(item.id);
      if (memberships) {
        const membership = document.createElement("span");
        membership.className = "story-membership";
        membership.textContent = `In ${memberships} ${memberships === 1 ? "story" : "stories"}`;
        meta.append(membership);
      }
    }
    card.append(meta);
    li.append(dateWrap, marker, card);
    return li;
  }

  function actionButton(label, action, ariaLabel, extraClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button ${extraClass}`.trim();
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    return button;
  }

  function fillTimeZoneOptions() {
    const zones = temporal.supportedTimeZones();
    const options = zones.map((zone) => {
      const option = document.createElement("option");
      option.value = zone;
      return option;
    });
    els.timeZoneOptions.replaceChildren(...options);
  }

  function configureTemporalEndpoint(prefix) {
    const precision = els[`item${prefix}Precision`].value;
    const timeField = els[`item${prefix}TimeField`];
    const zoneField = els[`item${prefix}ZoneField`];
    const timeInput = els[`item${prefix}Time`];
    const hasClock = precision !== "day";

    timeField.hidden = !hasClock;
    zoneField.hidden = !hasClock;
    timeInput.required = hasClock;
    timeInput.step =
      precision === "millisecond" ? "0.001" :
      precision === "second" ? "1" :
      "60";

    if (!hasClock) {
      timeInput.value = "";
    } else if (!els[`item${prefix}Zone`].value && localTimeZone) {
      els[`item${prefix}Zone`].value = localTimeZone;
    }
  }

  function endpointFromForm(prefix) {
    return temporal.buildEndpoint({
      date: els[`item${prefix}Date`].value,
      time: els[`item${prefix}Time`].value,
      precision: els[`item${prefix}Precision`].value,
      certainty: els[`item${prefix}Certainty`].value,
      timeZone: els[`item${prefix}Zone`].value
    });
  }

  function setEndpointForm(prefix, endpointOrValue) {
    const parts = temporal.formParts(endpointOrValue);
    els[`item${prefix}Date`].value = parts.date;
    els[`item${prefix}Time`].value = parts.time;
    els[`item${prefix}Precision`].value = parts.precision;
    els[`item${prefix}Certainty`].value = parts.certainty;
    els[`item${prefix}Zone`].value = parts.timeZone;
    configureTemporalEndpoint(prefix);
  }

  function resetLocationForm() {
    els.itemLocationName.value = "";
    els.itemLocationIdentifier.value = "";
    els.itemLocationAddress.value = "";
    els.itemLocationLatitude.value = "";
    els.itemLocationLongitude.value = "";
    els.itemLocationSource.value = "manual";
    els.itemLocationAccuracy.value = "";
    els.itemLocationDetails.open = false;
    locationMap?.clear?.();
  }

  function fillLocationForm(location) {
    const parts = spatial.formParts(location);
    els.itemLocationName.value = parts.name;
    els.itemLocationIdentifier.value = parts.geographicIdentifier;
    els.itemLocationAddress.value = parts.address;
    els.itemLocationLatitude.value = parts.latitude;
    els.itemLocationLongitude.value = parts.longitude;
    els.itemLocationSource.value = parts.source;
    els.itemLocationAccuracy.value = parts.accuracyMeters;
    els.itemLocationDetails.open = Boolean(location);
    if (location) locationMap?.refresh();
  }

  function resetItemForm() {
    els.itemForm.reset();
    els.itemId.value = "";
    els.itemKind.value = "event";
    els.endField.hidden = true;
    els.itemEndDate.required = false;
    els.itemStartPrecision.value = "day";
    els.itemEndPrecision.value = "day";
    els.itemStartCertainty.value = "exact";
    els.itemEndCertainty.value = "exact";
    els.itemStartZone.value = localTimeZone;
    els.itemEndZone.value = localTimeZone;
    configureTemporalEndpoint("Start");
    configureTemporalEndpoint("End");
    resetLocationForm();
    fillCategorySelect(els.itemCategory, false, state.categories[0]?.id || "");
    els.saveItem.textContent = "Add item";
    els.cancelItemEdit.hidden = true;
    setError(els.itemFormError);
  }

  function beginItemEdit(id) {
    const item = getItem(id);
    if (!item) return;
    setActivePanel("items");
    els.itemId.value = item.id;
    els.itemKind.value = item.kind;
    setEndpointForm("Start", item.time?.start || item.start);
    setEndpointForm("End", item.time?.end || item.end || "");
    els.endField.hidden = item.kind !== "range";
    els.itemEndDate.required = item.kind === "range";
    fillCategorySelect(els.itemCategory, false, item.categoryId);
    els.itemTitle.value = item.title;
    els.itemDescription.value = item.description;
    fillLocationForm(item.location || null);
    els.saveItem.textContent = "Save changes";
    els.cancelItemEdit.hidden = false;
    setError(els.itemFormError);
    els.itemTitle.focus();
    els.itemForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function removeItem(id) {
    const item = getItem(id);
    if (!item) return;
    const affectedStories = state.stories.filter((story) => story.itemIds.includes(id)).length;
    const suffix = affectedStories ? ` It will also be removed from ${affectedStories} ${affectedStories === 1 ? "story" : "stories"}.` : "";
    if (!window.confirm(`Delete “${item.title}”?${suffix}`)) return;
    state.items = state.items.filter((candidate) => candidate.id !== id);
    state.stories = state.stories.map((story) => ({ ...story, itemIds: story.itemIds.filter((itemId) => itemId !== id) }));
    if (els.itemId.value === id) resetItemForm();
    if (storyDraftIds.includes(id)) storyDraftIds = storyDraftIds.filter((itemId) => itemId !== id);
    const activeStory = getStory(ui.activeStoryId);
    if (activeStory && !activeStory.itemIds.length) exitStoryFocus();
    persist();
    renderAll();
    showStatus("Timeline item deleted.");
  }

  function renderStoryBuilder() {
    els.storyPickerCount.textContent = `${state.items.length}`;
    els.storySequenceCount.textContent = `${storyDraftIds.length}`;

    const pickerRows = sortItems().map((item) => {
      const label = document.createElement("label");
      label.className = "picker-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = item.id;
      checkbox.checked = storyDraftIds.includes(item.id);
      const copy = document.createElement("span");
      copy.className = "picker-copy";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const meta = document.createElement("span");
      meta.textContent = `${formatDateInline(item.start)} · ${getCategory(item.categoryId).name}`;
      copy.append(title, meta);
      label.append(checkbox, copy);
      return label;
    });
    els.storyPicker.replaceChildren(...pickerRows);

    const sequenceRows = storyDraftIds.map((id, index) => {
      const item = getItem(id);
      if (!item) return null;
      const row = document.createElement("li");
      row.className = "sequence-row";
      row.dataset.id = id;
      const number = document.createElement("span");
      number.className = "sequence-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("span");
      title.className = "sequence-title";
      title.textContent = item.title;
      const actions = document.createElement("div");
      actions.className = "sequence-actions";
      const up = actionButton("↑", "story-up", `Move ${item.title} earlier`);
      const down = actionButton("↓", "story-down", `Move ${item.title} later`);
      const remove = actionButton("×", "story-remove", `Remove ${item.title} from story`, "delete");
      up.disabled = index === 0;
      down.disabled = index === storyDraftIds.length - 1;
      actions.append(up, down, remove);
      row.append(number, title, actions);
      return row;
    }).filter(Boolean);
    els.storySequence.replaceChildren(...sequenceRows);
  }

  function resetStoryForm() {
    els.storyForm.reset();
    els.storyId.value = "";
    storyDraftIds = [];
    els.saveStory.textContent = "Create story";
    els.cancelStoryEdit.hidden = true;
    setError(els.storyFormError);
    renderStoryBuilder();
  }

  function beginStoryEdit(id) {
    const story = getStory(id);
    if (!story) return;
    setActivePanel("stories");
    els.storyId.value = story.id;
    els.storyTitle.value = story.title;
    els.storyDescription.value = story.description;
    storyDraftIds = [...story.itemIds];
    els.saveStory.textContent = "Save story";
    els.cancelStoryEdit.hidden = false;
    setError(els.storyFormError);
    renderStoryBuilder();
    els.storyTitle.focus();
  }

  function removeStory(id) {
    const story = getStory(id);
    if (!story || !window.confirm(`Delete story “${story.title}”? Timeline items will not be deleted.`)) return;
    state.stories = state.stories.filter((candidate) => candidate.id !== id);
    if (els.storyId.value === id) resetStoryForm();
    if (ui.activeStoryId === id) exitStoryFocus(false);
    persist();
    renderAll();
    showStatus("Story deleted. Timeline items were preserved.");
  }

  function renderStories() {
    els.savedStoryCount.textContent = `${state.stories.length}`;
    const cards = state.stories.map((story) => {
      const card = document.createElement("article");
      card.className = "story-card";
      card.dataset.id = story.id;
      const top = document.createElement("div");
      top.className = "story-card-top";
      const copy = document.createElement("div");
      const title = document.createElement("h4");
      title.textContent = story.title;
      copy.append(title);
      if (story.description) {
        const description = document.createElement("p");
        description.textContent = story.description;
        copy.append(description);
      }
      const actions = document.createElement("div");
      actions.className = "story-actions";
      actions.append(
        actionButton("Focus", "focus-story", `Focus story ${story.title}`),
        actionButton("Edit", "edit-story", `Edit story ${story.title}`),
        actionButton("Delete", "delete-story", `Delete story ${story.title}`, "delete")
      );
      top.append(copy, actions);
      const meta = document.createElement("div");
      meta.className = "story-meta";
      meta.textContent = `${story.itemIds.length} ${story.itemIds.length === 1 ? "step" : "steps"}`;
      card.append(top, meta);
      return card;
    });
    if (!cards.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent = "No stories yet. Select timeline items above to create a focused narrative path.";
      cards.push(empty);
    }
    els.storyList.replaceChildren(...cards);
  }

  function focusStory(id) {
    const story = getStory(id);
    if (!story) return;
    if (!story.itemIds.length) {
      showStatus("This story has no timeline items yet.");
      return;
    }
    ui.activeStoryId = id;
    ui.storyCursor = 0;
    ui.search = "";
    ui.categoryFilter = "all";
    els.search.value = "";
    els.categoryFilter.value = "all";
    renderTimeline();
    focusCurrentStoryItem();
  }

  function focusCurrentStoryItem() {
    const story = getStory(ui.activeStoryId);
    if (!story || !story.itemIds.length) return;
    const currentId = story.itemIds[ui.storyCursor];
    requestAnimationFrame(() => {
      const element = els.list.querySelector(`[data-id="${CSS.escape(currentId)}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function stepStory(delta) {
    const story = getStory(ui.activeStoryId);
    if (!story) return;
    ui.storyCursor = Math.max(0, Math.min(story.itemIds.length - 1, ui.storyCursor + delta));
    renderTimeline();
    focusCurrentStoryItem();
  }

  function exitStoryFocus(render = true) {
    ui.activeStoryId = null;
    ui.storyCursor = 0;
    if (render) renderTimeline();
  }

  function resetCategoryForm() {
    els.categoryForm.reset();
    els.categoryId.value = "";
    els.categoryColor.value = "#667085";
    els.saveCategory.textContent = "Add category";
    els.cancelCategoryEdit.hidden = true;
    setError(els.categoryFormError);
  }

  function beginCategoryEdit(id) {
    const category = getCategory(id);
    if (!category) return;
    setActivePanel("categories");
    els.categoryId.value = category.id;
    els.categoryName.value = category.name;
    els.categoryColor.value = category.color;
    els.saveCategory.textContent = "Save category";
    els.cancelCategoryEdit.hidden = false;
    setError(els.categoryFormError);
    els.categoryName.focus();
  }

  function removeCategory(id) {
    const category = state.categories.find((candidate) => candidate.id === id);
    if (!category) return;
    if (state.categories.length <= 1) {
      showStatus("A timeline must keep at least one category.");
      return;
    }
    const usage = state.items.filter((item) => item.categoryId === id).length;
    const replacement = state.categories.find((candidate) => candidate.id !== id);
    const detail = usage ? ` ${usage} ${usage === 1 ? "item" : "items"} will be reassigned to “${replacement.name}”.` : "";
    if (!window.confirm(`Delete category “${category.name}”?${detail}`)) return;
    state.categories = state.categories.filter((candidate) => candidate.id !== id);
    state.items = state.items.map((item) => item.categoryId === id ? { ...item, categoryId: replacement.id } : item);
    if (ui.categoryFilter === id) ui.categoryFilter = "all";
    if (els.categoryId.value === id) resetCategoryForm();
    persist();
    renderAll();
    showStatus("Category deleted.");
  }

  function renderCategories() {
    const rows = state.categories.map((category) => {
      const usage = state.items.filter((item) => item.categoryId === category.id).length;
      const row = document.createElement("div");
      row.className = "category-row";
      row.dataset.id = category.id;
      row.style.setProperty("--category-color", category.color);
      const identity = document.createElement("div");
      identity.className = "category-identity";
      const dot = document.createElement("span");
      dot.className = "category-dot";
      const copy = document.createElement("span");
      copy.className = "category-copy";
      const name = document.createElement("strong");
      name.textContent = category.name;
      const meta = document.createElement("span");
      meta.textContent = `${usage} ${usage === 1 ? "item" : "items"}`;
      copy.append(name, meta);
      identity.append(dot, copy);
      const actions = document.createElement("div");
      actions.className = "category-actions-inline";
      actions.append(
        actionButton("Edit", "edit-category", `Edit category ${category.name}`),
        actionButton("Delete", "delete-category", `Delete category ${category.name}`, "delete")
      );
      row.append(identity, actions);
      return row;
    });
    els.categoryList.replaceChildren(...rows);
  }

  function renderAll() {
    renderProjectMeta();
    renderCategoryOptions();
    renderStoryBuilder();
    renderStories();
    renderCategories();
    renderTimeline();
  }

  function slug(value) {
    const result = String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    return result || "timeline";
  }

  function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function toMarkdown() {
    const title = state.title.trim() || "Untitled timeline";
    const lines = [`# ${title}`, "", "## Chronology", ""];
    for (const item of sortItems()) {
      const category = getCategory(item.categoryId);
      const when = item.kind === "range"
        ? `${formatDateInline(item.start)} → ${formatDateInline(item.end)}`
        : formatDateInline(item.start);
      lines.push(`### ${when} — ${item.title}`, "", `Type: ${item.kind}  `, `Category: ${category.name}`);
      if (item.location) {
        const place = item.location.name || item.location.geographicIdentifier || item.location.address || "Coordinates";
        const coordinates = item.location.geometry?.coordinates;
        lines.push(`Location: ${place}${coordinates ? ` (${coordinates[1]}, ${coordinates[0]})` : ""}  `);
      }
      if (item.description) lines.push("", item.description);
      lines.push("");
    }

    if (state.stories.length) {
      lines.push("## Stories", "");
      for (const story of state.stories) {
        lines.push(`### ${story.title}`, "");
        if (story.description) lines.push(story.description, "");
        story.itemIds.forEach((itemId, index) => {
          const item = getItem(itemId);
          if (!item) return;
          const when = item.kind === "range"
            ? `${formatDateInline(item.start)} → ${formatDateInline(item.end)}`
            : formatDateInline(item.start);
          lines.push(`${index + 1}. **${item.title}** — ${when}`);
        });
        lines.push("");
      }
    }

    if (state.relationships.length) {
      lines.push("## Temporal relationships", "");
      for (const relationship of state.relationships) {
        const when = relationship.time
          ? temporal.intervalRepresentation(relationship.time)
          : "untimed";
        lines.push(
          `- ${relationship.subjectId} —${relationship.predicate}→ ${relationship.objectId} (${when})`
        );
      }
      lines.push("");
    }

    lines.push("## Categories", "");
    for (const category of state.categories) {
      const usage = state.items.filter((item) => item.categoryId === category.id).length;
      lines.push(`- ${category.name} (${usage})`);
    }
    return `${lines.join("\n").trim()}\n`;
  }

  function showStatus(message) {
    window.clearTimeout(statusTimer);
    els.status.textContent = message;
    els.status.classList.add("visible");
    statusTimer = window.setTimeout(() => els.status.classList.remove("visible"), 2800);
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActivePanel(tab.dataset.panel));
    tab.addEventListener("keydown", (event) => {
      if (![/ArrowLeft/, /ArrowRight/].some((pattern) => pattern.test(event.key))) return;
      event.preventDefault();
      const current = els.tabs.indexOf(tab);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = els.tabs[(current + delta + els.tabs.length) % els.tabs.length];
      setActivePanel(next.dataset.panel);
      next.focus();
    });
  });

  els.itemStartPrecision.addEventListener("change", () => configureTemporalEndpoint("Start"));
  els.itemEndPrecision.addEventListener("change", () => configureTemporalEndpoint("End"));
  els.itemStartDate.addEventListener("change", () => {
    els.itemEndDate.min = els.itemStartDate.value;
    if (els.itemKind.value === "range" && !els.itemEndDate.value) els.itemEndDate.value = els.itemStartDate.value;
  });

  els.itemKind.addEventListener("change", () => {
    const isRange = els.itemKind.value === "range";
    els.endField.hidden = !isRange;
    els.itemEndDate.required = isRange;
    if (isRange && !els.itemEndDate.value) {
      els.itemEndDate.value = els.itemStartDate.value;
      els.itemEndPrecision.value = els.itemStartPrecision.value;
      els.itemEndCertainty.value = els.itemStartCertainty.value;
      els.itemEndZone.value = els.itemStartZone.value;
      if (els.itemStartTime.value) els.itemEndTime.value = els.itemStartTime.value;
      configureTemporalEndpoint("End");
    }
  });

  els.itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(els.itemFormError);
    const kind = els.itemKind.value === "range" ? "range" : "event";
    const title = els.itemTitle.value.trim();

    let startEndpoint;
    let endEndpoint = null;
    let location = null;
    try {
      startEndpoint = endpointFromForm("Start");
      if (kind === "range") endEndpoint = endpointFromForm("End");
      if (endEndpoint && temporal.sortKey(endEndpoint) < temporal.sortKey(startEndpoint)) {
        throw new Error("The range end cannot be earlier than its start.");
      }
      location = spatial.fromForm({
        name: els.itemLocationName.value,
        geographicIdentifier: els.itemLocationIdentifier.value,
        address: els.itemLocationAddress.value,
        latitude: els.itemLocationLatitude.value,
        longitude: els.itemLocationLongitude.value,
        source: els.itemLocationSource.value,
        accuracyMeters: els.itemLocationAccuracy.value
      });
    } catch (error) {
      setError(els.itemFormError, error instanceof Error ? error.message : "Check the temporal or location values.");
      els.itemStartDate.focus();
      return;
    }

    if (!title) {
      setError(els.itemFormError, "A title is required.");
      els.itemTitle.focus();
      return;
    }

    const item = {
      id: els.itemId.value || newId("item"),
      kind,
      start: startEndpoint.value,
      end: kind === "range" ? endEndpoint.value : null,
      time: {
        type: kind === "range" ? "interval" : "instant",
        start: startEndpoint,
        end: kind === "range" ? endEndpoint : null
      },
      title: title.slice(0, 160),
      description: els.itemDescription.value.trim().slice(0, 2000),
      categoryId: state.categories.some((category) => category.id === els.itemCategory.value)
        ? els.itemCategory.value
        : state.categories[0].id
    };
    if (location) item.location = location;

    const index = state.items.findIndex((candidate) => candidate.id === item.id);
    if (index >= 0) {
      state.items[index] = item;
      showStatus("Timeline item updated.");
    } else {
      state.items.push(item);
      showStatus(`${kind === "range" ? "Range" : "Event"} added.`);
    }
    persist();
    resetItemForm();
    renderAll();
    els.itemStartDate.focus();
  });

  els.cancelItemEdit.addEventListener("click", resetItemForm);

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const itemElement = event.target.closest(".timeline-item");
    if (!button || !itemElement) return;
    if (button.dataset.action === "edit-item") beginItemEdit(itemElement.dataset.id);
    if (button.dataset.action === "delete-item") removeItem(itemElement.dataset.id);
    if (button.dataset.action === "story-focus") {
      ui.storyCursor = Number(button.dataset.storyIndex);
      renderTimeline();
      focusCurrentStoryItem();
    }
  });

  els.storyPicker.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    if (checkbox.checked && !storyDraftIds.includes(checkbox.value)) storyDraftIds.push(checkbox.value);
    if (!checkbox.checked) storyDraftIds = storyDraftIds.filter((id) => id !== checkbox.value);
    renderStoryBuilder();
  });

  els.storySequence.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".sequence-row");
    if (!button || !row) return;
    const index = storyDraftIds.indexOf(row.dataset.id);
    if (index < 0) return;
    if (button.dataset.action === "story-up" && index > 0) {
      [storyDraftIds[index - 1], storyDraftIds[index]] = [storyDraftIds[index], storyDraftIds[index - 1]];
    }
    if (button.dataset.action === "story-down" && index < storyDraftIds.length - 1) {
      [storyDraftIds[index + 1], storyDraftIds[index]] = [storyDraftIds[index], storyDraftIds[index + 1]];
    }
    if (button.dataset.action === "story-remove") storyDraftIds.splice(index, 1);
    renderStoryBuilder();
  });

  els.storyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(els.storyFormError);
    const title = els.storyTitle.value.trim();
    if (!title) {
      setError(els.storyFormError, "A story title is required.");
      els.storyTitle.focus();
      return;
    }
    if (!storyDraftIds.length) {
      setError(els.storyFormError, "Select at least one timeline item for this story.");
      return;
    }
    const story = {
      id: els.storyId.value || newId("story"),
      title: title.slice(0, 160),
      description: els.storyDescription.value.trim().slice(0, 1500),
      itemIds: [...storyDraftIds]
    };
    const index = state.stories.findIndex((candidate) => candidate.id === story.id);
    if (index >= 0) {
      state.stories[index] = story;
      showStatus("Story updated.");
    } else {
      state.stories.push(story);
      showStatus("Story created.");
    }
    persist();
    resetStoryForm();
    renderAll();
  });

  els.cancelStoryEdit.addEventListener("click", resetStoryForm);

  els.storyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const card = event.target.closest(".story-card");
    if (!button || !card) return;
    if (button.dataset.action === "focus-story") focusStory(card.dataset.id);
    if (button.dataset.action === "edit-story") beginStoryEdit(card.dataset.id);
    if (button.dataset.action === "delete-story") removeStory(card.dataset.id);
  });

  els.categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(els.categoryFormError);
    const name = els.categoryName.value.trim();
    if (!name) {
      setError(els.categoryFormError, "A category name is required.");
      els.categoryName.focus();
      return;
    }
    const editingId = els.categoryId.value;
    const duplicate = state.categories.some((category) => category.id !== editingId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      setError(els.categoryFormError, "Category names must be unique.");
      els.categoryName.focus();
      return;
    }
    const category = {
      id: editingId || newId("category"),
      name: name.slice(0, 60),
      color: normalizeColor(els.categoryColor.value)
    };
    const index = state.categories.findIndex((candidate) => candidate.id === category.id);
    if (index >= 0) {
      state.categories[index] = category;
      showStatus("Category updated.");
    } else {
      state.categories.push(category);
      showStatus("Category added.");
    }
    persist();
    resetCategoryForm();
    renderAll();
  });

  els.cancelCategoryEdit.addEventListener("click", resetCategoryForm);

  els.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".category-row");
    if (!button || !row) return;
    if (button.dataset.action === "edit-category") beginCategoryEdit(row.dataset.id);
    if (button.dataset.action === "delete-category") removeCategory(row.dataset.id);
  });

  els.search.addEventListener("input", () => {
    ui.search = els.search.value;
    renderTimeline();
  });

  els.categoryFilter.addEventListener("change", () => {
    ui.categoryFilter = els.categoryFilter.value;
    renderTimeline();
  });

  els.clearFilters.addEventListener("click", () => {
    ui.search = "";
    ui.categoryFilter = "all";
    els.search.value = "";
    els.categoryFilter.value = "all";
    renderTimeline();
  });

  els.storyPrev.addEventListener("click", () => stepStory(-1));
  els.storyNext.addEventListener("click", () => stepStory(1));
  els.storyExit.addEventListener("click", () => exitStoryFocus());

  els.title.addEventListener("input", () => {
    state.title = els.title.value.slice(0, 120);
    els.heading.textContent = state.title.trim() || "Untitled timeline";
    persist();
  });

  els.loadSample.addEventListener("click", () => {
    if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the example dataset?")) return;
    state = normalizeTimeline(clone(SAMPLE));
    ui.search = "";
    ui.categoryFilter = "all";
    ui.activeStoryId = null;
    ui.storyCursor = 0;
    els.search.value = "";
    resetItemForm();
    resetStoryForm();
    resetCategoryForm();
    persist();
    renderAll();
    showStatus("Example timeline loaded.");
  });

  function applyImportedTimeline(imported, statusPrefix = "Imported", warningCount = 0) {
    state = normalizeTimeline(imported);
    ui.search = "";
    ui.categoryFilter = "all";
    ui.activeStoryId = null;
    ui.storyCursor = 0;
    els.search.value = "";
    resetItemForm();
    resetStoryForm();
    resetCategoryForm();
    persist();
    renderAll();
    const warningText = warningCount ? ` · ${warningCount} conversion ${warningCount === 1 ? "warning" : "warnings"}` : "";
    showStatus(`${statusPrefix} ${state.items.length} ${state.items.length === 1 ? "item" : "items"} and ${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}${warningText}.`);
  }

  els.importJson.addEventListener("change", async () => {
    const file = els.importJson.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
      const raw = JSON.parse(await file.text());
      const timeGraphics = globalThis.TimeGraphicsAdapter;
      const converted = timeGraphics?.isLikelyTimeGraphics(raw) ? timeGraphics.importData(raw) : null;
      const imported = converted?.timeline || raw;
      if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the imported file?")) return;
      applyImportedTimeline(
        imported,
        converted ? "Imported Time.Graphics" : "Imported",
        converted?.warnings?.length || 0
      );
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Could not import that file.");
    } finally {
      els.importJson.value = "";
    }
  });

  els.importTimeGraphics.addEventListener("change", async () => {
    const file = els.importTimeGraphics.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
      const adapter = globalThis.TimeGraphicsAdapter;
      if (!adapter) throw new Error("Time.Graphics adapter is unavailable.");
      const converted = adapter.importData(await file.text());
      if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the Time.Graphics export?")) return;
      applyImportedTimeline(converted.timeline, "Imported Time.Graphics", converted.warnings.length);
      if (converted.warnings.length) console.warn("Time.Graphics import warnings:", converted.warnings);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Could not import that Time.Graphics export.");
    } finally {
      els.importTimeGraphics.value = "";
    }
  });

  els.exportJson.addEventListener("click", () => {
    download(`${JSON.stringify(state, null, 2)}\n`, `${slug(state.title)}.json`, "application/json;charset=utf-8");
    showStatus("JSON exported.");
  });

  els.exportTimeGraphics.addEventListener("click", () => {
    const adapter = globalThis.TimeGraphicsAdapter;
    if (!adapter) {
      showStatus("Time.Graphics adapter is unavailable.");
      return;
    }
    const exported = adapter.exportData(state);
    download(
      `${JSON.stringify(exported, null, 2)}\n`,
      `${slug(state.title)}.timegraphics.json`,
      "application/json;charset=utf-8"
    );
    showStatus("Time.Graphics interchange JSON exported.");
  });

  els.exportMarkdown.addEventListener("click", () => {
    download(toMarkdown(), `${slug(state.title)}.md`, "text/markdown;charset=utf-8");
    showStatus("Markdown exported.");
  });

  els.clear.addEventListener("click", () => {
    if ((state.items.length || state.stories.length || state.title) && !window.confirm("Clear this timeline? This removes its locally stored items and stories.")) return;
    state = blankTimeline();
    ui.search = "";
    ui.categoryFilter = "all";
    ui.activeStoryId = null;
    ui.storyCursor = 0;
    els.search.value = "";
    resetItemForm();
    resetStoryForm();
    resetCategoryForm();
    persist();
    renderAll();
    showStatus("Timeline cleared.");
  });

  fillTimeZoneOptions();
  resetItemForm();
  resetStoryForm();
  resetCategoryForm();
  setActivePanel("items");
  renderAll();
})();
