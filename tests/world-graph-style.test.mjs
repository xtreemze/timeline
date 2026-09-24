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

test("selection preserves semantic colours and increases emphasis instead", () => {
  const normal = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  const selected = worldNodeStyle({ type: "person", selected: true }, WORLD_LIGHT_PALETTE);
  assert.equal(selected.fill, normal.fill);
  assert.equal(selected.border, normal.border);
  assert.ok(selected.borderWidth > normal.borderWidth);
  assert.ok(selected.radius > normal.radius);

  const authored = worldNodeStyle(
    {
      type: "person",
      selected: true,
      attributes: { style: { fill: "#123456", stroke: "#abcdef" } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(authored.fill, "#123456");
  assert.equal(authored.border, "#abcdef");
  assert.equal(
    worldNodeStyle({ type: "thing" }, WORLD_DARK_PALETTE).fill !== WORLD_DARK_PALETTE.ink,
    true,
    "the untyped default stays visible on the dark background",
  );
});

test("selection and connected-neighborhood emphasis preserve semantic colours", () => {
  const ordinary = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  const neighbor = worldNodeStyle(
    { type: "person", emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  const selected = worldNodeStyle(
    { type: "person", selected: true, emphasized: true },
    WORLD_LIGHT_PALETTE,
  );

  assert.equal(neighbor.fill, ordinary.fill);
  assert.equal(neighbor.border, ordinary.border);
  assert.ok(neighbor.borderWidth > ordinary.borderWidth);
  assert.ok(neighbor.radius > ordinary.radius);
  assert.equal(selected.fill, ordinary.fill);
  assert.equal(selected.border, ordinary.border);
  assert.ok(selected.borderWidth > neighbor.borderWidth);
  assert.ok(selected.radius > neighbor.radius);

  const ordinaryEdge = worldEdgeStyle({ predicate: "met" }, WORLD_LIGHT_PALETTE);
  const emphasizedEdge = worldEdgeStyle(
    { predicate: "met", emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  const selectedEdge = worldEdgeStyle(
    { predicate: "met", selected: true, emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(emphasizedEdge.color, ordinaryEdge.color);
  assert.ok(emphasizedEdge.width > ordinaryEdge.width);
  assert.equal(selectedEdge.color, ordinaryEdge.color);
  assert.ok(selectedEdge.width > emphasizedEdge.width);

  const ordinaryPlace = worldPlaceStyle(
    { marker: { fillColor: "#123456", color: "#abcdef" } },
    false,
    WORLD_LIGHT_PALETTE,
  );
  const emphasizedPlace = worldPlaceStyle(
    { marker: { fillColor: "#123456", color: "#abcdef" } },
    false,
    WORLD_LIGHT_PALETTE,
    true,
  );
  assert.equal(emphasizedPlace.fill, ordinaryPlace.fill);
  assert.equal(emphasizedPlace.border, ordinaryPlace.border);
  assert.ok(emphasizedPlace.borderWidth > ordinaryPlace.borderWidth);
  assert.ok(emphasizedPlace.radius > ordinaryPlace.radius);
});

test("portable fill, border, stroke, and radius aliases override defaults", () => {
  const styled = worldNodeStyle(
    {
      type: "person",
      attributes: {
        style: {
          fill: "#112233",
          stroke: "#445566",
          strokeWidth: 3,
          radius: 15,
        },
      },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(styled.fill, "#112233");
  assert.equal(styled.border, "#445566");
  assert.equal(styled.borderWidth, 3);
  assert.equal(styled.radius, 30);
});

test("places use node-like shape, icon, border, fill, and readable footprint", () => {
  const place = worldPlaceStyle(
    {
      marker: {
        fillColor: "#123456",
        color: "#abcdef",
        size: 24,
        weight: 3,
        shape: "square",
        icon: "crown",
      },
    },
    false,
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(place.fill, "#123456");
  assert.equal(place.border, "#abcdef");
  assert.equal(place.borderWidth, 3);
  assert.equal(place.shape, "square");
  assert.equal(place.icon, "crown");
  assert.equal(place.radius, WORLD_ENTITY_MIN_HIT_RADIUS_PX);

  const fallback = worldPlaceStyle({}, false, WORLD_LIGHT_PALETTE);
  assert.equal(fallback.shape, "pin");
  assert.equal(fallback.icon, "place");
  assert.ok(fallback.radius >= WORLD_ENTITY_MIN_HIT_RADIUS_PX);
});

test("edges colour by relationship type unless they carry their own style, including style aliases", () => {
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

  const aliased = worldEdgeStyle(
    {
      predicate: "visits",
      selected: true,
      attributes: { style: { stroke: "#abcdef", strokeWidth: 3 } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(aliased.color, "#abcdef");
  assert.ok(aliased.width >= 4);
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
    [22, 24, 26],
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
