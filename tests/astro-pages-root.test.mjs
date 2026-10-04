import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("GitHub Pages root is authored by Astro, not the application Vite entry", async () => {
  const config = await read("astro.config.mjs");
  const page = await read("landing/src/pages/index.astro");
  const build = await read("scripts/build-pages.mjs");
  const packageJson = await read("package.json");

  assert.match(config, /base:\s*["']\/timeline["']/);
  assert.match(config, /outDir:/);
  assert.match(page, /Weave the threads/);
  assert.match(page, /href=["']\.\/lum\//);
  assert.doesNotMatch(page, /id=["']app-shell["']/);
  assert.match(build, /astro@/);
  assert.match(build, /dist-astro/);
  assert.match(packageJson, /scripts\/build-pages\.mjs/);
});

test("Pages deployment validates Astro ownership of the root and the Vite app under lum", async () => {
  const workflow = await read(".github/workflows/pages.yml");

  assert.match(workflow, /data-site-generator=["']astro["']/);
  assert.match(workflow, /test -s dist\/lum\/index\.html/);
  assert.match(workflow, /href="\.\/lum\/"/);
});
