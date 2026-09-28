import assert from "node:assert/strict";
import test from "node:test";
import * as selection from "../site/occurrence-composer-selection.ts";

test("user-selected occurrences open the composer while unrelated selection does not", () => {
  assert.equal(typeof selection.shouldOpenComposerForSelection, "function");
  const relationship = { kind: "relationship", id: "occ-1" };
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "timeline" }), true);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "world" }), true);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: relationship, source: "app" }), false);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: { kind: "entity", id: "a" }, source: "world" }), false);
  assert.equal(selection.shouldOpenComposerForSelection({ selection: null, source: "timeline" }), false);
});
