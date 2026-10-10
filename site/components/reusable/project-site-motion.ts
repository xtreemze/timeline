type ScopedTransition = {
  readonly finished: Promise<void>;
};

type ScopedTransitionRoot = HTMLElement & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>,
  ) => ScopedTransition;
};

function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Progressively enhances a bounded presentation update with an element-scoped
 * View Transition. The update remains authoritative; transition support and
 * completion never become application state.
 */
export async function runScopedViewTransition(
  root: HTMLElement | null,
  update: () => void | Promise<void>,
): Promise<void> {
  const scopedRoot = root as ScopedTransitionRoot | null;
  if (!scopedRoot?.startViewTransition || prefersReducedMotion()) {
    await update();
    return;
  }

  const transition = scopedRoot.startViewTransition(update);
  await transition.finished.catch(() => undefined);
}
