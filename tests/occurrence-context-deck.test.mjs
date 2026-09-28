import assert from "node:assert/strict";
import test from "node:test";
import { occurrenceContextDeckFrames } from "../site/occurrence-context-deck.ts";

test("occurrence context deck preserves all media and appends context", () => {
  const frames = occurrenceContextDeckFrames(
    [
      { src: "one.jpg", alt: "One", caption: "First" },
      { src: "two.jpg", alt: "Two", caption: "Second" },
    ],
    "  Shared context  ",
  );

  assert.deepEqual(frames, [
    { kind: "image", src: "one.jpg", alt: "One", caption: "First" },
    { kind: "image", src: "two.jpg", alt: "Two", caption: "Second" },
    { kind: "context", label: "Context", body: "Shared context" },
  ]);
  assert.equal(Object.isFrozen(frames), true);
  assert.equal(frames.every(Object.isFrozen), true);
});

test("occurrence context deck omits invalid media and blank context", () => {
  assert.deepEqual(
    occurrenceContextDeckFrames([{ src: "" }, { alt: "missing source" }], "   "),
    [],
  );
});
