import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldForceScene,
  DEFAULT_WORLD_FORCE_SCENE_POLICY,
  worldForceComponentCollisionRadiusPx,
} from "../src/layout/world-force-scene.ts";
import { createWorldDagLayoutTargets } from "../src/layout/world-dag-layout.ts";
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
        style: { radius: 24, borderWidth: 6 },
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 0,
        retained: false,
      }),
    ],
    edges: [],
  });
  const [node] = createWorldForceScene(projection).nodes;
  assert.equal(node.collisionRadiusPx, 30);
  assert.equal(
    node.collisionRadiusMeters,
    DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters * (30 / 22),
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

function dagProjection({ reverse = false, cycle = false } = {}) {
  const alice = worldInstanceId("alice", "dag-a");
  const bob = worldInstanceId("bob", "dag-b");
  const carol = worldInstanceId("carol", "dag-c");
  const anchor = {
    placeId: "stockholm",
    longitude: 18.0686,
    latitude: 59.3293,
    influence: 1,
  };

  const instances = [
    createProjectedWorldInstance({
      id: alice,
      canonicalId: "alice",
      occurrenceId: "dag-a",
      geographicAnchors: [anchor],
      temporalWeight: 1,
      visualWeight: 1,
      retained: false,
      localOffset: { eastMeters: 40, northMeters: 25 },
    }),
    createProjectedWorldInstance({
      id: bob,
      canonicalId: "bob",
      occurrenceId: "dag-b",
      geographicAnchors: [anchor],
      temporalWeight: 1,
      visualWeight: 1,
      retained: false,
    }),
    createProjectedWorldInstance({
      id: carol,
      canonicalId: "carol",
      occurrenceId: "dag-c",
      geographicAnchors: [anchor],
      temporalWeight: 1,
      visualWeight: 1,
      retained: false,
    }),
  ];
  const edges = [
    createProjectedWorldEdge({
      id: "dag-a-b",
      sourceInstanceId: alice,
      targetInstanceId: bob,
      temporalWeight: 1,
      visible: true,
      retained: false,
    }),
    createProjectedWorldEdge({
      id: "dag-b-c",
      sourceInstanceId: bob,
      targetInstanceId: carol,
      temporalWeight: 1,
      visible: true,
      retained: false,
    }),
  ];
  if (cycle) {
    edges.push(
      createProjectedWorldEdge({
        id: "dag-c-a",
        sourceInstanceId: carol,
        targetInstanceId: alice,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    );
  }

  return createWorldProjection({
    instances: reverse ? [...instances].reverse() : instances,
    edges: reverse ? [...edges].reverse() : edges,
  });
}

test("local DAG targets use deterministic Sugiyama top-to-bottom organization", () => {
  const first = createWorldDagLayoutTargets(dagProjection());
  const reversed = createWorldDagLayoutTargets(dagProjection({ reverse: true }));

  assert.deepEqual(first, reversed);
  assert.equal(first.length, 3);

  const byId = new Map(first.map((target) => [String(target.instanceId), target]));
  const alice = byId.get(String(worldInstanceId("alice", "dag-a")));
  const bob = byId.get(String(worldInstanceId("bob", "dag-b")));
  const carol = byId.get(String(worldInstanceId("carol", "dag-c")));

  assert.ok(alice);
  assert.ok(bob);
  assert.ok(carol);
  assert.ok(alice.northMeters > bob.northMeters);
  assert.ok(bob.northMeters > carol.northMeters);
});

test("cycles are removed only from the temporary local DAG", () => {
  const projection = dagProjection({ cycle: true });
  const targets = createWorldDagLayoutTargets(projection);

  assert.equal(projection.edges.length, 3);
  assert.equal(targets.length, 3);
  assert.equal(new Set(targets.map((target) => target.instanceId)).size, 3);
  assert.ok(targets.every((target) => Number.isFinite(target.eastMeters)));
  assert.ok(targets.every((target) => Number.isFinite(target.northMeters)));
});

test("multi-anchor entities remain unique and cross-place edges do not distort local DAGs", () => {
  const alice = worldInstanceId("alice", "multi-place");
  const bob = worldInstanceId("bob", "copenhagen");
  const projection = createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: alice,
        canonicalId: "alice",
        occurrenceId: "multi-place",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            influence: 1,
          },
          {
            placeId: "copenhagen",
            longitude: 12.5683,
            latitude: 55.6761,
            influence: 0.25,
          },
        ],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
      createProjectedWorldInstance({
        id: bob,
        canonicalId: "bob",
        occurrenceId: "copenhagen",
        geographicAnchors: [
          {
            placeId: "copenhagen",
            longitude: 12.5683,
            latitude: 55.6761,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "cross-place",
        sourceInstanceId: alice,
        targetInstanceId: bob,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });

  const targets = createWorldDagLayoutTargets(projection);
  assert.equal(targets.length, 2);
  assert.equal(new Set(targets.map((target) => target.instanceId)).size, 2);
  assert.equal(targets.find((target) => target.instanceId === alice)?.placeId, "stockholm");
  assert.equal(targets.find((target) => target.instanceId === bob)?.placeId, "copenhagen");
});

test("force scenes keep current offsets while exposing soft DAG targets", () => {
  const projection = dagProjection();
  const scene = createWorldForceScene(projection);
  const alice = scene.nodes.find((node) => node.canonicalId === "alice");

  assert.ok(alice);
  assert.equal(alice.initialEastMeters, 40);
  assert.equal(alice.initialNorthMeters, 25);
  assert.ok(Number.isFinite(alice.layoutTargetEastMeters));
  assert.ok(Number.isFinite(alice.layoutTargetNorthMeters));
  assert.ok((alice.layoutTargetStrength ?? 0) > 0);
  assert.notEqual(alice.initialNorthMeters, alice.layoutTargetNorthMeters);
});

