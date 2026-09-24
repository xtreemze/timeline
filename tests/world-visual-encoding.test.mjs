import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_NODE_SHAPES,
  worldEntityVisualEncoding,
  worldRelationshipVisualEncoding,
} from "../src/projection/world-visual-encoding.ts";

test("entity kinds resolve to stable semantic shape, fill, and icon defaults", () => {
  const person = worldEntityVisualEncoding("person");
  const organization = worldEntityVisualEncoding("organization");
  const document = worldEntityVisualEncoding("document");

  assert.equal(person.shape, "circle");
  assert.equal(person.icon, "person");
  assert.equal(organization.shape, "square");
  assert.equal(organization.icon, "group");
  assert.equal(document.shape, "diamond");
  assert.equal(document.icon, "evidence");

  assert.notDeepEqual(person.fillColor, organization.fillColor);
  assert.notDeepEqual(organization.fillColor, document.fillColor);
});

test("node visual encoding exposes the complete semantic shape vocabulary", () => {
  assert.deepEqual(WORLD_NODE_SHAPES, [
    "circle",
    "square",
    "triangle",
    "diamond",
    "pentagon",
    "hexagon",
    "star",
    "cross",
  ]);
});

test("authored renderer-neutral presentation overrides defaults without changing semantic identity", () => {
  const encoding = worldEntityVisualEncoding("person", {
    shape: "star",
    fillColor: [12, 34, 56, 240],
    icon: "evidence",
    imageUrl: "https://example.test/alice.webp",
  });

  assert.equal(encoding.shape, "star");
  assert.deepEqual(encoding.fillColor, [12, 34, 56, 240]);
  assert.equal(encoding.icon, "evidence");
  assert.equal(encoding.imageUrl, "https://example.test/alice.webp");
  assert.equal(worldEntityVisualEncoding("person", { imageUrl: "javascript:alert(1)" }).imageUrl, undefined);
});

test("relationship predicates retain their type and receive stable distinguishable colors", () => {
  const calls = worldRelationshipVisualEncoding("calls");
  const attacks = worldRelationshipVisualEncoding("attacks");
  const callsAgain = worldRelationshipVisualEncoding(" calls ");

  assert.equal(calls.type, "calls");
  assert.equal(attacks.type, "attacks");
  assert.deepEqual(calls, callsAgain);
  assert.notDeepEqual(calls.color, attacks.color);
});
