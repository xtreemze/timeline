import assert from "node:assert/strict";
import test from "node:test";

import {
  SEMANTIC_ICON_NAMES,
  defaultSemanticIconForEntityType,
  normalizeEntityPresentationAttributes,
  normalizeSemanticIconName,
} from "../src/presentation/semantic-icons.ts";
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
