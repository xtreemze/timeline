import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createAuthoringContext } from "../site/authoring-context.ts";

test("committed timeline motion supplies a stable authoring date", () => {
  const authoring = createAuthoringContext();
  const start = Date.UTC(2026, 8, 24);
  const end = Date.UTC(2026, 8, 26);

  authoring.setTimelineViewport({ start, end }, false);
  assert.equal(authoring.time, null, "preview motion is not committed authoring context");

  authoring.setTimelineViewport({ start, end }, true);
  assert.equal(authoring.time, Date.UTC(2026, 8, 25));
  assert.equal(authoring.date, "2026-09-25");
});

test("selection and spatial context are captured without mutating project data", () => {
  const authoring = createAuthoringContext();
  authoring.setMode("edit");
  authoring.setSelection({ kind: "node", id: "alice" });
  authoring.setSpatialContext({
    placeId: "stockholm",
    position: { longitude: 18.0686, latitude: 59.3293, altitudeMeters: 0 },
  });

  const draft = authoring.draft("relationship");
  assert.deepEqual(draft.selection, { kind: "node", id: "alice" });
  assert.equal(draft.placeId, "stockholm");
  assert.equal(draft.position?.longitude, 18.0686);
  assert.equal(draft.position?.latitude, 59.3293);

  authoring.setMode("view");
  assert.equal(authoring.spatialContext.position, null);
  assert.equal(authoring.selection?.id, "alice", "selection survives closing the editor");
});

test("selected places remain reusable geographic context", () => {
  const authoring = createAuthoringContext();
  authoring.setSelection({ kind: "place", id: "copenhagen" });
  authoring.clearSpatialContext();

  assert.equal(authoring.spatialContext.placeId, "copenhagen");
});

test("application reuses existing CRUD forms for contextual creation and editing", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(source, /createAuthoringContext/);
  assert.match(source, /timelineviewportchange[\s\S]*authoring\.setTimelineViewport/);
  assert.match(source, /graphselectionchange[\s\S]*syncAuthoringSelection/);
  assert.match(source, /worldselectionchange[\s\S]*syncAuthoringSelection/);
  assert.match(source, /worldcontextrequest[\s\S]*authoring\.setSpatialContext/);
  assert.match(source, /beginContextualGraphCreate/);
  assert.match(source, /resetGraphPlaceForm\(\)[\s\S]*graphPlaceLatitude/);
  assert.match(source, /resetGraphNodeForm\(\)[\s\S]*graphNodeName\.focus/);
  assert.match(
    source,
    /draft\.selection\?\.kind === "node"[\s\S]*graphEndpointOptions\(els\.graphEdgeSubject/,
  );
  assert.match(source, /draft\.placeId[\s\S]*graphPlaceOptions\(els\.graphEdgePlace/);
  assert.match(source, /draft\.date[\s\S]*graphEdgeDatePicker\.setRange/);
  assert.match(source, /editorToggle[\s\S]*beginAuthoringSelectionEdit/);
});

test("world surface reserves entity long press for drag and background long press for authoring", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /hit\?\.kind === "entity"[\s\S]*#touchHoldTimer/);
  assert.match(source, /#authoringHoldTimer[\s\S]*#dispatchAuthoringContext/);
  assert.match(source, /"worldcontextrequest"/);
  assert.match(source, /"worldselectionchange"/);
  assert.match(source, /addEventListener\?\.\("contextmenu"/);
  assert.match(source, /removeEventListener\?\.\("contextmenu"/);
});

test("contextual authoring menu has compact touch-safe actions", async () => {
  const source = await readFile(
    new URL("../site/components/authoring-menu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /customElements\.define\("luum-authoring-menu"/);
  assert.match(source, /Add place/);
  assert.match(source, /Add node/);
  assert.match(source, /Add relationship/);
  assert.match(source, /Edit selected/);
  assert.match(source, /min-block-size:\s*44px/);
  assert.match(source, /max-block-size:\s*min\(24rem, calc\(100dvh - 1rem\)\)/);
});
