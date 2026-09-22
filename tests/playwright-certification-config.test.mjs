import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8");
const pagesWorkflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
const pagesConfig = readFileSync(new URL("../playwright.pages.config.ts", import.meta.url), "utf8");

test("one development browser config owns the interaction certification suite", () => {
  const scripts = Object.values(packageJson.scripts ?? {}).join("\n");
  assert.doesNotMatch(scripts, /playwright\.config\.mjs/);
  assert.match(config, /testDir:\s*['"]\.\/tests['"]/);
  assert.match(config, /\*\*\/\*\.spec\.ts/);
  assert.match(config, /\*\*\/\*\.spec\.mjs/);
  assert.match(config, /testIgnore:\s*\[['"]\*\*\/pages-runtime\.spec\.ts['"]\]/);
});

test("browser matrix includes desktop, portrait and landscape touch, tablet touch, and reduced motion", () => {
  for (const project of [
    "Desktop Chrome",
    "Mobile Chrome",
    "Mobile Chrome Landscape",
    "Mobile Safari",
    "Mobile Safari Landscape",
    "Tablet Touch",
    "Reduced Motion",
  ]) {
    assert.ok(config.includes(`name: '${project}'`), `missing Playwright project ${project}`);
  }
  assert.match(config, /Mobile Chrome'[\s\S]*?hasTouch:\s*true/);
  assert.match(config, /Mobile Chrome Landscape'[\s\S]*?hasTouch:\s*true/);
  assert.match(config, /Mobile Safari'[\s\S]*?hasTouch:\s*true/);
  assert.match(config, /Mobile Safari Landscape'[\s\S]*?hasTouch:\s*true/);
  assert.match(config, /Tablet Touch'[\s\S]*?hasTouch:\s*true/);
  assert.match(config, /Reduced Motion'[\s\S]*?reducedMotion:\s*'reduce'/);
});

test("CI keeps browser behavior decomposed but explicitly discovered", () => {
  for (const job of [
    "structural-composition-browser",
    "application-shell-browser",
    "interaction-browser",
    "graph-touch-browser",
  ]) {
    assert.ok(workflow.includes(`${job}:`), `missing browser certification job ${job}`);
  }
  for (const spec of [
    "retained-structural-composition.spec.ts",
    "semantic-chronology.spec.ts",
    "tests/playwright/layout.spec.ts",
    "tests/playwright/interaction.spec.ts",
    "tests/playwright/graph-touch.spec.ts",
  ]) {
    assert.ok(workflow.includes(spec), `workflow does not explicitly own ${spec}`);
  }
  assert.match(workflow, /playwright install --with-deps chromium webkit/);
});

test("compiled Pages runtime remains a separate production-browser contract", () => {
  assert.match(pagesConfig, /pages-runtime\.spec\.ts/);
  assert.match(pagesWorkflow, /playwright\.pages\.config\.ts/);
  assert.match(pagesWorkflow, /dist/);
  assert.doesNotMatch(pagesWorkflow, /Upload site artifact[\s\S]*?path:\s*site(?:\s|$)/);
});
