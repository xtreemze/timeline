import assert from "node:assert/strict";
import test from "node:test";

import {
  clusterEntityDatums,
  shouldClusterEntityDatums,
} from "../site/world/deck-world-surface.ts";

function entityDatum(index, position = [0, 0, 1000]) {
  return Object.freeze({
    kind: "entity",
    entityId: `entity-${index}`,
    worldInstanceId: `entity-${index}::occurrence-${index}`,
    position: Object.freeze(position),
    selected: false,
    visualWeight: 1,
  });
}

test("dense overview clusters overlapping screen footprints without changing canonical membership", () => {
  const entities = Object.freeze(Array.from({ length: 2_000 }, (_, index) => entityDatum(index)));

  assert.equal(shouldClusterEntityDatums(entities.length, 1), true);

  const overview = clusterEntityDatums(
    entities,
    1,
    () => ({ x: 100, y: 100 }),
  );
  assert.equal(overview.length, 1);
  assert.equal(overview[0].kind, "cluster");
  assert.equal(overview[0].clusterMembers.length, entities.length);

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

test("clustering eligibility does not hide sparse nodes whose screen footprints do not collide", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(1)]);

  assert.equal(shouldClusterEntityDatums(entities.length, 1), true);
  const rendered = clusterEntityDatums(entities, 1, (entity) =>
    entity.entityId === "entity-0" ? { x: 0, y: 0 } : { x: 200, y: 0 },
  );
  assert.equal(rendered, entities);
});

test("co-located nodes cluster at overview/working zoom and deterministically expand at detail zoom", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(1)]);

  const clustered = clusterEntityDatums(entities, 5, () => ({ x: 50, y: 50 }));
  assert.equal(clustered.length, 1);
  assert.equal(clustered[0].kind, "cluster");
  assert.deepEqual(
    clustered[0].clusterMembers.map((member) => member.entityId),
    ["entity-0", "entity-1"],
  );

  assert.equal(clusterEntityDatums(entities, 7.25), entities);
});

test("an unprojectable node remains an individual canonical render datum", () => {
  const entities = Object.freeze([entityDatum(0), entityDatum(1)]);

  const rendered = clusterEntityDatums(entities, 1, (entity) =>
    entity.entityId === "entity-0" ? null : { x: 20, y: 20 },
  );

  assert.equal(rendered, entities);
});
