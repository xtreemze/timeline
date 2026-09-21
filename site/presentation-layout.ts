/**
 * Timeline presentation layout classification
 * Detects stage shape and physical orientation from dimensions
 */

const FULLSCREEN_WIDE_RATIO = 1.15;
const FULLSCREEN_TALL_RATIO = 0.85;
const WORKSPACE_WIDE_MIN_PX = 1100;

function finiteDimension(value: unknown, name: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
  return numeric;
}

interface StageShapeOptions {
  fullscreen?: boolean;
}

export function classifyStageShape(
  width: number,
  height: number,
  options?: StageShapeOptions,
): string {
  const normalizedWidth = finiteDimension(width, "width");
  const normalizedHeight = finiteDimension(height, "height");
  const ratio = normalizedWidth / normalizedHeight;

  if (options?.fullscreen) {
    if (ratio >= FULLSCREEN_WIDE_RATIO) return "wide";
    if (ratio <= FULLSCREEN_TALL_RATIO) return "tall";
    return "stacked";
  }

  if (normalizedWidth >= WORKSPACE_WIDE_MIN_PX) return "wide";
  if (ratio <= FULLSCREEN_TALL_RATIO) return "tall";
  return "stacked";
}

export function physicalOrientation(width: number, height: number): string {
  const normalizedWidth = finiteDimension(width, "width");
  const normalizedHeight = finiteDimension(height, "height");
  if (normalizedWidth > normalizedHeight) return "landscape";
  if (normalizedHeight > normalizedWidth) return "portrait";
  return "square";
}

const TimelinePresentationLayoutObj = {
  FULLSCREEN_WIDE_RATIO,
  FULLSCREEN_TALL_RATIO,
  WORKSPACE_WIDE_MIN_PX,
  classifyStageShape,
  physicalOrientation,
} as const;

export const TimelinePresentationLayout = Object.freeze(TimelinePresentationLayoutObj);
