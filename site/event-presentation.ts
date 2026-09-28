/**
 * Timeline event presentation utilities
 * Media normalization, tag creation, semantic icon generation
 */

import {
  SEMANTIC_ICON_NAMES,
  normalizeSemanticIconName,
} from "../src/presentation/semantic-icons.ts";

const MAX_MEDIA = 3;
const MAX_TAGS = 6;

const ICON_NAMES = SEMANTIC_ICON_NAMES;

const ICON_PATHS: Record<string, string[]> = Object.freeze({
  milestone: ["M12 3v18", "M3 12h18", "M7 7l10 10", "M17 7 7 17"],
  decision: ["M12 3 4 8v8l8 5 8-5V8z", "m8 12 2.5 2.5L16 9"],
  evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
  person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  group: [
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M3 20a6 6 0 0 1 12 0",
    "M16 11a3 3 0 1 0 0-6",
    "M21 20a6 6 0 0 0-4.5-5.8",
  ],
  place: [
    "M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z",
    "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  media: ["M4 5h16v14H4z", "m7 15 3-3 2 2 3-4 3 5", "M9 9h.01"],
  relation: [
    "M7 7h10",
    "M7 17h10",
    "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  ],
  note: ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"],
  home: ["M3 11.5 12 3 9 7.5", "M5.5 10.5V21h13V10.5", "M9.5 21v-6h5v6"],
  danger: ["M12 3 2.5 20h19z", "M12 9v5", "M12 18h.01"],
  magic: [
    "m12 2 1.2 3.2L16.5 6.5l-3.3 1.3L12 11l-1.2-3.2-3.3-1.3 3.3-1.3z",
    "m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z",
    "M5 15v6",
    "M2 18h6",
  ],
  search: ["M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z", "m16 16 5 5"],
  crown: ["m3 7 4 4 5-7 5 7 4-4-2 11H5z", "M6 21h12"],
  object: ["M12 3 20 7 12 11 4 7z", "M4 7v10l8 4 8-4V7", "M12 11v10"],
  pig: [
    "M6 8 4 5l4 1",
    "M18 8l2-3-4 1",
    "M5 10a7 7 0 0 1 14 0v5a7 7 0 0 1-14 0z",
    "M8 13h8v5H8z",
    "M10 15h.01",
    "M14 15h.01",
  ],
  wolf: [
    "M4 8 6 3l4 3h4l4-3 2 5v7l-5 6H9l-5-6z",
    "M9 12h.01",
    "M15 12h.01",
    "M10 16h4",
  ],
  straw: ["M6 3l4 18", "M10 3l2 18", "M14 3l-2 18", "M18 3l-4 18", "M5 10h14", "M6 14h12"],
  sticks: ["M5 20 18 4", "M7 4l12 16", "M9 9l-3-1", "M15 9l3-1", "M11 15l-3 2", "M14 14l3 2"],
  bricks: ["M3 5h18v14H3z", "M3 10h18", "M3 15h18", "M8 5v5", "M16 5v5", "M6 10v5", "M14 10v5", "M9 15v4", "M17 15v4"],
  mirror: ["M12 3a6 7 0 1 0 0 14 6 7 0 0 0 0-14z", "M12 17v4", "M9 21h6"],
  apple: ["M12 7c-4-2-8 1-7 6 1 5 4 8 7 8s6-3 7-8c1-5-3-8-7-6z", "M12 7c0-3 2-5 5-5", "M13 5c2 0 3 1 4 2"],
  axe: ["M4 20 14 10", "M12 4l7 2-1 6-6-2z", "M9 15l4 4"],
  pickaxe: ["M4 8c5-5 11-5 16 0", "M12 6v15", "M9 21h6"],
  laces: ["M12 12c-2-4-7-5-8-2-1 3 3 5 8 2z", "M12 12c2-4 7-5 8-2 1 3-3 5-8 2z", "M10 14l-3 7", "M14 14l3 7"],
  comb: ["M4 6h16v5H4z", "M6 11v8", "M9 11v7", "M12 11v8", "M15 11v7", "M18 11v8"],
  coffin: ["M9 3h6l4 5-2 13H7L5 8z", "M12 7v10", "M9 12h6"],
  disguise: ["M4 10h16", "M8 10V7h8v3", "M5 12c2 6 5 6 7 2 2 4 5 4 7-2", "M8 14h.01", "M16 14h.01"],
  slipper: ["M4 16c4 1 5-3 7-8l3 6c2 1 4 1 6 1v3c-5 3-11 3-16 1z"],
  carriage: ["M5 15h14l-2-7H9z", "M7 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M12 8V5", "M10 5h4"],
  pumpkin: ["M12 6c-5 0-8 3-8 7s3 7 8 7 8-3 8-7-3-7-8-7z", "M12 6c-2 3-2 11 0 14", "M12 6c2 3 2 11 0 14", "M12 6V3", "M12 3h3"],
  gown: ["M9 3h6l1 5 4 11H4L8 8z", "M9 3c0 2 1 3 3 3s3-1 3-3"],
  trumpet: ["M4 11h7l7-4v10l-7-4H4z", "M4 11v4", "M2 11h2", "M11 9v6"],
  hood: ["M12 3c-5 0-8 5-8 10v7h16v-7c0-5-3-10-8-10z", "M8 13a4 4 0 0 0 8 0", "M8 8c2 2 6 2 8 0"],
  elder: ["M8 10a4 4 0 1 1 8 0", "M6 21a6 6 0 0 1 12 0", "M7 10h4", "M13 10h4", "M11 10h2", "M9 15c2 1 4 1 6 0"],
  child: ["M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M7 21v-5a5 5 0 0 1 10 0v5", "M9 14l-2 3", "M15 14l2 3"],
  witch: ["M5 10h14", "M8 10l4-7 4 7", "M7 13c1 5 9 5 10 0", "M18 4l2 2", "M19 5l-3 3"],
  merchant: ["M4 8h16l-2-4H6z", "M5 8v12h14V8", "M8 20v-6h8v6", "M4 8c1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0"],
  giant: ["M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M5 21v-6c0-4 3-6 7-6s7 2 7 6v6", "M5 16H2", "M19 16h3"],
  beanstalk: ["M12 21c-3-4 3-7 0-11s3-6 1-8", "M12 8c-4 1-6-1-7-4 4-1 6 0 7 4z", "M13 13c4-1 6 1 7 4-4 1-6 0-7-4z"],
  goose: ["M5 15c2-5 7-6 11-3l3-2-1-3c-1-2-3-2-4 0v5", "M5 15c0 4 3 6 7 6 3 0 5-1 6-3", "M4 18H2", "M8 21v2", "M15 21v2"],
  hair: ["M6 21V10a6 6 0 0 1 12 0v11", "M9 21V10", "M12 21V8", "M15 21V10", "M6 12c3-3 9-3 12 0"],
  frog: ["M6 11a6 6 0 0 1 12 0v5a6 6 0 0 1-12 0z", "M7 9a2 2 0 1 1 4 0", "M13 9a2 2 0 1 1 4 0", "M9 15h.01", "M15 15h.01", "M10 18h4"],
  ball: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M5 8c4 1 10 1 14 0", "M8 4c1 5 1 11 0 16", "M16 4c-1 5-1 11 0 16"],
  spindle: ["M12 3v18", "M8 7c2 2 6 2 8 0", "M8 17c2-2 6-2 8 0", "M10 5h4", "M10 19h4"],
  baby: ["M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M7 13c1-2 3-3 5-3s4 1 5 3l2 5-3 3H8l-3-3z", "M9 15h6"],
  parent: ["M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M4 21a5 5 0 0 1 10 0", "M17 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M14 21a3 3 0 0 1 6 0"],
  world: ["M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z", "M2.8 12h18.4", "M12 2.7c2.8 2.6 4.2 5.7 4.2 9.3S14.8 18.7 12 21.3", "M12 2.7C9.2 5.3 7.8 8.4 7.8 12s1.4 6.7 4.2 9.3"],
  timeline: ["M3 12h18", "M6 12a2 2 0 1 0 0 .01", "M12 12a2 2 0 1 0 0 .01", "M18 12a2 2 0 1 0 0 .01"],
  check: ["m5 12 4 4L19 6"],
  dag: ["M5 5h5", "M14 5h5", "M7.5 5v5", "M16.5 5v5", "M7.5 10h9", "M12 10v4", "M8 18h8", "M12 14v4"],
  force: ["M12 12m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0", "M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "m5.6-6.4 2.8 2.8", "m15.6 15.6 2.8 2.8", "m18.4 5.6-2.8 2.8", "m8.4 15.6-2.8 2.8"],
  view: ["M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z", "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"],
  landscape: ["M3 5h18v14H3z", "M8 16h8"],
  portrait: ["M6 2h12v20H6z", "M10 18h4"],
  fullscreen: ["M8 3H3v5", "M16 3h5v5", "M8 21H3v-5", "M16 21h5v-5"],
  minimize: ["M3 8h5V3", "M21 8h-5V3", "M3 16h5v5", "M21 16h-5v5"],
  "zoom-out": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M8 11h6", "m21 21-4.35-4.35"],
  "zoom-in": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M8 11h6", "M11 8v6", "m21 21-4.35-4.35"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "m13-13 4 4"],
  fit: ["M8 4H4v4", "M16 4h4v4", "M8 20H4v-4", "M16 20h4v-4"],
  play: ["M8 5 19 12 8 19z"],
  pause: ["M8 5v14", "M16 5v14"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  close: ["M6 6l12 12", "M18 6 6 18"],
});

function sanitizeMediaSource(value: unknown): string {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source) return "";
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)) return source;
  try {
    const url = new URL(source, globalThis.document?.baseURI || "https://example.invalid/");
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    if (url.origin === new URL(globalThis.document?.baseURI || "https://example.invalid/").origin)
      return url.href;
  } catch {
    return "";
  }
  return "";
}

interface Media {
  src: string;
  alt: string;
  caption: string;
}

export function normalizeMedia(value: unknown): Media[] {
  const source = Array.isArray(value) ? value : [];
  const media: Media[] = [];
  for (const raw of source.slice(0, MAX_MEDIA)) {
    if (!raw || typeof raw !== "object") continue;
    const src = sanitizeMediaSource((raw as any).src || (raw as any).url);
    if (!src) continue;
    media.push({
      src,
      alt: typeof (raw as any).alt === "string" ? (raw as any).alt.trim().slice(0, 240) : "",
      caption:
        typeof (raw as any).caption === "string" ? (raw as any).caption.trim().slice(0, 320) : "",
    });
  }
  return media;
}

export function normalizeHue(value: unknown): number {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return 30;
  return ((number % 360) + 360) % 360;
}

interface Tag {
  label: string;
  icon: string;
  hue: number;
}

export function normalizeTags(value: unknown): Tag[] {
  const source = Array.isArray(value) ? value : [];
  const tags: Tag[] = [];
  for (const raw of source.slice(0, MAX_TAGS)) {
    if (!raw || typeof raw !== "object") continue;
    const label =
      typeof (raw as any).label === "string" ? (raw as any).label.trim().slice(0, 48) : "";
    if (!label) continue;
    tags.push({
      label,
      icon: normalizeSemanticIconName((raw as any).icon) ?? "note",
      hue: normalizeHue((raw as any).hue),
    });
  }
  return tags;
}

interface IconOptions {
  size?: number;
}

/** Path data of a semantic icon (24x24 viewBox, stroked), for non-DOM renderers. */
export function iconPathData(name: string): readonly string[] {
  return ICON_PATHS[Object.hasOwn(ICON_PATHS, name) ? name : "note"] ?? [];
}

export function createIcon(name: string, options?: IconOptions): SVGSVGElement {
  const iconName = Object.hasOwn(ICON_PATHS, name) ? name : "note";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(options?.size || 16));
  svg.setAttribute("height", String(options?.size || 16));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("semantic-icon");
  for (const definition of ICON_PATHS[iconName]!) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  }
  return svg;
}

export function createCompoundIcon(
  primaryName: string,
  secondaryName: string,
  options?: IconOptions,
): HTMLSpanElement {
  const size = options?.size || 16;
  const primarySize = Math.max(12, Math.round(size * 0.86));
  const secondarySize = Math.max(9, Math.round(size * 0.52));
  const root = document.createElement("span");
  root.className = "semantic-icon compound-semantic-icon";
  root.setAttribute("aria-hidden", "true");
  root.style.setProperty("--compound-icon-primary-size", `${primarySize}px`);
  root.style.setProperty("--compound-icon-secondary-size", `${secondarySize}px`);

  const primary = createIcon(primaryName, { size: primarySize });
  primary.classList.remove("semantic-icon");
  primary.classList.add("compound-semantic-icon-primary");

  const secondary = createIcon(secondaryName, { size: secondarySize });
  secondary.classList.remove("semantic-icon");
  secondary.classList.add("compound-semantic-icon-secondary");
  // Equalize the apparent line thickness after the secondary glyph is scaled
  // down: stroke width × rendered scale matches the primary glyph.
  secondary.setAttribute("stroke-width", String((1.8 * primarySize) / secondarySize));

  root.append(primary, secondary);
  return root;
}

export function createTag(tag: unknown): HTMLElement | null {
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

// Export public API as frozen object for backward compatibility
const TimelinePresentationObj = {
  ICON_NAMES,
  MAX_MEDIA,
  MAX_TAGS,
  createIcon,
  createTag,
  normalizeHue,
  normalizeMedia,
  normalizeTags,
  sanitizeMediaSource,
} as const;

export const TimelinePresentation = Object.freeze(TimelinePresentationObj);
