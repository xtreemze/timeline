import assert from "node:assert/strict";
import test from "node:test";

import {
  compactTickLabel,
  planTemporalAccents,
} from "../site/timeline-clustering.ts";

function utc(year, month, day, hour = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, 0, 0, 0);
  return date.getTime();
}

test("zoomed-in sparse windows always receive one ambient edge date", () => {
  const plan = planTemporalAccents([], {
    viewport: { start: utc(2026, 0, 15, 10), end: utc(2026, 0, 15, 16) },
    pixelLength: 900,
    padding: 64,
    orientation: "horizontal",
    spec: { unit: "hour" },
    minimumEdgeAccents: 1,
  });

  assert.equal(plan.edgeAccents.length, 1);
  assert.equal(plan.edgeAccents[0].label, "JAN 15, 2026");
  assert.equal(plan.edgeAccents[0].viewportContext, true);
});

test("active traversal can keep two or more distinct edge dates without duplicate labels", () => {
  const plan = planTemporalAccents([], {
    viewport: { start: utc(2026, 0, 15, 0), end: utc(2026, 0, 18, 0) },
    pixelLength: 900,
    padding: 64,
    orientation: "horizontal",
    spec: { unit: "hour" },
    minimumEdgeAccents: 2,
  });

  assert.ok(plan.edgeAccents.length >= 2);
  assert.equal(
    new Set(plan.edgeAccents.map((accent) => accent.label)).size,
    plan.edgeAccents.length,
  );
});

test("ambient edge identities stay stable while panning inside one calendar bucket", () => {
  const first = planTemporalAccents([], {
    viewport: { start: utc(2026, 0, 15, 8), end: utc(2026, 0, 15, 12) },
    pixelLength: 800,
    padding: 64,
    spec: { unit: "hour" },
    minimumEdgeAccents: 1,
  });
  const second = planTemporalAccents([], {
    viewport: { start: utc(2026, 0, 15, 9), end: utc(2026, 0, 15, 13) },
    pixelLength: 800,
    padding: 64,
    spec: { unit: "hour" },
    minimumEdgeAccents: 1,
  });

  assert.equal(first.edgeAccents[0].sceneTime, second.edgeAccents[0].sceneTime);
  assert.notEqual(first.edgeAccents[0].time, second.edgeAccents[0].time);
});

test("tick labels defer repeated calendar context to ambient edge dates", () => {
  const sample = utc(2026, 0, 15, 12);
  assert.equal(compactTickLabel(sample, { unit: "month" }, true), "");
  assert.equal(compactTickLabel(sample, { unit: "day" }, true), "15");
  assert.equal(compactTickLabel(sample, { unit: "week" }, true), "15");
  assert.equal(compactTickLabel(sample, { unit: "hour" }, true), "12:00");
});
