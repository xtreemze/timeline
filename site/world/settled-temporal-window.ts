export interface SettledTemporalWindowSink<T> {
  push(viewport: T, committed: boolean): boolean;
  clear(): void;
}

/**
 * Coalesces the timeline's high-frequency transient viewport changes into the
 * latest value and forwards it only when the timeline declares the interaction
 * committed. This keeps temporal dragging responsive without repeatedly
 * rebuilding spatial projections / force-layout inputs for states that exist
 * for only a frame or two.
 */
export function createSettledTemporalWindowSink<T>(
  apply: (viewport: T) => void,
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
      return committed ? flush() : false;
    },
    clear(): void {
      pending = undefined;
      hasPending = false;
    },
  });
}
