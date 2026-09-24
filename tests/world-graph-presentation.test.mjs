import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_NODE_INTERACTION_DIAMETER_PX,
  worldEntityGraphStyle,
  worldRelationshipGraphStyle,
  worldRelationshipVisualFamily,
} from "../site/world/world-graph-style.ts";
import { clusterWorldScreenItems } from "../src/layout/world-screen-clustering.ts";

test("semantic entity kinds resolve to deterministic shapes and selection keeps type color", () => {
  const person = worldEntityGraphStyle("person");
  const organization = worldEntityGraphStyle("organization");
  const evidence = worldEntityGraphStyle("document");
  const selectedPerson = worldEntityGraphStyle("person", true);

  assert.equal(person.shape, "circle");
  assert.equal(organization.shape, "square");
  assert.equal(evidence.shape, "diamond");
  assert.deepEqual(selectedPerson.fillColor, person.fillColor);
  assert.notDeepEqual(selectedPerson.borderColor, person.borderColor);
  assert.ok(WORLD_NODE_INTERACTION_DIAMETER_PX >= 44);
});

test("canonical predicates remain edge types while semantic families drive color", () => {
  const warned = worldRelationshipGraphStyle("warned");
  const transferred = worldRelationshipGraphStyle("transferredTo");
  const attacked = worldRelationshipGraphStyle("attacked");
  const selected = worldRelationshipGraphStyle("warned", true);

  assert.equal(warned.type, "warned");
  assert.equal(worldRelationshipVisualFamily("warned"), "communication");
  assert.equal(transferred.family, "transfer");
  assert.equal(attacked.family, "conflict");
  assert.deepEqual(selected.color.slice(0, 3), warned.color.slice(0, 3));
  assert.ok(selected.widthPx > warned.widthPx);
  assert.ok(selected.arrowWidthPx > warned.arrowWidthPx);
});

test("screen-space clustering groups overlapping footprints without geographic assumptions", () => {
  const items = Object.freeze([
    Object.freeze({ id: "a", x: 10, y: 10, radius: 12 }),
    Object.freeze({ id: "b", x: 28, y: 10, radius: 12 }),
    Object.freeze({ id: "c", x: 200, y: 200, radius: 12 }),
  ]);

  const groups = clusterWorldScreenItems(items, {
    project: (item) => ({ x: item.x, y: item.y }),
    radiusPx: (item) => item.radius,
    key: (item) => item.id,
    gapPx: 4,
  });

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.members.map((member) => member.id)),
    [["a", "b"], ["c"]],
  );
});

test("screen-space clustering is transitive and stable by semantic key", () => {
  const items = Object.freeze([
    Object.freeze({ id: "c", x: 38, y: 0 }),
    Object.freeze({ id: "a", x: 0, y: 0 }),
    Object.freeze({ id: "b", x: 19, y: 0 }),
  ]);

  const groups = clusterWorldScreenItems(items, {
    project: (item) => ({ x: item.x, y: item.y }),
    radiusPx: () => 10,
    key: (item) => item.id,
  });

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((member) => member.id), ["a", "b", "c"]);
});
