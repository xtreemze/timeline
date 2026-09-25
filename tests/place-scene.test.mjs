import assert from "node:assert/strict";
import test from "node:test";

import { validatePlaceScene3D } from "../src/domain/place-scene.ts";
import { placeId } from "../src/domain/ids.ts";
import {
  PLACE_SCENE_LOD_THRESHOLDS_PX,
  placeSceneLodForProjectedPixels,
} from "../src/layout/place-scene-lod.ts";

test("canonical place 3D scenes require meter scale and unit root scale", () => {
  const scene = {
    placeId: placeId("pigs-brick-place"),
    representation: "model",
    units: "meters",
    scaleBasis: "fictional-plausible",
    localPositionMeters: [2280, 18, -1080],
    headingDegrees: -22,
    dimensionsMeters: [11, 8.8, 9.2],
    assetId: "pigwood-brick-house",
    rootScale: [1, 1, 1],
    anchors: [{ id: "entrance", kind: "entrance", positionMeters: [0, 0, -4.15] }],
    lods: [
      { level: 0, uri: "/a/lod0.glb", triangleCount: 84, byteLength: 1000 },
      { level: 1, uri: "/a/lod1.glb", triangleCount: 60, byteLength: 800 },
      { level: 2, uri: "/a/lod2.glb", triangleCount: 36, byteLength: 600 },
      { level: 3, uri: "/a/lod3.glb", triangleCount: 12, byteLength: 400 },
    ],
  };
  assert.deepEqual(validatePlaceScene3D(scene), []);

  const invalid = {
    ...scene,
    units: "centimeters",
    rootScale: [100, 100, 100],
  };
  assert.ok(validatePlaceScene3D(invalid).some((finding) => finding.includes("meters")));
  assert.ok(validatePlaceScene3D(invalid).some((finding) => finding.includes("root scale")));
});

test("screen-space LOD omits tiny assets and uses hysteresis", () => {
  assert.equal(placeSceneLodForProjectedPixels(4), null);
  assert.equal(placeSceneLodForProjectedPixels(12), 3);
  assert.equal(placeSceneLodForProjectedPixels(40), 2);
  assert.equal(placeSceneLodForProjectedPixels(100), 1);
  assert.equal(placeSceneLodForProjectedPixels(220), 0);

  assert.equal(
    placeSceneLodForProjectedPixels(PLACE_SCENE_LOD_THRESHOLDS_PX.lod2 - 1, 1),
    1,
    "small movement around a boundary should retain the current LOD",
  );
  assert.equal(
    placeSceneLodForProjectedPixels(PLACE_SCENE_LOD_THRESHOLDS_PX.lod2 - 8, 1),
    2,
    "crossing the hysteresis band may reduce detail",
  );
});
