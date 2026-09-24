import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  relationshipBandSceneKey,
  temporalAccentSceneKey,
  tickSceneKey,
} from "../src/projection/temporal-scene.ts";

test("tick identity ignores mutable formatting and spacing metadata", () => {
  const value = Date.parse("2024-01-01T00:00:00Z");
  assert.equal(
    tickSceneKey({ unit: "year", value }),
    tickSceneKey({ unit: "year", value, label: "2024 CE", step: 10 }),
  );
  assert.equal(tickSceneKey({ unit: "year", value }), `tick:year:${value}`);
});

test("temporal accent identity ignores mutable display labels", () => {
  const time = Date.parse("2024-01-01T00:00:00Z");
  assert.equal(
    temporalAccentSceneKey({ kind: "year", time, label: "2024" }),
    temporalAccentSceneKey({ kind: "year", time, label: "2024 CE" }),
  );
  assert.equal(temporalAccentSceneKey({ kind: "year", time }), `accent:year:${time}`);
});

test("relationship band identity is the canonical relationship identity", () => {
  assert.equal(relationshipBandSceneKey(" rel-17 "), "relationship-band:rel-17");
  assert.throws(
    () => relationshipBandSceneKey(""),
    /stable canonical relationship id/i,
  );
});

test("retained renderer keys context nodes and bands rather than recreating them", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /tickSceneKey\(\{ unit: tick\.spec\.unit, value: tick\.value \}\)/);
  assert.match(source, /temporalAccentSceneKey\(/);
  assert.match(source, /relationshipBandScene = new Map<string, HTMLDivElement>/);
  assert.match(source, /relationshipBandSceneKey\(relationship\.id\)/);
  assert.match(source, /itemOverlapsWindow\(relationship, this\.retention\.extent\)/);
  assert.match(source, /segment\.hidden = !visible/);
  assert.doesNotMatch(
    source,
    /renderRelationshipBands[\s\S]{0,3000}replaceChildren/,
  );
});

test("offscreen relationship endpoints are clipped without destroying retained identity", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /Math\.max\(\s*this\.viewport\.start,\s*Math\.min\(relationship\.start, relationship\.end\),?\s*\)/,
  );
  assert.match(
    source,
    /Math\.min\(\s*this\.viewport\.end,\s*Math\.max\(relationship\.start, relationship\.end\),?\s*\)/,
  );
  assert.match(source, /if \(!this\.retention\.active\)[\s\S]*relationshipBandScene/);
});
