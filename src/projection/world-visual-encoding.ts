export const WORLD_NODE_SHAPES = Object.freeze([
  "circle",
  "square",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "star",
  "cross",
] as const);

export type WorldNodeShape = (typeof WORLD_NODE_SHAPES)[number];
export type WorldSemanticIconName = "person" | "group" | "object" | "evidence" | "place";
export type WorldVisualColor = readonly [number, number, number, number];

export interface WorldEntityVisualOverride {
  readonly shape?: WorldNodeShape;
  readonly fillColor?: WorldVisualColor;
  readonly outlineColor?: WorldVisualColor;
  readonly icon?: WorldSemanticIconName;
  readonly imageUrl?: string;
}

export interface WorldEntityVisualEncoding {
  readonly shape: WorldNodeShape;
  readonly fillColor: WorldVisualColor;
  readonly outlineColor: WorldVisualColor;
  readonly icon: WorldSemanticIconName;
  readonly imageUrl?: string;
}

export interface WorldRelationshipVisualEncoding {
  readonly type: string;
  readonly color: WorldVisualColor;
}

const OUTLINE: WorldVisualColor = Object.freeze([255, 255, 255, 235]);

const ENTITY_DEFAULTS: ReadonlyMap<
  string,
  Readonly<{
    shape: WorldNodeShape;
    fillColor: WorldVisualColor;
    icon: WorldSemanticIconName;
  }>
> = new Map([
  ["person", { shape: "circle", fillColor: [37, 99, 235, 240], icon: "person" }],
  ["people", { shape: "circle", fillColor: [37, 99, 235, 240], icon: "person" }],
  ["human", { shape: "circle", fillColor: [37, 99, 235, 240], icon: "person" }],
  ["group", { shape: "hexagon", fillColor: [124, 58, 237, 240], icon: "group" }],
  ["team", { shape: "hexagon", fillColor: [124, 58, 237, 240], icon: "group" }],
  ["organization", { shape: "square", fillColor: [13, 148, 136, 240], icon: "group" }],
  ["organisation", { shape: "square", fillColor: [13, 148, 136, 240], icon: "group" }],
  ["company", { shape: "square", fillColor: [13, 148, 136, 240], icon: "group" }],
  ["agency", { shape: "square", fillColor: [13, 148, 136, 240], icon: "group" }],
  ["document", { shape: "diamond", fillColor: [202, 138, 4, 240], icon: "evidence" }],
  ["evidence", { shape: "diamond", fillColor: [202, 138, 4, 240], icon: "evidence" }],
  ["record", { shape: "diamond", fillColor: [202, 138, 4, 240], icon: "evidence" }],
  ["device", { shape: "pentagon", fillColor: [220, 38, 38, 240], icon: "object" }],
  ["software", { shape: "star", fillColor: [8, 145, 178, 240], icon: "object" }],
  ["account", { shape: "star", fillColor: [8, 145, 178, 240], icon: "object" }],
  ["vehicle", { shape: "pentagon", fillColor: [234, 88, 12, 240], icon: "object" }],
  ["object", { shape: "triangle", fillColor: [71, 85, 105, 240], icon: "object" }],
  ["artifact", { shape: "cross", fillColor: [71, 85, 105, 240], icon: "object" }],
  ["artefact", { shape: "cross", fillColor: [71, 85, 105, 240], icon: "object" }],
]);

const FALLBACK_ENTITY = Object.freeze({
  shape: "circle" as const,
  fillColor: Object.freeze([75, 85, 99, 240]) as WorldVisualColor,
  icon: "object" as const,
});

const RELATIONSHIP_COLORS: readonly WorldVisualColor[] = Object.freeze([
  Object.freeze([37, 99, 235, 225]),
  Object.freeze([124, 58, 237, 225]),
  Object.freeze([13, 148, 136, 225]),
  Object.freeze([202, 138, 4, 225]),
  Object.freeze([220, 38, 38, 225]),
  Object.freeze([8, 145, 178, 225]),
  Object.freeze([234, 88, 12, 225]),
  Object.freeze([71, 85, 105, 225]),
]);

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function safeImageUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  const lower = candidate.toLowerCase();
  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("data:image/") ||
    lower.startsWith("/") ||
    lower.startsWith("./") ||
    lower.startsWith("../")
  ) {
    return candidate;
  }
  return undefined;
}

function relationshipColorIndex(type: string): number {
  let hash = 2166136261;
  for (const character of type) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % RELATIONSHIP_COLORS.length;
}

export function worldEntityVisualEncoding(
  kind: string | undefined,
  override: WorldEntityVisualOverride = {},
): WorldEntityVisualEncoding {
  const defaults = ENTITY_DEFAULTS.get(normalized(kind)) ?? FALLBACK_ENTITY;
  const imageUrl = safeImageUrl(override.imageUrl);

  return Object.freeze({
    shape: override.shape ?? defaults.shape,
    fillColor: Object.freeze([...(override.fillColor ?? defaults.fillColor)]) as WorldVisualColor,
    outlineColor: Object.freeze([...(override.outlineColor ?? OUTLINE)]) as WorldVisualColor,
    icon: override.icon ?? defaults.icon,
    ...(imageUrl === undefined ? {} : { imageUrl }),
  });
}

export function worldRelationshipVisualEncoding(
  relationshipType: string,
): WorldRelationshipVisualEncoding {
  const type = relationshipType.trim();
  const normalizedType = type.toLowerCase();
  const color =
    RELATIONSHIP_COLORS[relationshipColorIndex(normalizedType)] ?? RELATIONSHIP_COLORS[0];

  return Object.freeze({
    type,
    color,
  });
}
