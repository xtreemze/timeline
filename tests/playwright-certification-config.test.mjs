import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8");
const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
const pagesConfig = readFileSync(new URL("../playwright.pages.config.ts", import.meta.url), "utf8");
const pagesWorkflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const highlightConfig = readFileSync(new URL("../playwright.highlight.config.ts", import.meta.url), "utf8");
const highlightSpec = readFileSync(new URL("./highlight/highlight-reel.spec.ts", import.meta.url), "utf8");
const highlightRenderer = readFileSync(new URL("../scripts/render-e2e-highlight.mjs", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("all browser specs use one authoritative Playwright discovery root", () => {
  const scripts = Object.values(packageJson.scripts ?? {}).join("\n");
  assert.doesNotMatch(scripts, /playwright\.config\.mjs/);
  assert.match(config, /testDir:\s*['"]\.\/tests['"]/);
  assert.match(config, /testMatch:\s*\[['"]\*\*\/\*\.spec\.ts['"],\s*['"]\*\*\/\*\.spec\.mjs['"]\]/);
  assert.match(config, /testIgnore:\s*\[['"]\*\*\/pages-runtime\.spec\.ts['"],\s*['"]\*\*\/highlight\/\*\*['"]\]/);
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
  const developmentTestMatch = config
    .split("\n")
    .find((line) => line.includes("testMatch:"));
  assert.ok(developmentTestMatch);
  assert.doesNotMatch(developmentTestMatch, /pages-runtime\.spec\.ts/);
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


test("CI produces a branded real-browser E2E highlight reel and retains raw evidence", () => {
  assert.match(
    packageJson.scripts?.["test:e2e:highlight"] || "",
    /playwright\.highlight\.config\.ts/,
  );
  assert.match(
    packageJson.scripts?.["render:e2e:highlight"] || "",
    /render-e2e-highlight\.mjs/,
  );

  assert.match(highlightConfig, /testDir:\s*['"]\.\/tests\/highlight['"]/);
  assert.match(config, /\*\*\/highlight\/\*\*/);
  assert.match(highlightConfig, /video:\s*['"]off['"]/);
  assert.match(highlightSpec, /page\.screencast\.start/);
  assert.match(highlightSpec, /page\.screencast\.showChapter/);
  assert.match(highlightSpec, /page\.screencast\.showOverlay/);
  assert.match(highlightSpec, /page\.screenshot/);
  assert.match(highlightRenderer, /xfade=transition=fade/);
  assert.match(highlightRenderer, /libx264/);
  assert.match(highlightRenderer, /palettegen/);
  assert.match(highlightRenderer, /paletteuse/);
  assert.match(highlightRenderer, /-loop/);
  assert.match(highlightRenderer, /README-showcase\.md/);
  assert.match(highlightSpec, /records five branded Lūm showcase loops/);
  assert.match(highlightSpec, /01-timeline-navigation/);
  assert.match(highlightSpec, /02-focused-context/);
  assert.match(highlightSpec, /03-evidence/);
  assert.match(highlightSpec, /04-relation-graph/);
  assert.match(highlightSpec, /05-mobile/);

  assert.match(workflow, /e2e-highlight-reel:/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /apt-get install -y ffmpeg/);
  assert.match(workflow, /pnpm test:e2e:highlight/);
  assert.match(workflow, /pnpm render:e2e:highlight/);
  assert.match(workflow, /name:\s*lum-e2e-highlight-reel/);
  assert.match(workflow, /path:\s*artifacts\/e2e-media\//);
  assert.match(workflow, /find artifacts\/e2e-media\/gifs/);
  assert.match(pagesWorkflow, /pnpm test:e2e:highlight/);
  assert.match(pagesWorkflow, /pnpm render:e2e:highlight/);
  assert.match(pagesWorkflow, /dist\/showcase/);
  for (const gif of [
    "01-timeline-navigation.gif",
    "02-focused-context.gif",
    "03-evidence.gif",
    "04-relation-graph.gif",
    "05-mobile.gif",
  ]) {
    assert.ok(readme.includes(gif), `README showcase missing ${gif}`);
  }
});
