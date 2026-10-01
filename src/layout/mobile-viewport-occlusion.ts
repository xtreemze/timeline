export type MobileViewportGeometry = Readonly<{
  layoutHeight: number;
  visualHeight: number;
  scale?: number | null;
}>;

function finitePositive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Measure bottom occlusion in layout CSS pixels without treating pinch zoom as a keyboard.
 *
 * VisualViewport.height shrinks for both IME occlusion and user zoom. Multiplying the visible
 * height by VisualViewport.scale converts the zoomed visual viewport back into layout CSS pixels,
 * leaving only genuine vertical occlusion. Viewport pan offsets are intentionally irrelevant here:
 * they describe which part of the layout viewport is visible, not how much of it is covered.
 */
export function mobileKeyboardOcclusionPx(geometry: MobileViewportGeometry): number {
  const visualHeight = finitePositive(geometry.visualHeight, 1);
  const scale = finitePositive(geometry.scale, 1);
  const unzoomedVisibleHeight = visualHeight * scale;
  const layoutHeight = Math.max(
    finitePositive(geometry.layoutHeight, unzoomedVisibleHeight),
    unzoomedVisibleHeight,
  );
  return Math.max(0, layoutHeight - unzoomedVisibleHeight);
}

/**
 * Keep an already-owned keyboard inset during the short focus transition while the IME animates
 * closed. A different control cannot acquire keyboard ownership merely by shrinking the viewport.
 */
export function composerKeyboardInsetPx(
  measuredOcclusion: number,
  inputFocused: boolean,
  previousInset: number,
): number {
  const measured = Math.max(0, Number.isFinite(measuredOcclusion) ? measuredOcclusion : 0);
  const previous = Math.max(0, Number.isFinite(previousInset) ? previousInset : 0);
  return inputFocused || previous > 0 ? measured : 0;
}
