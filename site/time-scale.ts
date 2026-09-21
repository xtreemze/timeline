/**
 * Timeline time scale utilities
 * Viewport pan/zoom, tick generation for calendar/fixed intervals, date formatting
 */

const FIXED_UNITS: Record<string, number> = {
  millisecond: 1,
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
};

interface TickCandidate {
  unit: string;
  step: number;
  approxMs: number;
}

const CANDIDATE_STEPS: ReadonlyArray<readonly [string, number]> = [
  ["millisecond", 1],
  ["millisecond", 2],
  ["millisecond", 5],
  ["millisecond", 10],
  ["millisecond", 20],
  ["millisecond", 50],
  ["millisecond", 100],
  ["millisecond", 200],
  ["millisecond", 500],
  ["second", 1],
  ["second", 2],
  ["second", 5],
  ["second", 10],
  ["second", 15],
  ["second", 30],
  ["minute", 1],
  ["minute", 2],
  ["minute", 5],
  ["minute", 10],
  ["minute", 15],
  ["minute", 30],
  ["hour", 1],
  ["hour", 2],
  ["hour", 3],
  ["hour", 6],
  ["hour", 12],
  ["day", 1],
  ["day", 2],
  ["week", 1],
  ["week", 2],
  ["month", 1],
  ["month", 3],
  ["month", 6],
  ["year", 1],
  ["year", 2],
  ["year", 5],
  ["year", 10],
  ["year", 20],
  ["year", 50],
  ["year", 100],
  ["year", 200],
  ["year", 500],
];

const CANDIDATES: TickCandidate[] = CANDIDATE_STEPS.map(([unit, step]) => ({
  unit,
  step,
  approxMs: approximateMilliseconds(unit, step),
}));

export function approximateMilliseconds(unit: string, step: number): number {
  if (FIXED_UNITS[unit]) return FIXED_UNITS[unit]! * step;
  if (unit === "month") return 30.436875 * FIXED_UNITS.day! * step;
  if (unit === "year") return 365.2425 * FIXED_UNITS.day! * step;
  throw new Error(`Unknown temporal unit: ${unit}`);
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
}

interface Viewport {
  start: number;
  end: number;
}

export function normalizeViewport(viewport: unknown): Viewport {
  if (!viewport || typeof viewport !== "object")
    throw new TypeError("Expected a viewport object.");
  const start = Number((viewport as any).start);
  const end = Number((viewport as any).end);
  assertFinite(start, "viewport.start");
  assertFinite(end, "viewport.end");
  if (end <= start) throw new RangeError("viewport.end must be greater than viewport.start.");
  return { start, end };
}

export function pan(viewport: unknown, deltaMs: number): Viewport {
  const value = normalizeViewport(viewport);
  assertFinite(deltaMs, "deltaMs");
  return { start: value.start + deltaMs, end: value.end + deltaMs };
}

export function zoom(
  viewport: unknown,
  factor: number,
  anchorMs: number | null = null,
  minSpanMs: number = 1,
): Viewport {
  const value = normalizeViewport(viewport);
  assertFinite(factor, "factor");
  if (factor <= 0) throw new RangeError("factor must be greater than zero.");
  assertFinite(minSpanMs, "minSpanMs");
  if (minSpanMs <= 0) throw new RangeError("minSpanMs must be greater than zero.");

  const span = value.end - value.start;
  const anchor = anchorMs === null ? value.start + span / 2 : Number(anchorMs);
  assertFinite(anchor, "anchorMs");

  const nextSpan = Math.max(minSpanMs, span * factor);
  const ratio = span === 0 ? 0.5 : (anchor - value.start) / span;
  const start = anchor - nextSpan * ratio;
  return { start, end: start + nextSpan };
}

interface FitOptions {
  paddingRatio?: number;
  minSpanMs?: number;
}

export function fit(values: unknown, options?: FitOptions): Viewport {
  if (!Array.isArray(values) || values.length === 0)
    throw new TypeError("fit() requires at least one temporal coordinate.");
  const { paddingRatio = 0.08, minSpanMs = 1000 } = options || {};
  const numeric = values.map(Number);
  numeric.forEach((value, index) => {
    assertFinite(value, `values[${index}]`);
  });
  let start = Math.min(...numeric);
  let end = Math.max(...numeric);
  const rawSpan = Math.max(end - start, minSpanMs);
  const padding = rawSpan * Math.max(0, paddingRatio);
  if (start === end) {
    start -= rawSpan / 2;
    end += rawSpan / 2;
  }
  return { start: start - padding, end: end + padding };
}

export function coordinateFor(timeMs: number, viewport: unknown, pixelLength: number): number {
  const value = normalizeViewport(viewport);
  assertFinite(timeMs, "timeMs");
  assertFinite(pixelLength, "pixelLength");
  return ((timeMs - value.start) / (value.end - value.start)) * pixelLength;
}

export interface TickSpec {
  unit: string;
  step: number;
  approxMs: number;
}

export function selectTickSpec(
  viewport: unknown,
  pixelLength: number,
  targetPixelSpacing: number = 96,
): TickSpec {
  const value = normalizeViewport(viewport);
  assertFinite(pixelLength, "pixelLength");
  assertFinite(targetPixelSpacing, "targetPixelSpacing");
  if (pixelLength <= 0 || targetPixelSpacing <= 0)
    throw new RangeError("Pixel lengths must be greater than zero.");

  const desired = (value.end - value.start) / Math.max(1, pixelLength / targetPixelSpacing);
  const builtIn = CANDIDATES.find((candidate) => candidate.approxMs >= desired);
  if (builtIn) return { ...builtIn };

  const approximateYears = desired / approximateMilliseconds("year", 1);
  const exponent = Math.floor(Math.log10(approximateYears));
  const base = 10 ** exponent;
  const multiplier = [1, 2, 5, 10].find((value) => value * base >= approximateYears) || 10;
  const step = Math.max(1, multiplier * base);
  return { unit: "year", step, approxMs: approximateMilliseconds("year", step) };
}

export function createUtcDate(
  year: number,
  monthIndex: number = 0,
  day: number = 1,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  millisecond: number = 0,
): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date;
}

function ceilFixedTick(start: number, stepMs: number): number {
  return Math.ceil(start / stepMs) * stepMs;
}

function firstCalendarTick(start: number, spec: TickSpec): number {
  const date = new Date(start);
  if (spec.unit === "month") {
    const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth();
    let tickMonth = Math.floor(absoluteMonth / spec.step) * spec.step;
    let year = Math.floor(tickMonth / 12);
    let month = ((tickMonth % 12) + 12) % 12;
    let tick = createUtcDate(year, month, 1).getTime();
    while (tick < start) {
      tickMonth += spec.step;
      year = Math.floor(tickMonth / 12);
      month = ((tickMonth % 12) + 12) % 12;
      tick = createUtcDate(year, month, 1).getTime();
    }
    return tick;
  }

  let year = Math.floor(date.getUTCFullYear() / spec.step) * spec.step;
  let tick = createUtcDate(year, 0, 1).getTime();
  while (tick < start) {
    year += spec.step;
    tick = createUtcDate(year, 0, 1).getTime();
  }
  return tick;
}

function nextCalendarTick(current: number, spec: TickSpec): number {
  const date = new Date(current);
  if (spec.unit === "month") {
    const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth() + spec.step;
    const year = Math.floor(absoluteMonth / 12);
    const month = ((absoluteMonth % 12) + 12) % 12;
    return createUtcDate(year, month, 1).getTime();
  }
  return createUtcDate(date.getUTCFullYear() + spec.step, 0, 1).getTime();
}

interface Tick {
  value: number;
  label: string;
  spec: TickSpec;
}

export function generateTicksForSpec(
  viewport: unknown,
  spec: TickSpec,
  limit: number = 2000,
): Tick[] {
  const value = normalizeViewport(viewport);
  if (!spec || typeof spec.unit !== "string" || !spec.unit.trim()) {
    throw new TypeError("generateTicksForSpec() requires a semantic tick unit.");
  }
  assertFinite(spec.step, "spec.step");
  if (spec.step <= 0) throw new RangeError("Tick steps must be greater than zero.");
  const normalizedSpec: TickSpec = {
    unit: spec.unit,
    step: spec.step,
    approxMs: Number.isFinite(spec.approxMs)
      ? spec.approxMs
      : approximateMilliseconds(spec.unit, spec.step),
  };
  const ticks: Tick[] = [];

  if (FIXED_UNITS[normalizedSpec.unit]) {
    const stepMs = FIXED_UNITS[normalizedSpec.unit]! * normalizedSpec.step;
    let tick = ceilFixedTick(value.start, stepMs);
    while (tick <= value.end && ticks.length < limit) {
      ticks.push({
        value: tick,
        label: formatTick(tick, normalizedSpec),
        spec: normalizedSpec,
      });
      tick += stepMs;
    }
    return ticks;
  }

  let tick = firstCalendarTick(value.start, normalizedSpec);
  while (tick <= value.end && ticks.length < limit) {
    ticks.push({
      value: tick,
      label: formatTick(tick, normalizedSpec),
      spec: normalizedSpec,
    });
    tick = nextCalendarTick(tick, normalizedSpec);
  }
  return ticks;
}

export function generateTicks(
  viewport: unknown,
  pixelLength: number,
  targetPixelSpacing: number = 96,
  limit: number = 2000,
): Tick[] {
  const value = normalizeViewport(viewport);
  const spec = selectTickSpec(value, pixelLength, targetPixelSpacing);
  return generateTicksForSpec(value, spec, limit);
}

function pad(value: number, width: number = 2): string {
  return String(Math.abs(value)).padStart(width, "0");
}

function formatYear(year: number): string {
  if (year > 0) return String(year);
  return `${1 - year} BCE`;
}

export function formatTick(timeMs: number, spec: TickSpec): string {
  const date = new Date(timeMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const millisecond = date.getUTCMilliseconds();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (spec.unit === "millisecond")
    return `${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
  if (spec.unit === "second") return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
  if (spec.unit === "minute") return `${pad(hour)}:${pad(minute)}`;
  if (spec.unit === "hour") return `${pad(day)} ${monthNames[month]} ${pad(hour)}:00`;
  if (spec.unit === "day" || spec.unit === "week")
    return `${pad(day)} ${monthNames[month]} ${formatYear(year)}`;
  if (spec.unit === "month") return `${monthNames[month]} ${formatYear(year)}`;
  return formatYear(year);
}

// Export public API as frozen object for backward compatibility
const TimelineScaleObj = {
  FIXED_UNITS: Object.freeze({ ...FIXED_UNITS }),
  approximateMilliseconds,
  coordinateFor,
  createUtcDate,
  fit,
  formatTick,
  generateTicks,
  generateTicksForSpec,
  normalizeViewport,
  pan,
  selectTickSpec,
  zoom,
} as const;

export const TimelineScale = Object.freeze(TimelineScaleObj);
