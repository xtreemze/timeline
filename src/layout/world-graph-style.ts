/**
 * Renderer-neutral node and edge styling for the WorldSurface, ported from
 * the Orb graph's defaults (src/orb-graph-entry.js) so the globe keeps the
 * established visual language. Each object's own style (an entity or
 * relationship `attributes.style`, a place `style.marker`) overrides the
 * defaults; anything invalid or missing falls back to them.
 */

export type WorldNodeShape = "circle" | "square" | "diamond" | "hexagon";

/** Theme colours, resolved by the host from its light/dark tokens. */
export interface WorldGraphPalette {
  readonly ink: string;
  readonly muted: string;
  readonly paper: string;
  readonly focus: string;
  readonly story: string;
  readonly line: string;
}

export const WORLD_LIGHT_PALETTE: WorldGraphPalette = Object.freeze({
  ink: "#171717",
  muted: "#6b6965",
  paper: "#fffdf9",
  focus: "#1d64d8",
  story: "#5b4ab8",
  line: "#d9d2c7",
});

export const WORLD_DARK_PALETTE: WorldGraphPalette = Object.freeze({
  ink: "#f1ede7",
  muted: "#aaa39a",
  paper: "#171716",
  focus: "#78a9ff",
  story: "#a79bf4",
  line: "#393633",
});

export interface WorldNodeStyle {
  readonly fill: string;
  readonly border: string;
  readonly borderWidth: number;
  readonly shape: WorldNodeShape;
  /** Icon name from the shared icon set, or null for no glyph. */
  readonly icon: string | null;
  /** Optional image URL drawn inside the marker instead of the icon. */
  readonly image: string | null;
  /** Marker radius in screen pixels. */
  readonly radius: number;
}

export interface WorldEdgeStyle {
  readonly color: string;
  readonly width: number;
  readonly dashed: boolean;
  readonly arrow: boolean;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SHAPES: readonly WorldNodeShape[] = ["circle", "square", "diamond", "hexagon"];

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function color(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : null;
}

function number(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : null;
}

function text(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function styleOf(attributes: unknown): Readonly<Record<string, unknown>> {
  return record(record(attributes)?.["style"]) ?? {};
}

function defaultNodeFill(type: string, palette: WorldGraphPalette): string {
  switch (type) {
    case "event":
      return palette.focus;
    case "story":
      return palette.story;
    case "evidence":
      return "#8a4f2b";
    case "place":
      return "#3e6d5b";
    case "person":
      return "#4b5f86";
    case "organization":
      return "#6b526f";
    default:
      return palette.ink === WORLD_DARK_PALETTE.ink ? "#5d6b82" : palette.ink;
  }
}

function defaultNodeShape(type: string): WorldNodeShape {
  if (type === "event" || type === "evidence") return "diamond";
  if (type === "story" || type === "device" || type === "account") return "hexagon";
  if (type === "organization") return "square";
  return "circle";
}

export interface WorldNodeStyleInput {
  readonly type?: string;
  readonly attributes?: unknown;
  readonly selected?: boolean;
  readonly visualWeight?: number;
}

export function worldNodeStyle(
  input: WorldNodeStyleInput,
  palette: WorldGraphPalette,
): WorldNodeStyle {
  const type = (input.type ?? "").toLowerCase();
  const own = styleOf(input.attributes);
  const ownShape = text(own["shape"], 16)?.toLowerCase();
  const baseRadius = 9 + Math.min(1, Math.max(0, input.visualWeight ?? 0)) * 2;
  return Object.freeze({
    fill: input.selected
      ? palette.focus
      : (color(own["fillColor"]) ?? color(own["color"]) ?? defaultNodeFill(type, palette)),
    border: color(own["borderColor"]) ?? palette.paper,
    borderWidth: input.selected ? 4 : (number(own["borderWidth"], 0, 6) ?? 2),
    shape: SHAPES.includes(ownShape as WorldNodeShape)
      ? (ownShape as WorldNodeShape)
      : defaultNodeShape(type),
    icon: text(own["icon"], 48) ?? (type || null),
    image: text(own["image"] ?? own["imageUrl"], 2048),
    radius: (number(own["size"], 4, 24) ?? baseRadius) + (input.selected ? 2 : 0),
  });
}

/** Place anchors honour the place's own map marker style. */
export function worldPlaceStyle(
  placeStyle: unknown,
  selected: boolean,
  palette: WorldGraphPalette,
): WorldNodeStyle {
  const marker = record(record(placeStyle)?.["marker"]) ?? {};
  return Object.freeze({
    fill: selected
      ? palette.focus
      : (color(marker["fillColor"]) ?? color(marker["color"]) ?? defaultNodeFill("place", palette)),
    border: color(marker["color"]) ?? palette.paper,
    borderWidth: number(marker["weight"], 0, 6) ?? 2,
    shape: "circle",
    icon: null,
    image: null,
    radius: Math.round((number(marker["size"], 8, 40) ?? 12) / 2) + (selected ? 2 : 0),
  });
}

function semanticEdgeColor(predicate: string, palette: WorldGraphPalette): string {
  const label = predicate.toLowerCase();
  if (/call|message|email|contact|communicat/.test(label)) return "#496f8c";
  if (/transfer|own|pay|send|receive|deliver/.test(label)) return "#8a5b2d";
  if (/authoriz|approv|decid|permit/.test(label)) return palette.story;
  if (/investigat|review|audit|inspect|verify/.test(label)) return "#596b86";
  if (/occur|locat|visit|travel|arriv/.test(label)) return "#3e6d5b";
  if (/interview|witness|particip|meet|corroborat/.test(label)) return "#6b526f";
  return palette.focus;
}

export interface WorldEdgeStyleInput {
  readonly predicate?: string;
  readonly attributes?: unknown;
  readonly selected?: boolean;
  readonly inactive?: boolean;
}

export function worldEdgeStyle(
  input: WorldEdgeStyleInput,
  palette: WorldGraphPalette,
): WorldEdgeStyle {
  const own = styleOf(input.attributes);
  const lineStyle = text(own["lineStyle"], 16)?.toLowerCase();
  return Object.freeze({
    color: input.selected
      ? palette.focus
      : input.inactive
        ? palette.muted
        : (color(own["color"]) ?? semanticEdgeColor(input.predicate ?? "", palette)),
    width: input.selected ? 4 : (number(own["width"], 0.5, 8) ?? 2),
    dashed: lineStyle === "dashed" || (lineStyle === undefined && input.inactive === true),
    arrow: own["arrow"] !== false,
  });
}

/** `#rrggbb[aa]` / `#rgb` to an RGBA byte tuple. */
export function worldColorBytes(hex: string, alpha = 255): [number, number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value;
  const channel = (offset: number) => Number.parseInt(full.slice(offset, offset + 2), 16) || 0;
  const ownAlpha = full.length === 8 ? channel(6) : 255;
  return [channel(0), channel(2), channel(4), Math.round((ownAlpha * alpha) / 255)];
}
