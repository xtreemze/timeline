import type { WorldNodeStyle } from "../../src/layout/world-graph-style.ts";
import { iconPathData } from "../event-presentation.ts";
import { worldEntityIconName } from "./world-entity-icon.ts";

/**
 * Composes a node marker (shape filled with the node colour, a border, and
 * either the node's own image or a white glyph from the shared icon set) as
 * an SVG icon for deck.gl's IconLayer. Rendered at 2x for crisp edges and
 * cached per distinct style, so a scene only uploads one texture per look.
 */

export interface WorldNodeMarker {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mask: false;
  /** On-screen marker size (pixels) for IconLayer `getSize`. */
  readonly size: number;
}

const SUPERSAMPLE = 2;
const markers = new Map<string, WorldNodeMarker>();

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function shapePath(shape: WorldNodeStyle["shape"], center: number, radius: number): string {
  switch (shape) {
    case "square": {
      const side = radius * 1.7;
      const start = center - side / 2;
      return `<rect x="${start}" y="${start}" width="${side}" height="${side}" rx="${radius * 0.25}"/>`;
    }
    case "diamond":
      return `<path d="M${center} ${center - radius}L${center + radius} ${center}L${center} ${center + radius}L${center - radius} ${center}Z"/>`;
    case "hexagon": {
      const points = Array.from({ length: 6 }, (_, index) => {
        const angle = (Math.PI / 3) * index - Math.PI / 6;
        return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
      }).join(" ");
      return `<polygon points="${points}"/>`;
    }
    default:
      return `<circle cx="${center}" cy="${center}" r="${radius}"/>`;
  }
}

export function worldNodeMarker(style: WorldNodeStyle): WorldNodeMarker {
  const key = [
    style.shape,
    style.fill,
    style.border,
    style.borderWidth,
    style.radius,
    style.icon ?? "",
    style.image ?? "",
  ].join("|");
  const cached = markers.get(key);
  if (cached) return cached;

  const size = Math.ceil((style.radius + style.borderWidth) * 2 + 2);
  const pixels = size * SUPERSAMPLE;
  const center = size / 2;
  const body = shapePath(style.shape, center, style.radius);
  const iconName = style.icon ? worldEntityIconName(style.icon) : null;
  const glyphSize = style.radius * 1.15;
  const glyphOrigin = center - glyphSize / 2;
  const inner = style.image
    ? `<clipPath id="c">${shapePath(style.shape, center, style.radius - 0.5)}</clipPath><image href="${escapeAttribute(style.image)}" x="${center - style.radius}" y="${center - style.radius}" width="${style.radius * 2}" height="${style.radius * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>`
    : iconName
      ? `<g transform="translate(${glyphOrigin} ${glyphOrigin}) scale(${glyphSize / 24})" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconPathData(
          iconName,
        )
          .map((d) => `<path d="${d}"/>`)
          .join("")}</g>`
      : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${pixels}" height="${pixels}"><g fill="${style.fill}" stroke="${style.border}" stroke-width="${style.borderWidth}">${body}</g>${inner}</svg>`;

  const marker: WorldNodeMarker = Object.freeze({
    id: `lum-node:${key}`,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    width: pixels,
    height: pixels,
    mask: false,
    size,
  });
  markers.set(key, marker);
  return marker;
}
