import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const _root = new URL("../", import.meta.url);
const gateScript = fileURLToPath(
  new URL("../scripts/check-test-accompaniment.mjs", import.meta.url),
);

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

async function fixture() {
  const cwd = await mkdtemp(path.join(tmpdir(), "lum-tdd-policy-"));
  await Promise.all([
    mkdir(path.join(cwd, "src"), { recursive: true }),
    mkdir(path.join(cwd, "tests"), { recursive: true }),
    mkdir(path.join(cwd, "docs"), { recursive: true }),
  ]);

  git(cwd, ["init"]);
  git(cwd, ["config", "user.name", "Lūm TDD policy"]);
  git(cwd, ["config", "user.email", "tdd-policy@example.invalid"]);

  await writeFile(path.join(cwd, "src", "feature.ts"), "export const value = 1;\n");
  await writeFile(path.join(cwd, "docs", "guide.md"), "# Guide\n");
  git(cwd, ["add", "."]);
  git(cwd, ["commit", "-m", "baseline"]);

  return { cwd, base: git(cwd, ["rev-parse", "HEAD"]) };
}

function runGate(cwd, base) {
  return spawnSync(process.execPath, [gateScript], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, QUALITY_BASE_SHA: base },
  });
}

test("test-first contributor policy is explicit and durable", async () => {
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");
  const contributor = await readFile(
    new URL("../docs/CONTRIBUTOR-ARCHITECTURE.md", import.meta.url),
    "utf8",
  );

  assert.match(agents, /RED/i);
  assert.match(agents, /GREEN/i);
  assert.match(agents, /REFACTOR/i);
  assert.match(agents, /before (changing|writing|editing) production code/i);
  assert.match(agents, /observe .*fail.*intended reason/i);

  assert.match(contributor, /test first/i);
  assert.match(contributor, /observe .*fail.*intended reason/i);
  assert.doesNotMatch(contributor, /add the invariant\/characterization test before or with/i);
});

test("production behavior changes without test changes fail the TDD accompaniment gate", async () => {
  const { cwd, base } = await fixture();
  await writeFile(path.join(cwd, "src", "feature.ts"), "export const value = 2;\n");

  const result = runGate(cwd, base);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /production behavior changed without a test change/i);
  assert.match(result.stderr, /src\/feature\.ts/);
});

test("production behavior plus a changed executable test passes the TDD accompaniment gate", async () => {
  const { cwd, base } = await fixture();
  await writeFile(path.join(cwd, "src", "feature.ts"), "export const value = 2;\n");
  await writeFile(
    path.join(cwd, "tests", "feature.test.mjs"),
    'import test from "node:test";\ntest("feature", () => {});\n',
  );

  const result = runGate(cwd, base);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("documentation-only changes do not require a test edit", async () => {
  const { cwd, base } = await fixture();
  await writeFile(path.join(cwd, "docs", "guide.md"), "# Updated guide\n");

  const result = runGate(cwd, base);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("package and CI expose the TDD gate as a first-class check", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const workflow = await readFile(
    new URL("../.github/workflows/timeline-view.yml", import.meta.url),
    "utf8",
  );

  assert.equal(pkg.scripts?.["check:tdd"], "node scripts/check-test-accompaniment.mjs");
  assert.match(pkg.scripts?.check ?? "", /pnpm check:tdd/);
  assert.match(pkg.scripts?.["test:architecture"] ?? "", /tests\/tdd-policy\.test\.mjs/);

  assert.match(workflow, /scripts\/check-test-accompaniment\.mjs/);
  assert.match(workflow, /tests\/tdd-policy\.test\.mjs/);
  assert.match(workflow, /AGENTS\.md/);
  assert.match(workflow, /run: pnpm check:tdd/);
});
