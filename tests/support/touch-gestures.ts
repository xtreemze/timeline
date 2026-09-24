import type { CDPSession, Page } from "@playwright/test";

/**
 * Real touchscreen gestures for Chromium-based Playwright projects.
 *
 * Each gesture is one Chrome DevTools Protocol call that Chromium's own
 * synthetic-gesture pipeline plays back: trusted `touchstart`/`pointerdown`
 * (pointerType "touch") through the compositor, with hit testing,
 * `touch-action`, pointer capture and inter-event timing handled by the
 * browser. Unlike per-event `locator.dispatchEvent` or `dispatchTouchEvent`
 * round-trips, a busy renderer cannot stretch the gap between the taps of a
 * double-tap or the samples of a pinch, so timing-sensitive recognisers see
 * the same input a finger would produce.
 *
 * Coordinates are CSS pixels relative to the viewport.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

async function withSession<T>(page: Page, run: (session: CDPSession) => Promise<T>): Promise<T> {
  const session = await page.context().newCDPSession(page);
  try {
    return await run(session);
  } finally {
    await session.detach();
  }
}

/**
 * Waits until the page has rendered frames no more than 50 ms apart for
 * `quietMs`, i.e. no long task is running. Synthesized gestures wait for the
 * renderer to acknowledge each event, so a long task during a double-tap
 * delays the second tap and its timestamp (a real touchscreen timestamps
 * taps in hardware). Call this before timing-sensitive gestures instead of
 * sleeping.
 */
export function waitForQuietMainThread(
  page: Page,
  { quietMs = 400, timeoutMs = 15_000 }: { quietMs?: number; timeoutMs?: number } = {},
) {
  return page.evaluate(
    ({ quiet, timeout }) =>
      new Promise<void>((resolve, reject) => {
        const started = performance.now();
        let previous = started;
        let quietSince = started;
        const tick = (now: number) => {
          if (now - previous > 50) quietSince = now;
          previous = now;
          if (now - quietSince >= quiet) resolve();
          else if (now - started > timeout) reject(new Error("Main thread never went quiet."));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { quiet: quietMs, timeout: timeoutMs },
  );
}

/** One finger tap; `count: 2` is a double-tap played back at native speed. */
export function tap(page: Page, at: Point, { count = 1 }: { count?: number } = {}) {
  return withSession(page, (session) =>
    session.send("Input.synthesizeTapGesture", {
      x: at.x,
      y: at.y,
      tapCount: count,
      gestureSourceType: "touch",
    }),
  );
}

export function doubleTap(page: Page, at: Point) {
  return tap(page, at, { count: 2 });
}

/** A stationary press held for `durationMs` before lifting. */
export function longPress(page: Page, at: Point, durationMs = 600) {
  return withSession(page, (session) =>
    session.send("Input.synthesizeTapGesture", {
      x: at.x,
      y: at.y,
      duration: durationMs,
      tapCount: 1,
      gestureSourceType: "touch",
    }),
  );
}

/**
 * One finger dragged by (dx, dy) at `speed` px/s; negative `dx` moves left.
 * The default is a deliberate drag. Chromium emits one move per frame, so on a
 * slow (software-GL) renderer a fast swipe can reach the page as a single
 * jump; raise `speed` only to test flings.
 */
export function swipe(
  page: Page,
  from: Point,
  delta: { readonly dx: number; readonly dy: number },
  { speed = 300 }: { speed?: number } = {},
) {
  return withSession(page, (session) =>
    session.send("Input.synthesizeScrollGesture", {
      x: from.x,
      y: from.y,
      xDistance: delta.dx,
      yDistance: delta.dy,
      speed,
      gestureSourceType: "touch",
      preventFling: true,
    }),
  );
}

/** Two fingers spreading (`scale` > 1) or closing (< 1) around `center`. */
export function pinch(page: Page, center: Point, scale: number, { speed = 800 } = {}) {
  return withSession(page, (session) =>
    session.send("Input.synthesizePinchGesture", {
      x: center.x,
      y: center.y,
      scaleFactor: scale,
      relativeSpeed: speed,
      gestureSourceType: "touch",
    }),
  );
}

export interface Touchscreen {
  /** Puts fingers down (first call) or moves the fingers already down. */
  move(points: readonly Point[]): Promise<void>;
  /** Lifts every finger. */
  end(): Promise<void>;
  /** Cancels the touch sequence, as the OS does when it takes a gesture over. */
  cancel(): Promise<void>;
}

/**
 * Step-by-step multi-finger input (long-press then drag, a pinch held
 * mid-way for a live assertion): trusted touch events, one CDP round-trip
 * per step, so the test waits on page state between steps instead of on
 * fixed delays. Prefer the synthesized gestures above whenever the
 * recogniser has an upper time bound (double-tap, fling).
 */
export async function touchscreen(page: Page): Promise<Touchscreen> {
  const session = await page.context().newCDPSession(page);
  let down = 0;
  const send = (
    type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
    points: readonly Point[],
  ) =>
    session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((point, index) => ({
        x: point.x,
        y: point.y,
        radiusX: 6,
        radiusY: 6,
        force: 1,
        id: index + 1,
      })),
    });
  const finish = async (type: "touchEnd" | "touchCancel") => {
    try {
      if (down > 0) await send(type, []);
    } finally {
      down = 0;
      await session.detach();
    }
  };
  return {
    async move(points) {
      await send(points.length > down ? "touchStart" : "touchMove", points);
      down = points.length;
    },
    end: () => finish("touchEnd"),
    cancel: () => finish("touchCancel"),
  };
}
