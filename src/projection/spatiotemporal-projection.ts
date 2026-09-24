import type { SpatiotemporalViewport } from "../application/spatiotemporal-viewport.ts";

export interface ProjectableOccurrence<Id extends string = string> {
  readonly id: Id;
  readonly start: number;
  readonly end?: number | null;
}

function effectiveEnd(occurrence: ProjectableOccurrence): number {
  return Number.isFinite(occurrence.end) ? Number(occurrence.end) : occurrence.start;
}

function validOccurrence(occurrence: ProjectableOccurrence): boolean {
  return (
    Boolean(occurrence.id) &&
    Number.isFinite(occurrence.start) &&
    effectiveEnd(occurrence) >= occurrence.start
  );
}

export function occurrenceIntersectsViewport(
  occurrence: ProjectableOccurrence,
  viewport: Pick<SpatiotemporalViewport, "time">,
): boolean {
  if (!validOccurrence(occurrence)) return false;
  const end = effectiveEnd(occurrence);
  return occurrence.start <= viewport.time.end && end >= viewport.time.start;
}

export function occurrenceViewportWeight(
  occurrence: ProjectableOccurrence,
  viewport: Pick<SpatiotemporalViewport, "time">,
): number {
  if (!occurrenceIntersectsViewport(occurrence, viewport)) return 0;

  const viewportSpan = viewport.time.end - viewport.time.start;
  if (viewportSpan <= 0) return 1;

  const end = effectiveEnd(occurrence);
  if (end === occurrence.start) return 1 / viewportSpan;

  const overlapStart = Math.max(occurrence.start, viewport.time.start);
  const overlapEnd = Math.min(end, viewport.time.end);
  return Math.max(0, Math.min(1, (overlapEnd - overlapStart) / viewportSpan));
}

export function projectActiveOccurrences<T extends ProjectableOccurrence>(
  occurrences: readonly T[],
  viewport: Pick<SpatiotemporalViewport, "time">,
): readonly T[] {
  return Object.freeze(
    occurrences
      .filter((occurrence) => occurrenceIntersectsViewport(occurrence, viewport))
      .sort(
        (left, right) =>
          left.start - right.start ||
          effectiveEnd(left) - effectiveEnd(right) ||
          left.id.localeCompare(right.id),
      ),
  );
}

/**
 * The canonical logically-active occurrence set for a temporal extent.
 *
 * This is the single activation rule shared by TimelineSurface and
 * WorldProjection: only the logical viewport decides membership. Renderer
 * retention, overscan, clustering, animation and GPU state must never be
 * passed here. The result is frozen and deterministically ordered.
 */
export function activeOccurrenceIds<Id extends string>(
  occurrences: readonly ProjectableOccurrence<Id>[],
  extent: Pick<SpatiotemporalViewport["time"], "start" | "end">,
): readonly Id[] {
  return Object.freeze(
    projectActiveOccurrences(occurrences, { time: extent }).map((occurrence) => occurrence.id),
  );
}
