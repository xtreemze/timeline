import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("graph editor exposes noun nodes, action edges, properties, and temporal ranges", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="tab-graph"/);
  assert.match(html, /id="panel-graph"/);
  assert.match(html, /id="graph-node-form"/);
  assert.match(html, /id="graph-node-identity-details"/);
  assert.match(html, /id="graph-node-alternate-names"/);
  assert.match(html, /id="graph-node-identifiers"/);
  assert.match(html, /id="graph-node-source-ids"/);
  assert.match(html, /id="graph-node-properties"/);
  assert.match(html, /id="graph-edge-subject"/);
  assert.match(html, /id="graph-edge-predicate"/);
  assert.match(html, /id="graph-edge-object"/);
  assert.match(html, /id="graph-edge-item-ids"/);
  assert.match(html, /Nodes are durable nouns\/entities only/);
  assert.match(html, /Generic associations such as participatedIn, partOf, memberOf, relatedTo/);
  assert.match(html, /id="graph-edge-properties"/);
  assert.match(html, /id="graph-edge-initial-state"/);
  assert.match(html, /id="graph-edge-provenance-details"/);
  assert.match(html, /id="graph-edge-source-ids"/);
  assert.match(html, /id="graph-edge-confidence"/);
  assert.match(html, /id="graph-edge-time-kind"/);
  assert.match(html, /id="graph-edge-time-kind"[\s\S]*value="event" selected/);
  assert.match(html, /Persistent \/ no temporal anchor/);
  assert.match(html, /Prefer a date or range so the relation can enter and leave the graph/);
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
  assert.match(source, /graphselectionchange/);
  assert.doesNotMatch(source, /graphnodefocus|graphstoryfocus|graphentityfocus|graphedgefocus/);
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
  assert.match(source, /parseLineList/);
  assert.match(source, /graphNodeAlternateNames/);
  assert.match(source, /graphNodeSourceIds/);
  assert.match(source, /graphEdgeSourceIds/);
  assert.match(source, /graphEdgeConfidence/);
  assert.match(source, /graph\.validateEntityNode/);
  assert.match(source, /graph\.validateActionPredicate/);
  assert.match(source, /graph\.validateGraphInput/);
  assert.match(source, /graphContextItemOptions/);
  assert.match(source, /Confidence must be between 0 and 1/);
  assert.match(source, /connected \$\{edgeCount === 1 \? "edge" : "edges"\} will also be removed/);
  assert.match(source, /pruneRelationChanges\(removedRelationshipIds\)/);
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



test("graph exploration never opens editors while graph authoring stays inside explicit Edit mode", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /mode:\s*"view"/);
  assert.match(source, /function presentationModeActive\(\)[\s\S]*ui\.mode !== "edit"/);
  assert.doesNotMatch(source, /graphentityfocus|graphedgefocus|graphnodefocus|graphstoryfocus/);
  assert.match(source, /graphNodeList\.addEventListener\("click"[\s\S]*beginGraphNodeEdit/);
  assert.match(source, /graphEdgeList\.addEventListener\("click"[\s\S]*beginGraphEdgeEdit/);
  assert.match(source, /timelinefocusedit[\s\S]*setEditorSurfaceOpen\(true\)[\s\S]*beginItemEdit/);
  assert.match(source, /resetGraphEdgeForm[\s\S]*graphEdgeTimeKind\.value = "event"/);
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


test("timeline topology changes visibly release, break, and bind graph relationships", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /TOPOLOGY_EDGE_RELEASE_MS\s*=\s*280/);
  assert.match(source, /TOPOLOGY_SETTLE_MS\s*=\s*820/);
  assert.match(source, /TOPOLOGY_ALPHA_TARGET\s*=\s*0\.085/);
  assert.match(source, /orb\.data\.merge\(/);
  assert.match(source, /orb\.data\.remove\(/);
  assert.match(source, /__timelineTransition/);
  assert.match(source, /"releasing"/);
  assert.match(source, /"entering"/);
  assert.match(source, /"exiting"/);
  assert.match(source, /positionIncomingNodes/);
  assert.match(source, /getPosition\?\.\(\)/);
  assert.match(source, /setPosition\(\{/);
  assert.match(source, /scheduleTopologyStep[\s\S]*TOPOLOGY_EDGE_RELEASE_MS/);
  assert.match(source, /scheduleTopologyStep[\s\S]*TOPOLOGY_SETTLE_MS/);
  assert.match(source, /keepForceActiveAfterInteraction\(\)/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
});


test("graph refresh rerenders Orb after reparenting or container resize", async () => {
  const [bridge, view] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8")
  ]);

  assert.match(bridge, /refreshLayout\(\) \{[\s\S]*orb\.render\(\(\) => orb\.recenter\(\)\)/);
  assert.match(view, /new ResizeObserver\(\(entries\) => \{/);
  assert.match(view, /entries\.find\(\(candidate\) => candidate\.target === this\.canvas\)/);
  assert.match(view, /this\.lastCanvasSize/);
  assert.match(view, /this\.resizeObserver\.observe\(this\.canvas\)/);
  assert.match(view, /refreshLayout\(\)[\s\S]*this\.orb\.refreshLayout\?\.\(\)/);
});


test("touch node long press is armed from capture-phase hit testing before Orb drag starts", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /function touchNodePayload\(event\)/);
  assert.match(bridge, /orb\.getSimulationPosition\(globalPoint\)/);
  assert.match(bridge, /orb\.data\.getNearestNode\(localPoint\)/);
  assert.match(bridge, /const target = touchTargetPayload\(event\)[\s\S]*target\?\.kind === "node"[\s\S]*beginTouchHold\(payload\)/);
  assert.match(bridge, /pointerdown", onPointerDown, \{ capture: true \}/);
  assert.match(bridge, /beginTouchHold\([\s\S]*setDragEnabled\(false\)[\s\S]*TOUCH_NODE_HOLD_MS/);
  assert.match(bridge, /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)[\s\S]*simulator\?\.startDragNode\(\)[\s\S]*setInteractionHeat\(DRAG_ALPHA_TARGET\)/);
  assert.doesNotMatch(bridge, /onNodeDragStart[\s\S]{0,180}beginTouchHold/);
});


test("touch graph gesture ownership separates node drag from graph pan and pinch", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /function setZoomEnabled\(enabled\)[\s\S]*isZoomEnabled:\s*enabled/);
  assert.match(bridge, /function finishTouchGesture\(\)[\s\S]*setDragEnabled\(true\)[\s\S]*setZoomEnabled\(true\)/);
  assert.match(bridge, /function cancelPendingTouchHold\(\)[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)/);
  assert.match(bridge, /function beginTouchHold\([\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)[\s\S]*TOUCH_NODE_HOLD_MS/);
  assert.match(bridge, /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)/);
  assert.match(bridge, /activeTouchPointers\.size > 1[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)/);
});


test("graph double tap zooms at the tapped point while long press and multi-touch cancel the tap sequence", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /TOUCH_DOUBLE_TAP_MS\s*=\s*320/);
  assert.match(bridge, /GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX\s*=\s*-500/);
  assert.match(bridge, /function zoomGraphAtClientPoint\(point\)[\s\S]*new WheelEvent\("wheel"/);
  assert.match(bridge, /clientX:\s*point\.x[\s\S]*clientY:\s*point\.y[\s\S]*deltaY:\s*GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX/);
  assert.match(bridge, /function registerTouchTap\(event, tap\)[\s\S]*zoomGraphAtClientPoint\(point\)/);
  assert.match(bridge, /touchHold\.activated = true[\s\S]*touchTap = null[\s\S]*lastTouchTap = null/);
  assert.match(bridge, /activeTouchPointers\.size > 1[\s\S]*touchTap = null[\s\S]*lastTouchTap = null/);
  assert.match(bridge, /distance > TOUCH_NODE_MOVE_TOLERANCE_PX[\s\S]*lastTouchTap = null/);
  assert.match(bridge, /suppressGraphClickUntil = now \+ 450/);
  assert.match(bridge, /addEventListener\("click", onClickCapture, \{ capture: true \}\)/);
});


test("touch graph uses forgiving node and edge hit targets with visible long-press progress", async () => {
  const [bridge, styles] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(bridge, /TOUCH_NODE_TARGET_DIAMETER_PX\s*=\s*44/);
  assert.match(bridge, /TOUCH_EDGE_TARGET_RADIUS_PX\s*=\s*14/);
  assert.match(bridge, /function simulationRadiusForPixels\(globalPoint, radiusPx\)/);
  assert.match(bridge, /function expandedTouchNode\(localPoint, globalPoint\)[\s\S]*orb\.data\.getNodes\(\)/);
  assert.match(bridge, /Math\.max\(Number\(node\.getBorderedRadius\?\.\(\)\) \|\| 0, minimumRadius\)/);
  assert.match(bridge, /orb\.data\.getNearestEdge\(geometry\.localPoint, edgeTolerance\)/);
  assert.match(bridge, /touchTap = \{[\s\S]*target,[\s\S]*cancelled: false/);
  assert.match(bridge, /!didDoubleTap && tap\.target\?\.object[\s\S]*handlers\.onNodeClick\?\.[\s\S]*handlers\.onEdgeClick\?\./);
  assert.match(bridge, /--graph-touch-hold-x/);
  assert.match(bridge, /--graph-touch-hold-y/);

  assert.match(styles, /temporal-graph-canvas\[data-touch-drag="holding"\]::after/);
  assert.match(styles, /width:\s*44px[\s\S]*height:\s*44px/);
  assert.match(styles, /animation:\s*graph-touch-hold 420ms linear both/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*data-touch-drag="holding"/);
});


test("graph camera release reuses Timeline weighted inertia without changing node force physics", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /const motion = globalThis\.TimelineMotion/);
  assert.match(bridge, /let cameraGesture = null/);
  assert.match(bridge, /let cameraInertiaAnimationFrame = 0/);
  assert.match(bridge, /motion\?\.appendPointerVectorSamples/);
  assert.match(bridge, /motion\.estimatePointerVectorVelocity\(gesture\.samples\)/);
  assert.match(bridge, /motion\.decayVelocity\(velocityX, elapsed\)/);
  assert.match(bridge, /motion\.decayVelocity\(velocityY, elapsed\)/);
  assert.match(bridge, /transform\.translate\(deltaX \/ transform\.k, deltaY \/ transform\.k\)/);
  assert.match(bridge, /canvas\.__zoom = next/);
  assert.match(bridge, /orb\._renderer\.transform = next/);
  assert.match(bridge, /requestAnimationFrame\(\(\) => startCameraInertia\(velocity\)\)/);
  assert.match(bridge, /prefersReducedMotion\(\)/);
  assert.match(bridge, /wheel", onWheelCapture/);
});


test("activated touch long press directly drives the Orb simulator instead of depending on a pre-armed D3 drag", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(bridge, /function touchDragSimulator\(\)[\s\S]*simulator\.startDragNode[\s\S]*simulator\.dragNode[\s\S]*simulator\.endDragNode/);
  assert.match(bridge, /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)/);
  assert.match(bridge, /simulator\?\.startDragNode\(\)/);
  assert.match(bridge, /container\.setPointerCapture\?\.\(touchHold\.pointerId\)/);
  assert.match(bridge, /if \(touchHold\.activated\)[\s\S]*touchGeometry\(event\)[\s\S]*simulator\.dragNode\(touchHold\.node\.getId\(\), geometry\.localPoint\)/);
  assert.match(bridge, /function finishActiveTouchNodeDrag[\s\S]*simulator\.endDragNode\(node\.getId\(\)\)/);
  assert.match(bridge, /finishActiveTouchNodeDrag\(\)[\s\S]*finishTouchGesture\(\)/);
  assert.match(bridge, /lostpointercapture", onLostPointerCapture/);
  assert.match(bridge, /onLostPointerCapture[\s\S]*finishActiveTouchNodeDrag\(\)[\s\S]*finishTouchGesture\(\)/);
});
