export interface SettledTemporalWindowSink<T> {
  push(viewport: T, committed: boolean): boolean;
  clear(): void;
}

/**
 * Coalesces the timeline's high-frequency transient viewport changes into the
 * latest value and forwards it only when the timeline declares the interaction
 * committed. An optional preview sink may consume each transient viewport for
 * cheap presentation-only updates that must not rebuild spatial projections.
 */
export function createSettledTemporalWindowSink<T>(
  apply: (viewport: T) => void,
  preview?: (viewport: T) => void,
): SettledTemporalWindowSink<T> {
  let pending: T | undefined;
  let hasPending = false;

  function flush(): boolean {
    if (!hasPending) return false;
    const settled = pending as T;
    pending = undefined;
    hasPending = false;
    apply(settled);
    return true;
  }

  return Object.freeze({
    push(viewport: T, committed: boolean): boolean {
      pending = viewport;
      hasPending = true;
      if (!committed) {
        preview?.(viewport);
        return false;
      }
      return flush();
    },
    clear(): void {
      pending = undefined;
      hasPending = false;
    },
  });
}
