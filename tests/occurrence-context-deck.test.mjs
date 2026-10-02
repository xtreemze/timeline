import assert from "node:assert/strict";
import test from "node:test";
import { occurrenceContextDeckFrames } from "../site/occurrence-context-deck.ts";

test("occurrence context deck preserves all media and appends context", () => {
  const frames = occurrenceContextDeckFrames(
    [
      { src: "one.jpg", alt: "One", caption: "First" },
      { kind: "video", src: "clip.webm", mimeType: "video/webm", caption: "Second" },
      { kind: "audio", src: "interview.ogg", mimeType: "audio/ogg", alt: "Interview" },
    ],
    "  Shared context  ",
  );

  assert.deepEqual(frames, [
    { kind: "image", src: "one.jpg", alt: "One", caption: "First" },
    { kind: "video", src: "clip.webm", mimeType: "video/webm", alt: undefined, caption: "Second" },
    {
      kind: "audio",
      src: "interview.ogg",
      mimeType: "audio/ogg",
      alt: "Interview",
      caption: undefined,
    },
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
