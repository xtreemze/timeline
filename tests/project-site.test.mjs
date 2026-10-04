import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("presentation and onboarding entry is part of the Vite build", async () => {
  const vite = await read("vite.config.ts");
  assert.match(vite, /presentation:\s*new URL\("\.\/site\/presentation\.html"/);
});

test("presentation page explains history, onboarding, ambitions, and use cases", async () => {
  const html = await read("site/presentation.html");
  for (const id of [
    "history",
    "onboarding",
    "ambitions",
    "conventional-uses",
    "unconventional-uses",
    "embedded-examples",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Weave the threads\. Explore the continuum\./);
  assert.match(html, /Open Lūm/);
});

test("embedded examples use canonical Lūm concepts and remain inspectable without JavaScript", async () => {
  const html = await read("site/presentation.html");
  const script = await read("site/presentation.ts");

  for (const concept of ["entity", "occurrence", "place", "evidence", "story"]) {
    assert.match(html.toLowerCase(), new RegExp(concept));
    assert.match(script.toLowerCase(), new RegExp(concept));
  }

  assert.match(html, /class="example-fallback"/);
  assert.match(html, /data-example=["']corpus["']/);
  assert.match(script, /conventionalExamples/);
  assert.match(script, /unconventionalExamples/);
  assert.match(script, /import\(["']\.\/sample-case\.ts["']\)/);
  assert.match(script, /story-three-little-pigs/);
  assert.match(script, /TimelineSampleCase/);
});

test("presentation page has a dedicated responsive stylesheet", async () => {
  const html = await read("site/presentation.html");
  const css = await read("site/presentation.css");
  assert.match(html, /presentation\.css/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media/);
});


test("Lūm presentation is the primary Pages landing page and the application has a dedicated build entry", async () => {
  const index = await read("site/index.html");
  const lum = await read("site/lum/index.html");
  const vite = await read("vite.config.ts");

  assert.match(index, /id=["']history["']/);
  assert.match(index, /id=["']onboarding["']/);
  assert.match(index, /href=["']\.\/lum\/["']/);
  assert.match(lum, /id=["']app-shell["']/);
  assert.match(vite, /lum:\s*new URL\("\.\/site\/lum\/index\.html"/);
});

test("Pages deploy certifies the Lūm app route while Lighthouse audits the root landing page", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  assert.match(workflow, /test -s dist\/lum\/index\.html/);
  assert.match(workflow, /LUM_DEPLOYED_URL:\s*["']?\$\{\{ needs\.deploy\.outputs\.page_url \}\}lum\//);
  assert.match(workflow, /LIGHTHOUSE_URL:\s*\$\{\{ needs\.deploy\.outputs\.page_url \}\}/);
});


test("GitHub Pages root is the Lūm landing page and points to the dedicated Lūm app route", async () => {
  const index = await read("site/index.html");
  const lum = await read("site/lum/index.html");

  assert.match(index, /<title>Lūm — weave the threads, explore the continuum<\/title>/);
  assert.match(index, /rel=["']canonical["'] href=["']https:\/\/xtreemze\.github\.io\/timeline\/["']/);
  assert.match(index, /href=["']\.\/lum\/["'][^>]*>Open Lūm<\/a>/);
  assert.doesNotMatch(index, /id=["']app-shell["']/);
  assert.match(lum, /id=["']app-shell["']/);

  const landingScript = await read("site/landing.ts");
  assert.match(landingScript, /getRegistrations/);
  assert.match(landingScript, /unregister/);
});

test("legacy workspace route forwards to the canonical Lūm app route", async () => {
  const workspace = await read("site/workspace.html");
  assert.match(workspace, /url=\.\/lum\//i);
  assert.match(workspace, /href=["']\.\/lum\/["']/);
});


test("Pages deployment verifies the live root landing and Lūm application routes", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  assert.match(workflow, /Certify deployed landing page/);
  assert.match(workflow, /curl -fsSL "\$LANDING_URL"/);
  assert.match(workflow, /Weave the threads/);
  assert.match(workflow, /href="\.\/lum\/"/);
  assert.match(workflow, /curl -fsSL "\$LUM_URL"/);
  assert.match(workflow, /id="app-shell"/);
});


test("Pages deployment is gated by the deployable site artifact, not the broad migration type suite", async () => {
  const workflow = await read(".github/workflows/pages.yml");

  assert.doesNotMatch(workflow, /Check production TypeScript bindings/);
  assert.doesNotMatch(workflow, /run:\s*pnpm types:migrated/);
  assert.match(workflow, /pnpm build/);
  assert.match(workflow, /data-site-generator="astro"/);
  assert.match(workflow, /id="app-shell"/);
});


test("Lūm subroute uses Vite root-resolved source inputs while preserving browser base semantics", async () => {
  const lum = await read("site/lum/index.html");

  assert.match(lum, /<base href=["']\.\.\/["']>/);
  assert.match(lum, /src=["']\/time-scale-shim\.ts["']/);
  assert.match(lum, /src=["']\/app\.ts["']/);
  assert.match(lum, /href=["']\/styles\.css["']/);
  assert.doesNotMatch(lum, /src=["']\.\/time-scale-shim\.ts["']/);
});
