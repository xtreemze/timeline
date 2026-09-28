import assert from "node:assert/strict";
import test from "node:test";

import {
  SEMANTIC_ICON_NAMES,
  defaultSemanticIconForEntityType,
  normalizeEntityPresentationAttributes,
  normalizeSemanticIconName,
} from "../src/presentation/semantic-icons.ts";
import {
  auditSemanticIconQuality,
  resolveSemanticIcon,
  semanticIconReviewForEntities,
  suggestSemanticIcon,
} from "../src/presentation/semantic-icon-inference.ts";
import { TimelinePresentation, iconPathData } from "../site/event-presentation.ts";
import { TimelineGraph } from "../site/timeline-graph.ts";

test("semantic icon registry is the single rendered vocabulary", () => {
  assert.deepEqual([...TimelinePresentation.ICON_NAMES], [...SEMANTIC_ICON_NAMES]);
  assert.equal(new Set(SEMANTIC_ICON_NAMES).size, SEMANTIC_ICON_NAMES.length);
  for (const icon of SEMANTIC_ICON_NAMES) {
    assert.ok(iconPathData(icon).length > 0, `${icon}: rendered glyph path`);
  }
});

test("legacy and type aliases resolve to canonical semantic icons", () => {
  assert.equal(normalizeSemanticIconName("user"), "person");
  assert.equal(normalizeSemanticIconName("building"), "group");
  assert.equal(normalizeSemanticIconName("document"), "evidence");
  assert.equal(normalizeSemanticIconName("Wolf"), "wolf");
  assert.equal(normalizeSemanticIconName("not-a-real-icon"), null);

  assert.equal(defaultSemanticIconForEntityType("human"), "person");
  assert.equal(defaultSemanticIconForEntityType("organization"), "group");
  assert.equal(defaultSemanticIconForEntityType("pdf"), "evidence");
  assert.equal(defaultSemanticIconForEntityType("object"), "object");
  assert.equal(defaultSemanticIconForEntityType("spaceship"), null);
});

test("legacy flat entity icon metadata migrates to canonical presentation style", () => {
  assert.deepEqual(
    normalizeEntityPresentationAttributes({
      role: "witness",
      icon: "user",
      style: { shape: "diamond" },
    }),
    {
      role: "witness",
      style: { shape: "diamond", icon: "person" },
    },
  );
});

test("semantic icon validation is part of the versioned graph contract", () => {
  const contract = TimelineGraph.getGraphContract();
  assert.equal(contract.version, "2026-09-28.1");
  assert.equal(
    contract.rules.semanticIcons,
    "canonical-shared-vocabulary-with-entity-type-fallback",
  );
});

test("graph validation rejects unknown icons and normalization migrates aliases", () => {
  assert.equal(
    TimelineGraph.validateEntityNode({
      id: "bad-icon",
      type: "person",
      name: "Bad Icon",
      attributes: { style: { icon: "not-a-real-icon" } },
    }).valid,
    false,
  );

  const normalized = TimelineGraph.normalizeGraphData(
    {
      entities: [
        {
          id: "legacy-person",
          type: "person",
          name: "Legacy Person",
          attributes: { icon: "user", caseId: "A-42" },
        },
      ],
      places: [],
      relationships: [],
    },
    null,
    null,
  );
  assert.deepEqual(normalized.entities[0]?.attributes, {
    caseId: "A-42",
    style: { icon: "person" },
  });
});


test("semantic icon suggestions are deterministic and conservative", () => {
  assert.deepEqual(suggestSemanticIcon({ name: "The Wolf", type: "person" }), {
    icon: "wolf",
    confidence: "high",
    reason: "name:wolf",
  });
  assert.deepEqual(suggestSemanticIcon({ name: "Royal King", type: "person" }), {
    icon: "crown",
    confidence: "high",
    reason: "name:royal",
  });
  assert.equal(suggestSemanticIcon({ name: "Alice", type: "person" }), null);
  assert.equal(suggestSemanticIcon({ name: "Wolf Foundation", type: "organization" }), null);
});

test("semantic icon quality audit separates data validity from presentation quality", () => {
  const audit = auditSemanticIconQuality([
    {
      id: "explicit",
      name: "The Wolf",
      type: "person",
      attributes: { style: { icon: "wolf" } },
    },
    { id: "suggested", name: "The Wolf", type: "person", attributes: {} },
    { id: "fallback", name: "Alice", type: "person", attributes: {} },
    { id: "missing", name: "Unknown Vessel", type: "spaceship", attributes: {} },
    {
      id: "unsupported",
      name: "Broken",
      type: "person",
      attributes: { style: { icon: "not-real" } },
    },
  ]);

  assert.equal(audit.total, 5);
  assert.deepEqual(audit.unsupportedIconIds, ["unsupported"]);
  assert.deepEqual(audit.highConfidenceSuggestionIds, ["suggested"]);
  assert.deepEqual(audit.genericFallbackIds, ["fallback"]);
  assert.deepEqual(audit.missingIconIds, ["missing"]);
  assert.equal(audit.explicitCount, 1);
});

test("semantic icon resolution reports explicit, inferred, fallback, unsupported, and none without mutation", () => {
  const cases = [
    {
      entity: {
        id: "explicit",
        name: "The Wolf",
        type: "person",
        attributes: { style: { icon: "wolf" }, caseId: "A" },
      },
      expected: {
        icon: "wolf",
        origin: "explicit",
        confidence: null,
        reason: "authored",
        authoredIcon: "wolf",
      },
    },
    {
      entity: { id: "inferred", name: "The Wolf", type: "person", attributes: {} },
      expected: {
        icon: "wolf",
        origin: "inferred",
        confidence: "high",
        reason: "name:wolf",
        authoredIcon: null,
      },
    },
    {
      entity: { id: "fallback", name: "Alice", type: "person", attributes: {} },
      expected: {
        icon: "person",
        origin: "type-fallback",
        confidence: null,
        reason: "entity-type",
        authoredIcon: null,
      },
    },
    {
      entity: { id: "unsupported", name: "Broken", type: "person", attributes: { icon: "spaceship" } },
      expected: {
        icon: null,
        origin: "unsupported",
        confidence: null,
        reason: "unsupported-explicit-icon",
        authoredIcon: "spaceship",
      },
    },
    {
      entity: { id: "none", name: "Unknown Vessel", type: "spaceship", attributes: {} },
      expected: {
        icon: null,
        origin: "none",
        confidence: null,
        reason: "no-confident-semantic-icon",
        authoredIcon: null,
      },
    },
  ];

  for (const { entity, expected } of cases) {
    const before = structuredClone(entity);
    assert.deepEqual(resolveSemanticIcon(entity), expected);
    assert.deepEqual(entity, before, `${entity.id}: resolution must not mutate canonical data`);
  }
});

test("entity icon review carries identity and provenance without applying inferred suggestions", () => {
  const entities = [
    { id: "wolf", name: "The Wolf", type: "person", attributes: {} },
    {
      id: "queen",
      name: "Queen",
      type: "person",
      attributes: { style: { icon: "crown" } },
    },
  ];
  const before = structuredClone(entities);
  assert.deepEqual(semanticIconReviewForEntities(entities), [
    {
      entityId: "wolf",
      entityName: "The Wolf",
      entityType: "person",
      icon: "wolf",
      origin: "inferred",
      confidence: "high",
      reason: "name:wolf",
      authoredIcon: null,
    },
    {
      entityId: "queen",
      entityName: "Queen",
      entityType: "person",
      icon: "crown",
      origin: "explicit",
      confidence: null,
      reason: "authored",
      authoredIcon: "crown",
    },
  ]);
  assert.deepEqual(entities, before);
  assert.equal(entities[0].attributes.style, undefined);
});
