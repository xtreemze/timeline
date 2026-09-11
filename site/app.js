(() => {
  "use strict";

  const STORAGE_KEY = "timeline:v1";
  const VERSION = 1;
  const CATEGORIES = new Set(["event", "decision", "milestone", "evidence", "communication", "project"]);
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

  const sample = {
    version: VERSION,
    title: "Timeline project launch",
    events: [
      {
        id: "sample-1",
        date: "2026-09-11T09:00",
        title: "Problem framed",
        description: "Define a small local-first tool where chronology is the primary model, not an afterthought layered onto prose or a spreadsheet.",
        category: "decision"
      },
      {
        id: "sample-2",
        date: "2026-09-11T10:15",
        title: "Repository created",
        description: "Establish the public project, data contract, and MIT licensing boundary.",
        category: "milestone"
      },
      {
        id: "sample-3",
        date: "2026-09-11T11:20",
        title: "Browser prototype published",
        description: "Ship a zero-dependency editor with local persistence and portable JSON and Markdown exports.",
        category: "project"
      },
      {
        id: "sample-4",
        date: "2026-09-12",
        title: "Refine temporal model",
        description: "Explore ranges, approximate dates, provenance, and uncertainty without sacrificing readability.",
        category: "event"
      }
    ]
  };

  const els = {
    title: document.querySelector("#timeline-title"),
    heading: document.querySelector("#timeline-heading"),
    count: document.querySelector("#event-count"),
    list: document.querySelector("#timeline-list"),
    empty: document.querySelector("#empty-state"),
    form: document.querySelector("#event-form"),
    formError: document.querySelector("#form-error"),
    id: document.querySelector("#event-id"),
    date: document.querySelector("#event-date"),
    eventTitle: document.querySelector("#event-title"),
    description: document.querySelector("#event-description"),
    category: document.querySelector("#event-category"),
    save: document.querySelector("#save-event"),
    cancel: document.querySelector("#cancel-edit"),
    loadSample: document.querySelector("#load-sample"),
    importJson: document.querySelector("#import-json"),
    exportJson: document.querySelector("#export-json"),
    exportMarkdown: document.querySelector("#export-markdown"),
    clear: document.querySelector("#clear-timeline"),
    status: document.querySelector("#status")
  };

  let state = loadState();
  let statusTimer = 0;

  function newId() {
    return typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseDate(value) {
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
      sortKey: Date.UTC(year, month - 1, day, hour ?? 0, minute ?? 0)
    };
  }

  function formatDate(value) {
    const parsed = parseDate(value);
    if (!parsed) return { date: value, time: "" };

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

  function normalizeTimeline(input) {
    if (!input || typeof input !== "object" || !Array.isArray(input.events)) {
      throw new Error("Expected a timeline object with an events array.");
    }

    const title = typeof input.title === "string" ? input.title.slice(0, 120) : "";
    const events = input.events.map((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`Event ${index + 1} is not an object.`);

      const date = typeof item.date === "string" ? item.date.trim() : "";
      const titleValue = typeof item.title === "string" ? item.title.trim().slice(0, 140) : "";
      if (!parseDate(date)) throw new Error(`Event ${index + 1} has an invalid date: ${date || "(missing)"}.`);
      if (!titleValue) throw new Error(`Event ${index + 1} is missing a title.`);

      const category = typeof item.category === "string" && CATEGORIES.has(item.category)
        ? item.category
        : "event";

      return {
        id: typeof item.id === "string" && item.id ? item.id.slice(0, 120) : newId(),
        date,
        title: titleValue,
        description: typeof item.description === "string" ? item.description.slice(0, 1200) : "",
        category
      };
    });

    return { version: VERSION, title, events };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeTimeline(JSON.parse(saved)) : { version: VERSION, title: "", events: [] };
    } catch (error) {
      console.warn("Timeline state could not be restored:", error);
      return { version: VERSION, title: "", events: [] };
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Timeline state could not be saved:", error);
      showStatus("Changes are visible, but browser storage is unavailable.");
    }
  }

  function sortedEvents() {
    return [...state.events].sort((a, b) => {
      const dateDelta = parseDate(a.date).sortKey - parseDate(b.date).sortKey;
      return dateDelta || a.title.localeCompare(b.title);
    });
  }

  function render() {
    els.title.value = state.title;
    els.heading.textContent = state.title.trim() || "Untitled timeline";

    const events = sortedEvents();
    els.count.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;
    els.empty.hidden = events.length > 0;
    els.list.hidden = events.length === 0;
    els.list.replaceChildren(...events.map(renderEvent));
  }

  function renderEvent(event) {
    const item = document.createElement("li");
    item.className = "timeline-item";
    item.dataset.id = event.id;

    const dateWrap = document.createElement("div");
    dateWrap.className = "timeline-date";
    const formatted = formatDate(event.date);
    const date = document.createElement("strong");
    date.textContent = formatted.date;
    dateWrap.append(date);
    if (formatted.time) {
      const time = document.createElement("span");
      time.textContent = formatted.time;
      dateWrap.append(time);
    }

    const marker = document.createElement("div");
    marker.className = "timeline-marker";
    marker.setAttribute("aria-hidden", "true");

    const card = document.createElement("article");
    card.className = "timeline-card";

    const top = document.createElement("div");
    top.className = "timeline-card-top";
    const title = document.createElement("h3");
    title.textContent = event.title;

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "icon-button";
    edit.dataset.action = "edit";
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", `Edit ${event.title}`);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button delete";
    remove.dataset.action = "delete";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${event.title}`);

    actions.append(edit, remove);
    top.append(title, actions);
    card.append(top);

    if (event.description) {
      const description = document.createElement("p");
      description.textContent = event.description;
      card.append(description);
    }

    const category = document.createElement("span");
    category.className = "category";
    category.textContent = event.category;
    card.append(category);

    item.append(dateWrap, marker, card);
    return item;
  }

  function setFormError(message = "") {
    els.formError.textContent = message;
    els.formError.hidden = !message;
  }

  function resetForm() {
    els.form.reset();
    els.id.value = "";
    els.category.value = "event";
    els.save.textContent = "Add event";
    els.cancel.hidden = true;
    setFormError();
  }

  function beginEdit(id) {
    const event = state.events.find((item) => item.id === id);
    if (!event) return;

    els.id.value = event.id;
    els.date.value = event.date;
    els.eventTitle.value = event.title;
    els.description.value = event.description;
    els.category.value = event.category;
    els.save.textContent = "Save changes";
    els.cancel.hidden = false;
    setFormError();
    els.eventTitle.focus();
    els.form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function removeEvent(id) {
    const event = state.events.find((item) => item.id === id);
    if (!event) return;
    if (!window.confirm(`Delete “${event.title}”?`)) return;

    state.events = state.events.filter((item) => item.id !== id);
    if (els.id.value === id) resetForm();
    persist();
    render();
    showStatus("Event deleted.");
  }

  function slug(value) {
    const result = value
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
    const lines = [`# ${title}`, ""];

    for (const event of sortedEvents()) {
      const formatted = formatDate(event.date);
      const when = formatted.time ? `${formatted.date}, ${formatted.time}` : formatted.date;
      lines.push(`## ${when} — ${event.title}`, "", `Category: ${event.category}`);
      if (event.description) lines.push("", event.description);
      lines.push("");
    }

    return `${lines.join("\n").trim()}\n`;
  }

  function showStatus(message) {
    window.clearTimeout(statusTimer);
    els.status.textContent = message;
    els.status.classList.add("visible");
    statusTimer = window.setTimeout(() => els.status.classList.remove("visible"), 2600);
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    setFormError();

    const date = els.date.value.trim();
    const title = els.eventTitle.value.trim();
    if (!parseDate(date)) {
      setFormError("Use YYYY-MM-DD or YYYY-MM-DDTHH:MM with a valid calendar date.");
      els.date.focus();
      return;
    }
    if (!title) {
      setFormError("Event title is required.");
      els.eventTitle.focus();
      return;
    }

    const next = {
      id: els.id.value || newId(),
      date,
      title: title.slice(0, 140),
      description: els.description.value.trim().slice(0, 1200),
      category: CATEGORIES.has(els.category.value) ? els.category.value : "event"
    };

    const existingIndex = state.events.findIndex((item) => item.id === next.id);
    if (existingIndex >= 0) {
      state.events[existingIndex] = next;
      showStatus("Event updated.");
    } else {
      state.events.push(next);
      showStatus("Event added.");
    }

    persist();
    resetForm();
    render();
    els.date.focus();
  });

  els.cancel.addEventListener("click", resetForm);

  els.title.addEventListener("input", () => {
    state.title = els.title.value.slice(0, 120);
    els.heading.textContent = state.title.trim() || "Untitled timeline";
    persist();
  });

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const item = event.target.closest(".timeline-item");
    if (!button || !item) return;

    if (button.dataset.action === "edit") beginEdit(item.dataset.id);
    if (button.dataset.action === "delete") removeEvent(item.dataset.id);
  });

  els.loadSample.addEventListener("click", () => {
    if (state.events.length && !window.confirm("Replace the current timeline with the example dataset?")) return;
    state = structuredClone(sample);
    persist();
    resetForm();
    render();
    showStatus("Example timeline loaded.");
  });

  els.importJson.addEventListener("change", async () => {
    const file = els.importJson.files?.[0];
    if (!file) return;

    try {
      if (file.size > 2_000_000) throw new Error("Import is limited to 2 MB.");
      const imported = normalizeTimeline(JSON.parse(await file.text()));
      if (state.events.length && !window.confirm("Replace the current timeline with the imported file?")) return;
      state = imported;
      persist();
      resetForm();
      render();
      showStatus(`Imported ${state.events.length} ${state.events.length === 1 ? "event" : "events"}.`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Could not import that file.");
    } finally {
      els.importJson.value = "";
    }
  });

  els.exportJson.addEventListener("click", () => {
    const exportState = { ...state, events: sortedEvents() };
    download(`${JSON.stringify(exportState, null, 2)}\n`, `${slug(state.title)}.json`, "application/json;charset=utf-8");
    showStatus("JSON exported.");
  });

  els.exportMarkdown.addEventListener("click", () => {
    download(toMarkdown(), `${slug(state.title)}.md`, "text/markdown;charset=utf-8");
    showStatus("Markdown exported.");
  });

  els.clear.addEventListener("click", () => {
    if (!state.events.length && !state.title) return;
    if (!window.confirm("Clear this timeline from local browser storage?")) return;
    state = { version: VERSION, title: "", events: [] };
    persist();
    resetForm();
    render();
    showStatus("Timeline cleared.");
  });

  render();
})();
