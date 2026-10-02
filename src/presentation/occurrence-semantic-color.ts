import { canonicalSemanticHueColor, normalizeSemanticColorSource } from "./semantic-color.ts";

export interface OccurrenceNodeSemanticStyle {
  readonly fillColor: string;
  readonly borderColor: string;
}

const FILL_KEYS = ["fillColor", "fill", "backgroundColor", "color"] as const;
const BORDER_KEYS = ["borderColor", "border", "stroke", "strokeColor"] as const;

export function semanticHueCarrier(value: unknown): string | null {
  const source = normalizeSemanticColorSource(value);
  return source === null ? null : canonicalSemanticHueColor(source);
}

export function occurrenceNodeSemanticStyle(
  categoryColors: readonly unknown[],
  tagColors: readonly unknown[],
): OccurrenceNodeSemanticStyle | null {
  const categories = categoryColors
    .map(semanticHueCarrier)
    .filter((value): value is string => Boolean(value));
  const tags = tagColors.map(semanticHueCarrier).filter((value): value is string => Boolean(value));

  const fillColor = categories[0] ?? tags[0] ?? null;
  if (!fillColor) return null;
  const borderColor = tags[0] ?? categories[1] ?? fillColor;
  return Object.freeze({ fillColor, borderColor });
}

function hasAny(style: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return keys.some((key) => {
    const value = style[key];
    return value !== undefined && value !== null && value !== "";
  });
}

/**
 * Occurrence semantics fill only presentation gaps. Explicit entity styling
 * remains authoritative, while a category/tag may still supply whichever of
 * fill or border the entity did not explicitly author.
 */
export function mergeOccurrenceNodeSemanticStyle(
  authoredStyle: Readonly<Record<string, unknown>>,
  semanticStyle: OccurrenceNodeSemanticStyle | null | undefined,
): Readonly<Record<string, unknown>> {
  if (!semanticStyle) return authoredStyle;
  const hasFill = hasAny(authoredStyle, FILL_KEYS);
  const hasBorder = hasAny(authoredStyle, BORDER_KEYS);
  if (hasFill && hasBorder) return authoredStyle;
  return Object.freeze({
    ...(!hasFill ? { fillColor: semanticStyle.fillColor } : {}),
    ...(!hasBorder ? { borderColor: semanticStyle.borderColor } : {}),
    ...authoredStyle,
  });
}
