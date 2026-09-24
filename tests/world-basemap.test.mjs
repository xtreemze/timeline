import assert from "node:assert/strict";
import test from "node:test";

import { clipWorldLines, worldGraticule } from "../site/world/world-basemap.ts";

test("graticule lines are densified so chords hug the sphere", () => {
  const lines = worldGraticule(30);
  assert.ok(lines.length > 0);
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const [a, b] = [line[index - 1], line[index]];
      assert.ok(Math.abs(b[0] - a[0]) <= 2 + 1e-9 && Math.abs(b[1] - a[1]) <= 2 + 1e-9);
    }
  }
});

test("clipping keeps only runs near the view, including edges that cross it", () => {
  const line = [
    [-20, 0, 0],
    [-10, 0, 0],
    [0, 0, 0],
    [10, 0, 0],
    [20, 0, 0],
  ];
  const clipped = clipWorldLines([line], { west: -1, east: 1, south: -1, north: 1 });
  assert.deepEqual(clipped, [
    [
      [-10, 0, 0],
      [0, 0, 0],
      [10, 0, 0],
    ],
  ]);
  assert.deepEqual(clipWorldLines([line], { west: 50, east: 60, south: -1, north: 1 }), []);
});

test("clipping handles a view that straddles the antimeridian", () => {
  const line = [
    [170, 0, 0],
    [179, 0, 0],
    [-179, 0, 0],
    [-170, 0, 0],
  ];
  const clipped = clipWorldLines([line], { west: 175, east: -175, south: -5, north: 5 });
  assert.equal(clipped.length, 1);
  assert.equal(clipped[0].length, 4);
});
