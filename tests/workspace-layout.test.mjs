import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  clampRectToViewport,
  intersectionArea,
  planWorkspacePlacement,
} from "../src/layout/workspace-layout.ts";

const viewport = {
  x: 0,
  y: 0,
  width: 390,
  height: 844,
  safeInsets: { top: 16, right: 12, bottom: 24, left: 12 },
};

test("intersectionArea is deterministic and returns zero for edge contact", () => {
  assert.equal(
    intersectionArea(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50, width: 100, height: 100 },
    ),
    2500,
  );
  assert.equal(
    intersectionArea(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 100, y: 0, width: 100, height: 100 },
    ),
    0,
  );
});

test("viewport clamping respects safe insets without resizing a fitting rectangle", () => {
  assert.deepEqual(clampRectToViewport({ x: 360, y: 820, width: 120, height: 180 }, viewport), {
    x: 258,
    y: 640,
    width: 120,
    height: 180,
  });
});

test("oversize placement is reduced only to the safe viewport", () => {
  assert.deepEqual(clampRectToViewport({ x: -50, y: -50, width: 500, height: 900 }, viewport), {
    x: 12,
    y: 16,
    width: 366,
    height: 804,
  });
});

test("planner chooses an inward candidate that avoids protected chronology and toolbar regions", () => {
  const snapshot = planWorkspacePlacement({
    viewport,
    anchor: { x: 350, y: 700 },
    protectedRegions: [
      {
        id: "timeline-axis",
        rect: { x: 0, y: 760, width: 390, height: 60 },
      },
    ],
    exclusionZones: [
      {
        id: "right-tool-dock",
        rect: { x: 320, y: 0, width: 70, height: 844 },
      },
    ],
    candidates: [
      { id: "right", rect: { x: 350, y: 520, width: 220, height: 220 } },
      { id: "below", rect: { x: 140, y: 700, width: 220, height: 220 } },
      { id: "left", rect: { x: 90, y: 470, width: 220, height: 220 } },
    ],
  });

  assert.equal(snapshot.selected?.id, "left");
  assert.deepEqual(snapshot.selected?.rect, {
    x: 90,
    y: 470,
    width: 220,
    height: 220,
  });
  assert.deepEqual(snapshot.selected?.violations, []);
});

test("candidate selection is independent of input ordering", () => {
  const input = {
    viewport,
    anchor: { x: 195, y: 400 },
    protectedRegions: [],
    exclusionZones: [],
    candidates: [
      { id: "far", rect: { x: 20, y: 20, width: 120, height: 120 } },
      { id: "near", rect: { x: 140, y: 340, width: 120, height: 120 } },
    ],
  };
  const first = planWorkspacePlacement(input);
  const second = planWorkspacePlacement({
    ...input,
    candidates: [...input.candidates].reverse(),
  });
  assert.equal(first.selected?.id, "near");
  assert.deepEqual(second, first);
});

test("required protected regions dominate anchor proximity", () => {
  const snapshot = planWorkspacePlacement({
    viewport,
    anchor: { x: 195, y: 400 },
    protectedRegions: [
      {
        id: "year-label",
        rect: { x: 130, y: 330, width: 140, height: 140 },
      },
    ],
    candidates: [
      { id: "near-obscured", rect: { x: 140, y: 340, width: 120, height: 120 } },
      { id: "clear", rect: { x: 20, y: 500, width: 120, height: 120 } },
    ],
  });
  assert.equal(snapshot.selected?.id, "clear");
  assert.deepEqual(snapshot.selected?.violations, []);
});

test("when every candidate conflicts, planner returns least-bad placement with explicit violations", () => {
  const snapshot = planWorkspacePlacement({
    viewport: { x: 0, y: 0, width: 200, height: 200 },
    anchor: { x: 100, y: 100 },
    protectedRegions: [{ id: "timeline", rect: { x: 0, y: 0, width: 200, height: 200 } }],
    candidates: [
      { id: "large", rect: { x: 0, y: 0, width: 180, height: 180 } },
      { id: "small", rect: { x: 50, y: 50, width: 40, height: 40 } },
    ],
  });
  assert.equal(snapshot.selected?.id, "small");
  assert.deepEqual(snapshot.selected?.violations, ["protected:timeline"]);
  assert.equal(snapshot.fullySatisfiesConstraints, false);
});

test("snapshot exposes every normalized candidate and stable rejection reasons", () => {
  const snapshot = planWorkspacePlacement({
    viewport,
    exclusionZones: [{ id: "menu", rect: { x: 0, y: 0, width: 100, height: 100 } }],
    candidates: [
      { id: "blocked", rect: { x: 20, y: 20, width: 40, height: 40 } },
      { id: "open", rect: { x: 200, y: 200, width: 40, height: 40 } },
    ],
  });

  assert.deepEqual(
    snapshot.candidates.map(({ id, violations }) => ({ id, violations })),
    [
      { id: "blocked", violations: ["exclusion:menu"] },
      { id: "open", violations: [] },
    ],
  );
  assert.equal(snapshot.selected?.id, "open");
});

test("view controls consume the renderer-neutral workspace planner instead of owning a second clamping policy", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const start = app.indexOf("function positionViewControls()");
  const end = app.indexOf("function mountFullscreenToolDock()", start);
  assert.ok(start >= 0 && end > start);
  const source = app.slice(start, end);

  assert.match(
    app,
    /import \{ planWorkspacePlacement \} from '\.\.\/src\/layout\/workspace-layout\.ts'/,
  );
  assert.match(source, /planWorkspacePlacement\(/);
  assert.match(source, /exclusionZones:\s*\[[\s\S]*id:\s*"app-tool-dock"/);
  assert.match(source, /safeInsets:\s*\{ top: edge, right: edge, bottom: edge, left: edge \}/);
  assert.match(source, /dataset\.placementValid = String\(snapshot\.fullySatisfiesConstraints\)/);
  assert.doesNotMatch(source, /left = Math\.min\(Math\.max/);
  assert.doesNotMatch(source, /top = Math\.min\(Math\.max/);
});
