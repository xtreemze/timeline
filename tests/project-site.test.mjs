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
