/**
 * Renderer-neutral node and edge styling for the WorldSurface, ported from
 * the Orb graph's defaults (src/orb-graph-entry.js) so the globe keeps the
 * established visual language. Each object's own style (an entity or
 * relationship `attributes.style`, a place `style.marker`) overrides the
 * defaults; anything invalid or missing falls back to them.
 */

export type WorldNodeShape = "circle" | "square" | "diamond" | "hexagon" | "pin";

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

/**
 * Ordinary node cores render at 20-24px across before their border. Picking
 * remains a separate >=44px target in WorldSurface, so visual density and
 * interaction acquisition can scale independently.
 */
export const WORLD_NODE_SCALE = 1;
/** Minimum radius of the mobile interaction footprint (44px diameter). */
export const WORLD_ENTITY_MIN_HIT_RADIUS_PX = 22;

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
const SHAPES: readonly WorldNodeShape[] = ["circle", "square", "diamond", "hexagon", "pin"];

/**
 * Radius multiplier that gives the common geometric shapes approximately the
 * same filled area for one authored semantic radius. Collision and marker
 * atlases use the same multiplier, so perceptual normalization never clips.
 */
export function worldNodeShapeVisualRadiusScale(shape: WorldNodeShape): number {
  switch (shape) {
    case "square":
      return Math.sqrt(Math.PI) / 2;
    case "diamond":
      return Math.sqrt(Math.PI / 2);
    case "hexagon":
      return Math.sqrt(Math.PI / ((3 * Math.sqrt(3)) / 2));
    default:
      return 1;
  }
}

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
  /** Connected-neighborhood emphasis without changing canonical selection. */
  readonly emphasized?: boolean;
  readonly visualWeight?: number;
}

function worldNodeMetrics(input: WorldNodeStyleInput): {
  readonly radius: number;
  readonly borderWidth: number;
} {
  const own = styleOf(input.attributes);
  // Keep a compact visible baseline; the separate hit footprint preserves
  // mobile acquisition. Quantized radii still keep the marker atlas bounded.
  const baseRadius = Math.round(10 + Math.min(1, Math.max(0, input.visualWeight ?? 0)) * 2);
  // Portable marker semantics: `size` and `diameter` are visible diameters;
  // `radius` is the only radius-valued property. Explicit authored geometry
  // is authoritative and is not multiplied by the app's default node scale.
  const authoredDiameter = number(own["size"], 8, 64) ?? number(own["diameter"], 8, 64);
  const authoredRadius =
    number(own["radius"], 4, 32) ?? (authoredDiameter === null ? null : authoredDiameter / 2);
  const resolvedRadius = Math.round(authoredRadius ?? baseRadius * WORLD_NODE_SCALE);
  const authoredBorderWidth = number(own["borderWidth"], 0, 8) ?? number(own["strokeWidth"], 0, 8) ?? 2;
  return Object.freeze({
    // Interaction state is presentation-only. Never feed hover/selection into
    // visible geometry or collision/force footprints.
    radius: resolvedRadius,
    borderWidth: authoredBorderWidth,
  });
}

/** Full visible marker radius, including normalized shape extent and border. */
export function worldNodeVisualFootprintRadiusPx(input: WorldNodeStyleInput): number {
  const metrics = worldNodeMetrics(input);
  const type = (input.type ?? "").toLowerCase();
  const own = styleOf(input.attributes);
  const ownShape = text(own["shape"] ?? own["markerShape"], 16)?.toLowerCase();
  const shape = SHAPES.includes(ownShape as WorldNodeShape)
    ? (ownShape as WorldNodeShape)
    : defaultNodeShape(type);
  return metrics.radius * worldNodeShapeVisualRadiusScale(shape) + metrics.borderWidth;
}

/**
 * Collision/picking radius. It never falls below the 44px mobile interaction
 * target even when the visible marker is deliberately more compact.
 */
export function worldNodeFootprintRadiusPx(input: WorldNodeStyleInput): number {
  return Math.max(WORLD_ENTITY_MIN_HIT_RADIUS_PX, worldNodeVisualFootprintRadiusPx(input));
}

export function worldNodeStyle(
  input: WorldNodeStyleInput,
  palette: WorldGraphPalette,
): WorldNodeStyle {
  const type = (input.type ?? "").toLowerCase();
  const own = styleOf(input.attributes);
  const ownShape = text(own["shape"] ?? own["markerShape"], 16)?.toLowerCase();
  const metrics = worldNodeMetrics(input);
  const fill =
    color(own["fillColor"]) ??
    color(own["fill"]) ??
    color(own["backgroundColor"]) ??
    color(own["color"]) ??
    defaultNodeFill(type, palette);
  const border =
    color(own["borderColor"]) ??
    color(own["border"]) ??
    color(own["stroke"]) ??
    color(own["strokeColor"]) ??
    palette.paper;
  return Object.freeze({
    // Interaction emphasis is applied by the renderer as color/opacity only;
    // semantic marker geometry remains invariant.
    fill,
    border,
    borderWidth: metrics.borderWidth,
    shape: SHAPES.includes(ownShape as WorldNodeShape)
      ? (ownShape as WorldNodeShape)
      : defaultNodeShape(type),
    icon: text(own["icon"], 48) ?? (type || null),
    image: text(own["image"] ?? own["imageUrl"], 2048),
    radius: metrics.radius,
  });
}

/** Place anchors use the same marker grammar as graph nodes without becoming semantic graph nodes. */
export function worldPlaceStyle(
  placeStyle: unknown,
  _selected: boolean,
  palette: WorldGraphPalette,
  _emphasized = false,
): WorldNodeStyle {
  const own = record(placeStyle) ?? {};
  const marker = record(own["marker"]) ?? {};
  const ownShape = text(
    marker["shape"] ?? marker["markerShape"] ?? own["markerShape"] ?? own["shape"],
    16,
  )?.toLowerCase();
  const fill =
    color(marker["fillColor"]) ??
    color(marker["fill"]) ??
    color(own["fillColor"]) ??
    color(own["fill"]) ??
    color(marker["color"]) ??
    defaultNodeFill("place", palette);
  const border =
    color(marker["borderColor"]) ??
    color(marker["stroke"]) ??
    color(own["borderColor"]) ??
    color(own["stroke"]) ??
    color(marker["color"]) ??
    palette.paper;
  const borderWidth =
    number(marker["borderWidth"], 0, 8) ??
    number(marker["strokeWidth"], 0, 8) ??
    number(marker["weight"], 0, 8) ??
    number(own["borderWidth"], 0, 8) ??
    2;
  const authoredDiameter =
    number(marker["size"], 8, 64) ??
    number(marker["diameter"], 8, 64) ??
    number(own["size"], 8, 64) ??
    number(own["diameter"], 8, 64);
  const authoredRadius =
    number(marker["radius"], 4, 32) ??
    number(own["radius"], 4, 32) ??
    (authoredDiameter === null ? 12 : authoredDiameter / 2);
  return Object.freeze({
    fill,
    border,
    borderWidth,
    shape: SHAPES.includes(ownShape as WorldNodeShape) ? (ownShape as WorldNodeShape) : "pin",
    icon: text(marker["icon"] ?? own["icon"], 48) ?? "place",
    image: text(marker["image"] ?? marker["imageUrl"] ?? own["image"] ?? own["imageUrl"], 2048),
    // The visible marker respects authored geometry. The renderer maintains
    // the separate >=44px acquisition target, so a deliberately small marker
    // does not have to be visually inflated for touch accessibility.
    radius: Math.round(authoredRadius),
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
  /** Incident-edge emphasis without changing canonical selection. */
  readonly emphasized?: boolean;
  readonly inactive?: boolean;
  /** Visual de-emphasis for edges outside the active interaction neighborhood. */
  readonly subdued?: boolean;
  /** Endpoint-derived colour used when no timeline category colour is available. */
  readonly fallbackColor?: string;
}

export function worldEdgeStyle(
  input: WorldEdgeStyleInput,
  palette: WorldGraphPalette,
): WorldEdgeStyle {
  const own = styleOf(input.attributes);
  const lineStyle = text(own["lineStyle"] ?? own["strokeStyle"], 16)?.toLowerCase();
  const semanticColor =
    color(own["categoryColor"]) ??
    color(input.fallbackColor) ??
    color(own["color"]) ??
    color(own["stroke"]) ??
    color(own["lineColor"]) ??
    semanticEdgeColor(input.predicate ?? "", palette);
  const authoredWidth =
    number(own["width"], 0.5, 10) ??
    number(own["strokeWidth"], 0.5, 10) ??
    number(own["lineWidth"], 0.5, 10) ??
    1;
  return Object.freeze({
    // Interaction emphasis is renderer-only so edge geometry/routing never
    // changes on hover or selection.
    color: (input.subdued || input.inactive) && !input.selected ? palette.muted : semanticColor,
    width: authoredWidth,
    dashed:
      lineStyle === "dashed" ||
      lineStyle === "dash" ||
      (lineStyle === undefined && input.inactive === true),
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
