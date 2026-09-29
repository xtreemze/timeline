export type SemanticColorTheme = "light" | "dark";
export type SemanticColorState = "subdued" | "ambient" | "active";

interface SemanticColorProfile {
  readonly saturation: number;
  readonly lightness: number;
}

const PROFILES: Readonly<
  Record<SemanticColorTheme, Readonly<Record<SemanticColorState, SemanticColorProfile>>>
> = Object.freeze({
  light: Object.freeze({
    subdued: Object.freeze({ saturation: 18, lightness: 56 }),
    ambient: Object.freeze({ saturation: 36, lightness: 44 }),
    active: Object.freeze({ saturation: 70, lightness: 36 }),
  }),
  dark: Object.freeze({
    subdued: Object.freeze({ saturation: 18, lightness: 50 }),
    ambient: Object.freeze({ saturation: 40, lightness: 64 }),
    active: Object.freeze({ saturation: 72, lightness: 72 }),
  }),
});

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const HSL_COLOR =
  /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*(?:deg)?(?:\s+|\s*,\s*)\d+(?:\.\d+)?%?(?:\s+|\s*,\s*)\d+(?:\.\d+)?%?/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSemanticHue(value: unknown, fallback = 30): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return normalizeSemanticHue(fallback, 30);
  return ((numeric % 360) + 360) % 360;
}

function hexRgb(value: string): readonly [number, number, number] | null {
  if (!HEX_COLOR.test(value)) return null;
  const raw = value.slice(1);
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : raw.slice(0, 6);
  const channel = (offset: number) => Number.parseInt(normalized.slice(offset, offset + 2), 16);
  const rgb = [channel(0), channel(2), channel(4)] as const;
  return rgb.every(Number.isFinite) ? rgb : null;
}

function rgbHue(red: number, green: number, blue: number): number {
  const r = clamp(red, 0, 255) / 255;
  const g = clamp(green, 0, 255) / 255;
  const b = clamp(blue, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  return normalizeSemanticHue(hue);
}

export function semanticHue(value: unknown, fallback = 30): number {
  if (typeof value === "number") return normalizeSemanticHue(value, fallback);
  if (typeof value !== "string") return normalizeSemanticHue(fallback);
  const color = value.trim();
  const hsl = color.match(HSL_COLOR);
  if (hsl?.[1] !== undefined) return normalizeSemanticHue(Number(hsl[1]), fallback);
  const rgb = hexRgb(color);
  return rgb ? rgbHue(rgb[0], rgb[1], rgb[2]) : normalizeSemanticHue(fallback);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = normalizeSemanticHue(hue);
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = h / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  let rgb: readonly [number, number, number];
  if (sector < 1) rgb = [chroma, x, 0];
  else if (sector < 2) rgb = [x, chroma, 0];
  else if (sector < 3) rgb = [0, chroma, x];
  else if (sector < 4) rgb = [0, x, chroma];
  else if (sector < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  const m = l - chroma / 2;
  const byte = (channel: number) =>
    Math.round(clamp(channel + m, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(rgb[0])}${byte(rgb[1])}${byte(rgb[2])}`;
}

export function semanticColorHex(
  value: unknown,
  theme: SemanticColorTheme,
  state: SemanticColorState = "ambient",
  fallbackHue = 30,
): string {
  const profile = PROFILES[theme][state];
  return hslToHex(
    semanticHue(value, fallbackHue),
    profile.saturation,
    profile.lightness,
  );
}

export function semanticColorCss(
  value: unknown,
  state: SemanticColorState = "ambient",
  fallbackHue = 30,
): string {
  const hue = semanticHue(value, fallbackHue);
  const light = PROFILES.light[state];
  const dark = PROFILES.dark[state];
  return `light-dark(hsl(${hue.toFixed(1)}deg ${light.saturation}% ${light.lightness}%), hsl(${hue.toFixed(1)}deg ${dark.saturation}% ${dark.lightness}%))`;
}

/**
 * Stable interchange carrier for a user's hue preference. Renderers must not
 * treat this saturation/lightness as authored presentation authority.
 */
export function canonicalSemanticHueColor(value: unknown, fallbackHue = 30): string {
  return hslToHex(semanticHue(value, fallbackHue), 64, 50);
}

export function semanticThemeForSurface(
  background: unknown,
  fallback: SemanticColorTheme = "light",
): SemanticColorTheme {
  if (typeof background !== "string") return fallback;
  const rgb = hexRgb(background.trim());
  if (!rgb) return fallback;
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
  return luminance < 0.42 ? "dark" : "light";
}
