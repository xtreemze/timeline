import assert from "node:assert/strict";
import test from "node:test";

import { createSemanticGraphIndex } from "../src/application/semantic-graph-index.ts";
import { entityId, relationshipId } from "../src/domain/ids.ts";
import { SpatialAnchorIndex } from "../src/projection/spatial-anchor-index.ts";
import { projectFocusedTopology, projectTopology } from "../src/projection/topology-projection.ts";
import { projectTopologyWorld } from "../src/projection/topology-world-projection.ts";

function entity(id) {
  return {
    id: entityId(id),
    type: "person",
    name: id.toUpperCase(),
    alternateNames: [],
    sourceIds: [],
    attributes: {},
  };
}

function relationship(id, subjectId, objectId, placeId) {
  return {
    id: relationshipId(id),
    subjectId: entityId(subjectId),
    objectId: entityId(objectId),
    predicate: "met",
    ...(placeId ? { placeId } : {}),
    itemIds: [],
    sourceIds: [],
    confidence: 1,
    time: null,
    attributes: {},
  };
}

function fixture() {
  return {
    schemaVersion: 2,
    entities: [entity("a"), entity("b"), entity("c"), entity("d")],
    relationships: [
      relationship("ab", "a", "b", "stockholm"),
      relationship("bc", "b", "c", "copenhagen"),
      relationship("cd", "c", "d"),
    ],
    items: [],
  };
}

test("topology edges define the canonical relationships materialized into the world", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const topology = projectTopology(project, index, [
    relationshipId("bc"),
    relationshipId("ab"),
  ]);
  const anchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    project.relationships,
  );

  const world = projectTopologyWorld(project.relationships, topology, anchors);

  assert.deepEqual(
    world.edges.map((edge) => String(edge.id)),
    ["ab", "bc"],
  );
  assert.equal(world.edges.some((edge) => edge.id === "cd"), false);
  assert.deepEqual(
    world.instances
      .filter((instance) => instance.canonicalId === "b")
      .map((instance) => String(instance.occurrenceId)),
    ["ab", "bc"],
  );
});

test("focused topology directly reduces the globe world scene", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const topology = projectFocusedTopology(
    project,
    index,
    [relationshipId("ab"), relationshipId("bc"), relationshipId("cd")],
    entityId("a"),
    { depth: 1, limit: 2 },
  );
  const anchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    project.relationships,
  );

  const world = projectTopologyWorld(project.relationships, topology, anchors);

  assert.deepEqual(world.edges.map((edge) => String(edge.id)), ["ab"]);
  assert.deepEqual(
    [...new Set(world.instances.map((instance) => String(instance.canonicalId)))],
    ["a", "b"],
  );
});

test("world composition preserves topology-selected temporal and retention weights", () => {
  const project = fixture();
  const index = createSemanticGraphIndex(project);
  const topology = projectTopology(project, index, [relationshipId("ab")]);
  const anchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    project.relationships,
  );

  const world = projectTopologyWorld(project.relationships, topology, anchors, {
    temporalWeights: new Map([[relationshipId("ab"), 0.5]]),
    visualWeights: new Map([[relationshipId("ab"), 0.75]]),
    retainedOccurrenceIds: new Set([relationshipId("ab")]),
  });

  assert.ok(world.instances.every((instance) => instance.temporalWeight === 0.5));
  assert.ok(world.instances.every((instance) => instance.visualWeight === 0.75));
  assert.ok(world.instances.every((instance) => instance.retained));
  assert.equal(world.edges[0].temporalWeight, 0.5);
  assert.equal(world.edges[0].retained, true);
});

test("topology cannot smuggle a noncanonical relationship into WorldProjection", () => {
  const project = fixture();
  const anchors = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    project.relationships,
  );

  assert.throws(
    () =>
      projectTopologyWorld(
        project.relationships,
        {
          nodes: [],
          edges: [
            {
              id: relationshipId("missing"),
              sourceId: entityId("a"),
              targetId: entityId("b"),
              label: "invented",
            },
          ],
        },
        anchors,
      ),
    /not present in canonical relationships/,
  );
});
