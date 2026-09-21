import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8");
const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");

test("browser scripts use the single authoritative Playwright config", () => {
  const scripts = Object.values(packageJson.scripts ?? {}).join("\n");
  assert.doesNotMatch(scripts, /playwright\.config\.mjs/);
  assert.match(packageJson.scripts["test:structural-composition-browser"], /retained-structural-composition\.spec\.ts/);
  assert.match(packageJson.scripts["test:semantic-chronology-browser"], /semantic-chronology\.spec\.ts/);
});

test("Playwright matrix includes desktop, phone portrait and landscape, tablet touch, and reduced motion", () => {
  assert.ok(config.includes("Desktop Chrome"));
  assert.ok(config.includes("Mobile Chrome"));
  assert.ok(config.includes("Mobile Chrome Landscape"));
  assert.ok(config.includes("Mobile Safari"));
  assert.ok(config.includes("Mobile Safari Landscape"));
  assert.ok(config.includes("Tablet Touch"));
  assert.ok(config.includes("Reduced Motion"));
  assert.match(config, /testDir:\s*[\x27\x22]\.\/tests[\x27\x22]/);
  assert.match(config, /\*\*\/\*\.spec\.ts/);
});

test("CI discovers and executes the unified multi-engine browser suite", () => {
  assert.doesNotMatch(workflow, /playwright\.config\.mjs/);
  assert.match(workflow, /playwright install --with-deps chromium webkit/);
  assert.match(workflow, /playwright test --list/);
  assert.match(workflow, /retained-structural-composition\.spec\.ts/);
  assert.match(workflow, /semantic-chronology\.spec\.ts/);
  assert.match(workflow, /pnpm test:e2e/);
});
