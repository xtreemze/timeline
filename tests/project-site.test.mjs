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
  assert.match(html, /Open Lūm workspace/);
});

test("embedded examples use canonical Lūm concepts and remain inspectable without JavaScript", async () => {
  const html = await read("site/presentation.html");
  const script = await read("site/presentation.ts");

  for (const concept of ["entity", "occurrence", "place", "evidence", "story"]) {
    assert.match(html.toLowerCase(), new RegExp(concept));
    assert.match(script.toLowerCase(), new RegExp(concept));
  }

  assert.match(html, /class="example-fallback"/);
  assert.match(script, /conventionalExamples/);
  assert.match(script, /unconventionalExamples/);
});

test("presentation page has a dedicated responsive stylesheet", async () => {
  const html = await read("site/presentation.html");
  const css = await read("site/presentation.css");
  assert.match(html, /presentation\.css/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media/);
});


test("Lūm presentation is the primary Pages landing page and workspace remains a separate build entry", async () => {
  const index = await read("site/index.html");
  const workspace = await read("site/workspace.html");
  const vite = await read("vite.config.ts");

  assert.match(index, /id=["']history["']/);
  assert.match(index, /id=["']onboarding["']/);
  assert.match(index, /href=["']\.\/workspace\.html["']/);
  assert.match(workspace, /id=["']app-shell["']/);
  assert.match(vite, /workspace:\s*new URL\("\.\/site\/workspace\.html"/);
});

test("Pages deploy certifies the workspace route while Lighthouse audits the root landing page", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  assert.match(workflow, /test -s dist\/workspace\.html/);
  assert.match(workflow, /LUM_DEPLOYED_URL:\s*["']?\$\{\{ needs\.deploy\.outputs\.page_url \}\}workspace\.html/);
  assert.match(workflow, /LIGHTHOUSE_URL:\s*\$\{\{ needs\.deploy\.outputs\.page_url \}\}/);
});


test("GitHub Pages root is the Lūm landing page and points to the dedicated Lūm app route", async () => {
  const index = await read("site/index.html");
  const lum = await read("site/lum/index.html");

  assert.match(index, /<title>Lūm — weave the threads, explore the continuum<\/title>/);
  assert.match(index, /href=["']\.\/lum\/["'][^>]*>Open Lūm workspace<\/a>/);
  assert.doesNotMatch(index, /id=["']app-shell["']/);
  assert.match(lum, /id=["']app-shell["']/);
});

test("legacy workspace route forwards to the canonical Lūm app route", async () => {
  const workspace = await read("site/workspace.html");
  assert.match(workspace, /url=\.\/lum\//i);
  assert.match(workspace, /href=["']\.\/lum\/["']/);
});
