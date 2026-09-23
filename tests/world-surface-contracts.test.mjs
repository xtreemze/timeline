import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldCameraState,
  createWorldSpatialPosition,
  createWorldTemporalWindow,
  worldSelectionFromHit,
} from "../src/layout/world-surface.ts";

test("world camera validates globe coordinates and normalizes bearing", () => {
  assert.deepEqual(
    createWorldCameraState({
      longitude: 18.0686,
      latitude: 59.3293,
      zoom: 3,
      bearing: 540,
      pitch: 35,
    }),
    {
      longitude: 18.0686,
      latitude: 59.3293,
      zoom: 3,
      bearing: -180,
      pitch: 35,
    },
  );

  assert.throws(
    () =>
      createWorldCameraState({
        longitude: 181,
        latitude: 0,
        zoom: 1,
        bearing: 0,
        pitch: 0,
      }),
    /longitude/,
  );

  assert.throws(
    () =>
      createWorldCameraState({
        longitude: 0,
        latitude: 91,
        zoom: 1,
        bearing: 0,
        pitch: 0,
      }),
    /latitude/,
  );

  assert.throws(
    () =>
      createWorldCameraState({
        longitude: 0,
        latitude: 0,
        zoom: -1,
        bearing: 0,
        pitch: 0,
      }),
    /zoom/,
  );

  assert.throws(
    () =>
      createWorldCameraState({
        longitude: 0,
        latitude: 0,
        zoom: 1,
        bearing: 0,
        pitch: 90,
      }),
    /pitch/,
  );
});

test("world spatial positions validate renderer-neutral globe coordinates", () => {
  assert.deepEqual(
    createWorldSpatialPosition({
      longitude: 18.0686,
      latitude: 59.3293,
      altitudeMeters: 1200,
    }),
    {
      longitude: 18.0686,
      latitude: 59.3293,
      altitudeMeters: 1200,
    },
  );

  assert.throws(
    () =>
      createWorldSpatialPosition({
        longitude: 181,
        latitude: 0,
        altitudeMeters: 0,
      }),
    /longitude/,
  );
  assert.throws(
    () =>
      createWorldSpatialPosition({
        longitude: 0,
        latitude: 91,
        altitudeMeters: 0,
      }),
    /latitude/,
  );
});

test("world temporal window preserves exact inclusive bounds", () => {
  assert.deepEqual(createWorldTemporalWindow({ start: 100, end: 100 }), {
    start: 100,
    end: 100,
  });

  assert.throws(
    () => createWorldTemporalWindow({ start: 200, end: 100 }),
    /greater than or equal/,
  );
});

test("world hits map immediately back to canonical selection IDs", () => {
  assert.deepEqual(
    worldSelectionFromHit({
      kind: "entity",
      entityId: "alice",
      worldInstanceId: "[\"alice\",\"meeting\"]",
      depth: 0.2,
    }),
    { kind: "entity", id: "alice" },
  );

  assert.deepEqual(
    worldSelectionFromHit({
      kind: "relationship",
      relationshipId: "meeting",
      depth: 0.4,
    }),
    { kind: "relationship", id: "meeting" },
  );

  assert.deepEqual(
    worldSelectionFromHit({
      kind: "place",
      placeId: "stockholm",
      depth: 0.8,
    }),
    { kind: "place", id: "stockholm" },
  );

  assert.equal(worldSelectionFromHit({ kind: "background" }), null);
  assert.equal(worldSelectionFromHit(null), null);
});

test("rendered world-instance identity never replaces canonical entity selection", () => {
  const stockholm = worldSelectionFromHit({
    kind: "entity",
    entityId: "alice",
    worldInstanceId: "[\"alice\",\"stockholm-meeting\"]",
  });
  const copenhagen = worldSelectionFromHit({
    kind: "entity",
    entityId: "alice",
    worldInstanceId: "[\"alice\",\"copenhagen-meeting\"]",
  });

  assert.deepEqual(stockholm, copenhagen);
  assert.deepEqual(stockholm, { kind: "entity", id: "alice" });
});
