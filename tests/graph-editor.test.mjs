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

test("timeline includes an interactive temporal node-edge graph lens", async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
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

test("bundled graph bridge uses Memgraph Orb worker-backed force simulation with dense-graph GPU escalation", async () => {
  const [pkgText, source] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
  ]);
  const pkg = JSON.parse(pkgText);
  assert.equal(pkg.devDependencies["@memgraph/orb"], "1.1.0");
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

test("temporal graph exposes renderer-neutral recenter and layout refresh for presentation resizing", async () => {
  const source = await readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8");
  assert.match(source, /refreshLayout\(\)/);
  assert.match(source, /this\.surface\.recenter\(\)/);
  assert.match(source, /this\.surface\.refreshLayout\(\)/);
  assert.doesNotMatch(source, /this\.orb\./);
});

test("focused presentation graph limits itself to the event neighborhood", async () => {
  const source = await readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8");
  assert.match(source, /setFocus\(id:\s*string \| number \| null\)/);
  assert.match(source, /graph\.neighborhoodGraph\(this\.model, this\.focusedId/);
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
  const [bridge, adapter, view] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../src/layout/orb-graph-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8"),
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
  assert.match(adapter, /onNodeLongPress/);
  assert.match(adapter, /kind:\s*"interaction-start"/);
  assert.match(adapter, /interaction:\s*"long-press-drag"/);
  assert.match(view, /graphnodeselect/);
  assert.match(view, /long-press-drag/);
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

test("node interaction reheats force and preserves wider spacing after release", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /INTERACTION_SETTLE_MS\s*=\s*3400/);
  assert.match(source, /DRAG_ALPHA_TARGET\s*=\s*0\.05/);
  assert.match(source, /RELEASE_ALPHA_TARGET\s*=\s*0\.018/);
  assert.match(
    source,
    /function onPointerDown\(event\)[\s\S]*target\?\.kind === "node"[\s\S]*requestSimulation\("drag", DRAG_ALPHA_TARGET\)[\s\S]*beginCameraGesture\(event, target\)/,
  );
  assert.doesNotMatch(
    source,
    /onNodeDragStart[\s\S]{0,320}(?:activateSimulation|requestSimulation)/,
  );
  assert.match(
    source,
    /onNodeDragEnd[\s\S]*releaseSimulation\("drag"\)[\s\S]*keepForceActiveAfterInteraction\(\)/,
  );
  assert.match(source, /simulator\.setSettings\(layout\)/);
  assert.match(source, /simulator\.activateSimulation\(\)/);
  assert.match(source, /distance:\s*dense \? 128 : 168/);
  assert.match(source, /strength:\s*dense \? -185 : -285/);
  assert.match(source, /radius:\s*dense \? 30 : 42/);
  assert.match(source, /iterations:\s*3/);
  assert.match(source, /centering:[\s\S]*strength:\s*dense \? 0\.005 : 0\.008/);
  assert.match(source, /forceX:[\s\S]*strength:\s*positioningStrength \* overlapScale/);
  assert.match(source, /alphaMin:\s*dense \? 0\.005 : 0\.004/);
  assert.match(source, /alphaDecay:\s*dense \? 0\.028 : 0\.026/);
  assert.match(source, /clearInteractionSettleTimer\(\)/);
});

test("mouse node drag preheats force before Orb enters native drag state", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    source,
    /container\.addEventListener\("pointerdown", onPointerDown, \{ capture: true \}\)/,
  );
  assert.match(
    source,
    /function onPointerDown\(event\)[\s\S]*const target = touchTargetPayload\(event\)[\s\S]*event\.pointerType !== "touch"[\s\S]*target\?\.kind === "node"[\s\S]*requestSimulation\("drag", DRAG_ALPHA_TARGET\)/,
  );
  assert.match(
    source,
    /target\?\.kind === "node"[\s\S]{0,520}else \{[\s\S]*beginCameraGesture\(event, target\)/,
  );
  assert.match(
    source,
    /const onNodeDragStart = \(\) => \{[\s\S]{0,320}clearInteractionSettleTimer\(\)/,
  );
  assert.doesNotMatch(
    source,
    /const onNodeDragStart = \(\) => \{[\s\S]{0,320}requestSimulation\("drag"/,
  );
});

test("timeline topology changes visibly release, break, and bind graph relationships", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /TOPOLOGY_EDGE_RELEASE_MS\s*=\s*360/);
  assert.match(source, /TOPOLOGY_SETTLE_MS\s*=\s*1100/);
  assert.match(source, /TOPOLOGY_ALPHA_TARGET\s*=\s*0\.028/);
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

test("graph refresh rerenders through GraphSurface after reparenting or container resize", async () => {
  const [bridge, view] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    bridge,
    /refreshLayout\(\) \{[\s\S]*orb\.render\(\(\) => \{[\s\S]*if \(!userOwnsCamera\) orb\.recenter\(\)/,
  );
  assert.match(view, /new ResizeObserver\(\(entries:\s*ResizeObserverEntry\[\]\) => \{/);
  assert.match(view, /entries\.find\(\(candidate\) => candidate\.target === this\.canvas\)/);
  assert.match(view, /this\.lastCanvasSize/);
  assert.match(view, /this\.resizeObserver\.observe\(this\.canvas\)/);
  assert.match(view, /refreshLayout\(\)[\s\S]*this\.surface\.refreshLayout\(\)/);
});

test("touch node long press is armed from capture-phase hit testing before Orb drag starts", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /function touchTargetPayload\(event\)/);
  assert.match(bridge, /orb\.getSimulationPosition\(globalPoint\)/);
  assert.match(bridge, /expandedTouchNode\(geometry\.localPoint, geometry\.globalPoint\)/);
  assert.match(
    bridge,
    /const target = touchTargetPayload\(event\)[\s\S]*target\?\.kind === "node"[\s\S]*if \(payload\) beginTouchHold\(payload\)/,
  );
  assert.match(bridge, /pointerdown", onPointerDown, \{ capture: true \}/);
  assert.match(bridge, /beginTouchHold\([\s\S]*setDragEnabled\(false\)[\s\S]*TOUCH_NODE_HOLD_MS/);
  assert.match(
    bridge,
    /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)[\s\S]*requestSimulation\("drag", DRAG_ALPHA_TARGET\)[\s\S]*simulator\?\.startDragNode\(\)/,
  );
  assert.doesNotMatch(bridge, /onNodeDragStart[\s\S]{0,180}beginTouchHold/);
});

test("touch graph gesture ownership separates node drag from graph pan and pinch", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /function setZoomEnabled\(enabled\)[\s\S]*isZoomEnabled:\s*enabled/);
  assert.match(
    bridge,
    /function finishTouchGesture\(\)[\s\S]*setDragEnabled\(true\)[\s\S]*setZoomEnabled\(true\)/,
  );
  assert.match(
    bridge,
    /function cancelPendingTouchHold\(\)[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)/,
  );
  assert.match(
    bridge,
    /function beginTouchHold\([\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)[\s\S]*TOUCH_NODE_HOLD_MS/,
  );
  assert.match(
    bridge,
    /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)/,
  );
  assert.match(
    bridge,
    /activeTouchPointers\.size > 1[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)/,
  );
});

test("graph double tap zooms at the tapped point while long press and multi-touch cancel the tap sequence", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");
  assert.match(bridge, /TOUCH_DOUBLE_TAP_MS\s*=\s*320/);
  assert.match(bridge, /GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX\s*=\s*-280/);
  assert.match(bridge, /function zoomGraphAtClientPoint\(point\)[\s\S]*new WheelEvent\("wheel"/);
  assert.match(
    bridge,
    /clientX:\s*point\.x[\s\S]*clientY:\s*point\.y[\s\S]*deltaY:\s*GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX/,
  );
  assert.match(
    bridge,
    /function registerTouchTap\(event, tap\)[\s\S]*zoomGraphAtClientPoint\(point\)/,
  );
  assert.match(
    bridge,
    /touchHold\.activated = true[\s\S]*touchTap = null[\s\S]*lastTouchTap = null/,
  );
  assert.match(
    bridge,
    /activeTouchPointers\.size > 1[\s\S]*touchTap = null[\s\S]*lastTouchTap = null/,
  );
  assert.match(bridge, /distance > TOUCH_NODE_MOVE_TOLERANCE_PX[\s\S]*lastTouchTap = null/);
  assert.match(bridge, /suppressGraphClickUntil = now \+ 450/);
  assert.match(bridge, /addEventListener\("click", onClickCapture, \{ capture: true \}\)/);
});

test("touch graph uses forgiving node and edge hit targets with visible long-press progress", async () => {
  const [bridge, styles] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(bridge, /TOUCH_NODE_TARGET_DIAMETER_PX\s*=\s*44/);
  assert.match(bridge, /TOUCH_EDGE_TARGET_RADIUS_PX\s*=\s*22/);
  assert.match(bridge, /function simulationRadiusForPixels\(globalPoint, radiusPx\)/);
  assert.match(
    bridge,
    /function expandedTouchNode\(localPoint, globalPoint\)[\s\S]*orb\.data\.getNodes\(\)/,
  );
  assert.match(
    bridge,
    /Math\.max\(Number\(node\.getBorderedRadius\?\.\(\)\) \|\| 0, minimumRadius\)/,
  );
  assert.match(bridge, /orb\.data\.getNearestEdge\(geometry\.localPoint, edgeTolerance\)/);
  assert.match(bridge, /touchTap = \{[\s\S]*target,[\s\S]*cancelled: false/);
  assert.match(
    bridge,
    /!didDoubleTap && tap\.target\?\.object[\s\S]*handlers\.onNodeClick\?\.[\s\S]*handlers\.onEdgeClick\?\./,
  );
  assert.match(bridge, /--graph-touch-hold-x/);
  assert.match(bridge, /--graph-touch-hold-y/);

  assert.match(styles, /temporal-graph-canvas\[data-touch-drag="holding"\]::after/);
  assert.match(styles, /width:\s*44px[\s\S]*height:\s*44px/);
  assert.match(styles, /animation:\s*graph-touch-hold 420ms linear both/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*data-touch-drag="holding"/,
  );
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

test("graph background drag uses the timeline weighted response before shared release inertia", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(bridge, /ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES = new Set\(\["mousedown"\]\)/);
  assert.match(
    bridge,
    /function removeOrbNativeCameraDragListeners\(\)[\s\S]*listener\?\.name === "zoom"[\s\S]*ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES\.has\(listener\.type\)/,
  );
  assert.match(
    bridge,
    /function beginCameraGesture\(event, target\)[\s\S]*startTransform:\s*transform[\s\S]*weightedTransform:\s*transform[\s\S]*setPointerCapture/,
  );
  assert.match(
    bridge,
    /function updateCameraGesture\(event\)[\s\S]*motion\.responseForElapsed\(now - gesture\.lastTime\)[\s\S]*target\.x - current\.x[\s\S]*orb\._renderer\.transform = next/,
  );
  assert.match(
    bridge,
    /function onTouchMoveCapture\(event\)[\s\S]*weightedCameraOwnsGesture[\s\S]*activeTouchPointers\.size === 1[\s\S]*event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)/,
  );
  assert.match(
    bridge,
    /activeTouchPointers\.size > 1[\s\S]*releaseTouchPointerCapture\(cameraGesture\.pointerId\)[\s\S]*cameraGesture = null/,
  );
  assert.match(
    bridge,
    /removeOrbTouchDragListeners\(\);[\s\S]*removeOrbNativeCameraDragListeners\(\);/,
  );
});

test("activated touch long press directly drives the Orb simulator instead of depending on a pre-armed D3 drag", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    bridge,
    /function touchDragSimulator\(\)[\s\S]*simulator\.startDragNode[\s\S]*simulator\.dragNode[\s\S]*simulator\.endDragNode/,
  );
  assert.match(
    bridge,
    /touchHold\.activated = true[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)/,
  );
  assert.match(bridge, /simulator\?\.startDragNode\(\)/);
  assert.match(bridge, /container\.setPointerCapture\?\.\(touchHold\.pointerId\)/);
  assert.match(
    bridge,
    /touchHold\?\.activated[\s\S]*touchHold\.pointerId === event\.pointerId[\s\S]*touchGeometry\(event\)[\s\S]*simulator\.dragNode\(touchHold\.node\.getId\(\), geometry\.localPoint\)/,
  );
  assert.match(
    bridge,
    /function finishActiveTouchNodeDrag[\s\S]*simulator\.endDragNode\(node\.getId\(\)\)/,
  );
  assert.match(bridge, /finishActiveTouchNodeDrag\(\)[\s\S]*finishTouchGesture\(\)/);
  assert.match(bridge, /lostpointercapture", onLostPointerCapture/);
  assert.match(
    bridge,
    /onLostPointerCapture[\s\S]*finishActiveTouchNodeDrag\(\)[\s\S]*finishTouchGesture\(\)/,
  );
});

test("active touch node drag keeps exclusive camera ownership and releases when its owning finger lifts", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    bridge,
    /activeTouchPointers\.size > 1[\s\S]*touchHold\?\.activated[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)[\s\S]*return/,
  );
  assert.match(
    bridge,
    /const ownsActiveNodeDrag = Boolean\([\s\S]*touchHold\?\.activated && touchHold\.pointerId === event\.pointerId/,
  );
  assert.match(
    bridge,
    /if \(ownsActiveNodeDrag\)[\s\S]*finishActiveTouchNodeDrag\(\)[\s\S]*finishTouchGesture\(\)[\s\S]*activeTouchPointers\.size[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)/,
  );
});

test("touch node hold freezes the graph camera until drag or navigation intent is resolved", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    bridge,
    /function beginTouchHold\([\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(false\)[\s\S]*touchDragBlockedUntilRelease = true/,
  );
  assert.match(
    bridge,
    /function cancelPendingTouchHold\(\)[\s\S]*setDragEnabled\(false\)[\s\S]*setZoomEnabled\(true\)/,
  );
  assert.match(
    bridge,
    /requestSimulation\("drag", DRAG_ALPHA_TARGET\)[\s\S]*simulator\?\.startDragNode\(\)/,
  );
});

test("graph touch ownership keeps D3 zoom state synchronized and recovers from interruptions", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(bridge, /function syncCameraZoomState\(\)[\s\S]*canvas\.__zoom = transform/);
  assert.match(
    bridge,
    /function setZoomEnabled\(enabled\)[\s\S]*syncCameraZoomState\(\)[\s\S]*isZoomEnabled:\s*enabled/,
  );
  assert.match(
    bridge,
    /function onTouchEnd\(event\)[\s\S]*activeTouchPointers\.clear\(\)[\s\S]*cameraGesture = null/,
  );
  assert.match(
    bridge,
    /function abortTouchInteraction\(\)[\s\S]*cancelCameraInertia\(\)[\s\S]*activeTouchPointers\.clear\(\)[\s\S]*finishTouchGesture\(\)/,
  );
  assert.match(bridge, /addEventListener\?\.\("blur", onWindowBlur\)/);
  assert.match(bridge, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/);
  assert.match(bridge, /removeEventListener\?\.\("blur", onWindowBlur\)/);
  assert.match(bridge, /document\.removeEventListener\("visibilitychange", onVisibilityChange\)/);
});

test("graph camera gestures have explicit keyboard equivalents", async () => {
  const [bridge, html] = await Promise.all([
    readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="graph-surface-help"[^>]*class="sr-only"/);
  assert.match(
    html,
    /temporal-graph-canvas[^>]*tabindex="0"[^>]*aria-describedby="graph-surface-help"/,
  );
  assert.match(bridge, /GRAPH_KEYBOARD_PAN_PX\s*=\s*72/);
  assert.match(bridge, /const onGraphKeyDown = \(event\) =>/);
  assert.match(bridge, /case "ArrowLeft":[\s\S]*applyCameraPan/);
  assert.match(bridge, /case "ArrowRight":[\s\S]*applyCameraPan/);
  assert.match(bridge, /case "\+":[\s\S]*orb\.zoomIn\(\)/);
  assert.match(bridge, /case "-":[\s\S]*orb\.zoomOut\(\)/);
  assert.match(bridge, /case "Home":[\s\S]*orb\.recenter\(\)/);
  assert.match(bridge, /addEventListener\("keydown", onGraphKeyDown\)/);
  assert.match(bridge, /removeEventListener\("keydown", onGraphKeyDown\)/);
});

test("touch camera navigation is not intercepted by Orb's D3 node-drag recognizer", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    bridge,
    /ORB_TOUCH_DRAG_EVENT_TYPES = new Set\(\[[\s\S]*"touchstart"[\s\S]*"touchmove"[\s\S]*"touchend"[\s\S]*"touchcancel"/,
  );
  assert.match(
    bridge,
    /function removeOrbTouchDragListeners\(\)[\s\S]*Array\.isArray\(canvas\?\.__on\)/,
  );
  assert.match(
    bridge,
    /listener\?\.name === "drag"[\s\S]*ORB_TOUCH_DRAG_EVENT_TYPES\.has\(listener\.type\)/,
  );
  assert.match(
    bridge,
    /canvas\.removeEventListener\(listener\.type, listener\.listener, listener\.options\)/,
  );
  assert.match(bridge, /removeOrbTouchDragListeners\(\);[\s\S]*function forceAlphaProfile/);
  assert.match(
    bridge,
    /orb\.setRenderer\([\s\S]*removeOrbTouchDragListeners\(\);[\s\S]*orb\.setSettings/,
  );
  assert.match(bridge, /simulator\.dragNode\(touchHold\.node\.getId\(\), geometry\.localPoint\)/);
});

test("active touch node drag blocks Orb camera movement at the event boundary", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(
    bridge,
    /function onPointerMove\(event\)[\s\S]*touchHold\?\.activated[\s\S]*touchHold\.pointerId === event\.pointerId[\s\S]*event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)[\s\S]*simulator\.dragNode\(touchHold\.node\.getId\(\), geometry\.localPoint\)[\s\S]*return;[\s\S]*updateCameraGesture\(event\)/,
  );
  assert.match(
    bridge,
    /function onTouchMoveCapture\(event\)[\s\S]*touchHold\?\.activated[\s\S]*event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)/,
  );
  assert.match(
    bridge,
    /addEventListener\("touchmove", onTouchMoveCapture, \{ capture: true, passive: false \}\)/,
  );
  assert.match(bridge, /removeEventListener\("touchmove", onTouchMoveCapture, true\)/);
});

test("Relations camera has a hard zoom bound and sanitizes shared transforms", async () => {
  const bridge = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(bridge, /GRAPH_MIN_ZOOM\s*=\s*0\.002/);
  assert.match(bridge, /GRAPH_MAX_ZOOM\s*=\s*2\.5/);
  assert.match(bridge, /minZoom:\s*GRAPH_MIN_ZOOM/);
  assert.match(bridge, /maxZoom:\s*GRAPH_MAX_ZOOM/);
  assert.match(
    bridge,
    /function clampCameraTransform\(transform\)[\s\S]*Number\.isFinite\(transform\.k\)[\s\S]*Math\.min\(GRAPH_MAX_ZOOM, Math\.max\(GRAPH_MIN_ZOOM, transform\.k\)\)/,
  );
  assert.match(
    bridge,
    /function syncCameraZoomState\(\)[\s\S]*clampCameraTransform\(renderer\?\.transform\)[\s\S]*canvas\.__zoom = transform/,
  );
  assert.match(
    bridge,
    /function applyCameraPan\(deltaX, deltaY\)[\s\S]*clampCameraTransform\(canvas\?\.__zoom \|\| orb\?\._renderer\?\.transform\)/,
  );
});


test("graph camera and force policy stays bounded, weighted, and explicitly active", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /GRAPH_MAX_ZOOM\s*=\s*2\.5/);
  assert.match(source, /GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX\s*=\s*-280/);
  assert.doesNotMatch(source, /nodeCount\s*>=\s*3000\s*\?\s*0\.0005/);
  assert.match(source, /DRAG_ALPHA_TARGET\s*=\s*0\.05/);
  assert.match(source, /RELEASE_ALPHA_TARGET\s*=\s*0\.018/);
  assert.match(source, /TOPOLOGY_ALPHA_TARGET\s*=\s*0\.028/);
  assert.match(
    source,
    /function setData\(data\)[\s\S]{0,1800}requestSimulation\("topology", 0\)[\s\S]{0,500}orb\.render/,
  );
  assert.match(source, /refreshLayout\(\)\s*\{[\s\S]{0,900}orb\.render/);
  assert.doesNotMatch(
    source,
    /refreshLayout\(\)\s*\{[\s\S]{0,500}requestSimulation\(/,
  );
  assert.match(source, /alpha:\s*reheat\s*\?\s*\(dense \? 0\.11 : 0\.14\)\s*:\s*dense \? 0\.025 : 0\.032/);
  assert.match(source, /simulator\.stopSimulation\(\)/);
  assert.match(source, /isSimulatingOnDataUpdate:\s*false/);
  assert.match(source, /isSimulatingOnSettingsUpdate:\s*false/);
  assert.match(source, /\.timeline-surface, \.presentation-map, \.leaflet-container/);
  assert.match(source, /document\.addEventListener\("pointerdown", onCompetingPointerDown, true\)/);
  assert.match(source, /simulationCoordinator\.suspend\("competing-surface"\)/);
  assert.match(source, /simulationCoordinator\.resume\("competing-surface"\)/);
});


test("graph presentation force clears visible popovers and returns gradually to center", async () => {
  const source = await readFile(new URL("../src/orb-graph-entry.js", import.meta.url), "utf8");

  assert.match(source, /POPOVER_REJECTION_STRENGTH\s*=\s*-0\.009/);
  assert.match(source, /POPOVER_REJECTION_DENSE_STRENGTH\s*=\s*-0\.006/);
  assert.match(source, /CENTER_ATTRACTION_STRENGTH\s*=\s*0\.007/);
  assert.match(source, /CENTER_ATTRACTION_DENSE_STRENGTH\s*=\s*0\.005/);
  assert.match(source, /querySelectorAll\("\[popover\]:popover-open"\)/);
  assert.match(source, /popover\.contains\(container\)/);
  assert.match(source, /orb\.getSimulationPosition\(canvasPoint\)/);
  assert.match(
    source,
    /presentationForcePoint[\s\S]*POPOVER_REJECTION_DENSE_STRENGTH[\s\S]*POPOVER_REJECTION_STRENGTH[\s\S]*CENTER_ATTRACTION_DENSE_STRENGTH[\s\S]*CENTER_ATTRACTION_STRENGTH/,
  );
  assert.match(source, /document\.addEventListener\("toggle", onPopoverToggle, true\)/);
  assert.match(source, /globalThis\.addEventListener\?\.\("resize", onPresentationGeometryChange\)/);
  assert.match(source, /document\.removeEventListener\("toggle", onPopoverToggle, true\)/);
  assert.match(source, /globalThis\.removeEventListener\?\.\("resize", onPresentationGeometryChange\)/);
  assert.match(source, /function settlePresentationForceUpdate\(delay = 160\)/);
  assert.match(
    source,
    /function applyCameraPan\([\s\S]*settlePresentationForceUpdate\(\)[\s\S]*return true/,
  );
  assert.match(source, /const onPopoverToggle = \(\) => queuePresentationForceUpdate\(\)/);
  assert.match(
    source,
    /const onWheelCapture = \(\) => \{[\s\S]*settlePresentationForceUpdate\(\)/,
  );
  assert.match(
    source,
    /if \(presentationForceSettleTimer\) globalThis\.clearTimeout\(presentationForceSettleTimer\)/,
  );

  assert.match(source, /DRAG_ALPHA_TARGET\s*=\s*0\.05/);
  assert.match(source, /RELEASE_ALPHA_TARGET\s*=\s*0\.018/);
  assert.match(source, /TOPOLOGY_ALPHA_TARGET\s*=\s*0\.028/);
  assert.match(
    source,
    /alpha:\s*reheat\s*\?\s*\(dense \? 0\.11 : 0\.14\)\s*:\s*dense \? 0\.025 : 0\.032/,
  );
  assert.match(source, /alphaDecay:\s*dense \? 0\.028 : 0\.026/);
});
