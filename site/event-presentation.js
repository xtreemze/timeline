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
    "note",
    "home",
    "danger",
    "magic",
    "search",
    "crown",
    "object"
  ]);

  const ICON_PATHS = Object.freeze({
    milestone: ["M12 3v18", "M3 12h18", "M7 7l10 10", "M17 7 7 17"],
    decision: ["M12 3 4 8v8l8 5 8-5V8z", "m8 12 2.5 2.5L16 9"],
    evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
    person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
    place: ["M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z", "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    media: ["M4 5h16v14H4z", "m7 15 3-3 2 2 3-4 3 5", "M9 9h.01"],
    relation: ["M7 7h10", "M7 17h10", "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"],
    note: ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"],
    home: ["M3 11.5 12 3 9 7.5", "M5.5 10.5V21h13V10.5", "M9.5 21v-6h5v6"],
    danger: ["M12 3 2.5 20h19z", "M12 9v5", "M12 18h.01"],
    magic: ["m12 2 1.2 3.2L16.5 6.5l-3.3 1.3L12 11l-1.2-3.2-3.3-1.3 3.3-1.3z", "m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z", "M5 15v6", "M2 18h6"],
    search: ["M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z", "m16 16 5 5"],
    crown: ["m3 7 4 4 5-7 5 7 4-4-2 11H5z", "M6 21h12"],
    object: ["M12 3 20 7 12 11 4 7z", "M4 7v10l8 4 8-4V7", "M12 11v10"],
    landscape: ["M3 5h18v14H3z", "M8 16h8"],
    portrait: ["M6 2h12v20H6z", "M10 18h4"],
    fullscreen: ["M8 3H3v5", "M16 3h5v5", "M8 21H3v-5", "M16 21h5v-5"],
    minimize: ["M3 8h5V3", "M21 8h-5V3", "M3 16h5v5", "M21 16h-5v5"],
    play: ["M8 5 19 12 8 19z"],
    pause: ["M8 5v14", "M16 5v14"]
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeMediaSource(value) {
    const source = typeof value === "string" ? value.trim() : "";
    if (!source) return "";
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)) return source;
    try {
      const url = new URL(source, globalThis.document?.baseURI || "https://example.invalid/");
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
      if (url.origin === new URL(globalThis.document?.baseURI || "https://example.invalid/").origin) return url.href;
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
    const iconName = Object.prototype.hasOwnProperty.call(ICON_PATHS, name) ? name : "note";
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
    element.append(createIcon(normalized.icon, { size: 18 }));
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
