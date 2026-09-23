import {
  evaluateAnalyticalLens,
  type AnalyticalLens,
  type AnalyticalLensDataset,
  type AnalyticalLensEvaluation,
} from "./analytical-lens.ts";

export interface HistogramBin {
  readonly start: number;
  readonly end: number;
  readonly count: number;
}

export interface CategoryCount {
  readonly value: string;
  readonly count: number;
}

export interface CrossFilterProjection {
  readonly evaluation: AnalyticalLensEvaluation;
  readonly relationshipPredicates: readonly CategoryCount[];
  readonly places: readonly CategoryCount[];
  readonly categories: readonly CategoryCount[];
  readonly temporalDensity: readonly HistogramBin[];
}

export interface TemporalHistogramOptions {
  readonly targetBins?: number;
  readonly binWidthMs?: number;
}

const TEMPORAL_WIDTHS = Object.freeze([
  1,
  10,
  100,
  1_000,
  10_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
  30 * 24 * 60 * 60_000,
  90 * 24 * 60 * 60_000,
  365 * 24 * 60 * 60_000,
]);

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function positive(value: number, label: string): number {
  const normalized = finite(value, label);
  if (normalized <= 0) throw new Error(`${label} must be greater than zero.`);
  return normalized;
}

export function chooseTemporalBinWidth(
  start: number,
  end: number,
  targetBins = 30,
): number {
  const first = finite(start, "Temporal histogram start");
  const last = finite(end, "Temporal histogram end");
  if (last < first) throw new Error("Temporal histogram end must be >= start.");
  const target = Math.max(1, Math.trunc(positive(targetBins, "Temporal target bin count")));
  const ideal = Math.max(1, (last - first) / target);
  return TEMPORAL_WIDTHS.find((width) => width >= ideal) ?? TEMPORAL_WIDTHS.at(-1) ?? ideal;
}

export function buildNumericHistogram(
  values: readonly number[],
  options: { readonly bins?: number; readonly min?: number; readonly max?: number } = {},
): readonly HistogramBin[] {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return Object.freeze([]);

  const min = options.min === undefined ? Math.min(...finiteValues) : finite(options.min, "Histogram min");
  const max = options.max === undefined ? Math.max(...finiteValues) : finite(options.max, "Histogram max");
  if (max < min) throw new Error("Histogram max must be >= min.");

  const binCount = Math.max(1, Math.min(512, Math.trunc(options.bins ?? 20)));
  const width = max === min ? 1 : (max - min) / binCount;
  const counts = Array.from({ length: binCount }, () => 0);

  for (const value of finiteValues) {
    if (value < min || value > max) continue;
    const index =
      max === min ? 0 : Math.min(binCount - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  }

  return Object.freeze(
    counts.map((count, index) =>
      Object.freeze({
        start: min + index * width,
        end: index === binCount - 1 ? max : min + (index + 1) * width,
        count,
      }),
    ),
  );
}

export function buildCategoryCounts(
  values: readonly (string | null | undefined)[],
): readonly CategoryCount[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.freeze(
    [...counts.entries()]
      .map(([value, count]) => Object.freeze({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)),
  );
}

export function buildTemporalHistogram(
  occurrences: readonly {
    readonly start?: number | null;
    readonly end?: number | null;
  }[],
  options: TemporalHistogramOptions = {},
): readonly HistogramBin[] {
  const timed = occurrences
    .map((occurrence) => {
      const start = occurrence.start;
      if (start === null || start === undefined || !Number.isFinite(start)) return null;
      const end =
        occurrence.end === null ||
        occurrence.end === undefined ||
        !Number.isFinite(occurrence.end)
          ? start
          : occurrence.end;
      if (end < start) return null;
      return Object.freeze({ start, end });
    })
    .filter((value): value is { readonly start: number; readonly end: number } => value !== null);

  if (!timed.length) return Object.freeze([]);

  const start = Math.min(...timed.map((value) => value.start));
  const end = Math.max(...timed.map((value) => value.end));
  const width =
    options.binWidthMs === undefined
      ? chooseTemporalBinWidth(start, end, options.targetBins ?? 30)
      : positive(options.binWidthMs, "Temporal bin width");

  const origin = Math.floor(start / width) * width;
  const count = Math.max(1, Math.ceil((end - origin) / width) || 1);
  const bins = Array.from({ length: count }, (_, index) => ({
    start: origin + index * width,
    end: origin + (index + 1) * width,
    count: 0,
  }));

  for (const occurrence of timed) {
    const first = Math.max(0, Math.floor((occurrence.start - origin) / width));
    const last = Math.min(
      bins.length - 1,
      Math.max(first, Math.floor((occurrence.end - origin) / width)),
    );
    for (let index = first; index <= last; index += 1) bins[index].count += 1;
  }

  return Object.freeze(bins.map((bin) => Object.freeze(bin)));
}

export function withAnalyticalTimeWindow(
  lens: AnalyticalLens,
  start: number,
  end: number,
  untimed: "include" | "exclude" = "exclude",
): AnalyticalLens {
  const first = finite(start, "Analytical brush start");
  const last = finite(end, "Analytical brush end");
  if (last < first) throw new Error("Analytical brush end must be >= start.");

  return Object.freeze({
    ...lens,
    filters: Object.freeze({
      ...lens.filters,
      timeWindow: Object.freeze({ start: first, end: last, untimed }),
    }),
  });
}

export function withAnalyticalCategoryFilter(
  lens: AnalyticalLens,
  dimension: "categoryIds" | "placeIds" | "relationshipPredicates",
  values: readonly string[],
): AnalyticalLens {
  const normalized = Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right),
    ),
  );

  return Object.freeze({
    ...lens,
    filters: Object.freeze({
      ...lens.filters,
      ...(normalized.length ? { [dimension]: normalized } : { [dimension]: undefined }),
    }),
  });
}

export function createCrossFilterProjection(
  lens: AnalyticalLens,
  dataset: AnalyticalLensDataset,
  temporalOptions: TemporalHistogramOptions = {},
): CrossFilterProjection {
  const evaluation = evaluateAnalyticalLens(lens, dataset);
  const relationshipIds = new Set(evaluation.relationshipIds);
  const occurrenceIds = new Set(evaluation.occurrenceIds);

  const relationships = dataset.relationships.filter((relationship) =>
    relationshipIds.has(relationship.id),
  );
  const occurrences = (dataset.occurrences ?? []).filter((occurrence) =>
    occurrenceIds.has(occurrence.id),
  );

  const placeValues = occurrences.length
    ? occurrences.map((occurrence) => occurrence.placeId)
    : relationships.map((relationship) => relationship.placeId);

  return Object.freeze({
    evaluation,
    relationshipPredicates: buildCategoryCounts(
      relationships.map((relationship) => relationship.predicate),
    ),
    places: buildCategoryCounts(placeValues),
    categories: buildCategoryCounts(occurrences.map((occurrence) => occurrence.categoryId)),
    temporalDensity: buildTemporalHistogram(occurrences, temporalOptions),
  });
}
