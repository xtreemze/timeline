import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/temporal-standards-shim.ts");
await import("../site/timeline-clustering-shim.ts");
await import("../site/timeline-motion-shim.ts");
await import("../site/spatial-shim.ts");
await import("../site/timeline-graph-shim.ts");

const clustering = globalThis.TimelineClustering;
const motion = globalThis.TimelineMotion;
const graph = globalThis.TimelineGraph;

test("clusters projected events only after their rendered positions overlap", () => {
  const items = [
    { id: "a", start: 1 },
    { id: "b", start: 2 },
    { id: "c", start: 3 },
    { id: "d", start: 4 },
  ];
  const positions = new Map([
    ["a", 10],
    ["b", 70],
    ["c", 145],
    ["d", 420],
  ]);
  const result = clustering.clusterProjectedItems(items, (item) => positions.get(item.id), 100);
  assert.equal(result.length, 2);
  assert.equal(result[0].kind, "cluster");
  assert.deepEqual(
    result[0].items.map((item) => item.id),
    ["a", "b", "c"],
  );
  assert.equal(result[1].kind, "item");
});

test("events less than 50 ms apart separate after zoom without temporal drift", async () => {
  await import("../site/time-scale-shim.ts");
  const scale = globalThis.TimelineScale;
  const events = [
    { id: "a", start: 1_000 },
    { id: "b", start: 1_030 },
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

test("browse exposes focusable stories before collapsed focusable categories", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="browser-story-list"[\s\S]*id="timeline-list"/);
  assert.match(app, /function renderBrowserStories\([\s\S]*browser-story-card[\s\S]*focus-story/);
  assert.match(app, /collapsedCategoryIds:\s*new Set\(state\.categories\.map/);
  assert.match(app, /actionButton\("Focus", "focus-category"/);
  assert.match(app, /function focusCategory\([\s\S]*categoryFilter = id[\s\S]*fitVisible/);
  assert.match(css, /\.browser-story-card/);
  assert.match(css, /\.timeline-category-focus/);
  assert.match(
    css,
    /\.timeline-category-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/,
  );
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
    { id: "g", start: time(10, 4) },
  ]);
  assert.deepEqual(
    accents.map((accent) => accent.label),
    ["SEP 2026"],
  );
  assert.equal(accents[0].count, 3);
});

test("temporal context progressively sheds detail as zoom broadens", () => {
  const eventTime = Date.UTC(1000, 4, 5, 14, 30);
  const items = [
    { id: "a", start: eventTime },
    { id: "b", start: eventTime + 30 * 60_000 },
  ];
  const base = {
    pixelLength: 1200,
    padding: 40,
    orientation: "horizontal",
    maxItemsPerMonth: 3,
    limit: 18,
  };

  const hourPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 4, 5, 14, 0),
      end: Date.UTC(1000, 4, 5, 16, 0),
    },
    spec: { unit: "minute", step: 5 },
  });
  assert.equal(hourPlan.mode, "day-month-year-edge");
  assert.deepEqual(
    hourPlan.edgeAccents.map((accent) => accent.label),
    ["MAY 5, 1000"],
  );

  const dayPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 4, 1),
      end: Date.UTC(1000, 4, 31),
    },
    spec: { unit: "day", step: 2 },
  });
  assert.equal(dayPlan.mode, "month-year-edge");
  assert.deepEqual(
    dayPlan.edgeAccents.map((accent) => accent.label),
    ["MAY 1000"],
  );

  const monthPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(1000, 0, 1),
      end: Date.UTC(1001, 0, 1),
    },
    spec: { unit: "month", step: 1 },
  });
  assert.equal(monthPlan.mode, "year-edge-month-axis");
  assert.deepEqual(
    monthPlan.edgeAccents.map((accent) => accent.label),
    ["1000"],
  );
  assert.deepEqual(
    monthPlan.axisMonths.map((accent) => accent.label),
    ["MAY"],
  );

  const yearPlan = clustering.planTemporalAccents(items, {
    ...base,
    viewport: {
      start: Date.UTC(995, 0, 1),
      end: Date.UTC(1005, 0, 1),
    },
    spec: { unit: "year", step: 1 },
  });
  assert.equal(yearPlan.mode, "year-edge");
  assert.deepEqual(
    yearPlan.edgeAccents.map((accent) => accent.label),
    ["1000"],
  );
});

test("temporal accent planner keeps full month-year accents only when they cannot overlap", () => {
  const items = [
    { id: "a", start: Date.UTC(2026, 0, 12) },
    { id: "b", start: Date.UTC(2026, 6, 12) },
  ];
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(2026, 0, 1), end: Date.UTC(2027, 0, 1) },
    pixelLength: 1200,
    padding: 40,
    orientation: "horizontal",
    spec: { unit: "day", step: 1 },
  });
  assert.equal(plan.mode, "month-year-edge");
  assert.equal(plan.edgeAccents.length, 2);
  assert.equal(plan.axisMonths.length, 0);
});

test("overlapping month-year accents collapse to year on the edge and month on the axis", () => {
  const items = [
    { id: "a", start: Date.UTC(2026, 7, 2) },
    { id: "b", start: Date.UTC(2026, 8, 2) },
    { id: "c", start: Date.UTC(2026, 9, 2) },
  ];
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 10, 1) },
    pixelLength: 420,
    padding: 30,
    orientation: "horizontal",
    spec: { unit: "day", step: 2 },
  });
  assert.equal(plan.mode, "year-edge-month-axis");
  assert.deepEqual(
    plan.edgeAccents.map((accent) => accent.label),
    ["2026"],
  );
  assert.ok(plan.axisMonths.length >= 2);
  assert.ok(plan.axisMonths.every((accent) => /^[A-Z]{3}$/.test(accent.label)));
});

test("year-scale views retain an ambient year context in addition to axis ticks", () => {
  const plan = clustering.planTemporalAccents(
    [
      { id: "a", start: Date.UTC(2018, 1, 1) },
      { id: "b", start: Date.UTC(2026, 8, 1) },
    ],
    {
      viewport: { start: Date.UTC(2010, 0, 1), end: Date.UTC(2030, 0, 1) },
      pixelLength: 900,
      padding: 40,
      orientation: "vertical",
      spec: { unit: "year", step: 2 },
    },
  );
  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(
    plan.edgeAccents.map((accent) => accent.label),
    ["2018", "2026"],
  );
  assert.equal(plan.axisMonths.length, 0);
  assert.equal(plan.hasAmbientContext, true);
});

test("year edge accents keep their projected edge positions instead of clamping inward", () => {
  const viewport = {
    start: Date.UTC(2010, 0, 1),
    end: Date.UTC(2020, 0, 1),
  };
  const plan = clustering.planTemporalAccents(
    [
      { id: "start", start: viewport.start },
      { id: "end", start: viewport.end },
    ],
    {
      viewport,
      pixelLength: 600,
      padding: 40,
      orientation: "horizontal",
      spec: { unit: "year", step: 1 },
    },
  );

  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(
    plan.edgeAccents.map((accent) => accent.position),
    [40, 640],
  );
});

test("dense same-year clusters still emit one ambient year label on narrow mobile timelines", () => {
  const items = Array.from({ length: 55 }, (_, index) => ({
    id: `event-${index}`,
    start: Date.UTC(1000, index % 12, 1 + (index % 27)),
  }));
  const plan = clustering.planTemporalAccents(items, {
    viewport: { start: Date.UTC(900, 0, 1), end: Date.UTC(1100, 0, 1) },
    pixelLength: 620,
    padding: 48,
    orientation: "horizontal",
    spec: { unit: "year", step: 50 },
  });
  assert.equal(plan.mode, "year-edge");
  assert.deepEqual(
    plan.edgeAccents.map((accent) => accent.label),
    ["1000"],
  );
  assert.equal(plan.edgeAccents[0].count, 55);
});

test("focused clustered event zooms toward a unique projected position", () => {
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 10 },
      { id: "c", start: 1000 },
    ],
    "a",
    { start: 0, end: 100 },
    500,
    100,
  );
  assert.equal(plan.mode, "separate");
  assert.ok(plan.viewport.end - plan.viewport.start < 100);
  assert.equal(plan.forceUnique, false);
});

test("cluster activation viewport keeps every member visible and separates ordinary dense clusters", () => {
  const items = [
    { id: "a", start: 100 },
    { id: "b", start: 120 },
    { id: "c", start: 145 },
  ];
  const plan = clustering.clusterExpansionViewport(items, { start: 0, end: 1000 }, 900, 156);
  assert.ok(plan);
  assert.ok(plan.viewport.start < 100);
  assert.ok(plan.viewport.end > 145);
  assert.ok(plan.viewport.end - plan.viewport.start < 1000);

  const positions = new Map(
    items.map((item) => [
      item.id,
      ((item.start - plan.viewport.start) / (plan.viewport.end - plan.viewport.start)) * 900,
    ]),
  );
  const representations = clustering.clusterProjectedItems(
    items,
    (item) => positions.get(item.id),
    156,
  );
  assert.ok(representations.every((representation) => representation.kind === "item"));
  assert.equal(plan.forceExpanded, false);
});

test("focused event zooms into local context when already unique", () => {
  const viewport = { start: -500, end: 1500 };
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 500 },
      { id: "c", start: 1000 },
    ],
    "b",
    viewport,
    700,
    100,
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
      { id: "c", start: 1000 },
    ],
    "b",
    viewport,
    700,
    100,
    { preserveScale: true },
  );
  assert.equal(plan.mode, "keep");
  assert.deepEqual(plan.viewport, viewport);
});

test("focused viewport never expands to include distant context", () => {
  const viewport = { start: -100, end: 100 };
  const plan = clustering.focusContextViewport(
    [
      { id: "a", start: 0 },
      { id: "b", start: 5000 },
    ],
    "a",
    viewport,
    700,
    100,
  );
  assert.ok(plan.viewport.end - plan.viewport.start <= viewport.end - viewport.start);
  assert.ok(plan.viewport.end - plan.viewport.start < viewport.end - viewport.start);
});

test("coincident events remain separate representations and use layout lanes instead of impossible zoom separation", () => {
  const items = [
    { id: "a", start: 100 },
    { id: "b", start: 100 },
    { id: "c", start: 500 },
  ];
  const positions = new Map([
    ["a", 50],
    ["b", 50],
    ["c", 500],
  ]);
  const representations = clustering.clusterProjectedItems(
    items,
    (item) => positions.get(item.id),
    100,
  );
  assert.deepEqual(
    representations.slice(0, 2).map((entry) => [entry.kind, entry.id]),
    [
      ["item", "a"],
      ["item", "b"],
    ],
  );

  const viewport = { start: -400, end: 600 };
  const plan = clustering.focusContextViewport(items, "a", viewport, 500, 100);
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
    { coordinate: 150, time: 60 },
  ]);
  assert.ok(velocity > 0);
  assert.ok(velocity <= 3.2);
});

test("Orb adapter keeps chronology, stories, and places out of the canonical node graph", () => {
  const input = {
    entities: [
      { id: "person-a", type: "person", name: "Person A" },
      { id: "person-b", type: "person", name: "Person B" },
    ],
    places: [
      {
        id: "place-a",
        name: "Place A",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
        icon: "place",
        markerShape: "pin",
      },
    ],
    stories: [{ id: "story-a", title: "Story A", description: "", itemIds: ["event-a"] }],
    items: [{ id: "event-a", title: "Event A", kind: "event" }],
    relationships: [
      {
        id: "edge-a",
        subjectId: "person-a",
        objectId: "person-b",
        predicate: "travels",
        placeId: "place-a",
        itemIds: ["event-a"],
      },
    ],
  };
  const normalized = graph.normalizeGraphData(input);
  const orb = graph.toOrbGraph({ ...input, ...normalized });
  assert.deepEqual(orb.nodes.map((node) => node.id).sort(), ["person-a", "person-b"]);
  assert.equal(
    orb.nodes.some(
      (node) => node.id === "event-a" || node.id === "story-a" || node.id === "place-a",
    ),
    false,
  );
  assert.deepEqual(orb.edges[0].properties.itemIds, ["event-a"]);
  assert.equal(orb.edges[0].properties.placeId, "place-a");
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
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(source, /temporal\.parse\(value\)/);
  assert.doesNotMatch(source, /DATE_PATTERN/);
  assert.match(source, /temporalRelationProjection\(state\.relationships/);
});

test("keeps chronological event order available as a semantic keyboard-accessible fallback", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    html,
    /id="timeline-browser-sheet"[\s\S]*id="timeline-list" class="timeline-list" aria-live="polite"/,
  );
  assert.match(
    app,
    /function sortItems\([\s\S]*parseDate\(a\.start\)[\s\S]*a\.title\.localeCompare\(b\.title\)/,
  );
  assert.match(app, /function getVisibleItems\([\s\S]*items = sortItems\(\)/);
  assert.match(
    app,
    /function renderTimelineList\([\s\S]*document\.createElement\("ol"\)[\s\S]*items\.map\(\(item\) => renderItem\(item, null\)\)/,
  );
  assert.match(
    app,
    /function renderItem\([\s\S]*document\.createElement\("li"\)[\s\S]*actionButton\("Focus", "focus-item"/,
  );
});

test("shared camera motion exposes capped two-dimensional release velocity and map-equivalent deceleration", () => {
  const velocity = motion.estimatePointerVectorVelocity([
    { x: 0, y: 0, time: 0 },
    { x: 400, y: 300, time: 100 },
  ]);
  assert.ok(Math.abs(velocity.magnitude - motion.MAX_RELEASE_VELOCITY_PX_PER_MS) < 1e-9);
  assert.ok(velocity.x > 0);
  assert.ok(velocity.y > 0);
  assert.equal(motion.MAX_RELEASE_SPEED_PX_PER_S, 3200);
  assert.equal(motion.CAMERA_INERTIA_DECELERATION_PX_PER_S2, 3810);
});

test("coarse-pointer timeline controls and ranges retain a 44 CSS px interaction floor", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(pointer: coarse\)[\s\S]*\.view-icon-button[\s\S]*width:\s*44px[\s\S]*height:\s*44px/,
  );
  assert.match(
    css,
    /@media \(pointer: coarse\)[\s\S]*timeline-focus-actions \.button[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    css,
    /@media \(pointer: coarse\)[\s\S]*timeline-auto-timer input[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    css,
    /@media \(pointer: coarse\)[\s\S]*timeline-range-segment::before[\s\S]*inset:\s*-19px[\s\S]*pointer-events:\s*auto/,
  );
  assert.match(
    css,
    /data-orientation="portrait"\] \.timeline-zoom-control input\[type="range"\][\s\S]*width:\s*44px[\s\S]*min-width:\s*44px/,
  );
  assert.match(
    css,
    /data-orientation="landscape"\] \.timeline-zoom-control input\[type="range"\][\s\S]*height:\s*44px[\s\S]*min-height:\s*44px/,
  );
  assert.match(
    css,
    /data-orientation="portrait"[\s\S]*timeline-view-toolbar\[popover\]:popover-open[\s\S]*width:\s*104px/,
  );
});

test("focused event popover keeps event semantics compact and image controls dot-only", async () => {
  const [source, cssSource, fictionDocs, architectureDocs] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/NARRATIVE-FICTION-MODE.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIMELINE-V3-ARCHITECTURE.md", import.meta.url), "utf8"),
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
  assert.match(
    cssSource,
    /\.timeline-focus-slide-dot\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/,
  );
  assert.match(
    fictionDocs,
    /Categories belong only to timeline events; places, graph entities, and relationships\/edges/,
  );
  assert.match(architectureDocs, /explicit duration for ranged events/);
});

