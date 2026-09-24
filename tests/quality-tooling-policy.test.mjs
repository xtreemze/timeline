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
  assert.equal(biome.linter?.rules?.nursery?.noExcessiveSelectorClasses, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noShorthandPropertyOverrides, "error");
  assert.equal(biome.linter?.rules?.suspicious?.noUnknownAtRules, "error");

  for (const ignored of [
    "!!dist",
    "!!site/orb-graph.bundle.js",
    "!!site/evidence-extraction.bundle.js",
    "!!site/leaflet.bundle.js",
    "!!site/pdf.worker.mjs",
  ]) {
    assert.ok(
      biome.files?.includes?.includes(ignored),
      `Biome must ignore generated artifact: ${ignored}`,
    );
  }

  const parityOverride = biome.overrides?.find((override) =>
    override.includes?.includes("src/**/*.js"),
  );
  assert.deepEqual(parityOverride?.includes, [
    "src/**/*.js",
    "site/**/*.js",
    "tests/**/*.mjs",
    "benchmarks/**/*.mjs",
  ]);
  assert.equal(parityOverride?.linter?.rules?.correctness?.noUndeclaredVariables, "error");
  assert.equal(parityOverride?.linter?.rules?.correctness?.noUnusedVariables, "error");
  assert.equal(parityOverride?.linter?.rules?.complexity?.noImplicitCoercions, "error");
  assert.equal(parityOverride?.linter?.rules?.complexity?.useArrowFunction, "error");
  assert.equal(parityOverride?.linter?.rules?.style?.noParameterAssign, "error");
  assert.equal(parityOverride?.linter?.rules?.style?.useConst, "error");
  assert.equal(parityOverride?.linter?.rules?.suspicious?.noConsole?.level, "error");
  assert.deepEqual(parityOverride?.linter?.rules?.suspicious?.noConsole?.options?.allow, [
    "warn",
    "error",
  ]);
  assert.equal(
    parityOverride?.linter?.rules?.suspicious?.noDoubleEquals?.options?.ignoreNull,
    false,
  );
  assert.equal(parityOverride?.linter?.rules?.suspicious?.noUnusedExpressions, "error");

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
  assert.equal(scripts.fix, "biome check --write . && pnpm lint:architecture");
  assert.match(scripts["lint:styles"] ?? "", /--config-path=biome\.strict\.json/);
  assert.match(scripts["lint:styles"] ?? "", /\.css/);
  assert.equal(scripts["check:quality"], "pnpm lint && node scripts/check-quality-changed.mjs");
  assert.equal(scripts.build, "vite build");
  assert.equal(scripts["build:graph"], undefined);
  assert.equal(scripts["build:leaflet"], undefined);
  assert.equal(scripts["build:evidence"], undefined);
  assert.equal(pkg.devDependencies?.esbuild, undefined);
  assert.doesNotMatch(Object.values(scripts).join("\n"), /\besbuild\b|--format=iife/i);
  assert.doesNotMatch(Object.values(scripts).join("\n"), /build:(?:graph|leaflet|evidence)/);
  assert.doesNotMatch(Object.values(scripts).join("\n"), /eslint/i);
  assert.equal(pkg.devDependencies?.eslint, undefined);
  assert.equal(pkg.devDependencies?.["@eslint/js"], undefined);
  assert.doesNotMatch(scripts.format ?? "", /disabled|echo/i);
});

test("Vite 8 owns the production module graph without classic runtime bundles", async () => {
  const [viteConfig, html] = await Promise.all([
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("site/index.html", root), "utf8"),
  ]);

  assert.match(viteConfig, /rolldownOptions/);
  assert.doesNotMatch(viteConfig, /rollupOptions/);
  assert.doesNotMatch(viteConfig, /serve-static-runtime-bundles|copy-static-runtime-bundles/);
  assert.doesNotMatch(
    html,
    /(?:orb-graph|leaflet|evidence-extraction)\.bundle\.js|leaflet\.css|pdf\.worker\.mjs/,
  );
  assert.doesNotMatch(html, /<script(?![^>]*type=["']module["'])[^>]*src=/);
});

test("CI treats migrated TypeScript and the full test suite as fatal", async () => {
  const timeline = await readFile(new URL(".github/workflows/timeline-view.yml", root), "utf8");
  const pages = await readFile(new URL(".github/workflows/pages.yml", root), "utf8");

  assert.match(timeline, /- run: pnpm types:migrated/);
  assert.match(pages, /run: pnpm types:migrated/);
  assert.doesNotMatch(pages, /types:migrated[^\n]*\|\|/);
  assert.doesNotMatch(timeline, /pnpm test[^\n]*\|\|\s*echo/);
});
