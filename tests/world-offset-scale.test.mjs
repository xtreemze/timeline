import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveWorldLocalLayoutPosition,
  resolveWorldRenderPosition,
} from "../src/layout/world-geographic-position.ts";
import {
  typicalLocalOffsetMeters,
  WORLD_FLOATING_GRAPH_MAX_EXPANSION,
  WORLD_LOCAL_GRAPH_RADIUS_PX,
  worldFloatingGraphRadiusPx,
  worldPresentationOffsetScale,
} from "../src/layout/world-semantic-presentation.ts";

const instance = Object.freeze({
  id: "a::1",
  canonicalId: "a",
  geographicAnchors: [{ placeId: "p", latitude: 50, longitude: 8 }],
  temporalWeight: 1,
  visualWeight: 1,
  retained: false,
  localOffset: { eastMeters: 300, northMeters: -400 },
});

test("magnified render positions invert back to the stored offset (drag stays honest)", () => {
  for (const scale of [1, 8, 90.5]) {
    const position = resolveWorldRenderPosition(instance, scale);
    const local = resolveWorldLocalLayoutPosition(instance, position, scale);
    assert.ok(Math.abs(local.eastMeters - 300) < 1e-6, `east at ${scale}`);
    assert.ok(Math.abs(local.northMeters + 400) < 1e-6, `north at ${scale}`);
  }
});

test("offset scale keeps overview topology readable and expands it at detail zoom", () => {
  const typical = 500;
  const radii = [];
  for (const zoom of [6, 8, 10]) {
    const scale = worldPresentationOffsetScale(zoom, 100, typical, 0);
    const metersPerPixel = 40_075_016.686 / 512 / 2 ** zoom;
    const radiusPx = (typical * scale) / metersPerPixel;
    const targetPx = worldFloatingGraphRadiusPx(zoom);
    radii.push(radiusPx);
    // Quarter-octave quantisation: within 2^(1/8) of the semantic target.
    assert.ok(Math.abs(Math.log2(radiusPx / targetPx)) <= 0.125 + 1e-9);
  }

  assert.ok(radii[1] > radii[0], "detail zoom gives floating nodes more screen-space room");
  assert.ok(radii[2] > radii[1], "floating topology continues to expand at higher detail");
  assert.equal(
    worldFloatingGraphRadiusPx(20),
    WORLD_LOCAL_GRAPH_RADIUS_PX * WORLD_FLOATING_GRAPH_MAX_EXPANSION,
    "detail expansion is bounded",
  );
});

test("offset scale never shrinks and is disabled for dense or offset-free scenes", () => {
  assert.equal(worldPresentationOffsetScale(18, 100, 500, 0), 1);
  assert.equal(worldPresentationOffsetScale(6, 50_000, 500, 0), 1);
  assert.equal(worldPresentationOffsetScale(6, 100, 0, 0), 1);
});

test("typical offset is the 90th percentile distance from the anchor", () => {
  const offsets = Array.from({ length: 10 }, (_, index) => ({
    eastMeters: (index + 1) * 100,
    northMeters: 0,
  }));
  assert.equal(typicalLocalOffsetMeters(offsets), 1000);
  assert.equal(typicalLocalOffsetMeters([]), 0);
});

test("floating render positions invert back to the stored altitude and offset", () => {
  const floating = { ...instance, visualAltitude: 400 };
  for (const [scale, float] of [
    [1, 0],
    [8, 5_000],
  ]) {
    const position = resolveWorldRenderPosition(floating, scale, float);
    assert.ok(position[2] >= float, "entities float above the terrain");
    const local = resolveWorldLocalLayoutPosition(floating, position, scale, float);
    assert.ok(Math.abs(local.visualAltitudeMeters - 400) < 1e-6, `altitude at ${scale}/${float}`);
    assert.ok(Math.abs(local.eastMeters - 300) < 1e-6);
  }
});
