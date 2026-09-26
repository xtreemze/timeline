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
  readonly anchorRatios?: Readonly<Record<string, number>>;
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
  readonly anchorRatio: number;
  readonly inlineSize: number;
  readonly blockSize: number;
  readonly clustered: boolean;
}

export interface TemporalCommittedLayoutPlan {
  readonly lanes: Readonly<Record<string, number>>;
  readonly anchorRatios: Readonly<Record<string, number>>;
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

const RANGE_ANCHOR_START_RATIO = 0.24;
const RANGE_ANCHOR_END_RATIO = 0.76;
const RANGE_ANCHOR_CENTER_RATIO = 0.5;
const RANGE_ANCHOR_MIN_PROJECTED_SPAN_PX = 96;
const RANGE_ANCHOR_MIN_CARD_RATIO = 0.62;
const RANGE_ANCHOR_HYSTERESIS_SCORE_RATIO = 1.12;
const RANGE_ANCHOR_HYSTERESIS_ALLOWANCE_PX = 8;

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

function normalizedThresholds(thresholds: ClusterThresholds | undefined): ClusterThresholds {
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
  return wasClustered ? distance <= normalized.exitPx : distance < normalized.enterPx;
}

export function chooseStableLane(
  previousLane: number | null | undefined,
  legalLanes: readonly number[],
): number {
  const legal = [...new Set(legalLanes.filter(Number.isInteger))].sort(
    (left, right) => left - right,
  );
  if (!legal.length) return 0;
  if (Number.isInteger(previousLane) && legal.includes(Number(previousLane))) {
    return Number(previousLane);
  }
  return legal[0] ?? 0;
}

export interface TemporalLaneCrossOffsetsOptions {
  readonly axisOffsetPx?: number;
  readonly laneGapPx?: number;
  readonly routingSlackPx?: number;
}

/**
 * Packs zero-based temporal lanes away from their shared axis.
 *
 * The planner keeps lane identity stable; this helper turns those identities into
 * measured cross-axis offsets. Adjacent lanes are separated by the larger of their
 * measured cross extents, so cards cannot overlap even when their widths/heights
 * differ. Routing slack reserves room for orthogonal connector bends without
 * forcing terminals to swap sides.
 */
export function planLaneCrossOffsets(
  placements: readonly Pick<TemporalLayoutPlacement, "lane" | "blockSize">[],
  options: TemporalLaneCrossOffsetsOptions = {},
): Readonly<Record<number, number>> {
  const axisOffsetPx = Math.max(0, finite(options.axisOffsetPx, 0));
  const laneGapPx = Math.max(0, finite(options.laneGapPx, DEFAULT_LANE_GAP_PX));
  const routingSlackPx = Math.max(0, finite(options.routingSlackPx, 0));
  const laneSizes = new Map<number, number>();

  for (const placement of placements) {
    const lane = Math.trunc(finite(placement.lane, -1));
    if (lane < 0) continue;
    const size = Math.max(1, finite(placement.blockSize, 1));
    laneSizes.set(lane, Math.max(laneSizes.get(lane) ?? 0, size));
  }

  const occupiedLanes = [...laneSizes.keys()].sort((left, right) => left - right);
  if (!occupiedLanes.length) return Object.freeze({});

  const offsets: Record<number, number> = {};
  let offset = axisOffsetPx;
  let previousLane: number | null = null;
  for (const lane of occupiedLanes) {
    if (previousLane !== null) {
      const previousSize = laneSizes.get(previousLane) ?? 0;
      const currentSize = laneSizes.get(lane) ?? previousSize;
      offset += Math.max(previousSize, currentSize) + laneGapPx + routingSlackPx;
    }
    offsets[lane] = offset;
    previousLane = lane;
  }

  return Object.freeze(offsets);
}

export function geometryMeasurementKey(sceneKey: string, contentRevision: string | number): string {
  const key = canonicalId(sceneKey);
  if (!key) throw new Error("Geometry measurement keys require a stable scene identity.");
  return `${key}@${String(contentRevision)}`;
}

function previousClusterPairs(previous: TemporalLayoutPrevious | undefined): Set<string> {
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

function visibleExtent(
  occurrence: TemporalLayoutOccurrence,
  viewport: TemporalLayoutWindow,
): { start: number; end: number } {
  const end = Number.isFinite(occurrence.end) ? Number(occurrence.end) : occurrence.start;
  return {
    start: Math.max(occurrence.start, viewport.start),
    end: Math.min(end, viewport.end),
  };
}

function projectedPosition(
  occurrence: TemporalLayoutOccurrence,
  viewport: TemporalLayoutWindow,
  pixelLength: number,
  anchorRatio = RANGE_ANCHOR_CENTER_RATIO,
): number {
  const visible = visibleExtent(occurrence, viewport);
  const ratio = Math.min(1, Math.max(0, finite(anchorRatio, RANGE_ANCHOR_CENTER_RATIO)));
  const anchor = visible.start + Math.max(0, visible.end - visible.start) * ratio;
  return ((anchor - viewport.start) / (viewport.end - viewport.start)) * pixelLength;
}

interface TemporalAnchorObstacle {
  readonly id: string;
  readonly position: number;
  readonly inlineSize: number;
}

function stableRangeSide(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? RANGE_ANCHOR_START_RATIO : RANGE_ANCHOR_END_RATIO;
}

function collisionPressure(
  position: number,
  inlineSize: number,
  obstacles: readonly TemporalAnchorObstacle[],
  gapPx: number,
): number {
  let pressure = 0;
  for (const obstacle of obstacles) {
    const required =
      Math.max(1, inlineSize) / 2 + Math.max(1, obstacle.inlineSize) / 2 + Math.max(0, gapPx);
    pressure += Math.max(0, required - Math.abs(position - obstacle.position));
  }
  return pressure;
}

function anchorCandidateScore(
  ratio: number,
  occurrence: TemporalLayoutOccurrence,
  viewport: TemporalLayoutWindow,
  pixelLength: number,
  measurement: TemporalLayoutMeasurement,
  pointObstacles: readonly TemporalAnchorObstacle[],
  rangeObstacles: readonly TemporalAnchorObstacle[],
  laneGapPx: number,
  offCenterEligible: boolean,
  preferredSide: number,
): number {
  const position = projectedPosition(occurrence, viewport, pixelLength, ratio);
  const half = measurement.inlineSize / 2;
  const overflow = Math.max(0, half - position) + Math.max(0, position + half - pixelLength);
  const pointPressure = collisionPressure(
    position,
    measurement.inlineSize,
    pointObstacles,
    laneGapPx,
  );
  const rangePressure = collisionPressure(
    position,
    measurement.inlineSize,
    rangeObstacles,
    laneGapPx,
  );
  const centerPenalty =
    offCenterEligible && Math.abs(ratio - RANGE_ANCHOR_CENTER_RATIO) < 0.01
      ? Math.min(56, measurement.inlineSize * 0.3)
      : 0;
  const stableSidePenalty =
    offCenterEligible &&
    Math.abs(ratio - RANGE_ANCHOR_CENTER_RATIO) >= 0.01 &&
    Math.abs(ratio - preferredSide) >= 0.01
      ? 0.5
      : 0;

  // Exact instants are the scarce coordinates in the chronology, so collisions
  // with them carry much more weight than collisions between flexible ranges.
  return (
    overflow * 20 +
    pointPressure * 8 +
    rangePressure * 3 +
    centerPenalty +
    stableSidePenalty
  );
}

function planAnchorRatios(
  occurrences: readonly TemporalLayoutOccurrence[],
  viewport: TemporalLayoutWindow,
  pixelLength: number,
  measurements: Readonly<Record<string, TemporalLayoutMeasurement>> | undefined,
  previous: TemporalLayoutPrevious | undefined,
  laneGapPx: number,
): Readonly<Record<string, number>> {
  const anchorRatios: Record<string, number> = {};
  const pointObstacles: TemporalAnchorObstacle[] = [];
  const ranges: TemporalLayoutOccurrence[] = [];

  for (const occurrence of occurrences) {
    if (Number.isFinite(occurrence.end) && Number(occurrence.end) > occurrence.start) {
      ranges.push(occurrence);
      continue;
    }
    const measurement = measurementFor(occurrence.id, measurements);
    const position = projectedPosition(
      occurrence,
      viewport,
      pixelLength,
      RANGE_ANCHOR_CENTER_RATIO,
    );
    anchorRatios[occurrence.id] = RANGE_ANCHOR_CENTER_RATIO;
    pointObstacles.push({
      id: occurrence.id,
      position,
      inlineSize: measurement.inlineSize,
    });
  }

  // Shorter ranges have less freedom, so reserve their useful positions first;
  // longer ranges then adapt around those fixed/less-flexible obstacles.
  ranges.sort((left, right) => {
    const leftVisible = visibleExtent(left, viewport);
    const rightVisible = visibleExtent(right, viewport);
    const leftSpan = Math.max(0, leftVisible.end - leftVisible.start);
    const rightSpan = Math.max(0, rightVisible.end - rightVisible.start);
    return leftSpan - rightSpan || left.start - right.start || left.id.localeCompare(right.id);
  });

  const rangeObstacles: TemporalAnchorObstacle[] = [];
  for (const occurrence of ranges) {
    const measurement = measurementFor(occurrence.id, measurements);
    const visible = visibleExtent(occurrence, viewport);
    const visibleTemporalSpan = Math.max(0, visible.end - visible.start);
    const projectedSpan =
      (visibleTemporalSpan / Math.max(1, viewport.end - viewport.start)) * pixelLength;
    const offCenterEligible =
      projectedSpan >=
      Math.max(RANGE_ANCHOR_MIN_PROJECTED_SPAN_PX, measurement.inlineSize * RANGE_ANCHOR_MIN_CARD_RATIO);
    const preferredSide = stableRangeSide(occurrence.id);
    const oppositeSide =
      preferredSide === RANGE_ANCHOR_START_RATIO
        ? RANGE_ANCHOR_END_RATIO
        : RANGE_ANCHOR_START_RATIO;
    const candidates = offCenterEligible
      ? [preferredSide, oppositeSide, RANGE_ANCHOR_CENTER_RATIO]
      : [RANGE_ANCHOR_CENTER_RATIO];

    const scored = candidates
      .map((ratio) => ({
        ratio,
        score: anchorCandidateScore(
          ratio,
          occurrence,
          viewport,
          pixelLength,
          measurement,
          pointObstacles,
          rangeObstacles,
          laneGapPx,
          offCenterEligible,
          preferredSide,
        ),
      }))
      .sort((left, right) => left.score - right.score || left.ratio - right.ratio);
    const best = scored[0] ?? { ratio: RANGE_ANCHOR_CENTER_RATIO, score: 0 };

    const previousRatio = previous?.anchorRatios?.[occurrence.id];
    const previousCandidate = scored.find(
      (candidate) =>
        Number.isFinite(previousRatio) &&
        Math.abs(candidate.ratio - Number(previousRatio)) < 0.01,
    );
    const selected =
      previousCandidate &&
      previousCandidate.score <=
        best.score * RANGE_ANCHOR_HYSTERESIS_SCORE_RATIO + RANGE_ANCHOR_HYSTERESIS_ALLOWANCE_PX
        ? previousCandidate
        : best;

    anchorRatios[occurrence.id] = selected.ratio;
    rangeObstacles.push({
      id: occurrence.id,
      position: projectedPosition(occurrence, viewport, pixelLength, selected.ratio),
      inlineSize: measurement.inlineSize,
    });
  }

  return Object.freeze({ ...anchorRatios });
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

function requiredLaneCount(
  group: readonly TemporalLayoutOccurrence[],
  positions: ReadonlyMap<string, number>,
  measurements: Readonly<Record<string, TemporalLayoutMeasurement>> | undefined,
  laneGapPx: number,
): number {
  const intervals = group
    .map((occurrence) => {
      const measurement = measurementFor(occurrence.id, measurements);
      const position = positions.get(occurrence.id) ?? 0;
      const half = measurement.inlineSize / 2;
      return { id: occurrence.id, start: position - half, end: position + half };
    })
    .sort(
      (left, right) =>
        left.start - right.start || left.end - right.end || left.id.localeCompare(right.id),
    );

  const laneEnds: number[] = [];
  for (const interval of intervals) {
    const legalLane = laneEnds.findIndex((lastEnd) => interval.start >= lastEnd + laneGapPx);
    if (legalLane >= 0) laneEnds[legalLane] = interval.end;
    else laneEnds.push(interval.end);
  }
  return laneEnds.length;
}

function clusterGroups(
  occurrences: readonly TemporalLayoutOccurrence[],
  positions: ReadonlyMap<string, number>,
  previous: TemporalLayoutPrevious | undefined,
  thresholds: ClusterThresholds,
  maxLanes: number,
  measurements: Readonly<Record<string, TemporalLayoutMeasurement>> | undefined,
  laneGapPx: number,
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
      const allCoincident = group.every((occurrence) => occurrence.start === group[0]?.start);
      if (allCoincident) return false;

      const retainedByHysteresis = group.some((occurrence, index) =>
        group
          .slice(index + 1)
          .some((candidate) => previousPairs.has(pairKey(occurrence.id, candidate.id))),
      );
      if (retainedByHysteresis) return true;

      return requiredLaneCount(group, positions, measurements, laneGapPx) > maxLanes;
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

  const anchorRatios = planAnchorRatios(
    occurrences,
    viewport,
    pixelLength,
    input.measurements,
    input.previous,
    laneGapPx,
  );
  const positions = new Map(
    occurrences.map((occurrence) => [
      occurrence.id,
      projectedPosition(
        occurrence,
        viewport,
        pixelLength,
        anchorRatios[occurrence.id] ?? RANGE_ANCHOR_CENTER_RATIO,
      ),
    ]),
  );
  const clusteredOrder = [...occurrences].sort(
    (left, right) =>
      (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0) ||
      left.start - right.start ||
      left.id.localeCompare(right.id),
  );
  const clusters = clusterGroups(
    clusteredOrder,
    positions,
    input.previous,
    thresholds,
    maxLanes,
    input.measurements,
    laneGapPx,
  );
  const clusteredIds = new Set(clusters.flatMap((cluster) => cluster.itemIds));

  const coincidentCounts = new Map<number, number>();
  for (const occurrence of occurrences) {
    coincidentCounts.set(occurrence.start, (coincidentCounts.get(occurrence.start) ?? 0) + 1);
  }
  const coincidentLaneCapacity = Math.max(0, ...coincidentCounts.values());
  const laneCapacity = Math.max(maxLanes, coincidentLaneCapacity);
  const laneIntervals = Array.from(
    { length: laneCapacity },
    () => [] as Array<{ start: number; end: number }>,
  );
  const lanes: Record<string, number> = {};
  const placements: TemporalLayoutPlacement[] = [];

  // Instants are semantically fixed while range cards have flexible presentation
  // anchors. Place instants first so the lane nearest the axis remains available
  // for exact-date events whenever a range can move around them.
  const placementOrder = [...occurrences].sort((left, right) => {
    const leftRange = Number.isFinite(left.end) && Number(left.end) > left.start;
    const rightRange = Number.isFinite(right.end) && Number(right.end) > right.start;
    return (
      Number(leftRange) - Number(rightRange) ||
      (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0) ||
      left.start - right.start ||
      left.id.localeCompare(right.id)
    );
  });

  for (const occurrence of placementOrder) {
    const measurement = measurementFor(occurrence.id, input.measurements);
    const position = positions.get(occurrence.id) ?? 0;
    const half = measurement.inlineSize / 2;
    const startPx = position - half;
    const endPx = position + half;
    const legalLanes = laneIntervals
      .map((intervals, lane) => ({ intervals, lane }))
      .filter(({ intervals }) =>
        intervals.every(
          (interval) =>
            endPx + laneGapPx <= interval.start || startPx >= interval.end + laneGapPx,
        ),
      )
      .map(({ lane }) => lane);

    const previousLane = input.previous?.lanes?.[occurrence.id];
    const lane = chooseStableLane(
      previousLane,
      legalLanes.length ? legalLanes : Array.from({ length: laneCapacity }, (_, index) => index),
    );
    lanes[occurrence.id] = lane;
    laneIntervals[lane]?.push({ start: startPx, end: endPx });
    placements.push(
      Object.freeze({
        id: occurrence.id,
        lane,
        position,
        anchorRatio: anchorRatios[occurrence.id] ?? RANGE_ANCHOR_CENTER_RATIO,
        inlineSize: measurement.inlineSize,
        blockSize: measurement.blockSize,
        clustered: clusteredIds.has(occurrence.id),
      }),
    );
  }

  placements.sort(
    (left, right) =>
      left.position - right.position || left.lane - right.lane || left.id.localeCompare(right.id),
  );

  return Object.freeze({
    lanes: Object.freeze({ ...lanes }),
    anchorRatios,
    clusters: Object.freeze([...clusters]),
    placements: Object.freeze(placements),
  });
}
