import {
  defaultSemanticIconForEntityType,
  normalizeEntityPresentationAttributes,
  normalizeSemanticIconName,
  type SemanticIconName,
} from "./semantic-icons.ts";

export interface SemanticIconSuggestion {
  readonly icon: SemanticIconName;
  readonly confidence: "high";
  readonly reason: string;
}

export interface SemanticIconAuditEntity {
  readonly id: string;
  readonly name?: unknown;
  readonly type?: unknown;
  readonly attributes?: unknown;
}

export interface SemanticIconQualityAudit {
  readonly total: number;
  readonly explicitCount: number;
  readonly unsupportedIconIds: readonly string[];
  readonly highConfidenceSuggestionIds: readonly string[];
  readonly genericFallbackIds: readonly string[];
  readonly missingIconIds: readonly string[];
}

const GENERIC_ICON_NAMES = new Set<SemanticIconName>([
  "person",
  "group",
  "object",
  "evidence",
  "place",
]);

const NAME_RULES = Object.freeze([
  { pattern: /\broyal\b|\bking\b|\bqueen\b|\bprince\b|\bprincess\b/, icon: "crown", reason: "name:royal" },
  { pattern: /\bwolf\b/, icon: "wolf", reason: "name:wolf" },
  { pattern: /\bpig\b/, icon: "pig", reason: "name:pig" },
  { pattern: /\bwitch\b/, icon: "witch", reason: "name:witch" },
  { pattern: /\bgiant\b/, icon: "giant", reason: "name:giant" },
  { pattern: /\bbeanstalk\b/, icon: "beanstalk", reason: "name:beanstalk" },
  { pattern: /\bgoose\b/, icon: "goose", reason: "name:goose" },
  { pattern: /\bfrog\b/, icon: "frog", reason: "name:frog" },
  { pattern: /\bpumpkin\b/, icon: "pumpkin", reason: "name:pumpkin" },
  { pattern: /\bapple\b/, icon: "apple", reason: "name:apple" },
  { pattern: /\bmirror\b/, icon: "mirror", reason: "name:mirror" },
  { pattern: /\bslipper\b/, icon: "slipper", reason: "name:slipper" },
  { pattern: /\bcarriage\b|\bcoach\b/, icon: "carriage", reason: "name:carriage" },
  { pattern: /\bhood\b/, icon: "hood", reason: "name:hood" },
  { pattern: /\bcomb\b/, icon: "comb", reason: "name:comb" },
  { pattern: /\bcoffin\b/, icon: "coffin", reason: "name:coffin" },
  { pattern: /\bspindle\b/, icon: "spindle", reason: "name:spindle" },
  { pattern: /\bball\b/, icon: "ball", reason: "name:ball" },
  { pattern: /\bmother\b|\bfather\b|\bparent\b|\bstepmother\b|\bstepfather\b/, icon: "parent", reason: "name:parent" },
  { pattern: /\bchild\b/, icon: "child", reason: "name:child" },
  { pattern: /\belder\b|\bgrandmother\b|\bgrandfather\b/, icon: "elder", reason: "name:elder" },
  { pattern: /\bmerchant\b|\bpeddler\b|\bvendor\b/, icon: "merchant", reason: "name:merchant" },
  { pattern: /\baxe\b|\bwoodcutter\b/, icon: "axe", reason: "name:axe" },
  { pattern: /\bpickaxe\b|\bminer\b/, icon: "pickaxe", reason: "name:pickaxe" },
  { pattern: /\bgown\b|\bdress\b/, icon: "gown", reason: "name:gown" },
  { pattern: /\btrumpet\b|\bherald\b/, icon: "trumpet", reason: "name:trumpet" },
  { pattern: /\bbaby\b|\binfant\b/, icon: "baby", reason: "name:baby" },
] as const);

function normalizedName(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

function explicitIconCandidate(attributes: unknown): unknown {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const record = attributes as Record<string, unknown>;
  const style =
    record.style && typeof record.style === "object" && !Array.isArray(record.style)
      ? (record.style as Record<string, unknown>)
      : {};
  return style.icon ?? record.icon ?? null;
}

export function suggestSemanticIcon(entity: {
  readonly name?: unknown;
  readonly type?: unknown;
}): SemanticIconSuggestion | null {
  const name = normalizedName(entity.name);
  if (!name) return null;

  const typeFallback = defaultSemanticIconForEntityType(entity.type);
  if (typeFallback === "group" || typeFallback === "evidence" || typeFallback === "place") {
    return null;
  }

  for (const rule of NAME_RULES) {
    if (!rule.pattern.test(name)) continue;
    return {
      icon: rule.icon,
      confidence: "high",
      reason: rule.reason,
    };
  }
  return null;
}

export function auditSemanticIconQuality(
  entities: readonly SemanticIconAuditEntity[],
): SemanticIconQualityAudit {
  const unsupportedIconIds: string[] = [];
  const highConfidenceSuggestionIds: string[] = [];
  const genericFallbackIds: string[] = [];
  const missingIconIds: string[] = [];
  let explicitCount = 0;

  for (const entity of entities) {
    const candidate = explicitIconCandidate(entity.attributes);
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      const explicit = normalizeSemanticIconName(candidate);
      if (explicit) explicitCount += 1;
      else unsupportedIconIds.push(entity.id);
      continue;
    }

    const suggestion = suggestSemanticIcon(entity);
    if (suggestion) {
      highConfidenceSuggestionIds.push(entity.id);
      continue;
    }

    const fallback = defaultSemanticIconForEntityType(entity.type);
    if (fallback && GENERIC_ICON_NAMES.has(fallback)) {
      genericFallbackIds.push(entity.id);
      continue;
    }
    if (!fallback) missingIconIds.push(entity.id);
  }

  return Object.freeze({
    total: entities.length,
    explicitCount,
    unsupportedIconIds: Object.freeze(unsupportedIconIds),
    highConfidenceSuggestionIds: Object.freeze(highConfidenceSuggestionIds),
    genericFallbackIds: Object.freeze(genericFallbackIds),
    missingIconIds: Object.freeze(missingIconIds),
  });
}
