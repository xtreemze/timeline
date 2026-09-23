import assert from "node:assert/strict";
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
