import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8");
const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
const pagesConfig = readFileSync(new URL("../playwright.pages.config.ts", import.meta.url), "utf8");
const pagesWorkflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("all browser specs use one authoritative Playwright discovery root", () => {
  const scripts = Object.values(packageJson.scripts ?? {}).join("\n");
  assert.doesNotMatch(scripts, /playwright\.config\.mjs/);
  assert.match(config, /testDir:\s*['"]\.\/tests['"]/);
  assert.match(config, /testMatch:\s*\[['"]\*\*\/\*\.spec\.ts['"],\s*['"]\*\*\/\*\.spec\.mjs['"]\]/);
  assert.match(config, /testIgnore:\s*\[['"]\*\*\/pages-runtime\.spec\.ts['"]\]/);
});

test("certification matrix includes desktop, portrait and landscape phones, tablet touch, and reduced motion", () => {
  for (const project of [
    "Desktop Chrome",
    "Mobile Chrome",
    "Mobile Chrome Landscape",
    "Mobile Safari",
    "Mobile Safari Landscape",
    "Tablet Touch",
    "Reduced Motion",
  ]) {
    assert.ok(config.includes(`name: '${project}'`), `missing Playwright project: ${project}`);
  }

  for (const touchProject of [
    "Mobile Chrome",
    "Mobile Chrome Landscape",
    "Mobile Safari",
    "Mobile Safari Landscape",
    "Tablet Touch",
  ]) {
    const projectStart = config.indexOf(`name: '${touchProject}'`);
    assert.ok(projectStart >= 0);
    const nextProject = config.indexOf("name:", projectStart + 6);
    const block = config.slice(projectStart, nextProject >= 0 ? nextProject : undefined);
    assert.match(block, /hasTouch:\s*true/, `${touchProject} must explicitly be touch-capable`);
  }
});

test("CI discovers core browser contracts and runs each browser lane fatally", () => {
  assert.doesNotMatch(workflow, /playwright\.config\.mjs/);
  assert.match(workflow, /playwright install --with-deps chromium webkit/);

  for (const spec of [
    "retained-structural-composition.spec.ts",
    "semantic-chronology.spec.ts",
    "playwright/layout.spec.ts",
    "playwright/interaction.spec.ts",
    "playwright/graph-touch.spec.ts",
  ]) {
    assert.ok(workflow.includes(spec), `workflow discovery gate is missing ${spec}`);
  }

  for (const project of [
    "[Desktop Chrome]",
    "[Mobile Chrome]",
    "[Mobile Chrome Landscape]",
    "[Mobile Safari]",
    "[Mobile Safari Landscape]",
    "[Tablet Touch]",
    "[Reduced Motion]",
  ]) {
    assert.ok(workflow.includes(project), `workflow discovery gate is missing ${project}`);
  }

  for (const lane of [
    "structural-composition-browser:",
    "pages-runtime-browser:",
    "application-shell-browser:",
    "interaction-browser:",
    "graph-touch-browser:",
  ]) {
    assert.ok(workflow.includes(lane), `missing fatal browser lane: ${lane}`);
  }
});


test("compiled Pages runtime is owned only by the production preview config", () => {
  assert.match(pagesConfig, /testMatch:\s*\[['"]pages-runtime\.spec\.ts['"]\]/);
  assert.match(pagesConfig, /baseURL:\s*['"]http:\/\/127\.0\.0\.1:4173\/timeline\/['"]/);
  assert.match(pagesWorkflow, /playwright\.pages\.config\.ts/);
  assert.match(pagesWorkflow, /path:\s*dist/);
  assert.doesNotMatch(config, /testMatch:[\s\S]*pages-runtime\.spec\.ts/);
});

test("graph touch certification covers portrait and landscape phone projects", () => {
  const command = packageJson.scripts?.["test:graph-touch-browser"] || "";
  for (const project of [
    "Mobile Chrome",
    "Mobile Chrome Landscape",
    "Mobile Safari",
    "Mobile Safari Landscape",
    "Tablet Touch",
  ]) {
    assert.ok(command.includes(`--project="${project}"`), `graph touch missing ${project}`);
  }
});
