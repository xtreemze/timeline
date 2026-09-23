import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("Biome is the authoritative formatter and strict multi-language linter", async () => {
  const biome = await readJson("biome.json");

  assert.equal(biome.formatter?.enabled, true);
  assert.equal(biome.formatter?.indentStyle, "space");
  assert.equal(biome.formatter?.lineWidth, 100);
  assert.equal(biome.linter?.enabled, true);
  assert.equal(biome.linter?.rules?.preset, "recommended");

  assert.equal(biome.linter?.rules?.a11y?.useGenericFontNames, "error");
  assert.equal(biome.linter?.rules?.complexity?.noImportantStyles, "error");
  assert.equal(biome.linter?.rules?.nursery?.noExcessiveSelectorClasses, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noShorthandPropertyOverrides, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noUnknownAtRules, "error");

  const strictOverride = biome.overrides?.find((override) =>
    override.includes?.includes("src/domain/**"),
  );
  assert.equal(strictOverride?.linter?.rules?.preset, "all");
});

test("strict changed-file config ratchets style debt without weakening new work", async () => {
  const strict = await readJson("biome.strict.json");
  assert.deepEqual(strict.extends, ["./biome.json"]);
  assert.equal(strict.linter?.rules?.style?.noDescendingSpecificity, "error");

  const script = await readFile(new URL("scripts/check-quality-changed.mjs", root), "utf8");
  assert.match(script, /QUALITY_BASE_SHA/);
  assert.match(script, /--config-path=biome\.strict\.json/);
  assert.match(script, /--diff-filter=ACMR/);
});

test("package scripts expose formatter, style lint, safe fixes, and the CI quality gate", async () => {
  const pkg = await readJson("package.json");
  const scripts = pkg.scripts ?? {};

  assert.equal(scripts.format, "biome format --write .");
  assert.equal(scripts["format:check"], "biome format .");
  assert.match(scripts["lint:biome"] ?? "", /^biome lint /);
  assert.match(scripts["lint:styles"] ?? "", /\.css/);
  assert.match(scripts["check:quality"] ?? "", /^pnpm lint && node scripts\/check-quality-changed\.mjs$/);
  assert.match(scripts["check:quality"] ?? "", /pnpm lint:eslint/);
  assert.match(scripts["check:quality"] ?? "", /pnpm lint:architecture/);
  assert.doesNotMatch(scripts.format ?? "", /disabled|echo/i);
});
