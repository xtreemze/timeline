import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/temporal-standards.js");
await import("../site/timeline-clustering.js");
await import("../site/timeline-motion.js");
await import("../site/timeline-graph.js");

const clustering = globalThis.TimelineClustering;
const motion = globalThis.TimelineMotion;
const graph = globalThis.TimelineGraph;

test("clusters projected events only after their rendered positions overlap", () => {
  const items = [
    { id: "a", start: 1 },
    { id: "b", start: 2 },
    { id: "c", start: 3 },
    { id: "d", start: 4 }
  ];
  const positions = new Map([["a", 10], ["b", 70], ["c", 145], ["d", 420]]);
  const result = clustering.clusterProjectedItems(items, (item) => positions.get(item.id), 100);
  assert.equal(result.length, 2);
  assert.equal(result[0].kind, "cluster");
  assert.deepEqual(result[0].items.map((item) => item.id), ["a", "b", "c"]);
  assert.equal(result[1].kind, "item");
});

test("events less than 50 ms apart separate after zoom without temporal drift", async () => {
  await import("../site/time-scale.js");
  const scale = globalThis.TimelineScale;
  const events = [
    { id: "a", start: 1_000 },
    { id: "b", start: 1_030 }
  ];
  const overview = { start: 0, end: 10_000 };
  const detail = scale.zoom(overview, 0.01, 1_015, 1);
  const overviewPositions = events.map((item) => scale.coordinateFor(item.start, overview, 1000));
  const detailPositions = events.map((item) => scale.coordinateFor(item.start, detail, 1000));

  assert.ok(Math.abs(overviewPositions[1] - overviewPositions[0]) < 10);
  assert.ok(Math.abs(detailPositions[1] - detailPositions[0]) > 100);
  const detailAnchorRatio = (1_015 - detail.start) / (detail.end - detail.start);
  const overviewAnchorRatio = (1_015 - overview.start) / (overview.end - overview.start);
  assert.ok(Math.abs(detailAnchorRatio - overviewAnchorRatio) < 1e-12);
});

test("timeline exposes distinct fit-visible and fit-all commands", async () => {
  const [viewSource, htmlSource, appSource] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);

  assert.match(htmlSource, /id="timeline-fit"[^>]*>Fit visible<\/button>/);
  assert.match(htmlSource, /id="timeline-fit-all"[^>]*>Fit all<\/button>/);
  assert.match(viewSource, /fitVisible\(\)/);
  assert.match(viewSource, /fitAll\(\)/);
  assert.match(viewSource, /event\.shiftKey\) this\.fitAll\(\)/);
  assert.match(appSource, /allCoordinates:\s*allTimelineCoordinates/);
});

test("browse exposes focusable stories before collapsed focusable categories", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(html, /id="browser-story-list"[\s\S]*id="timeline-list"/);
  assert.match(app, /function renderBrowserStories\([\s\S]*browser-story-card[\s\S]*focus-story/);
  assert.match(app, /collapsedCategoryIds:\s*new Set\(state\.categories\.map/);
  assert.match(app, /actionButton\("Focus", "focus-category"/);
  assert.match(app, /function focusCategory\([\s\S]*categoryFilter = id[\s\S]*fitVisible/);
  assert.match(css, /\.browser-story-card/);
  assert.match(css, /\.timeline-category-focus/);
  assert.match(css, /\.timeline-category-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.doesNotMatch(css, /\.timeline-category-focus\s*\{[\s\S]{0,160}position:\s*absolute/);
});

test("month accents are emitted only for months containing up to three visible segments", () => {
  const time = (month, day) => Date.UTC(2026, month - 1, day);
  const accents = clustering.monthAccents([
    { id: "a", start: time(9, 1) },
    { id: "b", start: time(9, 10) },
    { id: "c", start: time(9, 20) },
    { id: "d", start: time(10, 1) },
    { id: "e", start: time(10, 2) },
    { id: "f", start: time(10, 3) },
    { id: "g", start: time(10, 4) }
  ]);
  assert.deepEqual(accents.map((accent) => accent.label), ["SEP 2026"]);
  assert.equal(accents[0].count, 3);
});

test("ambient month labels allow compact day tick numbering", () => {
  assert.equal(
    clustering.compactTickLabel(Date.UTC(2026, 8, 19), { unit: "day", step: 1 }, true),
    "19"
  );
  assert.equal(
    clustering.compactTickLabel(Date.UTC(2026, 8, 19, 14), { unit: "hour", step: 1 }, true),
    "14:00"
  );
});

test("temporal context progressively sheds detail as zoom broadens", () => {
  const eventTime = Date.UTC(1000, 4, 5, 14, 30);
  const items = [
    { id: "a", start: eventTime },
    { id: "b", start: eventTime + 30 * 60_000 }
  ];
  const base = {
    pixelLength: 1200,
    padding: 40,
    orientation: "horizontal",
    maxItemsPerMonth: 3,
    limit: 18
  };

  const hourPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 4, 5, 14, 0),
      end: Date.UTC(1000, 4, 5, 16, 0)
    },
    spec: { unit: "minute", step: 5 }
  });
  assert.equal(hourPlan.mode, "day-month-year-edge");
  assert.deepEqual(hourPlan.edgeAccents.map((accent) => accent.label), ["MAY 5, 1000"]);

  const dayPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 4, 1),
      end: Date.UTC(1000, 4, 31)
    },
    spec: { unit: "day", step: 2 }
  });
  assert.equal(dayPlan.mode, "month-year-edge");
  assert.deepEqual(dayPlan.edgeAccents.map((accent) => accent.label), ["MAY 1000"]);

  const monthPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 0, 1),
      end: Date.UTC(1001, 0, 1)
    },
    spec: { unit: "month", step: 1 }
  });
  assert.equal(monthPlan.mode, "year-edge-month-axis");
  assert.deepEqual(monthPlan.edgeAccents.map((accent) => accent.label), ["1000"]);
  assert.deepEqual(monthPlan.axisMonths.map((accent) => accent.label), ["MAY"]);

  const yearPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(995, 0, 1),
      end: Date.UTC(1005, 0, 1)
    },
    spec: { unit: "year", step: 1 }
  });
  assert.equal(yearPlan.mode, "axis-only");
  assert.deepEqual(yearPlan.edgeAccents, []);
});

test("temporal accent planner keeps full month-year accents only when they cannot overlap", () => {
  const items = [
    { id: "a", start: Date.UTC(2026, 0, 12) },
    { id: "b", start: Date.UTC(2026, 6, 12) }
  ];
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(2026, 0, 1), end: Date.UTC(2027, 0, 1) },
    pixelLength: 1200,
    padding: 40,
    orientation: "horizontal",
    spec: { unit: "day", step: 1 }
  });
  assert.equal(plan.mode, "month-year-edge");
  assert.equal(plan.edgeAccents.length, 2);
  assert.equal(plan.axisMonths.length, 0);
});

test("overlapping month-year accents collapse to year on the edge and month on the axis", () => {
  const items = [
    { id: "a", start: Date.UTC(2026, 7, 2) },
    { id: "b", start: Date.UTC(2026, 8, 2) },
    { id: "c", start: Date.UTC(2026, 9, 2) }
  ];
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 10, 1) },
    pixelLength: 420,
    padding: 30,
    orientation: "horizontal",
    spec: { unit: "day", step: 2 }
  });
  assert.equal(plan.mode, "year-edge-month-axis");
  assert.deepEqual(plan.edgeAccents.map((accent) => accent.label), ["2026"]);
  assert.ok(plan.axisMonths.length >= 2);
  assert.ok(plan.axisMonths.every((accent) => /^[A-Z]{3}$/.test(accent.label)));
});

test("year-scale views keep temporal context on the normal axis instead of ambient accents", () => {
  const plan = clustering.planTemporalAccents([
    { id: "a", start: Date.UTC(2018, 1, 1) },
    { id: "b", start: Date.UTC(2026, 8, 1) }
  ], {
    viewport: { start: Date.UTC(2010, 0, 1), end: Date.UTC(2030, 0, 1) },
    pixelLength: 900,
    padding: 40,
    orientation: "vertical",
    spec: { unit: "year", step: 2 }
  });
  assert.equal(plan.mode, "axis-only");
  assert.equal(plan.edgeAccents.length, 0);
  assert.equal(plan.axisMonths.length, 0);
});

test("focused clustered event zooms toward a unique projected position", () => {
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 10 },
      { id: "c", start: 1000 }
    ],
    "a",
    { start: 0, end: 100 },
    500,
    100
  );
  assert.equal(plan.mode, "separate");
  assert.ok(plan.viewport.end - plan.viewport.start < 100);
  assert.equal(plan.forceUnique, false);
});


test("cluster activation viewport keeps every member visible and separates ordinary dense clusters", () => {
  const items = [
    { id: "a", start: 100 },
    { id: "b", start: 120 },
    { id: "c", start: 145 }
  ];
  const plan = clustering.clusterExpansionViewport(
    items,
    { start: 0, end: 1000 },
    900,
    156
  );
  assert.ok(plan);
  assert.ok(plan.viewport.start < 100);
  assert.ok(plan.viewport.end > 145);
  assert.ok(plan.viewport.end - plan.viewport.start < 1000);

  const positions = new Map(items.map((item) => [
    item.id,
    ((item.start - plan.viewport.start) / (plan.viewport.end - plan.viewport.start)) * 900
  ]));
  const representations = clustering.clusterProjectedItems(
    items,
    (item) => positions.get(item.id),
    156
  );
  assert.ok(representations.every((representation) => representation.kind === "item"));
  assert.equal(plan.forceExpanded, false);
});

test("cluster activation marks impossible all-visible temporal separation for lane expansion fallback", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `dense-${index}`,
    start: 100 + index
  }));
  const plan = clustering.clusterExpansionViewport(
    items,
    { start: 0, end: 1000 },
    600,
    156
  );
  assert.ok(plan.viewport.start < items[0].start);
  assert.ok(plan.viewport.end > items.at(-1).start);
  assert.equal(plan.forceExpanded, true);
});

test("focused event expands to include nearby relative context when already unique", () => {
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 500 },
      { id: "c", start: 1000 }
    ],
    "b",
    { start: 450, end: 550 },
    700,
    100
  );
  assert.equal(plan.mode, "context");
  assert.deepEqual(new Set(plan.contextIds), new Set(["a", "c"]));
  assert.ok(plan.viewport.start <= 0);
  assert.ok(plan.viewport.end >= 1000);
});

test("coincident events remain separate representations and use layout lanes instead of impossible zoom separation", () => {
  const items = [
    { id: "a", start: 100 },
    { id: "b", start: 100 },
    { id: "c", start: 500 }
  ];
  const positions = new Map([["a", 50], ["b", 50], ["c", 500]]);
  const representations = clustering.clusterProjectedItems(
    items,
    (item) => positions.get(item.id),
    100
  );
  assert.deepEqual(
    representations.slice(0, 2).map((entry) => [entry.kind, entry.id]),
    [["item", "a"], ["item", "b"]]
  );

  const plan = clustering.focusContextViewport(
    items,
    "a",
    { start: 50, end: 250 },
    500,
    100
  );
  assert.equal(plan.mode, "coincident");
  assert.deepEqual(plan.viewport, { start: 50, end: 250 });
  assert.deepEqual(plan.contextIds, ["b"]);
  assert.equal(plan.forceUnique, false);
});

test("motion response and inertial decay are smooth and monotonic", () => {
  const response = motion.responseForElapsed(16);
  assert.ok(response > 0 && response < 1);
  const v1 = motion.decayVelocity(1, 16);
  const v2 = motion.decayVelocity(v1, 16);
  assert.ok(v1 < 1 && v2 < v1 && v2 > 0);
});

test("pointer velocity uses recent samples and clamps extreme release speed", () => {
  const velocity = motion.estimatePointerVelocity([
    { coordinate: 0, time: 0 },
    { coordinate: 60, time: 30 },
    { coordinate: 150, time: 60 }
  ]);
  assert.ok(velocity > 0);
  assert.ok(velocity <= 3.2);
});

test("Orb adapter preserves temporal relationship metadata", () => {
  const normalized = graph.normalizeGraphData({
    entities: [
      {
        id: "person-a",
        type: "person",
        name: "A",
        alternateNames: ["Alias A", "Alias A", "Former A"],
        identifiers: [{ scheme: "case-id", value: "P-17" }],
        sourceIds: ["evidence-17", "evidence-17", "source-record-3"]
      },
      { id: "person-b", type: "person", name: "B" }
    ],
    relationships: [{
      id: "rel-1",
      subjectId: "person-a",
      objectId: "person-b",
      predicate: "workedWith",
      sourceIds: ["evidence-rel-1", "evidence-rel-1", "source-rel-2"],
      confidence: 0.82,
      time: {
        type: "interval",
        start: { value: "2026-09-01", precision: "day", certainty: "exact", calendar: "gregorian" },
        end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" }
      }
    }]
  });

  const orb = graph.toOrbGraph(normalized);
  assert.equal(orb.nodes.length, 2);
  assert.deepEqual(normalized.entities[0].alternateNames, ["Alias A", "Former A"]);
  assert.deepEqual(normalized.entities[0].sourceIds, ["evidence-17", "source-record-3"]);
  assert.deepEqual(orb.nodes[0].properties.alternateNames, ["Alias A", "Former A"]);
  assert.deepEqual(orb.nodes[0].properties.sourceIds, ["evidence-17", "source-record-3"]);
  assert.equal(orb.edges[0].start, "person-a");
  assert.equal(orb.edges[0].end, "person-b");
  assert.deepEqual(normalized.relationships[0].sourceIds, ["evidence-rel-1", "source-rel-2"]);
  assert.equal(normalized.relationships[0].confidence, 0.82);
  assert.deepEqual(orb.edges[0].properties.sourceIds, ["evidence-rel-1", "source-rel-2"]);
  assert.equal(orb.edges[0].properties.confidence, 0.82);
  assert.equal(orb.edges[0].properties.time.type, "interval");

  const projected = graph.temporalRelationProjection(normalized.relationships);
  assert.equal(projected.length, 1);
  assert.ok(projected[0].end > projected[0].start);
});

test("Orb adapter can expose stories as graph nodes for group-to-story relations", () => {
  const orb = graph.toOrbGraph({
    entities: [{ id: "group-a", type: "group", name: "Group A" }],
    stories: [{ id: "story-a", title: "Story A", description: "", itemIds: ["event-a"] }],
    items: [{ id: "event-a", title: "Event A", kind: "event" }],
    relationships: [{ id: "edge-a", subjectId: "group-a", objectId: "story-a", predicate: "participatesIn" }]
  });
  assert.ok(orb.nodes.some((node) => node.id === "story-a" && node.properties.timelineType === "story"));
  assert.ok(orb.edges.some((edge) => edge.start === "group-a" && edge.end === "story-a"));
});

test("timeline CSS uses Monaspace texture healing and metric-aware text trimming", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /Monaspace Krypton/);
  assert.match(css, /"calt"\s+1/);
  assert.match(css, /font-size-adjust:\s*ex-height from-font/);
  assert.match(css, /text-box:\s*trim-both ex alphabetic/);
  assert.match(css, /grid-template-columns:\s*repeat\(6,/);
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(12,/);
});

test("app delegates temporal parsing to TimelineTemporal rather than removed legacy parser constants", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /temporal\.parse\(value\)/);
  assert.doesNotMatch(source, /DATE_PATTERN/);
  assert.match(source, /temporalRelationProjection\(state\.relationships/);
});

test("cluster activation selects a represented event, expands every member, and preserves the cluster as transition origin", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /data-cluster-item-id/);
  assert.match(source, /activateCluster\(cluster, selectedId, button\)/);
  assert.match(source, /clusterExpansionViewport/);
  assert.match(source, /expandedClusterItemIds/);
  assert.match(source, /options\.transitionOrigin \|\| this\.focusTransitionOrigin\(id\)/);
});

test("timeline view exposes fused clusters, inertia, relation bands and ambient months", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /clusterProjectedItems/);
  assert.match(source, /startInertia/);
  assert.match(source, /renderTemporalAccents/);
  assert.match(source, /planTemporalAccents/);
  assert.match(source, /renderRelationships/);
  assert.match(source, /focusContextViewport/);
  assert.match(source, /timelineviewportchange/);
  assert.match(source, /pulseHaptic/);
});


test("timeline terminals use media thumbnails, semantic badges, and earlier clustering for distance legibility", async () => {
  const [viewSource, styles] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(viewSource, /HORIZONTAL_CLUSTER_THRESHOLD_MIN = 156/);
  assert.match(viewSource, /VERTICAL_CLUSTER_THRESHOLD = 74/);
  assert.match(viewSource, /timeline-event-art-image/);
  assert.match(viewSource, /timeline-event-icon-badge/);
  assert.match(viewSource, /timeline-cluster-tiles/);
  assert.match(viewSource, /timeline-cluster-image/);
  assert.match(viewSource, /timeline-cluster-icon-badge/);
  assert.match(styles, /\.timeline-event-art\s*\{/);
  assert.match(styles, /\.timeline-cluster-tile\s*\{/);
  assert.match(styles, /height:\s*10px/);
  assert.match(styles, /width:\s*2\.75rem/);
  assert.match(styles, /max-width:\s*232px/);
});


test("event editor persists configurable terminal and connector presentation into timeline rendering", async () => {
  const [html, app, view, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.ok(html.includes('id="item-terminal-shape"'));
  assert.ok(html.includes('<option value="diamond">Diamond</option>'));
  assert.ok(html.includes('id="item-connector-style"'));
  assert.ok(html.includes('<option value="dotted">Dotted</option>'));
  assert.ok(html.includes('id="item-connector-weight"'));
  assert.ok(html.includes('<option value="strong">Strong</option>'));
  assert.ok(html.includes('id="item-connector-endpoint"'));
  assert.ok(html.includes('<option value="arrow">Arrow</option>'));
  assert.ok(app.includes('terminalShape: els.itemTerminalShape.value'));
  assert.ok(app.includes('connectorStyle: els.itemConnectorStyle.value'));
  assert.ok(app.includes('connectorWeight: els.itemConnectorWeight.value'));
  assert.ok(app.includes('connectorEndpoint: els.itemConnectorEndpoint.value'));
  assert.ok(app.includes('terminalShape: item.presentation?.terminalShape || "rounded"'));
  assert.ok(app.includes('connectorStyle: item.presentation?.connectorStyle || "solid"'));
  assert.ok(app.includes('connectorWeight: item.presentation?.connectorWeight || "normal"'));
  assert.ok(app.includes('connectorEndpoint: item.presentation?.connectorEndpoint || "none"'));
  assert.ok(view.includes('node.dataset.terminalShape = item.terminalShape || "rounded"'));
  assert.ok(view.includes('node.dataset.connectorStyle = item.connectorStyle || "solid"'));
  assert.ok(view.includes('node.dataset.connectorWeight = item.connectorWeight || "normal"'));
  assert.ok(view.includes('node.dataset.connectorEndpoint = item.connectorEndpoint || "none"'));
  assert.ok(view.includes('node.style.setProperty("--connector-thickness"'));
  assert.ok(styles.includes('.timeline-event[data-terminal-shape="diamond"] .timeline-event-dot'));
  assert.ok(styles.includes('.timeline-event[data-connector-style="dashed"] .timeline-event-connector'));
  assert.ok(styles.includes('.timeline-event[data-connector-style="dotted"] .timeline-event-connector'));
  assert.ok(styles.includes('.timeline-event[data-connector-endpoint="dot"] .timeline-event-connector::after'));
  assert.ok(styles.includes('.timeline-event[data-connector-endpoint="arrow"] .timeline-event-connector::after'));
});


test("timeline view assigns unbounded perpendicular lanes so coincident terminals do not reuse positions", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /allocateEventLane\(position, occupied, minDistance = 236\)/);
  assert.match(source, /occupied\.push\(position\)/);
  assert.match(source, /const depth = focused \? lane : Math\.floor\(lane \/ 2\)/);
  assert.match(source, /const laneIndex = this\.allocateEventLane\(position, occupied, 78\)/);
});


test("keeps chronological event order available as a semantic keyboard-accessible fallback", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);

  assert.match(html, /id="timeline-browser-sheet"[\s\S]*id="timeline-list" class="timeline-list" aria-live="polite"/);
  assert.match(app, /function sortItems\([\s\S]*parseDate\(a\.start\)[\s\S]*a\.title\.localeCompare\(b\.title\)/);
  assert.match(app, /function getVisibleItems\([\s\S]*items = sortItems\(\)/);
  assert.match(app, /function renderTimelineList\([\s\S]*document\.createElement\("ol"\)[\s\S]*items\.map\(\(item\) => renderItem\(item, null\)\)/);
  assert.match(app, /function renderItem\([\s\S]*document\.createElement\("li"\)[\s\S]*actionButton\("Focus", "focus-item"/);
});


test("timeline pinch zoom tracks two touch pointers and keeps the temporal anchor under the gesture midpoint", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /this\.touchPointers = new Map\(\)/);
  assert.match(source, /this\.pinch = null/);
  assert.match(source, /Math\.hypot\(second\.x - first\.x, second\.y - first\.y\)/);
  assert.match(source, /anchorTime:\s*this\.viewport\.start \+ span \* geometry\.ratio/);
  assert.match(source, /this\.pinch\.distance \/ geometry\.distance/);
  assert.match(source, /scale\.zoom\([\s\S]*this\.pinch\.viewport,[\s\S]*factor,[\s\S]*this\.pinch\.anchorTime,[\s\S]*MIN_SPAN_MS/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /const remaining = Array\.from\(this\.touchPointers\.values\(\)\)\[0\]/);
});
