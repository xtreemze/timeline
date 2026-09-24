import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_DARK_PALETTE,
  WORLD_LIGHT_PALETTE,
  worldColorBytes,
  worldEdgeStyle,
  worldNodeStyle,
  worldPlaceStyle,
} from "../src/layout/world-graph-style.ts";

test("node defaults follow the Orb type language", () => {
  const person = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  assert.equal(person.fill, "#4b5f86");
  assert.equal(person.shape, "circle");
  assert.equal(person.icon, "person");
  assert.equal(person.border, WORLD_LIGHT_PALETTE.paper);
  assert.equal(worldNodeStyle({ type: "event" }, WORLD_LIGHT_PALETTE).shape, "diamond");
  assert.equal(worldNodeStyle({ type: "organization" }, WORLD_LIGHT_PALETTE).shape, "square");
  assert.equal(worldNodeStyle({ type: "story" }, WORLD_LIGHT_PALETTE).shape, "hexagon");
});

test("an entity's own style overrides the defaults; invalid values fall back", () => {
  const styled = worldNodeStyle(
    {
      type: "person",
      attributes: {
        style: {
          fillColor: "#ff0000",
          borderColor: "#00ff00",
          shape: "square",
          icon: "object",
          image: "https://example.test/a.png",
          size: 14,
        },
      },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(styled.fill, "#ff0000");
  assert.equal(styled.border, "#00ff00");
  assert.equal(styled.shape, "square");
  assert.equal(styled.icon, "object");
  assert.equal(styled.image, "https://example.test/a.png");
  assert.equal(styled.radius, 14);

  const invalid = worldNodeStyle(
    { type: "person", attributes: { style: { fillColor: "red; x", shape: "star" } } },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(invalid.fill, "#4b5f86");
  assert.equal(invalid.shape, "circle");
});

test("selection uses the theme focus colour in light and dark", () => {
  assert.equal(
    worldNodeStyle({ type: "person", selected: true }, WORLD_LIGHT_PALETTE).fill,
    WORLD_LIGHT_PALETTE.focus,
  );
  assert.equal(
    worldNodeStyle({ type: "person", selected: true }, WORLD_DARK_PALETTE).fill,
    WORLD_DARK_PALETTE.focus,
  );
  assert.equal(
    worldNodeStyle({ type: "thing" }, WORLD_DARK_PALETTE).fill !== WORLD_DARK_PALETTE.ink,
    true,
    "the untyped default stays visible on the dark background",
  );
});

test("places honour their map marker style", () => {
  const place = worldPlaceStyle(
    { marker: { fillColor: "#123456", color: "#abcdef", size: 24, weight: 3 } },
    false,
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(place.fill, "#123456");
  assert.equal(place.border, "#abcdef");
  assert.equal(place.borderWidth, 3);
  assert.equal(place.radius, 12);
});

test("edges colour by relationship type unless they carry their own style", () => {
  assert.equal(worldEdgeStyle({ predicate: "visits" }, WORLD_LIGHT_PALETTE).color, "#3e6d5b");
  assert.equal(worldEdgeStyle({ predicate: "calls" }, WORLD_LIGHT_PALETTE).color, "#496f8c");
  assert.equal(
    worldEdgeStyle({ predicate: "anything" }, WORLD_LIGHT_PALETTE).color,
    WORLD_LIGHT_PALETTE.focus,
  );
  const own = worldEdgeStyle(
    {
      predicate: "visits",
      attributes: { style: { color: "#010203", width: 5, lineStyle: "dashed", arrow: false } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.deepEqual([own.color, own.width, own.dashed, own.arrow], ["#010203", 5, true, false]);
});

test("colour bytes parse short, long and alpha hex", () => {
  assert.deepEqual(worldColorBytes("#fff"), [255, 255, 255, 255]);
  assert.deepEqual(worldColorBytes("#102030", 128), [16, 32, 48, 128]);
  assert.deepEqual(worldColorBytes("#10203080"), [16, 32, 48, 128]);
});
