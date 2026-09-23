/**
 * Timeline item clustering and temporal accent planning
 * Groups items by spatial proximity, generates temporal accent labels, manages focus/context viewports
 */

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function finite(value: unknown, fallback: number = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

interface TimelineItem {
  id: string | number;
  start: number;
  end?: number;
}

interface ProjectedEntry {
  item: TimelineItem;
  position: number;
  coincident: boolean;
}

interface ClusterGroup {
  entries: ProjectedEntry[];
  centroid: number;
}

interface SingleCluster {
  kind: "item";
  id: string;
  item: TimelineItem;
  items: TimelineItem[];
  position: number;
  start: number;
  end: number;
}

interface MultiCluster {
  kind: "cluster";
  id: string;
  items: TimelineItem[];
  position: number;
  start: number;
  end: number;
}

type Cluster = SingleCluster | MultiCluster;

export function clusterProjectedItems(
  items: unknown,
  positionFor: (item: any) => number,
  thresholdPx: number = 120,
): Cluster[] {
  if (!Array.isArray(items)) return [];
  if (typeof positionFor !== "function") throw new TypeError("positionFor must be a function.");
  const threshold = Math.max(1, finite(thresholdPx, 120));
  const startCounts = new Map<string, number>();
  for (const item of items) {
    if (!item || !Number.isFinite(item.start)) continue;
    const key = String(item.start);
    startCounts.set(key, (startCounts.get(key) || 0) + 1);
  }

  const projected: ProjectedEntry[] = items
    .map((item: any) => ({
      item,
      position: finite(positionFor(item), Number.NaN),
      coincident: Number.isFinite(item?.start) && (startCounts.get(String(item.start)) || 0) > 1,
    }))
    .filter((entry: ProjectedEntry) => Number.isFinite(entry.position))
    .sort(
      (a: ProjectedEntry, b: ProjectedEntry) =>
        a.position - b.position || String(a.item.id).localeCompare(String(b.item.id)),
    );

  const groups: ClusterGroup[] = [];
  let current: ClusterGroup | null = null;

  for (const entry of projected) {
    if (entry.coincident) {
      if (current) {
        groups.push(current);
        current = null;
      }
      groups.push({ entries: [entry], centroid: entry.position });
      continue;
    }

    if (!current) {
      current = { entries: [entry], centroid: entry.position };
      continue;
    }

    const previousEntry = current.entries.at(-1);
    const firstEntry = current.entries[0];
    if (!previousEntry || !firstEntry) {
      current = { entries: [entry], centroid: entry.position };
      continue;
    }
    const previousPosition = previousEntry.position;
    const adjacentDistance = Math.abs(entry.position - previousPosition);
    const envelopeStart = firstEntry.position;
    const envelopeEnd = entry.position;
    const envelopeWidth = envelopeEnd - envelopeStart;

    if (adjacentDistance <= threshold && envelopeWidth <= threshold * 1.9) {
      current.entries.push(entry);
      current.centroid =
        current.entries.reduce((sum, candidate) => sum + candidate.position, 0) /
        current.entries.length;
    } else {
      groups.push(current);
      current = { entries: [entry], centroid: entry.position };
    }
  }
  if (current) groups.push(current);

  return groups.map((group): Cluster => {
    if (group.entries.length === 1) {
      const only = group.entries[0];
      if (!only) {
        throw new Error("Single-entry timeline cluster lost its retained entry.");
      }
      return {
        kind: "item",
        id: String(only.item.id),
        item: only.item,
        items: [only.item],
        position: only.position,
        start: only.item.start,
        end: Number.isFinite(only.item.end) ? only.item.end! : only.item.start,
      };
    }

    const groupedItems = group.entries.map((entry) => entry.item);
    const ids = groupedItems.map((item) => String(item.id)).sort();
    const start = Math.min(...groupedItems.map((item) => item.start));
    const end = Math.max(
      ...groupedItems.map((item) => (Number.isFinite(item.end) ? item.end! : item.start)),
    );
    return {
      kind: "cluster",
      id: `cluster:${ids.join("|")}`,
      items: groupedItems,
      position: group.centroid,
      start,
      end,
    };
  });
}

function getMonthKey(timeMs: number): string | null {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function formatMonthYear(timeMs: number): string {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const yearLabel = year > 0 ? String(year) : `${1 - year} BCE`;
  return `${MONTH_NAMES[date.getUTCMonth()]} ${yearLabel}`;
}

export function dayKey(timeMs: number): string | null {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDayMonthYear(timeMs: number): string {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const yearLabel = year > 0 ? String(year) : `${1 - year} BCE`;
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${yearLabel}`;
}

interface AccentInfo {
  key: string;
  count: number;
  time: number;
  label: string;
  itemIds: string[];
}

interface AccentOptions {
  maxItemsPerMonth?: number;
  limit?: number;
}

export function monthAccents(items: unknown, options?: AccentOptions): AccentInfo[] {
  const { maxItemsPerMonth = 3, limit = 18 } = options || {};
  const buckets = new Map<string, TimelineItem[]>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !Number.isFinite(item.start)) continue;
    const key = getMonthKey(item.start);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  const accents: AccentInfo[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 1 || bucket.length > maxItemsPerMonth) continue;
    const center = bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length;
    accents.push({
      key,
      count: bucket.length,
      time: center,
      label: formatMonthYear(center),
      itemIds: bucket.map((item) => String(item.id)),
    });
  }

  accents.sort((a, b) => a.time - b.time);
  if (accents.length <= limit) return accents;

  const stride = Math.ceil(accents.length / limit);
  return accents.filter((_, index) => index % stride === 0).slice(0, limit);
}

interface DayAccentOptions {
  maxItemsPerDay?: number;
  limit?: number;
}

export function dayAccents(items: unknown, options?: DayAccentOptions): AccentInfo[] {
  const { maxItemsPerDay = 3, limit = 18 } = options || {};
  const buckets = new Map<string, TimelineItem[]>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !Number.isFinite(item.start)) continue;
    const key = dayKey(item.start);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  const accents: AccentInfo[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 1 || bucket.length > maxItemsPerDay) continue;
    const center = bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length;
    accents.push({
      key,
      count: bucket.length,
      time: center,
      label: formatDayMonthYear(center),
      itemIds: bucket.map((item) => String(item.id)),
    });
  }

  accents.sort((a, b) => a.time - b.time);
  if (accents.length <= limit) return accents;

  const stride = Math.ceil(accents.length / limit);
  return accents.filter((_, index) => index % stride === 0).slice(0, limit);
}

interface YearAccentInfo extends AccentInfo {
  kind: string;
}

interface YearAccentOptions {
  limit?: number;
}

export function yearAccents(items: unknown, options?: YearAccentOptions): YearAccentInfo[] {
  const { limit = 18 } = options || {};
  const buckets = new Map<string, TimelineItem[]>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !Number.isFinite(item.start)) continue;
    const label = yearLabelForTime(item.start);
    if (!label) continue;
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(item);
  }

  const accents: YearAccentInfo[] = [...buckets.entries()]
    .map(([label, bucket]) => ({
      key: label,
      kind: "year",
      label,
      count: bucket.length,
      time: bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length,
      itemIds: bucket.map((item) => String(item.id)),
    }))
    .sort((a, b) => a.time - b.time);

  if (accents.length <= limit) return accents;
  const stride = Math.ceil(accents.length / limit);
  return accents.filter((_, index) => index % stride === 0).slice(0, limit);
}

const SUBDAY_UNITS = new Set(["millisecond", "second", "minute", "hour"]);
const FINE_UNITS = new Set([...SUBDAY_UNITS, "day", "week"]);

export function yearLabelForTime(timeMs: number): string {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getUTCFullYear();
  return year > 0 ? String(year) : `${1 - year} BCE`;
}

export function monthLabelForTime(timeMs: number): string {
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return "";
  return MONTH_NAMES[date.getUTCMonth()] ?? "";
}

interface Viewport {
  start: number;
  end: number;
}

export function projectedPosition(
  timeMs: number,
  viewport: Viewport | null,
  pixelLength: number,
  padding: number = 0,
): number {
  const start = Number(viewport?.start);
  const end = Number(viewport?.end);
  const length = Number(pixelLength);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    !Number.isFinite(length)
  ) {
    return Number.NaN;
  }
  return padding + ((Number(timeMs) - start) / (end - start)) * length;
}

interface Candidate {
  position: number;
  [key: string]: any;
}

interface NonOverlappingOptions {
  min?: number;
  max?: number;
  gap?: number;
  allowExtentOverflow?: boolean;
}

function nonOverlapping(
  candidates: Candidate[],
  extentFor: (c: Candidate) => number,
  options?: NonOverlappingOptions,
): Candidate[] {
  const {
    min = 0,
    max = Number.POSITIVE_INFINITY,
    gap = 10,
    allowExtentOverflow = false,
  } = options || {};
  const selected: Candidate[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    const extent = Math.max(1, Number(extentFor(candidate)) || 1);
    const rawPosition = Number(candidate.position);
    if (!Number.isFinite(rawPosition)) continue;
    if (!allowExtentOverflow && Number.isFinite(max) && max - min < extent) continue;
    const lower = min + extent / 2;
    const upper = Number.isFinite(max) ? max - extent / 2 : rawPosition;
    const position = allowExtentOverflow
      ? Number.isFinite(max)
        ? Math.min(max, Math.max(min, rawPosition))
        : Math.max(min, rawPosition)
      : Number.isFinite(max)
        ? Math.min(upper, Math.max(lower, rawPosition))
        : Math.max(lower, rawPosition);
    const start = position - extent / 2;
    const end = position + extent / 2;
    if (start < lastEnd + gap) continue;
    selected.push({ ...candidate, position });
    lastEnd = end;
  }
  return selected;
}

interface TemporalSpec {
  unit?: string;
}

interface TemporalAccentsOptions extends NonOverlappingOptions {
  viewport?: Viewport | null;
  pixelLength?: number;
  padding?: number;
  orientation?: string;
  spec?: TemporalSpec | null;
  maxItemsPerMonth?: number;
  limit?: number;
}

interface TemporalAccentsResult {
  mode: string;
  edgeAccents: any[];
  axisMonths: any[];
  hasAmbientContext: boolean;
}

export function planTemporalAccents(
  items: unknown,
  options?: TemporalAccentsOptions,
): TemporalAccentsResult {
  const {
    viewport = null,
    pixelLength = 0,
    padding = 0,
    orientation = "horizontal",
    spec = null,
    maxItemsPerMonth = 3,
    limit = 18,
  } = options || {};
  const usable = Math.max(1, Number(pixelLength) || 1);
  const unit = (spec as any)?.unit || null;
  const dayContext = SUBDAY_UNITS.has(unit);
  if (unit === "year") {
    const yearExtent = orientation === "vertical" ? 110 : 132;
    const edgeAccents = nonOverlapping(
      yearAccents(items, { limit })
        .map((accent: any) => ({
          ...accent,
          position: projectedPosition(accent.time, viewport as any, usable, padding),
        }))
        .filter((accent: any) => Number.isFinite(accent.position))
        .sort((a: any, b: any) => a.position - b.position),
      () => yearExtent,
      { min: padding, max: padding + usable, gap: 16, allowExtentOverflow: true },
    );
    return {
      mode: edgeAccents.length ? "year-edge" : "axis-only",
      edgeAccents,
      axisMonths: [],
      hasAmbientContext: edgeAccents.length > 0,
    };
  }

  const sourceAccents = dayContext
    ? dayAccents(items, { maxItemsPerDay: maxItemsPerMonth, limit })
    : monthAccents(items, { maxItemsPerMonth, limit });
  const accents = sourceAccents
    .map((accent: any) => ({
      ...accent,
      position: projectedPosition(accent.time, viewport as any, usable, padding),
    }))
    .filter((accent: any) => Number.isFinite(accent.position))
    .sort((a: any, b: any) => a.position - b.position);

  if (!accents.length) {
    return { mode: "axis-only", edgeAccents: [], axisMonths: [], hasAmbientContext: false };
  }

  const fullExtent = dayContext
    ? orientation === "vertical"
      ? 260
      : 300
    : orientation === "vertical"
      ? 220
      : 240;
  const fullKind = dayContext ? "day-month-year" : "month-year";
  const full = nonOverlapping(
    accents.map((accent: any) => ({ ...accent, kind: fullKind, label: accent.label })),
    () => fullExtent,
    { min: padding, max: padding + usable, gap: 14, allowExtentOverflow: true },
  );

  if (FINE_UNITS.has(unit) && full.length === accents.length) {
    return {
      mode: dayContext ? "day-month-year-edge" : "month-year-edge",
      edgeAccents: full,
      axisMonths: [],
      hasAmbientContext: true,
    };
  }

  if (dayContext) {
    const monthBuckets = new Map<string, any[]>();
    for (const accent of accents) {
      const label = formatMonthYear(accent.time);
      if (!monthBuckets.has(label)) monthBuckets.set(label, []);
      monthBuckets.get(label)!.push(accent);
    }

    const monthCandidates = [...monthBuckets.entries()]
      .map(([label, entries]) => ({
        kind: "month-year",
        label,
        time: entries.reduce((sum, entry) => sum + entry.time, 0) / entries.length,
        position: entries.reduce((sum, entry) => sum + entry.position, 0) / entries.length,
        count: entries.reduce((sum, entry) => sum + entry.count, 0),
      }))
      .sort((a, b) => a.position - b.position);

    const monthExtent = orientation === "vertical" ? 220 : 240;
    const edgeAccents = nonOverlapping(monthCandidates, () => monthExtent, {
      min: padding,
      max: padding + usable,
      gap: 14,
      allowExtentOverflow: true,
    });

    const dayExtent = orientation === "vertical" ? 34 : 38;
    const axisMonths = nonOverlapping(
      accents.map((accent: any) => ({
        kind: "day-axis",
        key: accent.key,
        label: String(new Date(accent.time).getUTCDate()).padStart(2, "0"),
        time: accent.time,
        position: accent.position,
        count: accent.count,
      })),
      () => dayExtent,
      { min: padding, max: padding + usable, gap: 8 },
    );

    return {
      mode: "month-year-edge-day-axis",
      edgeAccents,
      axisMonths,
      hasAmbientContext: edgeAccents.length > 0 || axisMonths.length > 0,
    };
  }

  const yearBuckets = new Map<string, any[]>();
  for (const accent of accents) {
    const label = yearLabelForTime(accent.time);
    if (!yearBuckets.has(label)) yearBuckets.set(label, []);
    yearBuckets.get(label)!.push(accent);
  }

  const yearCandidates = [...yearBuckets.entries()]
    .map(([label, entries]) => ({
      kind: "year",
      label,
      time: entries.reduce((sum, entry) => sum + entry.time, 0) / entries.length,
      position: entries.reduce((sum, entry) => sum + entry.position, 0) / entries.length,
      count: entries.reduce((sum, entry) => sum + entry.count, 0),
    }))
    .sort((a, b) => a.position - b.position);

  const yearExtent = orientation === "vertical" ? 110 : 132;
  const edgeAccents = nonOverlapping(yearCandidates, () => yearExtent, {
    min: padding,
    max: padding + usable,
    gap: 16,
    allowExtentOverflow: true,
  });

  const monthExtent = orientation === "vertical" ? 44 : 48;
  const axisMonths = nonOverlapping(
    accents.map((accent: any) => ({
      kind: "month-axis",
      key: accent.key,
      label: monthLabelForTime(accent.time),
      time: accent.time,
      position: accent.position,
      count: accent.count,
    })),
    () => monthExtent,
    { min: padding, max: padding + usable, gap: 8 },
  );

  return {
    mode: "year-edge-month-axis",
    edgeAccents,
    axisMonths,
    hasAmbientContext: edgeAccents.length > 0 || axisMonths.length > 0,
  };
}

interface ExpansionOptions {
  paddingRatio?: number;
  minSpanMs?: number;
}

interface ExpansionResult {
  viewport: Viewport;
  forceExpanded?: boolean;
  itemCount?: number;
}

export function clusterExpansionViewport(
  items: unknown,
  viewport: Viewport | null,
  pixelLength: number,
  thresholdPx: number,
  options?: ExpansionOptions,
): ExpansionResult | null {
  const { paddingRatio = 0.12, minSpanMs = 1 } = options || {};
  const starts = (Array.isArray(items) ? items : [])
    .map((item: any) => Number(item?.start))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const start = Number(viewport?.start);
  const end = Number(viewport?.end);
  if (starts.length < 2 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const uniqueStarts = starts.filter(
    (value, index) => index === 0 || value !== starts[index - 1],
  );
  if (uniqueStarts.length < 2) {
    return {
      viewport: { start, end },
      forceExpanded: true,
      itemCount: starts.length,
    };
  }

  const span = Math.max(minSpanMs, end - start);
  const length = Math.max(1, Number(pixelLength) || 1);
  const threshold = Math.max(1, Number(thresholdPx) || 1);
  const padding = Math.min(0.4, Math.max(0, Number(paddingRatio) || 0));
  let minimumDelta = Number.POSITIVE_INFINITY;
  for (let index = 1; index < uniqueStarts.length; index += 1) {
    const currentStart = uniqueStarts[index];
    const previousStart = uniqueStarts[index - 1];
    if (currentStart === undefined || previousStart === undefined) continue;
    minimumDelta = Math.min(minimumDelta, currentStart - previousStart);
  }

  const minimum = uniqueStarts[0];
  const maximum = uniqueStarts.at(-1);
  if (minimum === undefined || maximum === undefined) return null;
  const range = Math.max(minSpanMs, maximum - minimum);
  const positionFor = (item: any) => ((item.start - start) / span) * length;
  const representations = clusterProjectedItems(
    (Array.isArray(items) ? items : []).filter(
      (item: any) => item && Number.isFinite(item.start) && item.start >= minimum,
    ),
    positionFor,
    threshold,
  );
  const dense = representations.some((rep: any) => rep.kind === "cluster");
  if (!dense) return null;

  const minimumPixelDistance = threshold * 0.65;
  const requestedDistance = Math.max(threshold * 2.5, threshold + 100);
  const achievedDistance = (minimumDelta / range) * length;
  const targetDistance = Math.max(minimumPixelDistance, requestedDistance);
  const targetSpan = Math.max(minSpanMs, (minimumDelta * length) / targetDistance);
  const availableRatio = 1 - padding * 2;
  const displaySpan = Math.max(minSpanMs, targetSpan / availableRatio);
  const rangeCenter = minimum + range / 2;
  return {
    viewport: {
      start: rangeCenter - displaySpan / 2,
      end: rangeCenter + displaySpan / 2,
    },
    forceExpanded: achievedDistance <= threshold,
    itemCount: starts.length,
  };
}

interface FocusOptions extends ExpansionOptions {
  desiredContext?: number;
  preserveScale?: boolean;
}

interface FocusResult {
  mode: string;
  viewport: Viewport;
  forceUnique: boolean;
  contextIds: string[];
}

export function focusContextViewport(
  items: unknown,
  focusedId: string | number,
  viewport: Viewport | null,
  pixelLength: number,
  thresholdPx: number,
  options?: FocusOptions,
): FocusResult | null {
  const {
    desiredContext = 2,
    paddingRatio = 0.14,
    minSpanMs = 1,
    preserveScale = false,
  } = options || {};
  const source = (Array.isArray(items) ? items : [])
    .filter((item: any) => item && Number.isFinite(item.start))
    .slice()
    .sort((a: any, b: any) => a.start - b.start || String(a.id).localeCompare(String(b.id)));
  const focused = source.find((item: any) => String(item.id) === String(focusedId));
  if (
    !focused ||
    !viewport ||
    !Number.isFinite(viewport.start) ||
    !Number.isFinite(viewport.end)
  ) {
    return null;
  }

  const span = Math.max(minSpanMs, viewport.end - viewport.start);
  const length = Math.max(1, Number(pixelLength) || 1);
  const threshold = Math.max(1, Number(thresholdPx) || 1);
  const padding = Math.min(0.4, Math.max(0, Number(paddingRatio) || 0));
  const availableRatio = Math.max(0.2, 1 - padding * 2);
  const focusedEnd = Number.isFinite((focused as any).end) ? (focused as any).end : focused.start;
  const focusedCenter = focused.start + (focusedEnd - focused.start) / 2;
  const focusedContainingSpan = Math.max(
    minSpanMs,
    Math.abs(focusedEnd - focused.start) / availableRatio,
  );
  const overlapsViewport = (item: any) => {
    const end = Number.isFinite(item.end) ? item.end : item.start;
    return end >= viewport.start && item.start <= viewport.end;
  };
  const visibleSource = source.filter(overlapsViewport);
  const positionFor = (item: any) => ((item.start - viewport.start) / span) * length;
  const representations = clusterProjectedItems(visibleSource, positionFor, threshold);
  const representation = representations.find((entry: any) =>
    entry.items.some((item: any) => String(item.id) === String(focused.id)),
  );

  const coincidentIds = source
    .filter(
      (item: any) =>
        String(item.id) !== String(focused.id) && item.start === focused.start,
    )
    .map((item: any) => String(item.id));

  if ((representation as any)?.kind === "cluster") {
    const deltas = (representation as any).items
      .filter((item: any) => String(item.id) !== String(focused.id))
      .map((item: any) => Math.abs(item.start - focused.start))
      .filter((delta: number) => delta > 0);
    if (!deltas.length) {
      return {
        mode: "pin",
        viewport: { ...viewport },
        forceUnique: true,
        contextIds: coincidentIds,
      };
    }
    const nearest = Math.min(...deltas);
    const targetDistance = threshold * 1.18;
    const separatingSpan = Math.max(minSpanMs, (nearest * length) / targetDistance);
    const minimumSpan = Math.min(span, focusedContainingSpan);
    const targetSpan = Math.max(minimumSpan, Math.min(span * 0.6, separatingSpan));
    const achievedDistance = (nearest / targetSpan) * length;
    return {
      mode: "separate",
      viewport: {
        start: focusedCenter - targetSpan / 2,
        end: focusedCenter + targetSpan / 2,
      },
      forceUnique: achievedDistance <= threshold,
      contextIds: coincidentIds,
    };
  }

  if (preserveScale) {
    return {
      mode: coincidentIds.length ? "coincident" : "keep",
      viewport: { ...viewport },
      forceUnique: false,
      contextIds: coincidentIds,
    };
  }

  const distinctOthers = source.filter(
    (item: any) => String(item.id) !== String(focused.id) && item.start !== focused.start,
  );
  const targetContextCount = Math.min(Math.max(0, desiredContext), distinctOthers.length);
  const before = distinctOthers
    .filter((item: any) => item.start < focused.start)
    .sort((a: any, b: any) => b.start - a.start);
  const after = distinctOthers
    .filter((item: any) => item.start > focused.start)
    .sort((a: any, b: any) => a.start - b.start);
  const selected: any[] = [];
  if (before[0]) selected.push(before[0]);
  if (after[0] && selected.length < targetContextCount) selected.push(after[0]);

  const remaining = distinctOthers
    .filter((item: any) => !selected.some((candidate: any) => String(candidate.id) === String(item.id)))
    .sort(
      (a: any, b: any) =>
        Math.abs(a.start - focused.start) - Math.abs(b.start - focused.start),
    );
  while (selected.length < targetContextCount && remaining.length)
    selected.push(remaining.shift());

  const values = [focused.start, focusedEnd];
  for (const item of selected) {
    values.push(item.start);
    if (Number.isFinite(item.end)) values.push(item.end);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawLocalSpan = Math.max(0, max - min);
  const localSpan = rawLocalSpan > 0 ? rawLocalSpan / availableRatio : 0;

  const minimumFocusSpan = Math.min(
    span,
    Math.max(minSpanMs, span * 0.18, focusedContainingSpan),
  );
  const maximumFocusSpan = Math.max(minimumFocusSpan, span * 0.6);
  const targetSpan = Math.min(
    span,
    Math.max(
      minimumFocusSpan,
      localSpan > 0 ? Math.min(maximumFocusSpan, localSpan) : maximumFocusSpan,
    ),
  );
  const localCenter = min + (max - min) / 2;
  const center = localSpan > 0 && localSpan <= targetSpan ? localCenter : focusedCenter;
  const targetViewport = {
    start: center - targetSpan / 2,
    end: center + targetSpan / 2,
  };
  const contextualIds = selected
    .filter((item: any) => {
      const end = Number.isFinite(item.end) ? item.end : item.start;
      return end >= targetViewport.start && item.start <= targetViewport.end;
    })
    .map((item: any) => String(item.id));

  return {
    mode: coincidentIds.length ? "coincident" : "context",
    viewport: targetViewport,
    forceUnique: false,
    contextIds: [...coincidentIds, ...contextualIds],
  };
}

function pad(value: number | string, width: number = 2): string {
  return String(value).padStart(width, "0");
}

export function compactTickLabel(
  timeMs: number,
  spec: TemporalSpec | null,
  hasAmbientMonth: boolean,
): string | null {
  if (!spec || !spec.unit) return null;
  const date = new Date(Number(timeMs));
  if (!Number.isFinite(date.getTime())) return null;

  if (spec.unit === "year") return yearLabelForTime(timeMs);
  if (spec.unit === "month") {
    if (hasAmbientMonth) return null;
    return formatMonthYear(timeMs);
  }
  if (spec.unit === "week") return formatDayMonthYear(timeMs);
  if (spec.unit === "day") return formatDayMonthYear(timeMs);
  if (spec.unit === "hour") {
    return `${pad(date.getUTCHours())}:00`;
  }
  if (spec.unit === "minute") {
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }
  if (spec.unit === "second") {
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }
  if (spec.unit === "millisecond") {
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
  }
  return null;
}

function monthKey(timeMs: number): string | null {
  return getMonthKey(timeMs);
}

const TimelineClusteringObj = {
  clusterProjectedItems,
  clusterExpansionViewport,
  compactTickLabel,
  dayAccents,
  dayKey,
  formatDayMonthYear,
  formatMonthYear,
  focusContextViewport,
  monthAccents,
  monthKey,
  planTemporalAccents,
  yearAccents,
  projectedPosition,
  yearLabelForTime,
  monthLabelForTime,
} as const;

export const TimelineClustering = Object.freeze(TimelineClusteringObj);
