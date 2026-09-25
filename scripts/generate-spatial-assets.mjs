import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildAssetLods } from "./lib/storybook-maquette-glb.mjs";

const sourcePath = process.argv[2] || "assets-3d/source/pigwood.json";
const outputRoot = process.argv[3] || "public/assets-3d/pigwood";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const manifest = {
  version: 1,
  style: source.style,
  units: source.units,
  storyId: source.storyId,
  realm: source.realm,
  places: source.places,
  assets: [],
};

for (const asset of source.assets) {
  const outputDirectory = path.join(outputRoot, asset.assetId);
  await mkdir(outputDirectory, { recursive: true });
  const lods = buildAssetLods(asset);
  const reports = [];
  for (const { buffer, report } of lods) {
    const file = `lod${report.lod}.glb`;
    await writeFile(path.join(outputDirectory, file), buffer);
    reports.push({
      ...report,
      uri: `/assets-3d/pigwood/${asset.assetId}/${file}`,
    });
  }
  manifest.assets.push({
    placeId: asset.placeId,
    assetId: asset.assetId,
    representation: asset.representation,
    units: asset.units,
    scaleBasis: asset.scaleBasis,
    localPositionMeters: asset.localPositionMeters,
    headingDegrees: asset.headingDegrees,
    dimensionsMeters: asset.dimensionsMeters,
    rootScale: [1, 1, 1],
    anchors: asset.anchors,
    lods: reports,
  });
}

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(
  `Generated ${manifest.assets.length} Pigwood assets and ${manifest.assets.length * 4} GLB LODs.\n`,
);
