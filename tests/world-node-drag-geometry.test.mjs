import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorldNodeDragPosition } from "../src/interaction/world-node-drag-geometry.ts";
import { createProjectedWorldInstance } from "../src/projection/world-projection.ts";

function instance(overrides = {}) {
  return createProjectedWorldInstance({
    canonicalId: "alice",
    occurrenceId: "meeting",
    geographicAnchors: [
      {
        placeId: "stockholm",
        longitude: 18.0686,
        latitude: 59.3293,
        sourceAltitude: 20,
        influence: 1,
      },
    ],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
    visualAltitude: 1000,
    ...overrides,
  });
}

test("screen drag geometry unprojects at the node's current visual altitude", () => {
  const calls = [];
  const surface = {
    unproject(point, targetAltitudeMeters) {
      calls.push([point, targetAltitudeMeters]);
      return {
        longitude: 18.0786,
        latitude: 59.3393,
        altitudeMeters: targetAltitudeMeters,
      };
    },
  };

  const position = resolveWorldNodeDragPosition(
    surface,
    instance(),
    { x: 120, y: 80 },
  );

  assert.ok(position);
  assert.deepEqual(calls, [[{ x: 120, y: 80 }, 1020]]);
  assert.ok(position.eastMeters > 0);
  assert.ok(position.northMeters > 0);
  assert.equal(position.visualAltitudeMeters, 1000);
});

test("screen drag geometry preserves source-backed geographic anchors", () => {
  const projected = instance();
  const before = JSON.stringify(projected.geographicAnchors);
  const surface = {
    unproject(_point, targetAltitudeMeters) {
      return {
        longitude: 18.07,
        latitude: 59.33,
        altitudeMeters: targetAltitudeMeters,
      };
    },
  };

  resolveWorldNodeDragPosition(surface, projected, { x: 1, y: 2 });

  assert.equal(JSON.stringify(projected.geographicAnchors), before);
});

test("unplaced instances cannot acquire drag geography by unprojecting the screen", () => {
  let called = false;
  const surface = {
    unproject() {
      called = true;
      return { longitude: 0, latitude: 0, altitudeMeters: 1000 };
    },
  };

  assert.equal(
    resolveWorldNodeDragPosition(
      surface,
      instance({ geographicAnchors: [] }),
      { x: 10, y: 10 },
    ),
    null,
  );
  assert.equal(called, false);
});

test("failed viewport unprojection leaves the drag unresolved", () => {
  const surface = {
    unproject() {
      return null;
    },
  };

  assert.equal(
    resolveWorldNodeDragPosition(surface, instance(), { x: 10, y: 10 }),
    null,
  );
});
