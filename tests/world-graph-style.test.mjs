import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_DARK_PALETTE,
  WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  WORLD_LIGHT_PALETTE,
  WORLD_MIN_VISIBLE_STROKE_PX,
  worldColorBytes,
  worldEdgeStyle,
  worldNodeFootprintRadiusPx,
  worldNodeShapeVisualRadiusScale,
  worldNodeStyle,
  worldNodeStyleFootprintRadiusPx,
  worldNodeVisualFootprintRadiusPx,
  worldPlaceFootprintRadiusPx,
  worldPlaceStyle,
  worldPlaceVisualFootprintRadiusPx,
} from "../src/layout/world-graph-style.ts";
import { semanticColorHex, semanticHue } from "../src/presentation/semantic-color.ts";

function assertSameHue(actual, expected, tolerance = 1.5) {
  const a = semanticHue(actual);
  const b = semanticHue(expected);
  const delta = Math.abs(a - b) % 360;
  assert.ok(Math.min(delta, 360 - delta) < tolerance, `${actual} should preserve hue ${b}`);
}

test("node defaults follow the Orb type language", () => {
  const person = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  assert.equal(person.fill, semanticColorHex("#4b5f86", "light", "ambient"));
  assert.equal(person.shape, "circle");
  assert.equal(person.icon, "person");
  assert.equal(person.border, semanticColorHex("#4b5f86", "light", "subdued"));
  assert.equal(person.foreground, WORLD_LIGHT_PALETTE.line);
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
  assert.equal(styled.fill, semanticColorHex("#ff0000", "light", "ambient"));
  assert.equal(styled.border, semanticColorHex("#00ff00", "light", "subdued"));
  assert.equal(styled.shape, "square");
  assert.equal(styled.icon, "object");
  assert.equal(styled.image, "https://example.test/a.png");
  assert.equal(styled.radius, 23);

  const invalid = worldNodeStyle(
    { type: "person", attributes: { style: { fillColor: "red; x", shape: "star" } } },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(invalid.fill, semanticColorHex("#4b5f86", "light", "ambient"));
  assert.equal(invalid.shape, "circle");
});

test("selection preserves semantic colours without changing node geometry", () => {
  const normal = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  const selected = worldNodeStyle({ type: "person", selected: true }, WORLD_LIGHT_PALETTE);
  assert.notEqual(selected.fill, normal.fill);
  assertSameHue(selected.fill, normal.fill);
  assert.notEqual(selected.border, normal.border);
  assertSameHue(selected.border, normal.border);
  assert.equal(normal.foreground, WORLD_LIGHT_PALETTE.line);
  assert.equal(selected.foreground, WORLD_LIGHT_PALETTE.paper);
  assert.equal(selected.borderWidth, normal.borderWidth);
  assert.equal(selected.radius, normal.radius);

  const authored = worldNodeStyle(
    {
      type: "person",
      selected: true,
      attributes: { style: { fill: "#123456", stroke: "#abcdef" } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(authored.fill, semanticColorHex("#123456", "light", "active"));
  assert.equal(authored.border, semanticColorHex("#abcdef", "light", "active"));
  assert.equal(
    worldNodeStyle({ type: "thing" }, WORLD_DARK_PALETTE).fill !== WORLD_DARK_PALETTE.ink,
    true,
    "the untyped default stays visible on the dark background",
  );
});

test("selection and connected-neighborhood emphasis preserve graph geometry", () => {
  const ordinary = worldNodeStyle({ type: "person" }, WORLD_LIGHT_PALETTE);
  const neighbor = worldNodeStyle({ type: "person", emphasized: true }, WORLD_LIGHT_PALETTE);
  const selected = worldNodeStyle(
    { type: "person", selected: true, emphasized: true },
    WORLD_LIGHT_PALETTE,
  );

  assert.notEqual(neighbor.fill, ordinary.fill);
  assertSameHue(neighbor.fill, ordinary.fill);
  assert.notEqual(neighbor.border, ordinary.border);
  assert.equal(neighbor.borderWidth, ordinary.borderWidth);
  assert.equal(neighbor.radius, ordinary.radius);
  assert.equal(selected.fill, neighbor.fill);
  assert.equal(selected.border, neighbor.border);
  assert.equal(selected.borderWidth, ordinary.borderWidth);
  assert.equal(selected.radius, ordinary.radius);
  assert.equal(
    worldNodeFootprintRadiusPx({ type: "person", emphasized: true }),
    worldNodeFootprintRadiusPx({ type: "person" }),
  );

  const ordinaryEdge = worldEdgeStyle({ predicate: "met" }, WORLD_LIGHT_PALETTE);
  const emphasizedEdge = worldEdgeStyle(
    { predicate: "met", emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  const selectedEdge = worldEdgeStyle(
    { predicate: "met", selected: true, emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  assert.notEqual(emphasizedEdge.color, ordinaryEdge.color);
  assertSameHue(emphasizedEdge.color, ordinaryEdge.color);
  assert.equal(emphasizedEdge.width, ordinaryEdge.width);
  assert.equal(selectedEdge.color, emphasizedEdge.color);
  assert.equal(selectedEdge.width, ordinaryEdge.width);

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
  assert.notEqual(emphasizedPlace.fill, ordinaryPlace.fill);
  assertSameHue(emphasizedPlace.fill, ordinaryPlace.fill);
  assert.notEqual(emphasizedPlace.border, ordinaryPlace.border);
  assert.equal(emphasizedPlace.borderWidth, ordinaryPlace.borderWidth);
  assert.equal(emphasizedPlace.radius, ordinaryPlace.radius);
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
  assert.equal(styled.fill, semanticColorHex("#112233", "light", "ambient"));
  assert.equal(styled.border, semanticColorHex("#445566", "light", "subdued"));
  assert.equal(styled.borderWidth, 3);
  assert.equal(styled.radius, 19);
});

test("World styles accept portable HSL and numeric semantic hue carriers", () => {
  const node = worldNodeStyle(
    {
      type: "person",
      attributes: {
        style: {
          fillColor: "hsl(118 64% 50%)",
          borderColor: 282,
        },
      },
    },
    WORLD_LIGHT_PALETTE,
  );
  assertSameHue(node.fill, 118);
  assertSameHue(node.border, 282);

  const place = worldPlaceStyle(
    { marker: { fillColor: "hsl(38 64% 50%)", color: 145 } },
    false,
    WORLD_DARK_PALETTE,
  );
  assertSameHue(place.fill, 38);
  assertSameHue(place.border, 145);

  const edge = worldEdgeStyle(
    {
      predicate: "met",
      attributes: { style: { categoryColor: "hsl(325 64% 50%)" } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assertSameHue(edge.color, 325);
});

test("node collision footprint is exactly the rendered shape radius plus authored border", () => {
  const borderless = {
    type: "person",
    attributes: { style: { radius: 24, borderWidth: 0, shape: "circle" } },
  };
  const bordered = {
    type: "person",
    attributes: { style: { radius: 24, borderWidth: 6, shape: "circle" } },
  };

  assert.equal(worldNodeVisualFootprintRadiusPx(borderless), 24);
  assert.equal(worldNodeFootprintRadiusPx(borderless), 24);
  assert.equal(worldNodeVisualFootprintRadiusPx(bordered), 30);
  assert.equal(worldNodeFootprintRadiusPx(bordered), 30);
  assert.equal(
    worldNodeFootprintRadiusPx({
      type: "person",
      attributes: { style: { radius: 10, borderWidth: 0, shape: "circle" } },
    }),
    WORLD_ENTITY_MIN_HIT_RADIUS_PX,
    "the minimum footprint is preserved by the rendered body, not hidden collision padding",
  );
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
  assert.equal(place.fill, semanticColorHex("#123456", "light", "ambient"));
  assert.equal(place.border, semanticColorHex("#abcdef", "light", "subdued"));
  assert.equal(place.borderWidth, 3);
  assert.equal(place.shape, "square");
  assert.equal(place.icon, "crown");
  assert.equal(place.radius, 12);

  const fallback = worldPlaceStyle({}, false, WORLD_LIGHT_PALETTE);
  assert.equal(fallback.shape, "pin");
  assert.equal(fallback.icon, "place");
  assert.equal(fallback.radius, 12);
  assert.ok(fallback.radius < WORLD_ENTITY_MIN_HIT_RADIUS_PX);
});

test("neutral legacy place fills inherit the marker hue instead of becoming an arbitrary hue", () => {
  const place = worldPlaceStyle(
    { marker: { color: "#315fbd", fillColor: "#fffdf9" } },
    false,
    WORLD_LIGHT_PALETTE,
  );
  assertSameHue(place.fill, "#315fbd");
  assertSameHue(place.border, "#315fbd");
});

test("place footprint reserves rendered geometry and the mobile interaction minimum", () => {
  const compact = { marker: { radius: 12, borderWidth: 2 } };
  assert.equal(worldPlaceVisualFootprintRadiusPx(compact), 14);
  assert.equal(worldPlaceFootprintRadiusPx(compact), WORLD_ENTITY_MIN_HIT_RADIUS_PX);

  const large = { marker: { radius: 30, borderWidth: 4, shape: "square" } };
  assert.ok(worldPlaceVisualFootprintRadiusPx(large) > 30);
  assert.equal(worldPlaceFootprintRadiusPx(large), worldPlaceVisualFootprintRadiusPx(large));
});

test("marker shape scales normalize filled area and collision extent", () => {
  const square = worldNodeShapeVisualRadiusScale("square");
  const diamond = worldNodeShapeVisualRadiusScale("diamond");
  const hexagon = worldNodeShapeVisualRadiusScale("hexagon");

  assert.ok(Math.abs(4 * square ** 2 - Math.PI) < 1e-12);
  assert.ok(Math.abs(2 * diamond ** 2 - Math.PI) < 1e-12);
  assert.ok(Math.abs(((3 * Math.sqrt(3)) / 2) * hexagon ** 2 - Math.PI) < 1e-12);

  const diamondInput = {
    type: "event",
    attributes: { style: { radius: 20, borderWidth: 2 } },
  };
  assert.ok(
    worldNodeFootprintRadiusPx(diamondInput) >= 20 * diamond + 2,
    "force collision reserves the normalized diamond extent",
  );
});

test("entity and place authored size share diameter semantics above the minimum target", () => {
  const entity = worldNodeStyle(
    { type: "person", attributes: { style: { size: 48 } } },
    WORLD_LIGHT_PALETTE,
  );
  const place = worldPlaceStyle({ marker: { size: 48 } }, false, WORLD_LIGHT_PALETTE);
  assert.equal(entity.radius, 24);
  assert.equal(place.radius, 24);
  assert.equal(
    worldNodeFootprintRadiusPx({
      type: "person",
      attributes: { style: { size: 48 } },
    }),
    26,
  );
});

test("edges colour by relationship type unless they carry their own style, including style aliases", () => {
  assert.equal(
    worldEdgeStyle({ predicate: "visits" }, WORLD_LIGHT_PALETTE).color,
    semanticColorHex("#3e6d5b", "light", "ambient"),
  );
  assert.equal(
    worldEdgeStyle({ predicate: "calls" }, WORLD_LIGHT_PALETTE).color,
    semanticColorHex("#496f8c", "light", "ambient"),
  );
  assert.equal(
    worldEdgeStyle({ predicate: "anything" }, WORLD_LIGHT_PALETTE).color,
    semanticColorHex(WORLD_LIGHT_PALETTE.focus, "light", "ambient"),
  );
  const own = worldEdgeStyle(
    {
      predicate: "visits",
      attributes: { style: { color: "#010203", width: 5, lineStyle: "dashed", arrow: false } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.deepEqual(
    [own.color, own.width, own.dashed, own.arrow],
    [semanticColorHex("#010203", "light", "ambient"), 5, true, false],
  );

  const aliased = worldEdgeStyle(
    {
      predicate: "visits",
      selected: true,
      attributes: { style: { stroke: "#abcdef", strokeWidth: 3 } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(aliased.color, semanticColorHex("#abcdef", "light", "active"));
  assert.equal(aliased.width, 3);
});

test("subdued edges mute while emphasis restores category or endpoint colour", () => {
  const subdued = worldEdgeStyle(
    { predicate: "calls", fallbackColor: "#123456", subdued: true },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(subdued.color, semanticColorHex("#123456", "light", "subdued"));
  assert.equal(subdued.dashed, false);

  const inactive = worldEdgeStyle(
    { predicate: "calls", fallbackColor: "#123456", inactive: true },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(inactive.dashed, true, "semantic inactivity can still use a dashed line");

  const emphasized = worldEdgeStyle(
    { predicate: "calls", fallbackColor: "#123456", emphasized: true },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(emphasized.color, semanticColorHex("#123456", "light", "active"));
  assert.equal(emphasized.dashed, false);
  assert.equal(emphasized.width, 1);

  const endpoint = worldEdgeStyle(
    {
      predicate: "calls",
      fallbackColor: "#123456",
      emphasized: true,
      attributes: { style: { color: "#abcdef" } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(endpoint.color, semanticColorHex("#123456", "light", "active"));

  const category = worldEdgeStyle(
    {
      predicate: "calls",
      fallbackColor: "#123456",
      emphasized: true,
      attributes: { style: { categoryColor: "#aabbcc", color: "#abcdef" } },
    },
    WORLD_LIGHT_PALETTE,
  );
  assert.equal(category.color, semanticColorHex("#aabbcc", "light", "active"));
  assert.equal(category.width, 1);
});

test("visible relationship strokes keep a full CSS-pixel floor", () => {
  const hairline = worldEdgeStyle({ attributes: { style: { width: 0.5 } } }, WORLD_LIGHT_PALETTE);
  assert.equal(WORLD_MIN_VISIBLE_STROKE_PX, 1);
  assert.equal(hairline.width, WORLD_MIN_VISIBLE_STROKE_PX);
});

test("colour bytes parse short, long and alpha hex", () => {
  assert.deepEqual(worldColorBytes("#fff"), [255, 255, 255, 255]);
  assert.deepEqual(worldColorBytes("#102030", 128), [16, 32, 48, 128]);
  assert.deepEqual(worldColorBytes("#10203080"), [16, 32, 48, 128]);
});

test("node radii remain whole pixels while respecting the shared minimum footprint", () => {
  const radii = new Set(
    Array.from(
      { length: 200 },
      (_, index) =>
        worldNodeStyle({ type: "person", visualWeight: index / 199 }, WORLD_LIGHT_PALETTE).radius,
    ),
  );
  assert.deepEqual(
    [...radii].sort((a, b) => a - b),
    [20],
  );
  assert.equal(
    worldNodeStyle({ type: "person", attributes: { style: { size: 12.7 } } }, WORLD_LIGHT_PALETTE)
      .radius,
    20,
  );
});

test("visible, touch, and collision footprints are identical", () => {
  for (const type of ["person", "event", "organization", "story"]) {
    const input = { type, visualWeight: 0.5 };
    const visual = worldNodeVisualFootprintRadiusPx(input);
    const hit = worldNodeFootprintRadiusPx(input);
    assert.equal(hit, visual);
    assert.ok(visual >= WORLD_ENTITY_MIN_HIT_RADIUS_PX);
  }
});

test("borderless nodes preserve the 44px footprint with rendered body radius alone", () => {
  const input = {
    type: "person",
    attributes: { style: { borderWidth: 0 } },
  };
  const style = worldNodeStyle(input, WORLD_LIGHT_PALETTE);
  const footprint = worldNodeFootprintRadiusPx(input);

  assert.equal(footprint, WORLD_ENTITY_MIN_HIT_RADIUS_PX);
  assert.equal(worldNodeStyleFootprintRadiusPx(style), footprint);
  assert.equal(style.radius, footprint);
});

test("force footprint exactly matches rendered geometry and the mobile target", () => {
  for (const visualWeight of [0, 0.25, 0.5, 1]) {
    const input = { type: "person", visualWeight };
    const rendered = worldNodeStyle(input, WORLD_LIGHT_PALETTE);
    const visual = worldNodeVisualFootprintRadiusPx(input);
    const footprint = worldNodeFootprintRadiusPx(input);
    assert.equal(footprint, visual);
    assert.equal(footprint, rendered.radius + rendered.borderWidth);
    assert.ok(footprint >= WORLD_ENTITY_MIN_HIT_RADIUS_PX);
  }

  const custom = {
    type: "person",
    attributes: { style: { radius: 24, borderWidth: 6 } },
    visualWeight: 0,
  };
  const rendered = worldNodeStyle(custom, WORLD_LIGHT_PALETTE);
  assert.equal(rendered.radius, 24);
  assert.equal(worldNodeVisualFootprintRadiusPx(custom), 30);
  assert.equal(worldNodeFootprintRadiusPx(custom), 30);
});
