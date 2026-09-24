import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  clusterEntityDatums,
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

test("working zoom restores the exact individual datum array for dense scenes", () => {
  const entities = Object.freeze(Array.from({ length: 50_000 }, (_, index) => entityDatum(index)));

  assert.equal(shouldClusterEntityDatums(entities.length, 5), false);
  assert.equal(clusterEntityDatums(entities, 5), entities);
});

test("sparse scenes retain individual detail at the default globe camera", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(1)]);

  assert.equal(shouldClusterEntityDatums(entities.length, 1), false);
  assert.equal(clusterEntityDatums(entities, 1), entities);
});


test("cluster topology is staged by force and never renderer-interpolated", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /setClusteredPlaceIds/);
  assert.match(source, /WORLD_CLUSTER_EDGE_RELEASE_MS/);
  assert.match(source, /WORLD_CLUSTER_SETTLE_MS/);
  assert.match(source, /releasingRelationshipSegments/);
  assert.match(source, /clusterPhase = "releasing"/);
  assert.match(source, /clusterPhase = "collapsing"/);
  assert.match(source, /clusterPhase = "collapsed"/);
  assert.match(source, /clusterPhase = "expanding"/);

  assert.doesNotMatch(source, /interpolateClusterPosition/);
  assert.doesNotMatch(source, /WORLD_CLUSTER_FORCE_TRANSITION_MS/);
  assert.doesNotMatch(source, /transitions:[\\s\\S]{0,300}getPosition/);
  assert.doesNotMatch(source, /transitions:[\\s\\S]{0,300}getPath/);
});
