import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8");
const mediaWorkflow = readFileSync(new URL("../.github/workflows/e2e-media.yml", import.meta.url), "utf8");
const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
const pagesConfig = readFileSync(new URL("../playwright.pages.config.ts", import.meta.url), "utf8");
const pagesWorkflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const highlightConfig = readFileSync(new URL("../playwright.highlight.config.ts", import.meta.url), "utf8");
const highlightSpec = readFileSync(new URL("./highlight/highlight-reel.spec.ts", import.meta.url), "utf8");
const highlightRenderer = readFileSync(new URL("../scripts/render-e2e-highlight.mjs", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const showcaseDocs = readFileSync(new URL("../docs/E2E-HIGHLIGHT-REEL.md", import.meta.url), "utf8");
const formalPresentation = readFileSync(new URL("../docs/FORMAL-PRESENTATION.md", import.meta.url), "utf8");

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
test("CI produces separate desktop and mobile visual showcase evidence", () => {
  assert.match(
    packageJson.scripts?.["test:e2e:showcase"] || "",
    /playwright\.highlight\.config\.ts/,
  );
  assert.match(
    packageJson.scripts?.["render:e2e:showcase"] || "",
    /render-e2e-highlight\.mjs/,
  );

  assert.match(highlightConfig, /testDir:\s*['"]\.\/tests\/highlight['"]/);
  assert.match(config, /\*\*\/highlight\/\*\*/);
  assert.match(highlightConfig, /name:\s*['"]Desktop Showcase['"]/);
  assert.match(highlightConfig, /name:\s*['"]Mobile Showcase['"]/);
  assert.match(highlightConfig, /viewport:\s*\{\s*width:\s*1440,\s*height:\s*900\s*\}/);
  assert.match(highlightConfig, /viewport:\s*\{\s*width:\s*390,\s*height:\s*844\s*\}/);
  assert.match(highlightConfig, /hasTouch:\s*true/);

  assert.match(highlightSpec, /records five loop-safe Lūm showcase scenes per form factor/);
  assert.match(highlightSpec, /page\.screencast\.start/);
  assert.match(highlightSpec, /page\.screencast\.showChapter/);
  assert.match(highlightSpec, /page\.screencast\.showOverlay/);
  assert.match(highlightSpec, /page\.screenshot/);
  assert.match(highlightSpec, /touchDrag/);
  for (const scene of [
    "01-timeline-navigation",
    "02-focused-context",
    "03-evidence",
    "04-relation-graph",
    "05-story-browser",
  ]) {
    assert.ok(highlightSpec.includes(scene), `showcase intent missing ${scene}`);
  }

  assert.match(highlightRenderer, /lum-\$\{formFactor\}-highlight\.mp4/);
  assert.match(highlightRenderer, /path\.join\(gifsRoot, formFactor\)/);
  assert.match(highlightRenderer, /palettegen/);
  assert.match(highlightRenderer, /paletteuse/);
  assert.match(highlightRenderer, /'-loop', '0'/);
  assert.match(highlightRenderer, /combinedGifBytes/);
  assert.match(highlightRenderer, /README-showcase\.md/);
  assert.match(highlightRenderer, /desktop/);
  assert.match(highlightRenderer, /mobile/);

  assert.match(mediaWorkflow, /Record ten real-browser showcase scenes/);
  assert.match(mediaWorkflow, /pnpm test:e2e:showcase/);
  assert.match(mediaWorkflow, /pnpm render:e2e:showcase/);
  assert.match(mediaWorkflow, /raw\/desktop/);
  assert.match(mediaWorkflow, /raw\/mobile/);
  assert.match(mediaWorkflow, /gifs\/desktop/);
  assert.match(mediaWorkflow, /gifs\/mobile/);
  assert.match(mediaWorkflow, /lum-desktop-highlight\.mp4/);
  assert.match(mediaWorkflow, /lum-mobile-highlight\.mp4/);
  assert.match(mediaWorkflow, /name:\s*lum-e2e-showcase/);

  assert.match(pagesWorkflow, /workflow_run:/);
  assert.match(pagesWorkflow, /workflows:\s*\["E2E media showcase"\]/);
  assert.match(pagesWorkflow, /actions\/download-artifact@v4/);
  assert.doesNotMatch(pagesWorkflow, /pnpm test:e2e:showcase/);
  assert.match(pagesWorkflow, /dist\/showcase\/desktop/);
  assert.match(pagesWorkflow, /dist\/showcase\/mobile/);

  for (const formFactor of ["desktop", "mobile"]) {
    for (const gif of [
      "01-timeline-navigation.gif",
      "02-focused-context.gif",
      "03-evidence.gif",
      "04-relation-graph.gif",
      "05-story-browser.gif",
    ]) {
      assert.ok(
        readme.includes(`showcase/${formFactor}/${gif}`),
        `README showcase missing ${formFactor}/${gif}`,
      );
    }
  }

  assert.match(showcaseDocs, /five desktop scenes/i);
  assert.match(showcaseDocs, /five mobile scenes/i);
  assert.match(showcaseDocs, /lum-desktop-highlight\.mp4/);
  assert.match(showcaseDocs, /lum-mobile-highlight\.mp4/);
  assert.match(formalPresentation, /CI-generated product showcase media/);
});
