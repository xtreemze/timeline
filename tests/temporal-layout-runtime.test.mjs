import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  chooseStableLane,
  clusterMembershipWithHysteresis,
  geometryMeasurementKey,
  planCommittedTemporalLayout,
  planLaneCrossOffsets,
} from "../src/layout/temporal-layout.ts";

test("cluster hysteresis uses separate enter and exit thresholds", () => {
  const thresholds = { enterPx: 80, exitPx: 120 };
  assert.equal(clusterMembershipWithHysteresis(false, 90, thresholds), false);
  assert.equal(clusterMembershipWithHysteresis(false, 79, thresholds), true);
  assert.equal(clusterMembershipWithHysteresis(true, 100, thresholds), true);
  assert.equal(clusterMembershipWithHysteresis(true, 121, thresholds), false);
});

test("rapid reversal inside hysteresis band cannot flap cluster membership", () => {
  const thresholds = { enterPx: 80, exitPx: 120 };
  let clustered = clusterMembershipWithHysteresis(false, 79, thresholds);
  for (const distance of [84, 92, 105, 88, 117, 96]) {
    clustered = clusterMembershipWithHysteresis(clustered, distance, thresholds);
    assert.equal(clustered, true);
  }
});

test("stable lane is retained while legal", () => {
  assert.equal(chooseStableLane(2, [0, 1, 2, 3]), 2);
  assert.equal(chooseStableLane(2, [0, 1, 3]), 0);
  assert.equal(chooseStableLane(null, [3, 1, 2]), 1);
});

test("cross-axis lane offsets use measured extents and preserve nearest-first packing", () => {
  const offsets = planLaneCrossOffsets(
    [
      { lane: 0, blockSize: 180 },
      { lane: 0, blockSize: 220 },
      { lane: 1, blockSize: 260 },
      { lane: 2, blockSize: 120 },
    ],
    { axisOffsetPx: 44, laneGapPx: 16, routingSlackPx: 44 },
  );

  assert.deepEqual(offsets, {
    0: 44,
    1: 364,
    2: 684,
  });
  assert.ok(offsets[0] < offsets[1]);
  assert.ok(offsets[1] < offsets[2]);
});

test("measurement identity changes only with scene identity or content revision", () => {
  const first = geometryMeasurementKey("occurrence:a", 7);
  assert.equal(first, geometryMeasurementKey("occurrence:a", 7));
  assert.notEqual(first, geometryMeasurementKey("occurrence:a", 8));
  assert.notEqual(first, geometryMeasurementKey("occurrence:b", 7));
});

test("committed layout planning is deterministic and capped at three lanes by default", () => {
  const input = {
    viewport: { start: 0, end: 1_000 },
    occurrences: [
      { id: "a", start: 100, end: null },
      { id: "b", start: 130, end: null },
      { id: "c", start: 800, end: 900 },
    ],
    previous: {
      lanes: { a: 0, b: 1, c: 0 },
      clusters: [],
    },
    measurements: {
      a: { inlineSize: 120, blockSize: 52 },
      b: { inlineSize: 120, blockSize: 76 },
      c: { inlineSize: 160, blockSize: 52 },
    },
  };

  const first = planCommittedTemporalLayout(input);
  const second = planCommittedTemporalLayout(structuredClone(input));
  assert.deepEqual(second, first);
  assert.ok(Object.values(first.lanes).every((lane) => lane >= 0 && lane <= 2));
});

test("three nearby occurrences use lanes before a fourth forces clustering", () => {
  const common = {
    viewport: { start: 0, end: 1_000 },
    pixelLength: 1_000,
    measurements: {
      a: { inlineSize: 120, blockSize: 52 },
      b: { inlineSize: 120, blockSize: 52 },
      c: { inlineSize: 120, blockSize: 52 },
      d: { inlineSize: 120, blockSize: 52 },
    },
  };
  const three = planCommittedTemporalLayout({
    ...common,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 130 },
      { id: "c", start: 160 },
    ],
  });
  assert.equal(three.clusters.length, 0);
  assert.equal(new Set(Object.values(three.lanes)).size, 3);

  const four = planCommittedTemporalLayout({
    ...common,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 130 },
      { id: "c", start: 160 },
      { id: "d", start: 190 },
    ],
  });
  assert.equal(four.clusters.length, 1);
  assert.deepEqual(four.clusters[0].itemIds, ["a", "b", "c", "d"]);
});

test("previous cluster membership survives inside exit hysteresis and splits beyond it", () => {
  const base = {
    viewport: { start: 0, end: 1_000 },
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 200 },
    ],
    previous: {
      lanes: { a: 0, b: 1 },
      clusters: [{ id: "cluster:a|b", itemIds: ["a", "b"] }],
    },
    clusterThresholds: { enterPx: 80, exitPx: 120 },
  };

  const retained = planCommittedTemporalLayout({ ...base, pixelLength: 1_000 });
  assert.equal(retained.clusters.length, 1);

  const split = planCommittedTemporalLayout({
    ...base,
    occurrences: [
      { id: "a", start: 100 },
      { id: "b", start: 300 },
    ],
    pixelLength: 1_000,
  });
  assert.equal(split.clusters.length, 0);
});

test("measured two-line height is preserved in placement geometry", () => {
  const plan = planCommittedTemporalLayout({
    viewport: { start: 0, end: 100 },
    occurrences: [{ id: "headline", start: 50 }],
    measurements: {
      headline: { inlineSize: 180, blockSize: 76 },
    },
  });
  assert.equal(plan.placements[0].blockSize, 76);
});

test("renderer performs global layout planning only through commit reconciliation", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const renderStart = source.indexOf("  render(): void {");
  const renderEnd = source.indexOf("  createRecord(", renderStart);
  const renderBody = source.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderBody, /planCommittedTemporalLayout/);

  const reconcileStart = source.indexOf("  reconcileCommittedLayout(): void {");
  const reconcileEnd = source.indexOf("  reconcileClusterScene(", reconcileStart);
  const reconcileBody = source.slice(reconcileStart, reconcileEnd);
  assert.match(reconcileBody, /planCommittedTemporalLayout/);

  const commitStart = source.indexOf("  commitInteraction(): void {");
  const commitEnd = source.indexOf("  scheduleRender(", commitStart);
  const commitBody = source.slice(commitStart, commitEnd);
  assert.match(commitBody, /measureCommittedGeometry\(\)/);
  assert.match(commitBody, /reconcileCommittedLayout\(\)/);
});

test("renderer aligns cards with padded temporal coordinates and defers geometry replanning while interacting", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /padding \+ scale\.coordinateFor\(time, this\.viewport, usable\)/);
  assert.match(source, /positionRecord\(record, padding, usable, axisCross, crossLength\)/);
  assert.doesNotMatch(
    source,
    /positionRecord[\s\S]{0,1800}this\.surface\.getBoundingClientRect\(\)/,
  );
  assert.match(source, /geometryObserver: ResizeObserver \| null/);
  assert.match(source, /this\.geometryObserver\?\.observe\(terminal\)/);
  assert.match(
    source,
    /if \(this\.retention\.active\)[\s\S]{0,220}this\.geometryReflowPending = true/,
  );
});

test("committed clusters keep occurrence DOM alive and restore mature tile affordance", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  assert.match(source, /clusterScene = new Map<string, ClusterSceneRecord>/);
  assert.match(source, /timeline-cluster-tiles/);
  assert.match(source, /timeline-cluster-tile/);
  assert.match(source, /timeline-cluster-image/);
  assert.match(source, /expandedClusterItemIds/);
  assert.match(source, /clustering\.clusterExpansionViewport/);
  assert.match(source, /node\.hidden = hiddenByCluster/);
  assert.doesNotMatch(source, /hiddenByCluster[\s\S]{0,300}removeRecord/);
});

test("clustering follows measured collision pressure rather than nearby event count", () => {
  const occurrences = [
    { id: "a", start: 100 },
    { id: "b", start: 130 },
    { id: "c", start: 160 },
    { id: "d", start: 190 },
  ];
  const narrowMeasurements = Object.fromEntries(
    occurrences.map(({ id }) => [id, { inlineSize: 20, blockSize: 52 }]),
  );
  const wideMeasurements = Object.fromEntries(
    occurrences.map(({ id }) => [id, { inlineSize: 120, blockSize: 52 }]),
  );
  const common = {
    viewport: { start: 0, end: 1_000 },
    occurrences,
    pixelLength: 1_000,
    maxLanes: 3,
    laneGapPx: 16,
    clusterThresholds: { enterPx: 80, exitPx: 120 },
  };

  const narrow = planCommittedTemporalLayout({
    ...common,
    measurements: narrowMeasurements,
  });
  assert.equal(narrow.clusters.length, 0);

  const wide = planCommittedTemporalLayout({
    ...common,
    measurements: wideMeasurements,
  });
  assert.equal(wide.clusters.length, 1);
  assert.deepEqual(wide.clusters[0].itemIds, ["a", "b", "c", "d"]);
});

test("coincident timestamps stay separate and gain enough perpendicular lanes", () => {
  const occurrences = [
    { id: "a", start: 500 },
    { id: "b", start: 500 },
    { id: "c", start: 500 },
    { id: "d", start: 500 },
  ];
  const plan = planCommittedTemporalLayout({
    viewport: { start: 0, end: 1_000 },
    occurrences,
    pixelLength: 1_000,
    maxLanes: 3,
    measurements: Object.fromEntries(
      occurrences.map(({ id }) => [id, { inlineSize: 120, blockSize: 52 }]),
    ),
  });

  assert.equal(plan.clusters.length, 0);
  assert.equal(new Set(Object.values(plan.lanes)).size, 4);
});

test("timeline event cards pack inward on measured one-sided lanes", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  const laneStart = source.indexOf("  laneIndexFor(");
  const laneEnd = source.indexOf("  installGeometryObserver(", laneStart);
  const laneBody = source.slice(laneStart, laneEnd);
  assert.match(laneBody, /return -\(this\.laneIndexFor\(item\) \+ 1\)/);
  assert.match(laneBody, /committedLaneCrossOffsets/);
  assert.match(laneBody, /TIMELINE_CARD_DEFAULT_CROSS_SIZE_PX/);

  const reconcileStart = source.indexOf("  reconcileCommittedLayout(): void {");
  const reconcileEnd = source.indexOf("  reconcileClusterScene(", reconcileStart);
  const reconcileBody = source.slice(reconcileStart, reconcileEnd);
  assert.match(reconcileBody, /planLaneCrossOffsets\(crossAxisPlacements/);
  assert.match(reconcileBody, /routingSlackPx: TIMELINE_CARD_ROUTING_SLACK_PX/);

  const positionStart = source.indexOf("  positionRecord(");
  const positionEnd = source.indexOf("  animateEntry(", positionStart);
  const positionBody = source.slice(positionStart, positionEnd);
  assert.match(positionBody, /const terminalCross = axisCross - laneDistance/);
  assert.match(positionBody, /const laneDistance = this\.crossDistanceForLaneIndex\(laneIndex\)/);
  assert.match(positionBody, /this\.orientation === "horizontal"[\s\S]*: true;/);
  assert.doesNotMatch(positionBody, /axisCross \+ \(lane < 0/);

  const clusterStart = source.indexOf("  positionCommittedClusters(");
  const clusterEnd = source.indexOf("  activateCommittedCluster(", clusterStart);
  const clusterBody = source.slice(clusterStart, clusterEnd);
  assert.match(clusterBody, /const terminalCross = axisCross - laneDistance/);
  assert.match(clusterBody, /this\.orientation === "horizontal"[\s\S]*: true;/);
});

test("timeline interaction uses one padded coordinate system and direct pointer tracking", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  const wheelStart = source.indexOf('    this.surface.addEventListener(\n      "wheel"');
  const wheelEnd = source.indexOf("    const releasePointerCapture", wheelStart);
  const wheelBody = source.slice(wheelStart, wheelEnd);
  assert.match(wheelBody, /const padding = this\.axisPadding\(length\)/);
  assert.match(wheelBody, /const usable = Math\.max\(1, length - padding \* 2\)/);
  assert.match(wheelBody, /clamp\(\(primary - padding\) \/ usable, 0, 1\)/);

  const dragStart = source.indexOf('    this.surface.addEventListener("pointermove"');
  const dragEnd = source.indexOf("    const finishPointer", dragStart);
  const dragBody = source.slice(dragStart, dragEnd);
  assert.match(dragBody, /this\.viewport = target/);
  assert.doesNotMatch(dragBody, /responseForElapsed/);

  const positionStart = source.indexOf("  positionRecord(");
  const positionEnd = source.indexOf("  animateEntry(", positionStart);
  const positionBody = source.slice(positionStart, positionEnd);
  assert.match(positionBody, /padding \+ scale\.coordinateFor\(time, this\.viewport, usable\)/);
  assert.doesNotMatch(positionBody, /getBoundingClientRect/);
});

test("timeline caches tick labels instead of querying descendants every frame", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /tickLabelScene = new Map<string, HTMLSpanElement>\(\)/);

  const materializeStart = source.indexOf("  materializeTickHierarchy(");
  const materializeEnd = source.indexOf("  materializeTemporalAccents(", materializeStart);
  const materializeBody = source.slice(materializeStart, materializeEnd);
  assert.match(materializeBody, /let label = this\.tickLabelScene\.get\(key\)/);
  assert.match(materializeBody, /this\.tickLabelScene\.set\(key, label\)/);
  assert.doesNotMatch(materializeBody, /querySelector/);

  const collisionStart = source.indexOf("  resolveTickLabelCollisions(");
  const collisionEnd = source.indexOf("  retainedObjectCount(", collisionStart);
  const collisionBody = source.slice(collisionStart, collisionEnd);
  assert.match(collisionBody, /const label = this\.tickLabelScene\.get\(key\)/);
  assert.doesNotMatch(collisionBody, /querySelector/);

  assert.match(source, /this\.tickLabelScene\.clear\(\)/);
  assert.match(source, /this\.tickLabelScene\.delete\(key\)/);
});

test("timeline keeps one semantic date hierarchy during an active zoom gesture", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const start = source.indexOf("  renderTemporalContext(");
  const end = source.indexOf("  relationshipBandLane(", start);
  const body = source.slice(start, end);

  assert.match(body, /const incomingHierarchy = false/);
  assert.match(body, /selected hierarchy becomes authoritative on commit/);
});

test("timeline edge date context keeps retained slots and rolls changed digits in place", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  const materializeStart = source.indexOf("  materializeTemporalAccents(");
  const materializeEnd = source.indexOf("  renderTemporalContext(", materializeStart);
  const materializeBody = source.slice(materializeStart, materializeEnd);
  assert.match(materializeBody, /edge-slot:\$\{slot\}/);
  assert.match(materializeBody, /updateEdgeAccentLabel/);
  assert.match(materializeBody, /timeline-edge-date/);

  const updateStart = source.indexOf("  updateEdgeAccentLabel(");
  const updateEnd = source.indexOf("  materializeTickHierarchy(", updateStart);
  const updateBody = source.slice(updateStart, updateEnd);
  assert.match(updateBody, /timeline-edge-date-character/);
  assert.match(updateBody, /slot\.animate/);
  assert.doesNotMatch(updateBody, /replaceChildren/);
});

test("timeline retains obsolete edge-year slots during gestures, suppresses overlap, and cleans them on commit", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const materializeStart = source.indexOf("  materializeTemporalAccents(");
  const renderStart = source.indexOf("  renderTemporalContext(", materializeStart);
  const materializeBody = source.slice(materializeStart, renderStart);
  const renderEnd = source.indexOf("  relationshipBandLane(", renderStart);
  const renderBody = source.slice(renderStart, renderEnd);

  assert.match(
    materializeBody,
    /selectEdgeAccents\([\s\S]*accentPlan\.edgeAccents,[\s\S]*edgeAccentLimit,[\s\S]*this\.orientation,[\s\S]*this\.edgeAccentCount/,
  );
  assert.match(materializeBody, /const boundedEdgeAccents =/);
  assert.match(materializeBody, /this\.edgeAccentCount = boundedEdgeAccents\.length/);
  assert.match(materializeBody, /boundedEdgeAccents\.forEach/);
  assert.doesNotMatch(materializeBody, /accentPlan\.edgeAccents\.forEach/);
  assert.match(materializeBody, /node\.hidden = false/);
  assert.match(materializeBody, /dataset\.edgeDateCount = String\(boundedEdgeAccents\.length\)/);

  const helperStart = source.indexOf("function selectEdgeAccents");
  const helperEnd = source.indexOf("function itemOverlapsViewport", helperStart);
  const helperBody = source.slice(helperStart, helperEnd);
  assert.match(helperBody, /EDGE_ACCENT_HORIZONTAL_MIN_GAP_PX/);
  assert.match(helperBody, /EDGE_ACCENT_VERTICAL_MIN_GAP_PX/);
  assert.match(helperBody, /EDGE_ACCENT_HYSTERESIS_PX/);
  assert.match(helperBody, /previousCount >= 2/);
  assert.match(helperBody, /const projectedGap = Math\.abs/);
  assert.match(helperBody, /const requiredGap =/);
  assert.match(helperBody, /selected = \[first\]/);

  assert.match(renderBody, /minimumEdgeAccents:\s*this\.retention\.active \? 2 : 1/);
  assert.match(renderBody, /this\.retention\.active \? 2 : 1/);
  assert.match(
    renderBody,
    /if \(!key\.startsWith\("edge-slot:"\) \|\| keepAccents\.has\(key\)\) continue;/,
  );
  assert.match(renderBody, /if \(this\.retention\.active\) \{/);
  assert.match(
    renderBody,
    /for \(const animation of node\.getAnimations\(\)\) animation\.cancel\(\);[\s\S]*node\.hidden = true/,
  );
  const interactionCleanupStart = renderBody.indexOf("if (this.retention.active)");
  const committedCleanupStart = renderBody.indexOf(
    "if (!this.retention.active)",
    interactionCleanupStart,
  );
  const interactionCleanup = renderBody.slice(interactionCleanupStart, committedCleanupStart);
  assert.doesNotMatch(interactionCleanup, /accentScene\.delete/);
  assert.doesNotMatch(interactionCleanup, /node\.remove\(\)/);
  assert.match(
    renderBody,
    /resolveTickLabelCollisions[\s\S]*if \(this\.retention\.active\)[\s\S]*if \(!this\.retention\.active\) \{/,
  );
  assert.match(
    renderBody,
    /if \(key\.startsWith\("edge-slot:"\) \|\| hierarchyChangedOnCommit\) node\.remove\(\);/,
  );
});

test("tick collision packing keeps offscreen retained ticks in the phase calculation", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const start = source.indexOf("  resolveTickLabelCollisions(");
  const end = source.indexOf("  retainedObjectCount(", start);
  const body = source.slice(start, end);

  assert.match(body, /inViewport: boolean/);
  assert.match(body, /inViewport: position >= minimum && position <= maximum/);
  assert.match(body, /const start = candidate\.position - candidate\.extent \/ 2/);
  assert.match(body, /const end = candidate\.position \+ candidate\.extent \/ 2/);
  assert.match(body, /candidate\.label\.hidden = !collisionVisible \|\| !candidate\.inViewport/);
  assert.match(body, /if \(collisionVisible\) lastEnd = end/);
  assert.doesNotMatch(body, /position < minimum \|\| position > maximum/);
  assert.doesNotMatch(body, /Math\.max\(minimum/);
  assert.doesNotMatch(body, /Math\.min\(maximum/);
});

test("portrait edge dates live on the outer rail rather than beside the timeline axis", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /\.is-portrait \.timeline-edge-date\s*\{[^}]*inset-inline-end:\s*8px/s);
  assert.match(css, /\.is-portrait \.timeline-edge-date\s*\{[^}]*inset-inline-start:\s*auto/s);
  assert.match(css, /\.is-portrait \.timeline-edge-date\s*\{[^}]*writing-mode:\s*vertical-rl/s);
});
