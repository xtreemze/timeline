import test from "node:test";
import assert from "node:assert/strict";
import { TimelineGraph } from "../site/timeline-graph.ts";
import {
  entityId,
  relationshipId,
  validateActionPredicate,
  validateEntityNode,
  validateRelationshipCore,
} from "../src/domain/index.ts";

test("canonical ID constructors trim and brand stable IDs at the boundary", () => {
  assert.equal(entityId("  person-1  "), "person-1");
  assert.equal(relationshipId(" rel-1 "), "rel-1");
  assert.throws(() => entityId("   "), /must not be empty/);
  assert.throws(() => relationshipId(null), /must be a string/);
});

test("domain entity validation remains in parity with the current graph contract", () => {
  const fixtures = [
    { name: "Alice", type: "person" },
    { name: "Payment", type: "transaction" },
    { name: "Alice", type: "person", attributes: { place: "Stockholm" } },
    { name: "attacks castle", type: "person" },
  ];
  for (const fixture of fixtures) {
    assert.deepEqual(validateEntityNode(fixture), TimelineGraph.validateEntityNode(fixture));
  }
});

test("domain predicate validation remains in parity with the current graph contract", () => {
  for (const predicate of ["called","transferredTo","dancesWith","relatedTo","locatedAt","called Alice","met at Stockholm",""]) {
    assert.deepEqual(validateActionPredicate(predicate), TimelineGraph.validateActionPredicate(predicate), predicate);
  }
});

test("core relationship validation rejects missing and self endpoints", () => {
  assert.equal(validateRelationshipCore({ subjectId:"person-a", predicate:"called", objectId:"person-b" }).valid, true);
  assert.equal(validateRelationshipCore({ subjectId:"person-a", predicate:"called", objectId:"person-a" }).valid, false);
  assert.equal(validateRelationshipCore({ predicate:"called" }).valid, false);
});
