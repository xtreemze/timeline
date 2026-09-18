(() => {
  "use strict";

  const VERSION = 2;
  const STORAGE_KEY = "timeline:v2";
  const LEGACY_STORAGE_KEY = "timeline:v1";
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;
  const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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
    title: "Timeline v2 launch",
    categories: [
      { id: "decision", name: "Decision", color: "#2563eb" },
      { id: "build", name: "Build", color: "#c4320a" },
      { id: "release", name: "Release", color: "#7a5af8" },
      { id: "research", name: "Research", color: "#027a48" }
    ],
    items: [
      {
        id: "sample-problem",
        kind: "event",
        start: "2026-09-11T09:00",
        end: null,
        title: "Problem framed",
        description: "Define chronology as the primary model and keep the tool local-first, portable, and understandable without a backend.",
        categoryId: "decision"
      },
      {
        id: "sample-sprint",
        kind: "range",
        start: "2026-09-11T10:00",
        end: "2026-09-13T18:00",
        title: "Interaction and data-model sprint",
        description: "Develop events, ranges, editable categories, responsive layout, data migration, and the story model as one coherent system.",
        categoryId: "build"
      },
      {
        id: "sample-model",
        kind: "event",
        start: "2026-09-12T14:30",
        end: null,
        title: "Story references become non-destructive",
        description: "Stories reference canonical item IDs rather than copying events, allowing one moment to participate in multiple narratives.",
        categoryId: "decision"
      },
      {
        id: "sample-review",
        kind: "event",
        start: "2026-09-13T16:15",
        end: null,
        title: "Responsive behavior reviewed",
        description: "Desktop, tablet, and narrow-screen layouts use the same information architecture with progressive stacking rather than separate interfaces.",
        categoryId: "research"
      },
      {
        id: "sample-release",
        kind: "event",
        start: "2026-09-14T09:30",
        end: null,
        title: "Timeline v2 published",
        description: "The browser application can now model chronology and narrative focus independently while preserving portable JSON and Markdown exports.",
        categoryId: "release"
      }
    ],
    stories: [
      {
        id: "sample-story",
        title: "From chronology to narrative",
        description: "Follow the decisions and implementation moments that transformed a simple event list into a richer chronology workspace.",
        itemIds: ["sample-problem", "sample-sprint", "sample-model", "sample-review", "sample-release"]
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
    loadSample: document.querySelector("#load-sample"),
    importJson: document.querySelector("#import-json"),
    exportJson: document.querySelector("#export-json"),
    exportMarkdown: document.querySelector("#export-markdown"),
    clear: document.querySelector("#clear-timeline"),
    tabs: [...document.querySelectorAll(".tab")],
    panels: [...document.querySelectorAll(".editor-section")],

    itemForm: document.querySelector("#item-form"),
    itemId: document.querySelector("#item-id"),
    itemKind: document.querySelector("#item-kind"),
    itemCategory: document.querySelector("#item-category"),
    itemStart: document.querySelector("#item-start"),
    itemEnd: document.querySelector("#item-end"),
    endField: document.querySelector("#end-field"),
    itemTitle: document.querySelector("#item-title"),
    itemDescription: document.querySelector("#item-description"),
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

  function newId(prefix = "id") {
    const random = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseDate(value) {
    if (typeof value !== "string") return null;
    const match = DATE_PATTERN.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = match[4] === undefined ? null : Number(match[4]);
    const minute = match[5] === undefined ? null : Number(match[5]);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (hour !== null && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) return null;

    const probe = new Date(Date.UTC(year, month - 1, day, hour ?? 0, minute ?? 0));
    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day ||
      (hour !== null && (probe.getUTCHours() !== hour || probe.getUTCMinutes() !== minute))
    ) return null;

    return {
      year,
      month,
      day,
      hour,
      minute,
      hasTime: hour !== null,
      sortKey: probe.getTime()
    };
  }

  function formatDateParts(value) {
    const parsed = parseDate(value);
    if (!parsed) return { date: value || "Unknown", time: "" };
    const dateObject = new Date(parsed.sortKey);
    const date = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(dateObject);
    const time = parsed.hasTime
      ? new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC"
        }).format(dateObject)
      : "";
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
      categories.push({ id, name, color: normalizeColor(raw.color) });
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
      const start = typeof raw.start === "string" ? raw.start.trim() : "";
      const end = kind === "range" && typeof raw.end === "string" ? raw.end.trim() : null;
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
      const startParsed = parseDate(start);
      if (!startParsed) throw new Error(`Item ${index + 1} has an invalid start date: ${start || "(missing)"}.`);
      if (!title) throw new Error(`Item ${index + 1} is missing a title.`);
      if (kind === "range") {
        const endParsed = parseDate(end || "");
        if (!endParsed) throw new Error(`Range ${index + 1} has an invalid end date: ${end || "(missing)"}.`);
        if (endParsed.sortKey < startParsed.sortKey) throw new Error(`Range ${index + 1} ends before it starts.`);
      }

      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("item"),
        kind,
        start,
        end: kind === "range" ? end : null,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : "",
        categoryId: ensureCategory(raw.categoryId || raw.category)
      };
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
      return {
        id,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 1500) : "",
        itemIds: uniqueIds
      };
    });

    return {
      version: VERSION,
      title: typeof input.title === "string" ? input.title.slice(0, 120) : "",
      categories,
      items,
      stories
    };
  }

  function blankTimeline() {
    return { version: VERSION, title: "", categories: clone(DEFAULT_CATEGORIES), items: [], stories: [] };
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
      items = items.filter((item) => `${item.title}\n${item.description}`.toLocaleLowerCase().includes(needle));
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
        start: parseDate(item.start).sortKey,
        end: item.end ? parseDate(item.end).sortKey : null,
        startLabel: formatDateInline(item.start),
        endLabel: item.end ? formatDateInline(item.end) : ""
      };
    }), { focusId: storyCurrentId });
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

  function resetItemForm() {
    els.itemForm.reset();
    els.itemId.value = "";
    els.itemKind.value = "event";
    els.endField.hidden = true;
    els.itemEnd.required = false;
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
    els.itemStart.value = item.start;
    els.itemEnd.value = item.end || "";
    els.endField.hidden = item.kind !== "range";
    els.itemEnd.required = item.kind === "range";
    fillCategorySelect(els.itemCategory, false, item.categoryId);
    els.itemTitle.value = item.title;
    els.itemDescription.value = item.description;
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

  els.itemKind.addEventListener("change", () => {
    const isRange = els.itemKind.value === "range";
    els.endField.hidden = !isRange;
    els.itemEnd.required = isRange;
    if (!isRange) els.itemEnd.value = "";
  });

  els.itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(els.itemFormError);
    const kind = els.itemKind.value === "range" ? "range" : "event";
    const start = els.itemStart.value.trim();
    const end = els.itemEnd.value.trim();
    const title = els.itemTitle.value.trim();
    const startParsed = parseDate(start);
    if (!startParsed) {
      setError(els.itemFormError, "Use YYYY-MM-DD or YYYY-MM-DDTHH:MM for the start date.");
      els.itemStart.focus();
      return;
    }
    if (kind === "range") {
      const endParsed = parseDate(end);
      if (!endParsed) {
        setError(els.itemFormError, "A range needs a valid end date.");
        els.itemEnd.focus();
        return;
      }
      if (endParsed.sortKey < startParsed.sortKey) {
        setError(els.itemFormError, "The range end cannot be earlier than its start.");
        els.itemEnd.focus();
        return;
      }
    }
    if (!title) {
      setError(els.itemFormError, "A title is required.");
      els.itemTitle.focus();
      return;
    }

    const item = {
      id: els.itemId.value || newId("item"),
      kind,
      start,
      end: kind === "range" ? end : null,
      title: title.slice(0, 160),
      description: els.itemDescription.value.trim().slice(0, 2000),
      categoryId: state.categories.some((category) => category.id === els.itemCategory.value)
        ? els.itemCategory.value
        : state.categories[0].id
    };
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
    els.itemStart.focus();
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

  els.importJson.addEventListener("change", async () => {
    const file = els.importJson.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
      const imported = normalizeTimeline(JSON.parse(await file.text()));
      if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the imported file?")) return;
      state = imported;
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
      showStatus(`Imported ${state.items.length} ${state.items.length === 1 ? "item" : "items"} and ${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}.`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Could not import that file.");
    } finally {
      els.importJson.value = "";
    }
  });

  els.exportJson.addEventListener("click", () => {
    download(`${JSON.stringify(state, null, 2)}\n`, `${slug(state.title)}.json`, "application/json;charset=utf-8");
    showStatus("JSON exported.");
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

  resetItemForm();
  resetStoryForm();
  resetCategoryForm();
  setActivePanel("items");
  renderAll();
})();
