export type WorldGraphColor = readonly [number, number, number, number];

export type WorldEntityShape = "circle" | "square" | "diamond" | "hexagon";

export type WorldEntityVisualFamily =
  | "person"
  | "group"
  | "organization"
  | "evidence"
  | "device"
  | "account"
  | "object"
  | "default";

export interface WorldEntityGraphStyle {
  readonly family: WorldEntityVisualFamily;
  readonly shape: WorldEntityShape;
  readonly fillColor: WorldGraphColor;
  readonly borderColor: WorldGraphColor;
  readonly borderWidthPx: number;
}

export type WorldRelationshipVisualFamily =
  | "communication"
  | "transfer"
  | "movement"
  | "authority"
  | "conflict"
  | "creation"
  | "social"
  | "default";

export interface WorldRelationshipGraphStyle {
  /** Canonical predicate/action text. This is the relationship type. */
  readonly type: string;
  readonly family: WorldRelationshipVisualFamily;
  readonly color: WorldGraphColor;
  readonly widthPx: number;
  readonly arrowWidthPx: number;
}

/**
 * Minimum pointer/touch acquisition diameter. The visible mark may be smaller,
 * but graph interaction must never shrink below this footprint.
 */
export const WORLD_NODE_INTERACTION_DIAMETER_PX = 44;

/** Ordinary visible node diameter before weight/selection emphasis. */
export const WORLD_NODE_VISIBLE_DIAMETER_PX = 20;

const SELECTED_BORDER = Object.freeze([217, 119, 6, 255]) as WorldGraphColor;
const DEFAULT_BORDER = Object.freeze([255, 255, 255, 235]) as WorldGraphColor;

const ENTITY_STYLES: Readonly<
  Record<WorldEntityVisualFamily, Readonly<{ shape: WorldEntityShape; fill: WorldGraphColor }>>
> = Object.freeze({
  person: Object.freeze({
    shape: "circle",
    fill: Object.freeze([37, 99, 235, 245]) as WorldGraphColor,
  }),
  group: Object.freeze({
    shape: "hexagon",
    fill: Object.freeze([124, 58, 237, 245]) as WorldGraphColor,
  }),
  organization: Object.freeze({
    shape: "square",
    fill: Object.freeze([79, 70, 229, 245]) as WorldGraphColor,
  }),
  evidence: Object.freeze({
    shape: "diamond",
    fill: Object.freeze([180, 83, 9, 245]) as WorldGraphColor,
  }),
  device: Object.freeze({
    shape: "hexagon",
    fill: Object.freeze([8, 145, 178, 245]) as WorldGraphColor,
  }),
  account: Object.freeze({
    shape: "square",
    fill: Object.freeze([13, 148, 136, 245]) as WorldGraphColor,
  }),
  object: Object.freeze({
    shape: "diamond",
    fill: Object.freeze([71, 85, 105, 245]) as WorldGraphColor,
  }),
  default: Object.freeze({
    shape: "circle",
    fill: Object.freeze([75, 85, 99, 245]) as WorldGraphColor,
  }),
});

function normalizedKind(kind: string | undefined): string {
  return typeof kind === "string" ? kind.trim().toLowerCase() : "";
}

export function worldEntityVisualFamily(kind: string | undefined): WorldEntityVisualFamily {
  const value = normalizedKind(kind);
  if (!value) return "default";
  if (value.includes("person") || value.includes("human")) return "person";
  if (value.includes("group") || value.includes("team") || value.includes("family")) return "group";
  if (
    value.includes("organization") ||
    value.includes("organisation") ||
    value.includes("company") ||
    value.includes("agency") ||
    value.includes("institution")
  ) {
    return "organization";
  }
  if (
    value.includes("evidence") ||
    value.includes("document") ||
    value.includes("record") ||
    value.includes("article") ||
    value.includes("pdf") ||
    value.includes("note")
  ) {
    return "evidence";
  }
  if (value.includes("device") || value.includes("software") || value.includes("system")) {
    return "device";
  }
  if (value.includes("account") || value.includes("profile")) return "account";
  if (
    value.includes("object") ||
    value.includes("artifact") ||
    value.includes("artefact") ||
    value.includes("thing") ||
    value.includes("vehicle")
  ) {
    return "object";
  }
  return "default";
}

export function worldEntityGraphStyle(
  kind: string | undefined,
  selected = false,
): WorldEntityGraphStyle {
  const family = worldEntityVisualFamily(kind);
  const style = ENTITY_STYLES[family];
  return Object.freeze({
    family,
    shape: style.shape,
    fillColor: style.fill,
    borderColor: selected ? SELECTED_BORDER : DEFAULT_BORDER,
    borderWidthPx: selected ? 3 : 2,
  });
}

const RELATIONSHIP_COLORS: Readonly<Record<WorldRelationshipVisualFamily, WorldGraphColor>> =
  Object.freeze({
    communication: Object.freeze([37, 99, 235, 230]) as WorldGraphColor,
    transfer: Object.freeze([5, 150, 105, 230]) as WorldGraphColor,
    movement: Object.freeze([8, 145, 178, 230]) as WorldGraphColor,
    authority: Object.freeze([124, 58, 237, 230]) as WorldGraphColor,
    conflict: Object.freeze([220, 38, 38, 230]) as WorldGraphColor,
    creation: Object.freeze([180, 83, 9, 230]) as WorldGraphColor,
    social: Object.freeze([219, 39, 119, 230]) as WorldGraphColor,
    default: Object.freeze([71, 85, 105, 220]) as WorldGraphColor,
  });

function normalizedPredicate(predicate: string | undefined): string {
  return typeof predicate === "string" ? predicate.trim().toLowerCase() : "";
}

export function worldRelationshipVisualFamily(
  predicate: string | undefined,
): WorldRelationshipVisualFamily {
  const value = normalizedPredicate(predicate);
  if (!value) return "default";

  if (
    /^(?:call|warn|tell|ask|message|email|write|announce|report|notify|inform|reply|answer)/.test(
      value,
    )
  ) {
    return "communication";
  }
  if (
    /^(?:give|send|transfer|pay|receive|sell|buy|deliver|lend|return|donate|award)/.test(value)
  ) {
    return "transfer";
  }
  if (
    /^(?:visit|arrive|depart|leave|move|travel|flee|enter|exit|cross|drive|fly|sail)/.test(value)
  ) {
    return "movement";
  }
  if (
    /^(?:approve|authorize|order|appoint|sign|permit|ban|rule|command|instruct|allow|deny)/.test(
      value,
    )
  ) {
    return "authority";
  }
  if (
    /^(?:attack|kill|fight|threaten|arrest|capture|poison|steal|destroy|injure|accuse|sue)/.test(
      value,
    )
  ) {
    return "conflict";
  }
  if (/^(?:build|create|found|make|produce|invent|design|compose|publish)/.test(value)) {
    return "creation";
  }
  if (/^(?:marry|meet|join|hire|consult|help|support|befriend|adopt|invite)/.test(value)) {
    return "social";
  }
  return "default";
}

export function worldRelationshipGraphStyle(
  predicate: string | undefined,
  selected = false,
): WorldRelationshipGraphStyle {
  const type = typeof predicate === "string" && predicate.trim() ? predicate.trim() : "relationship";
  const family = worldRelationshipVisualFamily(predicate);
  const base = RELATIONSHIP_COLORS[family];
  const color = Object.freeze([
    base[0],
    base[1],
    base[2],
    selected ? 255 : base[3],
  ]) as WorldGraphColor;
  return Object.freeze({
    type,
    family,
    color,
    widthPx: selected ? 4 : 2,
    arrowWidthPx: selected ? 5 : 3,
  });
}
