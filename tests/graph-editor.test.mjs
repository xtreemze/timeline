import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("graph editor exposes noun nodes, action edges, properties, and temporal ranges", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="tab-graph"/);
  assert.match(html, /id="panel-graph"/);
  assert.match(html, /id="graph-node-form"/);
  assert.match(html, /id="graph-node-identifiers"/);
  assert.match(html, /id="graph-node-properties"/);
  assert.match(html, /id="graph-edge-subject"/);
  assert.match(html, /id="graph-edge-predicate"/);
  assert.match(html, /id="graph-edge-object"/);
  assert.match(html, /id="graph-edge-properties"/);
  assert.match(html, /id="graph-edge-initial-state"/);
  assert.match(html, /id="graph-edge-time-kind"/);
  assert.match(html, /id="graph-edge-date-range"/);
});

test("timeline includes an interactive temporal node-edge graph lens", async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="temporal-graph-view"/);
  assert.match(html, /class="temporal-graph-canvas"/);
  assert.match(source, /graphForWindow/);
  assert.match(source, /temporalState/);
  assert.match(source, /TimelineOrbGraph/);
  assert.match(source, /graphnodefocus/);
  assert.match(source, /graphstoryfocus/);
  assert.match(source, /updateTemporalEdges/);
  assert.match(html, /orb-graph\.bundle\.js/);
  assert.match(css, /\.temporal-graph-canvas canvas/);
});

test("application provides CRUD handlers for graph nodes and labeled edges", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /beginGraphNodeEdit/);
  assert.match(source, /removeGraphNode/);
  assert.match(source, /beginGraphEdgeEdit/);
  assert.match(source, /removeGraphEdge/);
  assert.match(source, /parseJsonObject/);
  assert.match(source, /parseJsonArray/);
  assert.match(source, /collectRelationChangeForm/);
  assert.match(source, /buildGraphEdgeTime/);
  assert.match(source, /timelineviewportchange/);
  assert.match(source, /temporalGraphView\?\.setWindow/);
});

test("bundled graph bridge uses Memgraph Orb worker-backed force simulation with dense-graph GPU escalation", async () => {
  const [pkgText, source] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8")
  ]);
  const pkg = JSON.parse(pkgText);
  assert.equal(pkg.dependencies["@memgraph/orb"], "1.0.2");
  assert.match(source, /new OrbView/);
  assert.match(source, /SIMULATION_START/);
  assert.match(source, /type:\s*"force"/);
  assert.match(source, /useGPU:\s*wantsGPU/);
  assert.match(source, /setRenderer\(wantsWebGL \? "webgl" : "canvas"\)/);
  assert.match(source, /updateTemporalEdges/);
});

test("event editor can change relations at the event timestamp", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="item-relation-changes-details"/);
  assert.match(html, /data-relation-change-slot="1"/);
  assert.match(html, /value="activate"/);
  assert.match(html, /value="deactivate"/);
  assert.match(html, /value="update"/);
});

test("temporal graph exposes a layout refresh for presentation resizing", async () => {
  const source = await readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8");
  assert.match(source, /refreshLayout\(\)/);
  assert.match(source, /this\.orb\.recenter\(\)/);
});

test("focused presentation graph limits itself to the event neighborhood", async () => {
  const source = await readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8");
  assert.match(source, /setFocus\(id\)/);
  assert.match(source, /neighborhoodGraph\(this\.model, this\.focusedId/);
  assert.match(source, /relevant nodes/);
});

test("Orb styling uses semantic iconography, weighted physics, and worker CPU fallback", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(source, /NodeShapeType/);
  assert.match(source, /semanticIconUrl/);
  assert.match(source, /imageUrl:/);
  assert.match(source, /mass:/);
  assert.match(source, /isPhysicsEnabled:\s*true/);
  assert.match(source, /centering:\s*\{/);
  assert.match(source, /positioning:\s*\{/);
  assert.match(source, /GPU_LAYOUT_NODE_THRESHOLD\s*=\s*3000/);
  assert.match(source, /worker-cpu/);
  assert.match(source, /gpu-main-force/);
});

test("touch graph dragging requires a long press while preserving live force physics", async () => {
  const [bridge, view] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8")
  ]);

  assert.match(bridge, /TOUCH_NODE_HOLD_MS\s*=\s*420/);
  assert.match(bridge, /TOUCH_NODE_MOVE_TOLERANCE_PX\s*=\s*12/);
  assert.match(bridge, /NODE_DRAG_START/);
  assert.match(bridge, /NODE_DRAG_END/);
  assert.match(bridge, /GraphObjectState\.SELECTED/);
  assert.match(bridge, /setDragEnabled\(false\)/);
  assert.match(bridge, /setDragEnabled\(true\)/);
  assert.match(bridge, /isPhysicsEnabled:\s*true/);
  assert.match(bridge, /vibrate\?\.\(12\)/);
  assert.match(bridge, /activeTouchPointers/);
  assert.match(bridge, /Math\.hypot/);
  assert.match(view, /onNodeLongPress/);
  assert.match(view, /graphnodeselect/);
  assert.match(view, /long-press-drag/);
});



test("graph entity and edge editing are disabled while presentation mode is active", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /function presentationModeActive\(\)/);
  assert.match(source, /graphentityfocus[\s\S]*presentationModeActive\(\)[\s\S]*return;[\s\S]*beginGraphNodeEdit/);
  assert.match(source, /graphedgefocus[\s\S]*presentationModeActive\(\)[\s\S]*return;[\s\S]*beginGraphEdgeEdit/);
  assert.match(source, /timelinefocuschange[\s\S]*setPresentationMode/);
});

test("node interaction reheats force and preserves wider spacing after release", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /INTERACTION_SETTLE_MS\s*=\s*2400/);
  assert.match(source, /DRAG_ALPHA_TARGET\s*=\s*0\.12/);
  assert.match(source, /RELEASE_ALPHA_TARGET\s*=\s*0\.065/);
  assert.match(source, /onNodeDragStart[\s\S]*setInteractionHeat\(DRAG_ALPHA_TARGET\)/);
  assert.match(source, /onNodeDragEnd[\s\S]*keepForceActiveAfterInteraction\(\)/);
  assert.match(source, /simulator\.setSettings\(layout\)/);
  assert.match(source, /simulator\.activateSimulation\(\)/);
  assert.match(source, /distance:\s*dense \? 128 : 168/);
  assert.match(source, /strength:\s*dense \? -300 : -460/);
  assert.match(source, /radius:\s*dense \? 30 : 42/);
  assert.match(source, /iterations:\s*4/);
  assert.match(source, /centering:[\s\S]*strength:\s*dense \? 0\.02 : 0\.035/);
  assert.match(source, /forceX:[\s\S]*strength:\s*dense \? 0\.012 : 0\.02/);
  assert.match(source, /alphaMin:\s*dense \? 0\.018 : 0\.012/);
  assert.match(source, /alphaDecay:\s*dense \? 0\.024 : 0\.021/);
  assert.match(source, /clearInteractionSettleTimer\(\)/);
});
