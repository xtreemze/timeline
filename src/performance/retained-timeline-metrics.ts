export type RetainedTimelinePhase = "interaction" | "commit";

export interface RetainedTimelineFrameSample {
  readonly phase: RetainedTimelinePhase;
  readonly durationMs: number;
  readonly createdNodes: number;
  readonly destroyedNodes: number;
  readonly retainedNodes: number;
  readonly bufferExpanded?: boolean;
  readonly plannerDurationMs?: number;
  readonly queryDurationMs?: number;
  readonly dirtyMeasurements?: number;
  readonly longTasks?: number;
  readonly inputLatencyMs?: number;
}

export interface RetainedTimelineViolation {
  readonly code:
    | "wholesale-interaction-replacement"
    | "interaction-retained-node-destruction"
    | "invalid-frame-sample";
  readonly message: string;
  readonly phase: RetainedTimelinePhase;
}

export interface RetainedTimelinePhaseSummary {
  readonly frameCount: number;
  readonly averageDurationMs: number;
  readonly p95DurationMs: number;
  readonly createdNodes: number;
  readonly destroyedNodes: number;
  readonly plannerDurationMs: number;
  readonly queryDurationMs: number;
  readonly dirtyMeasurements: number;
  readonly longTasks: number;
  readonly inputLatencySampleCount: number;
  readonly p95InputLatencyMs: number;
}

export interface RetainedTimelineSummary {
  readonly interaction: RetainedTimelinePhaseSummary;
  readonly commit: RetainedTimelinePhaseSummary;
  readonly retainedPeak: number;
  readonly bufferExpansions: number;
  readonly violations: readonly RetainedTimelineViolation[];
}

interface MutablePhaseStats {
  durations: number[];
  createdNodes: number;
  destroyedNodes: number;
  plannerDurationMs: number;
  queryDurationMs: number;
  dirtyMeasurements: number;
  longTasks: number;
  inputLatencies: number[];
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function integer(value: number): number {
  return Math.trunc(nonNegative(value));
}

export function percentileNearestRank(values: readonly number[], percentile: number): number {
  if (!values.length) return 0;
  const normalized = Math.max(0, Math.min(1, Number(percentile) || 0));
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const rank = Math.max(1, Math.ceil(normalized * sorted.length));
  return sorted[Math.min(sorted.length - 1, rank - 1)] ?? 0;
}

function summarize(stats: MutablePhaseStats): RetainedTimelinePhaseSummary {
  const frameCount = stats.durations.length;
  const durationTotal = stats.durations.reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    frameCount,
    averageDurationMs: frameCount ? durationTotal / frameCount : 0,
    p95DurationMs: percentileNearestRank(stats.durations, 0.95),
    createdNodes: stats.createdNodes,
    destroyedNodes: stats.destroyedNodes,
    plannerDurationMs: stats.plannerDurationMs,
    queryDurationMs: stats.queryDurationMs,
    dirtyMeasurements: stats.dirtyMeasurements,
    longTasks: stats.longTasks,
    inputLatencySampleCount: stats.inputLatencies.length,
    p95InputLatencyMs: percentileNearestRank(stats.inputLatencies, 0.95),
  });
}

export interface RetainedTimelineMetricsRecorder {
  recordFrame(sample: RetainedTimelineFrameSample): void;
  summary(): RetainedTimelineSummary;
  reset(): void;
}

export function createRetainedTimelineMetrics(): RetainedTimelineMetricsRecorder {
  const phases: Record<RetainedTimelinePhase, MutablePhaseStats> = {
    interaction: {
      durations: [],
      createdNodes: 0,
      destroyedNodes: 0,
      plannerDurationMs: 0,
      queryDurationMs: 0,
      dirtyMeasurements: 0,
      longTasks: 0,
      inputLatencies: [],
    },
    commit: {
      durations: [],
      createdNodes: 0,
      destroyedNodes: 0,
      plannerDurationMs: 0,
      queryDurationMs: 0,
      dirtyMeasurements: 0,
      longTasks: 0,
      inputLatencies: [],
    },
  };
  let retainedPeak = 0;
  let bufferExpansions = 0;
  const violations: RetainedTimelineViolation[] = [];

  const resetStats = (stats: MutablePhaseStats): void => {
    stats.durations.length = 0;
    stats.createdNodes = 0;
    stats.destroyedNodes = 0;
    stats.plannerDurationMs = 0;
    stats.queryDurationMs = 0;
    stats.dirtyMeasurements = 0;
    stats.longTasks = 0;
    stats.inputLatencies.length = 0;
  };

  return Object.freeze({
    recordFrame(sample: RetainedTimelineFrameSample): void {
      const phase = sample?.phase === "commit" ? "commit" : "interaction";
      const stats = phases[phase];
      const durationMs = nonNegative(sample?.durationMs);
      const createdNodes = integer(sample?.createdNodes);
      const destroyedNodes = integer(sample?.destroyedNodes);
      const retainedNodes = integer(sample?.retainedNodes);

      stats.durations.push(durationMs);
      stats.createdNodes += createdNodes;
      stats.destroyedNodes += destroyedNodes;
      stats.plannerDurationMs += nonNegative(sample?.plannerDurationMs ?? 0);
      stats.queryDurationMs += nonNegative(sample?.queryDurationMs ?? 0);
      stats.dirtyMeasurements += integer(sample?.dirtyMeasurements ?? 0);
      stats.longTasks += integer(sample?.longTasks ?? 0);
      if (Number.isFinite(sample?.inputLatencyMs)) {
        stats.inputLatencies.push(nonNegative(Number(sample.inputLatencyMs)));
      }
      retainedPeak = Math.max(retainedPeak, retainedNodes);
      if (sample?.bufferExpanded) bufferExpansions += 1;

      if (phase === "interaction" && destroyedNodes > 0) {
        violations.push(
          Object.freeze({
            code: "interaction-retained-node-destruction",
            message:
              "Continuous interaction destroyed retained chronology nodes; pruning belongs to commit.",
            phase,
          }),
        );
      }

      const replacementFloor = Math.max(20, Math.ceil(retainedNodes * 0.5));
      if (
        phase === "interaction" &&
        createdNodes >= replacementFloor &&
        destroyedNodes >= replacementFloor
      ) {
        violations.push(
          Object.freeze({
            code: "wholesale-interaction-replacement",
            message:
              "Continuous interaction appears to have replaced a substantial portion of the retained chronology scene.",
            phase,
          }),
        );
      }
    },

    summary(): RetainedTimelineSummary {
      return Object.freeze({
        interaction: summarize(phases.interaction),
        commit: summarize(phases.commit),
        retainedPeak,
        bufferExpansions,
        violations: Object.freeze([...violations]),
      });
    },

    reset(): void {
      resetStats(phases.interaction);
      resetStats(phases.commit);
      retainedPeak = 0;
      bufferExpansions = 0;
      violations.length = 0;
    },
  });
}
