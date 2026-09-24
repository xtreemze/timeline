import assert from "node:assert/strict";
import test from "node:test";

import {
  clusterEntityDatums,
  resolveWorldEntityClusterTier,
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

test("detail zoom restores the exact individual datum array even for dense scenes", () => {
  const entities = Object.freeze(Array.from({ length: 50_000 }, (_, index) => entityDatum(index)));

  assert.equal(shouldClusterEntityDatums(entities.length, 7.25), false);
  assert.equal(clusterEntityDatums(entities, 7.25), entities);
});

test("adaptive clustering leaves separated sparse nodes as their original datums", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(40)]);

  assert.equal(shouldClusterEntityDatums(entities.length, 1), true);
  assert.equal(clusterEntityDatums(entities, 1), entities);
});

test("cluster tiers use hysteresis around zoom boundaries", () => {
  const count = 100;

  const tierAtFour = resolveWorldEntityClusterTier(count, 4, null);
  assert.equal(tierAtFour, 8);
  assert.equal(resolveWorldEntityClusterTier(count, 4.04, tierAtFour), 8);
  assert.equal(resolveWorldEntityClusterTier(count, 4.54, tierAtFour), 8);
  assert.equal(resolveWorldEntityClusterTier(count, 4.59, tierAtFour), 9);

  const detail = resolveWorldEntityClusterTier(count, 7.02, 13);
  assert.equal(detail, 13);
  assert.equal(resolveWorldEntityClusterTier(count, 7.09, detail), -1);
});
