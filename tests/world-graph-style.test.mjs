import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_DARK_PALETTE,
  WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  WORLD_LIGHT_PALETTE,
  worldColorBytes,
  worldEdgeStyle,
  worldNodeFootprintRadiusPx,
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
  assert.equal(styled.radius, 28);

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

test("node radii are whole pixels so a scene shares a few marker textures", () => {
  const radii = new Set(
    Array.from(
      { length: 200 },
      (_, index) =>
        worldNodeStyle({ type: "person", visualWeight: index / 199 }, WORLD_LIGHT_PALETTE).radius,
    ),
  );
  assert.deepEqual(
    [...radii].sort((a, b) => a - b),
    [18, 20, 22],
  );
  assert.equal(
    worldNodeStyle({ type: "person", attributes: { style: { size: 12.7 } } }, WORLD_LIGHT_PALETTE)
      .radius,
    26,
  );
});


test("force footprint is never smaller than the rendered node or mobile target", () => {
  for (const visualWeight of [0, 0.25, 0.5, 1]) {
    const input = { type: "person", visualWeight };
    const rendered = worldNodeStyle(input, WORLD_LIGHT_PALETTE);
    const footprint = worldNodeFootprintRadiusPx(input);
    assert.ok(footprint >= rendered.radius + rendered.borderWidth);
    assert.ok(footprint >= WORLD_ENTITY_MIN_HIT_RADIUS_PX);
  }

  const custom = {
    type: "person",
    attributes: { style: { size: 24, borderWidth: 6 } },
    visualWeight: 0,
  };
  const rendered = worldNodeStyle(custom, WORLD_LIGHT_PALETTE);
  assert.equal(rendered.radius, 48);
  assert.equal(worldNodeFootprintRadiusPx(custom), 54);
});
