import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("GitHub Pages root is authored directly by Vite 8", async () => {
  const page = await read("site/index.html");
  const vite = await read("vite.config.ts");
  const build = await read("scripts/build-pages.mjs");
  const packageJson = JSON.parse(await read("package.json"));

  assert.match(page, /data-site-generator=["']vite["']/);
  assert.match(page, /Weave the threads/);
  assert.match(page, /href=["']\.\/lum\//);
  assert.doesNotMatch(page, /id=["']app-shell["']/);
  assert.match(vite, /main:\s*new URL\("\.\/site\/index\.html"/);
  assert.match(build, /run\("pnpm", \["exec", "vite", "build"\]\)/);
  assert.doesNotMatch(build, /astro|esbuild/i);
  assert.equal(packageJson.devDependencies?.astro, undefined);
});

test("Pages deployment validates the Vite landing root and Vite app under lum", async () => {
  const workflow = await read(".github/workflows/pages.yml");

  assert.match(workflow, /data-site-generator=["']vite["']/);
  assert.match(workflow, /test -s dist\/lum\/index\.html/);
  assert.match(workflow, /href="\.\/lum\/"/);
});
