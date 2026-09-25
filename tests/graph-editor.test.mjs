import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("graph editor separates entity nodes, reusable places, and action-edge context", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="tab-graph"/);
  assert.match(html, /id="panel-graph"/);
  assert.match(html, /id="graph-node-form"/);
  assert.match(html, /id="graph-node-identity-details"/);
  assert.match(html, /id="graph-node-alternate-names"/);
  assert.match(html, /id="graph-node-identifiers"/);
  assert.match(html, /id="graph-node-source-ids"/);
  assert.match(html, /id="graph-node-properties"/);
  assert.match(html, /id="graph-place-form"/);
  assert.match(html, /id="graph-place-name"/);
  assert.match(html, /id="graph-place-latitude"/);
  assert.match(html, /id="graph-place-longitude"/);
  assert.match(html, /id="graph-place-radius"/);
  assert.match(html, /id="graph-place-icon"/);
  assert.match(html, /id="graph-place-marker-shape"/);
  assert.match(html, /id="graph-place-area"/);
  assert.match(html, /id="graph-edge-subject"/);
  assert.match(html, /id="graph-edge-predicate"/);
  assert.match(html, /id="graph-edge-object"/);
  assert.match(html, /id="graph-edge-place"/);
  assert.match(html, /id="graph-edge-item-ids"/);
  assert.match(html, /One node = one durable entity/);
  assert.match(html, /Places are map records, never graph nodes/);
  assert.match(html, /Action only: use one specific verb/);
  assert.match(html, /Self-loop edges are structurally invalid/);
  assert.match(html, /One directed action fact gets one edge/);
  assert.match(html, /Distinct reverse actions and genuine graph cycles are allowed/);
  assert.match(html, /id="graph-edge-properties"/);
  assert.match(html, /id="graph-edge-initial-state"/);
  assert.match(html, /id="graph-edge-provenance-details"/);
  assert.match(html, /id="graph-edge-source-ids"/);
  assert.match(html, /id="graph-edge-confidence"/);
  assert.match(html, /id="graph-edge-time-kind"/);
  assert.match(html, /id="graph-edge-time-kind"[\s\S]*value="event" selected/);
  assert.match(html, /Persistent \/ no temporal anchor/);
  assert.match(html, /Time\/date\/period is a property of the edge/);
  assert.match(html, /id="graph-edge-date-range"/);
});

test("application provides CRUD handlers for entity nodes, places, and structured action edges", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(source, /beginGraphNodeEdit/);
  assert.match(source, /removeGraphNode/);
  assert.match(source, /beginGraphPlaceEdit/);
  assert.match(source, /removeGraphPlace/);
  assert.match(source, /renderGraphPlaces/);
  assert.match(source, /spatial\.placeFromForm/);
  assert.match(source, /spatial\.placeIdentity/);
  assert.match(source, /graphPlaceOptions/);
  assert.match(source, /placeForItem/);
  assert.match(source, /beginGraphEdgeEdit/);
  assert.match(source, /removeGraphEdge/);
  assert.match(source, /parseJsonObject/);
  assert.match(source, /parseJsonArray/);
  assert.match(source, /parseLineList/);
  assert.match(source, /graphNodeAlternateNames/);
  assert.match(source, /graphNodeSourceIds/);
  assert.match(source, /graphEdgeSourceIds/);
  assert.match(source, /graphEdgeConfidence/);
  assert.match(source, /graph\.validateEntityNode/);
  assert.match(source, /graph\.validateActionPredicate/);
  assert.match(source, /graph\.validateGraphInput/);
  assert.match(source, /graph\.findDuplicateRelationship/);
  assert.match(source, /graph\.findMirroredRelationship/);
  assert.match(source, /Keep one canonical edge and add chronology, provenance, place, confidence/);
  assert.match(source, /graphContextItemOptions/);
  assert.match(source, /placeId:\s*els\.graphEdgePlace\.value/);
  assert.match(source, /Confidence must be between 0 and 1/);
  assert.match(source, /subjectId === objectId/);
  assert.match(source, /edge cannot originate from and target the same node/);
  assert.match(source, /connected \$\{edgeCount === 1 \? "edge" : "edges"\} will also be removed/);
  assert.match(
    source,
    /state\.relationships = state\.relationships\.map\(\(relationship\)[\s\S]*itemIds: \(relationship\.itemIds \|\| \[\]\)\.filter\(\(itemId\) => itemId !== id\)/,
  );
  assert.match(source, /collectRelationChangeForm/);
  assert.match(source, /buildGraphEdgeTime/);
  assert.match(source, /timelineviewportchange/);
  assert.match(source, /temporalGraphView\?\.setWindow/);
});

test("event editor can change relations at the event timestamp", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="item-relation-changes-details"/);
  assert.match(html, /data-relation-change-slot="1"/);
  assert.match(html, /value="activate"/);
  assert.match(html, /value="deactivate"/);
  assert.match(html, /value="update"/);
});

test("graph exploration never opens editors while graph authoring stays inside explicit Edit mode", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(source, /mode:\s*"view"/);
  assert.match(source, /function presentationModeActive\(\)[\s\S]*ui\.mode !== "edit"/);
  assert.doesNotMatch(source, /graphentityfocus|graphedgefocus|graphnodefocus|graphstoryfocus/);
  assert.match(source, /graphNodeList\.addEventListener\("click"[\s\S]*beginGraphNodeEdit/);
  assert.match(source, /graphEdgeList\.addEventListener\("click"[\s\S]*beginGraphEdgeEdit/);
  assert.match(source, /timelinefocusedit[\s\S]*setEditorSurfaceOpen\(true\)[\s\S]*beginItemEdit/);
  assert.match(source, /resetGraphEdgeForm[\s\S]*graphEdgeTimeKind\.value = "event"/);
});
