import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WORLD_FORCE_SCENE_POLICY,
  createWorldForceScene,
} from "../src/layout/world-force-scene.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function sampleProjection() {
  const alice = worldInstanceId("alice", "meeting");
  const bob = worldInstanceId("bob", "meeting");

  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: alice,
        canonicalId: "alice",
        occurrenceId: "meeting",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            sourceAltitude: 15,
            influence: 0.8,
            precisionRadiusMeters: 25,
          },
        ],
        temporalWeight: 0.5,
        visualWeight: 1,
        retained: false,
        visualAltitude: 1200,
        localOffset: { eastMeters: 40, northMeters: -20 },
      }),
      createProjectedWorldInstance({
        id: bob,
        canonicalId: "bob",
        occurrenceId: "meeting",
        geographicAnchors: [],
        temporalWeight: 0.5,
        visualWeight: 0.25,
        retained: false,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "meeting",
        sourceInstanceId: alice,
        targetInstanceId: bob,
        temporalWeight: 0.5,
        visible: true,
        retained: false,
      }),
    ],
  });
}

test("WorldProjection composes into a deterministic force scene without place nodes", () => {
  const scene = createWorldForceScene(sampleProjection());

  assert.equal(scene.nodes.length, 2);
  assert.equal(scene.edges.length, 1);
  assert.equal(scene.anchors.length, 1);

  assert.deepEqual(
    scene.nodes.map((node) => node.canonicalId),
    ["alice", "bob"],
  );
  assert.equal(scene.anchors[0].placeId, "stockholm");
  assert.equal(
    scene.nodes.some((node) => node.canonicalId === "stockholm"),
    false,
  );
});

test("force nodes preserve derived local offset and target visual altitude", () => {
  const scene = createWorldForceScene(sampleProjection());
  const alice = scene.nodes.find((node) => node.canonicalId === "alice");

  assert.ok(alice);
  assert.equal(alice.initialEastMeters, 40);
  assert.equal(alice.initialNorthMeters, -20);
  assert.equal(alice.targetVisualAltitudeMeters, 1200);
});

test("temporal weight modulates edge and anchor influence without changing topology", () => {
  const scene = createWorldForceScene(sampleProjection());

  assert.equal(
    scene.edges[0].strength,
    DEFAULT_WORLD_FORCE_SCENE_POLICY.edgeStrength * 0.5,
  );
  assert.equal(
    scene.anchors[0].influence,
    0.8 * DEFAULT_WORLD_FORCE_SCENE_POLICY.anchorInfluenceScale * 0.5,
  );
});

test("visual weight affects layout mass/collision policy only", () => {
  const scene = createWorldForceScene(sampleProjection());
  const alice = scene.nodes.find((node) => node.canonicalId === "alice");
  const bob = scene.nodes.find((node) => node.canonicalId === "bob");

  assert.ok(alice);
  assert.ok(bob);
  assert.ok(alice.mass > bob.mass);
  assert.ok(alice.collisionRadiusMeters > bob.collisionRadiusMeters);
});

test("custom policy remains explicit and deterministic", () => {
  const scene = createWorldForceScene(sampleProjection(), {
    baseMass: 2,
    visualWeightMassScale: 3,
    baseCollisionRadiusMeters: 200,
    edgeStrength: 0.2,
    edgeRestLengthMeters: 900,
    anchorInfluenceScale: 0.5,
  });

  const alice = scene.nodes.find((node) => node.canonicalId === "alice");
  assert.ok(alice);
  assert.equal(alice.mass, 5);
  assert.equal(alice.collisionRadiusMeters, 250);
  assert.equal(scene.edges[0].strength, 0.1);
  assert.equal(scene.edges[0].restLengthMeters, 900);
  assert.equal(scene.anchors[0].influence, 0.2);
});

test("invalid force policy values fail before reaching a backend", () => {
  assert.throws(
    () =>
      createWorldForceScene(sampleProjection(), {
        ...DEFAULT_WORLD_FORCE_SCENE_POLICY,
        edgeRestLengthMeters: 0,
      }),
    /rest length/,
  );

  assert.throws(
    () =>
      createWorldForceScene(sampleProjection(), {
        ...DEFAULT_WORLD_FORCE_SCENE_POLICY,
        anchorInfluenceScale: -1,
      }),
    /anchor influence/,
  );
});
