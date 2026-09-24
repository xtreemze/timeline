import assert from "node:assert/strict";
import test from "node:test";

import {
  declutterWorldLabels,
  worldLabelTierFloor,
} from "../src/layout/world-semantic-presentation.ts";

const box = (longitude, latitude, text, pinned = false) => ({ longitude, latitude, text, pinned });
const measure = (label) => ({
  longitude: label.longitude,
  latitude: label.latitude,
  width: label.text.length * 7 + 8,
  height: 16,
});

test("co-located labels keep only the highest-priority one unless pinned", () => {
  const labels = [
    box(10, 50, "Castle Great Hall"),
    box(10.001, 50.001, "Castle Kitchen"),
    box(10.002, 50, "Castle Chapel", true),
    box(40, 10, "Far Away Town"),
  ];
  const kept = declutterWorldLabels(labels, {
    zoom: 3,
    measure,
    isPinned: (label) => label.pinned,
  }).map((label) => label.text);
  assert.deepEqual(kept, ["Castle Great Hall", "Castle Chapel", "Far Away Town"]);
});

test("zooming in far enough separates previously overlapping labels", () => {
  const labels = [box(10, 50, "Castle Great Hall"), box(10.05, 50.05, "Castle Kitchen")];
  const options = { measure, isPinned: () => false };
  assert.equal(declutterWorldLabels(labels, { ...options, zoom: 3 }).length, 1);
  assert.equal(declutterWorldLabels(labels, { ...options, zoom: 12 }).length, 2);
});

test("the tier floor is the most zoomed-out zoom of the current LOD tier", () => {
  assert.equal(worldLabelTierFloor(0.8), 0);
  assert.equal(worldLabelTierFloor(3.9), 3);
  assert.equal(worldLabelTierFloor(5), 5);
  assert.equal(worldLabelTierFloor(11), 7);
});
