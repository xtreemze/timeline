import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/temporal-standards.js");
await import("../site/timeline-clustering.js");
await import("../site/timeline-motion.js");
await import("../site/spatial.js");
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

test("timeline exposes semantic zoom while retaining keyboard fit commands", async () => {
  const [viewSource, htmlSource, appSource] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);

  assert.match(htmlSource, /id="timeline-zoom-level"[^>]*type="range"[^>]*min="0"[^>]*max="100"[^>]*value="100"[^>]*aria-valuetext="Focused event only"/);
  assert.match(htmlSource, /Context[\s\S]*Focus[\s\S]*Solo/);
  assert.match(
    viewSource,
    /ensureUsefulViewport\(\)[\s\S]*if \(!this\.viewport\)[\s\S]*semanticZoomTargets\(\)[\s\S]*targets\?\.isolated[\s\S]*zoomAnchorId = targets\.item[\s\S]*soloZoomActive = Boolean\(targets\.item\)/
  );
  assert.match(htmlSource, /id="timeline-orientation-toggle"[^>]*data-semantic-icon="portrait"/);
  assert.match(htmlSource, /id="presentation-fullscreen-toggle"[^>]*data-semantic-icon="fullscreen"/);
  assert.match(htmlSource, /id="timeline-auto-toggle"[^>]*data-semantic-icon="play"[^>]*aria-label="Play slideshow"/);
  assert.match(appSource, /setSemanticControlIcon\([\s\S]*playing \? "pause" : "play"[\s\S]*playing \? "Pause slideshow" : "Play slideshow"/);
  assert.match(viewSource, /setSemanticZoom\(value\)/);
  assert.match(viewSource, /semanticContextItems\(item\)/);
  assert.match(viewSource, /clearTemporalAccentFromProjectHeading\(label\)[\s\S]*getBoundingClientRect[\s\S]*avoids-project-heading/);
  assert.match(viewSource, /this\.orientation === "horizontal"[\s\S]*shiftRight[\s\S]*label\.style\.left[\s\S]*projectHeadingCollisionAxis = "inline"/);
  assert.doesNotMatch(viewSource, /this\.orientation === "horizontal"[\s\S]{0,220}headingRect\.height \+ gap/);
  assert.match(viewSource, /resizeObserver\.observe\(this\.projectHeading\)/);
  assert.match(viewSource, /while \(selected\.length < 2/);
  assert.match(viewSource, /this\.soloZoomActive = normalized >= 99/);
  assert.match(viewSource, /fitVisible\(\)/);
  assert.match(viewSource, /fitAll\(\)/);
  assert.match(viewSource, /event\.shiftKey\) this\.fitAll\(\)/);
  assert.match(appSource, /allCoordinates:\s*allTimelineCoordinates/);
});

test("time labels yield to year context while year overflow stays visible", async () => {
  const [viewSource, timelineCss, styles] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(
    viewSource,
    /resolveTemporalLabelCollisions\(stage\)[\s\S]*data-temporal-accent\*="year"[\s\S]*timeline-tick-label/
  );
  assert.match(
    viewSource,
    /yearCollision = "moved"[\s\S]*style\.bottom = "16px"[\s\S]*style\.right = "16px"/
  );
  assert.match(
    viewSource,
    /stillCollidesWithYear[\s\S]*collidesWithAxisContext[\s\S]*label\.hidden = true[\s\S]*yearCollision = "suppressed"/
  );
  assert.match(
    viewSource,
    /this\.resolveTemporalLabelCollisions\(stage\)[\s\S]*renderRelationships/
  );
  assert.match(
    viewSource,
    /canOverflowPrimaryEdge = \/year\/[\s\S]*!canOverflowPrimaryEdge/
  );
  assert.match(timelineCss, /\.timeline-view\s*\{[\s\S]{0,320}overflow:\s*visible/);
  assert.match(timelineCss, /\.timeline-surface\s*\{[\s\S]{0,240}overflow:\s*visible/);
  assert.match(timelineCss, /\.timeline-year-accent\s*\{[\s\S]{0,120}overflow:\s*visible/);
  assert.match(
    timelineCss,
    /#presentation-stage:fullscreen > \.timeline-view\s*\{[\s\S]{0,320}overflow:\s*visible/
  );
  assert.match(
    styles,
    /#app-shell #presentation-stage,[\s\S]*overflow:\s*hidden/
  );
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
  assert.equal(yearPlan.mode, "year-edge");
  assert.deepEqual(yearPlan.edgeAccents.map((accent) => accent.label), ["1000"]);
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

test("year-scale views retain an ambient year context in addition to axis ticks", () => {
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
  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(plan.edgeAccents.map((accent) => accent.label), ["2018", "2026"]);
  assert.equal(plan.axisMonths.length, 0);
  assert.equal(plan.hasAmbientContext, true);
});

test("year edge accents keep their projected edge positions instead of clamping inward", () => {
  const viewport = {
    start: Date.UTC(2010, 0, 1),
    end: Date.UTC(2020, 0, 1)
  };
  const plan = clustering.planTemporalAccents([
    { id: "start", start: viewport.start },
    { id: "end", start: viewport.end }
  ], {
    viewport,
    pixelLength: 600,
    padding: 40,
    orientation: "horizontal",
    spec: { unit: "year", step: 1 }
  });

  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(plan.edgeAccents.map((accent) => accent.position), [40, 640]);
});


test("dense same-year clusters still emit one ambient year label on narrow mobile timelines", () => {
  const items = Array.from({ length: 55 }, (_, index) => ({
    id: `event-${index}`,
    start: Date.UTC(1000, index % 12, 1 + (index % 27))
  }));
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(900, 0, 1), end: Date.UTC(1100, 0, 1) },
    pixelLength: 620,
    padding: 48,
    orientation: "horizontal",
    spec: { unit: "year", step: 50 }
  });
  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(plan.edgeAccents.map((accent) => accent.label), ["1000"]);
  assert.equal(plan.edgeAccents[0].count, 55);
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

test("focused event zooms into local context when already unique", () => {
  const viewport = { start: -500, end: 1500 };
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 500 },
      { id: "c", start: 1000 }
    ],
    "b",
    viewport,
    700,
    100
  );
  assert.equal(plan.mode, "context");
  assert.deepEqual(new Set(plan.contextIds), new Set(["a", "c"]));
  assert.ok(plan.viewport.end - plan.viewport.start < viewport.end - viewport.start);
  assert.ok(plan.viewport.start <= 500 && plan.viewport.end >= 500);
});

test("focused previous/next navigation preserves the established local scale", () => {
  const viewport = { start: -100, end: 1100 };
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 500 },
      { id: "c", start: 1000 }
    ],
    "b",
    viewport,
    700,
    100,
    { preserveScale: true }
  );
  assert.equal(plan.mode, "keep");
  assert.deepEqual(plan.viewport, viewport);
});

test("focused viewport never expands to include distant context", () => {
  const viewport = { start: -100, end: 100 };
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 5000 }
    ],
    "a",
    viewport,
    700,
    100
  );
  assert.ok(plan.viewport.end - plan.viewport.start <= viewport.end - viewport.start);
  assert.ok(plan.viewport.end - plan.viewport.start < viewport.end - viewport.start);
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

  const viewport = { start: -400, end: 600 };
  const plan = clustering.focusContextViewport(
    items,
    "a",
    viewport,
    500,
    100
  );
  assert.equal(plan.mode, "coincident");
  assert.ok(plan.viewport.end - plan.viewport.start < viewport.end - viewport.start);
  assert.ok(plan.contextIds.includes("b"));
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

test("Orb adapter preserves temporal and reusable-place relationship metadata", () => {
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
    places: [{
      id: "place-a",
      name: "Meeting Room",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      icon: "place",
      markerShape: "pin"
    }],
    relationships: [{
      id: "rel-1",
      subjectId: "person-a",
      objectId: "person-b",
      predicate: "workedWith",
      placeId: "place-a",
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
  assert.equal(orb.edges[0].properties.placeId, "place-a");
  assert.equal(normalized.places.length, 1);

  const projected = graph.temporalRelationProjection(normalized.relationships);
  assert.equal(projected.length, 1);
  assert.ok(projected[0].end > projected[0].start);
  assert.equal(projected[0].placeId, "place-a");
});

test("Orb adapter keeps chronology, stories, and places out of the canonical node graph", () => {
  const input = {
    entities: [
      { id: "person-a", type: "person", name: "Person A" },
      { id: "person-b", type: "person", name: "Person B" }
    ],
    places: [{
      id: "place-a",
      name: "Place A",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      icon: "place",
      markerShape: "pin"
    }],
    stories: [{ id: "story-a", title: "Story A", description: "", itemIds: ["event-a"] }],
    items: [{ id: "event-a", title: "Event A", kind: "event" }],
    relationships: [{
      id: "edge-a",
      subjectId: "person-a",
      objectId: "person-b",
      predicate: "travels",
      placeId: "place-a",
      itemIds: ["event-a"]
    }]
  };
  const normalized = graph.normalizeGraphData(input);
  const orb = graph.toOrbGraph({ ...input, ...normalized });
  assert.deepEqual(orb.nodes.map((node) => node.id).sort(), ["person-a", "person-b"]);
  assert.equal(orb.nodes.some((node) => node.id === "event-a" || node.id === "story-a" || node.id === "place-a"), false);
  assert.deepEqual(orb.edges[0].properties.itemIds, ["event-a"]);
  assert.equal(orb.edges[0].properties.placeId, "place-a");
});

test("graph semantics reject action nodes and generic association predicates", () => {
  assert.equal(graph.validateEntityNode({ name: "Payment", type: "transaction" }).valid, false);
  assert.deepEqual(
    graph.toOrbGraph({ entities: [{ id: "payment", name: "Payment", type: "transaction" }] }).nodes,
    [],
    "direct projection must not reintroduce action nodes"
  );
  assert.equal(graph.validateEntityNode({ name: "Alice", type: "person" }).valid, true);
  assert.equal(graph.validateEntityNode({ name: "Called Alice", type: "person" }).valid, false);
  assert.equal(graph.validateEntityNode({ name: "Stockholm", type: "place" }).valid, false);
  assert.equal(graph.validateEntityNode({ name: "Alice", type: "person", attributes: { location: "Stockholm" } }).valid, false);

  for (const predicate of ["participatesIn", "part of", "took part in", "memberOf", "relatedTo", "associatedWith", "metAt", "visitedNear", "searchedDuring", "transformsCircumstances", "seeksShelterWith", "revivesAfterLaces", "usesToAttack", "carriesForTest", "keepsVigilBeside"]) {
    assert.equal(graph.validateActionPredicate(predicate).valid, false, predicate);
  }
  for (const predicate of ["called", "warned", "built", "transferredTo", "authorized", "searchesFor", "dancesWith", "sendsForth"]) {
    assert.equal(graph.validateActionPredicate(predicate).valid, true, predicate);
  }

  const normalized = graph.normalizeGraphData({
    entities: [{ id: "person-a", type: "person", name: "A" }],
    places: [{ id: "known-place", name: "Known Place", geometry: { type: "Point", coordinates: [1, 1] } }],
    relationships: [
      { id: "generic", subjectId: "person-a", objectId: "person-a", predicate: "relatedTo" },
      { id: "event-endpoint", subjectId: "person-a", objectId: "event-a", predicate: "called" },
      { id: "unknown-place", subjectId: "person-a", objectId: "person-a", predicate: "called", placeId: "missing-place" }
    ]
  });
  assert.deepEqual(normalized.relationships, []);

  const selfLoopInput = {
    entities: [{ id: "person-a", type: "person", name: "A" }],
    places: [{ id: "known-place", name: "Known Place", geometry: { type: "Point", coordinates: [1, 1] } }],
    relationships: [{ id: "self-loop", subjectId: "person-a", objectId: "person-a", predicate: "called", placeId: "known-place" }]
  };
  assert.deepEqual(graph.normalizeGraphData(selfLoopInput).relationships, []);
  assert.deepEqual(graph.toOrbGraph(selfLoopInput).edges, []);
  assert.ok(graph.validateGraphInput(selfLoopInput).some((error) => /Self-loop relationships are not permitted/.test(error)));

  const duplicateAndMirrorInput = {
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" }
    ],
    relationships: [
      { id: "r1", subjectId: "a", objectId: "b", predicate: "calls", time: { type: "instant", start: { value: "2026-09-20T10:00Z" } } },
      { id: "r2", subjectId: "a", objectId: "b", predicate: "calls", time: { type: "instant", start: { value: "2026-09-20T10:00Z" } }, itemIds: [] },
      { id: "r3", subjectId: "b", objectId: "a", predicate: "calls", time: { type: "instant", start: { value: "2026-09-20T10:00Z" } } }
    ]
  };
  const structuralErrors = graph.validateGraphInput(duplicateAndMirrorInput);
  assert.ok(structuralErrors.some((error) => /duplicate one directed action fact/.test(error)));
  assert.ok(structuralErrors.some((error) => /mirror the same action/.test(error)));
  const structuralAudit = graph.auditGraphStructure(duplicateAndMirrorInput);
  assert.equal(structuralAudit.duplicateFactGroups.length, 1);
  assert.ok(structuralAudit.mirroredFactPairs.length >= 1);

  const legitimateCycle = {
    entities: [
      { id: "actor-a", type: "person", name: "Actor A" },
      { id: "actor-b", type: "person", name: "Actor B" }
    ],
    relationships: [
      { id: "attack", subjectId: "actor-a", objectId: "actor-b", predicate: "attacks" },
      { id: "evade", subjectId: "actor-b", objectId: "actor-a", predicate: "evades" }
    ]
  };
  assert.deepEqual(graph.validateGraphInput(legitimateCycle), []);
  assert.equal(graph.auditGraphStructure(legitimateCycle).reciprocalActionPairs.length, 1);
  assert.match(graph.GRAPH_MODEL_RULES.cycles, /distinct-fact/);

  const reusedIdErrors = graph.validateGraphInput({
    entities: [
      { id: "shared", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" }
    ],
    relationships: [{ id: "shared", subjectId: "shared", objectId: "b", predicate: "calls" }]
  });
  assert.ok(reusedIdErrors.some((error) => /ID “shared” is reused/.test(error)));

  const invalidContext = graph.validateGraphInput({
    entities: [
      { id: "a", type: "person", name: "A" },
      { id: "b", type: "person", name: "B" }
    ],
    places: [{ id: "p", name: "Place", geometry: { type: "Point", coordinates: [1, 1] } }],
    relationships: [{
      id: "r",
      subjectId: "a",
      objectId: "b",
      predicate: "called",
      placeId: "p",
      attributes: { location: "duplicate", time: "duplicate" }
    }]
  });
  assert.ok(invalidContext.some((error) => /duplicates canonical spatiotemporal context/.test(error)));
  const invalidPlaces = graph.validateGraphInput({
    entities: [{ id: "a", type: "person", name: "A" }],
    places: [
      { id: "name-only", name: "Name only" },
      { id: "bad-icon", name: "Bad icon", geometry: { type: "Point", coordinates: [1, 1] }, icon: "rocket", markerShape: "hexagon" }
    ],
    relationships: []
  });
  assert.ok(invalidPlaces.some((error) => /requires Point coordinates or Polygon\/MultiPolygon area geometry/.test(error)));
  assert.ok(invalidPlaces.some((error) => /unsupported semantic icon/.test(error)));
  assert.ok(invalidPlaces.some((error) => /unsupported marker shape/.test(error)));
  assert.equal(graph.contextPropertyKey("geometry"), true);
  assert.equal(graph.contextPropertyKey("channel"), false);

  assert.equal(graph.GRAPH_CONTRACT_VERSION, "2026-09-21.1");
  assert.match(graph.GRAPH_MODEL_RULES.namedNarrativeEntities, /contextual-action-edges/);
  assert.match(graph.getGraphContract().requiredAuthoringWorkflow.join(" "), /Extract every durable named entity/);

  const taxonomyErrors = graph.validateGraphInput({
    items: [{ id: "event-taxonomy", title: "A called B", categoryId: "incident" }],
    entities: [
      { id: "a", type: "person", name: "A", attributes: { categoryId: "people" } },
      { id: "b", type: "person", name: "B" }
    ],
    places: [{
      id: "place-taxonomy",
      name: "Office",
      geometry: { type: "Point", coordinates: [1, 1] },
      attributes: { groupId: "places" }
    }],
    relationships: [{
      id: "taxonomy-edge",
      subjectId: "a",
      objectId: "b",
      predicate: "called",
      itemIds: ["event-taxonomy"],
      attributes: { category: "communication" }
    }]
  });
  assert.ok(taxonomyErrors.some((error) => /entity nodes cannot carry timeline category\/group taxonomy/.test(error)));
  assert.ok(taxonomyErrors.some((error) => /graph\/place records cannot carry timeline category\/group taxonomy/.test(error)));
  assert.ok(taxonomyErrors.some((error) => /relationships cannot carry timeline category\/group taxonomy/.test(error)));

  const narrativeEntities = [
    { id: "alice", type: "person", name: "Alice" },
    { id: "bob", type: "person", name: "Bob", alternateNames: ["Robert"] },
    { id: "carol", type: "person", name: "Carol" }
  ];
  const narrativeItem = {
    id: "event-narrative",
    title: "Alice called Bob",
    description: "Robert warned Alice after the call.",
    media: [{ alt: "Alice and Bob", caption: "Carol News photo credit" }],
    evidenceIds: ["evidence-narrative"]
  };
  const evidence = [{
    id: "evidence-narrative",
    type: "note",
    title: "Carol report",
    sourceName: "Carol News",
    note: "Bob warned Alice."
  }];
  const mentions = graph.namedEntityMentions(
    narrativeItem,
    narrativeEntities,
    new Map(evidence.map((record) => [record.id, record]))
  );
  assert.deepEqual(
    new Set(mentions.flatMap((mention) => mention.entityIds)),
    new Set(["alice", "bob"]),
    "title/description/image alt/evidence note count; provenance caption/title/source do not"
  );

  const uncoveredNarrative = graph.validateGraphInput({
    items: [narrativeItem],
    evidence,
    entities: narrativeEntities,
    relationships: [{
      id: "narrative-edge-a",
      subjectId: "alice",
      objectId: "carol",
      predicate: "called",
      itemIds: ["event-narrative"]
    }, {
      id: "narrative-edge-b",
      subjectId: "bob",
      objectId: "carol",
      predicate: "warned",
      itemIds: []
    }]
  });
  assert.ok(uncoveredNarrative.some((error) =>
    /narrative context names canonical entity “Bob”/.test(error) &&
    /meaningful action edge linked to this event/.test(error)
  ));

  const coveredNarrative = graph.validateGraphInput({
    items: [narrativeItem],
    evidence,
    entities: narrativeEntities,
    relationships: [{
      id: "narrative-edge-a",
      subjectId: "alice",
      objectId: "carol",
      predicate: "called",
      itemIds: ["event-narrative"]
    }, {
      id: "narrative-edge-b",
      subjectId: "bob",
      objectId: "alice",
      predicate: "warned",
      itemIds: ["event-narrative"]
    }]
  });
  assert.deepEqual(coveredNarrative, []);

  const scopedMentions = graph.namedEntityMentions({
    id: "event-prince",
    title: "The Prince arrives",
    extensions: { narrative: { storyId: "cinderella" } }
  }, [
    { id: "snow-prince", type: "person", name: "The Prince", alternateNames: ["Prince"], attributes: { storyId: "snow" } },
    { id: "cinderella-prince", type: "person", name: "The Prince", alternateNames: ["Prince"], attributes: { storyId: "cinderella" } }
  ]);
  assert.deepEqual(
    new Set(scopedMentions.flatMap((mention) => mention.entityIds)),
    new Set(["cinderella-prince"]),
    "same-named entities resolve within the event's story scope"
  );
});

test("legacy place nodes and item locations migrate into reusable edge place context", () => {
  const migrated = graph.migrateLegacySpatialModel({
    entities: [
      { id: "person-a", type: "person", name: "A" },
      { id: "person-b", type: "person", name: "B" },
      {
        id: "place-old",
        type: "place",
        name: "Station",
        attributes: { geometry: { type: "Point", coordinates: [18.0686, 59.3293] } }
      }
    ],
    items: [{
      id: "event-a",
      title: "Meeting",
      location: {
        name: "Station",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] }
      }
    }],
    relationships: [{
      id: "legacy-place-edge",
      subjectId: "person-a",
      objectId: "place-old",
      predicate: "metAt",
      itemIds: ["event-a"]
    }, {
      id: "entity-edge",
      subjectId: "person-a",
      objectId: "person-b",
      predicate: "met",
      itemIds: ["event-a"]
    }]
  }, globalThis.TimelineSpatial);

  assert.equal(migrated.entities.some((entity) => entity.id === "place-old"), false);
  assert.ok(migrated.places.some((place) => place.name === "Station"));
  assert.equal("location" in migrated.items[0], false);
  assert.ok(migrated.relationships.every((edge) => edge.placeId));
  assert.equal(migrated.relationships.find((edge) => edge.id === "legacy-place-edge")?.predicate, "met");
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
  assert.ok(html.includes('id="item-connector-routing"'));
  assert.ok(html.includes('<option value="orthogonal">Orthogonal</option>'));
  assert.ok(html.includes('id="item-connector-weight"'));
  assert.ok(html.includes('<option value="strong">Strong</option>'));
  assert.ok(html.includes('id="item-connector-endpoint"'));
  assert.ok(html.includes('<option value="arrow">Arrow</option>'));
  assert.ok(html.includes('id="item-lane"'));
  assert.ok(app.includes('terminalShape: els.itemTerminalShape.value'));
  assert.ok(app.includes('connectorStyle: els.itemConnectorStyle.value'));
  assert.ok(app.includes('connectorRouting: els.itemConnectorRouting.value'));
  assert.ok(app.includes('connectorWeight: els.itemConnectorWeight.value'));
  assert.ok(app.includes('connectorEndpoint: els.itemConnectorEndpoint.value'));
  assert.ok(app.includes('lane: manualLane'));
  assert.ok(app.includes('terminalShape: item.presentation?.terminalShape || "rounded"'));
  assert.ok(app.includes('connectorStyle: item.presentation?.connectorStyle || "solid"'));
  assert.ok(app.includes('connectorRouting: item.presentation?.connectorRouting || "straight"'));
  assert.ok(app.includes('connectorWeight: item.presentation?.connectorWeight || "normal"'));
  assert.ok(app.includes('connectorEndpoint: item.presentation?.connectorEndpoint || "none"'));
  assert.ok(app.includes('lane: Number.isInteger(item.presentation?.lane) ? item.presentation.lane : null'));
  assert.ok(view.includes('node.dataset.terminalShape = item.terminalShape || "rounded"'));
  assert.ok(view.includes('node.dataset.connectorStyle = item.connectorStyle || "solid"'));
  assert.ok(view.includes('node.dataset.connectorRouting = item.connectorRouting || "straight"'));
  assert.ok(view.includes('node.dataset.connectorWeight = item.connectorWeight || "normal"'));
  assert.ok(view.includes('node.dataset.connectorEndpoint = item.connectorEndpoint || "none"'));
  assert.ok(view.includes('node.dataset.laneMode = Number.isInteger(item.lane) ? "manual" : "auto"'));
  assert.ok(view.includes('node.style.setProperty("--connector-thickness"'));
  assert.ok(styles.includes('.timeline-event[data-terminal-shape="diamond"] .timeline-event-dot'));
  assert.ok(styles.includes('.timeline-event[data-connector-routing="orthogonal"] .timeline-event-connector-turn'));
  assert.ok(styles.includes('.timeline-event[data-connector-style="dashed"] .timeline-event-connector'));
  assert.ok(styles.includes('.timeline-event[data-connector-style="dotted"] .timeline-event-connector'));
  assert.ok(styles.includes('.timeline-event[data-connector-endpoint="dot"] .timeline-event-connector::after'));
  assert.ok(styles.includes('.timeline-event[data-connector-endpoint="arrow"] .timeline-event-connector::after'));
});


test("timeline view assigns automatic lanes and honors a persisted manual lane in both orientations", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /resolveEventLane\(position, occupied, minDistance = 236, preferredLane = null\)/);
  assert.match(source, /Number\.isInteger\(preferredLane\)[\s\S]*occupied\[preferredLane\] = position[\s\S]*return preferredLane/);
  assert.match(source, /allocateEventLane\(position, occupied, minDistance = 236\)/);
  assert.match(source, /occupied\.push\(position\)/);
  const clusterSource = source.slice(
    source.indexOf("createClusterNode(cluster"),
    source.indexOf("createEventNode(item")
  );
  const eventStart = source.indexOf("createEventNode(item");
  const eventEnd = source.indexOf(
    "\n    resolveEventLane(position, occupied, minDistance",
    eventStart
  );
  const eventSource = source.slice(eventStart, eventEnd);
  assert.match(eventSource, /const lane = this\.resolveEventLane\(position, occupied, 236, item\.lane\)/);
  assert.match(eventSource, /const laneIndex = this\.resolveEventLane\(position, occupied, 78, item\.lane\)/);
  assert.doesNotMatch(clusterSource, /item\.lane/);
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
  assert.match(source, /const interactiveTarget = event\.target\.closest/);
  assert.match(source, /this\.touchPointers\.set\(event\.pointerId[\s\S]*if \(interactiveTarget\) return/);
  assert.match(source, /this\.suppressClickUntil = performance\.now\(\) \+ 450/);
  assert.match(source, /const remaining = Array\.from\(this\.touchPointers\.values\(\)\)\[0\]/);
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /\.timeline-surface\s*\{[\s\S]*touch-action:\s*none/);
});


test("timeline double tap zooms toward the tapped temporal coordinate without competing with pan or pinch", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /DOUBLE_TAP_ZOOM_FACTOR\s*=\s*0\.5/);
  assert.match(source, /TOUCH_DOUBLE_TAP_MS\s*=\s*320/);
  assert.match(source, /this\.touchTap = null/);
  assert.match(source, /const registerTouchTap = \(event, tap\) =>/);
  assert.match(source, /Math\.hypot\(point\.x - previous\.x, point\.y - previous\.y\).*TOUCH_DOUBLE_TAP_DISTANCE_PX/s);
  assert.match(source, /const ratio = clamp\(\(primary - padding\) \/ usable, 0, 1\)/);
  assert.match(source, /this\.queueZoom\(DOUBLE_TAP_ZOOM_FACTOR, ratio\)/);
  assert.match(source, /distance > TOUCH_TAP_MOVE_TOLERANCE_PX[\s\S]*this\.lastTouchTap = null/);
  assert.match(source, /beginPinch[\s\S]*this\.touchTap = null[\s\S]*this\.lastTouchTap = null/);
});


test("mobile-first shell keeps primary controls compact and bounded", async () => {
  const [styles, timelineCss, viewSource, htmlSource] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8")
  ]);

  assert.match(styles, /Mobile-first responsive application shell/);
  assert.match(styles, /@media \(max-width:\s*699px\)[\s\S]*\.app-tool-dock[\s\S]*left:\s*max\(\.4rem[\s\S]*right:\s*max\(4\.2rem/);
  assert.match(styles, /\.app-view-tool[\s\S]*position:\s*fixed[\s\S]*right:\s*max\(\.45rem[\s\S]*bottom:\s*max\(\.45rem/);
  assert.match(timelineCss, /app-tool-dock\[data-project-anchored="true"\][\s\S]*top:\s*var\(--workspace-tool-dock-top[\s\S]*left:\s*var\(--workspace-tool-dock-left/);
  assert.match(timelineCss, /\.timeline-view\[data-orientation="landscape"\] > \.app-view-controls[\s\S]*flex-direction:\s*row[\s\S]*align-items:\s*center/);
  assert.match(timelineCss, /\.timeline-view\[data-orientation="portrait"\] > \.app-view-controls[\s\S]*flex-direction:\s*column[\s\S]*align-items:\s*stretch/);
  assert.match(timelineCss, /Project-aligned Browse\/Edit controls[\s\S]*z-index:\s*1420[\s\S]*pointer-events:\s*auto/);
  assert.match(timelineCss, /app-tool-dock\[data-project-anchored="true"\] \.app-tool[\s\S]*touch-action:\s*manipulation/);
  assert.match(styles, /\.app-editor-sheet,[\s\S]*\.app-browser-sheet[\s\S]*max-height:\s*min\(58dvh/);
  assert.match(styles, /The persistent relation graph is a stage canvas/);
  assert.match(styles, /#app-shell #presentation-stage:not\(:fullscreen\) > \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*position:\s*absolute[\s\S]*z-index:\s*1050/);
  assert.match(styles, /#app-shell #presentation-stage > \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*margin:\s*0[\s\S]*padding:\s*0[\s\S]*scrollbar-gutter:\s*auto[\s\S]*border-radius:\s*0[\s\S]*backdrop-filter:\s*none/);
  assert.doesNotMatch(styles, /\.app-editor-sheet,\s*\.app-browser-sheet,\s*#app-shell #presentation-stage > \.graph-lens/);

  assert.match(timelineCss, /Narrow-screen control composition/);
  assert.match(timelineCss, /Consolidated view control cluster/);
  assert.match(htmlSource, /id="timeline-view-controls-toggle"[^>]*popovertarget="timeline-view-toolbar"[^>]*popovertargetaction="toggle"/, "View uses the native invoker relationship");
  assert.match(htmlSource, /id="timeline-view-toolbar"[^>]*popover="manual"/, "expanded View controls use the native popover top layer");
  assert.doesNotMatch(timelineCss, /timeline-view-toolbar:not\(\[hidden\]\)/, "closed popover must not be forced visible by legacy hidden selectors");
  assert.match(timelineCss, /app-view-controls\.timeline-view-toolbar\[popover\]:popover-open[\s\S]*display:\s*flex/);
  assert.match(timelineCss, /app-view-controls\.timeline-view-toolbar\[popover\]\s*\{[\s\S]*max-inline-size:[\s\S]*max-block-size:/);
  assert.match(timelineCss, /app-view-controls\.timeline-view-toolbar\[popover\]:popover-open[\s\S]*overflow-y:\s*auto/);
  assert.match(timelineCss, /\.timeline-zoom-control[\s\S]*grid-template-rows:\s*22px auto/);
  assert.match(timelineCss, /\.timeline-zoom-scale[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(timelineCss, /Canonical View popover contract[\s\S]*top:\s*var\(--view-controls-top[\s\S]*left:\s*var\(--view-controls-left/);
  assert.match(timelineCss, /app-view-controls\.timeline-view-toolbar\[popover\]:popover-open[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(timelineCss, /\.timeline-auto-controls[\s\S]*display:\s*flex[\s\S]*flex-wrap:\s*nowrap/);
  assert.doesNotMatch(timelineCss, /\.timeline-auto-controls[\s\S]{0,180}grid-column:\s*1 \/ -1/);
  assert.match(timelineCss, /Mobile persistent relation composition/);
  assert.match(timelineCss, /--mobile-relations-inline-rail:\s*clamp\(136px, 38dvw, 168px\)/);
  assert.match(timelineCss, /--mobile-relations-block-rail:\s*clamp\(136px, 32dvh, 184px\)/);
  assert.match(timelineCss, /Mobile persistent relation composition[\s\S]*data-orientation="portrait"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*top:\s*0;[\s\S]*right:\s*calc\(var\(--mobile-relations-inline-rail\)[\s\S]*bottom:\s*0;[\s\S]*left:\s*0;/);
  assert.match(timelineCss, /Mobile persistent relation composition[\s\S]*data-orientation="landscape"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*top:\s*0;[\s\S]*right:\s*0;[\s\S]*bottom:\s*calc\(var\(--mobile-bottom-chrome\) \+ var\(--mobile-relations-block-rail\)\);[\s\S]*left:\s*0;/);
  assert.match(timelineCss, /#timeline-view\[data-orientation="portrait"\] > \.timeline-surface[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*width:\s*var\(--mobile-relations-inline-rail\)[\s\S]*height:\s*100%/);
  assert.match(timelineCss, /#timeline-view\[data-orientation="landscape"\] > \.timeline-surface[\s\S]*right:\s*0;[\s\S]*left:\s*0;[\s\S]*width:\s*100%[\s\S]*height:\s*var\(--mobile-relations-block-rail\)/);
  assert.match(viewSource, /terminalExtent = compact \? Math\.min\(width \* 0\.58, 190\) : 232/);
  assert.match(viewSource, /afterAvailable = width - edgeInset - terminalExtent \+ terminalAnchor - axisCross/);
  assert.match(viewSource, /clusterTerminalExtent = compact \? Math\.min\(width \* 0\.68, 220\) : 232/);
  assert.match(viewSource, /clusterAfterAvailable = width - 12 - clusterTerminalExtent \+ 32 - axisCross/);
});


test("View toolbar keeps native toggle state while measured coordinates attach it to the trigger", async () => {
  const [htmlSource, appSource, styles, timelineCss] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(htmlSource, /id="timeline-view-controls-toggle"[^>]*popovertarget="timeline-view-toolbar"[^>]*popovertargetaction="toggle"/);
  assert.match(appSource, /function viewControlsAreOpen\(\)[\s\S]*:popover-open/);
  assert.match(appSource, /viewControls\?\.addEventListener\("toggle",[\s\S]*syncViewControlsChrome\(\)/);
  assert.match(appSource, /function closeViewControls\(\)[\s\S]*hidePopover\(\)/);
  assert.doesNotMatch(appSource, /viewControlsOpen:\s*false|ui\.viewControlsOpen/);
  assert.match(appSource, /function positionViewControls\(\)[\s\S]*viewControlsToggle\.getBoundingClientRect\(\)[\s\S]*viewControls\.getBoundingClientRect\(\)/);
  assert.match(appSource, /workspaceToolViewport\(\)[\s\S]*preferredTop[\s\S]*fallbackTop[\s\S]*clamped-above[\s\S]*clamped-below/);
  assert.match(appSource, /--view-controls-left[\s\S]*--view-controls-top[\s\S]*--view-controls-right[\s\S]*--view-controls-bottom/);
  assert.match(appSource, /visualViewport\?\.addEventListener\("resize", positionViewControls\)/);
  assert.match(appSource, /visualViewport\?\.addEventListener\("scroll", positionViewControls\)/);
  assert.match(appSource, /ResizeObserver[\s\S]*viewControlsResizeObserver[\s\S]*observe\(els\.viewControls\)[\s\S]*observe\(els\.viewControlsToggle\)/);
  assert.doesNotMatch(styles, /\.app-view-controls\[popover\]:popover-open/);
  assert.match(timelineCss, /Canonical View popover contract/);
  assert.match(timelineCss, /top:\s*var\(--view-controls-top, auto\)/);
  assert.match(timelineCss, /right:\s*var\(--view-controls-right,[\s\S]*bottom:\s*var\(--view-controls-bottom,[\s\S]*left:\s*var\(--view-controls-left, auto\)/);
  assert.doesNotMatch(timelineCss, /anchor\(right\)|anchor\(top\)|position-try-fallbacks/);
  assert.match(timelineCss, /#app-shell #presentation-stage:fullscreen \.timeline-view-toolbar:popover-open[\s\S]*top:\s*max\(\.4rem[\s\S]*right:\s*max\(\.4rem/);
  assert.doesNotMatch(timelineCss, /\.timeline-view-toolbar\s*\{[^}]*display\s*:/s);
});

test("View toolbar follows timeline orientation without selector-dependent deployment", async () => {
  const [styles, timelineCss] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8")
  ]);

  assert.match(
    styles,
    /#app-shell:has\(#timeline-view\[data-orientation="landscape"\]\) \.app-tool-dock\s*\{[\s\S]*flex-direction:\s*column[\s\S]*overflow-x:\s*hidden[\s\S]*overflow-y:\s*auto/
  );
  assert.match(
    styles,
    /#app-shell:has\(#timeline-view\[data-orientation="portrait"\]\) \.app-tool-dock\s*\{[\s\S]*flex-direction:\s*row[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="landscape"\] > \.app-view-controls\.timeline-view-toolbar\[popover\]:popover-open\s*\{[\s\S]*flex-direction:\s*row[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="portrait"\] > \.app-view-controls\.timeline-view-toolbar\[popover\]:popover-open\s*\{[\s\S]*flex-direction:\s*column[\s\S]*width:\s*clamp\(82px, 22dvw, 96px\)[\s\S]*overflow-y:\s*auto/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="portrait"\] > \.app-view-controls[\s\S]*\.timeline-auto-controls\s*\{[\s\S]*flex-direction:\s*column/
  );
  assert.doesNotMatch(
    timelineCss,
    /#app-shell:has\(#timeline-view\[data-orientation="(?:landscape|portrait)"\]\)[\s\S]{0,220}\.app-view-controls/
  );
});

test("portrait mode gives the semantic zoom slider a vertical axis", async () => {
  const [timelineCss, viewSource] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="portrait"\] \.timeline-zoom-control input\[type="range"\]\s*\{[\s\S]*writing-mode:\s*vertical-lr[\s\S]*height:\s*100%[\s\S]*cursor:\s*ns-resize[\s\S]*touch-action:\s*pan-x/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="portrait"\] \.timeline-zoom-scale\s*\{[\s\S]*grid-template-rows:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="portrait"\] \.timeline-zoom-scale span\s*\{[\s\S]*writing-mode:\s*vertical-rl[\s\S]*text-orientation:\s*mixed[\s\S]*white-space:\s*nowrap/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="landscape"\] \.timeline-zoom-scale span\s*\{[\s\S]*writing-mode:\s*horizontal-tb[\s\S]*white-space:\s*nowrap/
  );
  assert.match(
    timelineCss,
    /\.timeline-view\[data-orientation="landscape"\] \.timeline-zoom-control input\[type="range"\]\s*\{[\s\S]*writing-mode:\s*horizontal-tb[\s\S]*cursor:\s*ew-resize[\s\S]*touch-action:\s*pan-y/
  );
  assert.match(
    viewSource,
    /zoomSlider\.setAttribute\("aria-orientation", vertical \? "vertical" : "horizontal"\)/
  );
});


test("shared camera motion exposes capped two-dimensional release velocity and map-equivalent deceleration", () => {
  const velocity = motion.estimatePointerVectorVelocity([
    { x: 0, y: 0, time: 0 },
    { x: 400, y: 300, time: 100 }
  ]);
  assert.ok(Math.abs(velocity.magnitude - motion.MAX_RELEASE_VELOCITY_PX_PER_MS) < 1e-9);
  assert.ok(velocity.x > 0);
  assert.ok(velocity.y > 0);
  assert.equal(motion.MAX_RELEASE_SPEED_PX_PER_S, 3200);
  assert.equal(motion.CAMERA_INERTIA_DECELERATION_PX_PER_S2, 3810);
});

test("persistent relation graph fills the stage outside chronology and stays behind focused detail", async () => {
  const [styles, timelineCss, appSource, indexSource, viewSource] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8")
  ]);

  assert.match(timelineCss, /Persistent relation-graph docking/);
  assert.match(timelineCss, /graph fills every[\s\S]*remaining stage pixel/);
  assert.match(timelineCss, /\.timeline-surface\.is-landscape[\s\S]*width:\s*100%[\s\S]*max-width:\s*none/);
  assert.match(timelineCss, /\.timeline-surface\.is-portrait[\s\S]*height:\s*100%[\s\S]*max-height:\s*none/);

  assert.match(styles, /The persistent relation graph is a stage canvas/);
  assert.match(styles, /#app-shell #presentation-stage:not\(:fullscreen\) > \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*position:\s*absolute/);
  assert.match(styles, /#app-shell #presentation-stage > \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*margin:\s*0[\s\S]*padding:\s*0[\s\S]*scrollbar-gutter:\s*auto[\s\S]*border:\s*0[\s\S]*border-radius:\s*0/);
  assert.match(styles, /\.temporal-graph-view,[\s\S]*\.temporal-graph-canvas\s*\{[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*min-width:\s*0[\s\S]*min-height:\s*0[\s\S]*margin:\s*0[\s\S]*padding:\s*0/);
  assert.doesNotMatch(styles, /\.app-editor-sheet,\s*\.app-browser-sheet,\s*#app-shell #presentation-stage > \.graph-lens/);
  assert.doesNotMatch(styles, /height:\s*min\(72dvh,\s*680px\)/);

  assert.match(timelineCss, /@media \(min-width:\s*700px\)[\s\S]*--relations-inline-rail:\s*clamp\(280px, 28dvw, 400px\)/);
  assert.match(timelineCss, /--relations-block-rail:\s*clamp\(220px, 31dvh, 320px\)/);
  assert.doesNotMatch(timelineCss, /--relations-gap|--relations-top-safe|--relations-left-safe/);

  assert.match(timelineCss, /data-orientation="portrait"[\s\S]*> \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*top:\s*0;[\s\S]*right:\s*calc\(var\(--relations-inline-rail\) \+ var\(--relations-right-safe\)\);[\s\S]*bottom:\s*0;[\s\S]*left:\s*0;/);
  assert.match(timelineCss, /data-orientation="portrait"\] > \.timeline-surface[\s\S]*--timeline-axis-cross:\s*68%[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*width:\s*var\(--relations-inline-rail\)[\s\S]*height:\s*100%/);

  assert.match(timelineCss, /data-orientation="landscape"[\s\S]*> \.graph-lens:not\(\[hidden\]\)\s*\{[\s\S]*top:\s*0;[\s\S]*right:\s*0;[\s\S]*bottom:\s*calc\(var\(--relations-bottom-safe\) \+ var\(--relations-block-rail\)\);[\s\S]*left:\s*0;/);
  assert.match(timelineCss, /data-orientation="landscape"\] > \.timeline-surface[\s\S]*--timeline-axis-cross:\s*42%[\s\S]*right:\s*0;[\s\S]*left:\s*0;[\s\S]*width:\s*100%[\s\S]*height:\s*var\(--relations-block-rail\)/);
  assert.match(timelineCss, /@media \(min-width:\s*900px\)[\s\S]*--relations-bottom-safe:\s*max\(\.55rem/);

  assert.match(timelineCss, /Mobile persistent relation composition[\s\S]*data-orientation="portrait"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*left:\s*0/);
  assert.match(timelineCss, /Mobile persistent relation composition[\s\S]*data-orientation="landscape"[\s\S]*> \.graph-lens:not\(\[hidden\]\)[\s\S]*top:\s*0;[\s\S]*right:\s*0;[\s\S]*left:\s*0/);
  assert.doesNotMatch(timelineCss, /--mobile-top-chrome/);

  assert.match(timelineCss, /#presentation-stage:fullscreen > \.graph-lens \{\s*display:\s*block !important;/);
  assert.doesNotMatch(indexSource, /id="graph-lens-toggle"/);
  assert.match(indexSource, /id="graph-lens"[^>]*aria-label="Persistent temporal relation graph"/);
  assert.match(appSource, /els\.graphLens\.hidden = false/);
  assert.doesNotMatch(appSource, /setGraphSurfaceOpen|mountGraphBackdrop|ui\.graphOpen/);
  assert.doesNotMatch(viewSource, /focusGraphSlot|timeline-focus-relations-backdrop/);
});

test("timeline touch state recovers from lost capture, backgrounding, viewport changes, and rotation", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");

  assert.match(source, /const abortSurfaceGesture = \(\) => \{/);
  assert.match(source, /new Set\(this\.touchPointers\.keys\(\)\)/);
  assert.match(source, /this\.touchPointers\.clear\(\)/);
  assert.match(source, /this\.pinch = null/);
  assert.match(source, /this\.drag = null/);
  assert.match(source, /this\.surface\.classList\.remove\("is-panning"\)/);
  assert.match(source, /this\.cancelViewportAnimation\(\)/);
  assert.match(source, /releasePointerCapture\(pointerId\)/);
  assert.match(source, /addEventListener\("lostpointercapture"/);
  assert.match(source, /window\.addEventListener\("blur", abortSurfaceGesture\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange"[\s\S]*document\.hidden[\s\S]*abortSurfaceGesture/);
  assert.match(source, /window\.addEventListener\("orientationchange", abortSurfaceGesture\)/);
  assert.match(source, /screen\?\.orientation\?\.addEventListener\?\.\("change", abortSurfaceGesture\)/);
  assert.match(source, /visualViewport\?\.addEventListener\("resize"[\s\S]*abortSurfaceGesture/);
});


test("timeline releases pointer capture only after gesture state is finalized", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /const releaseFinishedPointer = \(\) => \{/);
  assert.doesNotMatch(
    source,
    /this\.touchPointers\.delete\(event\.pointerId\);\s*try \{\s*if \(this\.surface\.hasPointerCapture/
  );
  assert.match(
    source,
    /if \(this\.drag && this\.drag\.pointerId === event\.pointerId\)[\s\S]*this\.drag = null[\s\S]*releaseFinishedPointer\(\)/
  );
  assert.match(
    source,
    /if \(this\.touchPointers\.size >= 2\)[\s\S]*beginPinch\(\)[\s\S]*releaseFinishedPointer\(\)[\s\S]*return/
  );
});


test("coarse-pointer timeline controls and ranges retain a 44 CSS px interaction floor", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(css, /@media \(pointer: coarse\)[\s\S]*\.view-icon-button[\s\S]*width:\s*44px[\s\S]*height:\s*44px/);
  assert.match(css, /@media \(pointer: coarse\)[\s\S]*timeline-focus-actions \.button[\s\S]*min-height:\s*44px/);
  assert.match(css, /@media \(pointer: coarse\)[\s\S]*timeline-auto-timer input[\s\S]*min-height:\s*44px/);
  assert.match(css, /@media \(pointer: coarse\)[\s\S]*timeline-range-segment::before[\s\S]*inset:\s*-19px[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /data-orientation="portrait"\] \.timeline-zoom-control input\[type="range"\][\s\S]*width:\s*44px[\s\S]*min-width:\s*44px/);
  assert.match(css, /data-orientation="landscape"\] \.timeline-zoom-control input\[type="range"\][\s\S]*height:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(css, /data-orientation="portrait"[\s\S]*timeline-view-toolbar\[popover\]:popover-open[\s\S]*width:\s*104px/);
});


test("coarse-pointer forms and compact calendars keep touch controls usable", async () => {
  const styles = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");

  assert.match(styles, /@media \(pointer: coarse\)[\s\S]*\.button,[\s\S]*\.tab[\s\S]*min-height:\s*44px/);
  assert.match(styles, /@media \(pointer: coarse\)[\s\S]*\.icon-button[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(styles, /field input:not\(\[type="color"\]\)[\s\S]*field select[\s\S]*min-height:\s*44px/);
  assert.match(styles, /@media \(pointer: coarse\) and \(max-width: 380px\)[\s\S]*range-calendar[\s\S]*width:\s*calc\(100dvw - 4px\)/);
  assert.match(styles, /range-calendar-grid[\s\S]*gap:\s*0/);
  assert.match(styles, /range-calendar-day[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
});


test("focused event popover keeps event semantics compact and image controls dot-only", async () => {
  const [source, cssSource, fictionDocs, architectureDocs] = await Promise.all([
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/NARRATIVE-FICTION-MODE.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIMELINE-V3-ARCHITECTURE.md", import.meta.url), "utf8")
  ]);

  assert.ok(source.includes("function formatElapsedDuration"));
  assert.ok(source.includes("Duration ${duration}"));
  assert.ok(source.includes("timeline-focus-slide-dot"));
  assert.ok(source.includes("Show image ${index + 1} of ${media.length}"));
  assert.equal(source.includes("timeline-focus-slide-count"), false);
  assert.equal(source.includes("timeline-focus-media-caption"), false);
  assert.equal(source.includes('createElement("h3", "timeline-focus-section-heading"'), false);
  assert.ok(source.includes('summary.setAttribute("aria-label", "Context")'));
  assert.ok(source.includes('place.setAttribute("aria-label", "Place")'));
  assert.ok(source.includes('evidence.setAttribute("aria-label", "Evidence")'));
  assert.match(cssSource, /\.timeline-focus-slide-dot\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/);
  assert.match(fictionDocs, /Categories belong only to timeline events; places, graph entities, and relationships\/edges/);
  assert.match(architectureDocs, /explicit duration for ranged events/);
});


test("phone portrait keeps a usable chronology rail and opens View controls inward", async () => {
  const [timelineCss, appSource] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);
  assert.match(timelineCss, /--mobile-relations-inline-rail:\s*clamp\(136px, 38dvw, 168px\)/);
  assert.match(timelineCss, /--mobile-focus-rail:\s*clamp\(136px, 38dvw, 168px\)/);
  assert.match(timelineCss, /data-orientation="portrait"\] > \.timeline-surface[\s\S]*--timeline-axis-cross:\s*58%[\s\S]*overflow:\s*visible/);
  assert.match(timelineCss, /data-orientation="portrait"\] \.timeline-tick-label[\s\S]*left:\s*auto[\s\S]*right:\s*16px[\s\S]*text-align:\s*right/);
  assert.match(appSource, /orientation === "portrait"[\s\S]*preferredLeft = triggerRect\.left - toolbarWidth - gap[\s\S]*placement = "left"/);
  assert.match(appSource, /orientation === "portrait"[\s\S]*top = triggerRect\.bottom - toolbarHeight/);
});


test("empty phone portrait keeps chronology readable and project tools attached", async () => {
  const [timelineCss, viewSource, appSource] = await Promise.all([
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);

  assert.match(viewSource, /const isEmpty = !this\.items\.length \|\| !this\.viewport/);
  assert.match(viewSource, /this\.root\.dataset\.empty = isEmpty \? "true" : "false"/);
  assert.match(timelineCss, /data-orientation="portrait"\]\[data-empty="true"\][\s\S]*--mobile-relations-inline-rail:\s*clamp\(152px, 44dvw, 188px\)/);
  assert.match(timelineCss, /timeline-surface\.is-portrait \.timeline-empty-hint[\s\S]*right:\s*calc\(100% - var\(--timeline-axis-cross\) \+ \.65rem\)[\s\S]*writing-mode:\s*vertical-rl/);
  assert.match(timelineCss, /data-orientation="portrait"\]\[data-empty="true"\] > \.timeline-surface[\s\S]*--timeline-axis-cross:\s*62%[\s\S]*overflow:\s*visible/);
  assert.match(timelineCss, /data-orientation="portrait"\]\[data-empty="true"\] \.timeline-project-title input[\s\S]*height:\s*clamp\(96px, 16dvh, 144px\)/);
  assert.match(appSource, /workspaceToolDockResizeObserver = new ResizeObserver[\s\S]*observe\(els\.appToolDock\)[\s\S]*observe\(els\.projectMenuToggle\)/);
  assert.match(appSource, /document\.fonts\?\.ready\?\.then\(\(\) => \{[\s\S]*positionWorkspaceToolDock\(\)/);
});
