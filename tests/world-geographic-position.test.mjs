import assert from "node:assert/strict";
import test from "node:test";

import {
  preserveWorldProjectionRenderContinuity,
  resolveWorldLocalLayoutPosition,
  resolveWorldRenderPosition,
} from "../src/layout/world-geographic-position.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
} from "../src/projection/world-projection.ts";

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
        certainty: 1,
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

test("world render position combines source altitude with visual separation", () => {
  assert.deepEqual(resolveWorldRenderPosition(instance()), [18.0686, 59.3293, 1020]);
});

test("local tangent offsets move presentation coordinates without mutating the anchor", () => {
  const projected = instance({
    localOffset: { eastMeters: 1000, northMeters: 1000 },
  });
  const before = JSON.stringify(projected.geographicAnchors);
  const position = resolveWorldRenderPosition(projected);

  assert.ok(position);
  assert.ok(position[0] > 18.0686);
  assert.ok(position[1] > 59.3293);
  assert.equal(position[2], 1020);
  assert.equal(JSON.stringify(projected.geographicAnchors), before);
});

test("eastward local offsets wrap cleanly across the international date line", () => {
  const projected = instance({
    geographicAnchors: [
      {
        placeId: "dateline",
        longitude: 179.999,
        latitude: 0,
        influence: 1,
      },
    ],
    visualAltitude: 500,
    localOffset: { eastMeters: 1000, northMeters: 0 },
  });

  const position = resolveWorldRenderPosition(projected);
  assert.ok(position);
  assert.ok(position[0] < -179.98);
  assert.equal(position[1], 0);
  assert.equal(position[2], 500);
});

test("the highest-influence anchor deterministically owns initial render position", () => {
  const projected = instance({
    geographicAnchors: [
      {
        placeId: "weak",
        longitude: 0,
        latitude: 0,
        certainty: 1,
        influence: 0.25,
      },
      {
        placeId: "strong",
        longitude: 12.5683,
        latitude: 55.6761,
        certainty: 0.8,
        influence: 0.9,
      },
    ],
    visualAltitude: 0,
  });

  assert.deepEqual(resolveWorldRenderPosition(projected), [12.5683, 55.6761, 0]);
});

test("unplaced world instances remain explicitly unresolved", () => {
  const projected = instance({
    geographicAnchors: [],
    visualAltitude: 1000,
    localOffset: { eastMeters: 100, northMeters: 100 },
  });

  assert.equal(resolveWorldRenderPosition(projected), null);
});

test("polar east-west offsets remain bounded instead of exploding longitude", () => {
  const projected = instance({
    geographicAnchors: [
      {
        placeId: "north-pole",
        longitude: 40,
        latitude: 90,
        influence: 1,
      },
    ],
    localOffset: { eastMeters: 5000, northMeters: 0 },
    visualAltitude: 0,
  });

  assert.deepEqual(resolveWorldRenderPosition(projected), [40, 90, 0]);
});

test("world render positions round-trip back to local tangent drag coordinates", () => {
  const projected = instance({
    localOffset: { eastMeters: 1250, northMeters: -750 },
    visualAltitude: 1450,
  });
  const world = resolveWorldRenderPosition(projected);
  assert.ok(world);

  const local = resolveWorldLocalLayoutPosition(projected, world);
  assert.ok(local);
  assert.ok(Math.abs(local.eastMeters - 1250) < 0.001);
  assert.ok(Math.abs(local.northMeters + 750) < 0.001);
  assert.equal(local.visualAltitudeMeters, 1450);
});

test("inverse local drag conversion chooses the shortest path across the date line", () => {
  const projected = instance({
    geographicAnchors: [
      {
        placeId: "dateline",
        longitude: 179.999,
        latitude: 0,
        influence: 1,
      },
    ],
    localOffset: { eastMeters: 1000, northMeters: 0 },
    visualAltitude: 500,
  });
  const world = resolveWorldRenderPosition(projected);
  assert.ok(world);
  assert.ok(world[0] < -179.98);

  const local = resolveWorldLocalLayoutPosition(projected, world);
  assert.ok(local);
  assert.ok(Math.abs(local.eastMeters - 1000) < 0.001);
  assert.ok(Math.abs(local.northMeters) < 0.001);
  assert.equal(local.visualAltitudeMeters, 500);
});

test("inverse local drag conversion preserves unplaced semantics", () => {
  const projected = instance({ geographicAnchors: [] });

  assert.equal(resolveWorldLocalLayoutPosition(projected, [18.0686, 59.3293, 1000]), null);
});

test("unchanged anchors preserve logical force state instead of semantic-zoom magnification", () => {
  const before = createWorldProjection({
    instances: [instance({ localOffset: { eastMeters: 100, northMeters: 50 } })],
    edges: [],
  });
  const after = createWorldProjection({
    instances: [instance({ temporalWeight: 0.5 })],
    edges: [],
  });
  const renderedPositions = new Map([
    [
      before.instances[0].id,
      Object.freeze({
        longitude: 18.2,
        latitude: 59.4,
        altitudeMeters: 1600,
      }),
    ],
  ]);

  const reconciled = preserveWorldProjectionRenderContinuity(
    before,
    after,
    renderedPositions,
  );

  assert.deepEqual(reconciled.instances[0].localOffset, {
    eastMeters: 100,
    northMeters: 50,
  });
  assert.equal(reconciled.instances[0].temporalWeight, 0.5);
});

test("committed temporal reprojection can preserve the renderer's exact visible position", () => {
  const before = createWorldProjection({
    instances: [instance({ localOffset: { eastMeters: 100, northMeters: 50 } })],
    edges: [],
  });
  const after = createWorldProjection({
    instances: [
      instance({
        geographicAnchors: [
          {
            placeId: "copenhagen",
            longitude: 12.5683,
            latitude: 55.6761,
            influence: 1,
          },
        ],
        localOffset: undefined,
      }),
    ],
    edges: [],
  });
  const renderedPosition = Object.freeze({
    longitude: 18.2,
    latitude: 59.4,
    altitudeMeters: 1600,
  });
  const renderedPositions = new Map([[before.instances[0].id, renderedPosition]]);

  const reconciled = preserveWorldProjectionRenderContinuity(
    before,
    after,
    renderedPositions,
  );
  const position = resolveWorldRenderPosition(reconciled.instances[0]);

  assert.ok(position);
  assert.ok(Math.abs(position[0] - renderedPosition.longitude) < 1e-9);
  assert.ok(Math.abs(position[1] - renderedPosition.latitude) < 1e-9);
  assert.ok(Math.abs(position[2] - renderedPosition.altitudeMeters) < 1e-9);
});

test("committed temporal reprojection preserves surviving node world position", () => {
  const beforeInstance = instance({
    localOffset: { eastMeters: 1250, northMeters: -750 },
    visualAltitude: 1450,
  });
  const before = createWorldProjection({ instances: [beforeInstance], edges: [] });
  const after = createWorldProjection({
    instances: [
      instance({
        geographicAnchors: [
          {
            placeId: "copenhagen",
            longitude: 12.5683,
            latitude: 55.6761,
            sourceAltitude: 5,
            certainty: 1,
            influence: 1,
          },
        ],
        temporalWeight: 0.75,
        visualAltitude: 1000,
      }),
    ],
    edges: [],
  });

  const beforePosition = resolveWorldRenderPosition(before.instances[0]);
  const reconciled = preserveWorldProjectionRenderContinuity(before, after);
  const afterPosition = resolveWorldRenderPosition(reconciled.instances[0]);

  assert.ok(beforePosition);
  assert.ok(afterPosition);
  assert.ok(Math.abs(afterPosition[0] - beforePosition[0]) < 1e-9);
  assert.ok(Math.abs(afterPosition[1] - beforePosition[1]) < 1e-9);
  assert.ok(Math.abs(afterPosition[2] - beforePosition[2]) < 1e-9);
  assert.equal(reconciled.instances[0].geographicAnchors[0].placeId, "copenhagen");
  assert.equal(reconciled.instances[0].temporalWeight, 0.75);
  assert.notDeepEqual(reconciled.instances[0].localOffset, after.instances[0].localOffset);
});
