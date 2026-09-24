import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("Biome is the authoritative formatter and strict multi-language quality tool", async () => {
  const biome = await readJson("biome.json");

  assert.equal(biome.formatter?.enabled, true);
  assert.equal(biome.formatter?.indentStyle, "space");
  assert.equal(biome.formatter?.lineWidth, 100);
  assert.equal(biome.linter?.enabled, true);
  assert.equal(biome.linter?.rules?.preset, "recommended");
  assert.equal(biome.assist?.actions?.source?.organizeImports, "on");

  assert.equal(biome.linter?.rules?.a11y?.useGenericFontNames, "error");
  assert.equal(biome.linter?.rules?.complexity?.noImportantStyles, "error");
  assert.equal(biome.linter?.rules?.complexity?.noImplicitCoercions, "error");
  assert.equal(biome.linter?.rules?.complexity?.useArrowFunction, "error");
  assert.equal(biome.linter?.rules?.correctness?.noUndeclaredVariables, "error");
  assert.equal(biome.linter?.rules?.correctness?.noUnusedImports, "error");
  assert.equal(biome.linter?.rules?.correctness?.noUnusedVariables, "error");
  assert.equal(biome.linter?.rules?.nursery?.noExcessiveSelectorClasses, "error");
  assert.equal(biome.linter?.rules?.style?.noParameterAssign, "error");
  assert.equal(biome.linter?.rules?.style?.useConst, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noConsole?.level, "error");
  assert.deepEqual(biome.linter?.rules?.suspicious?.noConsole?.options?.allow, ["warn", "error"]);
  assert.equal(biome.linter?.rules?.suspicious?.noDoubleEquals?.options?.ignoreNull, false);
  assert.equal(biome.linter?.rules?.suspicious?.noShorthandPropertyOverrides, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noUnknownAtRules, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noUnusedExpressions, "error");

  for (const ignored of [
    "!!dist",
    "!!site/orb-graph.bundle.js",
    "!!site/evidence-extraction.bundle.js",
    "!!site/leaflet.bundle.js",
    "!!site/pdf.worker.mjs",
  ]) {
    assert.ok(biome.files?.includes?.includes(ignored), `Biome must ignore generated artifact: ${ignored}`);
  }

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
  assert.match(script, /--cached/);
  assert.match(script, /ls-files/);
});

test("package scripts expose one Biome quality pipeline plus architecture policy", async () => {
  const pkg = await readJson("package.json");
  const scripts = pkg.scripts ?? {};

  assert.equal(scripts.format, "biome format --write .");
  assert.equal(scripts["format:check"], "biome format .");
  assert.equal(scripts.lint, "pnpm lint:biome && pnpm lint:architecture");
  assert.equal(scripts["lint:fix"], "biome lint --write .");
  assert.match(scripts["lint:biome"] ?? "", /^biome lint /);
  assert.match(scripts["check:biome"] ?? "", /^biome check /);
  assert.equal(scripts.fix, "biome check --write . && pnpm lint:architecture");
  assert.match(scripts["lint:styles"] ?? "", /--config-path=biome\.strict\.json/);
  assert.match(scripts["lint:styles"] ?? "", /\.css/);
  assert.equal(
    scripts["check:quality"],
    "pnpm check:biome && pnpm lint:architecture && node scripts/check-quality-changed.mjs",
  );
  assert.doesNotMatch(Object.values(scripts).join("\n"), /eslint/i);
  assert.equal(pkg.devDependencies?.eslint, undefined);
  assert.equal(pkg.devDependencies?.["@eslint/js"], undefined);
  assert.doesNotMatch(scripts.format ?? "", /disabled|echo/i);
});

test("CI treats migrated TypeScript and the full test suite as fatal", async () => {
  const timeline = await readFile(new URL(".github/workflows/timeline-view.yml", root), "utf8");
  const pages = await readFile(new URL(".github/workflows/pages.yml", root), "utf8");

  assert.match(timeline, /- run: pnpm types:migrated/);
  assert.match(pages, /run: pnpm types:migrated/);
  assert.doesNotMatch(pages, /types:migrated[^\n]*\|\|/);
  assert.doesNotMatch(timeline, /pnpm test[^\n]*\|\|\s*echo/);
});
