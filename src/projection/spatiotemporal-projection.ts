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

/**
 * The single rule turning a relationship's canonical temporal extent into a
 * projectable occurrence extent, shared by TimelineSurface relationship
 * bands and WorldProjection so both views place every relationship at the
 * same time:
 * - a relationship is timed when its start resolves to a finite sort key,
 *   whatever (or whether) its declared extent type is;
 * - an `instant` ends where it starts;
 * - every other extent ends at its resolvable end, falling back to the start
 *   when the end is missing or unresolvable (the occurrence is not dropped);
 * - reversed endpoints are normalized so `start <= end`.
 * Returns null for a timeless relationship.
 */
export function relationshipOccurrenceExtent(
  time: unknown,
  sortKey: (endpoint: unknown) => number,
): { readonly start: number; readonly end: number } | null {
  if (typeof time !== "object" || time === null) return null;
  const extent = time as {
    readonly type?: unknown;
    readonly start?: unknown;
    readonly end?: unknown;
  };
  if (extent.start === null || extent.start === undefined) return null;

  const start = sortKey(extent.start);
  if (!Number.isFinite(start)) return null;

  const rawEnd =
    extent.type !== "instant" && extent.end !== null && extent.end !== undefined
      ? sortKey(extent.end)
      : start;
  const end = Number.isFinite(rawEnd) ? rawEnd : start;

  return Object.freeze({ start: Math.min(start, end), end: Math.max(start, end) });
}
