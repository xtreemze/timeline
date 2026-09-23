import assert from "node:assert/strict";
import test from "node:test";

test("production deck entry registers the globe WorldView factory", async () => {
  const previous = globalThis.TimelineWorldView;

  try {
    delete globalThis.TimelineWorldView;
    await import("../site/world/deck-world-production.ts");
    assert.equal(typeof globalThis.TimelineWorldView?.create, "function");
  } finally {
    if (previous === undefined) delete globalThis.TimelineWorldView;
    else globalThis.TimelineWorldView = previous;
  }
});
