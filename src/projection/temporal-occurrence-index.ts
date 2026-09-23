import type { SpatiotemporalViewport } from "../application/spatiotemporal-viewport.ts";
import {
  projectActiveOccurrences,
  type ProjectableOccurrence,
} from "./spatiotemporal-projection.ts";

export interface TemporalOccurrenceIndex<T extends ProjectableOccurrence> {
  readonly size: number;
  query(viewport: Pick<SpatiotemporalViewport, "time">): readonly T[];
  replace(occurrences: readonly T[]): TemporalOccurrenceIndex<T>;
}

function stableOccurrences<T extends ProjectableOccurrence>(
  occurrences: readonly T[],
): readonly T[] {
  return Object.freeze(
    [...occurrences].sort(
      (left, right) =>
        left.start - right.start ||
        (Number.isFinite(left.end) ? Number(left.end) : left.start) -
          (Number.isFinite(right.end) ? Number(right.end) : right.start) ||
        left.id.localeCompare(right.id),
    ),
  );
}

export function createTemporalOccurrenceIndex<T extends ProjectableOccurrence>(
  occurrences: readonly T[],
): TemporalOccurrenceIndex<T> {
  const source = stableOccurrences(occurrences);

  return Object.freeze({
    size: source.length,
    query(viewport: Pick<SpatiotemporalViewport, "time">): readonly T[] {
      return projectActiveOccurrences(source, viewport);
    },
    replace(next: readonly T[]): TemporalOccurrenceIndex<T> {
      return createTemporalOccurrenceIndex(next);
    },
  });
}
