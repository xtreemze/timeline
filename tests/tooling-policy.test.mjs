import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("quality tooling uses one strict Biome gate plus architecture policy", async () => {
  const [biome, packageJson] = await Promise.all([
    readJson("biome.json"),
    readJson("package.json"),
  ]);

  assert.equal(biome.linter?.enabled, true);
  assert.equal(biome.linter?.rules?.preset, "all");
  assert.equal(biome.linter?.rules?.nursery?.recommended, true);
  assert.equal(biome.formatter?.enabled, true);
  assert.equal(biome.formatter?.lineEnding, "lf");
  assert.equal(biome.formatter?.lineWidth, 100);
  assert.equal(biome.assist?.enabled, true);
  assert.equal(biome.assist?.actions?.source?.organizeImports, "on");

  assert.equal(packageJson.scripts?.lint, "pnpm lint:biome && pnpm lint:architecture");
  assert.match(packageJson.scripts?.["lint:biome"] ?? "", /^biome ci\b/);
  assert.match(packageJson.scripts?.["lint:fix"] ?? "", /^biome check --write\b/);
  assert.match(packageJson.scripts?.format ?? "", /^biome format --write\b/);
  assert.match(packageJson.scripts?.["format:check"] ?? "", /^biome format\b/);

  assert.equal(packageJson.scripts?.["lint:eslint"], undefined);
  assert.equal(packageJson.devDependencies?.eslint, undefined);
  assert.equal(packageJson.devDependencies?.["@eslint/js"], undefined);
});
