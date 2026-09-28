import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SEMANTIC_ICON_NAMES,
  defaultSemanticIconForEntityType,
  normalizeEntityPresentationAttributes,
  normalizeSemanticIconName,
  semanticIconLabel,
} from "../src/presentation/semantic-icons.ts";
import {
  auditSemanticIconQuality,
  suggestSemanticIcon,
  suggestSemanticIconForPlace,
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

test("canonical place type icons are rendered and human-labeled", () => {
  const placeTypes = [
    "forest",
    "road",
    "meadow",
    "garden",
    "field",
    "tower",
    "well",
    "room",
    "kitchen",
    "gate",
    "market",
    "castle",
  ];
  for (const icon of placeTypes) {
    assert.ok(SEMANTIC_ICON_NAMES.includes(icon), `${icon}: shared registry`);
    assert.ok(iconPathData(icon).length > 0, `${icon}: rendered glyph`);
    assert.ok(semanticIconLabel(icon).length > 0, `${icon}: accessible label`);
  }
  assert.equal(semanticIconLabel("castle"), "Castle");
});

test("place icon inference is deterministic and conservative", () => {
  assert.deepEqual(suggestSemanticIconForPlace({ name: "Deep Forest" }), {
    icon: "forest",
    confidence: "high",
    reason: "place:forest",
  });
  assert.deepEqual(suggestSemanticIconForPlace({ name: "Merecourt Old Well" }), {
    icon: "well",
    confidence: "high",
    reason: "place:well",
  });
  assert.deepEqual(suggestSemanticIconForPlace({ name: "Queen's Mirror Chamber" }), {
    icon: "room",
    confidence: "high",
    reason: "place:room",
  });
  assert.deepEqual(suggestSemanticIconForPlace({ name: "Village Market" }), {
    icon: "market",
    confidence: "high",
    reason: "place:market",
  });
  assert.equal(suggestSemanticIconForPlace({ name: "Mystery Clearing" }), null);
  assert.equal(suggestSemanticIconForPlace({ name: "North Ridge" }), null);
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


test("shared semantic icons follow one Lucide-compatible monochrome stroke contract", async () => {
  const presentation = await readFile(
    new URL("../site/event-presentation.ts", import.meta.url),
    "utf8",
  );
  assert.match(presentation, /svg\.setAttribute\("fill", "none"\)/);
  assert.match(presentation, /svg\.setAttribute\("stroke", "currentColor"\)/);
  assert.match(presentation, /svg\.setAttribute\("stroke-width", "2"\)/);
  assert.match(presentation, /svg\.setAttribute\("stroke-linecap", "round"\)/);
  assert.match(presentation, /svg\.setAttribute\("stroke-linejoin", "round"\)/);
  assert.doesNotMatch(presentation, /stroke-width", "1\.8"/);

  assert.deepEqual(iconPathData("edit"), [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ]);

  for (const stylesheet of ["styles.css", "timeline-view.css", "spatial-shell.css"]) {
    const css = await readFile(new URL(`../site/${stylesheet}`, import.meta.url), "utf8");
    const overrides = css.match(/\.semantic-icon[^{}]*\{[^}]*stroke-width\s*:/gs) ?? [];
    assert.deepEqual(overrides, [], `${stylesheet}: semantic icons must inherit the shared 2px stroke`);
  }

  const orbAdapter = await readFile(
    new URL("../src/orb-graph-entry.js", import.meta.url),
    "utf8",
  );
  assert.match(orbAdapter, /color="white" stroke="currentColor" stroke-width="2"/);
  assert.doesNotMatch(orbAdapter, /stroke="white"/);
});
