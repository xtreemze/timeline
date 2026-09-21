export interface TemporalLayoutWindow {
  readonly start: number;
  readonly end: number;
}

export interface TemporalLayoutOccurrence {
  readonly id: string;
  readonly start: number;
  readonly end?: number | null;
}

export interface TemporalLayoutMeasurement {
  readonly inlineSize: number;
  readonly blockSize: number;
}

export interface ClusterThresholds {
  readonly enterPx: number;
  readonly exitPx: number;
}

export interface TemporalLayoutPrevious {
  readonly lanes?: Readonly<Record<string, number>>;
  readonly clusters?: readonly {
    readonly id?: string;
    readonly itemIds?: readonly string[];
  }[];
}

export interface TemporalCommittedLayoutInput {
  readonly viewport: TemporalLayoutWindow;
  readonly occurrences: readonly TemporalLayoutOccurrence[];
  readonly previous?: TemporalLayoutPrevious;
  readonly measurements?: Readonly<Record<string, TemporalLayoutMeasurement>>;
  readonly pixelLength?: number;
  readonly maxLanes?: number;
  readonly laneGapPx?: number;
  readonly clusterThresholds?: ClusterThresholds;
}

export interface TemporalLayoutCluster {
  readonly id: string;
  readonly itemIds: readonly string[];
  readonly start: number;
  readonly end: number;
  readonly position: number;
}

export interface TemporalLayoutPlacement {
  readonly id: string;
  readonly lane: number;
  readonly position: number;
  readonly inlineSize: number;
  readonly blockSize: number;
  readonly clustered: boolean;
}

export interface TemporalCommittedLayoutPlan {
  readonly lanes: Readonly<Record<string, number>>;
  readonly clusters: readonly TemporalLayoutCluster[];
  readonly placements: readonly TemporalLayoutPlacement[];
}

const DEFAULT_PIXEL_LENGTH = 1_000;
const DEFAULT_MAX_LANES = 3;
const DEFAULT_LANE_GAP_PX = 16;
const DEFAULT_CLUSTER_THRESHOLDS: ClusterThresholds = {
  enterPx: 80,
  exitPx: 120,
};

function finite(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function canonicalId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizedWindow(viewport: TemporalLayoutWindow): TemporalLayoutWindow {
  const start = finite(viewport?.start, 0);
  const end = finite(viewport?.end, start + 1);
  return end > start ? { start, end } : { start: end, end: start + 1 };
}

function normalizedThresholds(
  thresholds: ClusterThresholds | undefined,
): ClusterThresholds {
  const enterPx = Math.max(1, finite(thresholds?.enterPx, DEFAULT_CLUSTER_THRESHOLDS.enterPx));
  const exitPx = Math.max(
    enterPx + 1,
    finite(thresholds?.exitPx, DEFAULT_CLUSTER_THRESHOLDS.exitPx),
  );
  return { enterPx, exitPx };
}

export function clusterMembershipWithHysteresis(
  wasClustered: boolean,
  distancePx: number,
  thresholds: ClusterThresholds,
): boolean {
  const distance = Math.max(0, finite(distancePx, Number.POSITIVE_INFINITY));
  const normalized = normalizedThresholds(thresholds);
  return wasClustered
    ? distance <= normalized.exitPx
    : distance < normalized.enterPx;
}

export function chooseStableLane(
  previousLane: number | null | undefined,
  legalLanes: readonly number[],
): number {
  const legal = [...new Set(legalLanes.filter(Number.isInteger))].sort((left, right) => left - right);
  if (!legal.length) return 0;
  if (Number.isInteger(previousLane) && legal.includes(Number(previousLane))) {
    return Number(previousLane);
  }
  return legal[0] ?? 0;
}

export function geometryMeasurementKey(
  sceneKey: string,
  contentRevision: string | number,
): string {
  const key = canonicalId(sceneKey);
  if (!key) throw new Error("Geometry measurement keys require a stable scene identity.");
  return `${key}@${String(contentRevision)}`;
}

function previousClusterPairs(
  previous: TemporalLayoutPrevious | undefined,
): Set<string> {
  const pairs = new Set<string>();
  for (const cluster of previous?.clusters ?? []) {
    const ids = [...new Set((cluster.itemIds ?? []).map(canonicalId).filter(Boolean))].sort();
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        pairs.add(`${ids[left]}\u0000${ids[right]}`);
      }
    }
  }
  return pairs;
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
}

function projectedPosition(
  occurrence: TemporalLayoutOccurrence,
  viewport: TemporalLayoutWindow,
  pixelLength: number,
): number {
  const end = Number.isFinite(occurrence.end) ? Number(occurrence.end) : occurrence.start;
  const anchor = occurrence.start + (end - occurrence.start) / 2;
  return ((anchor - viewport.start) / (viewport.end - viewport.start)) * pixelLength;
}

function measurementFor(
  id: string,
  measurements: Readonly<Record<string, TemporalLayoutMeasurement>> | undefined,
): TemporalLayoutMeasurement {
  const measurement = measurements?.[id];
  return {
    inlineSize: Math.max(1, finite(measurement?.inlineSize, 120)),
    blockSize: Math.max(1, finite(measurement?.blockSize, 52)),
  };
}

function clusterGroups(
  occurrences: readonly TemporalLayoutOccurrence[],
  positions: ReadonlyMap<string, number>,
  previous: TemporalLayoutPrevious | undefined,
  thresholds: ClusterThresholds,
  maxLanes: number,
): TemporalLayoutCluster[] {
  const previousPairs = previousClusterPairs(previous);
  const groups: TemporalLayoutOccurrence[][] = [];
  let current: TemporalLayoutOccurrence[] = [];

  for (const occurrence of occurrences) {
    if (!current.length) {
      current = [occurrence];
      continue;
    }
    const previousOccurrence = current.at(-1);
    if (!previousOccurrence) {
      current = [occurrence];
      continue;
    }
    const previousPosition = positions.get(previousOccurrence.id) ?? 0;
    const position = positions.get(occurrence.id) ?? 0;
    const wasClustered = previousPairs.has(pairKey(previousOccurrence.id, occurrence.id));
    if (
      clusterMembershipWithHysteresis(
        wasClustered,
        Math.abs(position - previousPosition),
        thresholds,
      )
    ) {
      current.push(occurrence);
      continue;
    }
    groups.push(current);
    current = [occurrence];
  }
  if (current.length) groups.push(current);

  return groups
    .filter((group) => {
      if (group.length <= 1) return false;
      if (group.length > maxLanes) return true;
      return group.some((occurrence, index) =>
        group.slice(index + 1).some((candidate) =>
          previousPairs.has(pairKey(occurrence.id, candidate.id)),
        ),
      );
    })
    .map((group) => {
      const itemIds = group.map((occurrence) => occurrence.id).sort();
      const start = Math.min(...group.map((occurrence) => occurrence.start));
      const end = Math.max(
        ...group.map((occurrence) =>
          Number.isFinite(occurrence.end) ? Number(occurrence.end) : occurrence.start,
        ),
      );
      const position =
        group.reduce((sum, occurrence) => sum + (positions.get(occurrence.id) ?? 0), 0) /
        group.length;
      return Object.freeze({
        id: `cluster:${itemIds.join("|")}`,
        itemIds: Object.freeze(itemIds),
        start,
        end,
        position,
      });
    });
}

export function planCommittedTemporalLayout(
  input: TemporalCommittedLayoutInput,
): TemporalCommittedLayoutPlan {
  const viewport = normalizedWindow(input.viewport);
  const pixelLength = Math.max(1, finite(input.pixelLength, DEFAULT_PIXEL_LENGTH));
  const maxLanes = Math.max(1, Math.trunc(finite(input.maxLanes, DEFAULT_MAX_LANES)));
  const laneGapPx = Math.max(0, finite(input.laneGapPx, DEFAULT_LANE_GAP_PX));
  const thresholds = normalizedThresholds(input.clusterThresholds);

  const occurrences = input.occurrences
    .map((occurrence) => ({
      ...occurrence,
      id: canonicalId(occurrence.id),
    }))
    .filter(
      (occurrence) =>
        occurrence.id &&
        Number.isFinite(occurrence.start) &&
        (!Number.isFinite(occurrence.end) || Number(occurrence.end) >= occurrence.start),
    )
    .sort(
      (left, right) =>
        left.start - right.start ||
        (Number(left.end) || left.start) - (Number(right.end) || right.start) ||
        left.id.localeCompare(right.id),
    );

  const positions = new Map(
    occurrences.map((occurrence) => [
      occurrence.id,
      projectedPosition(occurrence, viewport, pixelLength),
    ]),
  );
  const clusters = clusterGroups(
    occurrences,
    positions,
    input.previous,
    thresholds,
    maxLanes,
  );
  const clusteredIds = new Set(clusters.flatMap((cluster) => cluster.itemIds));

  const laneEnds = Array.from({ length: maxLanes }, () => Number.NEGATIVE_INFINITY);
  const lanes: Record<string, number> = {};
  const placements: TemporalLayoutPlacement[] = [];

  for (const occurrence of occurrences) {
    const measurement = measurementFor(occurrence.id, input.measurements);
    const position = positions.get(occurrence.id) ?? 0;
    const half = measurement.inlineSize / 2;
    const startPx = position - half;
    const endPx = position + half;
    const legalLanes = laneEnds
      .map((lastEnd, lane) => ({ lastEnd, lane }))
      .filter(({ lastEnd }) => startPx >= lastEnd + laneGapPx)
      .map(({ lane }) => lane);

    const previousLane = input.previous?.lanes?.[occurrence.id];
    const lane = chooseStableLane(
      previousLane,
      legalLanes.length ? legalLanes : Array.from({ length: maxLanes }, (_, index) => index),
    );
    lanes[occurrence.id] = lane;
    laneEnds[lane] = Math.max(laneEnds[lane] ?? Number.NEGATIVE_INFINITY, endPx);
    placements.push(
      Object.freeze({
        id: occurrence.id,
        lane,
        position,
        inlineSize: measurement.inlineSize,
        blockSize: measurement.blockSize,
        clustered: clusteredIds.has(occurrence.id),
      }),
    );
  }

  return Object.freeze({
    lanes: Object.freeze({ ...lanes }),
    clusters: Object.freeze([...clusters]),
    placements: Object.freeze(placements),
  });
}
