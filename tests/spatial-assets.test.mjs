import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildAssetLods,
  validateMaquetteAsset,
} from "../scripts/lib/storybook-maquette-glb.mjs";

const source = JSON.parse(await readFile(new URL("../assets-3d/source/pigwood.json", import.meta.url)));

test("Pigwood models are true-scale, canonical-place-backed and deterministic", () => {
  assert.equal(source.units, "meters");
  assert.equal(source.assets.length, 4);

  for (const asset of source.assets) {
    assert.deepEqual(validateMaquetteAsset(asset), []);
    assert.ok(asset.placeId);
    assert.equal(asset.units, "meters");
    assert.equal(asset.scaleBasis, "fictional-plausible");
    assert.ok(asset.dimensionsMeters.every((value) => value > 0));

    const first = buildAssetLods(asset);
    const second = buildAssetLods(asset);
    assert.equal(first.length, 4);
    for (let index = 0; index < first.length; index += 1) {
      assert.deepEqual(first[index].buffer, second[index].buffer, `${asset.assetId}: deterministic LOD${index}`);
      assert.equal(first[index].buffer.readUInt32LE(0), 0x46546c67, "GLB magic");
      assert.equal(first[index].buffer.readUInt32LE(4), 2, "glTF version 2");
      assert.equal(first[index].buffer.readUInt32LE(8), first[index].buffer.length);
    }
  }
});

test("Pigwood LODs reduce geometry without changing authored dimensions", () => {
  for (const asset of source.assets) {
    const lods = buildAssetLods(asset);
    const triangles = lods.map((entry) => entry.report.triangleCount);
    assert.ok(triangles[0] > triangles[1], `${asset.assetId}: LOD0 > LOD1`);
    assert.ok(triangles[1] > triangles[2], `${asset.assetId}: LOD1 > LOD2`);
    assert.ok(triangles[2] > triangles[3], `${asset.assetId}: LOD2 > LOD3`);
    assert.ok(
      lods.every(
        (entry) =>
          JSON.stringify(entry.report.dimensionsMeters) === JSON.stringify(asset.dimensionsMeters),
      ),
      `${asset.assetId}: physical dimensions remain stable across LOD`,
    );
  }
});

test("Pigwood source accounts for every current canonical story location", () => {
  const ids = new Set(source.places.map((place) => place.placeId));
  for (const id of [
    "place-three-little-pigs-mother-pig-s-cottage",
    "place-three-little-pigs-straw-seller-s-field",
    "pigs-market-place",
    "place-three-little-pigs-timber-track",
    "place-three-little-pigs-pigwood-mason-s-yard",
    "place-three-little-pigs-straw-house-meadow",
    "place-three-little-pigs-stick-house-grove",
    "place-three-little-pigs-pigwood-escape-path",
    "place-three-little-pigs-brick-house-approach",
    "pigs-brick-place",
    "place-three-little-pigs-pursuit-corridor",
  ]) {
    assert.ok(ids.has(id), id);
  }

  const modeled = new Set(source.assets.map((asset) => asset.placeId));
  assert.equal(modeled.size, source.assets.length);
  assert.ok(source.places.some((place) => place.representation === "procedural-route"));
  assert.ok(source.places.some((place) => place.representation === "procedural-area"));
});
