export const SEMANTIC_ICON_NAMES = Object.freeze([
  "milestone",
  "decision",
  "evidence",
  "person",
  "group",
  "place",
  "media",
  "relation",
  "note",
  "home",
  "danger",
  "magic",
  "search",
  "crown",
  "object",
  "pig",
  "wolf",
  "straw",
  "sticks",
  "bricks",
  "mirror",
  "apple",
  "axe",
  "pickaxe",
  "laces",
  "comb",
  "coffin",
  "disguise",
  "slipper",
  "carriage",
  "pumpkin",
  "gown",
  "trumpet",
  "hood",
  "elder",
  "child",
  "witch",
  "merchant",
  "giant",
  "beanstalk",
  "goose",
  "hair",
  "frog",
  "ball",
  "spindle",
  "baby",
  "parent",
  "view"
] as const);

export type SemanticIconName = (typeof SEMANTIC_ICON_NAMES)[number];

const SEMANTIC_ICON_SET = new Set<string>(SEMANTIC_ICON_NAMES);

const SEMANTIC_ICON_ALIASES = new Map<string, SemanticIconName>([
  ["user", "person"],
  ["human", "person"],
  ["people", "person"],
  ["organization", "group"],
  ["organisation", "group"],
  ["company", "group"],
  ["team", "group"],
  ["building", "group"],
  ["artifact", "object"],
  ["artefact", "object"],
  ["thing", "object"],
  ["document", "evidence"],
  ["article", "evidence"],
  ["pdf", "evidence"],
  ["file", "evidence"],
  ["location", "place"],
]);

const ENTITY_TYPE_DEFAULTS = new Map<string, SemanticIconName>([
  ["person", "person"],
  ["human", "person"],
  ["people", "person"],
  ["group", "group"],
  ["organization", "group"],
  ["organisation", "group"],
  ["company", "group"],
  ["team", "group"],
  ["object", "object"],
  ["artifact", "object"],
  ["artefact", "object"],
  ["thing", "object"],
  ["document", "evidence"],
  ["article", "evidence"],
  ["pdf", "evidence"],
  ["note", "evidence"],
  ["place", "place"],
  ["location", "place"],
]);

function normalizedKey(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function normalizeSemanticIconName(value: unknown): SemanticIconName | null {
  const key = normalizedKey(value);
  if (!key) return null;
  if (SEMANTIC_ICON_SET.has(key)) return key as SemanticIconName;
  return SEMANTIC_ICON_ALIASES.get(key) ?? null;
}

export function defaultSemanticIconForEntityType(value: unknown): SemanticIconName | null {
  return ENTITY_TYPE_DEFAULTS.get(normalizedKey(value)) ?? null;
}

export function normalizeEntityPresentationAttributes(value: unknown): Record<string, unknown> {
  const attributes = record(value);
  const style = record(attributes["style"]);
  const iconCandidate = style["icon"] ?? attributes["icon"];
  if (iconCandidate !== undefined && iconCandidate !== null && String(iconCandidate).trim()) {
    const canonical = normalizeSemanticIconName(iconCandidate);
    style["icon"] = canonical ?? String(iconCandidate).trim().slice(0, 48);
  }
  delete attributes["icon"];
  if (Object.keys(style).length > 0) attributes["style"] = style;
  else delete attributes["style"];
  return attributes;
}
