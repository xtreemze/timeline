import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { discoverNodeTests } from "../scripts/run-node-tests.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);

async function independentlyDiscover(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await independentlyDiscover(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".test.mjs")) files.push(absolute);
  }
  return files;
}

test("the authoritative Node test command discovers every .test.mjs file recursively", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts?.test, "node scripts/run-node-tests.mjs");

  const expected = (await independentlyDiscover(path.join(root, "tests")))
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .sort((a, b) => a.localeCompare(b));
  const actual = await discoverNodeTests(root);
  assert.deepEqual(actual, expected);

  for (const formerlyOmitted of [
    "tests/evidence-extraction.test.mjs",
    "tests/footer-controls.test.mjs",
    "tests/graph-inference.test.mjs",
    "tests/timeline-ambient-context.test.mjs",
  ]) {
    assert.ok(actual.includes(formerlyOmitted), `Node discovery must include ${formerlyOmitted}`);
  }
});

test("authoritative Node test discovery remains independent of CI lane policy", async () => {
  const workflow = await readFile(path.join(root, ".github/workflows/timeline-view.yml"), "utf8");
  assert.match(workflow, /run: pnpm test/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /run: pnpm check:tdd/);
});
