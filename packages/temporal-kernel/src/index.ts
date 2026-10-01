export interface TemporalWindow {
  readonly start: number;
  readonly end: number;
}

export interface TemporalItem {
  readonly id: string;
  readonly start: number;
  readonly end?: number | null;
}

export interface RenderWindowOptions {
  readonly overscanRatio?: number;
  readonly velocityTemporalPerMs?: number;
  readonly predictionHorizonMs?: number;
  readonly zoomVelocity?: number;
  readonly maxSpanMultiplier?: number;
}

export interface TemporalRetentionState {
  readonly active: boolean;
  readonly extent: TemporalWindow;
}

const DEFAULT_OVERSCAN_RATIO = 0.5;
const DEFAULT_PREDICTION_HORIZON_MS = 240;
const DEFAULT_MAX_SPAN_MULTIPLIER = 4;
const MIN_SPAN = 1;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function canonicalToken(value: string, message: string): string {
  const token = value.trim();
  if (!token) {
    throw new Error(message);
  }
  return token;
}

export function normalizeWindow(extent: TemporalWindow): TemporalWindow {
  const start = finite(extent.start, 0);
  const end = finite(extent.end, start + MIN_SPAN);
  if (end > start) {
    return { start, end };
  }
  return { start: end, end: start + MIN_SPAN };
}

export function windowSpan(extent: TemporalWindow): number {
  const normalized = normalizeWindow(extent);
  return normalized.end - normalized.start;
}

export function itemOverlapsWindow(
  item: Pick<TemporalItem, "start" | "end">,
  extent: TemporalWindow,
): boolean {
  const normalized = normalizeWindow(extent);
  if (!Number.isFinite(item.start)) {
    return false;
  }
  const end = Number.isFinite(item.end) ? Number(item.end) : item.start;
  return end >= normalized.start && item.start <= normalized.end;
}

export function visibleIntervalAnchor(
  item: Pick<TemporalItem, "start" | "end">,
  extent: TemporalWindow,
  ratio = 0.5,
): number | null {
  if (!itemOverlapsWindow(item, extent)) {
    return null;
  }
  if (!Number.isFinite(item.end)) {
    return item.start;
  }
  const normalized = normalizeWindow(extent);
  const visibleStart = Math.max(item.start, normalized.start);
  const visibleEnd = Math.min(Number(item.end), normalized.end);
  const normalizedRatio = Math.min(1, Math.max(0, finite(ratio, 0.5)));
  return visibleStart + (visibleEnd - visibleStart) * normalizedRatio;
}

export function createRenderWindow(
  viewport: TemporalWindow,
  options: RenderWindowOptions = {},
): TemporalWindow {
  const normalized = normalizeWindow(viewport);
  const span = windowSpan(normalized);
  const overscanRatio = Math.max(
    0,
    finite(options.overscanRatio ?? DEFAULT_OVERSCAN_RATIO, DEFAULT_OVERSCAN_RATIO),
  );
  const horizon = Math.max(
    0,
    finite(
      options.predictionHorizonMs ?? DEFAULT_PREDICTION_HORIZON_MS,
      DEFAULT_PREDICTION_HORIZON_MS,
    ),
  );
  const velocity = finite(options.velocityTemporalPerMs ?? 0, 0);
  const zoomVelocity = Math.abs(finite(options.zoomVelocity ?? 0, 0));
  const maxSpanMultiplier = Math.max(
    1,
    finite(options.maxSpanMultiplier ?? DEFAULT_MAX_SPAN_MULTIPLIER, DEFAULT_MAX_SPAN_MULTIPLIER),
  );

  const baseline = span * overscanRatio;
  const predictedTravel = Math.abs(velocity) * horizon;
  const zoomAllowance = span * Math.min(1, zoomVelocity);
  let before = baseline + zoomAllowance;
  let after = baseline + zoomAllowance;
  if (velocity < 0) {
    before += predictedTravel;
  }
  if (velocity > 0) {
    after += predictedTravel;
  }

  const maxExtra = Math.max(0, span * maxSpanMultiplier - span);
  const requestedExtra = before + after;
  if (requestedExtra > maxExtra && requestedExtra > 0) {
    const scale = maxExtra / requestedExtra;
    before *= scale;
    after *= scale;
  }

  return {
    start: normalized.start - before,
    end: normalized.end + after,
  };
}

export function unionWindows(left: TemporalWindow, right: TemporalWindow): TemporalWindow {
  const a = normalizeWindow(left);
  const b = normalizeWindow(right);
  return {
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
  };
}

function clampRetainedWindow(
  retained: TemporalWindow,
  viewport: TemporalWindow,
  maxSpanMultiplier: number,
): TemporalWindow {
  const logical = normalizeWindow(viewport);
  const maxSpan = windowSpan(logical) * Math.max(1, maxSpanMultiplier);
  const current = normalizeWindow(retained);
  if (windowSpan(current) <= maxSpan) {
    return current;
  }

  const center = (logical.start + logical.end) / 2;
  const half = maxSpan / 2;
  return { start: center - half, end: center + half };
}

export function beginRetention(renderWindow: TemporalWindow): TemporalRetentionState {
  return {
    active: true,
    extent: normalizeWindow(renderWindow),
  };
}

export function extendRetention(
  state: TemporalRetentionState,
  nextRenderWindow: TemporalWindow,
  viewport: TemporalWindow,
  maxSpanMultiplier = 8,
): TemporalRetentionState {
  const next = normalizeWindow(nextRenderWindow);
  if (!state.active) {
    return beginRetention(next);
  }
  return {
    active: true,
    extent: clampRetainedWindow(unionWindows(state.extent, next), viewport, maxSpanMultiplier),
  };
}

export function commitRetention(renderWindow: TemporalWindow): TemporalRetentionState {
  return {
    active: false,
    extent: normalizeWindow(renderWindow),
  };
}

export function queryTemporalItems<T extends TemporalItem>(
  items: readonly T[],
  extent: TemporalWindow,
): T[] {
  return items
    .filter((item) => itemOverlapsWindow(item, extent))
    .sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
}

export function stableSceneKey(namespace: string, id: string): string {
  const canonicalNamespace = canonicalToken(
    String(namespace || ""),
    "Stable scene keys require a non-empty namespace.",
  );
  const canonicalId = canonicalToken(
    String(id || ""),
    "Stable scene keys require a stable canonical id.",
  );
  return `${canonicalNamespace}:${canonicalId}`;
}
