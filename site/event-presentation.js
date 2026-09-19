(() => {
  "use strict";

  const MAX_MEDIA = 3;
  const MAX_TAGS = 6;
  const ICON_NAMES = Object.freeze([
    "milestone",
    "decision",
    "evidence",
    "person",
    "place",
    "media",
    "relation",
    "note"
  ]);

  const ICON_PATHS = Object.freeze({
    milestone: ["M12 3v18", "M3 12h18", "M7 7l10 10", "M17 7 7 17"],
    decision: ["M12 3 4 8v8l8 5 8-5V8z", "m8 12 2.5 2.5L16 9"],
    evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
    person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
    place: ["M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z", "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    media: ["M4 5h16v14H4z", "m7 15 3-3 2 2 3-4 3 5", "M9 9h.01"],
    relation: ["M7 7h10", "M7 17h10", "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"],
    note: ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"]
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeMediaSource(value) {
    const source = typeof value === "string" ? value.trim() : "";
    if (!source) return "";
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)) return source;
    try {
      const url = new URL(source, document?.baseURI || "https://example.invalid/");
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
      if (url.origin === new URL(document?.baseURI || "https://example.invalid/").origin) return url.href;
    } catch {
      return "";
    }
    return "";
  }

  function normalizeMedia(value) {
    const source = Array.isArray(value) ? value : [];
    const media = [];
    for (const raw of source.slice(0, MAX_MEDIA)) {
      if (!raw || typeof raw !== "object") continue;
      const src = sanitizeMediaSource(raw.src || raw.url);
      if (!src) continue;
      media.push({
        src,
        alt: typeof raw.alt === "string" ? raw.alt.trim().slice(0, 240) : "",
        caption: typeof raw.caption === "string" ? raw.caption.trim().slice(0, 320) : ""
      });
    }
    return media;
  }

  function normalizeHue(value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return 30;
    return ((number % 360) + 360) % 360;
  }

  function normalizeTags(value) {
    const source = Array.isArray(value) ? value : [];
    const tags = [];
    for (const raw of source.slice(0, MAX_TAGS)) {
      if (!raw || typeof raw !== "object") continue;
      const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 48) : "";
      if (!label) continue;
      tags.push({
        label,
        icon: ICON_NAMES.includes(raw.icon) ? raw.icon : "note",
        hue: normalizeHue(raw.hue)
      });
    }
    return tags;
  }

  function createIcon(name, options = {}) {
    const iconName = ICON_NAMES.includes(name) ? name : "note";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(options.size || 16));
    svg.setAttribute("height", String(options.size || 16));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("semantic-icon");
    for (const definition of ICON_PATHS[iconName]) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", definition);
      svg.append(path);
    }
    return svg;
  }

  function createTag(tag) {
    const normalized = normalizeTags([tag])[0];
    if (!normalized) return null;
    const element = document.createElement("span");
    element.className = "event-tag";
    element.style.setProperty("--tag-hue", String(normalized.hue));
    element.append(createIcon(normalized.icon, { size: 14 }));
    const label = document.createElement("span");
    label.textContent = normalized.label;
    element.append(label);
    return element;
  }

  globalThis.TimelinePresentation = Object.freeze({
    ICON_NAMES,
    MAX_MEDIA,
    MAX_TAGS,
    createIcon,
    createTag,
    normalizeHue,
    normalizeMedia,
    normalizeTags,
    sanitizeMediaSource
  });
})();
