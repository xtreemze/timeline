import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createApplicationSelectionController,
  selectionForTimelineFocus,
} from "../src/application/selection.ts";

test("canonical application selection suppresses feedback duplicates", () => {
  const selection = createApplicationSelectionController();
  const changes = [];
  selection.subscribe((change) => changes.push(change));

  assert.equal(selection.select({ kind: "entity", id: "alice" }, "world"), true);
  assert.equal(selection.select({ kind: "entity", id: "alice" }, "app"), false);
  assert.deepEqual(selection.current, { kind: "entity", id: "alice" });
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.source, "world");
});

test("canonical selection clears only when its record disappears", () => {
  const selection = createApplicationSelectionController();
  selection.select({ kind: "place", id: "stockholm" }, "world");

  assert.equal(
    selection.retain({
      entity: new Set(),
      relationship: new Set(),
      place: new Set(["stockholm"]),
    }),
    false,
  );
  assert.equal(
    selection.retain({
      entity: new Set(),
      relationship: new Set(),
      place: new Set(),
    }),
    true,
  );
  assert.equal(selection.current, null);
});

test("timeline focus resolves only deterministic relationship ownership", () => {
  const relationships = [
    { id: "r1", itemIds: ["item-a"] },
    { id: "r2", itemIds: ["item-b", "item-c"] },
    { id: "r3", itemIds: ["item-c"] },
  ];

  assert.deepEqual(selectionForTimelineFocus("r1", relationships), {
    kind: "relationship",
    id: "r1",
  });
  assert.deepEqual(selectionForTimelineFocus("item-a", relationships), {
    kind: "relationship",
    id: "r1",
  });
  assert.equal(selectionForTimelineFocus("item-c", relationships), null);
  assert.equal(selectionForTimelineFocus("missing", relationships), null);
});

test("world user selection publishes while programmatic propagation stays silent", async () => {
  const [surface, factory, compatibility, app] = await Promise.all([
    readFile(new URL("../site/world/deck-world-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/world-view-factory.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/world-view-selection.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(surface, /#setUserSelection\(/);
  assert.match(surface, /new CustomEvent\("worldselectionchange"[\s\S]*selection:/);
  assert.match(surface, /setSelection\(selection: WorldSelection \| null\): void/);
  assert.doesNotMatch(
    surface.match(/setSelection\(selection: WorldSelection \| null\): void[\s\S]*?\n  \}/)?.[0] ??
      "",
    /worldselectionchange/,
  );

  assert.match(factory, /setSelection\(selection: ApplicationSelection \| null\)/);
  assert.match(compatibility, /setSelection\?\(selection: ApplicationSelection \| null\)/);
  assert.match(app, /createApplicationSelectionController/);
  assert.match(app, /worldselectionchange[\s\S]*applicationSelection\.select/);
  assert.match(app, /timelinefocuschange[\s\S]*selectionForTimelineFocus/);
  assert.match(app, /applicationSelection\.subscribe[\s\S]*setSelection\?\.\(selection\)/);
  assert.match(app, /applicationSelection\.retain/);
});
