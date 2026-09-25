/**
 * Presentation-only staging for temporal topology changes.
 *
 * Temporal graph changes deliberately reveal relationship context before node
 * bodies. This mirrors the earlier Orb topology lifecycle: links announce the
 * change first, then nodes enter/retire once the relationship phase completes.
 * Geometry remains force-owned; only colour/visibility progress is described
 * here.
 */

export const WORLD_TEMPORAL_EDGE_REVEAL_MS = 420;
export const WORLD_TEMPORAL_NODE_REVEAL_MS = 420;
export const WORLD_TEMPORAL_REVEAL_MS =
  WORLD_TEMPORAL_EDGE_REVEAL_MS + WORLD_TEMPORAL_NODE_REVEAL_MS;

export interface WorldTemporalRevealProgress {
  readonly edge: number;
  readonly node: number;
  readonly complete: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Smooth endpoints without overshoot; progress never changes graph geometry. */
export function worldTemporalRevealEase(progress: number): number {
  const t = clamp01(Number.isFinite(progress) ? progress : 0);
  return t * t * (3 - 2 * t);
}

export function worldTemporalRevealProgress(elapsedMs: number): WorldTemporalRevealProgress {
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const edge = worldTemporalRevealEase(elapsed / WORLD_TEMPORAL_EDGE_REVEAL_MS);
  const node = worldTemporalRevealEase(
    (elapsed - WORLD_TEMPORAL_EDGE_REVEAL_MS) / WORLD_TEMPORAL_NODE_REVEAL_MS,
  );
  return Object.freeze({
    edge,
    node,
    complete: elapsed >= WORLD_TEMPORAL_REVEAL_MS,
  });
}
