import assert from "node:assert/strict";
import test from "node:test";

import { clusterEntityDatums } from "../site/world/deck-world-surface.ts";
import { fitWorldCamera } from "../src/layout/world-camera-fit.ts";
import {
  createWorldForceScene,
  DEFAULT_WORLD_FORCE_SCENE_POLICY,
} from "../src/layout/world-force-scene.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function entityDatum(index, longitude, latitude) {
  return Object.freeze({
    kind: "entity",
    entityId: `entity-${index}`,
    worldInstanceId: `entity-${index}::occurrence`,
    position: Object.freeze([longitude, latitude, 1000]),
    selected: false,
    visualWeight: 1,
  });
}

test("sparse co-located nodes cluster before they become indistinguishable and expand at detail zoom", () => {
  const entities = Object.freeze([
    entityDatum(0, 18.0686, 59.3293),
    entityDatum(1, 18.0686, 59.3293),
  ]);

  const overview = clusterEntityDatums(entities, 5);
  assert.equal(overview.length, 1);
  assert.equal(overview[0].kind, "cluster");
  assert.deepEqual(overview[0].clusterMembers.map((member) => member.entityId).sort(), [
    "entity-0",
    "entity-1",
  ]);

  const detail = clusterEntityDatums(entities, 7.25);
  assert.equal(detail, entities);
});

test("nearby nodes cluster by a zoom-scaled visual-proximity cell", () => {
  const entities = Object.freeze([entityDatum(0, 18.0686, 59.3293), entityDatum(1, 18.22, 59.38)]);

  assert.equal(clusterEntityDatums(entities, 4).length, 1);
  assert.equal(clusterEntityDatums(entities, 7.25), entities);
});

test("camera fitting can choose an individual-node detail zoom for a compact scene", () => {
  const camera = fitWorldCamera(
    [
      [18.0686, 59.3293, 0],
      [18.22, 59.38, 0],
    ],
    { width: 1000, height: 700 },
    { longitude: 0, latitude: 20, zoom: 1, bearing: 0, pitch: 20 },
  );

  assert.ok(camera);
  assert.ok(
    camera.zoom >= 7,
    `expected compact scenes to fit at readable detail zoom, got ${camera.zoom}`,
  );
});

test("default force spacing cannot pull connected nodes inside their readable collision footprint", () => {
  const sourceId = worldInstanceId("source", "occurrence");
  const targetId = worldInstanceId("target", "occurrence");
  const projection = createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: sourceId,
        canonicalId: "source",
        occurrenceId: "occurrence",
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
      createProjectedWorldInstance({
        id: targetId,
        canonicalId: "target",
        occurrenceId: "occurrence",
        geographicAnchors: [],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "occurrence",
        sourceInstanceId: sourceId,
        targetInstanceId: targetId,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });

  const scene = createWorldForceScene(projection);
  const [source, target] = scene.nodes;
  const edge = scene.edges[0];

  assert.ok(DEFAULT_WORLD_FORCE_SCENE_POLICY.baseCollisionRadiusMeters >= 6_000);
  assert.ok(edge.restLengthMeters >= source.collisionRadiusMeters + target.collisionRadiusMeters);
});
