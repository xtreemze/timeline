import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldTouchDragArbiter,
  WORLD_TOUCH_HOLD_MS,
} from "../src/interaction/world-touch-drag-arbiter.ts";

const point = (x, y) => Object.freeze({ x, y });

function press(arbiter, pointerId = 1, options = {}) {
  return arbiter.press({
    pointerId,
    point: options.point ?? point(100, 100),
    wallTime: options.wallTime ?? 10_000,
    eventTimeStamp: options.eventTimeStamp ?? 1_000,
  });
}

test("stationary world touch becomes claimable only after the shared hold threshold", () => {
  const arbiter = createWorldTouchDragArbiter();

  assert.equal(press(arbiter), "holding");
  assert.equal(arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS - 1), false);
  assert.equal(arbiter.claim(1, 10_000 + WORLD_TOUCH_HOLD_MS - 1), false);

  assert.equal(arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS), true);
  assert.equal(arbiter.snapshot().disposition, "ready");
  assert.equal(arbiter.claim(1, 10_000 + WORLD_TOUCH_HOLD_MS), true);
  assert.equal(arbiter.isOwnedBy(1), true);
  assert.deepEqual(arbiter.snapshot(), {
    candidatePointerId: null,
    ownerPointerId: 1,
    disposition: "owned",
  });
});

test("a pre-threshold swipe remains camera-owned when main-thread delivery is late", () => {
  const arbiter = createWorldTouchDragArbiter();
  press(arbiter, 1, { wallTime: 10_000, eventTimeStamp: 1_000 });

  assert.equal(arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS), true);

  // The move is processed after the threshold, but its event clock says the
  // finger physically moved 40 ms after pointer-down.
  assert.equal(
    arbiter.move({
      pointerId: 1,
      point: point(160, 100),
      wallTime: 10_000 + WORLD_TOUCH_HOLD_MS + 40,
      eventTimeStamp: 1_040,
    }),
    "camera",
  );
  assert.equal(arbiter.claim(1, 10_000 + WORLD_TOUCH_HOLD_MS + 41), false);
  assert.equal(arbiter.snapshot().ownerPointerId, null);
});

test("a second finger before ownership yields the gesture to renderer multi-touch", () => {
  const arbiter = createWorldTouchDragArbiter();

  assert.equal(press(arbiter, 1), "holding");
  assert.equal(
    press(arbiter, 2, {
      point: point(180, 100),
      wallTime: 10_050,
      eventTimeStamp: 1_050,
    }),
    "camera",
  );

  assert.equal(arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS + 100), false);
  assert.equal(arbiter.threshold(2, 10_000 + WORLD_TOUCH_HOLD_MS + 100), false);
  assert.deepEqual(arbiter.snapshot(), {
    candidatePointerId: null,
    ownerPointerId: null,
    disposition: "camera",
  });
});

test("later contacts cannot steal or clear an owned node drag", () => {
  const arbiter = createWorldTouchDragArbiter();
  press(arbiter, 1);
  assert.equal(arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS), true);
  assert.equal(arbiter.claim(1, 10_000 + WORLD_TOUCH_HOLD_MS), true);

  assert.equal(
    press(arbiter, 2, {
      point: point(180, 100),
      wallTime: 10_500,
      eventTimeStamp: 1_500,
    }),
    "blocked",
  );
  assert.equal(
    arbiter.move({
      pointerId: 2,
      point: point(190, 100),
      wallTime: 10_520,
      eventTimeStamp: 1_520,
    }),
    "blocked",
  );

  assert.equal(arbiter.release(2), false);
  assert.equal(arbiter.isOwnedBy(1), true);
  assert.equal(arbiter.cancel(2), false);
  assert.equal(arbiter.isOwnedBy(1), true);

  assert.equal(arbiter.release(1), true);
  assert.equal(arbiter.hasOwner(), false);
  assert.equal(arbiter.snapshot().disposition, "camera");
});

test("owner cancellation releases the touch epoch deterministically", () => {
  const arbiter = createWorldTouchDragArbiter();
  press(arbiter, 7);
  arbiter.threshold(7, 10_000 + WORLD_TOUCH_HOLD_MS);
  arbiter.claim(7, 10_000 + WORLD_TOUCH_HOLD_MS);

  assert.equal(arbiter.cancel(7), true);
  assert.deepEqual(arbiter.snapshot(), {
    candidatePointerId: null,
    ownerPointerId: null,
    disposition: "camera",
  });

  assert.equal(
    press(arbiter, 8, {
      point: point(120, 120),
      wallTime: 11_000,
      eventTimeStamp: 2_000,
    }),
    "holding",
  );
});

test("clear removes pending and owned touch state for renderer destruction", () => {
  const arbiter = createWorldTouchDragArbiter();
  press(arbiter, 1);
  arbiter.threshold(1, 10_000 + WORLD_TOUCH_HOLD_MS);
  arbiter.claim(1, 10_000 + WORLD_TOUCH_HOLD_MS);

  arbiter.clear();

  assert.deepEqual(arbiter.snapshot(), {
    candidatePointerId: null,
    ownerPointerId: null,
    disposition: "camera",
  });
  assert.equal(arbiter.isPending(1), false);
});
