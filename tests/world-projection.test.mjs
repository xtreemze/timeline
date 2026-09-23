import assert from "node:assert/strict";
import test from "node:test";

import {
  createProjectedWorldInstance,
  createSpatialAnchor,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

test("world instance identity separates occurrence context from canonical entity identity", () => {
  const stockholm = worldInstanceId("alice", "alice-in-stockholm");
  const copenhagen = worldInstanceId("alice", "alice-in-copenhagen");
  const persistent = worldInstanceId("alice");

  assert.notEqual(stockholm, copenhagen);
  assert.notEqual(stockholm, persistent);
  assert.equal(stockholm, worldInstanceId("alice", "alice-in-stockholm"));
});

test("one canonical entity may have multiple immutable world instances", () => {
  const stockholm = createProjectedWorldInstance({
    canonicalId: "alice",
    occurrenceId: "alice-in-stockholm",
    geographicAnchors: [
      {
        placeId: "stockholm",
        longitude: 18.0686,
        latitude: 59.3293,
        certainty: 1,
        influence: 1,
      },
    ],
    temporalWeight: 1,
    visualWeight: 0.8,
    retained: false,
    visualAltitude: 1200,
    localOffset: { eastMeters: 20, northMeters: -10 },
  });

  const copenhagen = createProjectedWorldInstance({
    canonicalId: "alice",
    occurrenceId: "alice-in-copenhagen",
    geographicAnchors: [
      {
        placeId: "copenhagen",
        longitude: 12.5683,
        latitude: 55.6761,
        certainty: 0.9,
        precisionRadiusMeters: 50,
        influence: 0.85,
      },
    ],
    temporalWeight: 0.75,
    visualWeight: 1,
    retained: true,
  });

  assert.equal(stockholm.canonicalId, copenhagen.canonicalId);
  assert.notEqual(stockholm.id, copenhagen.id);
  assert.equal(stockholm.geographicAnchors[0].placeId, "stockholm");
  assert.equal(copenhagen.geographicAnchors[0].placeId, "copenhagen");
  assert.equal(Object.isFrozen(stockholm), true);
  assert.equal(Object.isFrozen(stockholm.geographicAnchors), true);
  assert.equal(Object.isFrozen(stockholm.geographicAnchors[0]), true);
});

test("spatial anchors validate geographic and evidentiary bounds", () => {
  assert.throws(
    () =>
      createSpatialAnchor({
        placeId: "invalid",
        longitude: 181,
        latitude: 0,
        influence: 1,
      }),
    /Longitude/,
  );

  assert.throws(
    () =>
      createSpatialAnchor({
        placeId: "invalid",
        longitude: 0,
        latitude: -91,
        influence: 1,
      }),
    /Latitude/,
  );

  assert.throws(
    () =>
      createSpatialAnchor({
        placeId: "invalid",
        longitude: 0,
        latitude: 0,
        certainty: 1.1,
        influence: 1,
      }),
    /Certainty/,
  );

  assert.throws(
    () =>
      createSpatialAnchor({
        placeId: "invalid",
        longitude: 0,
        latitude: 0,
        precisionRadiusMeters: -1,
        influence: 1,
      }),
    /Precision radius/,
  );
});

test("world projection is deterministic and validates instance references", () => {
  const aliceId = worldInstanceId("alice", "meeting");
  const bobId = worldInstanceId("bob", "meeting");

  const projection = createWorldProjection({
    instances: [
      {
        id: bobId,
        canonicalId: "bob",
        occurrenceId: "meeting",
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      },
      {
        id: aliceId,
        canonicalId: "alice",
        occurrenceId: "meeting",
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      },
    ],
    edges: [
      {
        id: "meeting",
        sourceInstanceId: aliceId,
        targetInstanceId: bobId,
        temporalWeight: 1,
        visible: true,
        retained: false,
      },
    ],
  });

  assert.deepEqual(
    projection.instances.map((instance) => instance.canonicalId),
    ["alice", "bob"],
  );
  assert.equal(projection.edges[0].sourceInstanceId, aliceId);
  assert.equal(projection.edges[0].targetInstanceId, bobId);

  assert.throws(
    () =>
      createWorldProjection({
        instances: projection.instances,
        edges: [
          {
            id: "missing-target",
            sourceInstanceId: aliceId,
            targetInstanceId: worldInstanceId("missing"),
            temporalWeight: 1,
            visible: true,
            retained: false,
          },
        ],
      }),
    /missing target instance/,
  );
});

test("derived altitude and local offsets stay presentation-only inputs", () => {
  const canonicalEntity = Object.freeze({ id: "alice", label: "Alice" });

  const instance = createProjectedWorldInstance({
    canonicalId: canonicalEntity.id,
    occurrenceId: "meeting",
    geographicAnchors: [],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
    visualAltitude: 2500,
    localOffset: { eastMeters: 125, northMeters: 50 },
  });

  assert.deepEqual(canonicalEntity, { id: "alice", label: "Alice" });
  assert.equal(instance.visualAltitude, 2500);
  assert.deepEqual(instance.localOffset, { eastMeters: 125, northMeters: 50 });
  assert.equal("visualAltitude" in canonicalEntity, false);
  assert.equal("localOffset" in canonicalEntity, false);
});

test("world presentation metadata is normalized without changing canonical identity", () => {
  const instance = createProjectedWorldInstance({
    canonicalId: "alice",
    label: "  Alice Example  ",
    kind: " person ",
    occurrenceId: "meeting",
    geographicAnchors: [
      {
        placeId: "stockholm",
        label: " Stockholm ",
        longitude: 18.0686,
        latitude: 59.3293,
        influence: 1,
      },
    ],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
  });

  assert.equal(instance.canonicalId, "alice");
  assert.equal(instance.label, "Alice Example");
  assert.equal(instance.kind, "person");
  assert.equal(instance.geographicAnchors[0].label, "Stockholm");
});
