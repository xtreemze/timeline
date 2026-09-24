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
  ]);
  const instances = Object.freeze([
    anchoredInstance("alice::a", "stockholm", 18.0686, 59.3293),
    anchoredInstance("bob::b", "stockholm", 18.0686, 59.3293),
  ]);

  const [cluster] = clusterEntityDatumsByPlace(entities, instances);
  assert.equal(cluster.kind, "cluster");
  assert.equal(cluster.clusterMembers.length, 2);
  assert.deepEqual(cluster.position, [18.0686, 59.3293, 0]);
});

test("overview place merging uses proximity across cell boundaries and the dateline", () => {
  const entities = Object.freeze([
    Object.freeze({ ...entityDatum(0), worldInstanceId: "west::a" }),
    Object.freeze({ ...entityDatum(1), worldInstanceId: "east::b" }),
  ]);
  const instances = Object.freeze([
    anchoredInstance("west::a", "west", 179.6, 0),
    anchoredInstance("east::b", "east", -179.6, 0),
  ]);

  const [cluster] = clusterEntityDatumsByPlace(entities, instances, 2);
  assert.equal(cluster.kind, "cluster");
  assert.equal(cluster.clusterMembers.length, 2);
  assert.ok(
    Math.abs(Math.abs(cluster.position[0]) - 180) < 1e-9,
    `expected dateline centroid, got ${cluster.position[0]}`,
  );
});


test("cluster transition keeps force targets retained and animates topology from the place origin", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /instanceIndexFromEntities\(transitionEntities\)/);
  assert.match(source, /interpolateClusterPosition\(origin, entity\.position, expansion\)/);
  assert.match(source, /\.\.\.placeTransition\.clusters,[\s\S]*\.\.\.placeTransition\.members/);
  assert.match(source, /temporalWidth \* edgeExpansion\(state\.edge\)/);
  assert.match(source, /worldNodeMarker\(this\.#entityStyle\(datum\)\)\.size \* entityExpansion\(datum\)/);
  assert.doesNotMatch(source, /transitions\s*:/);
});
