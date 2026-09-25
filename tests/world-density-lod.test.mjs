import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  clusterEntityDatums,
  clusterEntityDatumsByPlace,
  shouldClusterEntityDatums,
} from "../site/world/deck-world-surface.ts";

function entityDatum(index) {
  return Object.freeze({
    kind: "entity",
    entityId: `entity-${index}`,
    worldInstanceId: `entity-${index}::occurrence-${index}`,
    position: Object.freeze([-170 + (index % 340), -80 + (index % 160), 1000]),
    selected: false,
    visualWeight: 1,
  });
}

test("dense globe overview enables presentation-only clustering without changing canonical membership", () => {
  const entities = Object.freeze(Array.from({ length: 50_000 }, (_, index) => entityDatum(index)));

  assert.equal(shouldClusterEntityDatums(entities.length, 1), true);

  const overview = clusterEntityDatums(entities, 1);
  assert.ok(overview.length < 5_000);
  assert.ok(overview.some((datum) => datum.kind === "cluster"));

  const represented = overview.reduce(
    (count, datum) => count + (datum.kind === "cluster" ? datum.clusterMembers.length : 1),
    0,
  );
  assert.equal(represented, entities.length);
});

test("dense scenes remain clustered farther into zoom before restoring exact detail", () => {
  const entities = Object.freeze(Array.from({ length: 50_000 }, (_, index) => entityDatum(index)));

  assert.equal(shouldClusterEntityDatums(entities.length, 5), true);
  assert.ok(clusterEntityDatums(entities, 5).some((datum) => datum.kind === "cluster"));
  assert.equal(shouldClusterEntityDatums(entities.length, 5.5), false);
  assert.equal(clusterEntityDatums(entities, 5.5), entities);
});

test("sparse scenes retain individual detail at the default globe camera", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(1)]);

  assert.equal(shouldClusterEntityDatums(entities.length, 1), false);
  assert.equal(clusterEntityDatums(entities, 1), entities);
});

test("a two-node proximity bucket is never clustered inside a larger overview scene", () => {
  const pairA = entityDatum(0);
  const pairB = entityDatum(1);
  const far = Object.freeze({
    ...entityDatum(2),
    position: Object.freeze([40, 40, 1000]),
  });
  const entities = Object.freeze([pairA, pairB, far]);

  assert.equal(shouldClusterEntityDatums(entities.length, 1), true);
  const overview = clusterEntityDatums(entities, 1);
  assert.equal(overview.some((datum) => datum.kind === "cluster"), false);
  assert.deepEqual(
    overview.map((datum) => datum.worldInstanceId).sort(),
    entities.map((datum) => datum.worldInstanceId).sort(),
  );
});

function anchoredInstance(id, placeId, longitude, latitude) {
  return Object.freeze({
    id,
    geographicAnchors: Object.freeze([
      Object.freeze({
        placeId,
        longitude,
        latitude,
        sourceAltitude: 0,
      }),
    ]),
  });
}

test("place clustering is stable even when force-resolved members cross overview grid cells", () => {
  const entities = Object.freeze([
    Object.freeze({
      ...entityDatum(0),
      worldInstanceId: "alice::a",
      position: Object.freeze([-5.9, 0, 1000]),
    }),
    Object.freeze({
      ...entityDatum(1),
      worldInstanceId: "bob::b",
      position: Object.freeze([5.9, 0, 1000]),
    }),
    Object.freeze({
      ...entityDatum(2),
      worldInstanceId: "carol::c",
      position: Object.freeze([0, 5.9, 1000]),
    }),
  ]);
  const instances = Object.freeze([
    anchoredInstance("alice::a", "stockholm", 18.0686, 59.3293),
    anchoredInstance("bob::b", "stockholm", 18.0686, 59.3293),
    anchoredInstance("carol::c", "stockholm", 18.0686, 59.3293),
  ]);

  const [cluster] = clusterEntityDatumsByPlace(entities, instances);
  assert.equal(cluster.kind, "cluster");
  assert.equal(cluster.clusterMembers.length, 3);
  assert.deepEqual(cluster.position, [18.0686, 59.3293, 0]);
});

test("two same-place nodes remain individual instead of entering cluster presentation", () => {
  const entities = Object.freeze([
    Object.freeze({ ...entityDatum(0), worldInstanceId: "alice::a" }),
    Object.freeze({ ...entityDatum(1), worldInstanceId: "bob::b" }),
  ]);
  const instances = Object.freeze([
    anchoredInstance("alice::a", "stockholm", 18.0686, 59.3293),
    anchoredInstance("bob::b", "stockholm", 18.0686, 59.3293),
  ]);

  const result = clusterEntityDatumsByPlace(entities, instances);
  assert.equal(result.some((datum) => datum.kind === "cluster"), false);
  assert.deepEqual(
    result.map((datum) => datum.worldInstanceId).sort(),
    ["alice::a", "bob::b"],
  );
});

test("overview place merging uses proximity across cell boundaries and the dateline", () => {
  const entities = Object.freeze([
    Object.freeze({ ...entityDatum(0), worldInstanceId: "west::a" }),
    Object.freeze({ ...entityDatum(1), worldInstanceId: "east::b" }),
    Object.freeze({ ...entityDatum(2), worldInstanceId: "middle::c" }),
  ]);
  const instances = Object.freeze([
    anchoredInstance("west::a", "west", 179.6, 0),
    anchoredInstance("east::b", "east", -179.6, 0),
    anchoredInstance("middle::c", "middle", 179.9, 0),
  ]);

  const [cluster] = clusterEntityDatumsByPlace(entities, instances, 2);
  assert.equal(cluster.kind, "cluster");
  assert.equal(cluster.clusterMembers.length, 3);
  assert.ok(
    Math.abs(Math.abs(cluster.position[0]) - 180) < 0.1,
    `expected dateline centroid, got ${cluster.position[0]}`,
  );
});

test("place-marker aggregation requires three distinct places, not merely three nodes", () => {
  const entities = Object.freeze([
    Object.freeze({ ...entityDatum(0), worldInstanceId: "a1::a" }),
    Object.freeze({ ...entityDatum(1), worldInstanceId: "a2::b" }),
    Object.freeze({ ...entityDatum(2), worldInstanceId: "b1::c" }),
    Object.freeze({ ...entityDatum(3), worldInstanceId: "b2::d" }),
  ]);
  const instances = Object.freeze([
    anchoredInstance("a1::a", "near-a", 12, 41),
    anchoredInstance("a2::b", "near-a", 12, 41),
    anchoredInstance("b1::c", "near-b", 12.02, 41),
    anchoredInstance("b2::d", "near-b", 12.02, 41),
  ]);

  assert.ok(
    clusterEntityDatumsByPlace(entities, instances, 1).some((datum) => datum.kind === "cluster"),
    "node topology may cluster because the component contains four nodes",
  );
  assert.equal(
    clusterEntityDatumsByPlace(entities, instances, 1, 3).some(
      (datum) => datum.kind === "cluster",
    ),
    false,
    "two nearby place pins remain distinct even when they contain several nodes",
  );
});

test("cluster lifecycle is discrete, force-resolved, and cleans clustered topology", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /worldClusterExpansionProgress/);
  assert.doesNotMatch(source, /interpolateClusterPosition/);
  assert.doesNotMatch(source, /transitions:/);
  assert.doesNotMatch(source, /placeClusterTransitionDatums/);

  assert.match(source, /#clusterPhase = "releasing"/);
  assert.match(source, /releasingRelationships/);
  assert.match(source, /WORLD_CLUSTER_EDGE_RELEASE_MS/);
  assert.match(source, /#clusterPhase = "collapsing"/);
  assert.match(
    source,
    /setClusteredPlaceIds\(\s*this\.#clusterPlaceIds,\s*this\.#clusterPlaceIds,?\s*\)/,
  );

  assert.match(source, /#clusterPhase = "expanding"/);
  assert.match(
    source,
    /setClusteredPlaceIds\(\s*Object\.freeze\(\[\] as PlaceId\[\]\),\s*this\.#clusterPlaceIds,?\s*\)/,
  );
  assert.match(
    source,
    /setClusteredPlaceIds\(\s*Object\.freeze\(\[\] as PlaceId\[\]\),\s*Object\.freeze\(\[\] as PlaceId\[\]\),?\s*\)/,
  );

  assert.match(source, /clusterPhase === "collapsed"[\s\S]*entityResult\.datums\.filter/);
  assert.match(source, /activeTemporalRelationships = temporalRelationships\.filter/);
  assert.match(source, /visibleDirectionRelationships = relationships\.filter/);
  assert.match(source, /tetherEntities =[\s\S]*!memberIds\.has\(entity\.worldInstanceId\)/);
});
