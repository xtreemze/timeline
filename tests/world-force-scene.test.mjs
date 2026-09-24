import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldForceScene,
  DEFAULT_WORLD_FORCE_SCENE_POLICY,
  worldForceComponentCollisionRadiusPx,
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

  assert.equal(scene.edges[0].strength, DEFAULT_WORLD_FORCE_SCENE_POLICY.edgeStrength * 0.5);
  assert.equal(
    scene.anchors[0].influence,
    0.8 * DEFAULT_WORLD_FORCE_SCENE_POLICY.anchorInfluenceScale * 0.5,
  );
});

test("force collision radius follows the rendered node footprint", () => {
  const scene = createWorldForceScene(sampleProjection());
  const alice = scene.nodes.find((node) => node.canonicalId === "alice");
  const bob = scene.nodes.find((node) => node.canonicalId === "bob");

  assert.ok(alice);
  assert.ok(bob);
  assert.ok(alice.mass > bob.mass);
  assert.equal(alice.collisionRadiusPx, 28);
  assert.equal(bob.collisionRadiusPx, 26);
  assert.ok(alice.collisionRadiusMeters > bob.collisionRadiusMeters);
  assert.ok(
    bob.collisionRadiusMeters >= DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters,
    "low-weight nodes must never shrink below the visible/mobile footprint",
  );
});

test("default force spacing scales with the enlarged world-node footprint", () => {
  assert.equal(DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters, 360);
  assert.equal(DEFAULT_WORLD_FORCE_SCENE_POLICY.edgeRestLengthMeters, 1800);
  assert.ok(
    DEFAULT_WORLD_FORCE_SCENE_POLICY.edgeRestLengthMeters >
      DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters * 2,
  );
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
  assert.equal(alice.collisionRadiusPx, 28);
  assert.equal(alice.collisionRadiusMeters, (200 * 28) / 22);
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

test("custom visible node size expands the force body instead of clipping through neighbours", () => {
  const id = worldInstanceId("large", "styled");
  const projection = createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id,
        canonicalId: "large",
        occurrenceId: "styled",
        kind: "person",
        style: { size: 24, borderWidth: 6 },
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 0,
        retained: false,
      }),
    ],
    edges: [],
  });
  const [node] = createWorldForceScene(projection).nodes;
  assert.equal(node.collisionRadiusPx, 54);
  assert.equal(
    node.collisionRadiusMeters,
    DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters * (54 / 22),
  );
});

test("D3 component collision radius uses the largest rendered footprint", () => {
  const scene = createWorldForceScene(sampleProjection());
  assert.equal(
    worldForceComponentCollisionRadiusPx(scene.nodes),
    Math.max(...scene.nodes.map((node) => node.collisionRadiusPx)),
  );

  const tiny = scene.nodes.map((node) => ({ ...node, collisionRadiusPx: 1 }));
  assert.equal(worldForceComponentCollisionRadiusPx(tiny), 22);
});
