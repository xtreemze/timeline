import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateTemporalConstraint,
  findTemporalConstraintCycles,
  validateTemporalConstraint,
} from "../src/domain/index.ts";

function envelope(id, start, end = start) {
  return {
    id,
    earliestStart: start,
    latestStart: start,
    earliestEnd: end,
    latestEnd: end,
  };
}

test("before constraints distinguish satisfied, violated, and uncertain chronology", () => {
  const constraint = {
    id: "before-a-b",
    leftId: "a",
    rightId: "b",
    kind: "before",
    mode: "validation",
  };

  assert.equal(
    evaluateTemporalConstraint(constraint, envelope("a", 10, 20), envelope("b", 30, 40)).status,
    "satisfied",
  );
  assert.equal(
    evaluateTemporalConstraint(constraint, envelope("a", 30, 40), envelope("b", 10, 20)).status,
    "violated",
  );

  const uncertainA = {
    id: "a",
    earliestStart: 10,
    latestStart: 25,
    earliestEnd: 20,
    latestEnd: 35,
  };
  const uncertainB = {
    id: "b",
    earliestStart: 30,
    latestStart: 45,
    earliestEnd: 35,
    latestEnd: 50,
  };
  assert.equal(
    evaluateTemporalConstraint(constraint, uncertainA, uncertainB).status,
    "indeterminate",
  );
});

test("overlap and containment use conservative uncertainty semantics", () => {
  const overlap = {
    id: "overlap",
    leftId: "a",
    rightId: "b",
    kind: "overlaps",
    mode: "validation",
  };
  const contains = {
    id: "contains",
    leftId: "a",
    rightId: "b",
    kind: "contains",
    mode: "validation",
  };

  assert.equal(
    evaluateTemporalConstraint(overlap, envelope("a", 10, 30), envelope("b", 20, 40)).status,
    "satisfied",
  );
  assert.equal(
    evaluateTemporalConstraint(overlap, envelope("a", 10, 15), envelope("b", 20, 25)).status,
    "violated",
  );
  assert.equal(
    evaluateTemporalConstraint(contains, envelope("a", 10, 50), envelope("b", 20, 40)).status,
    "satisfied",
  );
});

test("within-after constraints require an explicit non-negative tolerance", () => {
  const constraint = {
    id: "within",
    leftId: "a",
    rightId: "b",
    kind: "within-after",
    mode: "validation",
    maxDeltaMs: 20,
  };

  assert.deepEqual(validateTemporalConstraint(constraint), []);
  assert.equal(
    evaluateTemporalConstraint(constraint, envelope("a", 10, 20), envelope("b", 30, 30)).status,
    "satisfied",
  );
  assert.equal(
    evaluateTemporalConstraint(constraint, envelope("a", 10, 20), envelope("b", 50, 50)).status,
    "violated",
  );

  assert.match(
    validateTemporalConstraint({ ...constraint, maxDeltaMs: -1 }).join(" "),
    /non-negative/i,
  );
});

test("missing temporal facts remain indeterminate rather than fabricated", () => {
  const result = evaluateTemporalConstraint(
    {
      id: "before-missing",
      leftId: "a",
      rightId: "b",
      kind: "before",
      mode: "validation",
    },
    envelope("a", 10),
    null,
  );
  assert.equal(result.status, "indeterminate");
  assert.match(result.reason, /missing/i);
});

test("ordering constraints report dependency cycles without mutating records", () => {
  const constraints = [
    {
      id: "a-before-b",
      leftId: "a",
      rightId: "b",
      kind: "before",
      mode: "planning",
    },
    {
      id: "b-before-c",
      leftId: "b",
      rightId: "c",
      kind: "before",
      mode: "planning",
    },
    {
      id: "c-before-a",
      leftId: "c",
      rightId: "a",
      kind: "before",
      mode: "planning",
    },
  ];
  const before = JSON.stringify(constraints);
  const findings = findTemporalConstraintCycles(constraints);

  assert.equal(findings.length, 1);
  assert.deepEqual(new Set(findings[0].recordIds), new Set(["a", "b", "c"]));
  assert.equal(JSON.stringify(constraints), before);
});

test("validation constraints expose status only and never rewrite temporal facts", () => {
  const left = envelope("a", 30, 40);
  const right = envelope("b", 10, 20);
  const before = JSON.stringify({ left, right });

  const result = evaluateTemporalConstraint(
    {
      id: "evidence-order",
      leftId: "a",
      rightId: "b",
      kind: "before",
      mode: "validation",
    },
    left,
    right,
  );

  assert.equal(result.status, "violated");
  assert.equal(JSON.stringify({ left, right }), before);
});
