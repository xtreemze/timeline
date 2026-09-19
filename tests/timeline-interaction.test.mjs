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
      { id: "person-a", type: "person", name: "A" },
      { id: "person-b", type: "person", name: "B" }
    ],
    relationships: [{
      id: "rel-1",
      subjectId: "person-a",
      objectId: "person-b",
      predicate: "workedWith",
      time: {
        type: "interval",
        start: { value: "2026-09-01", precision: "day", certainty: "exact", calendar: "gregorian" },
        end: { value: "2026-09-30", precision: "day", certainty: "exact", calendar: "gregorian" }
      }
    }]
  });

  const orb = graph.toOrbGraph(normalized);
  assert.equal(orb.nodes.length, 2);
  assert.equal(orb.edges[0].start, "person-a");
  assert.equal(orb.edges[0].end, "person-b");
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
  assert.match(css, /grid-template-columns:\s*repeat\(12,/);
});

test("app delegates temporal parsing to TimelineTemporal rather than removed legacy parser constants", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /temporal\.parse\(value\)/);
  assert.doesNotMatch(source, /DATE_PATTERN/);
  assert.match(source, /temporalRelationProjection\(state\.relationships/);
});

test("timeline view exposes fused clusters, inertia, relation bands and ambient months", async () => {
  const source = await readFile(new URL("../site/timeline-view.js", import.meta.url), "utf8");
  assert.match(source, /clusterProjectedItems/);
  assert.match(source, /startInertia/);
  assert.match(source, /renderTemporalAccents/);
  assert.match(source, /planTemporalAccents/);
  assert.match(source, /renderRelationships/);
  assert.match(source, /pulseHaptic/);
});
