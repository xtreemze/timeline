import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createApplicationSelectionController } from "../site/application-selection.ts";

test("canonical application selection publishes one change and suppresses feedback duplicates", () => {
  const selection = createApplicationSelectionController();
  const changes = [];
  selection.subscribe((change) => changes.push(change));

  assert.equal(selection.select({ kind: "node", id: "alice" }, "graph"), true);
  assert.equal(selection.select({ kind: "node", id: "alice" }, "world"), false);
  assert.deepEqual(selection.current, { kind: "node", id: "alice" });
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.source, "graph");
});

test("canonical selection is cleared when the selected record is removed", () => {
  const selection = createApplicationSelectionController();
  selection.select({ kind: "place", id: "stockholm" }, "world");

  assert.equal(
    selection.retain({
      node: new Set(),
      edge: new Set(),
      place: new Set(["stockholm"]),
    }),
    false,
  );
  assert.equal(
    selection.retain({
      node: new Set(),
      edge: new Set(),
      place: new Set(),
    }),
    true,
  );
  assert.equal(selection.current, null);
});

test("graph and world views accept silent programmatic application selection", async () => {
  const [graphView, worldView, factory] = await Promise.all([
    readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/world-projection-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/world-view-selection.ts", import.meta.url), "utf8"),
  ]);

  assert.match(graphView, /setSelection\(selection: ApplicationSelection \| null\)/);
  assert.match(graphView, /selection\?\.kind === "node"[\s\S]*kind: "entity"/);
  assert.match(graphView, /selection\?\.kind === "edge"[\s\S]*kind: "relationship"/);
  assert.match(worldView, /setSelection\(selection: ApplicationSelection \| null\)/);
  assert.match(worldView, /selection\.kind === "place"[\s\S]*kind: "place"/);
  assert.match(factory, /setSelection\?/);
});

test("application selection drives authoring, spatial rendering, toolbar and timeline occurrences", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /createApplicationSelectionController/);
  assert.match(
    app,
    /applicationSelection\.subscribe\([\s\S]*authoring\.setSelection\(selection\)[\s\S]*setSelection\?\.\(selection\)/,
  );
  assert.match(app, /syncSelectionAwareToolbar/);
  assert.match(app, /timelineSelectionForFocus/);
  assert.match(app, /occurrence\.occurrenceId/);
  assert.match(app, /applicationSelection\.select\(timelineSelection, "timeline"\)/);
  assert.match(app, /publishApplicationSelection[\s\S]*"graph"/);
  assert.match(app, /publishApplicationSelection[\s\S]*"world"/);
  assert.match(app, /retainCurrentApplicationSelection/);
});
